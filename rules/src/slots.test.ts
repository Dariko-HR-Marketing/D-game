import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { newGame, reduce, GameState, GamePlayer, currentPlayer, SLOT_LIMITS, slotFull, effectOf } from "./index";

const run = (s: GameState, a: any) => reduce(s, ctx, a);
const must = (r: any) => { if (!r.ok) throw new Error(r.error); return r.state as GameState; };
const start = () => { const s = newGame(ctx, ["p0", "p1"], 1, []); s.turn = 0; return s; };
const cur = (s: GameState) => currentPlayer(s) as GamePlayer;
const asset = (kind: string, n: number, over: object = {}) => ({ kind, code: `${kind}-${n}`, price: 10_000, monthlyIncome: 100, creditPayment: 0, credit: 0, ...over });
const fill = (p: GamePlayer, kind: string, count: number) => { for (let i = 0; i < count; i++) p.assets.push(asset(kind, i) as any); };
const buyCard = (asset: string) => Object.values(ctx.effects).find((c) => c.effect.kind === "buy" && c.effect.asset === asset && c.mode === "optional")!;
const offer = (s: GameState, id: string) => { s.pending = { type: "card", playerId: cur(s).id, cardId: id, deck: ctx.effects[id].deck as any }; };

describe("hisob varag'idagi joylar (5 / 6 / 7)", () => {
  it("chegaralar hisob listidagidek", () => expect(SLOT_LIMITS).toEqual({ realty: 5, small_business: 6, business: 7 }));

  it("ko'chmas mulk turlari birgalikda 5 ta; aksiya, mashina va sheriklik ulushi hisobga kirmaydi", () => {
    const p = cur(start()); p.assets = [asset("land", 1), asset("dacha", 2), asset("apartment", 3), asset("land", 4)] as any;
    expect(slotFull(p, "apartment")).toBe(false);
    p.assets.push(asset("dacha", 5) as any);
    expect(slotFull(p, "land")).toBe(true); expect(slotFull(p, "apartment")).toBe(true);
    expect(slotFull(p, "small_business")).toBe(false); expect(slotFull(p, "shares")).toBe(false); expect(slotFull(p, "car")).toBe(false);
    const q = cur(start()); fill(q, "partner_stake", 9); fill(q, "shares", 9); expect(slotFull(q, "small_business")).toBe(false);
  });

  it.each([["small_business", 6], ["business", 7], ["apartment", 5], ["land", 5], ["dacha", 5]])("%s: %i ta bo'lganda yangisini olib bo'lmaydi, o'tkazib yuborsa bo'ladi", (kind, max) => {
    const card = buyCard(kind);
    expect(card).toBeDefined();
    const s = start(); const p = cur(s); p.cash = 10_000_000; fill(p, kind, max - 1);
    offer(s, card.id);
    const ok1 = must(run(s, { type: "decide", playerId: p.id, accept: true }));
    expect(ok1.players.find((x) => x.id === p.id)!.assets.filter((a) => a.kind === kind)).toHaveLength(max);
    const t = start(); const q = cur(t); q.cash = 10_000_000; fill(q, kind, max);
    offer(t, card.id);
    expect(run(t, { type: "decide", playerId: q.id, accept: true })).toEqual({ ok: false, error: "slot_full" });
    expect(t.pending).not.toBeNull(); // rad etilgan amal holatni o'zgartirmaydi
    const skipped = must(run(t, { type: "decide", playerId: q.id, accept: false }));
    expect(skipped.players.find((x) => x.id === q.id)!.assets).toHaveLength(max);
  });

  it("joy bo'shatilgach (sotilgach) yangi xarid yana mumkin", () => {
    const card = buyCard("small_business");
    const s = start(); const p = cur(s); p.cash = 10_000_000; fill(p, "small_business", 6); offer(s, card.id);
    expect(run(s, { type: "decide", playerId: p.id, accept: true })).toEqual({ ok: false, error: "slot_full" });
    const s2 = must(run(s, { type: "sell_asset", playerId: p.id, assetIdx: 0 })); // karta ochiq turganda ham sotish mumkin
    expect(s2.pending).not.toBeNull();
    const s3 = must(run(s2, { type: "decide", playerId: p.id, accept: true }));
    expect(s3.players.find((x) => x.id === p.id)!.assets.filter((a) => a.kind === "small_business")).toHaveLength(6);
  });

  it("sheriklikda egasining joyi to'lgan bo'lsa, taklif ham, qabul ham rad etiladi", () => {
    const card = buyCard("small_business");
    const s = start(); const p = cur(s); p.cash = 100; fill(p, "small_business", 6); offer(s, card.id);
    expect(run(s, { type: "partner_offer", playerId: p.id, partnerId: s.players.find((x) => x.id !== p.id)!.id })).toEqual({ ok: false, error: "slot_full" });
  });
});

describe("ixtiyoriy sotish (sell_asset)", () => {
  const withAssets = () => {
    const s = start(); const p = cur(s);
    p.assets = [asset("apartment", 1, { price: 20_000, credit: 8_000, creditPayment: -400 }), asset("small_business", 2, { price: 5_000 }), asset("business", 3, { price: 100_000 }),
      asset("shares", 4, { price: 3_000, shares: 10 }), asset("car", 5), asset("land", 6, { pledged: "lombard" }), asset("small_business", 7, { partnerId: "p1" })] as any;
    return { s, p };
  };
  it("ko'chmas mulk, kichik va katta biznes: sotib olingan narx − kredit naqdga tushadi", () => {
    const { s, p } = withAssets(); const c0 = p.cash;
    let t = must(run(s, { type: "sell_asset", playerId: p.id, assetIdx: 0 }));
    expect(cur(t).cash).toBe(c0 + 12_000); expect(cur(t).assets.some((a) => a.code === "apartment-1")).toBe(false);
    t = must(run(t, { type: "sell_asset", playerId: p.id, assetIdx: 0 })); // endi kichik biznes 0-o'rinda
    expect(cur(t).cash).toBe(c0 + 17_000);
    t = must(run(t, { type: "sell_asset", playerId: p.id, assetIdx: 0 }));
    expect(cur(t).cash).toBe(c0 + 117_000);
  });
  it("aksiya, mashina, garovdagi va sheriklikdagi aktivni sotib bo'lmaydi", () => {
    const { s, p } = withAssets();
    expect(run(s, { type: "sell_asset", playerId: p.id, assetIdx: 3 })).toEqual({ ok: false, error: "not_sellable" });
    expect(run(s, { type: "sell_asset", playerId: p.id, assetIdx: 4 })).toEqual({ ok: false, error: "not_sellable" });
    expect(run(s, { type: "sell_asset", playerId: p.id, assetIdx: 5 })).toEqual({ ok: false, error: "pledged" });
    expect(run(s, { type: "sell_asset", playerId: p.id, assetIdx: 6 })).toEqual({ ok: false, error: "in_partnership" });
    expect(run(s, { type: "sell_asset", playerId: p.id, assetIdx: 99 })).toEqual({ ok: false, error: "no_asset" });
  });
  it("faqat o'z navbatida", () => {
    const { s } = withAssets(); const other = s.players.find((x) => x.id !== cur(s).id)!;
    other.assets = [asset("land", 1) as any];
    expect(run(s, { type: "sell_asset", playerId: other.id, assetIdx: 0 })).toEqual({ ok: false, error: "not_your_turn" });
  });
  it("inqirozda ko'chmas mulk yarim narxda; kredit sotuvdan katta bo'lsa va naqd yetmasa rad etiladi", () => {
    const { s, p } = withAssets(); p.crisisMonths = 12; const c0 = p.cash;
    expect(cur(must(run(s, { type: "sell_asset", playerId: p.id, assetIdx: 0 }))).cash).toBe(c0 + 10_000 - 8_000);
    p.cash = 0; p.assets[0].credit = 15_000;
    expect(run(s, { type: "sell_asset", playerId: p.id, assetIdx: 0 })).toEqual({ ok: false, error: "insufficient_cash" });
  });
  it("kartadagi effekt turlari ro'yxatida buy mavjud (sanity)", () => { expect(effectOf(ctx, buyCard("apartment").id).effect.kind).toBe("buy"); });
});
