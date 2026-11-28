import { describe, it, expect } from "vitest";
import { addMod, assetIncome, saleBase, newPlayer, modTouches, type Asset } from "./engine";
const k = { n: 1, salary: 1000, total: 500, save: 0, child: 0 };
const asset = (since?: number): Asset => ({ kind: "shares", code: "X", price: 1000, monthlyIncome: 100, creditPayment: 0, credit: 0, ...(since !== undefined ? { since } : {}) } as Asset);
describe("bozor ta'siri 12 oylik oyna", () => {
  it("modTouches: 12 oydan eski ta'sir tegmaydi; yangi va keyingi tegadi", () => {
    expect(modTouches({ at: 0 }, 12)).toBe(true); expect(modTouches({ at: 0 }, 13)).toBe(false); expect(modTouches({ at: 30 }, 13)).toBe(true);
    expect(modTouches({}, 99)).toBe(true); expect(modTouches({ at: 0 }, undefined)).toBe(true);
  });
  it("daromad va sotish narxi: eski ta'sir keyin sotib olingan aktivga tegmaydi", () => {
    let p: any = { ...newPlayer("a", k), monthsPlayed: 0 };
    p = addMod(p, { t: "income", sel: { any: [{ kind: "shares" }] }, mode: "pct", value: 50, months: 40 }); p = addMod(p, { t: "price", sel: { any: [{ kind: "shares" }] }, pct: 20, side: "sell", months: 40 });
    expect(assetIncome(p, asset(10))).toBe(150); expect(saleBase(p, asset(10))).toBe(1200);
    expect(assetIncome(p, asset(20))).toBe(100); expect(saleBase(p, asset(20))).toBe(1000);
  });
});
