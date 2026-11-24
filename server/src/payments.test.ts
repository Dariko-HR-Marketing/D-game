import { describe, it, expect, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { Commerce, type Order } from "./commerce";
import { PayLedger, PaymeMerchant, ClickMerchant, PaymeProvider, ClickProvider, PAYME_TIMEOUT_MS, TIYIN } from "./payments";

const KEY = "payme-key", SECRET = "click-secret", SID = "12345";
let t = 1_000_000, c: Commerce, led: PayLedger, pm: PaymeMerchant, ck: ClickMerchant;
const auth = "Basic " + Buffer.from("Paycom:" + KEY).toString("base64");
const mkOrder = (id = "o1", amount = 29_000, sku = "plus:monthly"): Order => c.orders.set(id, { id, userId: "u1", sku, title: "Plus", amount, channel: "web", status: "pending_payment", createdAt: t });
const rpc = (method: string, params: any, h = auth) => pm.handle(h, { jsonrpc: "2.0", id: 7, method, params }) as Promise<any>;
const md5 = (s: string) => createHash("md5").update(s).digest("hex");
const click = (o: { action: 0 | 1; order: string; amount: number; prep?: string; tid?: string; error?: number; sign?: string; sid?: string }) => {
  const b: any = { click_trans_id: o.tid ?? "555", service_id: o.sid ?? SID, click_paydoc_id: "9", merchant_trans_id: o.order, amount: o.amount, action: o.action, error: o.error ?? 0, error_note: "", sign_time: "2026-11-21 12:00:00" };
  if (o.action === 1) b.merchant_prepare_id = o.prep;
  b.sign_string = o.sign ?? md5(b.click_trans_id + b.service_id + SECRET + b.merchant_trans_id + (o.action === 1 ? b.merchant_prepare_id : "") + b.amount + b.action + b.sign_time); return ck.handle(b);
};
beforeEach(() => { t = 1_000_000; c = new Commerce({ now: () => t, phoneOk: () => true, ageOf: () => 30, achievements: () => [], phoneHashOf: () => "", hashOf: (s: string) => s } as any); led = new PayLedger(); pm = new PaymeMerchant(c, led, KEY, () => t); ck = new ClickMerchant(c, led, SID, SECRET, () => t); });

describe("Payme Merchant API", () => {
  it("noto'g'ri kalit: -32504, HTTP 200 tanasida", async () => { mkOrder(); const r = await rpc("CheckPerformTransaction", { amount: 2_900_000, account: { order_id: "o1" } }, "Basic xxx"); expect(r.error.code).toBe(-32504); expect(r.id).toBe(7); });
  it("CheckPerformTransaction: to'g'ri summa — allow; noto'g'ri summa -31001; buyurtma yo'q -31050", async () => {
    mkOrder(); expect((await rpc("CheckPerformTransaction", { amount: 29_000 * TIYIN, account: { order_id: "o1" } })).result.allow).toBe(true);
    expect((await rpc("CheckPerformTransaction", { amount: 100, account: { order_id: "o1" } })).error.code).toBe(-31001);
    expect((await rpc("CheckPerformTransaction", { amount: 100, account: { order_id: "zz" } })).error.code).toBe(-31050);
  });
  it("to'liq oqim: Create → Perform → huquq berildi; takroriy chaqiruvlar ta'sirsiz", async () => {
    mkOrder(); const a = { id: "px1", time: t, amount: 2_900_000, account: { order_id: "o1" } };
    const cr = await rpc("CreateTransaction", a); expect(cr.result.state).toBe(1); expect((await rpc("CreateTransaction", a)).result.transaction).toBe(cr.result.transaction);
    t += 5000; const pf = await rpc("PerformTransaction", { id: "px1" }); expect(pf.result.state).toBe(2); expect(pf.result.perform_time).toBe(t);
    expect(c.orders.get("o1")!.status).toBe("paid"); expect(c.isPlus("u1")).toBe(true); const until = c.ent("u1").plusUntil;
    expect((await rpc("PerformTransaction", { id: "px1" })).result.state).toBe(2); expect(c.ent("u1").plusUntil).toBe(until); // ikki marta berilmaydi
    expect((await rpc("CheckTransaction", { id: "px1" })).result.state).toBe(2);
  });
  it("bitta buyurtmaga ikkinchi tranzaksiya -31099", async () => { mkOrder(); const a = { time: t, amount: 2_900_000, account: { order_id: "o1" } }; await rpc("CreateTransaction", { ...a, id: "p1" }); expect((await rpc("CreateTransaction", { ...a, id: "p2" })).error.code).toBe(-31099); });
  it("12 soatdan keyin tranzaksiya bekor bo'ladi (sabab 4); Perform -31008", async () => {
    mkOrder(); await rpc("CreateTransaction", { id: "p1", time: t, amount: 2_900_000, account: { order_id: "o1" } }); t += PAYME_TIMEOUT_MS + 1;
    expect((await rpc("PerformTransaction", { id: "p1" })).error.code).toBe(-31008); const v = (await rpc("CheckTransaction", { id: "p1" })).result; expect(v.state).toBe(-1); expect(v.reason).toBe(4); expect(c.orders.get("o1")!.status).toBe("pending_payment");
  });
  it("CancelTransaction: kutilayotgan (-1) va bajarilgan (-2, qaytarish: Plus bekor)", async () => {
    mkOrder("o1"); await rpc("CreateTransaction", { id: "p1", time: t, amount: 2_900_000, account: { order_id: "o1" } }); expect((await rpc("CancelTransaction", { id: "p1", reason: 3 })).result.state).toBe(-1);
    mkOrder("o2"); await rpc("CreateTransaction", { id: "p2", time: t, amount: 2_900_000, account: { order_id: "o2" } }); await rpc("PerformTransaction", { id: "p2" });
    const r = await rpc("CancelTransaction", { id: "p2", reason: 5 }); expect(r.result.state).toBe(-2); expect(c.orders.get("o2")!.status).toBe("refunded"); expect((await rpc("CancelTransaction", { id: "p2", reason: 5 })).result.state).toBe(-2);
  });
  it("noma'lum tranzaksiya -31003, noma'lum metod -32601, GetStatement oraliq bo'yicha", async () => {
    expect((await rpc("PerformTransaction", { id: "yo'q" })).error.code).toBe(-31003); expect((await rpc("Nope", {})).error.code).toBe(-32601);
    mkOrder(); await rpc("CreateTransaction", { id: "p1", time: t, amount: 2_900_000, account: { order_id: "o1" } });
    expect((await rpc("GetStatement", { from: t - 1, to: t + 1 })).result.transactions.length).toBe(1); expect((await rpc("GetStatement", { from: 0, to: 5 })).result.transactions.length).toBe(0);
  });
});

describe("Click Prepare/Complete", () => {
  it("to'liq oqim: Prepare → Complete → huquq; takroriy Complete -4", () => {
    mkOrder(); const p = click({ action: 0, order: "o1", amount: 29_000 }); expect(p.error).toBe(0); expect(p.merchant_prepare_id).toBeTruthy();
    expect((click({ action: 0, order: "o1", amount: 29_000 }).merchant_prepare_id)).toBe(p.merchant_prepare_id); // takroriy Prepare — o'sha tranzaksiya
    const k = click({ action: 1, order: "o1", amount: 29_000, prep: String(p.merchant_prepare_id) }); expect(k.error).toBe(0); expect(c.orders.get("o1")!.status).toBe("paid"); expect(c.isPlus("u1")).toBe(true);
    expect(click({ action: 1, order: "o1", amount: 29_000, prep: String(p.merchant_prepare_id) }).error).toBe(-4);
    expect(click({ action: 0, order: "o1", amount: 29_000 }).error).toBe(-4);
  });
  it("imzo xato -1, noto'g'ri service_id -1, noma'lum buyurtma -5, summa -2, action -3", () => {
    mkOrder(); expect(click({ action: 0, order: "o1", amount: 29_000, sign: "bad" }).error).toBe(-1); expect(click({ action: 0, order: "o1", amount: 29_000, sid: "999" }).error).toBe(-1);
    expect(click({ action: 0, order: "zz", amount: 29_000 }).error).toBe(-5); expect(click({ action: 0, order: "o1", amount: 100 }).error).toBe(-2); expect(ck.handle({ action: 7 }).error).toBe(-3);
  });
  it("Complete: tranzaksiya yo'q -6; Click xato bilan chaqirsa bekor (-9) va to'lov bo'lmaydi", () => {
    mkOrder(); expect(click({ action: 1, order: "o1", amount: 29_000, prep: "nope" }).error).toBe(-6);
    const p = click({ action: 0, order: "o1", amount: 29_000 }); expect(click({ action: 1, order: "o1", amount: 29_000, prep: String(p.merchant_prepare_id), error: -5017 }).error).toBe(-9);
    expect(c.orders.get("o1")!.status).toBe("pending_payment");
  });
});

describe("to'lov oynasi manzillari", () => {
  it("Payme: base64(m;ac.order_id;a tiyinda;l;c); Click: service_id, amount so'mda, transaction_param", async () => {
    const o = mkOrder(); const pu = (await new PaymeProvider("M1", { returnUrl: "https://t24.uz/back" }).checkout(o)).url!;
    expect(Buffer.from(new URL(pu).pathname.slice(1), "base64").toString()).toBe("m=M1;ac.order_id=o1;a=2900000;l=uz;c=https://t24.uz/back?tolov=o1"); // qaytganda mijoz buyurtma holatini ko'rsatadi
    const cu = new URL((await new ClickProvider("S1", "M2", { returnUrl: "https://t24.uz/back" }).checkout(o)).url!); expect(cu.searchParams.get("service_id")).toBe("S1"); expect(cu.searchParams.get("amount")).toBe("29000"); expect(cu.searchParams.get("transaction_param")).toBe("o1"); expect(cu.searchParams.get("return_url")).toBe("https://t24.uz/back?tolov=o1");
  });
});

describe("marshrutlar (app)", () => {
  it("kalit berilmasa /pay/* yo'q; berilsa Payme va Click ishlaydi, buyurtma provayder tanlaydi", async () => {
    const { buildApp } = await import("./app");
    const off = buildApp(); expect((await off.app.inject({ method: "POST", url: "/pay/payme", payload: {} })).statusCode).toBe(404); expect((await off.app.inject({ method: "POST", url: "/pay/click", payload: {} })).statusCode).toBe(404);
    Object.assign(process.env, { PAYME_MERCHANT_ID: "M1", PAYME_KEY: KEY, CLICK_SERVICE_ID: SID, CLICK_MERCHANT_ID: "CM", CLICK_SECRET_KEY: SECRET });
    try {
      const x = buildApp(); await x.ready;
      expect(x.commerce.catalog("u").providers).toEqual(["payme", "click"]);
      x.commerce.orders.set("o9", { id: "o9", userId: "u1", sku: "plus:monthly", title: "Plus", amount: 29_000, channel: "web", provider: "payme", status: "pending_payment", createdAt: Date.now() });
      const r = await x.app.inject({ method: "POST", url: "/pay/payme", headers: { authorization: auth }, payload: { jsonrpc: "2.0", id: 1, method: "CheckPerformTransaction", params: { amount: 2_900_000, account: { order_id: "o9" } } } });
      expect(r.statusCode).toBe(200); expect(r.json().result.allow).toBe(true);
      expect((await x.app.inject({ method: "POST", url: "/pay/payme", payload: { jsonrpc: "2.0", id: 1, method: "CheckPerformTransaction", params: {} } })).json().error.code).toBe(-32504);
      const b = { click_trans_id: "1", service_id: SID, merchant_trans_id: "o9", amount: "29000", action: "0", sign_time: "2026-11-21 12:00:00" } as any; b.sign_string = md5(b.click_trans_id + b.service_id + SECRET + b.merchant_trans_id + b.amount + b.action + b.sign_time);
      const cr = await x.app.inject({ method: "POST", url: "/pay/click/prepare", headers: { "content-type": "application/x-www-form-urlencoded" }, payload: new URLSearchParams(b).toString() }); expect(cr.json().error).toBe(0);
    } finally { for (const k of ["PAYME_MERCHANT_ID", "PAYME_KEY", "CLICK_SERVICE_ID", "CLICK_MERCHANT_ID", "CLICK_SECRET_KEY"]) delete process.env[k]; }
  });
});
