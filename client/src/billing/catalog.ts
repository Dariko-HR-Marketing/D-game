/** Paketlar (PILOT, buyurtmachi tasdig'i 2026-11-23, docs/OPEN_QUESTIONS.md 214): Start (bepul), Plus, Premium, Tashkilot.
 *  Narxlar va chegaralar KODDA YO'Q: hammasi serverdagi sozlamadan (`GET /shop` → `pkg`, `plus`, `premium`) keladi va admin panelda o'zgaradi. */
export type PlanId = "start" | "plus" | "premium" | "org";
export const PLAN_ORDER: PlanId[] = ["start", "plus", "premium", "org"];
export interface Quota { day: number | null; week: number | null; month: number | null }
export interface OrgTier { seats: number; pct: number }

/** Imkoniyatlar jadvali: har paket uchun qiymat (✓ — bor, «—» yo'q, boshqa matn — daraja). Kalitlar `uz.packs.rows` da. */
export const MATRIX: { key: string; v: [string, string, string, string] }[] = [
  { key: "game", v: ["yes", "yes", "yes", "yes"] },
  { key: "join", v: ["yes", "yes", "yes", "yes"] },
  { key: "rooms", v: ["limited", "more", "unlimited", "unlimited"] },
  { key: "history", v: ["last", "full", "export", "group"] },
  { key: "analysis", v: ["no", "yes", "yes", "yes"] },
  { key: "advice", v: ["no", "no", "yes", "yes"] },
  { key: "report", v: ["no", "no", "personal", "group"] },
  { key: "club", v: ["no", "no", "yes", "yes"] },
  { key: "tournament", v: ["join", "join", "small", "full"] },
  { key: "cosmetics", v: ["basic", "set", "exclusive", "brand"] },
  { key: "early", v: ["no", "no", "yes", "no"] },
  { key: "class", v: ["no", "no", "no", "yes"] },
  { key: "support", v: ["normal", "normal", "priority", "manager"] },
  { key: "ads", v: ["none", "none", "none", "none"] },
];

/** Tashkilot narxi: o'rinlar soni × bir o'rin oyiga × (1 − chegirma). Yillik: `payMonths` oy (taklif: 10). */
export const orgMonthly = (seatMonthly: number | null, tier: OrgTier) => (seatMonthly == null ? null : Math.round(tier.seats * seatMonthly * (1 - tier.pct / 100)));
export const orgYearly = (seatMonthly: number | null, tier: OrgTier, payMonths = 10) => { const m = orgMonthly(seatMonthly, tier); return m == null ? null : m * payMonths; };
/** Yillik to'lov oylikdan necha foiz arzon (12 oy o'rniga `payMonths`). */
export const yearlySavingPct = (monthly: number | null, yearly: number | null) => (monthly && yearly ? Math.round((1 - yearly / (monthly * 12)) * 100) : null);
/** Limit tugagan lahza: qaysi oynada to'ldi (kun / hafta / oy) va qachon yangilanadi. */
export function limitWindow(q: Quota, u: { day: number; week: number; month: number; resets: { day: number; week: number; month: number } }): { win: "day" | "week" | "month"; at: number } | null {
  const hit = (["day", "week", "month"] as const).filter((k) => q[k] !== null && u[k] >= (q[k] as number));
  if (!hit.length) return null; const win = hit.reduce((a, b) => (u.resets[a] >= u.resets[b] ? a : b)); return { win, at: u.resets[win] };
}
