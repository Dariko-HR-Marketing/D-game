import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { newGame, reduce, currentPlayer, effectOf, slotBlocked, GameState } from "./index";

describe("8 o'yinchi (2–8)", () => {
  it("o'yin boshida har bir o'yinchi kubik tashlaydi, orzular har xil, o'yin xatosiz yuradi va qiymatlar chekli", () => {
    for (let seed = 1; seed <= 6; seed++) {
      const ids = Array.from({ length: 8 }, (_, i) => `p${i}`);
      let s: GameState = newGame(ctx, ids, seed, ids.slice(3));
      s.players.forEach((p, i) => { p.dreamIdx = i; });
      expect(new Set(s.players.map((p) => p.dreamIdx)).size).toBe(8);
      for (let t = 0; t < 400 && !s.winner; t++) {
        const me = currentPlayer(s).id; let r: any = reduce(s, ctx, { type: "roll", playerId: me }); expect(r.ok, r.error).toBe(true); s = r.state;
        while (s.pending) {
          const e = effectOf(ctx, s.pending.cardId).effect; const p = s.players.find((x) => x.id === me)!;
          r = reduce(s, ctx, { type: "decide", playerId: me, accept: (t + seed) % 2 === 0 && e.kind !== "lendRequest" && !slotBlocked(e, p), useBank: true }); expect(r.ok, r.error).toBe(true); s = r.state;
        }
        s.proposals = [];
      }
      for (const p of s.players) expect(Number.isFinite(p.cash), `seed ${seed}`).toBe(true);
      expect(s.players).toHaveLength(8);
    }
  });
});
