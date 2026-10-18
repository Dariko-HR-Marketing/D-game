import { describe, it, expect } from "vitest";
import { ctx, dreams } from "./testctx";
import { newGame, reduce, chooseDream, currentPlayer, effectOf, move, monthsPerLap, SMALL_BOARD, crisisMonths, type GameState } from "./index";

describe("o'tgan oylar hisobi (§5.1: har bir «D» katagi — 1 oy)", () => {
  it("bir aylanada 4 oy; inqiroz 9 aylana = 36 oy (3 yil)", () => {
    expect(monthsPerLap()).toBe(4); expect([...SMALL_BOARD].filter((c) => c === "D")).toHaveLength(4); expect(crisisMonths()).toBe(36);
  });
  it("har tashlashda monthsPlayed qadamlar ustidagi «D» kataklari soniga oshadi va hech qachon kamaymaydi", () => {
    let s: GameState = newGame(ctx, ["a", "b"], 7); s.players.forEach((p, i) => (s = chooseDream(s, p.id, i % dreams.length)));
    const total: Record<string, number> = { a: 0, b: 0 }; let lastTotal = 0;
    for (let t = 0; t < 120 && !s.winner; t++) {
      const me = currentPlayer(s).id, before = s.players.find((p) => p.id === me)!;
      const r = reduce(s, ctx, { type: "roll", playerId: me }); if (!r.ok) throw new Error(r.error); s = r.state;
      const die = (s.lastRoll as any).die as number, after = s.players.find((p) => p.id === me)!;
      if (before.circle === "small" && after.circle === "small") {
        const expected = move(before.pos, die, 48).months;
        expect((after.monthsPlayed ?? 0) - (before.monthsPlayed ?? 0)).toBe(expected);
      } else expect((after.monthsPlayed ?? 0)).toBeGreaterThanOrEqual(before.monthsPlayed ?? 0);
      total[me] = after.monthsPlayed ?? 0;
      while (s.pending) { const e = effectOf(ctx, s.pending.cardId).effect; const r2 = reduce(s, ctx, { type: "decide", playerId: me, accept: e.kind !== "lendRequest", useBank: true }); if (!r2.ok) throw new Error(r2.error); s = r2.state; }
      const sum = s.players.reduce((a, p) => a + (p.monthsPlayed ?? 0), 0); expect(sum).toBeGreaterThanOrEqual(lastTotal); lastTotal = sum;
    }
    expect(total.a + total.b).toBeGreaterThan(0);
  });
});
