// Bankrot tanaffusi (server): o'yin tasdiqlanguncha to'xtaydi; vaqt tugasa/bot/avtopilot bo'lsa o'zi davom etadi; «Vaqtincha chiqib turish».
import { describe, it, expect } from "vitest";
import { MemoryStore } from "./store";
import { ContentRegistry } from "./registry";
import { RoomManager, Clock } from "./rooms";
import { currentPlayer } from "@poyga/rules";

class TimerClock implements Clock {
  t = 0; q: { id: number; f: () => void; ms: number }[] = []; n = 0;
  now() { return this.t; } setTimeout(f: () => void, ms: number) { const id = ++this.n; this.q.push({ id, f, ms }); return id as any; } clearTimeout(id: any) { this.q = this.q.filter((x) => x.id !== id); }
  async fire() { const x = this.q.shift(); if (x) { this.t += x.ms; x.f(); await new Promise((r) => setTimeout(r, 20)); } return !!x; }
}
const setup = async () => {
  const clock = new TimerClock(); const rm = new RoomManager(new ContentRegistry(), new MemoryStore(), clock, (() => { let k = 0; return () => (k++ * 0.37) % 1; })());
  const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b"); await rm.start(r.code, "a", 4, { dreams: false, recap: true });
  const room = rm.rooms.get(r.code)!; return { rm, code: r.code, room, clock };
};
const open = (room: any, who: string) => { const p = room.state.players.find((x: any) => x.id === who); room.state.recaps = [{ id: 1, playerId: who, month: 3, round: 1, cause: { kind: "pay", amount: 12000 }, before: { kasb: "A", cash: 5, owe: 9000, bankDebt: 0, handDebt: 0, salary: 1500, expenses: 1000, passive: 0, cashflow: 500, assets: [] }, newKasb: "B", recent: [] }]; room.state.nextRecap = 2; return p; };

describe("bankrot tanaffusi", () => {
  it("tasdiqlanguncha yurish rad etiladi; egasi tasdiqlaydi — o'yin davom etadi", async () => {
    const { rm, code, room } = await setup(); const cur = currentPlayer(room.state!).id; open(room, cur); (rm as any).emit(room);
    expect(room.state!.recapPause).toBe(true);
    expect(await rm.act(code, cur, { type: "roll", playerId: cur }, room.seq)).toMatchObject({ ok: false, error: "recap_open" });
    expect((await rm.act(code, cur, { type: "ack_restart", playerId: cur, id: 1 } as any, room.seq)).ok).toBe(true);
    expect(room.state!.recaps).toHaveLength(0);
    expect((await rm.act(code, cur, { type: "roll", playerId: cur }, room.seq)).ok).toBe(true);
  });
  it("vaqt tugasa tahlil o'zi yopiladi (o'tkazib yuborilgan harakat hisoblanmaydi)", async () => {
    const { rm, room, clock } = await setup(); const cur = currentPlayer(room.state!).id; open(room, cur); (rm as any).emit(room);
    const mem = room.members.find((m) => m.userId === cur)!; const streak = mem.autoStreak ?? 0;
    for (let i = 0; i < 5 && room.state!.recaps!.length; i++) await clock.fire();
    expect(room.state!.recaps).toHaveLength(0); expect(mem.autoStreak ?? 0).toBe(streak); expect(room.state!.players.find((p) => p.id === cur)!.autos ?? 0).toBe(0);
  });
  it("«Vaqtincha chiqib turish»: avtopilot yoqiladi va tahlil yopiladi; «Men qaytdim» bilan qaytadi", async () => {
    const { rm, code, room, clock } = await setup(); const cur = currentPlayer(room.state!).id; open(room, cur); (rm as any).emit(room);
    expect((await rm.takeBreak(code, cur)).ok).toBe(true); expect(room.members.find((m) => m.userId === cur)!.autopilot).toBe(true);
    for (let i = 0; i < 5 && room.state!.recaps!.length; i++) await clock.fire(); expect(room.state!.recaps).toHaveLength(0);
    expect(rm.resumePlay(code, cur).ok).toBe(true); expect(room.members.find((m) => m.userId === cur)!.autopilot).toBeFalsy();
  });
  it("tahlil o'yin boshlanmagan yoki tugagan xonada «Vaqtincha chiqib turish» rad etiladi", async () => {
    const clock = new TimerClock(); const rm = new RoomManager(new ContentRegistry(), new MemoryStore(), clock); const r = rm.create("a"); if (!r.ok) throw 0;
    expect(await rm.takeBreak(r.code, "a")).toMatchObject({ ok: false });
  });
});
