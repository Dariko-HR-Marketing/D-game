import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { newGame, reduce, GameState } from "./index";

const five = () => { const s = newGame(ctx, ["p0", "p1", "p2", "p3", "p4"], 1); s.players[0].cash = 1000; s.players[1].cash = 100_000; s.players[0].salary = 1000; return s; };
const P = (s: GameState, id: string) => s.players.find((p) => p.id === id)!;
const total = (s: GameState) => s.players.reduce((t, p) => t + p.cash, 0);

describe("hujumga qarshilik: noto'g'ri qiymatlar pulni yaratmaydi/o'g'irlamaydi", () => {
  const bad = [-100, 0, NaN, Infinity, 0.5, 1e21, "100" as any, null as any, undefined as any];
  it.each(bad)("o'zaro qarz summasi %s rad etiladi", (amount) => {
    const r = reduce(five(), ctx, { type: "loan_request", playerId: "p0", giverId: "p1", amount, months: 12 });
    expect(r.ok).toBe(false);
  });
  it.each([0, -1, 37, NaN, 1.5, "12" as any])("qarz muddati %s rad etiladi", (months) => {
    expect(reduce(five(), ctx, { type: "loan_request", playerId: "p0", giverId: "p1", amount: 100, months }).ok).toBe(false);
  });
  it("qabul paytida ham qayta tekshiriladi (taklif keyin buzilmaydi)", () => {
    const s = five(); const r = reduce(s, ctx, { type: "loan_request", playerId: "p0", giverId: "p1", amount: 100, months: 12 });
    if (!r.ok) throw 0; const t = r.state; P(t, "p1").cash = 10; // beruvchi kambag'allashdi
    expect(reduce(t, ctx, { type: "loan_accept", playerId: "p1", proposalId: t.proposals[0].id }).ok).toBe(false);
  });
  it("o'ziga qarz bera olmaydi; mavjud bo'lmagan beruvchi", () => {
    expect(reduce(five(), ctx, { type: "loan_request", playerId: "p0", giverId: "p0", amount: 10, months: 1 }).ok).toBe(false);
    expect(reduce(five(), ctx, { type: "loan_request", playerId: "p0", giverId: "zzz", amount: 10, months: 1 }).ok).toBe(false);
  });
  it.each([-10, 0, NaN, 1.5, 1e9, "100" as any])("qarzni to'lash %s", (amount) => {
    const s = five(); P(s, "p0").handDebts = [{ id: 9, to: "p1", amount: 500, months: 3 }]; P(s, "p0").cash = 1000;
    const before = total(s); const r = reduce(s, ctx, { type: "loan_repay", playerId: "p0", debtId: 9, amount });
    expect(r.ok).toBe(false); expect(total(s)).toBe(before);
  });
  it("boshqa odamning qarzini to'lab bo'lmaydi; pul yig'indisi saqlanadi", () => {
    const s = five(); P(s, "p0").handDebts = [{ id: 9, to: "p1", amount: 500, months: 3 }];
    expect(reduce(s, ctx, { type: "loan_repay", playerId: "p2", debtId: 9, amount: 100 }).ok).toBe(false);
    const r = reduce(s, ctx, { type: "loan_repay", playerId: "p0", debtId: 9, amount: 100 }); if (!r.ok) throw 0;
    expect(total(r.state)).toBe(total(s));
  });
  it.each([-100, 0, NaN, 50, 1e12, "100" as any])("bank krediti %s", (amount) => {
    expect(reduce(five(), ctx, { type: "bank_loan", playerId: "p0", amount }).ok).toBe(false);
  });
  it.each([-10, 0, NaN, 15, 1000, "10" as any])("suyunchi %s", (amount) => {
    const s = five(); s.proposals.push({ id: 1, kind: "suyunchi", parent: "p0", given: [] });
    const r = reduce(s, ctx, { type: "suyunchi", playerId: "p1", proposalId: 1, amount }); expect(r.ok).toBe(false);
  });
  it("noma'lum o'yinchi / taklif / harakat turi qulatmaydi", () => {
    const s = five();
    for (const a of [{ type: "suyunchi", playerId: "nobody", proposalId: 1, amount: 10 }, { type: "loan_accept", playerId: "p0", proposalId: 99 },
      { type: "partner_accept", playerId: "p0", proposalId: 99 }, { type: "nope", playerId: "p0" }, { type: "loan_repay", playerId: "nobody", debtId: 1, amount: 1 }] as any[]) {
      let r: any; expect(() => { r = reduce(s, ctx, a); }).not.toThrow(); expect(r.ok).toBe(false);
    }
  });
  it("prototip kalitlari o'yinchi ID sifatida ishlatilmaydi", () => {
    const s = five();
    for (const id of ["__proto__", "constructor", "toString"]) expect(reduce(s, ctx, { type: "bank_loan", playerId: id, amount: 100 }).ok).toBe(false);
  });
});
