import { describe, it, expect } from "vitest";
import { buildApp } from "./app";

const PW = "Parol-12345"; const H = (t: string) => ({ authorization: `Bearer ${t}` });
async function setup() {
  const x = buildApp({ webhookSecret: "wh" }); x.commerce.setConfig({ plusMonthly: 30_000, plusYearly: 300_000, items: { "pawn-emerald": 9_000 } });
  const tokOf = (l: string, r: string) => { x.accounts.create("boot", { login: l, name: "T " + l, role: r, password: PW }); const a = x.accounts.byLogin(l)!; x.accounts.accts.set(a.id, { ...a, mustChange: false }); return (x.accounts.login(l, PW, undefined) as any).token as string; };
  const A = tokOf("admin1", "administrator"), F = tokOf("fin1", "finance"), S = tokOf("supp1", "support");
  const j = (m: any, url: string, tok = A, payload?: unknown) => x.app.inject({ method: m, url, headers: H(tok), payload: payload as any });
  const prof = (u: string) => x.app.inject({ method: "PUT", url: "/me/profile", headers: H(u), payload: { name: "N" + u, color: 1, birthYear: 1990 } });
  const paidOrder = async (uid: string, sku: string, amount: number) => { x.adminState.touch(uid, Date.now()); const o = { id: `o-${uid}-${sku}`, userId: uid, sku, title: sku.startsWith("plus") ? "POYGA Plus (oylik)" : "Zumrad", amount, channel: "web" as const, status: "pending_payment" as const, createdAt: Date.now() }; x.commerce.orders.set(o.id, o); expect(x.commerce.confirmPaid(o.id, amount).ok).toBe(true); return o.id; };
  return { x, A, F, S, j, prof, paidOrder };
}

describe("moliya hisoboti va buyurtmalar", () => {
  it("jami daromad, qaytarishlar, kanal/mahsulot bo'yicha, MRR va konversiya", async () => {
    const s = await setup(); for (const u of ["u1", "u2", "u3"]) await s.prof(u); await s.paidOrder("u1", "plus:monthly", 30_000); await s.paidOrder("u2", "item:pawn-emerald", 9_000);
    s.x.commerce.grantManual("u3", "monthly", "root", "tanlov"); // 0 so'm — daromadga kirmaydi
    const r = (await s.j("GET", "/admin/finance/summary", s.F)).json(); expect(r.revenue).toBe(39_000); expect(r.orders).toBe(2); expect(r.payers).toBe(2); expect(r.avgOrder).toBe(19_500); expect(r.plus.active).toBe(2); expect(r.plus.mrr).toBe(60_000);
    expect(r.series.reduce((a: number, b: number) => a + b, 0)).toBe(39_000); expect(r.bySku[0]).toMatchObject({ name: "POYGA Plus (oylik)", sum: 30_000 }); expect(r.conversion).toBeGreaterThan(0);
    expect((await s.j("GET", "/admin/finance/summary", s.S)).statusCode).toBe(403);
  });
  it("buyurtmalar ro'yxati: filtr, qidiruv, tafsilot", async () => {
    const s = await setup(); await s.prof("u1"); await s.prof("u2"); await s.paidOrder("u1", "plus:monthly", 30_000); await s.paidOrder("u2", "item:pawn-emerald", 9_000);
    expect((await s.j("GET", "/admin/finance/orders?sku=plus")).json().total).toBe(1); expect((await s.j("GET", "/admin/finance/orders?q=nu2")).json().total).toBe(1); expect((await s.j("GET", "/admin/finance/orders?status=paid")).json().total).toBe(2);
    expect((await s.j("GET", "/admin/finance/orders/o-u1-plus:monthly")).json().order.user).toBe("Nu1"); expect((await s.j("GET", "/admin/finance/orders/yoq")).json().error).toBe("not_found");
  });
  it("qaytarish: faqat administrator, sabab majburiy; Plus muddati va sotib olingan narsa olinadi; ikkinchi marta mumkin emas", async () => {
    const s = await setup(); await s.prof("u1"); const p = await s.paidOrder("u1", "plus:monthly", 30_000), i = await s.paidOrder("u1", "item:pawn-emerald", 9_000);
    expect(s.x.commerce.isPlus("u1")).toBe(true); expect(s.x.commerce.owns("u1", "pawn-emerald")).toBe(true);
    expect((await s.j("POST", `/admin/finance/orders/${p}/refund`, s.F, { reason: "xato to'lov" })).statusCode).toBe(403);
    expect((await s.j("POST", `/admin/finance/orders/${p}/refund`, s.A, {})).json().error).toBe("reason_required");
    expect((await s.j("POST", `/admin/finance/orders/${p}/refund`, s.A, { reason: "xato to'lov" })).json().ok).toBe(true); expect(s.x.commerce.isPlus("u1")).toBe(false);
    expect((await s.j("POST", `/admin/finance/orders/${i}/refund`, s.A, { reason: "mijoz so'rovi" })).json().ok).toBe(true); expect(s.x.commerce.owns("u1", "pawn-emerald")).toBe(false);
    expect((await s.j("POST", `/admin/finance/orders/${i}/refund`, s.A, { reason: "yana bir bor" })).json().error).toBe("not_pending");
    const r = (await s.j("GET", "/admin/finance/summary", s.A)).json(); expect(r.refunds).toMatchObject({ n: 2, sum: 39_000 }); expect(r.net).toBe(0);
    expect(s.x.adminState.audit.map((a) => a.action)).toContain("order.refund");
  });
  it("qo'lda tasdiqlash/bekor qilish (moliyachi mumkin, sabab bilan); noto'g'ri holat rad", async () => {
    const s = await setup(); await s.prof("u1"); const mk = (id: string) => s.x.commerce.orders.set(id, { id, userId: "u1", sku: "plus:monthly", title: "Plus", amount: 30_000, channel: "web", status: "pending_payment", createdAt: Date.now() });
    mk("pa"); mk("pb"); expect((await s.j("POST", "/admin/finance/orders/pa/confirm", s.F, { reason: "bank o'tkazmasi tasdiqlandi" })).json().ok).toBe(true); expect(s.x.commerce.isPlus("u1")).toBe(true);
    expect((await s.j("POST", "/admin/finance/orders/pa/confirm", s.F, { reason: "yana tasdiq" })).json().error).toBe("not_pending");
    expect((await s.j("POST", "/admin/finance/orders/pb/cancel", s.F, { reason: "mijoz rad etdi" })).json().ok).toBe(true); expect(s.x.commerce.orders.get("pb")!.status).toBe("cancelled");
  });
  it("to'lov xabarlari jurnalga yoziladi; provayder holati", async () => {
    const s = await setup(); await s.prof("u1"); s.x.commerce.orders.set("pw", { id: "pw", userId: "u1", sku: "plus:monthly", title: "Plus", amount: 30_000, channel: "web", status: "pending_payment", createdAt: Date.now() });
    const { createHmac } = await import("node:crypto"); const body = { orderId: "pw", amount: 1 }; const sig = createHmac("sha256", "wh").update(JSON.stringify(body)).digest("hex");
    await s.x.app.inject({ method: "POST", url: "/pay/confirm", headers: { "x-signature": sig }, payload: body });
    const pr = (await s.j("GET", "/admin/finance/provider", s.F)).json(); expect(pr.last24h).toMatchObject({ total: 1, failed: 1 }); expect(pr.events[0].error).toBe("amount_mismatch");
  });
});

describe("katalog, narx tarixi va funksiya bayroqlari", () => {
  it("katalogdan yashirish: do'konda ko'rinmaydi va buyurtma qilib bo'lmaydi; narx o'zgarishi tarixga yoziladi", async () => {
    const s = await setup(); await s.prof("u1");
    await s.j("POST", "/admin/shop/config", s.F, { plusMonthly: 31_000 }); expect((await s.j("GET", "/admin/shop/config-log", s.F)).json().log[0]).toMatchObject({ what: "shop.config" });
    expect((await s.j("POST", "/admin/shop/catalog/pawn-emerald", s.F, { hidden: true })).json().ok).toBe(true);
    const shop = (await s.j("GET", "/shop", "u1")).json(); expect(shop.items.some((i: any) => i.id === "pawn-emerald")).toBe(false);
    expect((await s.j("POST", "/shop/order", "u1", { sku: "item:pawn-emerald" })).json().error).toBe("unavailable");
    expect((await s.j("POST", "/admin/shop/catalog/yoq", s.F, { hidden: true })).json().error).toBe("not_found");
  });
  it("bayroqlar: sabab majburiy; faqat administrator; sotuv to'xtatilsa buyurtma 503; texnik ishlar /status da ko'rinadi; tarixga yoziladi", async () => {
    const s = await setup(); await s.prof("u1");
    expect((await s.j("POST", "/admin/flags", s.A, { salesPaused: true })).json().error).toBe("reason_required"); expect((await s.j("POST", "/admin/flags", s.F, { salesPaused: true, reason: "sinov" })).statusCode).toBe(403);
    expect((await s.j("POST", "/admin/flags", s.A, { salesPaused: true, reason: "provayder ishlamayapti" })).json().flags.salesPaused).toBe(true);
    const o = await s.j("POST", "/shop/order", "u1", { sku: "plus:monthly" }); expect(o.statusCode).toBe(503); expect(o.json().error).toBe("sales_paused");
    await s.j("POST", "/admin/flags", s.A, { salesPaused: false, maintenance: true, maintenanceText: "20:00 da qayta ishga tushadi", reason: "yangilanish" });
    expect((await s.x.app.inject({ method: "GET", url: "/status" })).json()).toMatchObject({ maintenance: true, text: "20:00 da qayta ishga tushadi" });
    expect((await s.j("GET", "/admin/shop/config-log", s.A)).json().log.some((l: any) => l.what === "flags")).toBe(true);
  });
});
