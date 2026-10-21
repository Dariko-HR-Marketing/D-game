import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { newGame, chooseDream, currentPlayer, reduce } from "./index";

const mk = (seed: number, n = 4) => newGame(ctx, Array.from({ length: n }, (_, i) => `p${i}`), seed, [], [], { dreamPhase: false, openingDice: true });

describe("birinchi yuruvchi — kubik bo'yicha (qo'llanma)", () => {
  it("eng katta kubik tashlagan boshlaydi; teng bo'lsa tenglar qayta tashlaydi; urug' bir xil bo'lsa natija bir xil", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const s = mk(seed), s2 = mk(seed); seen.add(currentPlayer(s).id);
      expect(s.openingDice).toBe(true); expect(s.first).toBe(s.turn); expect(currentPlayer(s2).id).toBe(currentPlayer(s).id); // qayta o'ynash (jurnal) aynan shuni beradi
      const last = s.opening![s.opening!.length - 1]; const top = Math.max(...Object.values(last));
      expect(last[currentPlayer(s).id]).toBe(top); expect(Object.values(last).filter((v) => v === top).length).toBe(1); // oxirgi tashlashda g'olib yagona
      for (const r of s.opening!) for (const v of Object.values(r)) { expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(6); }
    }
    expect(seen.size).toBeGreaterThan(1); // har safar bir odam emas
  });
  it("tur boshlovchidan hisoblanadi: hamma bir marta yurgach tur 2 bo'ladi", () => {
    let s = mk(5, 3); s.players.forEach((p, i) => (s = chooseDream(s, p.id, i)));
    expect(s.round).toBe(1);
    for (let i = 0; i < 3; i++) {
      const me = currentPlayer(s).id; const r: any = reduce(s, ctx, { type: "roll", playerId: me });
      s = r.state; if (s.pending) { const d: any = reduce(s, ctx, { type: "decide", playerId: me, accept: false }); s = d.state; }
      if (i < 2) expect(s.round).toBe(1);
    }
    expect(s.round).toBe(2);
  });
  it("opts bo'lmasa avvalgidek: p0 birinchi, ochiq `openingDice` yo'q", () => {
    const s = newGame(ctx, ["a", "b", "c"], 9, [], [], { dreamPhase: false }); expect(s.turn).toBe(0); expect(s.openingDice).toBeUndefined();
  });
});
