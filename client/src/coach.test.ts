import { describe, it, expect } from "vitest";
import { coachStep, COACH_ORDER } from "./coach";

const room = (o: { mode?: string; round?: number; months?: number; rolled?: boolean; pending?: any; lastEffect?: any; offers?: boolean; winner?: string | null; turn?: number } = {}): any => ({
  mode: o.mode ?? "tutorial", pendingCard: o.pending ?? null, lastCard: o.lastEffect ? { text: "x", effect: o.lastEffect } : null, marketCards: o.offers ? { 5: { text: "m", effect: { kind: "marketSale", targets: ["SH"], amount: 10 } } } : {},
  state: { round: o.round ?? 1, turn: o.turn ?? 0, winner: o.winner ?? null, lastRoll: o.rolled ? { playerId: "me", die: 3, n: 1 } : null, lastCard: o.lastEffect ? { playerId: "me", cardId: "xar-1", n: 1 } : null, bots: ["b1"], proposals: o.offers ? [{ id: 5, kind: "market", cardId: "x", sold: [] }] : [],
    players: [{ id: "me", cash: 100, assets: [{ kind: "shares", code: "SH", price: 1, monthlyIncome: 0, creditPayment: 0, credit: 0, shares: 10 }], monthsPlayed: o.months ?? 0, circle: "small" }, { id: "b1", assets: [], monthsPlayed: 0, circle: "small" }] },
});
const none = new Set<string>();
describe("o'quv o'yini yo'l-yo'rig'i", () => {
  it("faqat o'quv rejimida; o'yin tugagach yo'q", () => {
    expect(coachStep(room({ mode: "standard" }), "me", none)).toBeNull(); expect(coachStep(room({ winner: "me" }), "me", none)).toBeNull();
    expect(coachStep(room(), "me", none)).toBe("start");
  });
  it("tegishli voqea bo'lganda qadam chiqadi; ko'rilgani qayta chiqmaydi", () => {
    expect(coachStep(room({ rolled: true }), "me", none)).toBeNull(); // kubik tashlandi, voqea yo'q
    expect(coachStep(room({ rolled: true, pending: { id: "kichik-1", effect: { kind: "buy", asset: "small_business" } } }), "me", none)).toBe("opportunity");
    expect(coachStep(room({ rolled: true, pending: { id: "x", effect: { kind: "buyShares", min: 1, max: 5 } } }), "me", none)).toBe("shares");
    expect(coachStep(room({ rolled: true, lastEffect: { kind: "pay", amount: 100 } }), "me", none)).toBe("expense");
    expect(coachStep(room({ rolled: true, offers: true }), "me", none)).toBe("market");
    expect(coachStep(room({ rolled: true, months: 1 }), "me", none)).toBe("payday");
    expect(coachStep(room({ rolled: true, months: 2 }), "me", new Set(["payday"]))).toBe("goal");
    expect(coachStep(room({ rolled: true, months: 2 }), "me", new Set(["payday", "goal"]))).toBeNull();
    expect(coachStep(room(), "me", new Set(["start"]))).toBeNull();
    expect(COACH_ORDER).toHaveLength(7);
  });
});
