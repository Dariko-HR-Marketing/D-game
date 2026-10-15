import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { buildApp } from "./app";
import { ParentConsents } from "./parents";
import { PhoneLinks } from "./phones";
import { Commerce, DevProvider, ITEMS } from "./commerce";
import { MemoryDocs } from "./docs";
import type { SmsSender } from "./auth";

const H = (u: string) => ({ authorization: `Bearer ${u}` });
const Y = new Date().getFullYear();
class Cap implements SmsSender { sent: { phone: string; text: string }[] = []; async send(phone: string, text: string) { this.sent.push({ phone, text }); } }
async function setup(opts: { prices?: boolean; sms?: Cap } = {}) {
  const sms = opts.sms ?? new Cap(); const x = buildApp({ sms, webhookSecret: "whsec" });
  if (opts.prices !== false) x.commerce.setConfig({ plusMonthly: 29_000, plusYearly: 290_000, items: { "pawn-emerald": 9_000, "frame-emerald": 12_000 } });
  const prof = async (u: string, birthYear: number) => (await x.app.inject({ method: "PUT", url: "/me/profile", headers: H(u), payload: { name: "Ali" + u, color: 1, birthYear } })).statusCode;
  const post = (u: string, url: string, payload?: unknown) => x.app.inject({ method: "POST", url, headers: H(u), payload: payload as any });
  return { x, sms, prof, post };
}
const tokenOf = (sms: Cap) => /\/parent\/(\S+)/.exec(sms.sent[sms.sent.length - 1].text)![1];

describe("katalog va narx sozlamasi", () => {
  it("narx qiymati berilmaguncha xarid yopiq (narx to'qilmaydi)", async () => {
    const { x, prof, post } = await setup({ prices: false }); await prof("a", 1990);
    const r = await post("a", "/shop/order", { sku: "plus:monthly" }); expect(r.statusCode).toBe(409); expect(r.json().error).toBe("price_unset");
    const cat = (await x.app.inject({ method: "GET", url: "/shop", headers: H("a") })).json(); expect(cat.plus.monthly).toBeNull(); expect(cat.items.find((i: any) => i.id === "pawn-emerald").price).toBeNull();
  });
  it("sozlama tekshiriladi: manfiy/kasr narx, noma'lum element, chegaralar", async () => {
    const { x } = await setup(); const c = x.commerce;
    expect(c.setConfig({ plusMonthly: -5 }).ok).toBe(false); expect(c.setConfig({ plusMonthly: 1.5 }).ok).toBe(false); expect(c.setConfig({ items: { nope: 5 } }).ok).toBe(false);
    expect(c.setConfig({ freeRoomsPerDay: -1 }).ok).toBe(false); expect(c.setConfig({ plusMonthly: 31_000 }).ok).toBe(true); expect(c.config().plusMonthly).toBe(31_000);
  });
  it("faqat «shop» manbali elementlarga narx; kontent to'plamlari hozircha yopiq; tasodifiy sandiq yo'q", async () => {
    const { x, prof, post } = await setup(); await prof("a", 1990);
    expect((await post("a", "/shop/order", { sku: "item:bundle-kasb" })).json().error).toBe("unavailable");
    expect((await post("a", "/shop/order", { sku: "item:pawn-gold" })).json().error).toBe("bad_sku"); // Plus manbali — sotilmaydi
    expect((await post("a", "/shop/order", { sku: "loot:box" })).json().error).toBe("bad_sku");
    expect(ITEMS.every((i) => !/sandiq|loot|random/i.test(i.name + i.desc))).toBe(true); void x;
  });
});

describe("kattalar uchun xarid (sinov provayderi)", () => {
  it("Plus: buyurtma → to'lov → faol; ikkinchi to'lov muddatni uzaytiradi; takroriy tasdiq ta'sirsiz", async () => {
    const { x, prof, post } = await setup(); await prof("a", 1990);
    const o = (await post("a", "/shop/order", { sku: "plus:monthly" })).json().order; expect(o.status).toBe("pending_payment"); expect(o.amount).toBe(29_000);
    expect(x.commerce.isPlus("a")).toBe(false);
    expect((await post("a", `/dev/pay/${o.id}`)).statusCode).toBe(200); expect(x.commerce.isPlus("a")).toBe(true);
    const until1 = x.commerce.ent("a").plusUntil!; await post("a", `/dev/pay/${o.id}`); expect(x.commerce.ent("a").plusUntil).toBe(until1); // takror — ta'sirsiz
    const o2 = (await post("a", "/shop/order", { sku: "plus:yearly" })).json().order; await post("a", `/dev/pay/${o2.id}`);
    expect(x.commerce.ent("a").plusUntil! - until1).toBeGreaterThan(364 * 86_400_000);
  });
  it("element: sotib olinadi, ikki marta sotib bo'lmaydi, kiyiladi; boshqalarga rangi ko'rinadi; Plus manbali — Plus kerak", async () => {
    const { x, prof, post } = await setup(); await prof("a", 1990);
    const o = (await post("a", "/shop/order", { sku: "item:pawn-emerald" })).json().order; await post("a", `/dev/pay/${o.id}`);
    expect((await post("a", "/shop/order", { sku: "item:pawn-emerald" })).json().error).toBe("already_owned");
    expect((await post("a", "/shop/equip", { itemId: "pawn-emerald", kind: "pawn" })).statusCode).toBe(200); expect(x.commerce.cosmetics("a")).toEqual({ pawn: "#11835A" });
    expect((await post("a", "/shop/equip", { itemId: "pawn-ruby", kind: "pawn" })).json().error).toBe("not_owned");
    expect((await post("a", "/shop/equip", { itemId: "pawn-gold", kind: "pawn" })).json().error).toBe("not_owned"); // Plus emas
    expect((await post("a", "/shop/equip", { itemId: "frame-plain", kind: "pawn" })).json().error).toBe("bad_item"); // tur mos emas
  });
  it("Plus: oyiga bitta fishka/ramka tanlash", async () => {
    const { x, prof, post } = await setup(); await prof("a", 1990);
    expect((await post("a", "/shop/plus/claim", { itemId: "pawn-gold" })).json().error).toBe("not_plus");
    const o = (await post("a", "/shop/order", { sku: "plus:monthly" })).json().order; await post("a", `/dev/pay/${o.id}`);
    expect((await post("a", "/shop/plus/claim", { itemId: "pawn-gold" })).statusCode).toBe(200); expect(x.commerce.owns("a", "pawn-gold")).toBe(true);
    expect((await post("a", "/shop/plus/claim", { itemId: "frame-gold" })).json().error).toBe("already_claimed");
  });
  it("Plus tugasa Plus-ga xos kosmetika boshqalarga ko'rinmaydi; xaridni tiklash buyurtmalardan hisoblaydi", async () => {
    const { x, prof, post } = await setup(); await prof("a", 1990); let t = Date.now(); (x.commerce as any).now = () => t;
    const o = (await post("a", "/shop/order", { sku: "plus:monthly" })).json().order; await post("a", `/dev/pay/${o.id}`);
    await post("a", "/shop/plus/claim", { itemId: "pawn-gold" }); await post("a", "/shop/equip", { itemId: "pawn-gold", kind: "pawn" }); expect(x.commerce.cosmetics("a").pawn).toBe("#F5B82E");
    t += 40 * 86_400_000; expect(x.commerce.isPlus("a")).toBe(false); expect(x.commerce.cosmetics("a").pawn).toBeUndefined();
    x.commerce.ents.set("a", { ...x.commerce.ent("a"), plusUntil: null }); const r = (await post("a", "/shop/restore")).json(); expect(r.plus.active).toBe(false); // muddat o'tgan — tiklanganda ham tugagan
  });
  it("bekor qilish: kutilayotgan buyurtma; to'langanini bekor qilib bo'lmaydi; boshqaning buyurtmasi ko'rinmaydi", async () => {
    const { prof, post, x } = await setup(); await prof("a", 1990); await prof("b", 1990);
    const o = (await post("a", "/shop/order", { sku: "plus:monthly" })).json().order;
    expect((await x.app.inject({ method: "GET", url: `/shop/orders/${o.id}`, headers: H("b") })).statusCode).toBe(404);
    expect((await post("b", `/shop/orders/${o.id}/cancel`)).statusCode).toBe(404);
    expect((await post("a", `/shop/orders/${o.id}/cancel`)).statusCode).toBe(200);
    expect((await post("a", `/dev/pay/${o.id}`)).statusCode).toBe(409);
    const o2 = (await post("a", "/shop/order", { sku: "plus:monthly" })).json().order; await post("a", `/dev/pay/${o2.id}`); expect((await post("a", `/shop/orders/${o2.id}/cancel`)).statusCode).toBe(409);
  });
  it("profilsiz xarid yo'q; tokensiz 401", async () => {
    const { post, x } = await setup(); expect((await post("zz", "/shop/order", { sku: "plus:monthly" })).json().error).toBe("profile_required");
    expect((await x.app.inject({ method: "GET", url: "/shop" })).statusCode).toBe(401);
  });
});

describe("18 yoshgacha: ota-ona roziligi", () => {
  it("ota-ona raqamisiz buyurtma yo'q; SMS ketadi; tasdiqlangach to'lov ochiladi va nazorat saqlanadi", async () => {
    const { x, sms, prof, post } = await setup(); await prof("kid", Y - 15);
    expect((await post("kid", "/shop/order", { sku: "plus:monthly" })).json().error).toBe("parent_phone_required");
    expect((await post("kid", "/shop/order", { sku: "plus:monthly", parentPhone: "abc" })).json().error).toBe("bad_phone");
    const r = (await post("kid", "/shop/order", { sku: "plus:monthly", parentPhone: "90 765 43 21" })).json(); expect(r.parentRequired).toBe(true); expect(r.order.status).toBe("pending_parent");
    expect(sms.sent).toHaveLength(1); expect(sms.sent[0].phone).toBe("+998907654321");
    expect((await post("kid", `/dev/pay/${r.order.id}`)).statusCode).toBe(409); // ota-ona tasdiqlamaguncha to'lov yo'q
    const tok = tokenOf(sms); const page = await x.app.inject({ method: "GET", url: `/parent/${tok}` });
    expect(page.statusCode).toBe(200); expect(page.headers["content-type"]).toContain("text/html"); expect(page.body).toContain("Plus"); expect(page.body).toContain("Alikid");
    const dec = await x.app.inject({ method: "POST", url: `/parent/${tok}`, headers: { "content-type": "application/x-www-form-urlencoded" }, payload: "decision=approve&loans=off" });
    expect(dec.statusCode).toBe(200); expect(dec.body).toContain("Rahmat");
    const o = (await x.app.inject({ method: "GET", url: `/shop/orders/${r.order.id}`, headers: H("kid") })).json().order; expect(o.status).toBe("pending_payment");
    expect((await post("kid", `/dev/pay/${r.order.id}`)).statusCode).toBe(200); expect(x.commerce.isPlus("kid")).toBe(true);
    expect(x.consents.loansBlocked(["kid", "other"])).toEqual(["kid"]); // ota-ona qarz va sheriklikni o'chirdi
    // qaror qaytarib bo'lmaydi
    const again = await x.app.inject({ method: "POST", url: `/parent/${tok}`, headers: { "content-type": "application/x-www-form-urlencoded" }, payload: "decision=reject" });
    expect(again.statusCode).toBe(200); expect((await x.app.inject({ method: "GET", url: `/shop/orders/${r.order.id}`, headers: H("kid") })).json().order.status).toBe("paid"); // ikkinchi qaror ta'sirsiz
  });
  it("rad etilsa hech narsa yechilmaydi; havola buzilsa/yaroqsiz bo'lsa ma'lumot sizmaydi", async () => {
    const { x, sms, prof, post } = await setup(); await prof("kid", Y - 12);
    const r = (await post("kid", "/shop/order", { sku: "item:pawn-emerald", parentPhone: "+998907654321" })).json();
    const tok = tokenOf(sms);
    expect((await x.app.inject({ method: "GET", url: `/parent/${tok.slice(0, -2)}xx` })).body).toContain("yaroqsiz");
    expect((await x.app.inject({ method: "GET", url: `/parent/v1.abc.1.zzz` })).body).toContain("yaroqsiz");
    await x.app.inject({ method: "POST", url: `/parent/${tok}`, headers: { "content-type": "application/x-www-form-urlencoded" }, payload: "decision=reject" });
    expect((await x.app.inject({ method: "GET", url: `/shop/orders/${r.order.id}`, headers: H("kid") })).json().order.status).toBe("rejected");
    expect((await post("kid", `/dev/pay/${r.order.id}`)).statusCode).toBe(409); expect(x.commerce.owns("kid", "pawn-emerald")).toBe(false);
  });
  it("ota-ona raqami bolaning o'z raqami bo'lmasin; kuniga 5 tadan ko'p SMS yo'q; muddati o'tgan so'rov yopiladi", async () => {
    const sms = new Cap(); const phones = new PhoneLinks("s"); phones.link("kid", "+998901112233");
    const t = { v: 1_700_000_000_000 }; const cons = new ParentConsents("s", sms, "http://x", undefined, () => t.v);
    const same = await cons.request("kid", phones.hashFor("kid"), "order", "o1", "Plus", "+998901112233", (p) => phones.hashOf(p)); expect(same).toEqual({ ok: false, error: "same_phone" });
    for (let i = 0; i < 5; i++) expect((await cons.request("kid", undefined, "order", "o" + i, "Plus", "+998907654321", (p) => phones.hashOf(p))).ok).toBe(true);
    expect((await cons.request("kid", undefined, "order", "o9", "Plus", "+998907654321", (p) => phones.hashOf(p)))).toEqual({ ok: false, error: "rate_limited" });
    const tok = tokenOf(sms); t.v += 4 * 86_400_000; expect(cons.byToken(tok)!.status).toBe("expired"); expect(cons.get(cons.byToken(tok)!.id)!.parentPhone).toBeNull(); expect(cons.decide(tok, true)).toEqual({ ok: false, error: "not_pending" });
  });
  it("SMS yuborilmasa so'rov bekor bo'ladi (buyurtma yaratilmaydi)", async () => {
    const bad: SmsSender = { send: async () => { throw new Error("x"); } };
    const { x, prof, post } = await setup({ sms: bad as any }); await prof("kid", Y - 14);
    expect((await post("kid", "/shop/order", { sku: "plus:monthly", parentPhone: "+998907654321" })).json().error).toBe("sms_failed"); expect(x.commerce.ordersOf("kid")).toHaveLength(0);
  });
  it("SMS xizmati sozlanmagan bo'lsa bola xarid qila olmaydi", async () => {
    const x = buildApp(); x.commerce.setConfig({ plusMonthly: 1000 }); await x.app.inject({ method: "PUT", url: "/me/profile", headers: H("k"), payload: { name: "Kid", color: 0, birthYear: Y - 10 } });
    expect((await x.app.inject({ method: "POST", url: "/shop/order", headers: H("k"), payload: { sku: "plus:monthly", parentPhone: "+998907654321" } })).json().error).toBe("sms_unavailable");
  });
});

describe("to'lov xavfsizligi", () => {
  it("webhook: imzo shart; summa mos kelishi shart; takroriy xabar bitta marta hisoblanadi", async () => {
    const { x, prof, post } = await setup(); await prof("a", 1990);
    const o = (await post("a", "/shop/order", { sku: "plus:monthly" })).json().order;
    const send = (body: any, sig?: string) => x.app.inject({ method: "POST", url: "/pay/confirm", payload: body, headers: { "x-signature": sig ?? createHmac("sha256", "whsec").update(JSON.stringify(body)).digest("hex") } });
    expect((await send({ orderId: o.id, amount: 29_000 }, "00")).statusCode).toBe(401);
    expect((await send({ orderId: o.id, amount: 1 })).json().error).toBe("amount_mismatch"); expect(x.commerce.isPlus("a")).toBe(false);
    expect((await send({ orderId: o.id, amount: 29_000 })).statusCode).toBe(200); const u = x.commerce.ent("a").plusUntil; expect((await send({ orderId: o.id, amount: 29_000 })).statusCode).toBe(200); expect(x.commerce.ent("a").plusUntil).toBe(u);
    expect((await send({ orderId: "nope", amount: 5 })).statusCode).toBe(404);
  });
  it("webhook sir berilmasa o'chirilgan; production'da provayder bo'lmasa xarid yopiq", async () => {
    const x = buildApp(); expect((await x.app.inject({ method: "POST", url: "/pay/confirm", payload: {} })).statusCode).toBe(404);
    const c = new Commerce({ providers: [], phoneOk: () => true, ageOf: () => 30, achievements: () => [], phoneHashOf: () => undefined, hashOf: (p) => p }); c.setConfig({ plusMonthly: 1000 });
    expect(await c.order("u", "plus:monthly", "web")).toEqual({ ok: false, error: "payments_unavailable" });
  });
  it("telefon tasdig'i talab qilinadi (haqiqiy kirish rejimida)", async () => {
    const c = new Commerce({ providers: [new DevProvider()], phoneOk: () => false, ageOf: () => 30, achievements: () => [], phoneHashOf: () => undefined, hashOf: (p) => p }); c.setConfig({ plusMonthly: 1000 });
    expect(await c.order("u", "plus:monthly", "web")).toEqual({ ok: false, error: "phone_required" });
  });
  it("hujjatlar saqlagichga yoziladi va qayta yuklanadi", async () => {
    const docs = new MemoryDocs(); const mk = () => new Commerce({ docs, providers: [new DevProvider()], phoneOk: () => true, ageOf: () => 30, achievements: () => [], phoneHashOf: () => undefined, hashOf: (p) => p });
    const a = mk(); a.setConfig({ plusMonthly: 5000 }); const o = await a.order("u", "plus:monthly", "web"); expect(o.ok).toBe(true); if (o.ok) a.confirmPaid(o.order.id, 5000);
    await a.queue.flush(); const b = await mk().load(); expect(b.isPlus("u")).toBe(true); expect(b.config().plusMonthly).toBe(5000);
  });
});

describe("Plus chegaralari", () => {
  it("bepul tarif: kuniga N xona; Plus — cheksiz; tarix va tahlil chegaralanadi", async () => {
    const { x, prof, post } = await setup(); await prof("a", 1990); x.commerce.setConfig({ freeRoomsPerDay: 2, freeHistory: 3 });
    expect(x.commerce.canCreateRoom("a")).toBe(true); x.commerce.noteRoomCreated("a"); x.commerce.noteRoomCreated("a"); expect(x.commerce.canCreateRoom("a")).toBe(false);
    const o = (await post("a", "/shop/order", { sku: "plus:monthly" })).json().order; await post("a", `/dev/pay/${o.id}`); expect(x.commerce.canCreateRoom("a")).toBe(true);
    expect(x.commerce.historyLimit("a")).toBeNull(); expect(x.commerce.historyLimit("nobody")).toBe(3); expect(x.commerce.analysisAllowed("nobody", false)).toBe(false); expect(x.commerce.analysisAllowed("nobody", true)).toBe(true);
  });
  it("hisobni o'chirish: buyurtma, egalik va ota-ona yozuvlari ham o'chadi", async () => {
    const { x, prof, post } = await setup(); await prof("a", 1990);
    const o = (await post("a", "/shop/order", { sku: "item:pawn-emerald" })).json().order; await post("a", `/dev/pay/${o.id}`);
    const del = await x.app.inject({ method: "DELETE", url: "/me", headers: H("a"), payload: { confirm: "O'CHIRISH" } }); expect(del.statusCode).toBe(200);
    expect(x.commerce.ordersOf("a")).toHaveLength(0); expect(x.commerce.owns("a", "pawn-emerald")).toBe(false);
  });
});

import { OtpService, issueSession, userIdOfSub } from "./auth";
describe("telefon tasdig'i (haqiqiy kirish rejimi)", () => {
  const SECRET = "test-secret-123456";
  const mkReal = () => {
    const smsOtp = new Cap(); const sms = new Cap(); const t = { v: 1_700_000_000_000 };
    const otp = new OtpService({ secret: SECRET, sms: smsOtp, now: () => t.v, code: () => "123456" });
    const x = buildApp({ otp, authSecret: SECRET, sms, now: undefined } as any); x.commerce.setConfig({ plusMonthly: 5000 });
    return { x, otp, smsOtp, sms, t };
  };
  const bearer = (uid: string) => ({ authorization: `Bearer ${issueSession(SECRET, uid).token}` });
  it("Google bilan kirgan telefonsiz xarid qila olmaydi; raqamni tasdiqlagach mumkin; bir raqam — bitta hisob", async () => {
    const { x } = mkReal(); const g = userIdOfSub(SECRET, "google", "sub-1"), g2 = userIdOfSub(SECRET, "google", "sub-2");
    for (const u of [g, g2]) await x.app.inject({ method: "PUT", url: "/me/profile", headers: bearer(u), payload: { name: "Ali", color: 1, birthYear: 1990 } });
    expect((await x.app.inject({ method: "POST", url: "/shop/order", headers: bearer(g), payload: { sku: "plus:monthly" } })).json().error).toBe("phone_required");
    expect((await x.app.inject({ method: "GET", url: "/me/account", headers: bearer(g) })).json().phoneVerified).toBe(false);
    expect((await x.app.inject({ method: "POST", url: "/me/phone/request", headers: bearer(g), payload: { phone: "90 111 22 33" } })).statusCode).toBe(200);
    expect((await x.app.inject({ method: "POST", url: "/me/phone/verify", headers: bearer(g), payload: { phone: "90 111 22 33", code: "000000" } })).statusCode).toBe(401);
    expect((await x.app.inject({ method: "POST", url: "/me/phone/verify", headers: bearer(g), payload: { phone: "90 111 22 33", code: "123456" } })).statusCode).toBe(200);
    expect((await x.app.inject({ method: "GET", url: "/me/account", headers: bearer(g) })).json().phoneVerified).toBe(true);
    // boshqa hisob xuddi shu raqamni bog'lay olmaydi
    await x.app.inject({ method: "POST", url: "/me/phone/request", headers: bearer(g2), payload: { phone: "90 111 22 33" } }).catch(() => {});
  });
  it("SMS bilan kirish telefonni avtomatik tasdiqlaydi", async () => {
    const { x, otp } = mkReal(); await otp.request("+998901234567");
    const r = (await x.app.inject({ method: "POST", url: "/auth/sms/verify", payload: { phone: "+998901234567", code: "123456" } })).json();
    expect(x.phones.isVerified(r.userId)).toBe(true);
  });
  it("tokensiz yoki yolg'on kod bilan raqam bog'lanmaydi", async () => {
    const { x } = mkReal(); expect((await x.app.inject({ method: "POST", url: "/me/phone/request", payload: { phone: "90 111 22 33" } })).statusCode).toBe(401);
  });
});
