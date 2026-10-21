import { describe, it, expect } from "vitest";
import { MemoryStore } from "./store";
import { RoomManager, Clock } from "./rooms";
import { ContentRegistry } from "./registry";

class FakeClock implements Clock {
  t = 0; q: { at: number; f: () => void; id: number }[] = []; n = 0;
  now() { return this.t; } setTimeout(f: () => void, ms: number) { const id = ++this.n; this.q.push({ at: this.t + ms, f, id }); return id; }
  clearTimeout(h: unknown) { this.q = this.q.filter((x) => x.id !== h); }
  async advance(ms: number) { const end = this.t + ms; for (;;) { this.q.sort((a, b) => a.at - b.at); const nx = this.q[0]; if (!nx || nx.at > end) break; this.q.shift(); this.t = nx.at; nx.f(); await new Promise((r) => setImmediate(r)); } this.t = end; }
}
const TURN = 30_000, HOUR = 3_600_000;
const setup = async (humans = ["a", "b", "c"], seats = 5) => {
  const store = new MemoryStore(); const c = new FakeClock(); let k = 0;
  const rm = new RoomManager(new ContentRegistry(), store, c, () => (k++ * 0.37) % 1);
  const r = rm.create(humans[0], undefined, 30, "auto", seats); if (!r.ok) throw 0;
  for (const h of humans.slice(1)) rm.join(r.code, h);
  await rm.start(r.code, humans[0], 7, { dreams: false });
  return { rm, c, code: r.code, store, room: rm.rooms.get(r.code)! };
};

describe("uzilish chiqish emas: qayta kirish", () => {
  it("o'yinchi ko'p marta uzilib qaytadi; o'rni saqlanadi, begona kira olmaydi", async () => {
    const { rm, code, room } = await setup();
    for (let i = 0; i < 6; i++) {
      rm.disconnect(code, "b"); expect(room.members.find((m) => m.userId === "b")!.online).toBe(false); expect(room.members.find((m) => m.userId === "b")!.left).toBeFalsy();
      expect(rm.join(code, "zzz")).toEqual({ ok: false, error: "already_started" }); // begona kira olmaydi
      expect(rm.join(code, "b")).toEqual({ ok: true }); // xuddi shu kod bilan qaytadi
      expect(room.members.find((m) => m.userId === "b")!.online).toBe(true);
    }
    expect(rm.activeRoomOf.get("b")).toBe(code);
  });
  it("zalda (boshlanmagan) ham: uzilgan o'yinchining o'rni band qoladi, yangi odam kira olmaydi; qaytsa o'rniga o'tadi", async () => {
    const store = new MemoryStore(); const rm = new RoomManager(new ContentRegistry(), store, new FakeClock());
    const r = rm.create("a", undefined, 30, "auto", 3); if (!r.ok) throw 0; rm.join(r.code, "b"); rm.join(r.code, "c");
    rm.disconnect(r.code, "b"); expect(rm.join(r.code, "d")).toEqual({ ok: false, error: "room_full" });
    expect(rm.join(r.code, "b")).toEqual({ ok: true });
  });
  it("faqat o'zi «chiqish»ni bosgan qayta kira olmaydi", async () => {
    const { rm, code } = await setup(); rm.leave(code, "b");
    expect(rm.join(code, "b")).toEqual({ ok: false, error: "left_game" });
  });
});

describe("hamma uzilsa o'yin to'xtab turadi", () => {
  it("hech kim onlayn emas: navbatlar o'tkazib yuborilmaydi, botlar o'ynab ketmaydi; birinchi qaytgan bilan davom etadi", async () => {
    const { rm, c, code, room } = await setup(["a", "b"], 5); // 2 odam + 3 bot
    await c.advance(TURN * 2); const seq0 = room.seq;
    rm.disconnect(code, "a"); rm.disconnect(code, "b");
    expect(room.timer).toBeNull(); expect(room.deadline).toBeNull();
    await c.advance(10 * HOUR); expect(room.seq).toBe(seq0); // tok o'chdi: hech narsa o'zgarmadi
    expect(rm.reconnect(code, "a").ok).toBe(true); expect(room.timer).not.toBeNull(); expect(room.deadline).not.toBeNull();
    await c.advance(TURN * 3); expect(room.seq).toBeGreaterThan(seq0); // davom etdi
  });
  it("bitta odam onlayn bo'lsa o'yin to'xtamaydi (oflayn o'yinchi navbati avtomatik o'tadi)", async () => {
    const { rm, c, code, room } = await setup(["a", "b"], 2);
    rm.disconnect(code, "b"); const seq0 = room.seq;
    await c.advance(TURN * 6); expect(room.seq).toBeGreaterThan(seq0);
  });
  it("server qayta ishga tushsa ham: tiklangan o'yin birinchi qaytguncha to'xtab turadi", async () => {
    const { c, code, store, room, rm } = await setup(["a", "b"], 2); await c.advance(TURN * 3);
    const c2 = new FakeClock(); const rm2 = new RoomManager(new ContentRegistry(), store, c2); expect(await rm2.restore()).toBe(1);
    const r2 = rm2.rooms.get(code)!; const seq = r2.seq; await c2.advance(10 * HOUR); expect(r2.seq).toBe(seq);
    expect(rm2.reconnect(code, "b").ok).toBe(true); await c2.advance(TURN * 3); expect(r2.seq).toBeGreaterThan(seq);
    void rm; void room;
  });
});

describe("tashlab ketish muddati", () => {
  const SHORT = 30 * 60_000, LONG = 24 * HOUR;
  it("boshlangan o'yin: hamma uzilgan bo'lsa ham 24 soat saqlanadi, so'ng yopiladi", async () => {
    const { rm, c, code, room } = await setup(["a", "b"], 2); rm.disconnect(code, "a"); rm.disconnect(code, "b");
    await c.advance(LONG - 1000); expect(await rm.sweep(SHORT, LONG)).toBe(0); expect(room.endedAt).toBeNull();
    expect(rm.join(code, "a")).toEqual({ ok: true }); // 23 soat 59 daqiqada ham qaytish mumkin
    rm.disconnect(code, "a"); await c.advance(LONG + 1000); expect(await rm.sweep(SHORT, LONG)).toBe(1);
  });
  it("zal (boshlanmagan) qisqa muddatda yopiladi; hamma odam ixtiyoriy chiqib ketgan o'yin ham", async () => {
    const rm = new RoomManager(new ContentRegistry(), new MemoryStore(), new FakeClock()); const clock = (rm as any).clock as FakeClock;
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b"); rm.disconnect(r.code, "a"); rm.disconnect(r.code, "b");
    await clock.advance(SHORT + 1000); expect(await rm.sweep(SHORT, LONG)).toBe(1);
    const g = await setup(["a", "b"], 2); g.rm.leave(g.code, "a"); g.rm.leave(g.code, "b");
    await g.c.advance(SHORT + 1000); expect(await g.rm.sweep(SHORT, LONG)).toBe(1);
  });
});
