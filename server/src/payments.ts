// To'lov provayderlari: Payme (Merchant API, JSON-RPC) va Click (Prepare/Complete). Karta orqali to'lov: Humo, Uzcard va korporativ karta shu provayderlar oynasida.
// DIQQAT: protokol tafsilotlari provayder hujjatlari asosida yozilgan, provayderning sinov muhitida (sandbox) hali SINALMAGAN. Haqiqiy kalitlar berilmagan: provayderlar faqat muhit o'zgaruvchilari berilganda yoqiladi.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Collection, type DocStore } from "./docs";
import { WriteQueue } from "./persist";
import type { Commerce, Order, PaymentProvider } from "./commerce";

const eq = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const md5 = (s: string) => createHash("md5").update(s).digest("hex");
export const TIYIN = 100; // 1 so'm = 100 tiyin (Payme summani tiyinda yuboradi)

// ---------------- Provayderlar (to'lov oynasi manzili) ----------------
export interface PayCfg { returnUrl: string }
/** Provayderdan qaytganda mijoz buyurtma holatini ko'rsatishi uchun: `?tolov=<buyurtma>`. */
export const backTo = (base: string, orderId: string) => `${base}${base.includes("?") ? "&" : "?"}tolov=${orderId}`;
export class PaymeProvider implements PaymentProvider {
  id = "payme"; channels: ("web" | "store")[] = ["web"];
  constructor(private merchantId: string, private cfg: PayCfg, private base = "https://checkout.paycom.uz") {}
  async checkout(o: Order) { const p = `m=${this.merchantId};ac.order_id=${o.id};a=${o.amount * TIYIN};l=uz;c=${backTo(this.cfg.returnUrl, o.id)}`; return { ref: "payme-" + o.id, url: `${this.base}/${Buffer.from(p).toString("base64")}` }; }
}
export class ClickProvider implements PaymentProvider {
  id = "click"; channels: ("web" | "store")[] = ["web"];
  constructor(private serviceId: string, private merchantId: string, private cfg: PayCfg, private base = "https://my.click.uz/services/pay") {}
  async checkout(o: Order) { const q = new URLSearchParams({ service_id: this.serviceId, merchant_id: this.merchantId, amount: o.amount.toFixed(2), transaction_param: o.id, return_url: backTo(this.cfg.returnUrl, o.id) }); return { ref: "click-" + o.id, url: `${this.base}?${q}` }; }
}

// ---------------- Tranzaksiya jurnali ----------------
export interface PTx { id: string; provider: "payme" | "click"; ext: string; orderId: string; amount: number; state: 1 | 2 | -1 | -2; createTime: number; performTime: number; cancelTime: number; reason: number | null }

export class PayLedger {
  readonly tx: Collection<PTx>; readonly queue = new WriteQueue();
  constructor(docs?: DocStore) { this.tx = new Collection("ptx", docs, this.queue); }
  async load() { await this.tx.load(); return this; }
  byExt(provider: PTx["provider"], ext: string) { return this.tx.values().find((t) => t.provider === provider && t.ext === ext); }
  activeOf(orderId: string) { return this.tx.values().find((t) => t.orderId === orderId && t.state === 1); }
}

// ---------------- Payme Merchant API ----------------
export const PAYME_TIMEOUT_MS = 12 * 3600_000; // 1-holatdagi tranzaksiya 12 soatdan keyin bekor bo'ladi
const PERR = { auth: -32504, method: -32601, parse: -32700, amount: -31001, notFound: -31003, cantCancel: -31007, cantPerform: -31008, noOrder: -31050, orderBusy: -31051, pending: -31099 } as const;
const msg = (uz: string, ru: string, en: string) => ({ uz, ru, en });
const MSG: Record<number, ReturnType<typeof msg>> = {
  [PERR.auth]: msg("Ruxsat yo'q", "Недостаточно привилегий", "Insufficient privilege"), [PERR.method]: msg("Metod topilmadi", "Метод не найден", "Method not found"), [PERR.parse]: msg("Noto'g'ri so'rov", "Ошибка разбора", "Parse error"),
  [PERR.amount]: msg("Summa noto'g'ri", "Неверная сумма", "Wrong amount"), [PERR.notFound]: msg("Tranzaksiya topilmadi", "Транзакция не найдена", "Transaction not found"),
  [PERR.cantCancel]: msg("Bekor qilib bo'lmaydi", "Невозможно отменить", "Cannot cancel"), [PERR.cantPerform]: msg("Amalni bajarib bo'lmaydi", "Невозможно выполнить операцию", "Cannot perform"),
  [PERR.noOrder]: msg("Buyurtma topilmadi", "Заказ не найден", "Order not found"), [PERR.orderBusy]: msg("Buyurtma to'lash uchun ochiq emas", "Заказ недоступен для оплаты", "Order not payable"), [PERR.pending]: msg("Buyurtma bo'yicha boshqa tranzaksiya kutilmoqda", "По заказу есть другая транзакция", "Another transaction pending"),
};
class RpcError extends Error { constructor(public code: number, public data?: string) { super(String(code)); } }

export class PaymeMerchant {
  constructor(private commerce: Commerce, private ledger: PayLedger, private key: string, private now: () => number = Date.now) {}
  /** `Authorization: Basic base64("Paycom:" + KEY)` tekshiruvi. */
  authOk(header: string | undefined) { const want = "Basic " + Buffer.from("Paycom:" + this.key).toString("base64"); return !!header && eq(header, want); }
  /** HTTP javob tanasi (Payme har doim HTTP 200 kutadi). */
  async handle(header: string | undefined, body: any): Promise<unknown> {
    const id = body && typeof body === "object" && "id" in body ? body.id : null;
    try {
      if (!this.authOk(header)) throw new RpcError(PERR.auth);
      if (!body || typeof body !== "object" || typeof body.method !== "string") throw new RpcError(PERR.parse);
      const p = body.params ?? {};
      switch (body.method) {
        case "CheckPerformTransaction": this.check(p); return { jsonrpc: "2.0", id, result: { allow: true } };
        case "CreateTransaction": return { jsonrpc: "2.0", id, result: this.create(p) };
        case "PerformTransaction": return { jsonrpc: "2.0", id, result: this.perform(p) };
        case "CancelTransaction": return { jsonrpc: "2.0", id, result: this.cancel(p) };
        case "CheckTransaction": return { jsonrpc: "2.0", id, result: this.view(this.find(p)) };
        case "GetStatement": return { jsonrpc: "2.0", id, result: { transactions: this.ledger.tx.values().filter((t) => t.provider === "payme" && t.createTime >= Number(p.from) && t.createTime <= Number(p.to)).sort((a, b) => a.createTime - b.createTime).map((t) => ({ id: t.ext, time: t.createTime, amount: t.amount, account: { order_id: t.orderId }, create_time: t.createTime, perform_time: t.performTime, cancel_time: t.cancelTime, transaction: t.id, state: t.state, reason: t.reason })) } };
        default: throw new RpcError(PERR.method, body.method);
      }
    } catch (e) { if (e instanceof RpcError) return { jsonrpc: "2.0", id, error: { code: e.code, message: MSG[e.code] ?? MSG[PERR.parse], ...(e.data ? { data: e.data } : {}) } }; throw e; }
  }
  private order(p: any): Order { const oid = String(p?.account?.order_id ?? ""); const o = this.commerce.orders.get(oid); if (!o) throw new RpcError(PERR.noOrder, "order_id"); return o; }
  private check(p: any) {
    const o = this.order(p); if (o.status !== "pending_payment") throw new RpcError(PERR.orderBusy, "order_id");
    if (!Number.isInteger(p.amount) || p.amount !== o.amount * TIYIN) throw new RpcError(PERR.amount, "amount"); return o;
  }
  private view(t: PTx) { return { create_time: t.createTime, perform_time: t.performTime, cancel_time: t.cancelTime, transaction: t.id, state: t.state, reason: t.reason }; }
  private find(p: any) { const t = this.ledger.byExt("payme", String(p.id ?? "")); if (!t) throw new RpcError(PERR.notFound, "id"); return t; }
  private expired(t: PTx) { return t.state === 1 && this.now() - t.createTime > PAYME_TIMEOUT_MS; }
  private expire(t: PTx) { return this.ledger.tx.set(t.id, { ...t, state: -1, cancelTime: this.now(), reason: 4 }); }
  private create(p: any) {
    const ext = String(p.id ?? ""); if (!ext) throw new RpcError(PERR.parse, "id");
    const had = this.ledger.byExt("payme", ext);
    if (had) { if (had.state !== 1) throw new RpcError(PERR.cantPerform); if (this.expired(had)) { this.expire(had); throw new RpcError(PERR.cantPerform); } return { create_time: had.createTime, transaction: had.id, state: had.state }; }
    const o = this.check(p); const other = this.ledger.activeOf(o.id);
    if (other) { if (this.expired(other)) this.expire(other); else throw new RpcError(PERR.pending, "order_id"); }
    const t: PTx = { id: randomBytes(8).toString("hex"), provider: "payme", ext, orderId: o.id, amount: p.amount, state: 1, createTime: this.now(), performTime: 0, cancelTime: 0, reason: null };
    this.ledger.tx.set(t.id, t); return { create_time: t.createTime, transaction: t.id, state: 1 };
  }
  private perform(p: any) {
    let t = this.find(p);
    if (t.state === 2) return { perform_time: t.performTime, transaction: t.id, state: 2 };
    if (t.state !== 1) throw new RpcError(PERR.cantPerform);
    if (this.expired(t)) { this.expire(t); throw new RpcError(PERR.cantPerform); }
    const r = this.commerce.confirmPaid(t.orderId, t.amount / TIYIN, "payme-" + t.ext); if (!r.ok) throw new RpcError(PERR.cantPerform);
    t = this.ledger.tx.set(t.id, { ...t, state: 2, performTime: this.now() }); return { perform_time: t.performTime, transaction: t.id, state: 2 };
  }
  private cancel(p: any) {
    let t = this.find(p); const reason = Number.isInteger(p.reason) ? (p.reason as number) : null;
    if (t.state === -1 || t.state === -2) return { cancel_time: t.cancelTime, transaction: t.id, state: t.state };
    if (t.state === 1) { t = this.ledger.tx.set(t.id, { ...t, state: -1, cancelTime: this.now(), reason }); return { cancel_time: t.cancelTime, transaction: t.id, state: -1 }; }
    const r = this.commerce.refund(t.orderId, "payme qaytarish"); if (!r.ok) throw new RpcError(PERR.cantCancel);
    t = this.ledger.tx.set(t.id, { ...t, state: -2, cancelTime: this.now(), reason }); return { cancel_time: t.cancelTime, transaction: t.id, state: -2 };
  }
}

// ---------------- Click (Prepare / Complete) ----------------
const CERR = { ok: 0, sign: -1, amount: -2, action: -3, paid: -4, noUser: -5, noTx: -6, update: -7, request: -8, cancelled: -9 } as const;
const CERR_NOTE: Record<number, string> = { 0: "Success", [-1]: "SIGN CHECK FAILED!", [-2]: "Incorrect parameter amount", [-3]: "Action not found", [-4]: "Already paid", [-5]: "User does not exist", [-6]: "Transaction does not exist", [-7]: "Failed to update user", [-8]: "Error in request from click", [-9]: "Transaction cancelled" };

export class ClickMerchant {
  constructor(private commerce: Commerce, private ledger: PayLedger, private serviceId: string, private secret: string, private now: () => number = Date.now) {}
  private reply(b: any, error: number, extra: Record<string, unknown> = {}) { return { click_trans_id: b?.click_trans_id ?? null, merchant_trans_id: b?.merchant_trans_id ?? null, ...extra, error, error_note: CERR_NOTE[error] ?? "" }; }
  private signOk(b: any, complete: boolean) {
    const s = String(b.click_trans_id) + String(b.service_id) + this.secret + String(b.merchant_trans_id) + (complete ? String(b.merchant_prepare_id) : "") + String(b.amount) + String(b.action) + String(b.sign_time);
    return eq(md5(s), String(b.sign_string ?? ""));
  }
  /** Prepare (action=0) va Complete (action=1): bitta tanadan ham chaqiriladi. */
  handle(b: any): Record<string, unknown> {
    if (!b || typeof b !== "object") return this.reply(b, CERR.request);
    const action = Number(b.action); if (action !== 0 && action !== 1) return this.reply(b, CERR.action);
    if (String(b.service_id) !== this.serviceId || !this.signOk(b, action === 1)) return this.reply(b, CERR.sign);
    const o = this.commerce.orders.get(String(b.merchant_trans_id ?? "")); if (!o) return this.reply(b, CERR.noUser);
    const amount = Number(b.amount); if (!Number.isFinite(amount) || Math.abs(amount - o.amount) > 0.001) return this.reply(b, CERR.amount);
    const ext = String(b.click_trans_id);
    if (action === 0) {
      if (o.status === "paid") return this.reply(b, CERR.paid);
      if (o.status !== "pending_payment") return this.reply(b, CERR.cancelled);
      const had = this.ledger.byExt("click", ext) ?? this.ledger.tx.values().find((t) => t.provider === "click" && t.orderId === o.id && t.state === 1);
      const id = had?.id ?? randomBytes(8).toString("hex");
      if (!had) this.ledger.tx.set(id, { id, provider: "click", ext, orderId: o.id, amount: o.amount, state: 1, createTime: this.now(), performTime: 0, cancelTime: 0, reason: null });
      return this.reply(b, CERR.ok, { merchant_prepare_id: id });
    }
    const t = this.ledger.tx.get(String(b.merchant_prepare_id ?? "")); if (!t || t.provider !== "click" || t.orderId !== o.id) return this.reply(b, CERR.noTx);
    if (Number(b.error) < 0) { if (t.state === 1) this.ledger.tx.set(t.id, { ...t, state: -1, cancelTime: this.now(), reason: Number(b.error) }); return this.reply(b, CERR.cancelled, { merchant_confirm_id: t.id }); }
    if (t.state === 2) return this.reply(b, CERR.paid, { merchant_confirm_id: t.id });
    if (t.state !== 1) return this.reply(b, CERR.cancelled);
    const r = this.commerce.confirmPaid(o.id, o.amount, "click-" + ext); if (!r.ok) return this.reply(b, r.error === "amount_mismatch" ? CERR.amount : CERR.update);
    this.ledger.tx.set(t.id, { ...t, state: 2, performTime: this.now() }); return this.reply(b, CERR.ok, { merchant_confirm_id: t.id });
  }
}
