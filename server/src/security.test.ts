import { describe, it, expect } from "vitest";
import WebSocket from "ws";
import { buildApp } from "./app";
import { parseMessage } from "./protocol";
import { Bucket, KeyedLimiter } from "./ratelimit";

describe("protokol sxemasi", () => {
  const ok = (o: unknown) => parseMessage(JSON.stringify(o));
  it("to'g'ri xabarlar", () => {
    expect(ok({ type: "act", seq: 0, action: { type: "roll" } }).ok).toBe(true);
    expect(ok({ type: "act", seq: 3, action: { type: "loan_request", giverId: "u1", amount: 100, months: 12 } }).ok).toBe(true);
    expect(ok({ type: "join", code: "ABC234" }).ok).toBe(true);
    expect(ok({ type: "act", seq: 1, action: { type: "market_sell", proposalId: 3, assetCode: "KV1" } }).ok).toBe(true);
  });
  it.each([
    ["JSON emas", "{not json"], ["ortiqcha kalit (playerId yashirish)", JSON.stringify({ type: "act", seq: 0, action: { type: "roll", playerId: "victim" } })],
    ["noma'lum tur", JSON.stringify({ type: "hack" })], ["manfiy summa", JSON.stringify({ type: "act", seq: 0, action: { type: "bank_loan", amount: -100 } })],
    ["kasr summa", JSON.stringify({ type: "act", seq: 0, action: { type: "loan_repay", debtId: 1, amount: 0.5 } })],
    ["katta summa", JSON.stringify({ type: "act", seq: 0, action: { type: "bank_loan", amount: 1e12 } })],
    ["muddat 37", JSON.stringify({ type: "act", seq: 0, action: { type: "loan_request", giverId: "u", amount: 1, months: 37 } })],
    ["ID da maxsus belgi", JSON.stringify({ type: "act", seq: 0, action: { type: "partner_offer", partnerId: "a b<script>" } })],
    ["kod uzunligi", JSON.stringify({ type: "join", code: "AB" })], ["seq satr", JSON.stringify({ type: "act", seq: "0", action: { type: "roll" } })],
    ["expire taqiqlangan", JSON.stringify({ type: "act", seq: 0, action: { type: "expire", proposalId: 1 } })],
  ])("rad: %s", (_n, raw) => expect(parseMessage(raw as string).ok).toBe(false));
});

describe("tezlik cheklovi", () => {
  it("token bucket: burst, keyin sekin tiklanadi", () => {
    let t = 0; const b = new Bucket(2, 3, () => t);
    expect([b.take(), b.take(), b.take(), b.take()]).toEqual([true, true, true, false]);
    t = 500; expect(b.take()).toBe(true); expect(b.take()).toBe(false);
  });
  it("kalit bo'yicha alohida; xotira chegaralangan", () => {
    const l = new KeyedLimiter(0, 1, () => 0, 3);
    expect(l.allow("a")).toBe(true); expect(l.allow("a")).toBe(false); expect(l.allow("b")).toBe(true);
    for (const k of ["c", "d", "e"]) l.allow(k); // 'a' siqib chiqariladi
    expect(l.allow("a")).toBe(true);
  });
});

describe("HTTP", () => {
  it("xavfsizlik sarlavhalari va /admin kirish urinishlari cheklanadi", async () => {
    const x = buildApp(); const r = await x.app.inject({ method: "GET", url: "/admin/audit" });
    expect(r.headers["x-content-type-options"]).toBe("nosniff"); expect(r.headers["x-frame-options"]).toBe("DENY"); expect(r.headers["cache-control"]).toBe("no-store");
    let last = 0; for (let i = 0; i < 30; i++) last = (await x.app.inject({ method: "GET", url: "/admin/audit", headers: { authorization: "Bearer bad" } })).statusCode;
    expect(last).toBe(429);
  });
  it("katta tana rad etiladi (413)", async () => {
    const x = buildApp(); const r = await x.app.inject({ method: "PUT", url: "/me/profile", headers: { authorization: "Bearer u", "content-type": "application/json" }, payload: JSON.stringify({ name: "a".repeat(70_000) }) });
    expect(r.statusCode).toBe(413);
  });
  it("production'da sinov autentifikatsiyasi o'chirilgan", () => {
    const old = process.env.NODE_ENV; process.env.NODE_ENV = "production";
    try { expect(() => buildApp()).toThrow(/production/); expect(() => buildApp({ auth: () => "x" })).not.toThrow(); } finally { process.env.NODE_ENV = old; }
  });
});

describe("WebSocket", () => {
  const start = async () => { const x = buildApp(); await x.app.listen({ port: 0 }); return { x, port: (x.app.server.address() as any).port as number }; };
  it("noto'g'ri xabar xato bilan rad etiladi, ulanish saqlanadi", async () => {
    const { x, port } = await start(); const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=u1`); const got: any[] = [];
    ws.on("message", (d) => got.push(JSON.parse(d.toString()))); await new Promise((r) => ws.on("open", r));
    ws.send(JSON.stringify({ type: "act", seq: 0, action: { type: "bank_loan", amount: -5 } })); ws.send("garbage");
    await new Promise((r) => setTimeout(r, 200)); expect(got.map((g) => g.error)).toEqual(["bad_message", "bad_json"]); ws.close(); await x.app.close();
  });
  it("juda katta xabar ulanishni uzadi (maxPayload)", async () => {
    const { x, port } = await start(); const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=u1`); await new Promise((r) => ws.on("open", r));
    const closed = new Promise<number>((r) => ws.on("close", (c) => r(c))); ws.send("x".repeat(40_000));
    expect(await closed).toBe(1009); await x.app.close();
  });
  it("xabar toshqini: cheklov, so'ng uzish", async () => {
    const { x, port } = await start(); const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=u1`); await new Promise((r) => ws.on("open", r));
    const errs: string[] = []; ws.on("message", (d) => { const m = JSON.parse(d.toString()); if (m.error) errs.push(m.error); });
    const closed = new Promise<number>((r) => ws.on("close", (c) => r(c)));
    for (let i = 0; i < 200; i++) ws.send(JSON.stringify({ type: "leave" }));
    expect(await closed).toBe(4429); expect(errs).toContain("rate_limited"); await x.app.close();
  });
});
