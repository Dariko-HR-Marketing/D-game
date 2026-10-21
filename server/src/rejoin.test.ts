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
    const turn0 = room.state!.turn; await c.advance(10 * HOUR); expect(room.state!.turn).toBe(turn0); expect(room.seq).toBeLessThanOrEqual(seq0 + 1); // tok o'chdi: navbat o'tmadi (faqat taklif muddati tugashi mumkin)
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
    const r2 = rm2.rooms.get(code)!; const seq = r2.seq, turn = r2.state!.turn; await c2.advance(10 * HOUR); expect(r2.state!.turn).toBe(turn);
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

describe("zal server qayta ishga tushsa ham saqlanadi", () => {
  const next = (store: MemoryStore) => new RoomManager(new ContentRegistry(), store, new FakeClock());
  it("a'zolar, o'rinlar soni va sozlamalar tiklanadi; o'yinchilar qaytadi; yangi odam o'rin bo'lsa qo'shiladi", async () => {
    const store = new MemoryStore(); const rm = new RoomManager(new ContentRegistry(), store, new FakeClock());
    const r = rm.create("a", undefined, 60, "auto", 4); if (!r.ok) throw 0; rm.join(r.code, "b"); rm.join(r.code, "c");
    await new Promise((x) => setImmediate(x));
    const rm2 = next(store); expect(await rm2.restore()).toBe(1);
    const room = rm2.rooms.get(r.code)!; expect(room.state).toBeNull(); expect(room.seats).toBe(4); expect(room.turnSeconds).toBe(60); expect(room.hostId).toBe("a");
    expect(room.members.map((m) => m.userId)).toEqual(["a", "b", "c"]); expect(room.members.every((m) => !m.online)).toBe(true);
    expect(rm2.activeRoomOf.get("b")).toBe(r.code);
    expect(rm2.join(r.code, "b")).toEqual({ ok: true }); expect(rm2.join(r.code, "d")).toEqual({ ok: true }); expect(rm2.join(r.code, "e")).toEqual({ ok: false, error: "room_full" });
    expect((await rm2.start(r.code, "a", 5, { dreams: false })).ok).toBe(true);
  });
  it("chiqqan o'yinchi saqlangan zaldan ham chiqadi; hamma chiqsa zal o'chadi; o'yin boshlangach zal yozuvi o'chadi", async () => {
    const store = new MemoryStore(); const rm = new RoomManager(new ContentRegistry(), store, new FakeClock());
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b"); rm.leave(r.code, "b"); await new Promise((x) => setImmediate(x));
    expect((await next(store).restore()) && store.lobbies.get(r.code)!.members.map((m) => m.userId)).toEqual(["a"]);
    rm.leave(r.code, "a"); await new Promise((x) => setImmediate(x)); expect(store.lobbies.size).toBe(0);
    const g = await setup(["a", "b"], 2); expect(g.store.lobbies.size).toBe(0);
  });
  it("tashlab ketilgan zal yopilganda saqlagichdan ham o'chadi", async () => {
    const store = new MemoryStore(); const clock = new FakeClock(); const rm = new RoomManager(new ContentRegistry(), store, clock);
    const r = rm.create("a"); if (!r.ok) throw 0; rm.disconnect(r.code, "a"); await new Promise((x) => setImmediate(x));
    await clock.advance(31 * 60_000); expect(await rm.sweep(30 * 60_000, 24 * HOUR)).toBe(1); expect(store.lobbies.size).toBe(0);
  });
});

describe("taymer jadvali va avtopilot", () => {
  const phase = (room: any, rm: RoomManager) => rm.view(room).timerTotal;
  it("bosqichga qarab taymer: kubik 10, karta 30, birovning biznesi 20, majburiy to'lov 60 s", async () => {
    const { rm, room } = await setup(["a", "b"], 2);
    expect(phase(room, rm)).toBe(10);
    const cur = room.state!.players[room.state!.turn % 2].id;
    const pick = (kind: string) => Object.values(room.ctx.effects).find((c: any) => c.effect.kind === kind) as any;
    const buy = Object.values(room.ctx.effects).find((c: any) => c.effect.kind === "buy" && c.mode === "optional") as any;
    room.state!.pending = { type: "card", playerId: cur, cardId: buy.id, deck: buy.deck }; room.armKey = null; (rm as any).arm(room); expect(phase(room, rm)).toBe(30);
    const hod7 = pick("payOrLoseBusiness"); room.state!.pending = { type: "card", playerId: cur, cardId: hod7.id, deck: hod7.deck }; room.armKey = null; (rm as any).arm(room); expect(phase(room, rm)).toBe(60);
  });
  it("ketma-ket 3 marta vaqt tugasa avtopilot; navbat kutmasdan o'tadi; o'zi harakat qilsa yoki «Men qaytdim» bossa o'chadi", async () => {
    const { rm, c, code, room } = await setup(["a", "b"], 2);
    const me = room.members.find((m) => m.userId === "b")!; // «b» o'ynamaydi, «a» onlayn
    const play = async () => { // «a» o'z navbatida kubik tashlaydi/qarorni o'tkazadi, «b» ning taymeri tugaydi
      for (let k = 0; k < 40 && !me.autopilot; k++) { const cur = room.state!.players[room.state!.turn % 2].id; if (cur === "a") { if (room.state!.pending) await rm.act(code, "a", { type: "decide", accept: false, playerId: "a" } as any, room.seq); else await rm.act(code, "a", { type: "roll", playerId: "a" } as any, room.seq); } else await c.advance(31_000); }
    };
    await play(); expect(me.autopilot).toBe(true); expect(me.autoStreak).toBeGreaterThanOrEqual(3);
    expect(rm.view(room).members.find((m) => m.userId === "b")!.autopilot).toBe(true);
    // avtopilotda navbat qisqa pauzadan keyin o'tadi (30 s kutilmaydi)
    for (let k = 0; k < 6 && room.state!.players[room.state!.turn % 2].id !== "b"; k++) { const cur = room.state!.players[room.state!.turn % 2].id; if (cur === "a") { if (room.state!.pending) await rm.act(code, "a", { type: "decide", accept: false, playerId: "a" } as any, room.seq); else await rm.act(code, "a", { type: "roll", playerId: "a" } as any, room.seq); } }
    expect(room.state!.players[room.state!.turn % 2].id).toBe("b"); const seq = room.seq; await c.advance(2_000); expect(room.seq).toBeGreaterThan(seq); expect(room.timerSeconds ?? null).toBeNull();
    expect(rm.resumePlay(code, "b")).toEqual({ ok: true }); expect(me.autopilot).toBeFalsy(); expect(me.autoStreak).toBe(0);
    // o'zi harakat qilsa ham o'chadi
    me.autopilot = true; me.autoStreak = 3; await c.advance(40_000); // qaytadan
    const cur = room.state!.players[room.state!.turn % 2].id; if (cur === "b") { await rm.act(code, "b", { type: room.state!.pending ? "decide" : "roll", ...(room.state!.pending ? { accept: false } : {}), playerId: "b" } as any, room.seq); expect(me.autopilot).toBeFalsy(); }
  });
  it("5 daqiqadan beri uzilgan o'yinchi avtopilotda (o'rni saqlanadi); qaytsa o'chadi", async () => {
    const { rm, c, code, room } = await setup(["a", "b"], 2); const mb = room.members.find((m) => m.userId === "b")!;
    rm.disconnect(code, "b"); expect((rm as any).isAutopilot(mb)).toBe(false);
    c.t += 4 * 60_000; expect((rm as any).isAutopilot(mb)).toBe(false); // soat to'g'ridan-to'g'ri suriladi: o'yin taymerlari aralashmasin
    c.t += 61_000; expect((rm as any).isAutopilot(mb)).toBe(true); expect(mb.left).toBeFalsy();
    expect(rm.join(code, "b")).toEqual({ ok: true }); expect((rm as any).isAutopilot(mb)).toBe(false);
  });
  it("bozor taklifi 20 s da o'chadi, boshqa takliflar 30 s da", async () => {
    const { rm, c, code, room } = await setup(["a", "b"], 2);
    room.state!.proposals.push({ id: 91, kind: "market", cardId: Object.keys(room.ctx.effects).find((k) => (room.ctx.effects[k].effect as any).kind === "marketSale")!, sold: [] } as any);
    room.state!.proposals.push({ id: 92, kind: "suyunchi", parent: "a", given: [] }); (rm as any).armProposals(room);
    await c.advance(20_000); expect(room.state!.proposals.some((p) => p.id === 91)).toBe(false); expect(room.state!.proposals.some((p) => p.id === 92)).toBe(true);
    await c.advance(10_000); expect(room.state!.proposals.some((p) => p.id === 92)).toBe(false);
  });
});
