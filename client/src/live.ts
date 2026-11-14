// Jonli tahlil: mijoz tomonidagi yordamchilar (sof funksiyalar).
import type { LiveAnalytics, LivePlayer } from "@tajriba24/rules";

export type LiveP = LivePlayer & { name: string; isMe: boolean };
export type LiveView = Omit<LiveAnalytics, "players"> & { players: LiveP[] };
/** O'yinchilar ranglari (rang yagona belgi emas: har doim ism ham yoziladi). */
export const PLAYER_COLORS = ["#2B6CB0", "#D9822B", "#11835A", "#8E4FBB", "#C0392B", "#0F8B8D", "#B7791F", "#566579"] as const;
export const colorOf = (view: LiveView, id: string) => PLAYER_COLORS[Math.max(0, view.players.findIndex((p) => p.id === id)) % PLAYER_COLORS.length];
export const pct = (v: number | null | undefined, digits = 0) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : `${(v * 100).toFixed(digits)}%`);
export const signedPct = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(0)}%`);
export const coverOf = (p: LiveP) => (p.final.expenses > 0 ? p.final.passive / p.final.expenses : 0);
/** Radar o'qlari (0–1): taklif etilgan ko'rsatkichlar (tasdiq kerak). */
export function radarOf(p: LiveP): number[] {
  const accept = p.decisions.shown > 0 ? p.decisions.accepted / p.decisions.shown : 0, quiz = p.quiz.answered > 0 ? p.quiz.correct / p.quiz.answered : 0;
  const assets = p.final.netWorth + p.final.debt, debt = assets > 0 ? p.final.debt / assets : 0, held = p.assets.filter((a) => a.status === "held").length;
  return [Math.min(1, coverOf(p)), accept, quiz, Math.max(0, 1 - Math.min(1, debt)), Math.min(1, held / 6)];
}
/** `{pct}`, `{n}`, `{value}` belgilarini qiymatga almashtiradi (summa to'liq yoziladi). */
export const fill = (tpl: string, params: Record<string, number>, money: (n: number) => string) => tpl.replace(/\{(\w+)\}/g, (_, k) => (k === "value" ? money(params[k] ?? 0) : String(params[k] ?? "")));
