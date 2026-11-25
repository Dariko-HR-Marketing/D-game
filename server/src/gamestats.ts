// O'yin ichidagi hodisalar bo'yicha shaxssiz jamlama: katak tushish chastotasi, kichik aylanadan chiqish, bankrotlikdan oldingi karta, kasb bo'yicha g'alaba.
// Tugagan o'yin jurnalidan qayta o'ynab hisoblanadi (analysis.recordGame); shaxsiy identifikator saqlanmaydi.
import { Collection, type DocStore } from "./docs";
import { WriteQueue } from "./persist";

export interface GameAgg {
  games: number;
  cells: { small: Record<string, number>; big: Record<string, number> }; // katak raqami → tushishlar
  exits: { n: number; byRound: Record<string, number>; byCell: Record<string, number>; notExited: number };
  bankrupt: { n: number; byCard: Record<string, number> };
  jobs: Record<string, { games: number; wins: number }>; // kasb almashtirmagan o'yinchilar bo'yicha
  dreams?: Record<string, { games: number; wins: number }>; // tanlangan orzu bo'yicha
}
const empty = (): GameAgg => ({ games: 0, cells: { small: {}, big: {} }, exits: { n: 0, byRound: {}, byCell: {}, notExited: 0 }, bankrupt: { n: 0, byCard: {} }, jobs: {} });
export const roundBucket = (r: number) => (r >= 45 ? "45+" : `${Math.floor(r / 5) * 5}–${Math.floor(r / 5) * 5 + 4}`);

export class GameStats {
  readonly queue = new WriteQueue(); private col: Collection<GameAgg>;
  agg: GameAgg = empty();
  constructor(store?: DocStore) { this.col = new Collection("gamestat", store, this.queue); }
  async load() { await this.col.load(); const saved = this.col.get("all"); if (saved && !this.agg.games) Object.assign(this.agg, saved); return this; }
  private save() { this.col.set("all", this.agg); }
  /** Bir o'yinning natijasini qo'shadi. `events` — o'yin tarixi, `players` — oxirgi holat. */
  add(g: {
    moves: { player: string; round: number; fromCircle: "small" | "big"; toCircle: "small" | "big"; to: number; cellType: string }[];
    restarts: { player: string; card: string | null }[]; players: { id: string; bot: boolean; job: string; dream?: string; restarts: number; won: boolean; exited: boolean }[];
  }) {
    const a = this.agg; a.games++; const inc = (o: Record<string, number>, k: string, n = 1) => { o[k] = (o[k] ?? 0) + n; };
    for (const m of g.moves) inc(a.cells[m.toCircle], String(m.to));
    const done = new Set<string>();
    for (const m of g.moves) if (m.fromCircle === "small" && m.toCircle === "big" && !done.has(m.player)) { done.add(m.player); a.exits.n++; inc(a.exits.byRound, roundBucket(m.round)); inc(a.exits.byCell, m.cellType); }
    for (const p of g.players) if (!p.bot && !done.has(p.id)) a.exits.notExited++;
    for (const r of g.restarts) { a.bankrupt.n++; if (r.card) inc(a.bankrupt.byCard, r.card); }
    for (const p of g.players) if (!p.bot && p.restarts === 0 && p.job) { const j = (a.jobs[p.job] ??= { games: 0, wins: 0 }); j.games++; if (p.won) j.wins++; }
    for (const p of g.players) if (!p.bot && p.dream) { const dr = ((a.dreams ??= {})[p.dream] ??= { games: 0, wins: 0 }); dr.games++; if (p.won) dr.wins++; }
    this.save();
  }
}
