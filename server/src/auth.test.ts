import { describe, it, expect } from "vitest";
import WebSocket from "ws";
import { buildApp } from "./app";
import { OtpService, normalizePhone, signToken, verifyToken, HttpSms, EskizSms, ConsoleSms, Revocations, type SmsSender } from "./auth";
import { ipKey, KeyedLimiter } from "./ratelimit";

const SECRET = "x".repeat(40);
class Capture implements SmsSender { sent: { phone: string; text: string }[] = []; fail = false;
  async send(phone: string, text: string) { if (this.fail) throw new Error("down"); this.sent.push({ phone, text }); }
  code() { return /(\d{6})/.exec(this.sent.at(-1)!.text)![1]; } }

describe("telefon raqami", () => {
  it.each([["+998901234567", "+998901234567"], ["90 123-45-67", "+998901234567"], ["998 (90) 123 45 67", "+998901234567"], ["+12025550123", "+12025550123"]])("%s", (a, b) => expect(normalizePhone(a)).toBe(b));
  it.each(["", "abc", "123", "+99890123", 12345, null, "+998901234567890123"])("rad: %s", (v) => expect(normalizePhone(v)).toBeNull());
});
describe("sessiya tokeni", () => {
  it("imzo, muddat, buzilish va bekor qilish", () => {
    const t = signToken(SECRET, "p1", 2000, 500);
    expect(verifyToken(SECRET, t, 1000)).toBe("p1");
    expect(verifyToken(SECRET, t, 3000)).toBeNull();            // muddati o'tgan
    expect(verifyToken("y".repeat(40), t, 1000)).toBeNull();     // boshqa kalit
    expect(verifyToken(SECRET, t.replace("p1", "p2"), 1000)).toBeNull(); // boshqa foydalanuvchi uchun soxtalashtirish
    expect(verifyToken(SECRET, t.replace(".500.", ".1.") , 1000)).toBeNull(); // berilgan vaqtni o'zgartirib bo'lmaydi
    for (const bad of [undefined, "", "abc", "v1.p1.2000.zz", "v2.p1.500.2000", "v3.p1.500.2000.zz"]) expect(verifyToken(SECRET, bad as any, 1000)).toBeNull();
    const rev = new Revocations(); expect(verifyToken(SECRET, t, 1000, rev)).toBe("p1");
    rev.revoke("p1", 600); expect(verifyToken(SECRET, t, 1000, rev)).toBeNull();                 // 600 gacha berilganlar bekor
    expect(verifyToken(SECRET, signToken(SECRET, "p1", 9000, 700), 1000, rev)).toBe("p1");        // keyin berilgani yaroqli
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
  it("noto'g'ri urinishlar raqam bo'yicha: 5 xatodan keyin bloklanadi; yangi kod so'rash hisobni nolga tushirmaydi", async () => {
    const { sms, otp, now } = mk(); const ph = "+998901234567"; await otp.request(ph); const good = sms.code(); const bad = good === "000000" ? "111111" : "000000";
    for (let i = 0; i < 3; i++) expect((otp.verify(ph, bad) as any).error).toBe("bad_code");
    now.t += 61_000; await otp.request(ph);                                   // hujumchi yangi kod so'raydi — hisob saqlanadi
    for (let i = 0; i < 1; i++) expect((otp.verify(ph, bad) as any).error).toBe("bad_code");
    expect((otp.verify(ph, bad) as any).error).toBe("bad_code");               // 5-xato → blok
    expect((otp.verify(ph, sms.code()) as any).error).toBe("locked");          // to'g'ri kod ham blok paytida o'tmaydi
    now.t += 16 * 60_000; await otp.request(ph); expect((otp.verify(ph, sms.code()) as any).ok).toBe(true);
  });
  it("kod muddati o'tsa yaroqsiz; qayta so'rash olingan kodni bekor qilmaydi", async () => {
    const { sms, otp, now } = mk(); const ph = "+998901234567"; await otp.request(ph); const first = sms.code();
    now.t += 61_000; await otp.request(ph); const second = sms.code();
    expect((otp.verify(ph, first) as any).ok).toBe(true);                       // begona so'rov oldingi kodni bekor qilmadi
    await otp.request("+998901234568"); now.t += 6 * 60_000; expect((otp.verify("+998901234568", sms.code()) as any).error).toBe("expired"); void second;
  });
  it("parallel so'rovlar chegarani chetlab o'tmaydi (joy oldindan band qilinadi), shlyuz xatosi ham hisoblanadi", async () => {
    const { sms, otp } = mk(); sms.fail = true;
    const rs = await Promise.all(Array.from({ length: 10 }, () => otp.request("+998900000009")));
    expect(rs.filter((r) => r.ok || r.error === "sms_failed")).toHaveLength(1); expect(rs.filter((r: any) => r.error === "rate_limited")).toHaveLength(9);
  });
  it("SMS cheklovi: 1 daqiqada 1 ta, 1 soatda 5 ta; shlyuz xatosi aniq", async () => {
    const { sms, otp, now } = mk(); expect((await otp.request("+998900000001")).ok).toBe(true);
    expect(await otp.request("+998900000001")).toEqual({ ok: false, error: "rate_limited" });
    for (let i = 0; i < 4; i++) { now.t += 61_000; expect((await otp.request("+998900000001")).ok).toBe(true); }
    now.t += 61_000; expect(await otp.request("+998900000001")).toEqual({ ok: false, error: "rate_limited" });
    sms.fail = true; expect(await otp.request("+998900000002")).toEqual({ ok: false, error: "sms_failed" });
  });
  it("HttpSms: JSON va Authorization yuboradi, xatoda istisno", async () => {
    expect(() => new HttpSms("https://x", "")).toThrow();
    let seen: any; const f: any = async (u: string, i: any) => { seen = { u, i }; return { ok: i.body.includes("fail") ? false : true, status: 500 }; };
    const s = new HttpSms("https://sms.example/send", "TKN", f); await s.send("+998901234567", "salom");
    expect(seen.u).toBe("https://sms.example/send"); expect(seen.i.headers.authorization).toBe("Bearer TKN"); expect(seen.i.signal).toBeDefined(); expect(JSON.parse(seen.i.body)).toEqual({ to: "+998901234567", text: "salom" });
    await expect(s.send("+1", "fail")).rejects.toThrow("sms_gateway_500");
  });
  it("EskizSms: login, plyussiz raqam, 401 da qayta kirish, xatoda istisno", async () => {
    expect(() => new EskizSms("", "p", "4546")).toThrow(); expect(() => new EskizSms("e", "p", "")).toThrow();
    const calls: { u: string; h: any; b: URLSearchParams }[] = []; let logins = 0, expired = true;
    const f: any = async (u: string, i: any) => {
      calls.push({ u, h: i.headers, b: i.body });
      if (u.endsWith("/auth/login")) { logins++; return { ok: true, status: 200, json: async () => ({ data: { token: `T${logins}` } }) }; }
      if (i.headers.authorization === "Bearer T1" && expired) { expired = false; return { ok: false, status: 401 }; }
      return { ok: !i.body.get("message").includes("fail"), status: 500 };
    };
    const s = new EskizSms("a@b.c", "pw", "4546", "https://e/api", f);
    await s.send("+998901234567", "kod 123456");
    expect(logins).toBe(2); const sent = calls.filter((c) => c.u.endsWith("/sms/send")); expect(sent).toHaveLength(2);
    expect(sent[1].h.authorization).toBe("Bearer T2"); expect(sent[1].b.get("mobile_phone")).toBe("998901234567"); expect(sent[1].b.get("from")).toBe("4546");
    expect(calls[0].b.get("email")).toBe("a@b.c");
    await s.send("+998901234567", "ok"); expect(logins).toBe(2);
    await expect(s.send("+998901234567", "fail")).rejects.toThrow("sms_gateway_500");
  });
});
describe("HTTP + WebSocket (haqiqiy rejim)", () => {
  it("SMS orqali kirish → token bilan HTTP va WS ishlaydi; sinov tokeni (ID) rad etiladi", async () => {
    const sms = new Capture(); const otp = new OtpService({ secret: SECRET, sms });
    const x = buildApp({ otp, authSecret: SECRET }); await x.app.listen({ port: 0 }); const port = (x.app.server.address() as any).port;
    expect((await x.app.inject({ url: "/auth/config" })).json()).toEqual({ sms: true, google: false, apple: false, dev: false });
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

describe("cheklov kaliti va ConsoleSms", () => {
  it("IPv6 /64 bo'yicha jamlanadi, IPv4 va v4-mapped o'zgarmaydi", () => {
    expect(ipKey("203.0.113.5")).toBe("203.0.113.5"); expect(ipKey("::ffff:203.0.113.5")).toBe("203.0.113.5");
    expect(ipKey("2001:db8:1:2:aaaa:bbbb:cccc:dddd")).toBe(ipKey("2001:db8:1:2::1")); expect(ipKey("2001:db8:1:3::1")).not.toBe(ipKey("2001:db8:1:2::1"));
  });
  it("LRU: faol hujumchi chelagi tasodifan chiqarilmaydi", () => {
    let t = 0; const l = new KeyedLimiter(0.0001, 2, () => t, 3); l.allow("a"); l.allow("a"); expect(l.allow("a")).toBe(false);
    l.allow("b"); l.allow("c"); l.allow("a"); l.allow("d"); // 'a' yaqinda ishlatilgan — 'b' chiqariladi
    expect(l.allow("a")).toBe(false);
  });
  it("ConsoleSms production'da yaratilmaydi", () => { const o = process.env.NODE_ENV; process.env.NODE_ENV = "production"; try { expect(() => new ConsoleSms()).toThrow(); } finally { process.env.NODE_ENV = o; } });
});
describe("HTTP: chiqish va o'chirishdan keyin token yaroqsiz", () => {
  it("logout va DELETE /me eski tokenni bekor qiladi", async () => {
    const sms = new Capture(); const otp = new OtpService({ secret: SECRET, sms }); const x = buildApp({ otp, authSecret: SECRET });
    const login = async (ph: string) => { await x.app.inject({ method: "POST", url: "/auth/sms/request", payload: { phone: ph } }); return (await x.app.inject({ method: "POST", url: "/auth/sms/verify", payload: { phone: ph, code: sms.code() } })).json(); };
    const a = await login("901112233"); const H = (t: string) => ({ authorization: `Bearer ${t}` });
    expect((await x.app.inject({ url: "/me/profile", headers: H(a.token) })).statusCode).toBe(200);
    await new Promise((r) => setTimeout(r, 5)); // iat <= revoke vaqti bo'lishi uchun
    expect((await x.app.inject({ method: "POST", url: "/auth/logout", headers: H(a.token) })).statusCode).toBe(200);
    expect((await x.app.inject({ url: "/me/profile", headers: H(a.token) })).statusCode).toBe(401);
    await new Promise((r) => setTimeout(r, 5));
    const b = await login("901112244"); await new Promise((r) => setTimeout(r, 5));
    expect((await x.app.inject({ method: "DELETE", url: "/me", headers: H(b.token), payload: { confirm: "O'CHIRISH" } })).statusCode).toBe(200);
    expect((await x.app.inject({ url: "/me/profile", headers: H(b.token) })).statusCode).toBe(401);
  });
});
