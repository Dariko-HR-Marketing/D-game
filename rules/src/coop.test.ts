import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { newGame, reduce, GameState, GamePlayer, openPartnerships } from "./index";

const mk = (n = 5, bots: string[] = []) => {
  const ids = Array.from({ length: n }, (_, i) => `p${i}`);
  return newGame(ctx, ids, 1, bots);
};
const run = (s: GameState, a: any) => reduce(s, ctx, a);
const must = (r: any) => { if (!r.ok) throw new Error(r.error); return r.state as GameState; };
const P = (s: GameState, id: string) => s.players.find((p) => p.id === id)!;

describe("suyunchi", () => {
  const withBaby = () => { const s = mk(3); s.proposals.push({ id: 1, kind: "suyunchi", parent: "p0", given: [] }); s.nextProposal = 2; return s; };
  it("10–500, qadam 10; navbatga bog'liq emas; bir marta", () => {
    let s = withBaby(); const before = P(s, "p0").cash;
    s = must(run(s, { type: "suyunchi", playerId: "p2", proposalId: 1, amount: 100 }));
    expect(P(s, "p0").cash).toBe(before + 100);
    expect(run(s, { type: "suyunchi", playerId: "p2", proposalId: 1, amount: 100 })).toEqual({ ok: false, error: "already_given" });
    expect(run(withBaby(), { type: "suyunchi", playerId: "p1", proposalId: 1, amount: 15 })).toEqual({ ok: false, error: "invalid_amount" });
    expect(run(withBaby(), { type: "suyunchi", playerId: "p0", proposalId: 1, amount: 10 }).ok).toBe(false);
  });
  it("faqat kichik aylanada; botlar bermaydi", () => {
    const s = withBaby(); P(s, "p1").circle = "big";
    expect(run(s, { type: "suyunchi", playerId: "p1", proposalId: 1, amount: 10 })).toEqual({ ok: false, error: "small_circle_only" });
    const b = newGame(ctx, ["p0", "p1", "p2"], 1, ["p1"]); b.proposals.push({ id: 1, kind: "suyunchi", parent: "p0", given: [] });
    expect(run(b, { type: "suyunchi", playerId: "p1", proposalId: 1, amount: 10 })).toEqual({ ok: false, error: "bot" });
  });
});

describe("o'zaro qarz", () => {
  const prep = (s: GameState) => { P(s, "p0").cash = 1000; P(s, "p1").cash = 100_000; P(s, "p0").salary = 1000; return s; };
  it("so'rov → qabul → qarz blankda, naqd ko'chadi", () => {
    let s = prep(mk(5));
    s = must(run(s, { type: "loan_request", playerId: "p0", giverId: "p1", amount: 500, months: 12 }));
    const id = s.proposals[0].id;
    expect(run(s, { type: "loan_accept", playerId: "p2", proposalId: id })).toEqual({ ok: false, error: "not_giver" });
    s = must(run(s, { type: "loan_accept", playerId: "p1", proposalId: id }));
    expect(P(s, "p0").cash).toBe(1500); expect(P(s, "p1").cash).toBe(99_500);
    expect(P(s, "p0").handDebts).toHaveLength(1);
    s = must(run(s, { type: "loan_repay", playerId: "p0", debtId: id, amount: 200 }));
    expect(P(s, "p0").handDebts[0].amount).toBe(300); expect(P(s, "p1").cash).toBe(99_700);
    s = must(run(s, { type: "loan_repay", playerId: "p0", debtId: id, amount: 300 }));
    expect(P(s, "p0").handDebts).toHaveLength(0);
  });
  it("5 dan kam odam, beruvchi 20 %, botlar — rad", () => {
    expect(run(prep(mk(4)), { type: "loan_request", playerId: "p0", giverId: "p1", amount: 500, months: 12 })).toEqual({ ok: false, error: "5 dan kam o'yinchi" });
    const s = prep(mk(5)); P(s, "p1").cash = 1000;
    expect(run(s, { type: "loan_request", playerId: "p0", giverId: "p1", amount: 201, months: 12 }).ok).toBe(false);
    // 5 ta o'yinchi, lekin 1 bot → odamlar 4 ta
    expect(run(prep(mk(5, ["p4"])), { type: "loan_request", playerId: "p0", giverId: "p1", amount: 100, months: 12 }).ok).toBe(false);
    expect(run(prep(mk(6, ["p4"])), { type: "loan_request", playerId: "p0", giverId: "p4", amount: 100, months: 12 })).toEqual({ ok: false, error: "bot" });
  });
  it("qarz yopilmaguncha kichik aylanadan chiqib bo'lmaydi", () => {
    const s = prep(mk(5)); const p = P(s, "p0") as GamePlayer;
    Object.assign(p, { cash: 5_000_000, salary: 0, baseExpenses: 0, assets: [{ kind: "business", code: "X", price: 1, monthlyIncome: 30_000, creditPayment: 0, credit: 0 }], handDebts: [{ id: 9, to: "p1", amount: 10, months: 5 }] });
    for (let seed = 1; seed < 200; seed++) { const t = structuredClone(s); t.rngState = seed;
      const r = run(t, { type: "roll", playerId: "p0" }); if (r.ok && !r.state.pending) { expect(P(r.state, "p0").circle).toBe("small"); return; } }
  });
});

describe("sheriklik", () => {
  const setup = () => {
    const s = mk(2); const owner = P(s, "p0"), partner = P(s, "p1");
    const id = ctx.deckIds.katta.find((i) => { const e = ctx.effects[i].effect; return e.kind === "buy" && e.asset === "business"; })!;
    const e = ctx.effects[id].effect as any;
    s.pending = { type: "card", playerId: "p0", cardId: id, deck: "katta" };
    owner.cash = e.price / 2 + 10; owner.bankDebt = 10_000; // bank limiti tugagan
    partner.cash = e.price;
    return { s, e, id };
  };
  it("faqat naqd va bank tugagach taklif qilinadi; 50/50", () => {
    const { s, e } = setup();
    let t = must(run(s, { type: "partner_offer", playerId: "p0", partnerId: "p1" }));
    const pid = t.proposals[0].id;
    expect(run(t, { type: "partner_accept", playerId: "p0", proposalId: pid })).toEqual({ ok: false, error: "not_partner" });
    t = must(run(t, { type: "partner_accept", playerId: "p1", proposalId: pid }));
    expect(P(t, "p0").cash).toBe(10); expect(P(t, "p1").cash).toBe(e.price / 2);
    expect(P(t, "p0").assets[0].monthlyIncome).toBe(e.monthlyIncome / 2);
    expect(P(t, "p1").assets[0].monthlyIncome).toBe(e.monthlyIncome / 2);
    expect(openPartnerships(P(t, "p0"))).toBe(1); expect(openPartnerships(P(t, "p1"))).toBe(1);
    expect(t.pending).toBeNull();
  });
  it("naqdi yetsa taklif kerak emas", () => {
    const { s } = setup(); P(s, "p0").cash = 1e9;
    expect(run(s, { type: "partner_offer", playerId: "p0", partnerId: "p1" })).toEqual({ ok: false, error: "not_needed" });
  });
  it("sherik naqdi yetmasa rad", () => {
    const { s } = setup(); P(s, "p1").cash = 1;
    let t = must(run(s, { type: "partner_offer", playerId: "p0", partnerId: "p1" }));
    expect(run(t, { type: "partner_accept", playerId: "p1", proposalId: t.proposals[0].id })).toEqual({ ok: false, error: "partner_cash" });
  });
  it("sotib olish: to'liq narx + 1 oylik foyda; sheriklik yopiladi", () => {
    const { s, e } = setup();
    let t = must(run(s, { type: "partner_offer", playerId: "p0", partnerId: "p1" }));
    t = must(run(t, { type: "partner_accept", playerId: "p1", proposalId: t.proposals[0].id }));
    P(t, "p0").cash = 1e9; const c1 = P(t, "p1").cash;
    t = must(run(t, { type: "partner_buyout", playerId: "p0", assetCode: e.code }));
    expect(P(t, "p1").cash).toBe(c1 + e.price + e.monthlyIncome);
    expect(openPartnerships(P(t, "p0"))).toBe(0); expect(openPartnerships(P(t, "p1"))).toBe(0);
    expect(P(t, "p0").assets[0].monthlyIncome).toBe(e.monthlyIncome);
  });
  it("sheriklik taklifi vaqti tugasa (expire) o'chadi", () => {
    const { s } = setup();
    let t = must(run(s, { type: "partner_offer", playerId: "p0", partnerId: "p1" }));
    t = must(run(t, { type: "expire", playerId: "server", proposalId: t.proposals[0].id }));
    expect(t.proposals).toHaveLength(0);
  });
});
