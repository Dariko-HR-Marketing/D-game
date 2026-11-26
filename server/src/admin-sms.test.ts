import { describe, it, expect } from "vitest";
import { buildApp } from "./app";
import { EskizSms } from "./auth";

const PW = "Parol-12345"; const H = (t: string) => ({ authorization: `Bearer ${t}` });
const json = (o: unknown, status = 200) => ({ ok: status < 400, status, json: async () => o }) as Response;
function fakeEskiz(over: { nicks?: string[]; templates?: any[]; balance?: number; user?: boolean } = {}) {
  const calls: string[] = [];
  const f = (async (u: string) => { calls.push(u);
    if (u.endsWith("/auth/login")) return json({ message: "token_generated", data: { token: "T" } });
    if (u.endsWith("/auth/user")) return json({ status: "success", data: { balance: over.balance ?? 15000, email: "secret@x.uz", password: "" } });
    if (u.endsWith("/nick/me")) return json(over.nicks ?? ["4546"]);
    if (u.endsWith("/user/templates")) return json({ success: true, result: over.templates ?? [] });
    return json({}, 404); }) as any;
  return { sms: new EskizSms("e@x.uz", "pw", over.nicks?.[0] ?? "4546", "https://eskiz.test/api", f), calls };
}
async function setup(sms?: any) {
  const x = buildApp({ webhookSecret: "wh", sms }); x.accounts.create("boot", { login: "adm", name: "T adm", role: "administrator", password: PW }); const a = x.accounts.byLogin("adm")!; x.accounts.accts.set(a.id, { ...a, mustChange: false });
  const login = await x.app.inject({ method: "POST", url: "/admin/login", payload: { login: "adm", password: PW } }); return { x, A: (login.json() as any).token as string };
}
describe("admin: SMS tayyorligi (Eskiz)", () => {
  it("sinov jo'natuvchisi (4546) va shablonsiz: tayyor emas; parol/email ko'rinmaydi", async () => {
    const e = fakeEskiz(); const { x, A } = await setup(e.sms); const r = (await x.app.inject({ url: "/admin/sms/status", headers: H(A) })).json();
    expect(r).toMatchObject({ kind: "eskiz", from: "4546", testFrom: true, balance: 15000, nicks: ["4546"], approvedTemplates: 0, ready: false }); expect(JSON.stringify(r)).not.toContain("secret@x.uz");
    expect(r.testTexts).toContain("Bu Eskiz dan test"); expect(r.templates.map((t: any) => t.key)).toEqual(["otp", "parent"]);
  });
  it("o'z nomi tasdiqlangan, shablon tasdiqlangan va balans bor: tayyor", async () => {
    const e = fakeEskiz({ nicks: ["Tajriba24"], balance: 50000, templates: [{ id: 1, original_text: "Tajriba24: tasdiqlash kodi 123456", status: "service" }, { id: 2, original_text: "x", status: "moderation" }] });
    const { x, A } = await setup(e.sms); const r = (await x.app.inject({ url: "/admin/sms/status", headers: H(A) })).json();
    expect(r).toMatchObject({ from: "Tajriba24", testFrom: false, fromApproved: true, approvedTemplates: 1, ready: true }); expect(r.eskizTemplates).toHaveLength(2);
  });
  it("Eskiz bo'lmasa faqat tur ko'rsatiladi; huquqsiz so'rov rad etiladi", async () => {
    const { x, A } = await setup(undefined); expect((await x.app.inject({ url: "/admin/sms/status", headers: H(A) })).json()).toMatchObject({ kind: "none" });
    expect((await x.app.inject({ url: "/admin/sms/status" })).statusCode).toBe(401);
  });
});
