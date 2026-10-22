import { describe, it, expect } from "vitest";
import { timeText, insightText, momentText, acceptRate, ratio, niceTicks, chartPoints } from "./report";
import { uz } from "./i18n/uz";

describe("hisobot yordamchilari", () => {
  it("o'yin vaqti: yil va oy", () => { expect(timeText(0)).toBe("0 oy"); expect(timeText(5)).toBe("5 oy"); expect(timeText(12)).toBe("1 yil"); expect(timeText(29)).toBe("2 yil 5 oy"); });
  it("tavsiya matni: summalar to'liq (probel bilan), vaqt — yil/oy, hamma kalit uchun matn bor", () => {
    expect(insightText({ key: "exit_blocked_cash", level: "info", params: { value: 178897, need: 1000000 } })).toBe("Chiqish uchun naqd yetmadi: 178 897 / 1 000 000.");
    expect(insightText({ key: "won", level: "good", params: { month: 29 } })).toBe("Tabriklaymiz — 2 yil 5 oy da g'alaba qozondingiz.");
    expect(insightText({ key: "many_skipped", level: "info", params: { shown: 10, skipped: 8 } })).toContain("10 ta qarorning 8 tasida");
    const keys = ["won", "time_up", "exit_done", "exit_blocked_cash", "exit_blocked_passive", "exit_blocked_debt", "exit_blocked_partner", "no_passive", "passive_growth", "many_skipped", "all_accepted", "autopilot", "restarts", "debt_end", "big_expense", "quiz_good", "quiz_low", "negative_flow", "big_progress", "left_game"];
    for (const k of keys) { expect((uz.report.ins as Record<string, string>)[k], k).toBeTruthy(); expect(insightText({ key: k, level: "info", params: {} })).not.toContain("{"); }
  });
  it("lahza matni: tur + matn + summa", () => { expect(momentText({ month: 3, round: 1, kind: "bought", text: "Kichik biznes", amount: 2600 })).toBe("Sotib oldingiz · Kichik biznes · 2 600"); expect(momentText({ month: 9, round: 2, kind: "exit" })).toBe("Kichik aylanadan chiqdingiz"); });
  it("qabul ulushi va nisbat", () => { expect(acceptRate({ shown: 0, accepted: 0 })).toBeNull(); expect(acceptRate({ shown: 8, accepted: 2 })).toBe(25); expect(ratio(500, 1000)).toBe(0.5); expect(ratio(2000, 1000)).toBe(1); expect(ratio(-5, 1000)).toBe(0); expect(ratio(5, 0)).toBe(0); });
  it("o'q belgilari nolni o'z ichiga oladi va qiymatlarni qoplaydi", () => {
    const t = niceTicks(-300, 4200); expect(t[0]).toBeLessThanOrEqual(-300); expect(t[t.length - 1]).toBeGreaterThanOrEqual(4200); expect(t).toContain(0); expect(niceTicks(0, 0)).toEqual([0]);
    const u = niceTicks(5, 980); expect(u[0]).toBe(0); expect(u[u.length - 1]).toBeGreaterThanOrEqual(980);
  });
  it("grafik nuqtalari kamaytiriladi, oxirgisi saqlanadi", () => {
    const s = Array.from({ length: 300 }, (_, i) => ({ month: i, v: i * 2 })); const p = chartPoints(s, (x) => x.v, 40);
    expect(p).toHaveLength(40); expect(p[p.length - 1]).toEqual({ x: 299, y: 598 }); expect(p[0]).toEqual({ x: 0, y: 0 });
  });
});
