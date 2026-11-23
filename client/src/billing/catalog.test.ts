import { describe, it, expect } from "vitest";
import { MATRIX, PLAN_ORDER, orgMonthly, orgYearly, yearlySavingPct, limitWindow } from "./catalog";
import { featureOn } from "../features";
describe("paketlar katalogi (pilot)", () => {
  it("to'rt paket va jadval ustunlari mos; reklama hech qaysi paketda yo'q", () => { expect(PLAN_ORDER).toHaveLength(4); expect(MATRIX.every((r) => r.v.length === 4)).toBe(true); expect(MATRIX.find((r) => r.key === "ads")!.v.every((x) => x === "none")).toBe(true); });
  it("qo'shilish va to'liq o'yin hamma paketda bor (natijaga ta'sir qilmaydi)", () => { expect(MATRIX.find((r) => r.key === "game")!.v.every((x) => x === "yes")).toBe(true); expect(MATRIX.find((r) => r.key === "join")!.v.every((x) => x === "yes")).toBe(true); });
  it("tashkilot narxi: o'rinlar × bir o'rin × (1 − chegirma); yillik 10 oy", () => {
    expect(orgMonthly(25_000, { seats: 10, pct: 0 })).toBe(250_000); expect(orgMonthly(25_000, { seats: 25, pct: 10 })).toBe(562_500); expect(orgMonthly(25_000, { seats: 100, pct: 30 })).toBe(1_750_000);
    expect(orgYearly(25_000, { seats: 50, pct: 20 })).toBe(10_000_000); expect(orgMonthly(null, { seats: 10, pct: 0 })).toBeNull();
  });
  it("yillik tejash foizi", () => { expect(yearlySavingPct(49_000, 490_000)).toBe(17); expect(yearlySavingPct(null, 1)).toBeNull(); });
  it("limit oynasi: eng kech yangilanadigan to'lgan oyna", () => {
    const u = { day: 1, week: 2, month: 3, resets: { day: 10, week: 20, month: 30 } };
    expect(limitWindow({ day: 1, week: 2, month: 6 }, u)).toEqual({ win: "week", at: 20 }); expect(limitWindow({ day: null, week: null, month: null }, u)).toBeNull(); expect(limitWindow({ day: 5, week: 5, month: 5 }, u)).toBeNull();
  });
});
describe("funksiya bayroqlari", () => {
  it("rooms va billing pilot uchun doim yoqiq; `-rooms` / `-billing` o'chiradi", () => { expect(featureOn("rooms", undefined, null)).toBe(true); expect(featureOn("rooms", "-rooms", null)).toBe(false); expect(featureOn("billing", undefined, null)).toBe(true); expect(featureOn("billing", "-billing", null)).toBe(false); expect(featureOn("billing", undefined, "-billing")).toBe(false); });
});
import { googleEnabled } from "../googleSignIn";
describe("Google kirish", () => { it("client ID va server bayrog'i ikkalasi bo'lsa yoqiladi", () => { expect(googleEnabled(true, "")).toBe(false); expect(googleEnabled(false, "id")).toBe(false); expect(googleEnabled(true, "id")).toBe(true); }); });
