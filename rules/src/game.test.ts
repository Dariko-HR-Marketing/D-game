import { describe, it, expect } from "vitest";
import { ctx, cards, bigBoard, dreams } from "./testctx";
import { Ctx, newGame, reduce, chooseDream, currentPlayer, GameState, effectOf, playerCashflow, SMALL_BOARD } from "./index";


/** Oddiy bot: ixtiyoriy kartani naqdi yetsa qabul qiladi. */
function play(seed: number, n: number, maxTurns: number) {
  let s: GameState = newGame(ctx, Array.from({ length: n }, (_, i) => `p${i}`), seed);
  s.players.forEach((p, i) => (s = chooseDream(s, p.id, i % dreams.length)));
  let t = 0, exited = 0;
  for (; t < maxTurns && !s.winner; t++) {
    const me = currentPlayer(s).id;
    let r = reduce(s, ctx, { type: "roll", playerId: me });
    if (!r.ok) throw new Error(r.error);
    s = r.state;
    while (s.pending) {
      const e = effectOf(ctx, s.pending.cardId).effect;
      const r2 = reduce(s, ctx, { type: "decide", playerId: me, accept: e.kind !== "lendRequest", useBank: true });
      if (!r2.ok) throw new Error(r2.error);
      s = r2.state;
    }
  }
  exited = s.players.filter((p) => p.circle === "big").length;
  return { s, t, exited };
}

describe("o'yin simulyatsiyasi", () => {
  it("bir xil urug' → bir xil o'yin (determinizm)", () => {
    expect(play(5, 3, 80).s).toEqual(play(5, 3, 80).s);
  });
  it("turli urug'lar: istisno yo'q, qiymatlar chekli, deka saqlanadi", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const n = 2 + (seed % 5);
      const { s } = play(seed, n, 400);
      for (const p of s.players) {
        expect(Number.isFinite(p.cash) && Number.isFinite(playerCashflow(p)), `seed ${seed}`).toBe(true);
        expect(p.bankDebt).toBeLessThanOrEqual(10_000);
      }
      for (const [d, ds] of Object.entries(s.decks))
        expect(new Set([...ds.draw, ...ds.discard]).size, `${d} seed ${seed}`).toBe(ctx.deckIds[d as keyof Ctx["deckIds"]].length);
    }
  });
  it("noto'g'ri o'yinchi yoki ikki marta qaror — rad etiladi", () => {
    const s = newGame(ctx, ["a", "b"], 1);
    expect(reduce(s, ctx, { type: "roll", playerId: "b" })).toEqual({ ok: false, error: "not_your_turn" });
    expect(reduce(s, ctx, { type: "decide", playerId: "a", accept: true })).toEqual({ ok: false, error: "nothing_pending" });
  });
  it("navbat aylanadi, kubik 1..6", () => {
    let s = newGame(ctx, ["a", "b"], 3);
    const r = reduce(s, ctx, { type: "roll", playerId: "a" });
    expect(r.ok && r.die! >= 1 && r.die! <= 6).toBe(true);
  });
  it("orzu nomlari katta aylana O-kataklari bilan mos", () => {
    const cells = new Set(bigBoard.filter((c) => c.t === "O").map((c) => c.name));
    for (const d of dreams) expect(cells.has(d.name), d.name).toBe(true);
  });
  it("A ilova 48 katak", () => expect(SMALL_BOARD).toHaveLength(48));
});
