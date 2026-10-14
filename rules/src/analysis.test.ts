import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { Action, GameState, analyzeGame, chooseDream, currentPlayer, effectOf, newGame, reduce } from "./index";

/** O'yinni o'ynab, harakatlar ro'yxatini yig'adi. */
function play(seed: number, n: number, turns: number) {
  const ids = Array.from({ length: n }, (_, i) => `p${i}`);
  let s: GameState = newGame(ctx, ids, seed); s.players.forEach((p, i) => (s = chooseDream(s, p.id, i)));
  const acts: Action[] = [];
  for (let t = 0; t < turns && !s.winner; t++) {
    const me = currentPlayer(s).id;
    const roll: Action = { type: "roll", playerId: me }; const r = reduce(s, ctx, roll); if (!r.ok) throw 0; s = r.state; acts.push(roll);
    if (s.pending) { const e = effectOf(ctx, s.pending.cardId).effect; const d: Action = { type: "decide", playerId: me, accept: e.kind !== "lendRequest" && t % 3 !== 0, useBank: true };
      const r2 = reduce(s, ctx, d); if (!r2.ok) throw 0; s = r2.state; acts.push(d); }
  }
  return { ids, s, acts };
}

describe("o'yin tahlili", () => {
  it("jurnaldan qayta o'ynash yakuniy holatni aynan tiklaydi", () => {
    const { ids, s, acts } = play(21, 3, 300);
    const { final } = analyzeGame(ctx, { playerIds: ids, seed: 21, bots: [], restricted: [] }, acts);
    expect(final).toEqual(s);
  });
  it("seriyalar, qarorlar va hodisalar izchil", () => {
    const { ids, s, acts } = play(22, 4, 400);
    const { analysis: a } = analyzeGame(ctx, { playerIds: ids, seed: 22, bots: [], restricted: [] }, acts);
    expect(a.players).toHaveLength(4); expect(a.rounds).toBe(s.round);
    for (const p of a.players) {
      expect(p.series.length).toBeGreaterThan(1); expect(p.series[0].round).toBe(1);
      expect(p.series.every((pt, i) => i === 0 || pt.round >= p.series[i - 1].round)).toBe(true);
      expect(p.peakCashflow).toBeGreaterThanOrEqual(p.series[0].cashflow);
    }
    const accepted = a.players.reduce((t, p) => t + p.decisions.accepted, 0), skipped = a.players.reduce((t, p) => t + p.decisions.skipped, 0);
    const cardTotals = Object.values(a.cards).reduce((t, c) => ({ a: t.a + c.accepted, k: t.k + c.skipped, n: t.n + c.shown }), { a: 0, k: 0, n: 0 });
    expect(cardTotals).toEqual({ a: accepted, k: skipped, n: accepted + skipped });
    expect(a.events.filter((e) => e.kind === "restart").length).toBe(a.players.reduce((t, p) => t + p.restarts, 0));
  });
  it("buzilgan jurnal aniq xato beradi", () => {
    const { ids, acts } = play(23, 2, 20);
    expect(() => analyzeGame(ctx, { playerIds: ids, seed: 23, bots: [], restricted: [] }, [{ type: "roll", playerId: "p1" }, ...acts])).toThrow(/jurnal buzilgan/);
  });
});
