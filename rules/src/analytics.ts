// Jonli tahlil (o'yin davomida): har bir o'yinchi, bozor holati va nazariy matritsalar. Sof funksiyalar: faqat `GameReport` (jurnaldan hisoblangan) asosida.
// Hech qanday yangi raqam o'ylab topilmaydi: chegaralar guruh medianasi yoki qoidalar bilan belgilanadi. «Gipoteza» deb belgilanganlar buyurtmachi tasdig'ini kutadi (docs/OPEN_QUESTIONS.md).
import type { AssetChannel, AssetRecord, GameReport, PlayerReport, TimePoint } from "./report";

/** Savodxonlik darajasi (0–4): qoidalardagi kichik aylanadan chiqish shartiga (passiv ≥ xarajat) asoslangan. */
export type LiteracyLevel = 0 | 1 | 2 | 3 | 4;
export const levelOf = (p: Pick<TimePoint, "cashflow" | "passive" | "expenses">): LiteracyLevel =>
  p.cashflow < 0 ? 0 : p.passive <= 0 ? 1 : p.passive < p.expenses * 0.5 ? 2 : p.passive < p.expenses ? 3 : 4;

export type Quadrant = "star" | "cow" | "question" | "dog";
export interface Dupont { income: number; profit: number; assets: number; equity: number; netMargin: number | null; assetTurn: number | null; leverage: number | null; roe: number | null }
export interface BcgItem { code: string; name?: string; share: number; yieldPct: number; price: number; income: number; quadrant: Quadrant }
export interface RiskReturn { debtShare: number | null; yieldPct: number | null }
export interface AnsoffCounts { penetration: number; channel: number; product: number; diversification: number }
export interface CyclePhases { before: number; during: number; after: number; crisisStart: number | null; crisisEnd: number | null }
export interface Disposition { soldAtLoss: number; soldAtPar: number; soldAtGain: number; held: number; heldAvgYield: number | null }
export interface SuccessPoint { growth: number | null; drawdown: number }
export interface Funnel { shown: number; accepted: number; purchased: number; paidBack: number }
export type SwotKey = "s_passive" | "s_quiz" | "s_flow" | "w_debt" | "w_auto" | "w_passive" | "o_cash" | "o_noassets" | "o_crisis" | "t_unemployed" | "t_crisis" | "t_restart";
export interface SwotItem { key: SwotKey; params: Record<string, number> }
export type Style = "active" | "balanced" | "careful";

export interface LivePlayer {
  id: string; bot: boolean; rank: number; circle: PlayerReport["circle"]; outcome: PlayerReport["outcome"]; months: number; turns: number;
  final: PlayerReport["final"]; series: TimePoint[]; decisions: PlayerReport["decisions"]; spending: PlayerReport["spending"]; quiz: PlayerReport["quiz"]; risks: PlayerReport["risks"];
  assets: AssetRecord[]; moments: PlayerReport["moments"]; insights: PlayerReport["insights"]; exit: PlayerReport["exit"]; big: PlayerReport["big"];
  level: LiteracyLevel; quizPct: number | null; acceptPct: number | null; style: Style;
  dupont: Dupont; bcg: BcgItem[]; riskReturn: RiskReturn; ansoff: AnsoffCounts; cycle: CyclePhases; disposition: Disposition; success: SuccessPoint; funnel: Funnel; swot: SwotItem[];
  levels: { month: number; level: LiteracyLevel }[];
}
export interface LiveGroup {
  medianDebtShare: number | null; medianYield: number | null; medianGrowth: number | null; medianDrawdown: number | null; medianAccept: number | null;
  crisisShare: { month: number; share: number }[];                  // inqirozdagi o'yinchilar ulushi (bozor holati)
  volume: { from: number; to: number; bought: number; sold: number }[]; // davrlar bo'yicha xarid va sotuv (6 oylik)
  levelAvg: { month: number; avg: number }[];                       // guruhning o'rtacha savodxonlik darajasi
  kinds: { kind: string; held: number; bought: number; sold: number }[];
  channels: Record<AssetChannel, number>;
}
export interface LiveAnalytics { meta: { rounds: number; turns: number; months: number; mode: string; winner: string | null; players: number }; players: LivePlayer[]; group: LiveGroup }

const median = (a: number[]): number | null => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y), n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; };
const r1 = (n: number) => Math.round(n * 10) / 10, r2 = (n: number) => Math.round(n * 100) / 100;
const held = (p: PlayerReport) => p.assets.filter((a) => a.status === "held");

export function dupontOf(p: PlayerReport): Dupont {
  const f = p.final, income = (f.salary + f.passive) * 12, profit = f.cashflow * 12, equity = f.netWorth, assets = f.netWorth + f.debt;
  const lev = equity > 0 ? assets / equity : null, turn = assets > 0 ? income / assets : null, margin = income > 0 ? profit / income : null;
  return { income, profit, assets, equity, netMargin: margin === null ? null : r2(margin), assetTurn: turn === null ? null : r2(turn), leverage: lev === null ? null : r2(lev), roe: equity > 0 ? r2(profit / equity) : null };
}
export function bcgOf(p: PlayerReport): BcgItem[] {
  const h = held(p).filter((a) => a.income > 0 && a.price > 0); if (!h.length) return [];
  const tot = h.reduce((x, a) => x + a.income, 0), portYield = (h.reduce((x, a) => x + a.income, 0) * 12) / h.reduce((x, a) => x + a.price, 0) * 100;
  return h.map((a) => { const share = a.income / tot, y = (a.income * 12) / a.price * 100; const hiS = share >= 1 / h.length, hiY = y >= portYield;
    return { code: a.code, name: a.name, share: r2(share), yieldPct: r1(y), price: a.price, income: a.income, quadrant: (hiS ? (hiY ? "star" : "cow") : hiY ? "question" : "dog") as Quadrant }; });
}
export function riskReturnOf(p: PlayerReport): RiskReturn {
  const h = held(p).filter((a) => a.price > 0), price = h.reduce((x, a) => x + a.price, 0), assets = p.final.netWorth + p.final.debt;
  return { debtShare: assets > 0 ? r2(p.final.debt / assets) : null, yieldPct: price > 0 ? r1((h.reduce((x, a) => x + a.income, 0) * 12) / price * 100) : null };
}
/** Ansoff: «mahsulot» — aktiv turi, «bozor» — sotib olish yo'li (odatiy karta yoki yangi yo'l: bozor, auksion, sheriklik). */
export function ansoffOf(p: PlayerReport): AnsoffCounts {
  const c: AnsoffCounts = { penetration: 0, channel: 0, product: 0, diversification: 0 }, seen = new Set<string>();
  for (const a of [...p.assets].sort((x, y) => x.boughtMonth - y.boughtMonth)) { const known = seen.has(a.kind), fresh = (a.channel ?? "karta") !== "karta"; seen.add(a.kind); c[known ? (fresh ? "channel" : "penetration") : (fresh ? "diversification" : "product")]++; }
  return c;
}
export function cycleOf(p: PlayerReport): CyclePhases {
  const start = p.moments.find((m) => m.kind === "crisis")?.month ?? (p.risks.crisisMonths > 0 ? 0 : null), end = start === null ? null : start + p.risks.crisisMonths;
  const out: CyclePhases = { before: 0, during: 0, after: 0, crisisStart: start, crisisEnd: end };
  for (const a of p.assets) { if (start === null || a.boughtMonth < start) out.before++; else if (a.boughtMonth < (end ?? start)) out.during++; else out.after++; }
  return out;
}
export function dispositionOf(p: PlayerReport): Disposition {
  const sold = p.assets.filter((a) => a.status === "sold"), h = held(p).filter((a) => a.price > 0);
  return { soldAtLoss: sold.filter((a) => (a.soldRatio ?? 1) < 1).length, soldAtPar: sold.filter((a) => (a.soldRatio ?? 1) === 1).length, soldAtGain: sold.filter((a) => (a.soldRatio ?? 1) > 1).length,
    held: h.length, heldAvgYield: h.length ? r1(h.reduce((x, a) => x + (a.income * 12) / a.price * 100, 0) / h.length) : null };
}
export function successOf(p: PlayerReport): SuccessPoint {
  const s = p.series; let peak = -Infinity, dd = 0; for (const x of s) { peak = Math.max(peak, x.netWorth); if (peak > 0) dd = Math.max(dd, (peak - x.netWorth) / peak); }
  const a = s[0]?.netWorth ?? 0, b = s[s.length - 1]?.netWorth ?? 0; return { growth: s.length > 1 ? r2((b - a) / Math.max(1, Math.abs(a))) : null, drawdown: r2(dd) };
}
export function funnelOf(p: PlayerReport): Funnel {
  const paid = held(p).filter((a) => a.paybackMonths !== null && p.months - a.boughtMonth >= a.paybackMonths).length;
  return { shown: p.decisions.shown, accepted: p.decisions.accepted, purchased: p.spending.purchases, paidBack: paid };
}
export function swotOf(p: PlayerReport): SwotItem[] {
  const f = p.final, o: SwotItem[] = [], add = (key: SwotKey, params: Record<string, number> = {}) => o.push({ key, params });
  const cover = f.expenses > 0 ? Math.round((f.passive / f.expenses) * 100) : 0, assets = f.netWorth + f.debt;
  if (f.passive >= f.expenses * 0.5 && f.passive > 0) add("s_passive", { pct: cover });
  if (p.quiz.answered >= 2 && p.quiz.correct / p.quiz.answered >= 0.6) add("s_quiz", { pct: Math.round((p.quiz.correct / p.quiz.answered) * 100) });
  if (f.cashflow > 0) add("s_flow", { value: f.cashflow });
  if (assets > 0 && f.debt > assets * 0.5) add("w_debt", { pct: Math.round((f.debt / assets) * 100) });
  if (p.decisions.auto > 0) add("w_auto", { n: p.decisions.auto });
  if (f.passive < f.expenses * 0.5) add("w_passive", { pct: cover });
  if (f.cash > f.expenses * 3 && p.circle === "small") add("o_cash", { value: f.cash });
  if (!held(p).length && p.circle === "small") add("o_noassets");
  if (p.risks.crisisMonths > 0) add("o_crisis");
  if (p.risks.unemployedMonths > 0) add("t_unemployed", { n: p.risks.unemployedMonths });
  if (p.risks.crisisMonths > 0) add("t_crisis", { n: p.risks.crisisMonths });
  if (p.risks.restarts > 0) add("t_restart", { n: p.risks.restarts });
  return o;
}
const levelsOf = (p: PlayerReport) => p.series.map((x) => ({ month: x.month, level: levelOf(x) }));
const accept = (p: PlayerReport) => (p.decisions.shown > 0 ? p.decisions.accepted / p.decisions.shown : null);

export function buildLive(rep: GameReport): LiveAnalytics {
  const accs = rep.players.map(accept).filter((x): x is number => x !== null), medAcc = median(accs), sorted = [...accs].sort((x, y) => x - y), third = Math.floor(sorted.length / 3);
  const lowCut = third >= 1 ? sorted[third - 1] : null, topCut = third >= 1 ? sorted[sorted.length - third] : null; // guruhning pastki va yuqori uchdan biri (qo'lda berilgan chegara yo'q)
  const styleOf = (x: number | null): Style => (x === null || lowCut === null || topCut === null || medAcc === null ? "balanced" : x >= topCut && x > medAcc ? "active" : x <= lowCut && x < medAcc ? "careful" : "balanced");
  const players: LivePlayer[] = rep.players.map((p) => {
    const lv = levelsOf(p), last = lv[lv.length - 1]?.level ?? 0, a = accept(p);
    return { id: p.id, bot: p.bot, rank: p.rank, circle: p.circle, outcome: p.outcome, months: p.months, turns: p.turns, final: p.final, series: p.series, decisions: p.decisions, spending: p.spending, quiz: p.quiz,
      risks: p.risks, assets: p.assets, moments: p.moments, insights: p.insights, exit: p.exit, big: p.big, level: last, quizPct: p.quiz.answered > 0 ? Math.round((p.quiz.correct / p.quiz.answered) * 100) : null,
      acceptPct: a === null ? null : Math.round(a * 100), style: styleOf(a), dupont: dupontOf(p), bcg: bcgOf(p), riskReturn: riskReturnOf(p), ansoff: ansoffOf(p), cycle: cycleOf(p), disposition: dispositionOf(p),
      success: successOf(p), funnel: funnelOf(p), swot: swotOf(p), levels: lv };
  });
  const months = rep.months, allMonths = [...new Set(rep.players.flatMap((p) => p.series.map((x) => x.month)))].sort((a, b) => a - b);
  const levelAt = (p: PlayerReport, m: number) => { let l: LiteracyLevel = 0; for (const x of p.series) { if (x.month > m) break; l = levelOf(x); } return l; };
  const crisisAt = (p: LivePlayer, m: number) => p.cycle.crisisStart !== null && m >= p.cycle.crisisStart && m < (p.cycle.crisisEnd ?? p.cycle.crisisStart);
  const step = Math.max(1, Math.ceil(allMonths.length / 60)), sample = allMonths.filter((_, i) => i % step === 0 || i === allMonths.length - 1);
  const volume: LiveGroup["volume"] = []; for (let from = 1; from <= Math.max(1, months); from += 6) { const to = from + 5; volume.push({ from, to, bought: rep.players.reduce((n, p) => n + p.assets.filter((a) => a.boughtMonth >= from && a.boughtMonth <= to).length, 0), sold: rep.players.reduce((n, p) => n + p.assets.filter((a) => a.soldMonth !== undefined && a.soldMonth >= from && a.soldMonth <= to).length, 0) }); }
  const kinds = new Map<string, { held: number; bought: number; sold: number }>(); const channels: Record<AssetChannel, number> = { karta: 0, bozor: 0, auksion: 0, sherik: 0 };
  for (const p of rep.players) for (const a of p.assets) { const k = kinds.get(a.kind) ?? { held: 0, bought: 0, sold: 0 }; k.bought++; if (a.status === "held") k.held++; if (a.status === "sold") k.sold++; kinds.set(a.kind, k); channels[a.channel ?? "karta"]++; }
  const group: LiveGroup = {
    medianDebtShare: median(players.map((p) => p.riskReturn.debtShare).filter((x): x is number => x !== null)), medianYield: median(players.map((p) => p.riskReturn.yieldPct).filter((x): x is number => x !== null)),
    medianGrowth: median(players.map((p) => p.success.growth).filter((x): x is number => x !== null)), medianDrawdown: median(players.map((p) => p.success.drawdown)), medianAccept: medAcc,
    crisisShare: sample.map((m) => ({ month: m, share: players.length ? r2(players.filter((p) => crisisAt(p, m)).length / players.length) : 0 })), volume,
    levelAvg: sample.map((m) => ({ month: m, avg: players.length ? r2(rep.players.reduce((x, p) => x + levelAt(p, m), 0) / players.length) : 0 })),
    kinds: [...kinds.entries()].map(([kind, v]) => ({ kind, ...v })).sort((a, b) => b.bought - a.bought), channels,
  };
  return { meta: { rounds: rep.rounds, turns: rep.turns, months, mode: rep.mode, winner: rep.winner, players: rep.players.length }, players, group };
}

/** Muvaffaqiyat matritsasi: guruh medianasiga nisbatan (qo'lda berilgan chegara yo'q). */
export type SuccessClass = "success" | "lucky" | "stable" | "fail" | "unknown";
export function successClass(s: SuccessPoint, g: Pick<LiveGroup, "medianGrowth" | "medianDrawdown">): SuccessClass {
  if (s.growth === null || g.medianGrowth === null || g.medianDrawdown === null) return "unknown";
  const hiG = s.growth >= g.medianGrowth, hiD = s.drawdown > g.medianDrawdown;
  return hiG ? (hiD ? "lucky" : "success") : hiD ? "fail" : "stable";
}
