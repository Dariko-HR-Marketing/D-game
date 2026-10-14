// O'yin darajasidagi holat mashinasi: navbat, katak, karta qarori, chiqish, g'alaba.
// Hamma narsa sof va serializatsiya qilinadigan holat ustida; tasodifiylik holatdagi `rng` dan.
import type { CardEffect, Effect } from "@poyga/content/effects";
import { RULES, canExitSmallCircle, checkMutualLoan, hasWonBigCircle, isValidSuyunchi, mutualLoanLimit, partnerBuyoutPrice } from "./index";
import {
  Player, assetMatches, marketPrice, SMALL_BOARD, applyEffect, buyShares, haveChild, monthlyExpenses, move, newPlayer, passMonths,
  passiveIncome, playerCashflow, tickLoans, sellAsset, smallCell, takeBankLoan, totalDebt, shuffle, rollDie, seededRng,
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

export interface HandDebt { id: number; to: string; amount: number; months: number }
export interface GamePlayer extends Player { handDebts: HandDebt[]; dreamIdx: number | null; lockedFlow: number; points: number; restarts: number; won: boolean }
export type Pending =
  | null
  | { type: "card"; playerId: string; cardId: string; deck: DeckName };

export type Proposal =
  | { id: number; kind: "suyunchi"; parent: string; given: string[] }
  | { id: number; kind: "loan"; giver: string; receiver: string; amount: number; months: number }
  | { id: number; kind: "partner"; owner: string; partner: string; cardId: string }
  | { id: number; kind: "market"; cardId: string; sold: string[] };

export interface GameState {
  version: 1; bots: string[]; restricted: string[]; proposals: Proposal[]; nextProposal: number; seed: number; rngState: number;
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

/** `restricted`: 16 yoshgacha o'yinchilar — o'zaro qarz va sheriklik yopiq (SPEC §2.8). */
export function newGame(ctx: Ctx, playerIds: string[], seed: number, bots: string[] = [], restricted: string[] = []): GameState {
  const s = { version: 1, bots, restricted, proposals: [], nextProposal: 1, seed, rngState: seed >>> 0, players: [], turn: 0, round: 1,
    decks: {} as Record<DeckName, DeckState>, pending: null, winner: null, log: [] } as GameState;
  withRng(s, (r) => {
    for (const k of Object.keys(ctx.deckIds) as DeckName[]) s.decks[k] = { draw: shuffle(ctx.deckIds[k], r), discard: [] };
  });
  s.players = playerIds.map((id) => {
    const kid = drawFrom(s, "kasb");
    const k = ctx.kasb[Number(kid.replace("kasb-", ""))];
    return { ...newPlayer(id, k), handDebts: [], dreamIdx: null, lockedFlow: 0, points: 0, restarts: 0, won: false };
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
/** Jurnal chegaralangan (so'nggi 100): holat va snapshot hajmi cheksiz o'smasin. To'liq jurnal serverda (harakatlar ketma-ketligi). */
const logf = (s: GameState, m: string) => { s.log.push(m); if (s.log.length > 30) s.log.splice(0, s.log.length - 30); };

/** Yangi kasb bilan boshidan (§5.3): hamma aktiv va qarz yo'qoladi. */
function restart(s: GameState, ctx: Ctx, p: GamePlayer): GamePlayer {
  const kid = drawFrom(s, "kasb");
  const k = ctx.kasb[Number(kid.replace("kasb-", ""))];
  logf(s, `${p.id}: yangi kasb #${k.n} bilan boshidan`);
  return { ...newPlayer(p.id, k), handDebts: [], dreamIdx: p.dreamIdx, lockedFlow: 0, points: p.points, restarts: p.restarts + 1, won: false };
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
  | { type: "bank_loan"; playerId: string; amount: number }
  | { type: "market_sell"; playerId: string; proposalId: number; assetCode?: string }
  | { type: "suyunchi"; playerId: string; proposalId: number; amount: number }
  | { type: "loan_request"; playerId: string; giverId: string; amount: number; months: number }
  | { type: "loan_accept"; playerId: string; proposalId: number }
  | { type: "loan_repay"; playerId: string; debtId: number; amount: number }
  | { type: "partner_offer"; playerId: string; partnerId: string }
  | { type: "partner_accept"; playerId: string; proposalId: number }
  | { type: "partner_buyout"; playerId: string; assetCode: string }
  | { type: "expire"; playerId: "server"; proposalId: number }
  | { type: "decide"; playerId: string; accept: boolean; qty?: number; useBank?: boolean };

export type Outcome = { ok: true; state: GameState; die?: number } | { ok: false; error: string };

export function reduce(state: GameState, ctx: Ctx, a: Action): Outcome {
  if (state.winner) return { ok: false, error: "game_over" };
  // Kirish tekshiruvi (mijozga ishonib bo'lmaydi): ob'ekt, mavjud o'yinchi yoki server.
  if (typeof a !== "object" || a === null || typeof a.playerId !== "string") return { ok: false, error: "bad_action" };
  if (a.playerId !== "server" && !state.players.some((p) => p.id === a.playerId)) return { ok: false, error: "no_player" };
  if (a.playerId === "server" && a.type !== "expire") return { ok: false, error: "bad_action" };
  const s = clone(state);
  const cur = currentPlayer(s);
  if (a.type !== "roll" && a.type !== "decide") return cooperate(s, ctx, a);
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
    return { deck: "bigboard", id, file: "", mode: "optional", text: c.name, effect: { kind: "buy", asset: "business", code: id, price: c.price!, monthlyIncome: c.income! } };
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
    p = tickLoans({ ...p, cash: p.cash + flow });
  }
  if (p.cash < 0) { const debt = -p.cash; p = forcePay(s, ctx, { ...p, cash: 0 }, debt); }
  setP(s, p);
  if (p.circle === "small") smallLanding(s, ctx, p);
  else bigLanding(s, ctx, p);
}

function offer(s: GameState, p: GamePlayer, deck: DeckName, ctx: Ctx) {
  const id = drawFrom(s, deck);
  const ce = ctx.effects[id];
  if (ce.effect.kind === "marketSale") { // hamma mos aktivli o'yinchiga taklif (§5.2 bozor); navbatni to'xtatmaydi
    s.proposals.push({ id: s.nextProposal++, kind: "market", cardId: id, sold: [] }); logf(s, `bozor: ${ce.text ?? id}`); return;
  }
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
      setP(s, q); logf(s, `${p.id}: farzand tug'ildi`);
      s.proposals.push({ id: s.nextProposal++, kind: "suyunchi", parent: p.id, given: [] }); return;
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
    bankDebt: p.bankDebt, otherDebt: totalDebt(p) - p.bankDebt + p.handDebts.reduce((x, d) => x + d.amount, 0), openPartnerships: openPartnerships(p) })) {
    const lock = playerCashflow(p);
    setP(s, { ...p, circle: "big", pos: CONFIG.bigStart, lockedFlow: lock });
    logf(s, `${p.id}: kichik aylanadan chiqdi`);
  }
  s.turn++;
  if (s.turn % s.players.length === 0) s.round++;
}

export const openPartnerships = (p: Player) => p.assets.filter((a) => a.partnerId || a.stakeOf).length;
const humans = (s: GameState) => s.players.filter((p) => !s.bots.includes(p.id));
const err = (error: string): Outcome => ({ ok: false, error });
const posInt = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) > 0;

/** Hamkorlik (§5.6): navbatdan mustaqil harakatlar. */
function cooperate(s: GameState, ctx: Ctx, a: Exclude<Action, { type: "roll" } | { type: "decide" }>): Outcome {
  const ok = (): Outcome => ({ ok: true, state: s });
  const P = (id: string) => s.players[idx(s, id)];
  switch (a.type) {
    case "market_sell": {
      const pr = s.proposals.find((x) => x.id === a.proposalId);
      if (!pr || pr.kind !== "market") return err("no_proposal");
      if (pr.sold.includes(a.playerId)) return err("already_sold");
      const e = effectOf(ctx, pr.cardId).effect; if (e.kind !== "marketSale") return err("no_proposal");
      const p = P(a.playerId);
      const cands = p.assets.filter((x) => assetMatches(e.targets, x) && (a.assetCode === undefined || x.code === a.assetCode) && !x.partnerId && !x.stakeOf);
      const asset = cands.map((x) => ({ x, price: marketPrice(e.amount, x) })).find((c) => c.price !== null);
      if (!asset) return err("nothing_to_sell"); // ortiqcha: ulushli (sheriklik) aktivni sotib bo'lmaydi
      const proceeds = asset.price! - asset.x.credit;
      setP(s, { ...p, cash: p.cash + proceeds, assets: p.assets.filter((x) => x !== asset.x) });
      pr.sold.push(p.id); logf(s, `${p.id}: ${asset.x.code} sotdi ${asset.price}`); return ok();
    }
    case "bank_loan": { // §5.3: ixtiyoriy bank krediti, faqat o'z navbatida; 100 ga karrali; limit 10 000
      if (currentPlayer(s).id !== a.playerId) return err("not_your_turn");
      if (!posInt(a.amount) || a.amount % 100 !== 0) return err("invalid_amount");
      const r = takeBankLoan(P(a.playerId), a.amount);
      if (r.restart) return err("bank_limit"); // o'yinchi o'zi yangi kasbga o'tishni tanlamaydi: faqat majburiy to'lovda
      setP(s, r.player as GamePlayer); logf(s, `${a.playerId}: bank krediti ${a.amount}`); return ok();
    }
    case "expire": s.proposals = s.proposals.filter((x) => x.id !== a.proposalId); return ok();

    case "suyunchi": {
      const pr = s.proposals.find((x) => x.id === a.proposalId);
      if (!pr || pr.kind !== "suyunchi") return err("no_proposal");
      const giver = P(a.playerId), parent = P(pr.parent);
      if (giver.id === parent.id) return err("self");
      if (giver.circle !== "small" || parent.circle !== "small") return err("small_circle_only"); // §5.6
      if (s.bots.includes(giver.id)) return err("bot");
      if (pr.given.includes(giver.id)) return err("already_given");
      if (!isValidSuyunchi(a.amount, giver.cash)) return err("invalid_amount");
      setP(s, { ...giver, cash: giver.cash - a.amount }); setP(s, { ...parent, cash: parent.cash + a.amount });
      pr.given.push(giver.id); return ok();
    }

    case "loan_request": { // oluvchi so'raydi, beruvchi qabul qiladi
      if (!posInt(a.amount) || !posInt(a.months) || a.months > RULES.mutualMaxMonths) return err("invalid_amount");
      if (s.restricted.includes(a.playerId) || s.restricted.includes(a.giverId)) return err("restricted_age");
      const rec = P(a.playerId), giver = s.players.find((p) => p.id === a.giverId);
      if (!giver || giver.id === rec.id) return err("bad_giver");
      if (s.bots.includes(rec.id) || s.bots.includes(giver.id)) return err("bot"); // §6.5
      if (rec.circle !== "small" || giver.circle !== "small") return err("small_circle_only"); // §2.7
      const existing = rec.handDebts.reduce((x, d) => x + d.amount, 0);
      const chk = checkMutualLoan({ players: humans(s).length, amount: a.amount, months: a.months, giverCash: giver.cash,
        receiverSalary: rec.salary, receiverPassive: passiveIncome(rec), receiverExistingMutualDebt: existing });
      if (!chk.ok) return err(chk.reason);
      s.proposals.push({ id: s.nextProposal++, kind: "loan", giver: giver.id, receiver: rec.id, amount: a.amount, months: a.months });
      return ok();
    }
    case "loan_accept": {
      const pr = s.proposals.find((x) => x.id === a.proposalId);
      if (!pr || pr.kind !== "loan") return err("no_proposal");
      if (pr.giver !== a.playerId) return err("not_giver");
      if (s.restricted.includes(pr.giver) || s.restricted.includes(pr.receiver)) return err("restricted_age");
      const giver = P(pr.giver), rec = P(pr.receiver);
      const chk = checkMutualLoan({ players: humans(s).length, amount: pr.amount, months: pr.months, giverCash: giver.cash,
        receiverSalary: rec.salary, receiverPassive: passiveIncome(rec), receiverExistingMutualDebt: rec.handDebts.reduce((x, d) => x + d.amount, 0) });
      if (!chk.ok) return err(chk.reason); // holat o'zgargan bo'lishi mumkin
      setP(s, { ...giver, cash: giver.cash - pr.amount });
      setP(s, { ...rec, cash: rec.cash + pr.amount, handDebts: [...rec.handDebts, { id: pr.id, to: giver.id, amount: pr.amount, months: pr.months }] });
      s.proposals = s.proposals.filter((x) => x.id !== pr.id); return ok();
    }
    case "loan_repay": { // foizsiz, to'lov ixtiyoriy
      const rec = P(a.playerId), d = rec.handDebts.find((x) => x.id === a.debtId);
      if (!d) return err("no_debt");
      if (!posInt(a.amount) || a.amount > d.amount || a.amount > rec.cash) return err("invalid_amount");
      const giver = P(d.to);
      setP(s, { ...giver, cash: giver.cash + a.amount });
      setP(s, { ...rec, cash: rec.cash - a.amount,
        handDebts: rec.handDebts.map((x) => (x.id === d.id ? { ...x, amount: x.amount - a.amount } : x)).filter((x) => x.amount > 0) });
      return ok();
    }

    case "partner_offer": {
      const owner = P(a.playerId);
      if (s.restricted.includes(owner.id) || s.restricted.includes(a.partnerId)) return err("restricted_age");
      if (s.bots.includes(a.partnerId) || s.bots.includes(owner.id)) return err("bot");
      if (!s.pending || s.pending.playerId !== owner.id || currentPlayer(s).id !== owner.id) return err("no_pending_card");
      const e = effectOf(ctx, s.pending.cardId).effect;
      if (e.kind !== "buy" || !["small_business", "business"].includes(e.asset)) return err("business_only"); // §5.6
      const partner = s.players.find((p) => p.id === a.partnerId);
      if (!partner || partner.id === owner.id) return err("bad_partner");
      if (owner.circle !== partner.circle) return err("circle_mismatch"); // §2.7
      const room = RULES.bankLimit - owner.bankDebt;
      if (owner.cash >= e.price || e.price - owner.cash <= room) return err("not_needed"); // naqd va bank limiti tugagach
      s.proposals.push({ id: s.nextProposal++, kind: "partner", owner: owner.id, partner: partner.id, cardId: s.pending.cardId });
      return ok();
    }
    case "partner_accept": {
      const pr = s.proposals.find((x) => x.id === a.proposalId);
      if (!pr || pr.kind !== "partner") return err("no_proposal");
      if (pr.partner !== a.playerId) return err("not_partner");
      if (s.restricted.includes(pr.owner) || s.restricted.includes(pr.partner)) return err("restricted_age");
      if (!s.pending || s.pending.cardId !== pr.cardId || s.pending.playerId !== pr.owner) return err("card_gone");
      const e = effectOf(ctx, pr.cardId).effect;
      if (e.kind !== "buy") return err("card_gone");
      const half = e.price / 2, owner = P(pr.owner), partner = P(pr.partner);
      if (partner.cash < half) return err("partner_cash"); // sherik faqat naqd to'laydi
      if (owner.cash < half) return err("owner_cash");
      const inc = (e.monthlyIncome ?? 0) / 2;
      const base = { price: e.price, creditPayment: 0, credit: 0 };
      setP(s, { ...owner, cash: owner.cash - half, assets: [...owner.assets, { ...base, kind: e.asset, code: e.code, monthlyIncome: inc, partnerId: partner.id }] });
      setP(s, { ...partner, cash: partner.cash - half, assets: [...partner.assets, { ...base, kind: "partner_stake", code: e.code, monthlyIncome: inc, stakeOf: owner.id }] });
      s.pending = null; s.proposals = s.proposals.filter((x) => x.id !== pr.id);
      endTurn(s, ctx); return ok();
    }
    case "partner_buyout": { // to'liq narx + 1 oylik foyda naqd (§5.6)
      const owner = P(a.playerId), asset = owner.assets.find((x) => x.code === a.assetCode && x.partnerId);
      if (!asset) return err("no_partnership");
      const partner = P(asset.partnerId!);
      const stake = partner.assets.find((x) => x.code === a.assetCode && x.stakeOf === owner.id);
      const full = (asset.monthlyIncome + (stake?.monthlyIncome ?? 0));
      const price = partnerBuyoutPrice(asset.price, full);
      if (owner.cash < price) return err("insufficient_cash");
      setP(s, { ...owner, cash: owner.cash - price, assets: owner.assets.map((x) => (x === asset ? { ...x, monthlyIncome: full, partnerId: undefined } : x)) });
      setP(s, { ...partner, cash: partner.cash + price, assets: partner.assets.filter((x) => x !== stake) });
      return ok();
    }
    default: return err("unknown_action");
  }
}

export { sellAsset, passMonths };
