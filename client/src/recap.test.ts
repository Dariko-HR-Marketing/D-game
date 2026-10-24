import { describe, expect, it } from "vitest";
import { debtOf, insightText, lostIncome, recapInsights, type RecapData } from "./recap";

const base = (over: Partial<RecapData["before"]> = {}, cause: RecapData["cause"] = { kind: "pay", amount: 12000 }): RecapData => ({
  id: 1, playerId: "a", month: 5, round: 2, cause, newKasb: "Vrach", recent: [],
  before: { kasb: "Aktyor", cash: 300, owe: 9500, bankDebt: 0, handDebt: 0, salary: 1500, expenses: 1400, passive: 400, cashflow: -200, assets: [{ code: "KB", kind: "small_business", name: "A", price: 1500, income: 200 }, { code: "KB", kind: "small_business", name: "B", price: 1300, income: 300 }], ...over },
});

describe("bankrot tahlili", () => {
  it("majburiy to'lov: summa, naqd, qarz va chegara to'liq yoziladi", () => {
    const t = insightText(recapInsights(base(), 10_000)[0]); expect(t).toContain("12 000 majburiy to'lov"); expect(t).toContain("naqdingiz 300"); expect(t).toContain("qarzingiz 9 500"); expect(t).toContain("10 000"); expect(t).not.toMatch(/\{/);
  });
  it("sabablar ahamiyat tartibida: to'lov, zaxira, pul oqimi, qarz, passiv, aktivlar (ko'pi bilan 6)", () => {
    expect(recapInsights(base(), 10_000).map((i) => i.key)).toEqual(["pay", "noBuffer", "negFlow", "debt", "thinPassive", "assetsLost"]);
  });
  it("katak sababi; aktiv yo'q — «noAssets»; qarz va manfiy oqim bo'lmasa o'sha qatorlar yo'q", () => {
    const k = recapInsights(base({ owe: 0, cashflow: 100, cash: 5000, assets: [], passive: 0 }, { kind: "cell" }), 10_000).map((i) => i.key); expect(k).toEqual(["cell", "noAssets"]);
  });
  it("jami qarz va yo'qotilgan daromad", () => { const r = base({ owe: 100, bankDebt: 200, handDebt: 50 }); expect(debtOf(r)).toBe(350); expect(lostIncome(r)).toBe(500); });
  it("hamma matn parametrlari to'ldiriladi", () => { for (const i of recapInsights(base(), 10_000)) expect(insightText(i)).not.toMatch(/\{[a-z]+\}/i); });
});
