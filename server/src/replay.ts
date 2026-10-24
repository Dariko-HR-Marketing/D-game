// O'yin jurnalini qadam-baqadam qayta o'ynash (admin tekshiruvi): har qadamdan keyingi holatning qisqa ko'rinishi.
import { chooseDream, newGame, playerCashflow, reduce, type Action, type Ctx, type GameState } from "@poyga/rules";
import type { JournalEntry } from "./store";

export interface ReplayStep { i: number; seq: number; at: number; type: string; by: string | null; auto: string | null; ok: boolean; error?: string; round: number; phase: string; turn: string | null;
  players: { id: string; cash: number; cashflow: number; pos: number; circle: string; assets: number; debt: number; restarts: number }[] }
const brief = (s: GameState) => s.players.map((p) => ({ id: p.id, cash: Math.round(p.cash), cashflow: Math.round(playerCashflow(p)), pos: p.pos, circle: p.circle, assets: p.assets.length, debt: Math.round((p.bankDebt ?? 0) + (p.owe ?? 0) + (p.bigDebt ?? 0)), restarts: p.restarts }));

export function replay(ctx: Ctx, final: GameState, journal: JournalEntry[], cap = 3000): { steps: ReplayStep[]; truncated: boolean; winner: string | null; players: string[] } {
  let s = newGame(ctx, final.players.map((p) => p.id), final.seed, final.bots, final.restricted ?? [], { dreamPhase: !!final.dreamPhase, events: !!final.events, openingDice: !!final.openingDice, mode: final.mode, recapPause: !!final.recapPause });
  if (!final.dreamPhase) s.players.forEach((p, i) => (s = chooseDream(s, p.id, i % ctx.dreams.length)));
  const steps: ReplayStep[] = [{ i: 0, seq: 0, at: 0, type: "start", by: null, auto: null, ok: true, round: s.round, phase: s.phase, turn: s.players[s.turn % s.players.length]?.id ?? null, players: brief(s) }];
  const list = journal.slice(0, cap);
  for (const [k, e] of list.entries()) {
    const auto = "reason" in e.action ? e.action.reason : null; const act = ("reason" in e.action ? e.action.action : e.action) as Action;
    const o = reduce(s, ctx, act); if (o.ok) s = o.state;
    steps.push({ i: k + 1, seq: e.seq, at: e.at, type: act.type, by: (act as { playerId?: string }).playerId ?? null, auto, ok: o.ok, error: o.ok ? undefined : String(o.error), round: s.round, phase: s.phase, turn: s.players[s.turn % s.players.length]?.id ?? null, players: brief(s) });
  }
  return { steps, truncated: journal.length > cap, winner: s.winner ?? null, players: s.players.map((p) => p.id) };
}
