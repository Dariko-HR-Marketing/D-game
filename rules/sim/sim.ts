// Balans simulyatsiyasi (SPEC §5.11, §13): bot siyosatlari bilan ko'p o'yin o'ynab, davomiylik va chiqish/g'alaba ulushini o'lchaydi.
// Ishga tushirish: npx tsx sim/sim.ts [o'yinlar_soni] [siyosat] [maks_navbat]
import { loadContent, deriveEffects } from "@poyga/content";
import { Ctx, GameState, Action, newGame, reduce, chooseDream, currentPlayer, effectOf, assetMatches, marketPrice, monthlyExpenses, passiveIncome, maxBankLoan, RULES } from "../src/index";

const { cards, bigBoard, dreams } = loadContent();
const fx = deriveEffects(cards);
const ids = (d: string) => fx.filter((e) => e.deck === d).map((e) => e.id);
const ctx: Ctx = { effects: Object.fromEntries(fx.map((e) => [e.id, e])), kasb: Object.fromEntries(cards.kasb.map((k) => [k.n, k])), bigBoard, dreams,
  deckIds: { kasb: ids("kasb"), kichik: ids("kichik"), katta: ids("katta"), bozor: ids("bozor"), xar: ids("xar"), kxar: ids("kxar"), hod: ids("hod") } };

type Policy = "passive" | "naive" | "smart";

/** Qaror qoidasi: kartadan oylik pul oqimiga qo'shiladigan foyda bo'lsa oladi (kreditni ehtiyotkorlik bilan). */
function decide(s: GameState, policy: Policy, me: any, e: any): { accept: boolean; useBank?: boolean; qty?: number } {
  if (policy === "passive") return { accept: false };
  if (policy === "naive") return { accept: e.kind !== "lendRequest", useBank: true };
  switch (e.kind) {
    case "gain": return { accept: true };
    case "courseSalaryPlus": return { accept: me.cash >= e.price && e.salaryPlus * 24 > e.price };
    case "buy": {
      const delta = (e.monthlyIncome ?? 0) + (e.creditPayment ?? 0); // creditPayment manfiy xarajat sifatida keladi
      if (delta <= 0) return { accept: false };
      const upfront = e.down ?? e.price;
      if (me.cash >= upfront * 1.2) return { accept: true };
      const need = upfront - me.cash, bankRoom = maxBankLoan(me);
      const pay = (need * (1 / 36 + 0.2 / 12)); // bank to'lovi
      return { accept: need <= bankRoom && delta > pay * 1.5, useBank: true };
    }
    default: return { accept: false };
  }
}

function sellAny(s: GameState, pid: string): Action | null {
  const me = s.players.find((p) => p.id === pid)!;
  for (const pr of s.proposals) {
    if (pr.kind !== "market" || pr.sold.includes(pid)) continue;
    const e = effectOf(ctx, pr.cardId).effect; if (e.kind !== "marketSale") continue;
    for (const a of me.assets) {
      if (!assetMatches(e.targets, a) || a.partnerId || a.stakeOf) continue;
      const price = marketPrice(e.amount, a); if (price === null) continue;
      if (a.monthlyIncome === 0 || price - a.credit > a.price * 1.2) return { type: "market_sell", playerId: pid, proposalId: pr.id };
    }
  }
  return null;
}

export interface Result { games: number; policy: Policy; turnsPerGame: number[]; exits: number; wins: number; players: number; restarts: number; exitRounds: number[]; stuckCash: number[] }

export function run(games: number, policy: Policy, maxTurns: number, seed0 = 1): Result {
  const r: Result = { games, policy, turnsPerGame: [], exits: 0, wins: 0, players: 0, restarts: 0, exitRounds: [], stuckCash: [] };
  for (let g = 0; g < games; g++) {
    const n = 2 + (g % 5);
    let s = newGame(ctx, Array.from({ length: n }, (_, i) => `p${i}`), seed0 + g);
    s.players.forEach((p, i) => (s = chooseDream(s, p.id, i % dreams.length)));
    const exitedAt = new Map<string, number>();
    let t = 0;
    for (; t < maxTurns && !s.winner; t++) {
      const me = currentPlayer(s).id;
      if (policy === "smart") for (const p of s.players) { const a = sellAny(s, p.id); if (a) { const o = reduce(s, ctx, a); if (o.ok) s = o.state; } }
      s.proposals = []; // serverda 30 soniyada o'chadi; simulyatsiyada — keyingi navbat boshigacha (sotishga ulgurishadi)
      const o = reduce(s, ctx, { type: "roll", playerId: me }); if (!o.ok) throw new Error(o.error); s = o.state;
      if (s.pending) {
        const cur = s.players.find((p) => p.id === me)!; const e = effectOf(ctx, s.pending.cardId, s.pending).effect;
        const d = decide(s, policy, cur, e);
        const o2 = reduce(s, ctx, { type: "decide", playerId: me, ...d }); if (!o2.ok) throw new Error(o2.error); s = o2.state;
      }
      for (const p of s.players) if (p.circle === "big" && !exitedAt.has(p.id)) exitedAt.set(p.id, s.round);
    }
    r.turnsPerGame.push(t); r.players += n; r.exits += exitedAt.size; r.exitRounds.push(...exitedAt.values());
    if (s.winner) r.wins++; r.restarts += s.players.reduce((a, p) => a + p.restarts, 0);
    for (const p of s.players) if (p.circle === "small") r.stuckCash.push(p.cash);
  }
  return r;
}

const q = (xs: number[], f: number) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(f * a.length))] : NaN; };
export function report(r: Result) {
  const exitPct = (100 * r.exits) / r.players;
  return { policy: r.policy, games: r.games, players: r.players, exitedSmallCircle: `${exitPct.toFixed(1)} %`, gamesWithWinner: `${((100 * r.wins) / r.games).toFixed(1)} %`,
    restartsPerPlayer: +(r.restarts / r.players).toFixed(2), medianTurnsPerGame: q(r.turnsPerGame, 0.5), exitRoundMedian: q(r.exitRounds, 0.5), exitRoundP90: q(r.exitRounds, 0.9),
    medianCashOfPlayersStillInSmallCircle: Math.round(q(r.stuckCash, 0.5)) };
}
if (process.argv[1]?.endsWith("sim.ts")) {
  const games = Number(process.argv[2] ?? 100), maxTurns = Number(process.argv[4] ?? 3000);
  const pols: Policy[] = process.argv[3] ? [process.argv[3] as Policy] : ["passive", "naive", "smart"];
  for (const p of pols) console.log(JSON.stringify(report(run(games, p, maxTurns))));
}
