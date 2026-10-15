import { describe, it, expect } from "vitest";
import { buildApp } from "./app";
import { WriteQueue } from "./persist";
import { envAdminAuth } from "./admin";

const H = (t: string) => ({ authorization: `Bearer ${t}` });
describe("ikkinchi kod tekshiruvi tuzatishlari", () => {
  it("shikoyat: tur/uzunlik tekshiriladi, tezlik cheklanadi", async () => {
    const x = buildApp();
    for (const body of [{ text: 12345 }, { text: "  " }, { text: "x", against: { a: 1 } }, { text: "x", room: "r".repeat(65) }])
      expect((await x.app.inject({ method: "POST", url: "/complaints", headers: H("u1"), payload: body })).statusCode).toBe(400);
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) codes.push((await x.app.inject({ method: "POST", url: "/complaints", headers: H("u1"), payload: { text: "ok" } })).statusCode);
    expect(codes).toContain(429); expect(codes[0]).toBe(200);
  });
  it("taqiqlangan hisob: /me va shikoyat yopiq, o'chirish taqiqni bekor qilmaydi", async () => {
    const x = buildApp(); x.adminState.touch("bad", 1); x.adminState.users.get("bad")!.banned = true;
    expect((await x.app.inject({ method: "DELETE", url: "/me", headers: H("bad"), payload: { confirm: "O'CHIRISH" } })).statusCode).toBe(403);
    expect((await x.app.inject({ method: "POST", url: "/complaints", headers: H("bad"), payload: { text: "x" } })).statusCode).toBe(403);
    expect(x.adminState.isBanned("bad")).toBe(true);
  });
  it("reyting: manfiy/kasr limit 1..100 ga keltiriladi", async () => {
    const x = buildApp();
    for (const l of ["-1", "0", "abc", "1e9", "2.7"]) expect((await x.app.inject({ url: `/leaderboard?limit=${l}` })).statusCode).toBe(200);
  });
  it("noma'lum admin roli ishga tushishda xato beradi", () => {
    expect(() => envAdminAuth(JSON.stringify({ t: { id: "a", role: "hacker" } }))).toThrow();
    expect(envAdminAuth(JSON.stringify({ t: { id: "a", role: "support" } }))("t")).toEqual({ id: "a", role: "support" });
  });
  it("yozuv navbati vaqtincha xatoda qayta uriniladi", async () => {
    const q = new WriteQueue([1, 1]); let n = 0;
    q.push(async () => { if (++n < 3) throw new Error("tmp"); }); await q.flush();
    expect(n).toBe(3); expect(q.errors).toHaveLength(0);
    const q2 = new WriteQueue([1]); q2.push(async () => { throw new Error("doim"); }); await q2.flush(); expect(q2.errors).toHaveLength(1);
  });
});
