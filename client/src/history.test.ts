import { describe, it, expect } from "vitest";
import { accuracyOf, deltasOf, filterEvents, titleOf, whyOf, cellName, type HEv } from "./history";

const base = (o: Partial<HEv>): HEv => ({ n: 1, seq: 1, at: 0, round: 1, by: "Siz", mine: true, type: "roll", auto: null, ok: true,
  before: { cash: 1000, passive: 0, flow: 500, debt: 0, assets: 0, months: 0 }, after: { cash: 1000, passive: 0, flow: 500, debt: 0, assets: 0, months: 0 },
  delta: { cash: 0, passive: 0, flow: 0, debt: 0 }, assetsAdded: [], assetsLost: [], log: [], ...o });

describe("tarix matnlari", () => {
  it("yurish: katakdan-katakka, kubik, tushgan katak, sabab", () => {
    const e = base({ move: { from: 3, to: 7, die: 4, fromCircle: "small", toCircle: "small", cell: { t: "I" }, months: 0 } });
    expect(titleOf(e)).toContain("4 → 8"); expect(cellName(e.move!)).toContain("Imkoniyat");
    expect(whyOf(e).join("|")).toContain("Kubik: 4");
  });
  it("qaror: sotib olish raqamlari va avtomatik sabab", () => {
    const e = base({ type: "decide", auto: "timeout", decision: { accept: true }, card: { id: "c1", stage: "decided", deck: "x", mode: "m", kind: "buy", text: "Kichik biznes", file: "" }, invest: { price: 1020000, down: 100000, income: 5000, yieldPct: 5.9, paybackMonths: 204, bankLoan: 920000 } });
    const w = whyOf(e).join("|");
    expect(titleOf(e)).toBe("Qabul qildi"); expect(w).toContain("Vaqt tugadi"); expect(w).toContain("1 020 000"); expect(w).toContain("204");
  });
  it("pul o'zgarishi faqat o'zgarganlar; qarz ko'payishi — yomon; filtr", () => {
    const e = base({ delta: { cash: -500, passive: 0, flow: 200, debt: 300 } });
    expect(deltasOf(e).map((d) => [d.label, d.kind])).toEqual([["Naqd", "bad"], ["Pul oqimi", "good"], ["Qarz", "bad"]]);
    const list = [e, base({ n: 2, seq: 2, mine: false }), base({ n: 3, seq: 3, ok: false })];
    expect(filterEvents(list, true)).toHaveLength(1); expect(filterEvents(list, false)).toHaveLength(2);
  });
  it("hisob aniqligi: birinchi urinishdagi ulush", () => {
    expect(accuracyOf(null)).toBeNull(); expect(accuracyOf({ firstTry: 0, retried: 0 })).toBeNull();
    expect(accuracyOf({ firstTry: 3, retried: 1 })).toEqual({ pct: 75, total: 4, firstTry: 3 });
  });
});
