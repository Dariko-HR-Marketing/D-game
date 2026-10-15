import { describe, it, expect } from "vitest";
import WebSocket from "ws";
import { buildApp } from "./app";
import { OtpService, normalizePhone, signToken, verifyToken, HttpSms, type SmsSender } from "./auth";

const SECRET = "x".repeat(40);
class Capture implements SmsSender { sent: { phone: string; text: string }[] = []; fail = false;
  async send(phone: string, text: string) { if (this.fail) throw new Error("down"); this.sent.push({ phone, text }); }
  code() { return /(\d{6})/.exec(this.sent.at(-1)!.text)![1]; } }

describe("telefon raqami", () => {
  it.each([["+998901234567", "+998901234567"], ["90 123-45-67", "+998901234567"], ["998 (90) 123 45 67", "+998901234567"], ["+12025550123", "+12025550123"]])("%s", (a, b) => expect(normalizePhone(a)).toBe(b));
  it.each(["", "abc", "123", "+99890123", 12345, null, "+998901234567890123"])("rad: %s", (v) => expect(normalizePhone(v)).toBeNull());
});
describe("sessiya tokeni", () => {
  it("imzo, muddat va buzilish", () => {
    const t = signToken(SECRET, "p1", 2000);
    expect(verifyToken(SECRET, t, 1000)).toBe("p1");
    expect(verifyToken(SECRET, t, 3000)).toBeNull();            // muddati o'tgan
    expect(verifyToken("y".repeat(40), t, 1000)).toBeNull();     // boshqa kalit
    expect(verifyToken(SECRET, t.replace("p1", "p2"), 1000)).toBeNull(); // boshqa foydalanuvchi uchun soxtalashtirish
    for (const bad of [undefined, "", "abc", "v1.p1.2000", "v2.p1.2000.zz"]) expect(verifyToken(SECRET, bad as any, 1000)).toBeNull();
  });
});
describe("OTP", () => {
  const mk = (now = { t: 1_000_000 }) => { const sms = new Capture(); return { sms, now, otp: new OtpService({ secret: SECRET, sms, now: () => now.t }) }; };
  it("kod yuboriladi, to'g'ri kod token beradi, bir marta ishlaydi; raqam saqlanmaydi", async () => {
    const { sms, otp } = mk(); expect((await otp.request("+998901234567")).ok).toBe(true);
    const r: any = otp.verify("+998901234567", sms.code()); expect(r.ok).toBe(true); expect(r.userId).toMatch(/^p[0-9a-f]{20}$/); expect(r.userId).not.toContain("998");
    expect(verifyToken(SECRET, r.token, 1_000_000)).toBe(r.userId);
    expect((otp.verify("+998901234567", sms.code()) as any).error).toBe("expired"); // qayta ishlatib bo'lmaydi
    const again = mk(); await again.otp.request("+998901234567"); expect((again.otp.verify("+998901234567", again.sms.code()) as any).userId).toBe(r.userId); // barqaror ID
  });
  it("noto'g'ri kod: 5 urinishdan keyin bloklanadi; muddat o'tsa yaroqsiz", async () => {
    const { sms, otp, now } = mk(); await otp.request("+998901234567"); const good = sms.code(); const bad = good === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) expect((otp.verify("+998901234567", bad) as any).error).toBe("bad_code");
    expect((otp.verify("+998901234567", good) as any).error).toBe("expired");
    await otp.request("+998901234567".replace("7", "8")); now.t += 6 * 60_000; expect((otp.verify("+998901234568", sms.code()) as any).error).toBe("expired");
  });
  it("SMS cheklovi: 1 daqiqada 1 ta, 1 soatda 5 ta; shlyuz xatosi aniq", async () => {
    const { sms, otp, now } = mk(); expect((await otp.request("+998900000001")).ok).toBe(true);
    expect(await otp.request("+998900000001")).toEqual({ ok: false, error: "rate_limited" });
    for (let i = 0; i < 4; i++) { now.t += 61_000; expect((await otp.request("+998900000001")).ok).toBe(true); }
    now.t += 61_000; expect(await otp.request("+998900000001")).toEqual({ ok: false, error: "rate_limited" });
    sms.fail = true; expect(await otp.request("+998900000002")).toEqual({ ok: false, error: "sms_failed" });
  });
  it("HttpSms: JSON va Authorization yuboradi, xatoda istisno", async () => {
    let seen: any; const f: any = async (u: string, i: any) => { seen = { u, i }; return { ok: i.body.includes("fail") ? false : true, status: 500 }; };
    const s = new HttpSms("https://sms.example/send", "TKN", f); await s.send("+998901234567", "salom");
    expect(seen.u).toBe("https://sms.example/send"); expect(seen.i.headers.authorization).toBe("Bearer TKN"); expect(JSON.parse(seen.i.body)).toEqual({ to: "+998901234567", text: "salom" });
    await expect(s.send("+1", "fail")).rejects.toThrow("sms_gateway_500");
  });
});
describe("HTTP + WebSocket (haqiqiy rejim)", () => {
  it("SMS orqali kirish → token bilan HTTP va WS ishlaydi; sinov tokeni (ID) rad etiladi", async () => {
    const sms = new Capture(); const otp = new OtpService({ secret: SECRET, sms });
    const x = buildApp({ otp, authSecret: SECRET }); await x.app.listen({ port: 0 }); const port = (x.app.server.address() as any).port;
    expect((await x.app.inject({ url: "/auth/config" })).json()).toEqual({ sms: true, dev: false });
    expect((await x.app.inject({ method: "POST", url: "/auth/sms/request", payload: { phone: "xyz" } })).statusCode).toBe(400);
    expect((await x.app.inject({ method: "POST", url: "/auth/sms/request", payload: { phone: "901234567" } })).statusCode).toBe(200);
    expect((await x.app.inject({ method: "POST", url: "/auth/sms/verify", payload: { phone: "901234567", code: "000000" === sms.code() ? "111111" : "000000" } })).statusCode).toBe(401);
    const v = (await x.app.inject({ method: "POST", url: "/auth/sms/verify", payload: { phone: "901234567", code: sms.code() } })).json();
    expect(v.token).toBeTruthy();
    expect((await x.app.inject({ url: "/me/profile", headers: { authorization: `Bearer ${v.token}` } })).statusCode).toBe(200);
    expect((await x.app.inject({ url: "/me/profile", headers: { authorization: `Bearer ${v.userId}` } })).statusCode).toBe(401); // oddiy ID endi kirish emas
    const open = (tok: string) => new Promise<number>((res) => { const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${tok}`); ws.on("close", (c) => res(c)); ws.on("open", () => setTimeout(() => { if (ws.readyState === 1) { ws.close(); res(1000); } }, 150)); });
    expect(await open(encodeURIComponent(v.token))).toBe(1000); expect(await open(v.userId)).toBe(4401);
    await x.app.close();
  });
  it("production: authSecret bilan ishga tushadi, usiz rad etiladi", () => {
    const old = process.env.NODE_ENV; process.env.NODE_ENV = "production";
    try { expect(() => buildApp()).toThrow(); expect(() => buildApp({ authSecret: SECRET })).not.toThrow(); } finally { process.env.NODE_ENV = old; }
  });
});
