/** Paketlar tuzilmasi va chegaralari (taklif, buyurtmachi tasdig'i kutilmoqda: docs/OPEN_QUESTIONS.md 201).
 *  NARXLAR YO'Q: `PRICES` hamma joyda `null` — buyurtmachi to'ldirmaguncha «Sotib olish» ko'rinmaydi (CLAUDE.md §2.4). */
export type PlanId = "free" | "plus" | "hostDay" | "hostEvent" | "eduClass" | "corpEvent" | "corpTeam";
export type PriceKey = "plus.month" | "plus.year" | "hostDay" | "hostEvent" | "eduClass" | "corpEventSeat" | "corpTeam";
export const PRICES: Record<PriceKey, number | null> = { "plus.month": null, "plus.year": null, hostDay: null, hostEvent: null, eduClass: null, corpEventSeat: null, corpTeam: null };
export const ANNUAL_DISCOUNT_PCT: number | null = null; // yillik chegirma foizi: buyurtmachi belgilaydi

/** Taklif qiymatlari (tasdiq kutilmoqda). */
export const LIMITS = {
  free: { roomsPerDay: 3, historyGames: 10 },
  hostDay: { hours: 24, tables: 3, guests: 24 },
  hostEvent: { days: 7, tables: 10, guests: 80 },
  eduClass: { students: 30 },
  corpTeamTiers: [10, 25, 50, 100],
} as const;

export interface PlanInfo { id: PlanId; group: "personal" | "group" | "edu" | "corp"; priceKeys: PriceKey[] }
export const PLANS: PlanInfo[] = [
  { id: "free", group: "personal", priceKeys: [] },
  { id: "plus", group: "personal", priceKeys: ["plus.month", "plus.year"] },
  { id: "hostDay", group: "group", priceKeys: ["hostDay"] },
  { id: "hostEvent", group: "group", priceKeys: ["hostEvent"] },
  { id: "eduClass", group: "edu", priceKeys: ["eduClass"] },
  { id: "corpEvent", group: "corp", priceKeys: ["corpEventSeat"] },
  { id: "corpTeam", group: "corp", priceKeys: ["corpTeam"] },
];
/** Paketni sotib olish mumkinmi: hamma narxi kiritilgan bo'lishi shart. */
export const purchasable = (p: PlanInfo, prices: Record<PriceKey, number | null> = PRICES) => p.priceKeys.length > 0 && p.priceKeys.every((k) => prices[k] != null);
/** Yillik narx = oylik × 12 × (1 − chegirma). Oylik yoki chegirma yo'q bo'lsa — `null`. */
export const yearlyFrom = (month: number | null, pct: number | null) => (month == null || pct == null ? null : Math.round(month * 12 * (1 - pct / 100)));
/** Bepul paketda yangi xona yaratish chegarasiga yetdimi. */
export const roomLimitReached = (createdToday: number, plus: boolean, limit: number = LIMITS.free.roomsPerDay) => !plus && createdToday >= limit;
