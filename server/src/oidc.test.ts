import { describe, it, expect } from "vitest";
import { generateKeyPairSync, createSign, type JsonWebKey } from "node:crypto";
import { OidcVerifier, GOOGLE, APPLE } from "./oidc";
import { buildApp } from "./app";
import { verifyToken } from "./auth";

const SECRET = "s".repeat(40);
const mkKey = (kid: string) => { const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 }); return { kid, privateKey, jwk: { ...(publicKey.export({ format: "jwk" }) as JsonWebKey), kid, alg: "RS256", use: "sig" } }; };
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const sign = (k: ReturnType<typeof mkKey>, claims: object, header: object = {}) => { const h = b64({ alg: "RS256", kid: k.kid, ...header }), p = b64(claims); const s = createSign("RSA-SHA256").update(`${h}.${p}`).sign(k.privateKey).toString("base64url"); return `${h}.${p}.${s}`; };
const NOW = 1_800_000_000_000, t = NOW / 1000;
const good = { iss: "https://accounts.google.com", aud: "client-1", sub: "1234567890", exp: t + 3600, iat: t - 10 };

describe("OIDC ID token tekshiruvi", () => {
  const k = mkKey("k1"); let fetches = 0;
  const v = new OidcVerifier(GOOGLE(["client-1"]), async () => { fetches++; return { keys: [k.jwk as any] }; }, () => NOW);
  it("to'g'ri token qabul qilinadi; kalitlar keshlanadi", async () => {
    expect(await v.verify(sign(k, good))).toEqual({ sub: "1234567890" }); expect(await v.verify(sign(k, good))).toEqual({ sub: "1234567890" }); expect(fetches).toBe(1);
  });
  it.each([
    ["boshqa auditoriya", { ...good, aud: "evil" }], ["boshqa emitent", { ...good, iss: "https://evil.example" }], ["muddati o'tgan", { ...good, exp: t - 100 }],
    ["kelajakdagi iat", { ...good, iat: t + 10_000 }], ["sub yo'q", { ...good, sub: "" }],
  ])("rad: %s", async (_n, c) => expect(await v.verify(sign(k, c))).toBeNull());
  it("auditoriya ro'yxat bo'lishi mumkin", async () => expect(await v.verify(sign(k, { ...good, aud: ["x", "client-1"] }))).not.toBeNull());
  it("soxta imzo, boshqa kalit, alg=none/HS256, buzuq format rad etiladi", async () => {
    const other = mkKey("k1"); expect(await v.verify(sign(other, good))).toBeNull();                       // boshqa kalit, bir xil kid
    { const t = sign(k, good), i = t.lastIndexOf(".") + 50; expect(await v.verify(t.slice(0, i) + (t[i] === "A" ? "B" : "A") + t.slice(i + 1))).toBeNull(); } // imzo o'rtasidagi belgi buzilgan
    expect(await v.verify(sign(k, good, { alg: "none" }))).toBeNull(); expect(await v.verify(sign(k, good, { alg: "HS256" }))).toBeNull();
    for (const bad of [undefined, 5, "", "a.b", "a.b.c", "x".repeat(5000)]) expect(await v.verify(bad)).toBeNull();
  });
  it("kalit aylantirilsa (yangi kid) JWKS qayta yuklanadi", async () => {
    const k2 = mkKey("k2"); let keys = [k.jwk]; let clock = NOW; const vv = new OidcVerifier(APPLE(["a"]), async () => ({ keys: keys as any }), () => clock);
    const tok = sign(k2, { ...good, iss: "https://appleid.apple.com", aud: "a" }); expect(await vv.verify(tok)).toBeNull(); keys = [k.jwk, k2.jwk];
    expect(await vv.verify(tok)).toBeNull(); clock += 61_000; // yangilash cheklovi (1 daqiqa) o'tgach
    expect(await vv.verify(tok)).toEqual({ sub: "1234567890" });
  });
  it("sarlavha null/oddiy qiymat bo'lsa istisno otmaydi", async () => {
    for (const h of ["bnVsbA", Buffer.from("1").toString("base64url"), Buffer.from('"x"').toString("base64url")]) expect(await v.verify(`${h}.e30.AA`)).toBeNull();
  });
  it("noma'lum kid bilan majburiy yangilash daqiqasiga bir marta; yuklanmasa eski kesh ishlaydi", async () => {
    let n = 0, fail = false; let clock = NOW; const kk = mkKey("k1");
    const vv = new OidcVerifier(GOOGLE(["client-1"]), async () => { n++; if (fail) throw new Error("net"); return { keys: [kk.jwk as any] }; }, () => clock, 1000);
    expect(await vv.verify(sign(kk, good))).not.toBeNull(); expect(n).toBe(1);
    const unknown = sign(mkKey("zzz"), good);
    for (let i = 0; i < 5; i++) await vv.verify(unknown); expect(n).toBe(2);                 // 5 ta noma'lum kid → bitta qo'shimcha yuklash
    clock += 61_000; await vv.verify(unknown); expect(n).toBeGreaterThanOrEqual(3);
    fail = true; clock += 5000; expect(await vv.verify(sign(kk, good))).not.toBeNull();       // TTL o'tdi, yuklab bo'lmadi — eski kalit bilan davom
  });
  it("JWKS yuklanmasa — rad (istisno otmaydi)", async () => expect(await new OidcVerifier(GOOGLE(["client-1"]), async () => { throw new Error("net"); }, () => NOW).verify(sign(k, good))).toBeNull());
});
describe("HTTP: /auth/google", () => {
  it("token almashinuvi; yoqilmagan provayder 404; yomon token 401", async () => {
    const k = mkKey("k1"); const g = new OidcVerifier(GOOGLE(["client-1"]), async () => ({ keys: [k.jwk as any] }), () => Date.now());
    const x = buildApp({ authSecret: SECRET, oidc: { google: g } });
    expect((await x.app.inject({ url: "/auth/config" })).json()).toEqual({ sms: false, google: true, apple: false, dev: false });
    const now = Date.now() / 1000; const idToken = sign(k, { ...good, exp: now + 600, iat: now });
    const r = (await x.app.inject({ method: "POST", url: "/auth/google", payload: { idToken } })).json();
    expect(r.userId).toMatch(/^g[0-9a-f]{20}$/); expect(verifyToken(SECRET, r.token)).toBe(r.userId);
    expect((await x.app.inject({ method: "POST", url: "/auth/google", payload: { idToken: "x.y.z" } })).statusCode).toBe(401);
    expect((await x.app.inject({ method: "POST", url: "/auth/apple", payload: { idToken } })).statusCode).toBe(404);
    expect((await x.app.inject({ method: "POST", url: "/auth/sms/request", payload: { phone: "901234567" } })).statusCode).toBe(404);
  });
});
