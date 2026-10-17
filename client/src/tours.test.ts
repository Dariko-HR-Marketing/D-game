import { describe, it, expect } from "vitest";
import { TOUR_IDS, shouldShowTour, markTourSeen, resetTours, gameTourId, tourKey, OFF_KEY, type KV } from "./tours";
import { splitMonths, monthsText, roundYears, ESTIMATE, MONTHS_PER_LAP, MONTHS_PER_YEAR } from "./estimates";

const mem = (): KV & { m: Map<string, string> } => { const m = new Map<string, string>(); return { m, get: (k) => m.get(k) ?? null, set: (k, v) => { v === null ? m.delete(k) : m.set(k, v); } }; };
describe("sahifa yo'riqnomalari", () => {
  it("yangi foydalanuvchi har bir sahifada ko'radi, ko'rgach qaytmaydi (sahifa bo'yicha alohida)", () => {
    const kv = mem(); for (const id of TOUR_IDS) expect(shouldShowTour(kv, id)).toBe(true);
    markTourSeen(kv, "home"); expect(shouldShowTour(kv, "home")).toBe(false); expect(shouldShowTour(kv, "lobby")).toBe(true);
  });
  it("kichik va katta aylana uchun alohida yo'riqnoma", () => {
    expect(gameTourId("small")).toBe("game-small"); expect(gameTourId("big")).toBe("game-big"); expect(gameTourId(undefined)).toBe("game-small");
    const kv = mem(); markTourSeen(kv, "game-small"); expect(shouldShowTour(kv, "game-big")).toBe(true);
  });
  it("o'chirish kaliti va qayta ko'rsatish", () => {
    const kv = mem(); kv.set(OFF_KEY, "1"); expect(shouldShowTour(kv, "home")).toBe(false);
    markTourSeen(kv, "result"); resetTours(kv); expect(shouldShowTour(kv, "home")).toBe(true); expect(shouldShowTour(kv, "result")).toBe(true); expect(kv.get(tourKey("result"))).toBeNull();
  });
  it("kalitlar versiyalangan va noyob", () => { expect(new Set(TOUR_IDS.map(tourKey)).size).toBe(TOUR_IDS.length); });
});
describe("o'yin vaqti (oyma-oy)", () => {
  it("oylar → yil va oy", () => {
    expect(splitMonths(29)).toEqual({ years: 2, months: 5, total: 29 }); expect(splitMonths(0)).toEqual({ years: 0, months: 0, total: 0 }); expect(splitMonths(-3).total).toBe(0);
    const w = { year: "yil", month: "oy" }; expect(monthsText(29, w)).toBe("2 yil 5 oy"); expect(monthsText(5, w)).toBe("5 oy"); expect(monthsText(36, w)).toBe("3 yil");
  });
  it("4 oy = 1 aylana, 3 aylana = 1 yil; taxminiy davomiylik mantiqiy", () => {
    expect(MONTHS_PER_LAP * 3).toBe(MONTHS_PER_YEAR); expect(roundYears(ESTIMATE.smallExitMonths)).toBe(14); expect(roundYears(ESTIMATE.bigWinMonths)).toBe(5);
    expect(ESTIMATE.smallExitRange[0]).toBeLessThan(ESTIMATE.smallExitMonths); expect(ESTIMATE.smallExitMonths).toBeLessThan(ESTIMATE.smallExitRange[1]);
  });
});
