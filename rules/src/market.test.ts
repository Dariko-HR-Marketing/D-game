import { describe, it, expect } from "vitest";
import { ctx, cards } from "./testctx";
import { newGame, reduce, GameState, marketPrice, assetMatches, Asset, applyEffect, newPlayer } from "./index";

const asset = (o: Partial<Asset>): Asset => ({ kind: "apartment", code: "KV1", price: 1, monthlyIncome: 0, creditPayment: 0, credit: 0, ...o });
const sale = (id: string) => (ctx.effects[id].effect as any);
const bozorId = (pred: (e: any) => boolean) => ctx.deckIds.bozor.find((i) => ctx.effects[i].effect.kind === "marketSale" && pred(ctx.effects[i].effect))!;

describe("bozor narxi", () => {
  it("oddiy narx va kod nomlari mosligi", () => {
    expect(marketPrice(20000, asset({}))).toBe(20000);
    expect(assetMatches(["KV1"], asset({ code: "KV1" }))).toBe(true); expect(assetMatches(["KV1"], asset({ code: "KV2" }))).toBe(false);
    expect(assetMatches(["MB"], asset({ kind: "small_business", code: "KB" }))).toBe(true); // bozor MB = kichik biznes
    expect(assetMatches(["Ye"], asset({ kind: "land", code: "E" }))).toBe(true);
    expect(assetMatches(["KCh"], asset({ kind: "shares", code: "KCH" }))).toBe(true);
    expect(assetMatches(["KV*"], asset({ code: "KV3o" }))).toBe(true); expect(assetMatches(["KV*"], asset({ kind: "car", code: "AV" }))).toBe(false);
  });
  it("aksiya: har bir aksiyaga narx × soni", () => expect(marketPrice(20, asset({ kind: "shares", code: "TAPOiCh", shares: 50 }))).toBe(1000));
  it("buziladigan uylar: 1 xonali / 2 xonali alohida narx", () => {
    const m = { KV1s: 50000, KV2s: 70000 };
    expect(marketPrice(m as any, asset({ code: "KV1s" }))).toBe(50000); expect(marketPrice(m as any, asset({ code: "KV2s" }))).toBe(70000); expect(marketPrice(m as any, asset({ code: "KV3" }))).toBeNull();
  });
  it("narx o'sishi haqiqiy qiymatdan: +50 %, ×2, +10 000…; qiymat noma'lum bo'lsa — sotib bo'lmaydi", () => {
    expect(marketPrice({ percent: 50 }, asset({ marketValue: 60000 }))).toBe(90000);
    expect(marketPrice({ multiply: 2 }, asset({ marketValue: 60000 }))).toBe(120000);
    expect(marketPrice({ addByType: { KV1: 10000, KV2: 20000 } }, asset({ code: "KV2", marketValue: 65000 }))).toBe(85000);
    expect(marketPrice({ multiply: 2 }, asset({ marketValue: null }))).toBeNull();
  });
});

describe("bozor taklifi: hamma mos aktivli o'yinchiga", () => {
  const withSale = () => {
    const id = bozorId((e) => e.targets.length === 1 && e.targets[0] === "KV1" && typeof e.amount === "number");
    const s = newGame(ctx, ["a", "b", "c"], 1); const p = (n: string) => s.players.find((x) => x.id === n)!;
    p("b").assets = [asset({ code: "KV1", credit: 5000, price: 30000 })]; p("c").assets = [asset({ code: "KV2" })];
    s.proposals.push({ id: 1, kind: "market", cardId: id, sold: [] });
    return { s, id, amount: sale(id).amount as number, p };
  };
  it("navbatda bo'lmagan egasi sotadi; kredit yopiladi; bir marta", () => {
    const { s, amount } = withSale(); const c0 = s.players[1].cash;
    const r = reduce(s, ctx, { type: "market_sell", playerId: "b", proposalId: 1 }); if (!r.ok) throw new Error(r.error);
    const b = r.state.players[1]; expect(b.cash).toBe(c0 + amount - 5000); expect(b.assets).toHaveLength(0);
    expect(reduce(r.state, ctx, { type: "market_sell", playerId: "b", proposalId: 1 })).toEqual({ ok: false, error: "already_sold" });
  });
  it("mos aktivi yo'q o'yinchi sota olmaydi; ulushli aktiv sotilmaydi", () => {
    const { s } = withSale();
    expect(reduce(s, ctx, { type: "market_sell", playerId: "c", proposalId: 1 })).toEqual({ ok: false, error: "nothing_to_sell" });
    s.players[1].assets[0].partnerId = "c";
    expect(reduce(s, ctx, { type: "market_sell", playerId: "b", proposalId: 1 }).ok).toBe(false);
  });
  it("taklif muddati tugagach (expire) sotib bo'lmaydi", () => {
    const { s } = withSale(); const e = reduce(s, ctx, { type: "expire", playerId: "server", proposalId: 1 }); if (!e.ok) throw 0;
    expect(reduce(e.state, ctx, { type: "market_sell", playerId: "b", proposalId: 1 })).toEqual({ ok: false, error: "no_proposal" });
  });
  it("kartada 'real' qiymat saqlanadi (sotib olganda)", () => {
    const id = ctx.deckIds.katta.find((i) => { const e = ctx.effects[i].effect as any; return e.kind === "buy" && typeof e.marketValue === "number"; })!;
    const e = ctx.effects[id].effect as any; const p = newPlayer("x", cards.kasb[0]); p.cash = 1e9;
    const r = applyEffect(p, e); expect(r.ok && r.player.assets[0].marketValue).toBe(e.marketValue);
  });
});
