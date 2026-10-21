import { describe, it, expect } from "vitest";
import { sheetOf, SLOTS } from "./sheet";
import { monthlyExpenses, playerCashflow } from "@poyga/rules";

const player = (extra: any = {}) => ({ id: "me", cash: 500, salary: 3000, baseExpenses: 1950, childCost: 200, children: 2, bankDebt: 3000, bankLoans: [{ amount: 3000, left: 20 }], lombards: [{ amount: 1000, left: 10, code: "D1" }], qar: true, insuredCar: false, handLoans: 0, handDebts: [],
  pos: 0, circle: "small", monthsPlayed: 7, dreamIdx: 1, lockedFlow: 0,
  assets: [
    { kind: "buy", code: "A1", price: 1000, monthlyIncome: 100, creditPayment: 20, credit: 500 },
    { kind: "buy", code: "A2", price: 4000, monthlyIncome: 300, creditPayment: 0, credit: 0, pledged: "lombard" },
    { kind: "buy", code: "A3", price: 9000, monthlyIncome: 700, creditPayment: 0, credit: 0 },
    { kind: "shares", code: "TAPOiCh", price: 600, monthlyIncome: 0, creditPayment: 0, credit: 0, shares: 30 },
  ], ...extra });
const room = (extra: any = {}) => ({ state: { players: [player(extra)], bots: [], proposals: [], turn: 0 }, members: [{ userId: "me", bot: false }], names: { me: { name: "Ali" } },
  professions: { me: "Begona firma direktori" }, dreams: [{ name: "A", price: 1 }, { name: "Orzu", price: 500000 }],
  assetCards: { A1: { text: "Kichik do'kon.", file: "", asset: "small_business" }, A2: { text: "Dacha.", file: "", asset: "dacha" }, A3: { text: "Zavod.", file: "", asset: "business" } } });

describe("hisob varag'i", () => {
  it("daromad satrlari guruhlanadi va jami qoidalar dvigateli bilan bir xil", () => {
    const r = room(), s = sheetOf(r, "me")!, d = s.small, p = r.state.players[0] as any;
    expect(d.realty.map((x) => x.income)).toEqual([300]); expect(d.small.map((x) => x.income)).toEqual([100]); expect(d.big.map((x) => x.income)).toEqual([700]);
    expect(d.totals.passive).toBe(1100); expect(d.totals.income).toBe(4100); expect(d.totals.expenses).toBe(monthlyExpenses(p)); expect(d.totals.cashflow).toBe(playerCashflow(p));
    expect(d.name).toBe("Ali"); expect(d.profession).toBe("Begona firma direktori"); expect(d.dream).toEqual({ name: "Orzu", price: 500000 }); expect(d.months).toBe(7);
  });
  it("xarajat tarkibi jamiga teng; aksiya jadvali; kreditlar va garov", () => {
    const d = sheetOf(room(), "me")!.small, e = d.expenses;
    expect(e.base + e.childTotal + e.credits + e.bank + e.lombard + e.qar).toBeCloseTo(d.totals.expenses, 6); expect(e.childTotal).toBe(400);
    expect(d.shares.find((x) => x.code === "TAPOiCh")).toEqual({ code: "TAPOiCh", count: 30, price: 20 }); expect(d.shares.find((x) => x.code === "KCH")!.count).toBe(0);
    expect(d.lombards[0].amount).toBe(1000); expect(d.banks[0].amount).toBe(3000); expect(d.collateral).toEqual(["Dacha."]);
    expect(d.debt).toBeGreaterThan(0); expect(SLOTS.realty + SLOTS.small + SLOTS.big).toBe(18);
  });
  it("katta aylana: o'tgandagi pul oqimi va bizneslar; kichik aylanada «—»", () => {
    expect(sheetOf(room(), "me")!.big.lockedFlow).toBeNull();
    const r = room({ circle: "big", lockedFlow: 25400, bigDebt: 1200, assets: [{ kind: "business", code: "big-3", price: 400000, monthlyIncome: 13000, creditPayment: 0, credit: 0 }] }) as any; r.assetCards = { "big-3": { text: "Taksi xizmati", file: "", asset: "business" } };
    const b = sheetOf(r, "me")!; expect(b.circle).toBe("big"); expect(b.big).toMatchObject({ lockedFlow: 25400, debt: 1200, businesses: [{ title: "Taksi xizmati", price: 400000, income: 13000 }] });
    expect(b.small.big).toEqual([]); // katta aylana bizneslari kichik varaqda takrorlanmaydi
  });
});
