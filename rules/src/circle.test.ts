import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { newGame, reduce, currentPlayer, GameState, CONFIG } from "./index";

const rich = (s: GameState) => {
  const p = s.players[0];
  p.cash = 1_020_000; p.salary = 0; p.baseExpenses = 0; p.children = 0;
  p.assets = [{ kind: "business", code: "X", price: 1, monthlyIncome: 25_400, creditPayment: 0, credit: 0 }];
  return s;
};
/** Roll bajarilib, kartasiz katakka tushguncha urug'ni qidiradi. */
function rollNoCard(make: () => GameState) {
  for (let seed = 1; seed < 500; seed++) {
    const s = make(); s.rngState = seed;
    const r = reduce(s, ctx, { type: "roll", playerId: "a" });
    if (r.ok && !r.state.pending) return r.state;
  }
  throw new Error("urug' topilmadi");
}

describe("aylanalar", () => {
  it("3 shart bajarilsa kichik aylanadan katta aylanaga chiqadi (START=34)", () => {
    const s = rollNoCard(() => rich(newGame(ctx, ["a", "b"], 1)));
    const p = s.players[0];
    expect(p.circle).toBe("big"); expect(p.pos).toBe(CONFIG.bigStart);
    expect(p.lockedFlow).toBeGreaterThanOrEqual(25_400);
  });
  it("qo'llanma §10: chiqishda bizneslar bankka topshiriladi, kvartira/aksiya/avtomobil o'zida qoladi; pul oqimi (xarajat bilan) yoziladi", () => {
    const mkRich = () => { const g = rich(newGame(ctx, ["a", "b"], 1)); const p = g.players[0]; p.baseExpenses = 3_000; p.assets.push(
      { kind: "small_business", code: "S", price: 1, monthlyIncome: 100, creditPayment: 0, credit: 0 },
      { kind: "apartment", code: "KV1", price: 5000, monthlyIncome: 200, creditPayment: 0, credit: 0 },
      { kind: "shares", code: "TAPOiCh", price: 100, monthlyIncome: 0, creditPayment: 0, credit: 0, shares: 10 }); return g; };
    const s = rollNoCard(mkRich), p = s.players[0];
    expect(p.circle).toBe("big"); expect(p.assets.map((a) => a.kind).sort()).toEqual(["apartment", "shares"]);
    expect(p.lockedFlow).toBe(25_400 + 100 + 200 - 3_000); // topshirishdan oldingi oqim (kamayib qolmaydi)
  });
  it("passiv daromad 25 000 bo'lsa, xarajat qanchaligidan qat'i nazar chiqadi (qo'llanma: «oylik passiv daromad»)", () => {
    const s = rollNoCard(() => { const g = rich(newGame(ctx, ["a", "b"], 1)); g.players[0].assets[0].monthlyIncome = 25_000; g.players[0].baseExpenses = 20_000; return g; });
    expect(s.players[0].circle).toBe("big");
  });
  it("qarz bo'lsa chiqmaydi", () => {
    const s = rollNoCard(() => { const g = rich(newGame(ctx, ["a", "b"], 1)); g.players[0].bankDebt = 100; return g; });
    expect(s.players[0].circle).toBe("small");
  });
  it("katta aylanada orzu katagida 3 shart bajarilsa g'alaba", () => {
    const dreamIdx = 0, dream = ctx.dreams[dreamIdx];
    const cell = ctx.bigBoard.find((c) => c.t === "O" && c.name === dream.name)!.i;
    for (let die = 1; die <= 6; die++) {
      const s = newGame(ctx, ["a", "b"], 1);
      const p = s.players[0];
      Object.assign(p, { circle: "big", pos: (cell - die + 53) % 53, dreamIdx, cash: dream.price + 1000, lockedFlow: 100_000, salary: 0, baseExpenses: 0 });
      s.rngState = 1;
      for (let seed = 1; seed < 400; seed++) {
        const t = structuredClone(s); t.rngState = seed;
        const r = reduce(t, ctx, { type: "roll", playerId: "a" });
        if (r.ok && r.die === die) { expect(r.state.winner).toBe("a"); return; }
      }
    }
    throw new Error("kubik topilmadi");
  });
  it("naqd yetmasa yutmaydi", () => {
    const dream = ctx.dreams[0];
    const cell = ctx.bigBoard.find((c) => c.t === "O" && c.name === dream.name)!.i;
    for (let seed = 1; seed < 400; seed++) {
      const s = newGame(ctx, ["a", "b"], 1);
      Object.assign(s.players[0], { circle: "big", pos: (cell - 1 + 53) % 53, dreamIdx: 0, cash: dream.price - 1, lockedFlow: 100_000, salary: 0, baseExpenses: 0 });
      s.rngState = seed;
      const r = reduce(s, ctx, { type: "roll", playerId: "a" });
      if (r.ok && r.die === 1) { expect(r.state.winner).toBeNull(); return; }
    }
  });
});
