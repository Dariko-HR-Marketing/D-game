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
