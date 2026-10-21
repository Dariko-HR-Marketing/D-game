import { describe, it, expect } from "vitest";
import { ctx, dreams } from "./testctx";
import { newGame, reduce, chooseDream, currentPlayer, effectOf, type GameState } from "./index";

const start = (seed: number): GameState => { let s = newGame(ctx, ["a", "b"], seed); s.players.forEach((p, i) => (s = chooseDream(s, p.id, i % dreams.length))); return s; };
const settle = (s: GameState): GameState => { while (s.pending) { const me = currentPlayer(s).id, e = effectOf(ctx, s.pending.cardId, s.pending).effect; const r = reduce(s, ctx, { type: "decide", playerId: me, accept: false, useBank: true }); if (!r.ok) throw new Error(`${e.kind}: ${r.error}`); s = r.state; } return s; };

describe("kubiklar: har bir kubik holatda saqlanadi (mijoz ikkita kubikni ko'rsatadi)", () => {
  it("kichik aylanada 1 ta kubik, yig'indi shu kubikka teng", () => {
    let s = start(11);
    for (let i = 0; i < 20 && !s.winner; i++) {
      const me = currentPlayer(s); if (me.circle !== "small") break;
      const r = reduce(s, ctx, { type: "roll", playerId: me.id }); if (!r.ok) throw new Error(r.error); s = settle(r.state);
      const lr = s.lastRoll!; expect(lr.dice).toHaveLength(1); expect(lr.die).toBe(lr.dice![0]); expect(lr.die).toBeGreaterThanOrEqual(1); expect(lr.die).toBeLessThanOrEqual(6);
    }
  });
  it("katta aylanada 2 ta kubik, yig'indi ikkalasining yig'indisi (2…12)", () => {
    let s = start(5); const big = s.players[0]; big.circle = "big"; big.pos = 0; (big as any).cash = 1_000_000;
    for (let i = 0; i < 10; i++) {
      const me = currentPlayer(s); if (me.circle !== "big") { const r0 = reduce(s, ctx, { type: "roll", playerId: me.id }); if (!r0.ok) throw new Error(r0.error); s = settle(r0.state); continue; }
      const r = reduce(s, ctx, { type: "roll", playerId: me.id }); if (!r.ok) throw new Error(r.error); s = settle(r.state);
      const lr = s.lastRoll!; expect(lr.dice).toHaveLength(2); expect(lr.dice!.every((d) => d >= 1 && d <= 6)).toBe(true); expect(lr.die).toBe(lr.dice![0] + lr.dice![1]); expect(lr.die).toBeGreaterThanOrEqual(2); expect(lr.die).toBeLessThanOrEqual(12);
    }
  });
  it("xayriya (kichik aylanada 3 navbat 2 kubik): ikkita kubik yoziladi, so'ng yana bitta", () => {
    let s = start(9); (s.players[0] as any).twoDice = 1; const me = currentPlayer(s);
    const r = reduce(s, ctx, { type: "roll", playerId: me.id }); if (!r.ok) throw new Error(r.error);
    const who = me.id; expect(r.state.lastRoll!.playerId).toBe(who);
    if (who === s.players[0].id) { expect(r.state.lastRoll!.dice).toHaveLength(2); } else { expect(r.state.lastRoll!.dice).toHaveLength(1); }
  });
  it("tasodifiy tartib o'zgarmagan: bir xil urug' bir xil yig'indi beradi", () => {
    const a = reduce(start(77), ctx, { type: "roll", playerId: "a" }), b = reduce(start(77), ctx, { type: "roll", playerId: "a" });
    expect(a.ok && b.ok).toBe(true); if (a.ok && b.ok) { expect(a.state.lastRoll).toEqual(b.state.lastRoll); }
  });
});
