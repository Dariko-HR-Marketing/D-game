// O'yin tahlili va karta statistikasi: jurnaldan qayta o'ynab hisoblanadi (§5.9, §12).
import { analyzeGame, type Action, type Analysis, type GameState } from "@poyga/rules";
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
    const { analysis } = analyzeGame(ctx, { playerIds: state.players.map((p: any) => p.id), seed: state.seed, bots: state.bots, restricted: state.restricted ?? [] }, actions);
    return { analysis, state };
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
  const label = new Map<string, string>(); let n = 0;
  const nm = (id: string, bot: boolean) => label.get(id) ?? (label.set(id, id === me ? "Siz" : bot ? "Bot" : nameOf(id) ?? `O'yinchi ${++n}`), label.get(id)!);
  const bots = new Map(a.players.map((p) => [p.id, p.bot]));
  return {
    ...a, winner: a.winner ? nm(a.winner, !!bots.get(a.winner)) : null,
    players: a.players.map((p) => ({ ...p, id: nm(p.id, p.bot), isMe: p.id === me })),
    events: a.events.map((e) => ({ ...e, player: nm(e.player, !!bots.get(e.player)) })),
    cards: undefined,
  };
}
