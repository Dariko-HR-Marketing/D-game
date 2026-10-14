// O'yin tahlili (SPEC §5.9, §12): urug' + harakatlar jurnalidan o'yinni qayta o'ynab, har bir aylana uchun ko'rsatkichlar va qarorlar statistikasini chiqaradi.
import { Action, Ctx, GameState, chooseDream, monthlyExpenses, newGame, passiveIncome, playerCashflow, reduce, totalDebt } from "./index";

export interface Init { playerIds: string[]; seed: number; bots: string[]; restricted: string[] }
export interface Point { round: number; cash: number; cashflow: number; passive: number; expenses: number; debt: number }
export interface GameEvent { round: number; player: string; kind: "bought" | "restart" | "exit" | "won" | "sold"; detail?: string }
export interface PlayerAnalysis {
  id: string; bot: boolean; series: Point[]; exitRound: number | null; restarts: number; peakCashflow: number; peakCash: number;
  decisions: { accepted: number; skipped: number }; assetsAtEnd: number;
}
export interface Analysis {
  rounds: number; turns: number; winner: string | null; players: PlayerAnalysis[]; events: GameEvent[];
  cards: Record<string, { shown: number; accepted: number; skipped: number }>;
}

/** `actions` — jurnaldagi harakatlar (avtomatik yozuvlar ham ichidagi harakat bilan). Noto'g'ri harakat — xato (jurnal buzilgan). */
export function analyzeGame(ctx: Ctx, init: Init, actions: Action[]): { analysis: Analysis; final: GameState } {
  let s = newGame(ctx, init.playerIds, init.seed, init.bots, init.restricted);
  s.players.forEach((p, i) => (s = chooseDream(s, p.id, i % ctx.dreams.length)));
  const pa = new Map<string, PlayerAnalysis>(s.players.map((p) => [p.id, { id: p.id, bot: init.bots.includes(p.id), series: [], exitRound: null, restarts: 0, peakCashflow: -Infinity, peakCash: -Infinity, decisions: { accepted: 0, skipped: 0 }, assetsAtEnd: 0 }]));
  const events: GameEvent[] = []; const cards: Analysis["cards"] = {}; let turns = 0;
  const point = (st: GameState) => {
    for (const p of st.players) {
      const a = pa.get(p.id)!; const cf = playerCashflow(p);
      a.series.push({ round: st.round, cash: Math.round(p.cash), cashflow: Math.round(cf), passive: Math.round(passiveIncome(p)), expenses: Math.round(monthlyExpenses(p)), debt: Math.round(totalDebt(p)) });
      a.peakCashflow = Math.max(a.peakCashflow, cf); a.peakCash = Math.max(a.peakCash, p.cash);
    }
  };
  point(s);
  for (const act of actions) {
    const prev = s; const pending = prev.pending;
    const o = reduce(prev, ctx, act);
    if (!o.ok) throw new Error(`jurnal buzilgan: ${act.type} → ${o.error}`);
    s = o.state;
    if (act.type === "roll") turns++;
    if (act.type === "decide" && pending) {
      const c = (cards[pending.cardId] ??= { shown: 0, accepted: 0, skipped: 0 }); c.shown++;
      const d = pa.get(act.playerId)!;
      if (act.accept) { c.accepted++; d.decisions.accepted++; } else { c.skipped++; d.decisions.skipped++; }
    }
    // Majburiy kartalar pending'siz qo'llanadi — "ko'rsatilgan" sifatida ham hisoblanadi
    for (const p of s.players) {
      const before = prev.players.find((x) => x.id === p.id)!;
      if (p.restarts > before.restarts) { pa.get(p.id)!.restarts = p.restarts; events.push({ round: s.round, player: p.id, kind: "restart" }); }
      if (before.circle === "small" && p.circle === "big") { pa.get(p.id)!.exitRound = s.round; events.push({ round: s.round, player: p.id, kind: "exit" }); }
      if (p.assets.length > before.assets.length) events.push({ round: s.round, player: p.id, kind: "bought", detail: p.assets[p.assets.length - 1].code });
      if (p.assets.length < before.assets.length && p.restarts === before.restarts) events.push({ round: s.round, player: p.id, kind: "sold" });
    }
    if (!prev.winner && s.winner) events.push({ round: s.round, player: s.winner, kind: "won" });
    if (s.round !== prev.round || s.winner) point(s);
  }
  for (const p of s.players) pa.get(p.id)!.assetsAtEnd = p.assets.length;
  const players = [...pa.values()].map((a) => ({ ...a, peakCashflow: Number.isFinite(a.peakCashflow) ? Math.round(a.peakCashflow) : 0, peakCash: Number.isFinite(a.peakCash) ? Math.round(a.peakCash) : 0 }));
  return { analysis: { rounds: s.round, turns, winner: s.winner, players, events, cards }, final: s };
}
