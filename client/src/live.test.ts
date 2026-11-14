import { describe, it, expect } from "vitest";
import { fill, pct, signedPct, radarOf, coverOf, type LiveP } from "./live";

const p = (over: Partial<LiveP> = {}) => ({ final: { cash: 0, salary: 0, passive: 500, expenses: 1000, cashflow: 0, debt: 3000, netWorth: 7000 }, decisions: { shown: 4, accepted: 3 }, quiz: { answered: 5, correct: 4 }, assets: [{ status: "held" }, { status: "held" }, { status: "sold" }], ...over }) as unknown as LiveP;
describe("jonli tahlil: mijoz yordamchilari", () => {
  it("foiz va ishorali foiz; bo'sh qiymat — tire", () => { expect(pct(0.256)).toBe("26%"); expect(pct(null)).toBe("—"); expect(signedPct(0.5)).toBe("+50%"); expect(signedPct(-0.2)).toBe("−20%"); expect(signedPct(undefined)).toBe("—"); });
  it("passiv/xarajat nisbati; xarajat nol bo'lsa nol", () => { expect(coverOf(p())).toBe(0.5); expect(coverOf(p({ final: { expenses: 0, passive: 10 } } as any))).toBe(0); });
  it("radar: 5 o'q, hammasi 0–1", () => { const r = radarOf(p()); expect(r).toHaveLength(5); for (const v of r) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); } expect(r[0]).toBe(0.5); expect(r[1]).toBe(0.75); expect(r[2]).toBe(0.8); expect(r[3]).toBeCloseTo(0.7, 5); expect(r[4]).toBeCloseTo(2 / 6, 5); });
  it("matn shabloni: summa to'liq yoziladi (bo'shliq bilan)", () => { expect(fill("Naqd {value}, {n} oy, {pct}%", { value: 1020000, n: 3, pct: 40 }, (n) => n.toLocaleString("ru-RU").replace(/ /g, " "))).toBe("Naqd 1 020 000, 3 oy, 40%"); });
});
