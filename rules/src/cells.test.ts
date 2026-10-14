import { describe, it, expect } from "vitest";
import { ctx as base } from "./testctx";
import { Ctx, GameState, newGame, reduce, SMALL_BOARD, currentPlayer } from "./index";
import { CellRules } from "@poyga/content/cellrules";

const withRules = (r: unknown): Ctx => ({ ...base, cellRules: CellRules.parse(r) });
const cellAt = (c: "K" | "Q") => SMALL_BOARD.indexOf(c);

/** Birinchi o'yinchini `target` katagiga tushiradigan urug' topib, bitta yurish bajaradi. */
function landSmall(ctx: Ctx, target: number, prep?: (s: GameState) => void, n = 2) {
  for (let die = 1; die <= 6; die++) for (let seed = 1; seed < 400; seed++) {
    const s = newGame(ctx, Array.from({ length: n }, (_, i) => `p${i}`), 1); prep?.(s);
    s.players[0].pos = (target - die + 48) % 48; s.rngState = seed;
    const r = reduce(s, ctx, { type: "roll", playerId: "p0" });
    if (r.ok && r.die === die) return r.state;
  }
  throw new Error("urug' topilmadi");
}

describe("katak qoidalari bo'sh bo'lsa: K va Q ta'sirsiz, jurnalga yoziladi", () => {
  it.each(["K", "Q"] as const)("%s", (c) => {
    const s = landSmall(base, cellAt(c)); expect(s.log.some((l) => l.includes("qoida kutilmoqda"))).toBe(true);
    expect(s.players[0].restarts).toBe(0); expect(s.players[0].skipTurns).toBe(0);
  });
});

describe("sozlangan katak ta'sirlari (kichik aylana)", () => {
  it("restart: yangi kasb bilan boshidan, aktivlar yo'qoladi", () => {
    const ctx = withRules({ small: { K: { kind: "restart" } } });
    const s = landSmall(ctx, cellAt("K"), (g) => { g.players[0].assets = [{ kind: "business", code: "X", price: 1, monthlyIncome: 100, creditPayment: 0, credit: 0 }]; });
    expect(s.players[0].restarts).toBe(1); expect(s.players[0].assets).toHaveLength(0); expect(s.players[0].pos).toBe(0);
  });
  it("skipTurns: o'yinchi N navbatga o'tkazib yuboriladi, qolganlar yuradi; keyin yana yuradi", () => {
    const ctx = withRules({ small: { Q: { kind: "skipTurns", turns: 2 } } });
    let s = landSmall(ctx, cellAt("Q"), undefined, 2);
    expect(s.players[0].skipTurns).toBe(2); // p0 hali o'tkazmagan: navbati kelganda o'tkazadi
    expect(currentPlayer(s).id).toBe("p1");
    const turnsOf: string[] = [];
    for (let i = 0; i < 6; i++) { const me = currentPlayer(s).id; turnsOf.push(me);
      let r: any = reduce(s, ctx, { type: "roll", playerId: me }); s = r.state;
      if (s.pending) { r = reduce(s, ctx, { type: "decide", playerId: me, accept: false }); s = r.state; } }
    expect(turnsOf.slice(0, 4)).toEqual(["p1", "p1", "p1", "p0"]); // p0 ikki navbatini o'tkazdi, p1 ketma-ket yurdi
    expect(s.players[0].skipTurns).toBe(0);
  });
  it("hamma o'yinchi o'tkazib yuborsa ham cheksiz tsikl yo'q", () => {
    const ctx = withRules({ small: { Q: { kind: "skipTurns", turns: 3 } } });
    const s = landSmall(ctx, cellAt("Q"), (g) => { g.players[1].skipTurns = 5; });
    expect(typeof currentPlayer(s).id).toBe("string"); // tugadi (bloklanmadi)
  });
  it("payday: pul oqimi N marta qo'shiladi", () => {
    const ctx = withRules({ small: { K: { kind: "payday", times: 2 } } });
    const noRule = landSmall(base, cellAt("K")), s = landSmall(ctx, cellAt("K"));
    const flow = s.players[0].salary - s.players[0].baseExpenses;
    expect(s.players[0].cash - noRule.players[0].cash).toBe(2 * flow);
  });
  it("payFixed: naqd yetmasa avtomatik bank krediti (§5.3)", () => {
    const ctx = withRules({ small: { Q: { kind: "payFixed", amount: 3000 } } });
    const s = landSmall(ctx, cellAt("Q"), (g) => { g.players[0].cash = 1000; });
    expect(s.players[0].bankDebt).toBeGreaterThan(0); expect(s.players[0].cash).toBeGreaterThanOrEqual(0);
  });
  it("loseIncomeShare: oylik daromadning ulushi bir marta yo'qoladi", () => {
    const ctx = withRules({ small: { Q: { kind: "loseIncomeShare", share: 0.2 } } });
    const noRule = landSmall(base, cellAt("Q"), (g) => { g.players[0].cash = 50_000; }), s = landSmall(ctx, cellAt("Q"), (g) => { g.players[0].cash = 50_000; });
    expect(noRule.players[0].cash - s.players[0].cash).toBe(Math.round(0.2 * s.players[0].salary));
  });
  it("drawDeck: hod dekasidan majburiy karta tortiladi va qo'llanadi", () => {
    const ctx = withRules({ small: { K: { kind: "drawDeck", deck: "hod" } } });
    const s = landSmall(ctx, cellAt("K"), (g) => { g.players[0].cash = 1e9; });
    expect(s.decks.hod.discard).toHaveLength(1); expect(s.players[0].cash).toBeLessThanOrEqual(1e9); expect(s.pending).toBeNull();
  });
});

describe("sozlangan katak ta'sirlari (katta aylana)", () => {
  const onBig = (ctx: Ctx, cellIdx: number) => {
    for (let die = 1; die <= 6; die++) for (let seed = 1; seed < 400; seed++) {
      const s = newGame(ctx, ["p0", "p1"], 1); Object.assign(s.players[0], { circle: "big", pos: (cellIdx - die + 53) % 53, lockedFlow: 5000, cash: 100_000 });
      s.rngState = seed; const r = reduce(s, ctx, { type: "roll", playerId: "p0" });
      if (r.ok && r.die === die) return r.state;
    } throw new Error("urug'");
  };
  it("byIndex turdan ustun: Ajrashish (23) payFixed, Y turi payday", () => {
    const ctx = withRules({ big: { byType: { Y: { kind: "payday", times: 1 } }, byIndex: { "23": { kind: "payFixed", amount: 7000 } } } });
    expect(onBig(ctx, 23).players[0].cash).toBe(100_000 - 7000);
    expect(onBig(ctx, 15).players[0].cash).toBeGreaterThanOrEqual(100_000 + 5000 - 1); // Y katagi: payday (kamida kilitlangan oqim)
  });
  it("offerCellAsset: V katagida narx bo'lsa taklif; narxsiz bo'lsa ham xato yo'q", () => {
    const ctx = withRules({ big: { byType: { V: { kind: "offerCellAsset" } } } });
    const s = onBig(ctx, 21); expect(s.pending?.cardId).toBe("big-21");
    expect(() => onBig(ctx, 2)).not.toThrow(); // 2: narx 270000, income yo'q → taklif (income 0)
  });
  it("sozlanmagan X katagi eskicha: jurnalga yoziladi", () => {
    expect(onBig(base, 5).log.some((l) => l.includes("Bankrot"))).toBe(true);
  });
});
