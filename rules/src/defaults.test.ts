import { describe, it, expect } from "vitest";
import { loadContent } from "@poyga/content";
import { ctx as base } from "./testctx";
import { Ctx, GameState, newGame, reduce, SMALL_BOARD, currentPlayer, effectOf, crisisMonths } from "./index";

// Standart katak qoidalari (content/data/cell_rules.json) bilan ishlaydigan haqiqiy ctx
const ctx: Ctx = { ...base, cellRules: loadContent().cellRules };
const mk = (n = 3) => newGame(ctx, Array.from({ length: n }, (_, i) => `p${i}`), 1);
function landBig(cellIdx: number, prep: (s: GameState) => void, n = 3, deckHead?: [keyof Ctx["deckIds"], string]) {
  for (let die = 1; die <= 6; die++) for (let seed = 1; seed < 300; seed++) {
    const s = mk(n); Object.assign(s.players[0], { circle: "big", pos: (cellIdx - die + 53) % 53, lockedFlow: 5000, cash: 5_000_000 }); prep(s);
    if (deckHead) { const d = s.decks[deckHead[0]]; d.draw = [deckHead[1], ...d.draw.filter((x) => x !== deckHead[1])]; }
    s.rngState = seed; const r = reduce(s, ctx, { type: "roll", playerId: "p0" }); if (r.ok && r.die === die) return r.state;
  } throw new Error("urug'");
}
const biz = (code: string, income: number) => ({ kind: "small_business", code, price: 1000, monthlyIncome: income, creditPayment: 0, credit: 0 });

describe("jahon inqirozi (§5.7): 36 oy, sotish va sotib olish narxi 2 baravar past, tugaganda xabar", () => {
  const D = SMALL_BOARD.indexOf("D");
  it("davomiylik 9 aylana × 4 oy = 36", () => { expect(crisisMonths()).toBe(36); });
  it("sotish narxi yarmi, sotib olish narxi yarmi (daromad o'zgarmaydi)", () => {
    const s = mk(); s.players[0].crisisMonths = 10; s.players[0].cash = 100_000;
    s.players[0].assets = [{ kind: "apartment", code: "KV1", price: 30_000, monthlyIncome: 0, creditPayment: 0, credit: 0, marketValue: 60_000 }];
    s.proposals.push({ id: 1, kind: "market", cardId: Object.keys(ctx.effects).find((i) => { const e = ctx.effects[i].effect as any; return e.kind === "marketSale" && e.targets[0] === "KV1" && typeof e.amount === "number"; })!, sold: [] });
    const amt = (ctx.effects[(s.proposals[0] as any).cardId].effect as any).amount as number;
    const r: any = reduce(s, ctx, { type: "market_sell", playerId: "p0", proposalId: 1 }); expect(r.state.players[0].cash).toBe(100_000 + amt / 2);
    // sotib olish: ko'chmas mulk kartasi
    const id = Object.keys(ctx.effects).find((i) => { const e = ctx.effects[i].effect as any; return e.kind === "buy" && e.asset === "land" && e.price > 0 && !e.credit; })!; const e = ctx.effects[id].effect as any;
    const t = mk(); t.players[0].crisisMonths = 10; t.players[0].cash = 1e7; t.pending = { type: "card", playerId: "p0", cardId: id, deck: "kichik" };
    const q: any = reduce(t, ctx, { type: "decide", playerId: "p0", accept: true }); expect(1e7 - q.state.players[0].cash).toBe((e.down ?? e.price) / 2);
  });
  it("inqirozsiz o'yinchida narxlar odatdagi", () => {
    const t = mk(); t.players[0].cash = 1e7; const id = Object.keys(ctx.effects).find((i) => { const e = ctx.effects[i].effect as any; return e.kind === "buy" && e.asset === "land" && !e.credit; })!; const e = ctx.effects[id].effect as any;
    t.pending = { type: "card", playerId: "p0", cardId: id, deck: "kichik" }; const q: any = reduce(t, ctx, { type: "decide", playerId: "p0", accept: true });
    expect(1e7 - q.state.players[0].cash).toBe(e.down ?? e.price);
  });
  it("D katagidan o'tganda inqiroz oyi kamayadi; 0 bo'lganda 'crisis_end' xabari yuboriladi", () => {
    for (let die = 1; die <= 6; die++) for (let seed = 1; seed < 300; seed++) {
      const s = mk(); s.players[0].pos = (D - die + 48) % 48; s.players[0].crisisMonths = 1; s.rngState = seed;
      const r = reduce(s, ctx, { type: "roll", playerId: "p0" }); if (r.ok && r.die === die) {
        expect(r.state.players[0].crisisMonths).toBe(0); expect(r.state.notices.some((n) => n.key === "crisis_end" && n.to === "p0")).toBe(true); return;
      }
    } throw new Error("topilmadi");
  });
});

describe("standart qoidalar bilan o'yinlar ishlaydi (tutun testi)", () => {
  it("50 o'yin, tasodifiy qarorlar: istisno yo'q, qiymatlar chekli", () => {
    for (let seed = 1; seed <= 50; seed++) {
      let s = newGame(ctx, ["a", "b", "c", "d"].slice(0, 2 + (seed % 3)), seed); s.players.forEach((p, i) => { p.dreamIdx = i; });
      for (let t = 0; t < 300 && !s.winner; t++) {
        const me = currentPlayer(s).id; let r: any = reduce(s, ctx, { type: "roll", playerId: me }); if (!r.ok) throw new Error(r.error); s = r.state;
        while (s.pending) { const e = effectOf(ctx, s.pending.cardId).effect; r = reduce(s, ctx, { type: "decide", playerId: me, accept: (t + seed) % 2 === 0 && e.kind !== "lendRequest", useBank: true }); if (!r.ok) throw new Error(r.error); s = r.state; }
      }
      for (const p of s.players) expect(Number.isFinite(p.cash), `seed ${seed}`).toBe(true);
    }
  });
});
