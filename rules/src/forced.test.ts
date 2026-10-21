import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { newGame, forceCard, chooseDream, type GameState } from "./index";

const mk = () => { let s: GameState = newGame(ctx, ["a", "b", "c"], 3, [], [], { dreamPhase: false }); s.players.forEach((p, i) => (s = chooseDream(s, p.id, i))); return s; };
const idOf = (f: (e: any) => boolean) => Object.entries(ctx.effects).find(([, ce]) => f(ce.effect))![0];

describe("majburiy bozor kartalari (qo'llanma §07)", () => {
  it("«aksiyalar kuyib ketadi»: mos aksiyasi borlar avtomatik sotadi, boshqalarga ta'sir yo'q", () => {
    const id = idOf((e) => e.kind === "marketSale" && e.forced && e.targets[0] === "TAPOiCh"); const e: any = ctx.effects[id].effect;
    const s = mk(); s.players[1].assets = [{ kind: "shares", code: "TAPOiCh", price: 100, monthlyIncome: 0, creditPayment: 0, credit: 0, shares: 10 }];
    const c0 = s.players[0].cash, c1 = s.players[1].cash;
    forceCard(s, ctx, s.players[0], id);
    expect(s.players[1].assets).toHaveLength(0); expect(s.players[1].cash).toBe(c1 + 10 * e.amount); // 10 ta aksiya × karta narxi
    expect(s.players[0].cash).toBe(c0); expect(s.proposals).toHaveLength(0); // taklif emas — sotuv avtomatik
  });
  it("eski uy kompensatsiyasi (KV1s/KV2s) majburiy; ixtiyoriy bozor takliflari esa avvalgidek taklif bo'lib qoladi", () => {
    const forcedId = idOf((e) => e.kind === "marketSale" && e.forced && e.targets.includes("KV1s")), optId = idOf((e) => e.kind === "marketSale" && !e.forced);
    const s = mk(); s.players[2].assets = [{ kind: "apartment", code: "KV1s", price: 10_000, monthlyIncome: 0, creditPayment: 0, credit: 0 }];
    const c2 = s.players[2].cash; forceCard(s, ctx, s.players[0], forcedId);
    expect(s.players[2].assets).toHaveLength(0); expect(s.players[2].cash).toBeGreaterThan(c2);
    forceCard(s, ctx, s.players[0], optId); expect(s.proposals.length).toBe(1);
  });
  it("QAR №87 majburiy to'lov, №90 — qarov egalari uchun meros kvartira sotuvi (+25 000)", () => {
    const pay = idOf((e) => e.kind === "qarEvent" && e.payNow === 200), gain = idOf((e) => e.kind === "qarEvent" && e.gainNow === 25_000);
    const s = mk(); s.players[0].qar = true; s.players[1].qar = true; const c = s.players.map((p) => p.cash);
    forceCard(s, ctx, s.players[0], pay); expect(s.players[0].cash).toBe(c[0] - 200); expect(s.players[2].cash).toBe(c[2]);
    forceCard(s, ctx, s.players[0], gain); expect(s.players[0].cash).toBe(c[0] - 200 + 25_000); expect(s.players[1].cash).toBe(c[1] + 25_000); expect(s.players[2].cash).toBe(c[2]);
  });
});
