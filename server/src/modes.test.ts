import { describe, it, expect } from "vitest";
import { MemoryStore } from "./store";
import { RoomManager, Clock } from "./rooms";
import { ContentRegistry } from "./registry";
import { parseMessage } from "./protocol";

class FakeClock implements Clock {
  t = 0; q: { at: number; f: () => void; id: number }[] = []; n = 0;
  now() { return this.t; } setTimeout(f: () => void, ms: number) { const id = ++this.n; this.q.push({ at: this.t + ms, f, id }); return id; }
  clearTimeout(h: unknown) { this.q = this.q.filter((x) => x.id !== h); }
  async advance(ms: number) { const end = this.t + ms; for (;;) { this.q.sort((a, b) => a.at - b.at); const nx = this.q[0]; if (!nx || nx.at > end) break; this.q.shift(); this.t = nx.at; nx.f(); await new Promise((r) => setImmediate(r)); } this.t = end; }
}
const mk = () => { const c = new FakeClock(); let k = 0; return { c, rm: new RoomManager(new ContentRegistry(), new MemoryStore(), c, () => (k++ * 0.37) % 1) }; };

describe("rejimlar: xona chegaralari", () => {
  it("o'rinlar: standart 2–8, tez 2–6, reytingli 4–6 (standart 4), o'quv har doim 3", () => {
    const { rm } = mk();
    expect(rm.create("a1", undefined, 30, "auto", 8, "standard").ok).toBe(true); expect(rm.create("a2", undefined, 30, "auto", 7, "quick")).toEqual({ ok: false, error: "bad_seats" });
    expect(rm.create("a3", undefined, 30, "auto", 6, "quick").ok).toBe(true);
    expect(rm.create("a4", undefined, 30, "auto", 3, "rated")).toEqual({ ok: false, error: "bad_seats" }); expect(rm.create("a5", undefined, 30, "auto", 7, "rated")).toEqual({ ok: false, error: "bad_seats" });
    const r = rm.create("a6", undefined, 30, "auto", undefined, "rated"); if (!r.ok) throw 0; expect(rm.rooms.get(r.code)!.seats).toBe(4); expect(rm.rooms.get(r.code)!.mode).toBe("rated");
    const t = rm.create("a7", undefined, 30, "auto", 8, "tutorial"); if (!t.ok) throw 0; expect(rm.rooms.get(t.code)!.seats).toBe(3);
    expect(rm.create("a8", undefined, 30, "auto", 4, "zzz" as any)).toEqual({ ok: false, error: "bad_mode" });
  });
  it("o'quv xonasiga ikkinchi odam qo'shila olmaydi; reytingli o'yinni 1 odam boshlay olmaydi", async () => {
    const { rm } = mk();
    const t = rm.create("h", undefined, 30, "auto", undefined, "tutorial"); if (!t.ok) throw 0;
    expect(rm.join(t.code, "x")).toEqual({ ok: false, error: "room_full" });
    expect((await rm.start(t.code, "h", 3, { dreams: false })).ok).toBe(true); expect(rm.rooms.get(t.code)!.state!.players).toHaveLength(3);
    expect(rm.rooms.get(t.code)!.state!.mode).toBe("tutorial");
    const r = rm.create("g", undefined, 30, "auto", undefined, "rated"); if (!r.ok) throw 0;
    expect(await rm.start(r.code, "g", 3, { dreams: false })).toEqual({ ok: false, error: "not_enough_players" });
    rm.join(r.code, "g2"); expect((await rm.start(r.code, "g", 3, { dreams: false })).ok).toBe(true); expect(rm.rooms.get(r.code)!.state!.players).toHaveLength(4);
  });
  it("protokol: mode qabul qilinadi, noma'lum rad etiladi", () => {
    expect(parseMessage(JSON.stringify({ type: "create", mode: "quick", players: 4 })).ok).toBe(true);
    expect(parseMessage(JSON.stringify({ type: "create", mode: "blitz" })).ok).toBe(false);
  });
});

describe("vaqtli rejim", () => {
  const MIN = 60_000;
  it("o'quv o'yini 15 daqiqada tugaydi: g'olib va sabab «vaqt»; ko'rinishda qolgan vaqt", async () => {
    const { rm, c } = mk(); const t = rm.create("h", undefined, 30, "auto", undefined, "tutorial"); if (!t.ok) throw 0;
    await rm.start(t.code, "h", 3, { dreams: false }); const room = rm.rooms.get(t.code)!;
    expect(rm.view(room).limit).toMatchObject({ leftMs: 15 * MIN }); expect(rm.view(room).limit!.deadline).toBe(15 * MIN);
    await c.advance(14 * MIN); expect(room.state!.winner).toBeNull(); expect(rm.view(room).limit!.leftMs).toBeLessThanOrEqual(MIN);
    await c.advance(MIN + 1_000); expect(room.state!.winner).not.toBeNull(); expect(room.state!.endReason).toBe("time"); expect(room.endedAt).not.toBeNull();
    expect(rm.activeRoomOf.has("h")).toBe(false);
  });
  it("hamma uzilsa vaqt to'xtaydi, qaytganda qolganidan davom etadi", async () => {
    const { rm, c } = mk(); const t = rm.create("h", undefined, 30, "auto", undefined, "tutorial"); if (!t.ok) throw 0;
    await rm.start(t.code, "h", 3, { dreams: false }); const room = rm.rooms.get(t.code)!;
    await c.advance(5 * MIN); rm.disconnect(t.code, "h");
    const left = rm.view(room).limit!.leftMs; expect(left).toBeLessThanOrEqual(10 * MIN + 1_000); expect(rm.view(room).limit!.deadline).toBeNull();
    await c.advance(20 * MIN); expect(room.state!.winner).toBeNull(); expect(rm.view(room).limit!.leftMs).toBe(left); // tok o'chdi: vaqt yurmadi
    expect(rm.reconnect(t.code, "h").ok).toBe(true); expect(rm.view(room).limit!.deadline).not.toBeNull();
    await c.advance(left + 2_000); expect(room.state!.winner).not.toBeNull();
  });
  it("standart va tez o'yinda vaqt chegarasi yo'q; qolgan vaqt saqlanadi (server qayta ishga tushsa)", async () => {
    const { rm, c } = mk(); const s = rm.create("s1", undefined, 30, "auto", 2, "standard"); if (!s.ok) throw 0; rm.join(s.code, "s2"); await rm.start(s.code, "s1", 3, { dreams: false });
    expect(rm.view(rm.rooms.get(s.code)!).limit).toBeNull(); await c.advance(10 * MIN);
    const store = new MemoryStore(); const c2 = new FakeClock(); const m2 = new RoomManager(new ContentRegistry(), store, c2);
    const t = m2.create("h", undefined, 30, "auto", undefined, "tutorial"); if (!t.ok) throw 0; await m2.start(t.code, "h", 3, { dreams: false }); await c2.advance(4 * MIN); m2.disconnect(t.code, "h");
    await m2.act(t.code, "h", { type: "roll", playerId: "h" } as any, m2.rooms.get(t.code)!.seq).catch(() => {}); // snapshot yangilansin
    const m3 = new RoomManager(new ContentRegistry(), store, new FakeClock()); await m3.restore();
    const left = m3.view(m3.rooms.get(t.code)!).limit!.leftMs; expect(left).toBeGreaterThan(10 * MIN); expect(left).toBeLessThanOrEqual(11 * MIN + 5_000); expect(m3.rooms.get(t.code)!.mode).toBe("tutorial");
  });
});
