// O'yin tugagach har bir o'yinchi uchun to'liq tahlil hisoboti: urug' + harakatlar jurnalidan o'yinni qayta o'ynab (analyzeGame kabi) hisoblanadi.
// Hamma raqam dvigatel holatidan olinadi (taxmin yo'q); tavsiyalar (insights) faqat shu raqamlar va SPEC chegaralariga tayanadi. Matnlar mijozda (i18n): bu yerda faqat kalit va parametrlar.
import { Action, Ctx, GameMode, GameState, GamePlayer, MODES, RULES, chooseDream, modeOf, monthlyExpenses, newGame, passiveIncome, playerCashflow, reduce, salaryOf, totalDebt, openPartnerships, allDebt } from "./index";
import type { Init } from "./analysis";

export type DeckGroup = "invest" | "market" | "expense" | "event" | "other";
export interface TimePoint { month: number; cash: number; cashflow: number; passive: number; expenses: number; debt: number; netWorth: number }
export interface AssetRecord { code: string; name?: string; kind: string; boughtMonth: number; paid: number; price: number; income: number; paybackMonths: number | null; status: "held" | "sold" | "handed" | "lost" }
export type MomentKind = "exit" | "restart" | "bought" | "sold" | "won" | "crisis" | "loan" | "expense" | "time_up" | "autopilot";
export interface Moment { month: number; round: number; kind: MomentKind; text?: string; amount?: number }
export interface Peak { value: number; month: number }
export type InsightKey =
  | "won" | "time_up" | "exit_done" | "exit_blocked_cash" | "exit_blocked_passive" | "exit_blocked_debt" | "exit_blocked_partner" | "no_passive" | "passive_growth"
  | "many_skipped" | "all_accepted" | "autopilot" | "restarts" | "debt_end" | "big_expense" | "quiz_good" | "quiz_low" | "negative_flow" | "big_progress" | "left_game";
export interface Insight { key: InsightKey; level: "good" | "info" | "warn"; params: Record<string, number | string> }
export interface ExitProgress { cash: { value: number; need: number }; passive: { value: number; need: number }; debt: { value: number }; partnerships: { value: number } }
export interface BigProgress { cashflow: { value: number; need: number }; cash: { value: number; need: number | null }; dream: string | null }

export interface PlayerReport {
  id: string; bot: boolean; rank: number; outcome: "won" | "big" | "small";
  circle: "small" | "big"; months: number; turns: number;
  final: { cash: number; salary: number; passive: number; expenses: number; cashflow: number; debt: number; netWorth: number };
  series: TimePoint[]; peaks: { cash: Peak; cashflow: Peak; passive: Peak; netWorth: Peak; lowCash: Peak };
  exit: { month: number | null; progress: ExitProgress | null }; big: BigProgress | null;
  decisions: { shown: number; accepted: number; skipped: number; auto: number; forced: number; byGroup: Record<DeckGroup, { shown: number; accepted: number; skipped: number; forced: number }> }; // shown = ixtiyoriy qarorlar (qabul + o'tkazish); forced = majburiy kartalar (qaror emas)
  spending: { expenseCards: number; expenseTotal: number; biggest: { amount: number; text?: string; month: number } | null; purchases: number; purchaseTotal: number; sales: number; bankLoans: number };
  quiz: { answered: number; correct: number };
  risks: { restarts: number; crisisMonths: number; unemployedMonths: number };
  assets: AssetRecord[]; moments: Moment[]; insights: Insight[];
}
export interface GameReport {
  rounds: number; turns: number; months: number; winner: string | null; mode: GameMode; endReason: "win" | "time" | null;
  players: PlayerReport[]; ranking: string[];
}

const GROUP: Record<string, DeckGroup> = { kichik: "invest", katta: "invest", bozor: "market", xar: "expense", kxar: "expense", hod: "event" };
const g0 = () => ({ shown: 0, accepted: 0, skipped: 0, forced: 0 });
const emptyGroups = (): PlayerReport["decisions"]["byGroup"] => ({ invest: g0(), market: g0(), expense: g0(), event: g0(), other: g0() });
const first = (t: string | undefined, n = 80) => { if (!t) return undefined; const s = t.replace(/\s+/g, " ").trim(); const m = /^(.+?[.!?])(\s|$)/.exec(s); const x = m ? m[1] : s; return x.length > n ? x.slice(0, n - 1) + "…" : x; };
const netWorth = (p: GamePlayer) => Math.round(p.cash + p.assets.reduce((s, a) => s + a.price, 0) - totalDebt(p) - (p.handDebts ?? []).reduce((s, d) => s + d.amount, 0));
const pointOf = (p: GamePlayer): TimePoint => ({ month: p.monthsPlayed ?? 0, cash: Math.round(p.cash), cashflow: Math.round(playerCashflow(p)), passive: Math.round(passiveIncome(p)), expenses: Math.round(monthlyExpenses(p)), debt: Math.round(totalDebt(p)), netWorth: netWorth(p) });
const peak = (series: TimePoint[], key: keyof TimePoint, dir: 1 | -1): Peak => { let best = series[0]; for (const x of series) if (dir * (x[key] as number) > dir * (best[key] as number)) best = x; return { value: best[key] as number, month: best.month }; };

/** Jurnaldan to'liq hisobot. Noto'g'ri harakat — xato (jurnal buzilgan). */
export function buildReport(ctx: Ctx, init: Init, actions: Action[], opts: { left?: string[] } = {}): GameReport {
  let s = newGame(ctx, init.playerIds, init.seed, init.bots, init.restricted, { dreamPhase: !!init.dreamPhase, openingDice: !!init.openingDice, mode: init.mode });
  if (!init.dreamPhase) s.players.forEach((p, i) => (s = chooseDream(s, p.id, i % ctx.dreams.length)));
  type Acc = { series: TimePoint[]; turns: number; groups: PlayerReport["decisions"]["byGroup"]; auto: number; exitMonth: number | null; assets: AssetRecord[]; moments: Moment[]; expenses: { amount: number; text?: string; month: number }[]; quiz: { answered: number; correct: number }; purchases: number; purchaseTotal: number; sales: number; bankLoans: number; crisisMonths: number; unemployed: number; lastCrisis: number };
  const acc = new Map<string, Acc>(s.players.map((p) => [p.id, { series: [pointOf(p)], turns: 0, groups: emptyGroups(), auto: 0, exitMonth: null, assets: [], moments: [], expenses: [], quiz: { answered: 0, correct: 0 }, purchases: 0, purchaseTotal: 0, sales: 0, bankLoans: 0, crisisMonths: 0, unemployed: 0, lastCrisis: 0 }]));
  const open = new Map<string, AssetRecord[]>(); // hozir egalik qilinayotgan (kod bo'yicha) yozuvlar
  let totalTurns = 0, lastCardN = (s.lastCard as any)?.n ?? 0, lastQuizN = (s.lastQuiz as any)?.n ?? 0;
  const monthOf = (st: GameState, id: string) => st.players.find((p) => p.id === id)?.monthsPlayed ?? 0;
  for (const act of actions) {
    const prev = s, pending = prev.pending;
    const o = reduce(prev, ctx, act); if (!o.ok) throw new Error(`jurnal buzilgan: ${act.type} → ${o.error}`);
    s = o.state;
    if (act.type === "roll") { totalTurns++; const a = acc.get(act.playerId); if (a) a.turns++; }
    if ((act.type === "roll" || act.type === "decide") && (act as any).auto) { const a = acc.get(act.playerId); if (a) { a.auto++; a.moments.push({ month: monthOf(s, act.playerId), round: s.round, kind: "autopilot" }); } }
    if (act.type === "decide" && pending && acc.has(act.playerId)) {
      const a = acc.get(act.playerId)!, g = a.groups[GROUP[pending.deck] ?? (String(pending.cardId).startsWith("rent-") || String(pending.cardId).startsWith("big-") ? "invest" : "other")];
      g.shown++; if (act.accept) g.accepted++; else g.skipped++;
    }
    // Majburiy (kutilmagan, xarajat) kartalar pending'siz qo'llanadi: tortilgan karta bo'yicha hisob
    const lc = s.lastCard as { playerId: string; cardId: string; n: number } | null | undefined;
    if (lc && lc.n > lastCardN) {
      lastCardN = lc.n; const e = ctx.effects[lc.cardId]; const a = acc.get(lc.playerId);
      if (e && a) {
        const grp = GROUP[e.deck] ?? "other";
        if (e.mode === "mandatory") a.groups[grp].forced++;
        if (e.effect.kind === "pay") { const amount = (e.effect as { amount: number }).amount; a.expenses.push({ amount, text: first(e.text), month: monthOf(s, lc.playerId) }); }
      }
    }
    const lq = s.lastQuiz as { playerId: string; correct: boolean; n: number } | null | undefined;
    if (lq && lq.n > lastQuizN) { lastQuizN = lq.n; const a = acc.get(lq.playerId); if (a) { a.quiz.answered++; if (lq.correct) a.quiz.correct++; } }
    for (const p of s.players) {
      const before = prev.players.find((x) => x.id === p.id)!, a = acc.get(p.id)!, m = p.monthsPlayed ?? 0, r = s.round;
      if (m !== (before.monthsPlayed ?? 0)) {
        a.series.push(pointOf(p));
        if ((p.crisisMonths ?? 0) > 0) a.crisisMonths += m - (before.monthsPlayed ?? 0);
        if ((before.noSalary ?? 0) > 0 || (p.noSalary ?? 0) > 0) a.unemployed += Math.min(m - (before.monthsPlayed ?? 0), Math.max(before.noSalary ?? 0, p.noSalary ?? 0));
      }
      if (p.restarts > before.restarts) a.moments.push({ month: m, round: r, kind: "restart" });
      if (before.circle === "small" && p.circle === "big") { a.exitMonth = m; a.moments.push({ month: m, round: r, kind: "exit" }); }
      if ((p.crisisMonths ?? 0) > 0 && (before.crisisMonths ?? 0) === 0) a.moments.push({ month: m, round: r, kind: "crisis" });
      if (p.bankDebt > before.bankDebt && p.bankLoans.length > before.bankLoans.length) { a.bankLoans++; a.moments.push({ month: m, round: r, kind: "loan", amount: p.bankLoans[p.bankLoans.length - 1]?.amount }); }
      // Aktivlar: yangi sotib olingan va chiqib ketganlar
      const list = open.get(p.id) ?? []; open.set(p.id, list);
      if (p.assets.length > before.assets.length) {
        for (const x of p.assets.slice(before.assets.length)) {
          const card = pending ? ctx.effects[pending.cardId] : undefined;
          const rec: AssetRecord = { code: x.code, name: x.name ?? first(card?.text, 56), kind: x.kind, boughtMonth: m, paid: Math.max(0, x.price - x.credit), price: x.price, income: x.monthlyIncome, paybackMonths: x.monthlyIncome > 0 ? Math.ceil(Math.max(0, x.price - x.credit) / x.monthlyIncome) : null, status: "held" };
          a.assets.push(rec); list.push(rec); a.purchases++; a.purchaseTotal += rec.paid; a.moments.push({ month: m, round: r, kind: "bought", text: rec.name, amount: rec.paid });
        }
      } else if (p.assets.length < before.assets.length) {
        const gone = before.assets.filter((x) => !p.assets.some((y) => y.code === x.code && y.price === x.price && y.monthlyIncome === x.monthlyIncome));
        const why: AssetRecord["status"] = p.restarts > before.restarts ? "lost" : before.circle === "small" && p.circle === "big" ? "handed" : "sold";
        for (const x of gone) { const rec = list.find((q) => q.code === x.code && q.status === "held"); if (rec) rec.status = why; if (why === "sold") { a.sales++; a.moments.push({ month: m, round: r, kind: "sold", text: rec?.name ?? x.code }); } }
      }
    }
    if (!prev.winner && s.winner) acc.get(s.winner)!.moments.push({ month: monthOf(s, s.winner), round: s.round, kind: "won" });
  }
  const last = (a: Acc, p: GamePlayer) => { const pt = pointOf(p); const tail = a.series[a.series.length - 1]; if (!tail || tail.month !== pt.month || tail.cash !== pt.cash || tail.netWorth !== pt.netWorth) a.series.push(pt); };
  const mode = modeOf(s.mode), need = MODES[mode];
  // Reyting: g'olib → katta aylana → passiv daromad → naqd (server `placeOf` bilan bir xil tartib, lekin botlar ham ro'yxatda)
  const key = (p: GamePlayer) => [p.won ? 1 : 0, p.circle === "big" ? 1 : 0, p.assets.reduce((x, y) => x + y.monthlyIncome, 0), p.cash];
  const order = [...s.players].sort((p, q) => { const x = key(p), y = key(q); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return y[i] - x[i]; return 0; });
  const players: PlayerReport[] = s.players.map((p) => {
    const a = acc.get(p.id)!; last(a, p); const bot = init.bots.includes(p.id); const m = p.monthsPlayed ?? 0;
    const dec = { shown: 0, accepted: 0, skipped: 0, forced: 0 }; for (const g of Object.values(a.groups)) { dec.shown += g.shown; dec.accepted += g.accepted; dec.skipped += g.skipped; dec.forced += g.forced; }
    const expTotal = a.expenses.reduce((x, y) => x + y.amount, 0); const biggest = a.expenses.reduce<PlayerReport["spending"]["biggest"]>((b, x) => (!b || x.amount > b.amount ? x : b), null);
    const debt = allDebt(p) + (p.handDebts ?? []).reduce((x, y) => x + y.amount, 0);
    const exitProgress: ExitProgress | null = p.circle === "small" ? { cash: { value: Math.round(p.cash), need: need.exitCash }, passive: { value: Math.round(passiveIncome(p)), need: need.exitPassive }, debt: { value: Math.round(debt) }, partnerships: { value: openPartnerships(p) } } : null;
    const dream = p.dreamIdx !== null && p.dreamIdx !== undefined ? ctx.dreams[p.dreamIdx] : null;
    const bigProgress: BigProgress | null = p.circle === "big" ? { cashflow: { value: Math.round(Math.max(playerCashflow(p), p.lockedFlow)), need: RULES.winCashflow }, cash: { value: Math.round(p.cash), need: dream?.price ?? null }, dream: dream?.name ?? null } : null;
    const fin = pointOf(p);
    const rep: PlayerReport = {
      id: p.id, bot, rank: order.findIndex((x) => x.id === p.id) + 1, outcome: p.won ? "won" : p.circle === "big" ? "big" : "small", circle: p.circle, months: m, turns: a.turns,
      final: { cash: fin.cash, salary: Math.round(salaryOf(p)), passive: fin.passive, expenses: fin.expenses, cashflow: fin.cashflow, debt: fin.debt, netWorth: fin.netWorth },
      series: a.series, peaks: { cash: peak(a.series, "cash", 1), cashflow: peak(a.series, "cashflow", 1), passive: peak(a.series, "passive", 1), netWorth: peak(a.series, "netWorth", 1), lowCash: peak(a.series, "cash", -1) },
      exit: { month: a.exitMonth, progress: exitProgress }, big: bigProgress,
      decisions: { ...dec, auto: Math.max(a.auto, p.autos ?? 0), byGroup: a.groups },
      spending: { expenseCards: a.expenses.length, expenseTotal: expTotal, biggest, purchases: a.purchases, purchaseTotal: a.purchaseTotal, sales: a.sales, bankLoans: a.bankLoans },
      quiz: a.quiz, risks: { restarts: p.restarts, crisisMonths: a.crisisMonths, unemployedMonths: a.unemployed },
      assets: a.assets, moments: [], insights: [],
    };
    if (biggest) a.moments.push({ month: biggest.month, round: 0, kind: "expense", text: biggest.text, amount: biggest.amount });
    if (s.endReason === "time" && !s.winner) a.moments.push({ month: m, round: s.round, kind: "time_up" });
    rep.moments = a.moments.sort((x, y) => x.month - y.month || x.round - y.round).slice(0, 80);
    rep.insights = insightsOf(rep, mode, opts.left?.includes(p.id) ?? false, s.endReason ?? null);
    return rep;
  });
  const months = Math.max(0, ...players.map((x) => x.months));
  return { rounds: s.round, turns: totalTurns, months, winner: s.winner, mode, endReason: s.endReason ?? null, players, ranking: order.map((x) => x.id) };
}

/** Tavsiyalar: faqat o'yinchining o'z raqamlari va qoidalar chegaralari asosida (taxmin va yangi raqam yo'q). */
export function insightsOf(r: PlayerReport, mode: GameMode, left: boolean, endReason: "win" | "time" | null): Insight[] {
  const out: Insight[] = []; const add = (key: InsightKey, level: Insight["level"], params: Insight["params"] = {}) => out.push({ key, level, params });
  if (left) add("left_game", "warn");
  if (r.outcome === "won") add("won", "good", { month: r.months });
  else if (endReason === "time") add("time_up", "info");
  if (r.exit.month !== null) add("exit_done", "good", { month: r.exit.month });
  const ep = r.exit.progress;
  if (ep) {
    if (ep.cash.value < ep.cash.need) add("exit_blocked_cash", "info", { value: ep.cash.value, need: ep.cash.need });
    if (ep.passive.value < ep.passive.need) add("exit_blocked_passive", "info", { value: ep.passive.value, need: ep.passive.need });
    if (ep.debt.value > 0) add("exit_blocked_debt", "warn", { value: ep.debt.value });
    if (ep.partnerships.value > 0) add("exit_blocked_partner", "info", { value: ep.partnerships.value });
  }
  if (r.circle === "small" && r.final.passive === 0 && r.months >= 12) add("no_passive", "warn");
  else if (r.series.length > 1 && r.final.passive > 0 && r.peaks.passive.month > 0) add("passive_growth", "good", { value: r.final.passive, month: r.peaks.passive.month });
  const d = r.decisions;
  if (d.shown >= 8 && d.skipped / d.shown >= 0.7) add("many_skipped", "info", { skipped: d.skipped, shown: d.shown });
  if (d.shown >= 8 && d.skipped === 0) add("all_accepted", "info", { shown: d.shown });
  if (d.auto > 0) add("autopilot", "warn", { n: d.auto });
  if (r.risks.restarts > 0) add("restarts", "warn", { n: r.risks.restarts });
  if (r.final.debt > 0) add("debt_end", "warn", { value: r.final.debt });
  if (r.final.cashflow < 0) add("negative_flow", "warn", { value: r.final.cashflow });
  if (r.spending.biggest) add("big_expense", "info", { value: r.spending.biggest.amount, month: r.spending.biggest.month });
  if (r.quiz.answered >= 3) add(r.quiz.correct / r.quiz.answered >= 0.7 ? "quiz_good" : "quiz_low", r.quiz.correct / r.quiz.answered >= 0.7 ? "good" : "info", { correct: r.quiz.correct, answered: r.quiz.answered });
  if (r.big && !r.outcome.startsWith("won")) add("big_progress", "info", { flow: r.big.cashflow.value, need: r.big.cashflow.need });
  void mode;
  return out;
}
