// Hisobot (o'yin tugagach): server javobi turlari va ko'rsatish yordamchilari. Matnlar — i18n (uz.report); bu yerda faqat formatlash.
import { uz } from "./i18n/uz";
import { money } from "./format";
import { downsample } from "./analysisView";

export type DeckGroup = "invest" | "market" | "expense" | "event" | "other";
export interface RPoint { month: number; cash: number; cashflow: number; passive: number; expenses: number; debt: number; netWorth: number }
export interface RAsset { code: string; name?: string; kind: string; boughtMonth: number; paid: number; price: number; income: number; paybackMonths: number | null; status: "held" | "sold" | "handed" | "lost" }
export interface RMoment { month: number; round: number; kind: "exit" | "restart" | "bought" | "sold" | "won" | "crisis" | "loan" | "expense" | "time_up" | "autopilot"; text?: string; amount?: number }
export interface RInsight { key: string; level: "good" | "info" | "warn"; params: Record<string, number | string> }
export interface RPeak { value: number; month: number }
export interface RMine {
  id: string; name: string; bot: boolean; rank: number; outcome: "won" | "big" | "small"; circle: "small" | "big"; months: number; turns: number;
  final: { cash: number; salary: number; passive: number; expenses: number; cashflow: number; debt: number; netWorth: number };
  series: RPoint[]; peaks: { cash: RPeak; cashflow: RPeak; passive: RPeak; netWorth: RPeak; lowCash: RPeak };
  exit: { month: number | null; progress: { cash: { value: number; need: number }; passive: { value: number; need: number }; debt: { value: number }; partnerships: { value: number } } | null };
  big: { cashflow: { value: number; need: number }; cash: { value: number; need: number | null }; dream: string | null } | null;
  decisions: { shown: number; accepted: number; skipped: number; auto: number; forced: number; byGroup: Record<DeckGroup, { shown: number; accepted: number; skipped: number; forced: number }> };
  spending: { expenseCards: number; expenseTotal: number; biggest: { amount: number; text?: string; month: number } | null; purchases: number; purchaseTotal: number; sales: number; bankLoans: number };
  quiz: { answered: number; correct: number }; risks: { restarts: number; crisisMonths: number; unemployedMonths: number };
  assets: RAsset[]; moments: RMoment[]; insights: RInsight[]; score: { points: { pos: number; neg: number }; xp: number | null } | null;
}
export interface RSummary { id: string; name: string; bot: boolean; rank: number; outcome: "won" | "big" | "small"; circle: "small" | "big"; months: number; turns: number; final: RMine["final"]; peakNetWorth: number; exitMonth: number | null; restarts: number; assets: number; decisions: { shown: number; accepted: number; skipped: number }; netWorthSeries: { month: number; netWorth: number }[] }
export interface ReportData { meta: { rounds: number; turns: number; months: number; mode: string; endReason: "win" | "time" | null; winner: string | null; players: number }; me: RMine; others: RSummary[]; ranking: string[] }

/** «2 yil 5 oy» (o'yin oylari). */
export function timeText(months: number): string {
  const y = Math.floor(months / 12), m = months % 12; const T = uz.time;
  return [y ? `${y} ${T.year}` : "", m || !y ? `${m} ${T.month}` : ""].filter(Boolean).join(" ");
}
const MONEY_KEYS = new Set(["value", "need", "flow"]);
/** Tavsiya matni: kalit bo'yicha jadvaldan, parametrlar o'rniga qo'yiladi (summalar to'liq yoziladi). */
export function insightText(i: RInsight): string {
  const t = (uz.report.ins as Record<string, string>)[i.key] ?? i.key;
  return t.replace(/\{(\w+)\}/g, (_, k: string) => { const v = i.params[k] ?? (k === "time" ? i.params.month : undefined); if (v === undefined) return ""; if (k === "time") return timeText(Number(v)); return MONEY_KEYS.has(k) ? money(Number(v)) : String(v); });
}
export const momentText = (m: RMoment): string => { const base = (uz.report.mom as Record<string, string>)[m.kind] ?? m.kind; return [base, m.text, m.amount !== undefined ? money(m.amount) : ""].filter(Boolean).join(" · "); };
export const acceptRate = (d: { shown: number; accepted: number }): number | null => (d.shown ? Math.round((d.accepted / d.shown) * 100) : null);
export const ratio = (v: number, need: number) => (need > 0 ? Math.max(0, Math.min(1, v / need)) : 0);

export interface ChartPoint { x: number; y: number }
/** Chart uchun nuqtalar (oy → qiymat), ko'p bo'lsa kamaytiriladi; oxirgi nuqta saqlanadi. */
export function chartPoints(series: { month: number }[], pick: (p: any) => number, max = 60): ChartPoint[] { return downsample(series.map((p) => ({ x: p.month, y: pick(p) })), max); }
/** «Chiroyli» o'q belgilari: minimal/maksimal qiymatni qoplaydi, nolni o'z ichiga oladi. */
export function niceTicks(min: number, max: number, n = 4): number[] {
  const lo = Math.min(0, min), hi = Math.max(0, max); if (hi === lo) return [0];
  const raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw) ?? raw;
  const out: number[] = []; for (let v = Math.floor(lo / step) * step; ; v += step) { out.push(Math.round(v * 1000) / 1000); if (v >= hi - step * 0.001) break; } return out;
}
