import { describe, it, expect } from "vitest";
import { buildApp } from "./app";
import { normalizeEmail, emailOtp, HttpEmail, type EmailSender } from "./email-auth";
import { verifyToken } from "./auth";

const SECRET = "s".repeat(40);
class Cap implements EmailSender { sent: { to: string; subject: string; text: string }[] = []; async send(to: string, subject: string, text: string) { this.sent.push({ to, subject, text }); } }
const codeOf = (c: Cap) => /(\d{6})/.exec(c.sent[c.sent.length - 1].text)![1];
const mk = () => { const cap = new Cap(); const x = buildApp({ authSecret: SECRET, emailOtp: emailOtp(SECRET, cap) }); const post = (url: string, payload: unknown) => x.app.inject({ method: "POST", url, payload: payload as any }); return { cap, x, post }; };

describe("email manzili", () => {
  it("normallashtirish va tekshirish", () => {
    expect(normalizeEmail("  Ali.Valiyev@Mail.UZ ")).toBe("ali.valiyev@mail.uz");
    for (const bad of ["", "ali", "ali@", "@mail.uz", "ali@mail", "a b@mail.uz", 5, null, "a@b.c", "x".repeat(250) + "@mail.uz"]) expect(normalizeEmail(bad as any)).toBeNull();
  });
});
describe("HTTP: email bir martalik kod", () => {
  it("sozlanmasa 404; /auth/config email bayrog'ini ko'rsatadi", async () => {
    const off = buildApp({ authSecret: SECRET }); expect((await off.app.inject({ method: "POST", url: "/auth/email/request", payload: { email: "a@mail.uz" } })).statusCode).toBe(404);
    expect((await off.app.inject({ url: "/auth/config" })).json().email).toBe(false); expect((await mk().x.app.inject({ url: "/auth/config" })).json().email).toBe(true);
  });
  it("so'rov → kod emailga → tasdiq → sessiya; manzil katta-kichik harfga bog'liq emas", async () => {
    const { cap, post } = mk(); expect((await post("/auth/email/request", { email: "Ali@Mail.uz" })).statusCode).toBe(200);
    expect(cap.sent[0].to).toBe("ali@mail.uz"); expect(cap.sent[0].subject).toContain("Tajriba 24");
    const r = (await post("/auth/email/verify", { email: "ali@MAIL.uz", code: codeOf(cap) })).json(); expect(verifyToken(SECRET, r.token)).toBe(r.userId);
    expect((await post("/auth/email/verify", { email: "ali@mail.uz", code: codeOf(cap) })).statusCode).toBe(401); // kod bir marta ishlaydi
  });
  it("noto'g'ri manzil 400, noto'g'ri kod 401, 5 xatodan keyin blok, tez-tez so'rash 429", async () => {
    const { cap, post } = mk(); expect((await post("/auth/email/request", { email: "yo'q" })).json().error).toBe("bad_email");
    await post("/auth/email/request", { email: "a@mail.uz" }); expect((await post("/auth/email/request", { email: "a@mail.uz" })).statusCode).toBe(429);
    for (let i = 0; i < 4; i++) expect((await post("/auth/email/verify", { email: "a@mail.uz", code: "000000" })).json().error).toBe("bad_code");
    expect((await post("/auth/email/verify", { email: "a@mail.uz", code: "000000" })).json().error).toBe("bad_code");
    expect((await post("/auth/email/verify", { email: "a@mail.uz", code: codeOf(cap) })).json().error).toBe("locked");
  });
  it("har manzilga alohida ID, bir manzilga har safar bir xil ID", async () => {
    const cap = new Cap(); let t = 1_000_000; const x = buildApp({ authSecret: SECRET, emailOtp: emailOtp(SECRET, cap, { now: () => t }) }); const post = (url: string, payload: unknown) => x.app.inject({ method: "POST", url, payload: payload as any });
    const id = async (e: string) => { t += 61_000; await post("/auth/email/request", { email: e }); return (await post("/auth/email/verify", { email: e, code: codeOf(cap) })).json().userId; };
    const a = await id("a@mail.uz"), b = await id("b@mail.uz"); expect(a).toBeTruthy(); expect(a).not.toBe(b); expect(await id("a@mail.uz")).toBe(a);
  });
  it("yuborish xatosi 502 (email_failed)", async () => {
    const bad: EmailSender = { async send() { throw new Error("net"); } }; const x = buildApp({ authSecret: SECRET, emailOtp: emailOtp(SECRET, bad) });
    const r = await x.app.inject({ method: "POST", url: "/auth/email/request", payload: { email: "a@mail.uz" } }); expect(r.statusCode).toBe(502); expect(r.json().error).toBe("email_failed");
  });
});
describe("HttpEmail", () => {
  it("JSON {to, subject, text} va Bearer; xato javob istisno", async () => {
    let seen: any; const f = (async (_u: string, init: any) => { seen = init; return { ok: true } as any; }) as any; await new HttpEmail("https://m.example/send", "tok", f).send("a@mail.uz", "S", "T");
    expect(seen.headers.authorization).toBe("Bearer tok"); expect(JSON.parse(seen.body)).toEqual({ to: "a@mail.uz", subject: "S", text: "T" });
    await expect(new HttpEmail("https://m.example", "tok", (async () => ({ ok: false, status: 500 })) as any).send("a@mail.uz", "S", "T")).rejects.toThrow("email_gateway_500"); expect(() => new HttpEmail("u", "")).toThrow();
  });
});
