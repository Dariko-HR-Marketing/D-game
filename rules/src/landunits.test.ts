// Yer «sotixiga» takliflari: narx sotix soniga ko'paytiriladi (buyurtmachi xabari 2026-11-27: 20 sotixli yer 800 ga sotilardi).
import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { newGame, reduce, marketPrice, type GameState } from "./index";

const ids = Object.keys(ctx.effects);
const landBuys = ids.filter((i) => { const e = ctx.effects[i].effect as any; return e.kind === "buy" && e.asset === "land" && e.code === "E"; });
const yeSales = ids.filter((i) => { const e = ctx.effects[i].effect as any; return e.kind === "marketSale" && e.targets.includes("Ye") && typeof e.amount === "number"; });
const mk = (): GameState => { const s = newGame(ctx, ["p0", "p1", "p2"], 7); s.players.forEach((p, i) => (s.players[i] = { ...p, dreamIdx: i, cash: 100_000_000 })); s.decks.kichik.draw = []; return s; };
const land = (units?: number, o: any = {}) => ({ kind: "land", code: "E", price: 10_000, monthlyIncome: 0, creditPayment: 0, credit: 0, ...(units ? { units } : {}), ...o });

describe("yer: sotix soni kartadan aktivga o'tadi", () => {
  it("9 ta yer kartasining hammasida «N sotix» bor va effektga yoziladi", () => {
    expect(landBuys).toHaveLength(9);
    for (const id of landBuys) { const e = ctx.effects[id].effect as any; expect(e.units, id).toBeGreaterThan(0); }
  });
  it("sotib olinganda aktivda `units` bo'ladi (20 sotixli E_001 kartasi)", () => {
    const id = landBuys.find((i) => (ctx.effects[i].effect as any).units === 20)!;
    const s = mk(); s.pending = { type: "card", playerId: "p0", cardId: id, deck: ctx.effects[id].deck as any };
    const r: any = reduce(s, ctx, { type: "decide", playerId: "p0", accept: true } as any); expect(r.ok).toBe(true);
    expect(r.state.players[0].assets.find((a: any) => a.code === "E").units).toBe(20);
  });
});

describe("«Yer (sotixiga)» bozor taklifi", () => {
  it("narx = har sotix narxi × sotix soni; sotix yo'q aktiv — qat'iy narx (eski o'yin)", () => {
    expect(marketPrice(800, land(20) as any)).toBe(16_000); expect(marketPrice(700, land(6) as any)).toBe(4_200); expect(marketPrice(800, land() as any)).toBe(800);
  });
  it("aksiya (dona) va kvartira narxi o'zgarmaydi", () => {
    expect(marketPrice(10, { kind: "shares", code: "X", shares: 50, price: 1, monthlyIncome: 0, creditPayment: 0, credit: 0 } as any)).toBe(500);
    expect(marketPrice(25_000, { kind: "apartment", code: "KV1", price: 1, monthlyIncome: 0, creditPayment: 0, credit: 0 } as any)).toBe(25_000);
  });
  it.each(yeSales)("%s: o'yinchi yerini sotganda naqd sotixga ko'paytirilgan summaga oshadi", (id) => {
    const per = (ctx.effects[id].effect as any).amount as number;
    const s = mk(); s.players[0].assets = [land(20) as any]; s.proposals.push({ id: 1, kind: "market", cardId: id, sold: [] });
    const r: any = reduce(s, ctx, { type: "market_sell", playerId: "p0", proposalId: 1 }); expect(r.ok).toBe(true);
    expect(r.state.players[0].cash - 100_000_000).toBe(per * 20); expect(r.state.players[0].assets).toHaveLength(0);
  });
  it("inqirozda narx yarmi (hisoblangan summadan)", () => {
    const id = yeSales[0], per = (ctx.effects[id].effect as any).amount as number;
    const s = mk(); s.players[0] = { ...s.players[0], crisisMonths: 6, assets: [land(20) as any] }; s.proposals.push({ id: 1, kind: "market", cardId: id, sold: [] });
    const r: any = reduce(s, ctx, { type: "market_sell", playerId: "p0", proposalId: 1 }); expect(r.ok).toBe(true);
    expect(r.state.players[0].cash - 100_000_000).toBe(Math.round(per * 20 * 0.5));
  });
});
