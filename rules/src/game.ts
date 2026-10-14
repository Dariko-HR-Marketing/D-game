// O'yin darajasidagi holat mashinasi: navbat, katak, karta qarori, chiqish, g'alaba.
// Hamma narsa sof va serializatsiya qilinadigan holat ustida; tasodifiylik holatdagi `rng` dan.
import type { CardEffect, Effect } from "@poyga/content";
import { RULES, canExitSmallCircle, hasWonBigCircle } from "./index";
import {
  Player, SMALL_BOARD, applyEffect, buyShares, haveChild, monthlyExpenses, move, newPlayer, passMonths,
  passiveIncome, playerCashflow, sellAsset, smallCell, takeBankLoan, totalDebt, shuffle, rollDie, seededRng,
} from "./engine";

export const CONFIG = {
  bigCells: 53, bigStart: 34,
  smallOpportunityBigFrom: 25_000, // A ilova: "tekshirilsin" (OPEN_QUESTIONS #9)
  bigMonthOnStartPass: true,       // taxmin (OPEN_QUESTIONS #13)
} as const;

export interface BigCell { i: number; t: string; name: string; income: number | null; price: number | null }
export interface Kasb { n: number; salary: number; total: number; save: number; child: number }
export interface Dream { name: string; price: number }

/** O'zgarmas kontent: serverda yuklanadi, holatga kirmaydi. */
export interface Ctx {
  effects: Record<string, CardEffect>;
  deckIds: { kasb: string[]; kichik: string[]; katta: string[]; bozor: string[]; xar: string[]; kxar: string[] };
  kasb: Record<number, Kasb>;
  bigBoard: BigCell[];
  dreams: Dream[];
}

export type DeckName = keyof Ctx["deckIds"];
export interface DeckState { draw: string[]; discard: string[] }

export interface GamePlayer extends Player { dreamIdx: number | null; lockedFlow: number; points: number; restarts: number; won: boolean }
export type Pending =
  | null
  | { type: "card"; playerId: string; cardId: string; deck: DeckName };

export interface GameState {
  version: 1; seed: number; rngState: number;
  players: GamePlayer[]; turn: number; round: number;
  decks: Record<DeckName, DeckState>;
  pending: Pending; winner: string | null; log: string[];
}

// --- tasodifiy manba holatda ---
function withRng<T>(s: GameState, f: (r: () => number) => T): T {
  const r = seededRng(s.rngState);
  const out = f(r);
  // holatni saqlash uchun keyingi qiymatni yangi urug' qilamiz (deterministik)
  s.rngState = Math.floor(r() * 4294967296) >>> 0;
  return out;
}
const clone = <T>(x: T): T => structuredClone(x);

export function newGame(ctx: Ctx, playerIds: string[], seed: number): GameState {
  const s = { version: 1, seed, rngState: seed >>> 0, players: [], turn: 0, round: 1,
    decks: {} as Record<DeckName, DeckState>, pending: null, winner: null, log: [] } as GameState;
  withRng(s, (r) => {
    for (const k of Object.keys(ctx.deckIds) as DeckName[]) s.decks[k] = { draw: shuffle(ctx.deckIds[k], r), discard: [] };
  });
  s.players = playerIds.map((id) => {
    const kid = drawFrom(s, "kasb");
    const k = ctx.kasb[Number(kid.replace("kasb-", ""))];
    return { ...newPlayer(id, k), dreamIdx: null, lockedFlow: 0, points: 0, restarts: 0, won: false };
  });
  return s;
}

function drawFrom(s: GameState, deck: DeckName): string {
  const d = s.decks[deck];
  if (d.draw.length === 0) { d.draw = withRng(s, (r) => shuffle(d.discard, r)); d.discard = []; }
  const id = d.draw.shift();
  if (!id) throw new Error(`deka bo'sh: ${deck}`);
  d.discard.push(id);
  return id;
}

export const currentPlayer = (s: GameState) => s.players[s.turn % s.players.length];
const idx = (s: GameState, id: string) => s.players.findIndex((p) => p.id === id);
const setP = (s: GameState, p: GamePlayer) => { s.players[idx(s, p.id)] = p; };
const logf = (s: GameState, m: string) => { s.log.push(m); };

/** Yangi kasb bilan boshidan (§5.3): hamma aktiv va qarz yo'qoladi. */
function restart(s: GameState, ctx: Ctx, p: GamePlayer): GamePlayer {
  const kid = drawFrom(s, "kasb");
  const k = ctx.kasb[Number(kid.replace("kasb-", ""))];
  logf(s, `${p.id}: yangi kasb #${k.n} bilan boshidan`);
  return { ...newPlayer(p.id, k), dreamIdx: p.dreamIdx, lockedFlow: 0, points: p.points, restarts: p.restarts + 1, won: false };
}

/** Majburiy to'lov: naqd yetmasa avtomatik bank krediti (limit ichida), bo'lmasa restart. */
function forcePay(s: GameState, ctx: Ctx, p: GamePlayer, amount: number): GamePlayer {
  if (p.cash >= amount) return { ...p, cash: p.cash - amount };
  const need = Math.ceil((amount - p.cash) / 100) * 100;
  const { player, restart: r } = takeBankLoan(p, need);
  if (r) return restart(s, ctx, p);
  logf(s, `${p.id}: bank krediti ${need}`);
  return { ...(player as GamePlayer), cash: player.cash - amount };
}

export function chooseDream(s: GameState, playerId: string, dreamIdx: number): GameState {
  const n = clone(s); const p = n.players[idx(n, playerId)];
  p.dreamIdx = dreamIdx; return n;
}

export type Action =
  | { type: "roll"; playerId: string }
  | { type: "decide"; playerId: string; accept: boolean; qty?: number; useBank?: boolean };

export type Outcome = { ok: true; state: GameState; die?: number } | { ok: false; error: string };

export function reduce(state: GameState, ctx: Ctx, a: Action): Outcome {
  if (state.winner) return { ok: false, error: "game_over" };
  const s = clone(state);
  const cur = currentPlayer(s);
  if (a.playerId !== cur.id) return { ok: false, error: "not_your_turn" };
  if (a.type === "roll") {
    if (s.pending) return { ok: false, error: "decision_pending" };
    const die = withRng(s, (r) => rollDie(r));
    land(s, ctx, cur.id, die);
    if (!s.pending) endTurn(s, ctx);
    return { ok: true, state: s, die };
  }
  if (!s.pending) return { ok: false, error: "nothing_pending" };
  const pend = s.pending; s.pending = null;
  const ce = effectOf(ctx, pend.cardId);
  decide(s, ctx, cur.id, ce, a);
  endTurn(s, ctx);
  return { ok: true, state: s };
}

/** Katta aylana T-kataklari kartasiz: katakdan sintez qilinadi. */
export function effectOf(ctx: Ctx, id: string): CardEffect {
  if (id.startsWith("big-")) {
    const c = ctx.bigBoard[Number(id.slice(4))];
    return { deck: "bigboard", id, file: "", mode: "optional", effect: { kind: "buy", asset: "business", code: id, price: c.price!, monthlyIncome: c.income! } };
  }
  return ctx.effects[id];
}

function monthsFor(p: GamePlayer, steps: number): { pos: number; months: number } {
  if (p.circle === "small") return move(p.pos, steps, 48);
  // katta aylana: START (34) dan o'tish = oy
  return move(p.pos, steps, CONFIG.bigCells, (i) => CONFIG.bigMonthOnStartPass && i === CONFIG.bigStart);
}

function land(s: GameState, ctx: Ctx, pid: string, die: number) {
  let p = s.players[idx(s, pid)];
  const { pos, months } = monthsFor(p, die);
  p = { ...p, pos };
  for (let m = 0; m < months; m++) {
    const flow = p.circle === "big" ? Math.max(playerCashflow(p), p.lockedFlow) : playerCashflow(p);
    p = { ...p, cash: p.cash + flow };
  }
  if (p.cash < 0) { const debt = -p.cash; p = forcePay(s, ctx, { ...p, cash: 0 }, debt); }
  setP(s, p);
  if (p.circle === "small") smallLanding(s, ctx, p);
  else bigLanding(s, ctx, p);
}

function offer(s: GameState, p: GamePlayer, deck: DeckName, ctx: Ctx) {
  const id = drawFrom(s, deck);
  const ce = ctx.effects[id];
  if (ce.mode === "mandatory") { s.pending = { type: "card", playerId: p.id, cardId: id, deck }; autoMandatory(s, ctx, p, ce); }
  else s.pending = { type: "card", playerId: p.id, cardId: id, deck };
}

/** Majburiy karta darhol qo'llanadi (§5.2). */
function autoMandatory(s: GameState, ctx: Ctx, p: GamePlayer, ce: CardEffect) {
  s.pending = null;
  setP(s, applyMandatory(s, ctx, s.players[idx(s, p.id)], ce.effect));
}

function applyMandatory(s: GameState, ctx: Ctx, p: GamePlayer, e: Effect): GamePlayer {
  switch (e.kind) {
    case "pay": return forcePay(s, ctx, p, e.amount);
    case "floodCarRepair": {
      const r = applyEffect(p, e);
      if (r.ok) return { ...p, ...r.player } as GamePlayer;
      return r.reason === "insufficient_cash" ? forcePay(s, ctx, p, e.amount) : p;
    }
    case "qarEvent": {
      if (!p.qar && e.onlyQarHolders) return p;
      if (e.payNow) return forcePay(s, ctx, p, e.payNow);
      if (e.monthlyExpenseIncrease) return { ...p, baseExpenses: p.baseExpenses + e.monthlyExpenseIncrease };
      return p;
    }
    case "businessIncomeIncrease": { const r = applyEffect(p, e); return r.ok ? ({ ...p, ...r.player } as GamePlayer) : p; }
    case "marketCrash": {
      // Aktivlar narxi 2 baravar tushadi (hod #8); bu yerda faqat nominal narx yangilanadi.
      return { ...p, assets: p.assets.map((a) => (["land", "dacha", "apartment", "shares"].includes(a.kind) ? { ...a, price: a.price / 2 } : a)) };
    }
    case "tenantLeft": {
      const i = p.assets.findIndex((a) => ["apartment", "dacha", "land"].includes(a.kind) && a.monthlyIncome > 0);
      if (i < 0) return p;
      return { ...p, cash: p.cash - p.assets[i].monthlyIncome };
    }
    case "debtRepaid": return p.handLoans > 0 ? { ...p, cash: p.cash + e.amount, handLoans: p.handLoans - 1 } : p;
    default: return p;
  }
}

function smallLanding(s: GameState, ctx: Ctx, p: GamePlayer) {
  switch (smallCell(p.pos)) {
    case "I": return offer(s, p, p.cash <= CONFIG.smallOpportunityBigFrom ? "kichik" : "katta", ctx);
    case "H": return offer(s, p, "xar", ctx);
    case "B": return offer(s, p, "bozor", ctx);
    case "O": { // farzand: bank 500 beradi (§5.6)
      const q = haveChild({ ...p, cash: p.cash + RULES.suyunchiBank }) as GamePlayer;
      setP(s, q); logf(s, `${p.id}: farzand tug'ildi`); return;
    }
    case "D": case "S": return;
    case "K": case "Q": logf(s, `${p.id}: ${smallCell(p.pos)} katagi — qoida kutilmoqda (OPEN_QUESTIONS #8)`); return;
  }
}

function bigLanding(s: GameState, ctx: Ctx, p: GamePlayer) {
  const cell = ctx.bigBoard[p.pos];
  if (cell.t === "O" && p.dreamIdx !== null && ctx.dreams[p.dreamIdx].name === cell.name) {
    const dream = ctx.dreams[p.dreamIdx];
    if (hasWonBigCircle({ cashflow: Math.max(playerCashflow(p), p.lockedFlow), onOwnDreamCell: true, cash: p.cash, dreamPrice: dream.price })) {
      setP(s, { ...p, won: true, cash: p.cash - dream.price }); s.winner = p.id; logf(s, `${p.id} g'alaba qildi`); return;
    }
  }
  if (cell.t === "T" && cell.price !== null && cell.income !== null) {
    s.pending = { type: "card", playerId: p.id, cardId: `big-${cell.i}`, deck: "kichik" };
  }
  // V, Y, X kataklari: SPEC'da qoida yo'q (OPEN_QUESTIONS #13) — jurnalga yoziladi.
  else if (!["O", "T"].includes(cell.t)) logf(s, `${p.id}: katta aylana ${cell.t}-katak "${cell.name}" — qoida kutilmoqda`);
}

function decide(s: GameState, ctx: Ctx, pid: string, ce: CardEffect, a: Extract<Action, { type: "decide" }>) {
  let p = s.players[idx(s, pid)];
  if (!a.accept) return;
  const e = ce.effect;
  const fund = (need: number) => {
    // §5.3: avval bank (limit ichida)
    if (p.cash >= need || !a.useBank) return;
    const amt = Math.ceil((need - p.cash) / 100) * 100;
    const r = takeBankLoan(p, amt);
    if (!r.restart) p = r.player as GamePlayer;
  };
  if (e.kind === "buyShares") {
    const qty = a.qty ?? e.min; fund(qty * e.pricePerShare);
    const r = buyShares(p, e, qty); if (r.ok) p = { ...p, ...r.player } as GamePlayer;
  } else if (e.kind === "lendRequest") {
    // O'zaro qarz qoidalari (§5.6) alohida modulda; bu yerda qabul qilinmaydi.
  } else {
    const need = e.kind === "buy" ? (e.down ?? e.price) : e.kind === "courseSalaryPlus" || e.kind === "carInsurance" ? e.price : e.kind === "qarOffer" ? 0 : 0;
    fund(need);
    const r = applyEffect(p, e); if (r.ok) p = { ...p, ...r.player } as GamePlayer;
  }
  setP(s, p);
}

function endTurn(s: GameState, ctx: Ctx) {
  const p = currentPlayer(s);
  if (p.circle === "small" && canExitSmallCircle({
    cash: p.cash, salary: p.salary, passiveIncome: passiveIncome(p), expenses: monthlyExpenses(p),
    bankDebt: p.bankDebt, otherDebt: totalDebt(p) - p.bankDebt, openPartnerships: 0 })) {
    const lock = playerCashflow(p);
    setP(s, { ...p, circle: "big", pos: CONFIG.bigStart, lockedFlow: lock });
    logf(s, `${p.id}: kichik aylanadan chiqdi`);
  }
  s.turn++;
  if (s.turn % s.players.length === 0) s.round++;
}

export { sellAsset, passMonths };
