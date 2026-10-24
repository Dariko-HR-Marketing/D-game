// Bankrot (yangi kasb bilan boshidan): o'yin to'xtaydi, o'yinchiga tahlil ko'rsatiladi, tasdiqlagach davom etadi (OPEN_QUESTIONS 158).
import { describe, it, expect } from "vitest";
import { ctx as base } from "./testctx";
import { Ctx, GameState, newGame, reduce, SMALL_BOARD, currentPlayer, RULES } from "./index";
import { CellRules } from "@poyga/content/cellrules";

const withRules = (r: unknown): Ctx => ({ ...base, cellRules: CellRules.parse(r) });
const K = SMALL_BOARD.indexOf("K");

function bankrupt(ctx: Ctx, opts: { recapPause?: boolean }, prep?: (s: GameState) => void) {
  for (let die = 1; die <= 6; die++) for (let seed = 1; seed < 400; seed++) {
    const s = newGame(ctx, ["p0", "p1"], 1, [], [], { events: false, ...opts }); prep?.(s);
    s.players[0].pos = (K - die + 48) % 48; s.rngState = seed;
    const r = reduce(s, ctx, { type: "roll", playerId: "p0" });
    if (r.ok && r.die === die) return r.state;
  }
  throw new Error("urug' topilmadi");
}
const kb = Object.values(base.effects).find((e: any) => e.effect.kind === "buy" && e.effect.asset === "small_business" && e.effect.code === "KB") as any;
const asset = { kind: "small_business", code: "KB", cardId: kb.id, price: 1500, monthlyIncome: 200, creditPayment: 0, credit: 0 };

describe("bankrot tanaffusi (recapPause)", () => {
  const cellCtx = withRules({ small: { K: { kind: "restart" } } });
  it("yoqilgan bo'lsa: tahlil yoziladi — sabab, avvalgi holat, yo'qotilgan aktivlar, yangi kasb, oxirgi voqealar", () => {
    const s = bankrupt(cellCtx, { recapPause: true }, (g) => { g.players[0].assets = [asset as any]; g.players[0].cash = 777; });
    expect(s.recaps).toHaveLength(1); const r = s.recaps![0];
    expect(r).toMatchObject({ playerId: "p0", cause: { kind: "cell" } }); expect(r.before.cash).toBe(777);
    expect(r.before.assets).toHaveLength(1); expect(r.before.assets[0]).toMatchObject({ code: "KB", cardId: kb.id, income: 200 }); expect(r.before.assets[0].name).toBeTruthy();
    expect(typeof r.newKasb).toBe("string"); expect(r.newKasb.length).toBeGreaterThan(0); expect(r.before.kasb.length).toBeGreaterThan(0); expect(Array.isArray(r.recent)).toBe(true);
    expect(s.players[0].restarts).toBe(1); expect(s.players[0].assets).toHaveLength(0); // qoida o'zgarmagan: hamma aktiv yo'qoladi (§5.3)
  });
  it("tasdiqlanguncha hech kim yura olmaydi; faqat egasi tasdiqlaydi; keyin o'yin davom etadi", () => {
    const s = bankrupt(cellCtx, { recapPause: true }); const id = s.recaps![0].id; const cur = currentPlayer(s).id;
    expect(reduce(s, cellCtx, { type: "roll", playerId: cur })).toMatchObject({ ok: false, error: "recap_open" });
    expect(reduce(s, cellCtx, { type: "decide", playerId: cur, accept: false })).toMatchObject({ ok: false, error: "recap_open" });
    expect(reduce(s, cellCtx, { type: "ack_restart", playerId: "p1", id })).toMatchObject({ ok: false, error: "not_yours" });
    expect(reduce(s, cellCtx, { type: "ack_restart", playerId: "p0", id: id + 5 })).toMatchObject({ ok: false, error: "no_recap" });
    const a: any = reduce(s, cellCtx, { type: "ack_restart", playerId: "p0", id }); expect(a.ok).toBe(true); expect(a.state.recaps).toHaveLength(0);
    expect(reduce(a.state, cellCtx, { type: "roll", playerId: currentPlayer(a.state).id }).ok).toBe(true);
  });
  it("majburiy to'lov qarz chegarasidan oshsa: sabab «to'lov» va summa yoziladi", () => {
    const ctx = withRules({ small: { K: { kind: "loseIncomeShare", share: 1 } } });
    const s = bankrupt(ctx, { recapPause: true }, (g) => { Object.assign(g.players[0], { cash: 0, owe: RULES.bankLimit - 1 }); });
    expect(s.recaps).toHaveLength(1); expect(s.recaps![0].cause.kind).toBe("pay"); expect(s.recaps![0].cause.amount).toBeGreaterThan(1); expect(s.recaps![0].before.owe).toBe(RULES.bankLimit - 1);
  });
  it("o'chiq bo'lsa (eski o'yinlar va jurnaldan qayta o'ynash): avvalgidek to'xtamaydi", () => {
    const s = bankrupt(cellCtx, {}); expect(s.recaps ?? []).toHaveLength(0); expect(s.recapPause).toBeFalsy(); expect(s.players[0].restarts).toBe(1);
    expect(reduce(s, cellCtx, { type: "roll", playerId: currentPlayer(s).id }).ok).toBe(true);
  });
  it("server harakatlari (vaqt tugashi, taklif muddati) tanaffus paytida ham o'tadi", () => {
    const s = bankrupt(cellCtx, { recapPause: true }); expect(reduce(s, cellCtx, { type: "expire", playerId: "server", proposalId: 1 }).ok).toBe(true);
  });
});
