import { describe, it, expect } from "vitest";
import { deriveEffects } from "@poyga/content/effects";
import cardsJson from "../../content/data/cards.json";
import { cardFacts } from "./cardFacts";

const P = (o: any = {}) => ({ cash: 1000, salary: 500, assets: [], ...o });
const fx = deriveEffects(cardsJson as any);
describe("karta raqamlari", () => {
  it("sotib olish: boshlang'ich to'lov, kredit, oylik ta'sir (foiz kartada minus bilan)", () => {
    const f = cardFacts({ kind: "buy", asset: "apartment", code: "KV2s", price: 35000, down: 7000, credit: 28000, creditPayment: -650, monthlyIncome: 200 }, P({ cash: 5000 }), 10000);
    expect(f.need).toBe(7000); expect(f.affordable).toBe(false); expect(f.bankCovers).toBe(true); expect(f.flowDelta).toBe(-450);
    expect(f.rows.map((r) => r.label)).toEqual(expect.arrayContaining(["Narxi", "Boshlang'ich to'lov", "Kredit", "Oylik daromad"]));
  });
  it("naqd yetadi / bank limiti yetmaydi", () => {
    expect(cardFacts({ kind: "buy", asset: "land", code: "E", price: 500 }, P()).affordable).toBe(true);
    const f = cardFacts({ kind: "buy", asset: "land", code: "E", price: 50000 }, P({ cash: 100 }), 10000); expect(f.affordable).toBe(false); expect(f.bankCovers).toBe(false);
  });
  it("inqirozda narx yarmi va izoh", () => {
    const f = cardFacts({ kind: "buy", asset: "land", code: "E", price: 1000 }, P({ crisisMonths: 10 })); expect(f.need).toBe(500); expect(f.notes.length).toBeGreaterThan(0);
  });
  it("aksiya, daromad, to'lov, xayriya, sug'urta (mashinasiz ogohlantirish)", () => {
    expect(cardFacts({ kind: "buyShares", code: "S", pricePerShare: 10, min: 5, max: 100 }, P()).need).toBe(50);
    expect(cardFacts({ kind: "gain", amount: 300 }, P()).rows[0].value).toBe("+300");
    expect(cardFacts({ kind: "pay", amount: 300, to: "bank" }, P()).rows[0].value).toBe("−300");
    expect(cardFacts({ kind: "charity", incomeShare: 0.1, turns: 3, dice: 2 }, P({ salary: 1000, assets: [{ kind: "x", monthlyIncome: 500 }] })).need).toBe(150);
    expect(cardFacts({ kind: "carInsurance", price: 100 }, P()).notes).toHaveLength(1);
    expect(cardFacts({ kind: "carInsurance", price: 100 }, P({ assets: [{ kind: "car", monthlyIncome: 0 }] })).notes).toHaveLength(0);
  });
  it("barcha 418 kartada istisno yo'q; qaror kartalarida raqamlar bor", () => {
    for (const c of fx) {
      const f = cardFacts(c.effect, P(), 10000);
      if (["buy", "buyShares", "gain", "pay", "lendRequest", "courseSalaryPlus", "charity", "carInsurance", "payOrLoseBusiness"].includes(c.effect.kind)) expect(f.rows.length, c.id).toBeGreaterThan(0);
      for (const r of f.rows) expect(r.value, `${c.id} ${r.label}`).not.toMatch(/NaN|undefined/);
    }
  });
});

describe("faol daromad ta'siri karta raqamlarida (server natijasi bilan bir xil)", () => {
  it("«Savdo va chakana» +25 % faol bo'lsa, savdo aktivi kartasida daromad ham, pul oqimi o'zgarishi ham shu bilan ko'rsatiladi", async () => {
    const { applyEffect, passiveIncome, playerCashflow } = await import("@poyga/rules");
    const buy = { kind: "buy", asset: "small_business", code: "KB-T", price: 1700, monthlyIncome: 300, sector: "Savdo va chakana" };
    const mods = [{ t: "income", sel: { any: [{ sector: "Savdo va chakana" }] }, mode: "pct", value: 5, months: 7, wait: false, src: "t", id: 1 }, { t: "income", sel: { any: [{ sector: "Savdo va chakana" }] }, mode: "pct", value: 20, months: 3, wait: false, src: "t", id: 2 }];
    const p: any = { id: "t", cash: 100000, salary: 700, assets: [], mods, baseExpenses: 400, children: 0, childCost: 0, bankLoans: [], lombards: [], bankDebt: 0 };
    const f = cardFacts(buy, p, 0); const r: any = applyEffect(p, buy as any);
    expect(r.ok).toBe(true); const gained = passiveIncome(r.player) - passiveIncome(p);
    expect(gained).toBe(375); expect(f.flowDelta).toBe(gained); // 300 × 1,25
    expect(f.rows.find((x) => x.label === "Oylik daromad")?.value).toBe("+375"); expect(f.notes.join(" ")).toContain("daromad o'zgargan");
    expect(playerCashflow(r.player) - playerCashflow(p)).toBe(gained);
  });
  it("faol ta'sir bo'lmasa daromad kartadagidek, izoh yo'q", () => {
    const buy = { kind: "buy", asset: "small_business", code: "KB-T", price: 1700, monthlyIncome: 300, sector: "Savdo va chakana" };
    const f = cardFacts(buy, { cash: 5000, salary: 700, assets: [] } as any, 0); expect(f.flowDelta).toBe(300); expect(f.notes.join(" ")).not.toContain("daromad o'zgargan");
  });
});

describe("ish haqi o'sishi faol ta'sir bilan", () => {
  it("«ish haqi +10 %» faol bo'lsa kurs kartasidagi o'sish ham server hisobi bilan bir xil", async () => {
    const { applyEffect, salaryOf } = await import("@poyga/rules");
    const e = { kind: "courseSalaryPlus", price: 500, salaryPlus: 200 };
    const p: any = { id: "t", cash: 9000, salary: 1000, assets: [], mods: [{ t: "salary", pct: 10, months: 6, wait: false, src: "t", id: 1 }], baseExpenses: 400, children: 0, childCost: 0, bankLoans: [], lombards: [], bankDebt: 0 };
    const f = cardFacts(e, p, 0); const r: any = applyEffect(p, e as any); expect(r.ok).toBe(true);
    const real = salaryOf(r.player) - salaryOf(p); expect(real).toBe(220); expect(f.flowDelta).toBe(real); expect(f.notes.join(" ")).toContain("ish haqi o'zgargan");
  });
});
