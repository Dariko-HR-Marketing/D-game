import { describe, it, expect } from "vitest";
import { buildApp } from "./app";

const PW = "Parol-12345"; const H = (t: string) => ({ authorization: `Bearer ${t}` });
async function setup() {
  const x = buildApp({ webhookSecret: "wh" });
  const tokOf = (l: string, r: string) => { x.accounts.create("boot", { login: l, name: "T " + l, role: r, password: PW }); const a = x.accounts.byLogin(l)!; x.accounts.accts.set(a.id, { ...a, mustChange: false }); return x.accounts.login(l, PW, undefined, { ip: "1.1.1.1", ua: "t" }) as any; };
  const A = tokOf("adm", "administrator").token, F = tokOf("fin", "finance").token;
  const j = (m: any, url: string, tok = A, payload?: unknown) => x.app.inject({ method: m, url, headers: H(tok), payload: payload as any });
  return { x, A, F, j };
}
describe("admin sinov rejimi", () => {
  it("telefon bo'yicha topish, paketlarni berish va qaytarib olish; raqam jurnalga tushmaydi", async () => {
    const s = await setup(); const uid = "u1"; s.x.adminState.touch(uid, Date.now()); s.x.phones.link(uid, "+998901234567");
    expect((await s.j("POST", "/admin/test/lookup", s.F, { phone: "+998901234567" })).statusCode).toBe(403);
    expect((await s.j("POST", "/admin/test/lookup", s.A, { phone: "+998901112233" })).json().error).toBe("no_user");
    expect((await s.j("POST", "/admin/test/lookup", s.A, { phone: "123" })).json().error).toBe("bad_phone");
    const f = (await s.j("POST", "/admin/test/lookup", s.A, { phone: "+998 90 123 45 67" })).json(); expect(f.user).toMatchObject({ userId: uid, plan: "start" });
    expect((await s.j("POST", "/admin/test/grant", s.A, { userId: uid, kind: "premium", days: 30 })).json().error).toBe("reason_required");
    const g = (await s.j("POST", "/admin/test/grant", s.A, { userId: uid, kind: "full", days: 365, reason: "sinov" })).json();
    expect(g.user).toMatchObject({ plan: "premium", coupons: 5 }); expect(g.user.org).toMatchObject({ active: true, test: true });
    expect(s.x.commerce.catalog(uid).pkg.plan).toBe("premium");
    expect(JSON.stringify(s.x.adminState.audit)).not.toContain("901234567");
    expect((await s.j("GET", "/admin/test/list")).json().users.length).toBe(1);
    expect((await s.j("POST", "/admin/test/grant", s.A, { userId: uid, kind: "x", reason: "sinov" })).json().error).toBe("bad_kind");
    const r = (await s.j("POST", "/admin/test/revoke", s.A, { userId: uid, reason: "tugadi" })).json(); expect(r.revoked).toBe(7); expect(r.user).toMatchObject({ plan: "start", coupons: 0 }); expect(r.user.org.active).toBe(false);
    expect((await s.j("GET", "/admin/test/list")).json().users.length).toBe(0);
  });
  it("haqiqiy xaridga tegmaydi; ADMIN_TEST_TOOLS=0 bo'lsa o'chadi", async () => {
    const s = await setup(); const uid = "u2"; s.x.adminState.touch(uid, Date.now());
    s.x.commerce.orders.set("real", { id: "real", userId: uid, sku: "plus:monthly", title: "Plus", amount: 49_000, channel: "web", status: "paid", createdAt: Date.now(), paidAt: Date.now(), ref: "payme:1" }); s.x.commerce.restore(uid);
    await s.j("POST", "/admin/test/grant", s.A, { userId: uid, kind: "premium", reason: "sinov" }); await s.j("POST", "/admin/test/revoke", s.A, { userId: uid, reason: "tugadi" });
    expect(s.x.commerce.plan(uid)).toBe("plus");
    process.env.ADMIN_TEST_TOOLS = "0"; try { expect((await s.j("POST", "/admin/test/grant", s.A, { userId: uid, kind: "plus", reason: "sinov" })).json().error).toBe("test_off"); } finally { delete process.env.ADMIN_TEST_TOOLS; }
  });
});
