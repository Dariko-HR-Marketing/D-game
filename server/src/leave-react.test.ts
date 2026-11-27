import { describe, it, expect } from "vitest";
import WebSocket from "ws";
import { buildApp } from "./app";
import { MemoryStore } from "./store";
import { ContentRegistry } from "./registry";
import { RoomManager, Clock } from "./rooms";

class FakeClock implements Clock {
  t = 0; now() { return this.t; } setTimeout(_f: () => void, _ms: number) { return 0; } clearTimeout() {}
}
const setup = async () => {
  const store = new MemoryStore(); const rm = new RoomManager(new ContentRegistry(), store, new FakeClock(), (() => { let k = 0; return () => (k++ * 0.37) % 1; })());
  const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b"); rm.join(r.code, "c"); await rm.start(r.code, "a", 4, { dreams: false });
  return { rm, code: r.code, store };
};

describe("ixtiyoriy chiqish qaytarilmaydi (§6.3)", () => {
  it("chiqqan o'yinchi qayta qo'shila olmaydi va qayta ulana olmaydi; o'rnini bot egallaydi; boshqa xonaga o'ta oladi", async () => {
    const { rm, code } = await setup();
    rm.leave(code, "b");
    const m = rm.rooms.get(code)!.members.find((x) => x.userId === "b")!; expect(m).toMatchObject({ bot: true, left: true, online: false });
    expect(rm.join(code, "b")).toEqual({ ok: false, error: "left_game" });
    expect(rm.reconnect(code, "b")).toEqual({ ok: false, error: "left_game" });
    expect(rm.create("b").ok).toBe(true); // hisob bo'shagan
    expect((await rm.act(code, "b", { type: "roll", playerId: "b" }, 0)).ok).toBe(false); // endi bot — odam sifatida harakat qila olmaydi? (a'zo, lekin navbat egasi emas)
  });
  it("oflayn bo'lish (uzilish) chiqish emas: qayta ulanish mumkin", async () => {
    const { rm, code } = await setup(); rm.disconnect(code, "b"); expect(rm.reconnect(code, "b").ok).toBe(true);
  });
  it("chiqish holati saqlanadi va qayta ishga tushganda ham tiklanadi", async () => {
    const { rm, code, store } = await setup(); rm.leave(code, "b");
    await rm.act(code, "a", { type: "roll", playerId: "a" }, rm.rooms.get(code)!.seq).catch(() => {}); // snapshot+meta yangilansin
    const rm2 = new RoomManager(new ContentRegistry(), store, new FakeClock()); expect(await rm2.restore()).toBe(1);
    expect(rm2.rooms.get(code)!.members.find((x) => x.userId === "b")).toMatchObject({ left: true });
    expect(rm2.reconnect(code, "b")).toEqual({ ok: false, error: "left_game" });
  });
});
