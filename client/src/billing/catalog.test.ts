import { describe, it, expect } from "vitest";
import { PLANS, PRICES, purchasable, yearlyFrom, roomLimitReached, LIMITS } from "./catalog";
import { featureOn } from "../features";
describe("paket katalogi", () => {
  it("narxlar yo'q: hech bir paket sotib olinmaydi", () => { expect(Object.values(PRICES).every((v) => v === null)).toBe(true); expect(PLANS.some((p) => purchasable(p))).toBe(false); });
  it("narx kiritilsa sotib olish mumkin (obuna uchun oylik va yillik)", () => {
    const plus = PLANS.find((p) => p.id === "plus")!; expect(purchasable(plus, { ...PRICES, "plus.month": 1 })).toBe(false); expect(purchasable(plus, { ...PRICES, "plus.month": 1, "plus.year": 2 })).toBe(true);
  });
  it("yillik narx formulasi", () => { expect(yearlyFrom(1000, 20)).toBe(9600); expect(yearlyFrom(null, 20)).toBeNull(); expect(yearlyFrom(1000, null)).toBeNull(); });
  it("xona chegarasi: faqat bepul paketda", () => { expect(roomLimitReached(LIMITS.free.roomsPerDay, false)).toBe(true); expect(roomLimitReached(LIMITS.free.roomsPerDay - 1, false)).toBe(false); expect(roomLimitReached(99, true)).toBe(false); });
});
describe("funksiya bayroqlari", () => {
  it("muhit va localStorage bayroqlari", () => { expect(featureOn("rooms", undefined, null)).toBe(false); expect(featureOn("rooms", "rooms,billing", null)).toBe(true); expect(featureOn("billing", "", "rooms, billing")).toBe(true); expect(featureOn("billing", "rooms", "")).toBe(false); });
});
import { googleEnabled } from "../googleSignIn";
describe("Google kirish", () => { it("client ID va server bayrog'i ikkalasi bo'lsa yoqiladi", () => { expect(googleEnabled(true, "")).toBe(false); expect(googleEnabled(false, "id")).toBe(false); expect(googleEnabled(undefined, "id")).toBe(false); expect(googleEnabled(true, "id")).toBe(true); }); });
