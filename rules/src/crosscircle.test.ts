// Kichik va katta aylana o'rtasida (qaror 2026-11-09, buyurtmachi): qarz — kichik aylana katta aylanadan ham so'ray oladi, katta aylana qarz ola olmaydi;
// sheriklik — faqat kichik aylana taklif qiladi (sherik katta aylanadan bo'lishi mumkin); suyunchi — faqat kichik aylanada.
import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { newGame, reduce, type GameState } from "./index";

const mk = (n: number) => newGame(ctx, Array.from({ length: n }, (_, i) => `p${i}`), 1, []);
const run = (s: GameState, a: any) => reduce(s, ctx, a);
const must = (r: any) => { if (!r.ok) throw new Error(r.error); return r.state as GameState; };
const P = (s: GameState, id: string) => s.players.find((p) => p.id === id)!;

describe("aylanalar o'rtasida: qarz", () => {
  const prep = () => { const s = mk(5); for (const p of s.players) { p.circle = "small"; p.cash = 100_000; p.salary = 5_000; } P(s, "p0").cash = 1_000; P(s, "p1").circle = "big"; P(s, "p1").cash = 500_000; return s; };
  it("kichik aylana katta aylanadan qarz so'ray oladi; beruvchi qabul qiladi, pul ko'chadi", () => {
    let s = prep();
    s = must(run(s, { type: "loan_request", playerId: "p0", giverId: "p1", amount: 500, months: 12 }));
    s = must(run(s, { type: "loan_accept", playerId: "p1", proposalId: s.proposals[0].id }));
    expect(P(s, "p0").cash).toBe(1_500); expect(P(s, "p1").cash).toBe(499_500); expect(P(s, "p0").handDebts[0].to).toBe("p1");
  });
  it("katta aylana o'yinchisi qarz ola olmaydi (na kichikdan, na kattadan)", () => {
    const s = prep(); P(s, "p2").circle = "big";
    expect(run(s, { type: "loan_request", playerId: "p1", giverId: "p0", amount: 500, months: 12 })).toEqual({ ok: false, error: "big_cannot_borrow" });
    expect(run(s, { type: "loan_request", playerId: "p1", giverId: "p2", amount: 500, months: 12 })).toEqual({ ok: false, error: "big_cannot_borrow" });
  });
  it("taklifdan keyin oluvchi katta aylanaga chiqib ketsa, qabul rad etiladi", () => {
    let s = prep(); s = must(run(s, { type: "loan_request", playerId: "p0", giverId: "p1", amount: 500, months: 12 }));
    P(s, "p0").circle = "big";
    expect(run(s, { type: "loan_accept", playerId: "p1", proposalId: s.proposals[0].id })).toEqual({ ok: false, error: "big_cannot_borrow" });
  });
  it("kichik ↔ kichik avvalgidek ishlaydi; 16 yoshgacha va botlar uchun yopiq", () => {
    let s = prep(); s = must(run(s, { type: "loan_request", playerId: "p0", giverId: "p2", amount: 500, months: 12 })); expect(s.proposals).toHaveLength(1);
    const r = prep(); r.restricted = ["p1"]; expect(run(r, { type: "loan_request", playerId: "p0", giverId: "p1", amount: 500, months: 12 })).toEqual({ ok: false, error: "restricted_age" });
  });
});

describe("aylanalar o'rtasida: sheriklik", () => {
  const setup = (ownerCircle: "small" | "big", partnerCircle: "small" | "big") => {
    const s = mk(2); const owner = P(s, "p0"), partner = P(s, "p1"); owner.circle = ownerCircle; partner.circle = partnerCircle;
    const id = ctx.deckIds.katta.find((i) => { const e = ctx.effects[i].effect; return e.kind === "buy" && e.asset === "business"; })!;
    const e = ctx.effects[id].effect as any;
    s.pending = { type: "card", playerId: "p0", cardId: id, deck: "katta" };
    owner.cash = e.price / 2 + 10; owner.bankDebt = 10_000; partner.cash = e.price;
    return { s, e };
  };
  it("kichik aylana biznes uchun katta aylanadan sherik so'ray oladi: 50/50, sherik katta aylanada qoladi", () => {
    const { s, e } = setup("small", "big");
    let t = must(run(s, { type: "partner_offer", playerId: "p0", partnerId: "p1" }));
    t = must(run(t, { type: "partner_accept", playerId: "p1", proposalId: t.proposals[0].id }));
    expect(P(t, "p1").circle).toBe("big"); expect(P(t, "p1").cash).toBe(e.price / 2); expect(P(t, "p1").assets.some((a) => a.kind === "partner_stake")).toBe(true);
    expect(P(t, "p0").assets[0].monthlyIncome).toBe(e.monthlyIncome / 2);
  });
  it("katta aylana o'yinchisi sheriklik taklif qila olmaydi", () => {
    const { s } = setup("big", "small");
    expect(run(s, { type: "partner_offer", playerId: "p0", partnerId: "p1" })).toEqual({ ok: false, error: "big_cannot_offer_partner" });
  });
  it("kichik ↔ kichik avvalgidek", () => {
    const { s } = setup("small", "small"); expect(must(run(s, { type: "partner_offer", playerId: "p0", partnerId: "p1" })).proposals).toHaveLength(1);
  });
});

describe("aylanalar o'rtasida: suyunchi", () => {
  const withBaby = () => { const s = mk(3); s.proposals.push({ id: 1, kind: "suyunchi", parent: "p0", given: [] }); s.nextProposal = 2; return s; };
  it("suyunchi faqat kichik aylana o'yinchilari o'rtasida: katta aylana na bera oladi, na ota-ona bo'lib ola oladi", () => {
    const g = withBaby(); P(g, "p1").circle = "big";
    expect(run(g, { type: "suyunchi", playerId: "p1", proposalId: 1, amount: 10 })).toEqual({ ok: false, error: "small_circle_only" });
    const r = withBaby(); P(r, "p0").circle = "big";
    expect(run(r, { type: "suyunchi", playerId: "p1", proposalId: 1, amount: 10 })).toEqual({ ok: false, error: "small_circle_only" });
  });
});
