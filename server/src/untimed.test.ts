// Vaqtsiz xona («Mehrojiddin», turnSeconds = 0): navbat va qarorlarga taymer yo'q; uzilgan o'yinchi baribir avtopilotga o'tadi; faqat standart rejimda.
import { describe, it, expect } from "vitest";
import { MemoryStore } from "./store";
import { ContentRegistry } from "./registry";
import { RoomManager, Clock } from "./rooms";
import { currentPlayer, RULES } from "@poyga/rules";

class TimerClock implements Clock {
  t = 0; q: { id: number; f: () => void; ms: number }[] = []; n = 0;
  now() { return this.t; } setTimeout(f: () => void, ms: number) { const id = ++this.n; this.q.push({ id, f, ms }); return id as any; } clearTimeout(id: any) { this.q = this.q.filter((x) => x.id !== id); }
  async fire() { const x = this.q.shift(); if (x) { this.t += x.ms; x.f(); await new Promise((r) => setTimeout(r, 20)); } return !!x; }
}
const setup = async (turnSeconds: 0 | 30 | 60, mode: "standard" | "quick" = "standard") => {
  const clock = new TimerClock(); const rm = new RoomManager(new ContentRegistry(), new MemoryStore(), clock, (() => { let k = 0; return () => (k++ * 0.37) % 1; })());
  const r = rm.create("a", undefined, turnSeconds, "auto", undefined, mode); if (!r.ok) throw new Error(r.error); rm.join(r.code, "b"); await rm.start(r.code, "a", 4, { dreams: false });
  const room = rm.rooms.get(r.code)!; return { rm, code: r.code, room, clock };
};

describe("vaqtsiz xona (turnSeconds 0)", () => {
  it("odam navbatida taymer ham, muddat ham yo'q; soat qancha yursa ham navbat o'zi o'tmaydi", async () => {
    const { rm, room, clock } = await setup(0); const cur = currentPlayer(room.state!).id; const turn = room.state!.turn;
    const v: any = (rm as any).view(room, cur); expect(v.turnSeconds).toBe(0); expect(v.deadline).toBeNull(); expect(v.timerTotal ?? null).toBeNull();
    expect(clock.q).toHaveLength(0); // hech qanday taymer qo'yilmagan
    clock.t += 24 * 3600 * 1000; expect(room.state!.turn).toBe(turn);
  });
  it("oddiy xona (30 s) avvalgidek taymerli", async () => {
    const { rm, room, clock } = await setup(30); const cur = currentPlayer(room.state!).id; const v: any = (rm as any).view(room, cur);
    expect(v.turnSeconds).toBe(30); expect(v.deadline).not.toBeNull(); expect(clock.q.length).toBeGreaterThan(0);
  });
  it("odam harakat qilgach navbat keyingisiga o'tadi, u ham vaqtsiz (bot o'z navbatini darrov o'ynaydi)", async () => {
    const { rm, code, room, clock } = await setup(0); const cur = currentPlayer(room.state!).id;
    expect((await rm.act(code, cur, { type: "roll", playerId: cur }, room.seq)).ok).toBe(true);
    if (room.state!.pending) expect((await rm.act(code, cur, { type: "decide", playerId: cur, accept: false }, room.seq)).ok).toBe(true);
    expect((rm as any).view(room, cur).turnSeconds).toBe(0); expect(clock.q.every((x) => x.ms >= 0)).toBe(true);
  });
  it("uzilgan o'yinchi 5 daqiqadan keyin baribir avtopilotga o'tadi (o'yin qotib qolmaydi)", async () => {
    const { rm, room, clock } = await setup(0);
    room.state!.turn = room.state!.players.findIndex((p) => p.id === "a"); // navbat odamda
    const a = room.members.find((m) => m.userId === "a")!; room.members.find((m) => m.userId === "b")!.online = true;
    clock.q = []; rm.disconnect(room.code, "a"); // haqiqiy yo'l: uzilish o'zi tekshiruvni qo'yadi
    expect(clock.q.map((x) => x.ms).some((ms) => Math.abs(ms - RULES.disconnectAutopilotMinutes * 60_000) <= 1000)).toBe(true);
    expect(clock.q.every((x) => x.ms >= RULES.disconnectAutopilotMinutes * 60_000 - 1000)).toBe(true); // oddiy qaror taymeri yo'q
  });
  it("tez va reytingli rejimda vaqtsiz xona bo'lmaydi: 30 soniyaga o'tadi", async () => {
    const { rm, room } = await setup(0, "quick"); expect((rm as any).view(room, "a").turnSeconds).toBe(30);
  });
});
