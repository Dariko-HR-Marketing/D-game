// Do'kon va Tajriba24 Plus (maketlar N44–N46, N53; qo'llanma/spetsifikatsiya §7–§9).
// Tamoyillar: asosiy o'yin bepul; Plus va kosmetika o'yin natijasiga ta'sir qilmaydi; tasodifiy sandiq (loot box) yo'q; narx oldindan aniq;
// 18 yoshgacha to'lov ota-ona roziligi bilan; to'lovdan oldin telefon tasdig'i. Narxlar sozlamada (admin) — qiymati berilmaguncha xarid yopiq.
import { randomBytes } from "node:crypto";
import { Collection, type DocStore } from "./docs";
import { WriteQueue } from "./persist";
import type { ParentConsents } from "./parents";

export type ItemKind = "pawn" | "frame" | "avatar" | "bundle";
export interface Item { id: string; kind: ItemKind; name: string; color?: string; source: "default" | "shop" | "plus" | "achievement"; ach?: string; desc: string; available: boolean }
/** Faqat ko'rinish. Kasb va orzu to'plamlari kontent talab qiladi (asosiy deka muvozanatida) — kontent kelguncha yopiq (`available: false`). */
export const ITEMS: Item[] = [
  { id: "pawn-silver", kind: "pawn", name: "Kumush", color: "#AEB8C2", source: "default", desc: "Hamma uchun", available: true },
  { id: "pawn-gold", kind: "pawn", name: "Oltin", color: "#F5B82E", source: "plus", desc: "Plus · har oy tanlash mumkin", available: true },
  { id: "pawn-emerald", kind: "pawn", name: "Zumrad", color: "#11835A", source: "shop", desc: "Sotib olinadi", available: true },
  { id: "pawn-ruby", kind: "pawn", name: "Yoqut", color: "#C8323A", source: "shop", desc: "Sotib olinadi", available: true },
  { id: "pawn-turquoise", kind: "pawn", name: "Feruza", color: "#1C8FB8", source: "achievement", ach: "first_win", desc: "Birinchi g'alaba uchun beriladi", available: true },
  { id: "pawn-night", kind: "pawn", name: "Tun", color: "#203040", source: "shop", desc: "Sotib olinadi", available: true },
  { id: "frame-plain", kind: "frame", name: "Oddiy", color: "#D5DEE4", source: "default", desc: "Hamma uchun", available: true },
  { id: "frame-gold", kind: "frame", name: "Oltin ramka", color: "#F5B82E", source: "plus", desc: "Plus · har oy tanlash mumkin", available: true },
  { id: "frame-emerald", kind: "frame", name: "Zumrad ramka", color: "#11835A", source: "shop", desc: "Sotib olinadi", available: true },
  { id: "frame-champion", kind: "frame", name: "Chempion ramkasi", color: "#7B4FA3", source: "achievement", ach: "wins_5", desc: "5 ta g'alaba uchun beriladi", available: true },
  { id: "avatar-sky", kind: "avatar", name: "Osmon", color: "#E3EEF6", source: "default", desc: "Hamma uchun", available: true },
  { id: "avatar-mint", kind: "avatar", name: "Yalpiz", color: "#DCEEC4", source: "shop", desc: "Sotib olinadi", available: true },
  { id: "avatar-sand", kind: "avatar", name: "Qum", color: "#F5EEDC", source: "shop", desc: "Sotib olinadi", available: true },
  { id: "avatar-rose", kind: "avatar", name: "Atirgul", color: "#F7E6EC", source: "shop", desc: "Sotib olinadi", available: true },
  { id: "bundle-board", kind: "bundle", name: "Mavzuli maydon", source: "shop", desc: "Maydon va karta orqalarining boshqa ko'rinishi", available: false },
  { id: "bundle-kasb", kind: "bundle", name: "Kasblar to'plami", source: "shop", desc: "Qo'shimcha kasb kartalari — asosiy deka bilan bir xil muvozanatda; reytingli o'yinda yoqilmaydi", available: false },
  { id: "bundle-orzu", kind: "bundle", name: "Orzular to'plami", source: "shop", desc: "Qo'shimcha orzu kartalari — narxlar asosiy orzular oralig'ida; reytingli o'yinda yoqilmaydi", available: false },
];
const ITEM = new Map(ITEMS.map((i) => [i.id, i]));
export const itemById = (id: string) => ITEM.get(id);

/** O'yin maydonini ochish chegarasi: kun / hafta / oy (Toshkent vaqti). `null` — chegarasiz. */
export interface Quota { day: number | null; week: number | null; month: number | null }
export type PlanId = "start" | "plus" | "premium";
export interface OrgTier { seats: number; pct: number }
export interface CatalogConfig {
  plusMonthly: number | null; plusYearly: number | null; premiumMonthly: number | null; premiumYearly: number | null; coupon: number | null;
  /** Tashkilot: bir o'rin oyiga (so'm) va hajm bo'yicha chegirma (%). */
  orgSeatMonthly: number | null; orgTiers: OrgTier[];
  items: Record<string, number | null>; quotas: Record<PlanId, Quota>; freeHistory: number | null; hidden?: string[];
}
const NO_QUOTA: Quota = { day: null, week: null, month: null };
/** Kodda narx va chegara YO'Q (CLAUDE.md §2.4): hammasi `null`. Pilot qiymatlari `PILOT_CONFIG` (birinchi ishga tushishda bir marta yoziladi, keyin admin tahrirlaydi). */
export const DEFAULT_CONFIG: CatalogConfig = { plusMonthly: null, plusYearly: null, premiumMonthly: null, premiumYearly: null, coupon: null, orgSeatMonthly: null, orgTiers: [], items: {}, quotas: { start: NO_QUOTA, plus: NO_QUOTA, premium: NO_QUOTA }, freeHistory: 10 };
/** Pilot (sinov) paketlari va narxlari — buyurtmachi tasdig'i 2026-11-23 (docs/OPEN_QUESTIONS.md 214). Asos: Milliy statistika qo'mitasi mediana ish haqi 4 166 300 so'm. */
export const PILOT_CONFIG: Partial<CatalogConfig> = {
  plusMonthly: 49_000, plusYearly: 490_000, premiumMonthly: 99_000, premiumYearly: 990_000, coupon: 9_900, orgSeatMonthly: 25_000,
  orgTiers: [{ seats: 10, pct: 0 }, { seats: 25, pct: 10 }, { seats: 50, pct: 20 }, { seats: 100, pct: 30 }],
  quotas: { start: { day: 1, week: 2, month: 6 }, plus: { day: 3, week: 10, month: 30 }, premium: NO_QUOTA },
};

export interface Ent { userId: string; plusUntil: number | null; plusPlan?: "monthly" | "yearly"; plusCancelled?: boolean; premiumUntil?: number | null; premiumPlan?: "monthly" | "yearly"; premiumCancelled?: boolean; coupons?: number; starts?: number[]; owned: string[]; equipped: { pawn?: string; frame?: string; avatar?: string }; claimedMonth?: string }
export type OrderStatus = "pending_parent" | "pending_payment" | "paid" | "cancelled" | "rejected" | "refunded";
export interface Order { id: string; userId: string; sku: string; title: string; amount: number; channel: "web" | "store"; provider?: string; status: OrderStatus; createdAt: number; paidAt?: number; ref?: string; checkout?: string; consentId?: string; refundedAt?: number; note?: string }

export interface PaymentProvider { id: string; channels: ("web" | "store")[]; checkout(o: Order): Promise<{ ref: string; url?: string }> }
/** Sinov provayderi (faqat production'dan tashqarida): to'lov oynasiz, `/dev/pay/:id` bilan tasdiqlanadi. */
export class DevProvider implements PaymentProvider {
  id = "dev"; channels: ("web" | "store")[] = ["web", "store"];
  constructor() { if (process.env.NODE_ENV === "production") throw new Error("DevProvider production'da taqiqlangan"); }
  async checkout(o: Order) { return { ref: "dev-" + o.id }; }
}

export const PLUS_DAYS = { monthly: 30, yearly: 365 } as const;
const TZ = 5 * 3_600_000, DAY = 86_400_000, ym = (t: number) => new Date(t).toISOString().slice(0, 7);
const MINOR_PAY_AGE = 18;

export interface CommerceDeps { docs?: DocStore; now?: () => number; providers?: PaymentProvider[]; consents?: ParentConsents; phoneOk: (uid: string) => boolean; ageOf: (uid: string) => number | null; achievements: (uid: string) => string[]; phoneHashOf: (uid: string) => string | undefined; hashOf: (p: string) => string }
export type OrderErr = "bad_sku" | "price_unset" | "unavailable" | "already_owned" | "phone_required" | "profile_required" | "parent_phone_required" | "payments_unavailable" | "bad_phone" | "bad_operator" | "same_phone" | "bad_provider" | "rate_limited" | "sms_failed" | "sms_unavailable" | "plus_already_long" | "not_found" | "not_pending" | "bad_item" | "not_owned" | "not_plus" | "already_claimed" | "amount_mismatch";

export class Commerce {
  readonly ents: Collection<Ent>; readonly orders: Collection<Order>; readonly cfg: Collection<CatalogConfig>;
  readonly queue = new WriteQueue();
  private now: () => number;
  private couponRooms = new Map<string, string>();
  constructor(private d: CommerceDeps) {
    this.now = d.now ?? Date.now; this.ents = new Collection("ent", d.docs, this.queue); this.orders = new Collection("order", d.docs, this.queue); this.cfg = new Collection("catalog", d.docs, this.queue);
  }
  async load() { await this.ents.load(); await this.orders.load(); await this.cfg.load(); return this; }
  config(): CatalogConfig {
    const st = this.cfg.get("config") as (Partial<CatalogConfig> & { freeRoomsPerDay?: unknown }) | undefined;
    const q = (k: PlanId): Quota => ({ ...NO_QUOTA, ...(st?.quotas?.[k] ?? {}) });
    return { ...DEFAULT_CONFIG, ...(st ?? {}), items: { ...(st?.items ?? {}) }, orgTiers: [...(st?.orgTiers ?? DEFAULT_CONFIG.orgTiers)], quotas: { start: q("start"), plus: q("plus"), premium: q("premium") } };
  }
  setConfig(patch: Partial<CatalogConfig>): { ok: true; config: CatalogConfig } | { ok: false; error: string } {
    const c = { ...this.config(), ...patch };
    const okP = (v: unknown) => v === null || (Number.isInteger(v) && (v as number) > 0 && (v as number) <= 1_000_000_000);
    for (const k of ["plusMonthly", "plusYearly", "premiumMonthly", "premiumYearly", "coupon", "orgSeatMonthly"] as const) if (!okP(c[k])) return { ok: false, error: "bad_price" };
    for (const [k, v] of Object.entries(c.items)) if (!ITEM.has(k) || !okP(v)) return { ok: false, error: "bad_price" };
    const lim = (v: unknown) => v === null || (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 10_000);
    if (!lim(c.freeHistory)) return { ok: false, error: "bad_limit" };
    for (const k of ["start", "plus", "premium"] as const) { const q = c.quotas?.[k]; if (!q || !lim(q.day) || !lim(q.week) || !lim(q.month)) return { ok: false, error: "bad_limit" }; }
    if (!Array.isArray(c.orgTiers) || c.orgTiers.length > 12 || c.orgTiers.some((t) => !t || !Number.isInteger(t.seats) || t.seats < 1 || t.seats > 100_000 || !Number.isInteger(t.pct) || t.pct < 0 || t.pct > 90)) return { ok: false, error: "bad_tier" };
    if (c.hidden !== undefined && (!Array.isArray(c.hidden) || c.hidden.some((h) => !ITEM.has(h)))) return { ok: false, error: "bad_item" };
    this.cfg.set("config", c); return { ok: true, config: c };
  }
  /** Birinchi ishga tushishda pilot narx va chegaralarini bir marta yozadi (admin keyin o'zgartiradi). */
  seedPilot(): boolean { if (this.cfg.get("config")) return false; this.cfg.set("config", { ...DEFAULT_CONFIG, ...PILOT_CONFIG } as CatalogConfig); return true; }

  ent(uid: string): Ent { return this.ents.get(uid) ?? { userId: uid, plusUntil: null, owned: [], equipped: {} }; }
  isPlus(uid: string) { const e = this.ents.get(uid); return !!e?.plusUntil && e.plusUntil > this.now(); }
  isPremium(uid: string) { const e = this.ents.get(uid); return !!e?.premiumUntil && e.premiumUntil > this.now(); }
  /** Paket: Premium > Plus > Start. */
  plan(uid: string): PlanId { return this.isPremium(uid) ? "premium" : this.isPlus(uid) ? "plus" : "start"; }
  /** Pullik paket (Plus yoki Premium) faolmi: tarix, tahlil, kosmetika huquqlari. */
  isPaid(uid: string) { return this.isPlus(uid) || this.isPremium(uid); }
  /** Egalik: sotib olingan + standart + yutuq uchun berilgan. */
  owns(uid: string, id: string) {
    const it = ITEM.get(id); if (!it) return false;
    if (it.source === "default") return true;
    if (it.source === "achievement") return !!it.ach && this.d.achievements(uid).includes(it.ach);
    return this.ent(uid).owned.includes(id);
  }
  priceOf(sku: string): number | null | undefined {
    const c = this.config();
    if (sku === "plus:monthly") return c.plusMonthly; if (sku === "plus:yearly") return c.plusYearly;
    if (sku === "premium:monthly") return c.premiumMonthly; if (sku === "premium:yearly") return c.premiumYearly; if (sku === "coupon:1") return c.coupon;
    const m = /^item:(.+)$/.exec(sku); if (!m) return undefined; const it = ITEM.get(m[1]); if (!it || it.source !== "shop") return undefined;
    return c.items[it.id] ?? null;
  }
  catalog(uid: string) {
    const c = this.config(), e = this.ent(uid), plus = this.isPlus(uid), prem = this.isPremium(uid), paid = plus || prem;
    return {
      plus: { active: plus, until: plus ? e.plusUntil : null, plan: plus ? e.plusPlan ?? null : null, cancelled: !!e.plusCancelled, monthly: c.plusMonthly, yearly: c.plusYearly, claimedThisMonth: e.claimedMonth === ym(this.now()),
        features: { rooms: this.quotaOf(uid), history: paid ? null : c.freeHistory, analysis: paid ? "all" : "last", ads: !paid } },
      premium: { active: prem, until: prem ? e.premiumUntil ?? null : null, plan: prem ? e.premiumPlan ?? null : null, cancelled: !!e.premiumCancelled, monthly: c.premiumMonthly, yearly: c.premiumYearly },
      pkg: { plan: this.plan(uid), quotas: c.quotas, usage: this.usage(uid), coupons: e.coupons ?? 0, couponPrice: c.coupon, org: { seatMonthly: c.orgSeatMonthly, tiers: c.orgTiers } },
      items: ITEMS.filter((i) => !(c.hidden ?? []).includes(i.id) || this.owns(uid, i.id)).map((i) => ({ ...i, owned: this.owns(uid, i.id), price: i.source === "shop" ? c.items[i.id] ?? null : null, equipped: e.equipped[i.kind as "pawn" | "frame" | "avatar"] === i.id })),
      equipped: e.equipped, paymentsReady: (this.d.providers ?? []).length > 0, providers: (this.d.providers ?? []).filter((p) => p.channels.includes("web")).map((p) => p.id),
    };
  }
  /** Boshqa o'yinchilarga ko'rinadigan kosmetika (faqat egasi bo'lgan narsalar). */
  cosmetics(uid: string): { pawn?: string; frame?: string; avatar?: string } {
    const e = this.ents.get(uid); if (!e) return {}; const out: { pawn?: string; frame?: string; avatar?: string } = {};
    for (const k of ["pawn", "frame", "avatar"] as const) { const id = e.equipped[k]; if (id && this.owns(uid, id) && !(ITEM.get(id)!.source === "plus" && !this.isPlus(uid))) out[k] = ITEM.get(id)!.color; }
    return out;
  }

  // --- buyurtma ---
  async order(uid: string, sku: string, channel: "web" | "store", parentPhone?: unknown, provider?: string): Promise<{ ok: true; order: Order; parentRequired: boolean } | { ok: false; error: OrderErr }> {
    const price = this.priceOf(sku); if (price === undefined) return { ok: false, error: "bad_sku" };
    let title = ""; const m = /^item:(.+)$/.exec(sku);
    if (m) { const it = ITEM.get(m[1])!; if (!it.available || (this.config().hidden ?? []).includes(it.id)) return { ok: false, error: "unavailable" }; if (this.owns(uid, it.id)) return { ok: false, error: "already_owned" }; title = it.name; }
    else title = sku === "plus:monthly" ? "Tajriba24 Plus (oylik)" : sku === "plus:yearly" ? "Tajriba24 Plus (yillik)" : sku === "premium:monthly" ? "Tajriba24 Premium (oylik)" : sku === "premium:yearly" ? "Tajriba24 Premium (yillik)" : "O'yin kuponi (1 ta o'yin)";
    if (price === null) return { ok: false, error: "price_unset" };
    if (sku.startsWith("plus:") && this.isPlus(uid) && (this.ent(uid).plusUntil! - this.now()) > 400 * DAY) return { ok: false, error: "plus_already_long" };
    if (sku.startsWith("premium:") && this.isPremium(uid) && (this.ent(uid).premiumUntil! - this.now()) > 400 * DAY) return { ok: false, error: "plus_already_long" };
    if (!(this.d.providers ?? []).some((p) => p.channels.includes(channel) && (!provider || p.id === provider))) return { ok: false, error: provider ? "bad_provider" : "payments_unavailable" };
    if (!this.d.phoneOk(uid)) return { ok: false, error: "phone_required" };
    const age = this.d.ageOf(uid); if (age === null) return { ok: false, error: "profile_required" };
    const o: Order = { id: randomBytes(10).toString("hex"), userId: uid, sku, title, amount: price, channel, ...(provider ? { provider } : {}), status: "pending_payment", createdAt: this.now() };
    if (age < MINOR_PAY_AGE) {
      if (parentPhone === undefined || parentPhone === null || parentPhone === "") return { ok: false, error: "parent_phone_required" };
      if (!this.d.consents) return { ok: false, error: "sms_unavailable" };
      const r = await this.d.consents.request(uid, this.d.phoneHashOf(uid), "order", o.id, title, parentPhone, this.d.hashOf);
      if (!r.ok) return { ok: false, error: r.error };
      this.orders.set(o.id, { ...o, status: "pending_parent", consentId: r.request.id }); return { ok: true, order: this.orders.get(o.id)!, parentRequired: true };
    }
    this.orders.set(o.id, o); return this.startCheckout(o.id);
  }
  private async startCheckout(id: string): Promise<{ ok: true; order: Order; parentRequired: boolean } | { ok: false; error: OrderErr }> {
    const o = this.orders.get(id); if (!o) return { ok: false, error: "not_found" };
    const p = (this.d.providers ?? []).find((x) => x.channels.includes(o.channel) && (!o.provider || x.id === o.provider)); if (!p) return { ok: false, error: "payments_unavailable" };
    const c = await p.checkout(o); const n = this.orders.set(id, { ...o, status: "pending_payment", ref: c.ref, checkout: c.url });
    return { ok: true, order: n, parentRequired: false };
  }
  /** Ota-ona qaroridan keyin (ota-ona sahifasi chaqiradi). */
  async onParentDecision(consentId: string, approved: boolean) {
    const o = this.orders.values().find((x) => x.consentId === consentId); if (!o || o.status !== "pending_parent") return;
    if (!approved) { this.orders.set(o.id, { ...o, status: "rejected" }); return; }
    await this.startCheckout(o.id);
  }
  orderOf(uid: string, id: string) { const o = this.orders.get(id); return o && o.userId === uid ? o : undefined; }
  ordersOf(uid: string) { return this.orders.values().filter((o) => o.userId === uid).sort((a, b) => b.createdAt - a.createdAt); }
  cancel(uid: string, id: string): { ok: true } | { ok: false; error: OrderErr } {
    const o = this.orderOf(uid, id); if (!o) return { ok: false, error: "not_found" };
    if (o.status !== "pending_parent" && o.status !== "pending_payment") return { ok: false, error: "not_pending" };
    if (o.consentId) this.d.consents?.cancel(o.consentId, uid);
    this.orders.set(id, { ...o, status: "cancelled" }); return { ok: true };
  }
  /** To'lov tasdig'i (provayder webhook'i yoki sinov): bir marta, summa mos kelsa. */
  confirmPaid(id: string, amount: number, ref?: string): { ok: true; order: Order } | { ok: false; error: OrderErr } {
    const o = this.orders.get(id); if (!o) return { ok: false, error: "not_found" };
    if (o.status === "paid") return { ok: true, order: o }; // takror xabar — ta'sirsiz
    if (o.status !== "pending_payment") return { ok: false, error: "not_pending" };
    if (amount !== o.amount) return { ok: false, error: "amount_mismatch" };
    const n = this.orders.set(id, { ...o, status: "paid", paidAt: this.now(), ref: ref ?? o.ref }); this.grant(n); return { ok: true, order: n };
  }
  private grant(o: Order) {
    const e = this.ent(o.userId);
    if (o.sku.startsWith("plus:")) { const plan = o.sku === "plus:yearly" ? "yearly" : "monthly"; const from = Math.max(this.now(), e.plusUntil ?? 0); this.ents.set(o.userId, { ...e, plusUntil: from + PLUS_DAYS[plan] * DAY, plusPlan: plan, plusCancelled: false }); }
    else if (o.sku.startsWith("premium:")) { const plan = o.sku === "premium:yearly" ? "yearly" : "monthly"; const from = Math.max(this.now(), e.premiumUntil ?? 0); this.ents.set(o.userId, { ...e, premiumUntil: from + PLUS_DAYS[plan] * DAY, premiumPlan: plan, premiumCancelled: false }); }
    else if (o.sku === "coupon:1") this.ents.set(o.userId, { ...e, coupons: (e.coupons ?? 0) + 1 });
    else { const id = o.sku.slice(5); if (!e.owned.includes(id)) this.ents.set(o.userId, { ...e, owned: [...e.owned, id] }); }
  }
  /** Xaridni tiklash: to'langan buyurtmalardan qayta hisoblanadi (obuna muddati ketma-ket uzaytiriladi). */
  restore(uid: string) {
    const paid = this.ordersOf(uid).filter((o) => o.status === "paid").sort((a, b) => (a.paidAt ?? 0) - (b.paidAt ?? 0));
    let until: number | null = null, plan: "monthly" | "yearly" | undefined, pUntil: number | null = null, pPlan: "monthly" | "yearly" | undefined; const owned = new Set<string>();
    for (const o of paid) {
      if (o.sku.startsWith("plus:")) { const p = o.sku === "plus:yearly" ? "yearly" : "monthly"; until = Math.max(o.paidAt!, until ?? 0) + PLUS_DAYS[p] * DAY; plan = p; }
      else if (o.sku.startsWith("premium:")) { const p = o.sku === "premium:yearly" ? "yearly" : "monthly"; pUntil = Math.max(o.paidAt!, pUntil ?? 0) + PLUS_DAYS[p] * DAY; pPlan = p; }
      else if (o.sku.startsWith("item:")) owned.add(o.sku.slice(5));
    }
    const e = this.ent(uid); this.ents.set(uid, { ...e, plusUntil: until, plusPlan: plan, premiumUntil: pUntil, premiumPlan: pPlan, owned: [...new Set([...e.owned.filter((x) => owned.has(x)), ...owned])] });
    return this.catalog(uid);
  }
  // --- admin amallari (sabab va auditga yozilishi marshrut tomonida majburiy) ---
  adminConfirm(id: string, by: string): { ok: true; order: Order } | { ok: false; error: OrderErr } {
    const o = this.orders.get(id); if (!o) return { ok: false, error: "not_found" }; if (o.status !== "pending_payment") return { ok: false, error: "not_pending" };
    const n = this.orders.set(id, { ...o, status: "paid", paidAt: this.now(), ref: `manual:${by}` }); this.grant(n); return { ok: true, order: n };
  }
  adminCancel(id: string): { ok: true } | { ok: false; error: OrderErr } {
    const o = this.orders.get(id); if (!o) return { ok: false, error: "not_found" }; if (o.status !== "pending_payment" && o.status !== "pending_parent") return { ok: false, error: "not_pending" };
    if (o.consentId) this.d.consents?.cancel(o.consentId, o.userId); this.orders.set(id, { ...o, status: "cancelled" }); return { ok: true };
  }
  /** Qaytarish: buyurtma `refunded` bo'ladi, berilgan huquq olinadi. Pulni to'lov provayderi kabinetida alohida qaytarish kerak. */
  refund(id: string, note: string): { ok: true } | { ok: false; error: OrderErr } {
    const o = this.orders.get(id); if (!o) return { ok: false, error: "not_found" }; if (o.status !== "paid") return { ok: false, error: "not_pending" };
    this.orders.set(id, { ...o, status: "refunded", refundedAt: this.now(), note });
    if (o.sku.startsWith("plus:") || o.sku.startsWith("premium:")) this.restore(o.userId);
    else if (o.sku === "coupon:1") { const e = this.ent(o.userId); this.ents.set(o.userId, { ...e, coupons: Math.max(0, (e.coupons ?? 0) - 1) }); }
    else { const e = this.ent(o.userId), item = o.sku.slice(5); const eq = { ...e.equipped }; for (const k of ["pawn", "frame", "avatar"] as const) if (eq[k] === item) delete eq[k]; this.ents.set(o.userId, { ...e, owned: e.owned.filter((x) => x !== item), equipped: eq }); }
    return { ok: true };
  }
  /** Qo'lda Plus berish: 0 so'mlik «to'langan» buyurtma sifatida yoziladi — xaridni tiklash ham to'g'ri hisoblaydi. */
  grantManual(uid: string, plan: "monthly" | "yearly", by: string, note: string): Order {
    const o: Order = { id: randomBytes(10).toString("hex"), userId: uid, sku: `plus:${plan}`, title: `Tajriba24 Plus (${plan === "yearly" ? "yillik" : "oylik"}) — qo'lda`, amount: 0, channel: "web", status: "paid", createdAt: this.now(), paidAt: this.now(), ref: `manual:${by}`, note };
    this.orders.set(o.id, o); this.grant(o); return o;
  }
  revokePlus(uid: string, note: string): number { let n = 0; for (const o of this.ordersOf(uid)) if (o.status === "paid" && o.sku.startsWith("plus:")) { this.orders.set(o.id, { ...o, status: "refunded", refundedAt: this.now(), note }); n++; } this.restore(uid); return n; }
  cancelPremium(uid: string) { const e = this.ent(uid); if (this.isPremium(uid)) this.ents.set(uid, { ...e, premiumCancelled: true }); return this.catalog(uid); }
  cancelPlus(uid: string) { const e = this.ent(uid); if (this.isPlus(uid)) this.ents.set(uid, { ...e, plusCancelled: true }); return this.catalog(uid); }

  equip(uid: string, id: string | null, kind: "pawn" | "frame" | "avatar"): { ok: true } | { ok: false; error: OrderErr } {
    const e = this.ent(uid);
    if (id === null) { const eq = { ...e.equipped }; delete eq[kind]; this.ents.set(uid, { ...e, equipped: eq }); return { ok: true }; }
    const it = ITEM.get(id); if (!it || it.kind !== kind) return { ok: false, error: "bad_item" };
    if (!this.owns(uid, id) && !(it.source === "plus" && this.isPlus(uid))) return { ok: false, error: "not_owned" };
    this.ents.set(uid, { ...e, equipped: { ...e.equipped, [kind]: id } }); return { ok: true };
  }
  /** Plus: har oy bitta fishka yoki ramka tanlanadi (Plus manbali elementlar). */
  claimMonthly(uid: string, id: string): { ok: true } | { ok: false; error: OrderErr } {
    if (!this.isPlus(uid)) return { ok: false, error: "not_plus" };
    const it = ITEM.get(id); if (!it || it.source !== "plus") return { ok: false, error: "bad_item" };
    const e = this.ent(uid); if (e.claimedMonth === ym(this.now())) return { ok: false, error: "already_claimed" };
    this.ents.set(uid, { ...e, claimedMonth: ym(this.now()), owned: e.owned.includes(id) ? e.owned : [...e.owned, id] }); return { ok: true };
  }

  // --- Paket imkoniyatlari: o'yin maydonini ochish chegarasi (kun / hafta / oy, Toshkent vaqti), kupon ---
  /** Joriy paketning chegarasi. */
  quotaOf(uid: string): Quota { return this.config().quotas[this.plan(uid)]; }
  /** Oynalar chegarasi (Toshkent UTC+5: kun 00:00, hafta dushanba, oy 1-sana). */
  private windows() { const L = this.now() + TZ, d = new Date(L), day = Math.floor(L / DAY) * DAY, wd = (d.getUTCDay() + 6) % 7, month = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); return { day: day - TZ, week: day - wd * DAY - TZ, month: month - TZ, nextDay: day + DAY - TZ, nextWeek: day - wd * DAY + 7 * DAY - TZ, nextMonth: Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - TZ }; }
  usage(uid: string) { const w = this.windows(), st = this.ents.get(uid)?.starts ?? []; return { day: st.filter((t) => t >= w.day).length, week: st.filter((t) => t >= w.week).length, month: st.filter((t) => t >= w.month).length, resets: { day: w.nextDay, week: w.nextWeek, month: w.nextMonth } }; }
  /** Yangi maydon ochish mumkinmi: chegara bo'lmasa yoki hech biri to'lmagan bo'lsa. `coupon` — kupon bilan ochish (chegara o'tkazib yuboriladi, kupon bo'lishi shart). */
  createCheck(uid: string, coupon = false): { ok: true; viaCoupon: boolean } | { ok: false; error: "room_limit" | "no_coupon"; detail: { quota: Quota; usage: ReturnType<Commerce["usage"]>; coupons: number; plan: PlanId } } {
    const q = this.quotaOf(uid), u = this.usage(uid), full = (q.day !== null && u.day >= q.day) || (q.week !== null && u.week >= q.week) || (q.month !== null && u.month >= q.month);
    const coupons = this.ents.get(uid)?.coupons ?? 0, detail = { quota: q, usage: u, coupons, plan: this.plan(uid) };
    if (coupon) return coupons > 0 ? { ok: true, viaCoupon: true } : { ok: false, error: "no_coupon", detail };
    return full ? { ok: false, error: "room_limit", detail } : { ok: true, viaCoupon: false };
  }
  /** Xona yaratilganda: kupon bilan ochilgan bo'lsa shu xona belgilanadi (kupon o'yin BOSHLANGANDA sarflanadi). */
  noteRoomCreated(uid: string, code?: string, viaCoupon = false) { if (code && viaCoupon) this.couponRooms.set(code, uid); }
  /** O'yin boshlanganda hisob: kupon yoki kun/hafta/oy hisoblagichi (kutish zalida bekor qilingan hisoblanmaydi). */
  commitStart(code: string, hostId: string) {
    const e = this.ent(hostId), t = this.now();
    if (this.couponRooms.get(code) === hostId) { this.couponRooms.delete(code); this.ents.set(hostId, { ...e, coupons: Math.max(0, (e.coupons ?? 0) - 1) }); return; }
    this.couponRooms.delete(code);
    if (this.isPremium(hostId)) return; // chegarasiz paketda hisoblagich kerak emas
    this.ents.set(hostId, { ...e, starts: [...(e.starts ?? []).filter((x) => x >= t - 40 * DAY), t] });
  }
  historyLimit(uid: string): number | null { return this.isPaid(uid) ? null : this.config().freeHistory; }
  analysisAllowed(uid: string, isLatest: boolean) { return this.isPaid(uid) || isLatest; }
  erase(uid: string) { this.ents.delete(uid); for (const o of this.orders.values()) if (o.userId === uid) this.orders.delete(o.id); }
}
