import { describe, it, expect } from "vitest";
import { portfolioOf } from "./portfolio";

const mk = (extra: any = {}) => ({
  state: { players: [
    { id: "me", cash: 500, salary: 300, baseExpenses: 200, childCost: 0, children: 0, bankDebt: 3000, bankLoans: [{ amount: 3000, left: 20 }], qar: true, insuredCar: false, handLoans: 0, twoDice: 2, owe: 0, handDebts: [{ id: 1, to: "bob", amount: 400, months: 3 }],
      assets: [
        { kind: "buy", code: "A1", price: 1000, monthlyIncome: 100, creditPayment: 20, credit: 500 },
        { kind: "buy", code: "A2", price: 4000, monthlyIncome: 100, creditPayment: 0, credit: 0, pledged: "bank" },
        { kind: "shares", code: "S1", price: 600, monthlyIncome: 0, creditPayment: 0, credit: 0, shares: 30 },
      ], ...extra },
    { id: "bob", cash: 100, assets: [], handDebts: [{ id: 7, to: "me", amount: 250, months: 6 }], bankLoans: [] },
  ], bots: [], proposals: [], turn: 0 },
  members: [{ userId: "me", bot: false }, { userId: "bob", bot: false }], names: { bob: { name: "Bobur" }, me: { name: "Ali" } },
  assetCards: { A1: { text: "Kichik do'kon sotiladi. Narxi 1 000.", file: "x.png", asset: "small_business" }, A2: { text: "Dacha sotiladi.", file: "", asset: "dacha" } },
});
describe("mening kartalarim (portfolio)", () => {
  it("aktivlar: nom, tur, daromadlilik va qoplanish", () => {
    const p = portfolioOf(mk(), "me")!; const a1 = p.assets[0];
    expect(a1).toMatchObject({ title: "Kichik do'kon sotiladi.", label: "Kichik biznes", yearly: 120, payback: 10, net: 80, file: "x.png" });
    expect(p.assets[1]).toMatchObject({ label: "Dacha", yearly: 30, pledged: "bank" }); expect(p.assets[2]).toMatchObject({ kind: "shares", yearly: null, shares: 30 });
  });
  it("jami ko'rsatkichlar va tahlil", () => {
    const p = portfolioOf(mk(), "me")!;
    expect(p.totals).toMatchObject({ count: 3, invested: 5600, passive: 200, payments: 20, netPassive: 180 });
    expect(p.best?.code).toBe("A1"); expect(p.slowest?.code).toBe("A2"); expect(p.shares.map((s) => s.pct)).toEqual([50, 50]);
  });
  it("qarzlar: men bergan (boshqaning qo'lidagi qarzdan), men olgan, bank", () => {
    const p = portfolioOf(mk(), "me")!;
    expect(p.lent).toEqual([{ id: "lbob7", who: "Bobur", amount: 250, months: 6 }]); expect(p.owed[0]).toMatchObject({ who: "Bobur", amount: 400 }); expect(p.bank[0]).toMatchObject({ amount: 3000, months: 20 });
    expect(p.totals.lent).toBe(250); expect(p.totals.debt).toBe(3000 + 500 + 400);
  });
  it("faol kartalar va bo'sh holat", () => {
    const p = portfolioOf(mk(), "me")!; expect(p.active.map((a) => a.key)).toEqual(["qar", "twoDice"]); expect(p.active[1].value).toBe(2);
    const e = portfolioOf(mk({ assets: [], qar: false, twoDice: 0, bankLoans: [], handDebts: [] }), "me")!; expect(e.assets).toEqual([]); expect(e.best).toBeNull(); expect(e.active).toEqual([]);
    expect(portfolioOf(mk(), "nobody")).toBeNull();
  });
});
