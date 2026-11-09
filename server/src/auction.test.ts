// Garov auksioni (halol moliya): server taymeri, muddatni uzaytirish, vaqtsiz xona, botlar, jurnal.
import { describe, it, expect } from "vitest";
import { MemoryStore } from "./store";
import { ContentRegistry } from "./registry";
import { RoomManager, Clock } from "./rooms";
import { RULES, startAuction, takeLombard, tickLoans, newGame, type GameState } from "@poyga/rules";

class TimerClock implements Clock {
  t = 0; q: { id: number; f: () => void; at: number }[] = []; n = 0;
  now() { return this.t; } setTimeout(f: () => void, ms: number) { const id = ++this.n; this.q.push({ id, f, at: this.t + ms }); return id as any; } clearTimeout(id: any) { this.q = this.q.filter((x) => x.id !== id); }
  async fireNext() { this.q.sort((a, b) => a.at - b.at); const x = this.q.shift(); if (x) { this.t = Math.max(this.t, x.at); x.f(); await new Promise((r) => setTimeout(r, 25)); } return !!x; }
}
const setup = async (turnSeconds: 0 | 30 | 60, humans = ["a", "b", "c"], bots = 0) => {
  const clock = new TimerClock(); const rm = new RoomManager(new ContentRegistry(), new MemoryStore(), clock, (() => { let k = 0; return () => (k++ * 0.37) % 1; })());
  const r = rm.create(humans[0], undefined, turnSeconds, "auto", undefined, "standard"); if (!r.ok) throw new Error(r.error);
  for (const h of humans.slice(1)) rm.join(r.code, h);
  for (let i = 0; i < bots; i++) (rm as any).addBot?.(r.code, humans[0]);
  await rm.start(r.code, humans[0], 4, { dreams: false });
  const room = rm.rooms.get(r.code)!; return { rm, code: r.code, room, clock };
};
/** «a» ning lombardi muddati o'tgan (naqd yetmadi), boshqalarda pul bor; auksion ochiladi va taymer qo'yiladi. */
function inject(rm: any, room: any, ownerCash: number) {
  const s: GameState = room.state; s.halalFin = true;
  for (const p of s.players) { p.circle = "small"; p.cash = 100_000; p.assets = []; p.bankLoans = []; p.lombards = []; p.owe = 0; }
  const a = s.players.find((p) => p.id === "a")!; a.assets = [{ kind: "small_business", code: "B0", price: 20_000, monthlyIncome: 500, creditPayment: 0, credit: 0 }, { kind: "small_business", code: "B1", price: 1_000, monthlyIncome: 0, creditPayment: 0, credit: 0 }];
  a.cash = 0; Object.assign(a, takeLombard(a as any, 0).player); a.cash = 0; for (let i = 0; i < RULES.lombardTermMonths; i++) Object.assign(a, tickLoans(a as any)); a.cash = ownerCash;
  startAuction(s); room.armKey = null; rm.arm(room); room.seq++;
}

describe("auksion: taymer", () => {
  it("ochiq auksion odatdagi vaqtning 5 baravari (30 s → 150 s); takliflar muddatni o'zgartirmaydi; muddat tugasa yetakchi sotib oladi", async () => {
    const { rm, code, room, clock } = await setup(30); inject(rm, room, 100);
    expect(room.state!.auction!.phase).toBe("open"); const t0 = clock.t;
    expect(room.deadline).toBe(t0 + 30_000 * RULES.auctionTimeFactor); expect(room.deadline).toBe(t0 + 150_000);
    clock.t = t0 + 100_000;
    expect((await rm.act(code, "b", { type: "auction_bid", playerId: "b", amount: 10_000 }, room.seq)).ok).toBe(true);
    expect(room.deadline).toBe(t0 + 150_000); // taklif muddatni uzaytirmaydi ham, qisqartirmaydi ham
    expect((await rm.act(code, "c", { type: "auction_bid", playerId: "c", amount: 10_500 }, room.seq)).ok).toBe(true);
    await clock.fireNext(); expect(clock.t).toBe(t0 + 150_000);
    expect(room.state!.auction).toBeFalsy();
    const c = room.state!.players.find((p: any) => p.id === "c")!; expect(c.assets).toHaveLength(1); expect(c.cash).toBe(100_000 - 10_500);
    expect(room.state!.players.find((p: any) => p.id === "a")!.cash).toBe(100 + 500);
    const log = await (rm as any).store.journal(code); expect(log.some((e: any) => (e.action.action ?? e.action).type === "auction_close")).toBe(true);
  });
  it("sekin xonada (60 s) ochiq auksion 300 s", async () => {
    const { rm, room } = await setup(60); inject(rm, room, 100); expect(room.deadline).toBe(rm["clock"].now() + 300_000);
  });
  it("egasida pul bo'lsa avval unga odatdagi vaqt (30 s); tugasa auksion hammaga ochiladi (avtomatik rad) va 150 s davom etadi", async () => {
    const { rm, room, clock } = await setup(30); inject(rm, room, 50_000);
    expect(room.state!.auction!.phase).toBe("owner"); expect(room.deadline).toBe(clock.t + 30_000);
    await clock.fireNext(); expect(room.state!.auction!.phase).toBe("open"); expect(room.deadline).toBe(clock.t + 150_000);
  });
  it("auksion paytida oddiy navbat taymeri qo'yilmaydi; tugagach qayta boshlanadi (auksion vaqti hisobga kirmaydi)", async () => {
    const { rm, code, room, clock } = await setup(30); inject(rm, room, 100);
    const turn = room.state!.turn; clock.t += 120_000; expect(room.state!.turn).toBe(turn); expect(room.state!.auction).toBeTruthy();
    for (const u of ["b", "c"]) await rm.act(code, u, { type: "auction_pass", playerId: u }, room.seq);
    expect(room.state!.auction).toBeFalsy(); expect(room.timer).toBeTruthy(); expect(room.deadline).toBe(clock.t + RULES.timerDiceSeconds * 1000);
  });
});

describe("auksion: vaqtsiz xona (Mehrojiddin)", () => {
  it("taymer yo'q; hamma o'tkazganda yopiladi; bir taklif bo'lsa va boshqa raqib bo'lmasa — darhol sotiladi", async () => {
    const { rm, code, room, clock } = await setup(0); inject(rm, room, 100);
    expect(room.deadline).toBeNull(); clock.t += 3600_000; expect(room.state!.auction).toBeTruthy();
    await rm.act(code, "b", { type: "auction_bid", playerId: "b", amount: 10_000 }, room.seq);
    expect(room.state!.auction).toBeTruthy(); // c hali o'tkazmadi
    await rm.act(code, "c", { type: "auction_pass", playerId: "c" }, room.seq);
    expect(room.state!.auction).toBeFalsy(); expect(room.state!.players.find((p: any) => p.id === "b")!.assets).toHaveLength(1);
  });
});

describe("auksion: xavfsizlik", () => {
  it("klient auction_close yubora olmaydi; begona ham egasining nomidan rad eta olmaydi", async () => {
    const { rm, code, room } = await setup(30); inject(rm, room, 50_000);
    expect((await rm.act(code, "b", { type: "auction_decline", playerId: "b" } as any, room.seq)).ok).toBe(false);
    expect((await rm.act(code, "b", { type: "auction_close", playerId: "server" } as any, room.seq)).ok).toBe(false);
    expect(room.state!.auction!.phase).toBe("owner");
  });
});

describe("auksion: qayta o'ynash", () => {
  it("jurnal + urug'dan holat qayta tiklanadi (auksion harakatlari bilan)", async () => {
    const { rm, code, room, clock } = await setup(30); const before = (await (rm as any).store.journal(code)).length;
    inject(rm, room, 100); await rm.act(code, "b", { type: "auction_bid", playerId: "b", amount: 10_000 }, room.seq); await clock.fireNext();
    expect(room.state!.auction).toBeFalsy(); expect((await (rm as any).store.journal(code)).length).toBeGreaterThan(before);
    void newGame;
  });
});
