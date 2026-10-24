import { buildHistory, type History } from "./history";
// O'yin tahlili va karta statistikasi: jurnaldan qayta o'ynab hisoblanadi (§5.9, §12).
import { analyzeGame, buildReport, type Action, type Analysis, type GameReport, type GameState, type PlayerReport } from "@poyga/rules";
import type { ContentRegistry } from "./registry";
import type { Store } from "./store";
import type { WriteQueue } from "./persist";

export type CardStat = { shown: number; accepted: number; skipped: number };
export interface StatsPersist { loadCardStats(): Promise<Record<string, CardStat>>; addCardStats(delta: Record<string, CardStat>): Promise<void> }

export class AnalysisService {
  cardStats: Record<string, CardStat> = {};
  private done = new Set<string>(); // xona bo'yicha bir marta hisoblanadi
  constructor(private store: Store, private registry: ContentRegistry, private writes: WriteQueue, private persist?: StatsPersist) {}
  static async restore(store: Store, registry: ContentRegistry, writes: WriteQueue, persist: StatsPersist) {
    const s = new AnalysisService(store, registry, writes, persist); s.cardStats = await persist.loadCardStats(); return s;
  }

  /** Tugagan yoki davom etayotgan o'yinning to'liq tahlili. `null` — xona/jurnal topilmadi. */
  async analyze(code: string): Promise<{ analysis: Analysis; state: GameState } | null> {
    const room = await this.store.loadRoom(code); if (!room) return null;
    const state = room.state, meta = room.meta;
    const ctx = this.registry.ctxFor(meta?.contentVersion ?? this.registry.activeVersion); if (!ctx) return null; // versiya noma'lum bo'lsa — faol versiya (taxmin)
    const journal = await this.store.journal(code);
    const actions = journal.map((e) => ("reason" in e.action ? e.action.action : e.action) as Action);
    const { analysis } = analyzeGame(ctx, { playerIds: state.players.map((p: any) => p.id), seed: state.seed, bots: state.bots, restricted: state.restricted ?? [], dreamPhase: !!state.dreamPhase, openingDice: !!state.openingDice, mode: state.mode, recapPause: !!state.recapPause }, actions);
    return { analysis, state };
  }

  /** O'yin tugagach har bir o'yinchi uchun to'liq hisobot (jurnaldan qayta o'ynab). `null` — xona/jurnal topilmadi. */
  async report(code: string, left: string[] = []): Promise<{ report: GameReport; state: GameState } | null> {
    const room = await this.store.loadRoom(code); if (!room) return null;
    const state = room.state, meta = room.meta;
    const ctx = this.registry.ctxFor(meta?.contentVersion ?? this.registry.activeVersion); if (!ctx) return null;
    const journal = await this.store.journal(code);
    const actions = journal.map((e) => ("reason" in e.action ? e.action.action : e.action) as Action);
    const report = buildReport(ctx, { playerIds: state.players.map((p: any) => p.id), seed: state.seed, bots: state.bots, restricted: state.restricted ?? [], dreamPhase: !!state.dreamPhase, openingDice: !!state.openingDice, mode: state.mode, recapPause: !!state.recapPause }, actions, { left });
    return { report, state };
  }

  /** Har bir amalning tarixi (katakdan-katakka, karta, qaror, pul o'zgarishi). */
  async history(code: string): Promise<{ history: History; state: GameState } | null> {
    const room = await this.store.loadRoom(code); if (!room) return null;
    const ctx = this.registry.ctxFor(room.meta?.contentVersion ?? this.registry.activeVersion); if (!ctx) return null;
    return { history: buildHistory(ctx, room.state, await this.store.journal(code)), state: room.state };
  }

  /** O'yin tugaganda: karta statistikasi umumiy hisobga qo'shiladi (shaxssiz). */
  async recordGame(code: string) {
    if (this.done.has(code)) return; this.done.add(code);
    const r = await this.analyze(code); if (!r) return;
    for (const [id, c] of Object.entries(r.analysis.cards)) {
      const t = (this.cardStats[id] ??= { shown: 0, accepted: 0, skipped: 0 }); t.shown += c.shown; t.accepted += c.accepted; t.skipped += c.skipped;
    }
    const delta = r.analysis.cards; this.writes.push(async () => this.persist?.addCardStats(delta));
  }

  /** Eng ko'p qabul / o'tkazilgan kartalar (admin analitikasi). */
  topCards(limit = 20) {
    const rows = Object.entries(this.cardStats).map(([id, c]) => ({ id, ...c, acceptRate: c.shown ? c.accepted / c.shown : 0 }));
    return rows.sort((a, b) => b.shown - a.shown).slice(0, limit);
  }
}

/** Mijozga: ID lar o'rniga ismlar (maxfiylik: boshqa o'yinchi — ism yoki "O'yinchi N"). */
export function presentable(a: Analysis, nameOf: (id: string) => string | undefined, me: string) {
  const label = new Map<string, string>(); let n = 0, nb = 0;
  const nm = (id: string, bot: boolean) => label.get(id) ?? (label.set(id, id === me ? "Siz" : bot ? `Bot ${++nb}` : nameOf(id) ?? `O'yinchi ${++n}`), label.get(id)!);
  const bots = new Map(a.players.map((p) => [p.id, p.bot]));
  return {
    ...a, winner: a.winner ? nm(a.winner, !!bots.get(a.winner)) : null,
    players: a.players.map((p) => ({ ...p, id: nm(p.id, p.bot), isMe: p.id === me })),
    events: a.events.map((e) => ({ ...e, player: nm(e.player, !!bots.get(e.player)) })),
    cards: undefined,
  };
}

export type PlayerSummary = Pick<PlayerReport, "id" | "bot" | "rank" | "outcome" | "circle" | "months" | "turns" | "final"> & {
  name: string; isMe: false; peakNetWorth: number; exitMonth: number | null; restarts: number; assets: number; decisions: { shown: number; accepted: number; skipped: number }; netWorthSeries: { month: number; netWorth: number }[];
};
/** Mijozga: ishtirokchining o'z hisoboti to'liq; boshqalar — qisqa xulosa (maxfiylik: ism yoki «Bot N» / «O'yinchi N»). `score` — faqat o'ziniki. */
export function presentReport(r: GameReport, nameOf: (id: string) => string | undefined, me: string, score: { points: { pos: number; neg: number }; xp: number | null } | null) {
  const label = new Map<string, string>(); let n = 0, nb = 0;
  const nm = (id: string, bot: boolean) => label.get(id) ?? (label.set(id, id === me ? nameOf(id) ?? "Siz" : bot ? `Bot ${++nb}` : nameOf(id) ?? `O'yinchi ${++n}`), label.get(id)!);
  for (const p of r.players) nm(p.id, p.bot); // tartib: o'yinchilar ro'yxati bo'yicha
  const mine = r.players.find((p) => p.id === me)!;
  const others: PlayerSummary[] = r.players.filter((p) => p.id !== me).map((p) => ({
    id: label.get(p.id)!, name: label.get(p.id)!, isMe: false, bot: p.bot, rank: p.rank, outcome: p.outcome, circle: p.circle, months: p.months, turns: p.turns, final: p.final,
    peakNetWorth: p.peaks.netWorth.value, exitMonth: p.exit.month, restarts: p.risks.restarts, assets: p.assets.length, decisions: { shown: p.decisions.shown, accepted: p.decisions.accepted, skipped: p.decisions.skipped },
    netWorthSeries: p.series.map((x) => ({ month: x.month, netWorth: x.netWorth })),
  }));
  return {
    meta: { rounds: r.rounds, turns: r.turns, months: r.months, mode: r.mode, endReason: r.endReason, winner: r.winner ? label.get(r.winner) ?? null : null, players: r.players.length },
    me: { ...mine, id: "me", name: label.get(me)!, score }, others, ranking: r.ranking.map((id) => (id === me ? "me" : label.get(id)!)),
  };
}

const q = (v: unknown) => { const t = String(v ?? ""); return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
/** Hisobot CSV (Excel/tahlil uchun): bo'limlar `section` ustunida — summary, series, assets, moments, insights. */
export function reportCsv(rep: ReturnType<typeof presentReport>): string {
  const m = rep.me, rows: unknown[][] = [["section", "a", "b", "c", "d", "e", "f", "g"]];
  rows.push(["summary", "o'yinchi", m.name, "reyting", m.rank, "natija", m.outcome, ""]);
  rows.push(["summary", "oylar", m.months, "navbatlar", m.turns, "aylana", m.circle, ""]);
  for (const [k, v] of Object.entries(m.final)) rows.push(["final", k, v]);
  rows.push(["header", "oy", "naqd", "pul_oqimi", "passiv", "xarajat", "qarz", "sof_boylik"]);
  for (const x of m.series) rows.push(["series", x.month, x.cash, x.cashflow, x.passive, x.expenses, x.debt, x.netWorth]);
  rows.push(["header", "kod", "nomi", "olingan_oy", "to'langan", "oylik_daromad", "qoplanish_oy", "holat"]);
  for (const a of m.assets) rows.push(["assets", a.code, a.name ?? "", a.boughtMonth, a.paid, a.income, a.paybackMonths ?? "", a.status]);
  rows.push(["header", "oy", "tur", "matn", "summa"]);
  for (const x of m.moments) rows.push(["moments", x.month, x.kind, x.text ?? "", x.amount ?? ""]);
  rows.push(["header", "kalit", "daraja", "parametrlar"]);
  for (const x of m.insights) rows.push(["insights", x.key, x.level, JSON.stringify(x.params)]);
  return "\ufeff" + rows.map((r) => r.map(q).join(",")).join("\r\n") + "\r\n";
}
