// Garov auksioni (halol moliya, buyurtmachi qarori 2026-11-09): to'lanmagan lombard yoki bank kreditining garovi
// avval egasiga taklif qilinadi, u olmasa boshqa o'yinchilar o'rtasida auksionga qo'yiladi.
// Boshlang'ich narx = bankning qarzi + qo'shimcha haq (+ aktivning o'z krediti). Eng ko'p bergan oladi; bank o'z haqini olib,
// ORTIQCHASINI EGASIGA QAYTARADI. Hamma taymerlar serverda (holatda faqat bosqich va takliflar), shuning uchun jurnaldan qayta o'ynash deterministik.
import { RULES, bankLoanDebt, bankLoanPayoff, lombardPayoff } from "./index";
import { slotFull, unpledge, maxBankLoan, pledgeable, type Asset } from "./engine";
import type { GameState, GamePlayer, Action } from "./game";

export type AuctionFormat = "majburiy" | "ixtiyoriy" | "bozor";
/** Auksion (buyurtmachi qarori 2026-11-09): majburiy (to'lanmagan garov), ixtiyoriy (egasi o'z mulkini 50–100 % dan qo'yadi), bozor (olib bo'lmaydigan karta, sotuvchi — bank). Narx har doim bitta yaxlit summa, to'lov faqat naqd. */
export interface Auction {
  id: number; format: AuctionFormat;
  owner: string;            // majburiy/ixtiyoriy: mulk egasi; bozor: kartani tortgan o'yinchi (taklif qila olmaydi)
  circle: "small" | "big";  // faqat shu aylanadagi o'yinchilar taklif qiladi, qolganlar kuzatadi
  kind: "lombard" | "bank" | "own" | "card"; loanIdx: number;
  lot: { code: string; kind: string; price: number; cardId?: string; credit: number; income?: number }[];
  due: number;      // majburiy: bankka qarz + haq; qolganlarida 0
  credits: number;  // mulkning o'z krediti (sotuvdan yopiladi)
  start: number;    // boshlang'ich narx
  step: number;     // eng kam ko'tarish qadami
  phase: "owner" | "open";
  best: { playerId: string; amount: number } | null;
  bids: number; passed: string[]; checked?: boolean;
}

export type AuctionAction =
  | { type: "auction_buyback"; playerId: string }
  | { type: "auction_decline"; playerId: string; auto?: true }
  | { type: "auction_bid"; playerId: string; amount: number }
  | { type: "auction_list"; playerId: string; assetIdx: number; pct: number }
  | { type: "auction_pass"; playerId: string }
  | { type: "auction_close"; playerId: string };
export const isAuctionAction = (a: { type: string }): a is AuctionAction => a.type.startsWith("auction_");
/** Auksion (buyurtmachi qarori 2026-11-09): majburiy (to'lanmagan garov), ixtiyoriy (egasi o'z mulkini 50–100 % dan qo'yadi), bozor (olib bo'lmaydigan karta, sotuvchi — bank). Narx har doim bitta yaxlit summa, to'lov faqat naqd. */

type Res = { ok: true } | { ok: false; error: string };
const idx = (s: GameState, id: string) => s.players.findIndex((p) => p.id === id);
const logf = (s: GameState, m: string) => { s.log.push(m); s.logN = (s.logN ?? 0) + 1; if (s.log.length > 30) s.log.splice(0, s.log.length - 30); };

/** Majburiy auksion lotı: lombard — garovdagi aktiv; bank krediti — kredit garovi bo'lgan aktivlardan ENG QIMMATI (qolganlari keyingi auksionlarda, qarz qoplanguncha). */
function lotIdx(p: GamePlayer, kind: "lombard" | "bank", loanIdx: number): number[] {
  const found: number[] = [];
  const take = (code: string, price: number) => { const i = p.assets.findIndex((a, n) => !found.includes(n) && a.pledged === kind && a.code === code && a.price === price); if (i >= 0) found.push(i); };
  if (kind === "lombard") { const l = (p.lombards ?? [])[loanIdx]; if (l) take(l.code, l.price); }
  else for (const c of p.bankLoans[loanIdx]?.collateral ?? []) take(c.code, c.price);
  if (kind === "lombard" || found.length <= 1) return found;
  return [found.sort((x, y) => p.assets[y].price - p.assets[x].price)[0]];
}

/** Qaysi majburiyat sotuvni boshlaydi: egasi tomonidan eng erta olingan. */
export function nextDefault(s: GameState): { pid: string; kind: "lombard" | "bank"; loanIdx: number } | null {
  for (const p of s.players) {
    const c: { kind: "lombard" | "bank"; loanIdx: number; since: number }[] = [];
    (p.lombards ?? []).forEach((l, i) => { if (l.overdue) c.push({ kind: "lombard", loanIdx: i, since: l.since ?? 0 }); });
    p.bankLoans.forEach((l, i) => { if (l.overdue) c.push({ kind: "bank", loanIdx: i, since: l.since ?? 0 }); }); // 36 oy tugagach to'lanmagan qoldiq
    if (c.length === 0) continue;
    c.sort((x, y) => x.since - y.since || (x.kind === "bank" ? -1 : 1));
    return { pid: p.id, kind: c[0].kind, loanIdx: c[0].loanIdx };
  }
  return null;
}

/** Taklif qila oladimi: sotuvchi/kartani tortgan emas, 16 yoshdan katta, shu aylanada, naqdi yetadi, aktivlar uchun joy bor. */
export function canBid(s: GameState, a: Auction, p: GamePlayer, amount: number): boolean {
  if (p.id === a.owner || s.restricted.includes(p.id) || p.circle !== a.circle || p.cash < amount) return false;
  const extra: Record<string, number> = {};
  for (const l of a.lot) {
    const probe = { assets: [...p.assets, ...Array.from({ length: extra[l.kind] ?? 0 }, () => ({ kind: l.kind }) as Asset)] };
    if (slotFull(probe, l.kind)) return false;
    extra[l.kind] = (extra[l.kind] ?? 0) + 1;
  }
  return true;
}
/** Eng kam taklif: birinchisi — boshlang'ich narxdan kichik bo'lmagan eng yaqin qadamga karrali summa; keyingilari — yetakchi + qadam. */
export const nextMinBid = (a: Auction) => (a.best ? a.best.amount + a.step : Math.ceil(a.start / a.step) * a.step);
/** Boshlang'ich narxni naqd to'lay oladigan o'yinchilar soni (auksion ochilishi uchun kamida `auctionMinBidders` ta kerak; botlar ham hisobga kiradi). */
export const eligibleBidders = (s: GameState, a: Auction): number => s.players.filter((p) => canBid(s, a, p, nextMinBid(a))).length;
/** Hozir harakat qila oladigan (hali o'tkazmagan, yetakchi emas) takliflovchilar. */
export const activeBidders = (s: GameState, a: Auction): GamePlayer[] =>
  s.players.filter((p) => !a.passed.includes(p.id) && a.best?.playerId !== p.id && canBid(s, a, p, nextMinBid(a)));

const cleanAsset = (x: { kind: string; code: string; cardId?: string; income?: number; monthlyIncome?: number; marketValue?: number | null }, price: number): Asset =>
  ({ kind: x.kind, code: x.code, cardId: x.cardId, price, monthlyIncome: x.monthlyIncome ?? x.income ?? 0, creditPayment: 0, credit: 0, ...(x.marketValue !== undefined ? { marketValue: x.marketValue } : {}) }) as Asset;
const relistKey = (pid: string, code: string, price: number) => `${pid}|${code}|${price}`;

/** Auksionni yopadi. `buyer`: g'olib (null — hech kim olmadi); `buyback`: egasi qarzni to'ladi (faqat majburiy). */
function settle(s: GameState, how: { buyer: string; price: number } | { buyer: null } | { buyback: true }) {
  const a = s.auction!; const oi = idx(s, a.owner); const o = { ...s.players[oi] };
  const ids = a.format === "bozor" ? [] : a.format === "ixtiyoriy" ? o.assets.map((x, i) => ({ x, i })).filter(({ x }) => x.code === a.lot[0].code && x.price === a.lot[0].price && !x.pledged).slice(0, 1).map(({ i }) => i) : lotIdx(o, a.kind as "lombard" | "bank", a.loanIdx);
  const sold = ids.map((i) => o.assets[i]);
  const loan = (a.kind === "lombard" ? (o.lombards ?? [])[a.loanIdx] : a.kind === "bank" ? o.bankLoans[a.loanIdx] : undefined) as (Record<string, any> | undefined);
  const dropLoan = () => {
    if (a.kind === "lombard") o.lombards = (o.lombards ?? []).filter((_, n) => n !== a.loanIdx);
    else { o.bankLoans = o.bankLoans.filter((_, n) => n !== a.loanIdx); o.bankDebt = o.bankLoans.reduce((t, l) => t + bankLoanDebt(l), 0); }
  };
  const release = () => { if (!loan) return; if (a.kind === "bank") { if (loan.collateral) o.assets = unpledge(o.assets, loan.collateral, "bank"); } else o.assets = unpledge(o.assets, [loan as { code: string; price: number }], "lombard"); };
  const finish = (m: string) => { s.players[oi] = o; logf(s, m); s.auction = null; };
  if ("buyback" in how) { o.cash -= a.due; if (loan) { release(); dropLoan(); } return finish(`${a.owner}: garovdagi qarzni to'lab, mulkini saqlab qoldi (${a.due})`); }
  if (!how.buyer) {
    if (a.format === "majburiy") { if (loan) { release(); dropLoan(); } o.owe = (o.owe ?? 0) + a.due; return finish(`Majburiy auksionda taklif bo'lmadi: ${a.owner} ning ${a.due} lik qarzi o'ziga qaytdi, mulki o'zida qoldi`); }
    if (a.format === "ixtiyoriy") { (s.relist ??= {})[relistKey(a.owner, a.lot[0].code, a.lot[0].price)] = s.round + RULES.relistLaps; return finish(`Ixtiyoriy auksionda taklif bo'lmadi: ${a.owner} mulki o'zida qoldi (qayta qo'yish ${RULES.relistLaps} aylanadan keyin)`); }
    s.auction = null; logf(s, "Bozor auksionida taklif bo'lmadi: karta tashlandi"); return;
  }
  const price = how.price, bi = idx(s, how.buyer), w = { ...s.players[bi] }; w.cash -= price;
  if (a.format === "bozor") { w.assets = [...w.assets, cleanAsset(a.lot[0], price)]; s.players[bi] = w; s.auction = null; logf(s, `${how.buyer}: bozor auksionida ${a.lot[0].code} ni ${price} ga sotib oldi (pul bankka)`); return; }
  o.assets = o.assets.filter((_, i) => !ids.includes(i));
  const afterCredit = price - a.credits;                       // aktivning o'z krediti sotuvdan yopiladi
  if (afterCredit < 0) o.owe = (o.owe ?? 0) - afterCredit;
  let toOwner = Math.max(0, afterCredit);
  if (a.format === "majburiy") {
    const bank = Math.min(a.due, Math.max(0, afterCredit)), remaining = a.due - bank; toOwner = Math.max(0, afterCredit) - bank;
    if (loan) {
      if (remaining <= 0) { release(); dropLoan(); }
      else if (a.kind === "bank" && (loan.collateral ?? []).length > 1) { // garovda yana mulk bor: qarz qoldig'i keyingi (arzonroq) mulk auksionida yopiladi
        const k = sold[0]; let removed = false; const left = (loan.collateral as { code: string; price: number }[]).filter((c) => { if (!removed && c.code === k.code && c.price === k.price) { removed = true; return false; } return true; });
        o.bankLoans = o.bankLoans.map((l, n) => (n === a.loanIdx ? { ...l, arrears: remaining, collateral: left } : l)); o.bankDebt = o.bankLoans.reduce((t, l) => t + bankLoanDebt(l), 0);
      } else { release(); dropLoan(); o.owe = (o.owe ?? 0) + remaining; } // garov qolmadi: yetmagan qismi egasining qarzi bo'lib qoladi (foizsiz)
    }
  }
  o.cash += toOwner; s.players[oi] = o;
  w.assets = [...w.assets, ...sold.map((x) => cleanAsset(x, price))]; s.players[bi] = w;
  s.auction = null; logf(s, `${how.buyer}: ${a.format} auksionida ${price} ga sotib oldi; ${a.owner} ga ${toOwner} qaytarildi`);
}

/** Bosqichni oldinga suradi: ochiq bosqichda yetarli qatnashchi bo'lmasa yoki hamma o'tkazgan bo'lsa auksion yopiladi. */
function advance(s: GameState) {
  const a = s.auction; if (!a) return;
  if (a.phase === "owner" && s.players[idx(s, a.owner)].cash < a.due) a.phase = "open"; // egasida qarzni to'lashga pul yo'q — kutish befoyda
  if (a.phase === "open" && !a.checked) { a.checked = true; if (eligibleBidders(s, a) < RULES.auctionMinBidders) return settle(s, { buyer: null }); } // kamida 2 ta qatnashchi shart
  if (a.phase === "open" && activeBidders(s, a).length === 0) a.best ? settle(s, { buyer: a.best.playerId, price: a.best.amount }) : settle(s, { buyer: null });
}

/** To'lanmagan majburiyat bor bo'lsa majburiy auksionni ochadi (agar boshqasi ochiq bo'lmasa). */
export function startAuction(s: GameState) {
  if (!s.halalFin) return;
  for (let guard = 0; !s.auction && guard < 20; guard++) {
    const d = nextDefault(s); if (!d) return;
    const o = s.players[idx(s, d.pid)]; const ids = lotIdx(o, d.kind, d.loanIdx);
    const l = d.kind === "lombard" ? (o.lombards ?? [])[d.loanIdx] : o.bankLoans[d.loanIdx];
    const due = d.kind === "lombard" ? lombardPayoff(l) : bankLoanPayoff(l);
    const lot = ids.map((i) => ({ code: o.assets[i].code, kind: o.assets[i].kind, price: o.assets[i].price, cardId: o.assets[i].cardId, credit: o.assets[i].credit }));
    if (lot.length === 0) { // garov topilmadi (kutilmagan): majburiyat egasining qarziga o'tadi
      const oo = { ...o }; const pay = Math.min(Math.max(0, oo.cash), due); oo.cash -= pay; oo.owe = (oo.owe ?? 0) + (due - pay);
      if (d.kind === "lombard") oo.lombards = (oo.lombards ?? []).filter((_, n) => n !== d.loanIdx); else { oo.bankLoans = oo.bankLoans.filter((_, n) => n !== d.loanIdx); oo.bankDebt = oo.bankLoans.reduce((t, x) => t + bankLoanDebt(x), 0); }
      s.players[idx(s, d.pid)] = oo; continue;
    }
    const start = lot.reduce((t, x) => t + x.price, 0); // majburiy auksion mulkning o'z narxidan boshlanadi
    s.auction = { id: (s.nextAuction = (s.nextAuction ?? 0) + 1), format: "majburiy", owner: d.pid, circle: o.circle, kind: d.kind, loanIdx: d.loanIdx, lot, due, credits: lot.reduce((t, x) => t + x.credit, 0), start, step: RULES.auctionBidStep, phase: "owner", best: null, bids: 0, passed: [] };
    logf(s, `${d.pid}: to'lanmagan ${d.kind === "bank" ? "bank krediti" : "lombard"} garovi majburiy auksionga qo'yildi (boshlang'ich narx ${start})`);
    advance(s);
  }
}

/** Ixtiyoriy auksion: egasi o'z navbatida erkin mulkini mulk narxining `pct` % idan (50–100 %) auksionga qo'yadi. */
function listOwn(s: GameState, a: Extract<AuctionAction, { type: "auction_list" }>): Res {
  if (!s.halalFin) return { ok: false, error: "not_available" };
  if (s.auction) return { ok: false, error: "auction_open" };
  const cur = s.players[s.turn % s.players.length], o = s.players[idx(s, a.playerId)];
  if (cur.id !== a.playerId || s.pending) return { ok: false, error: "not_your_turn" };
  if (o.circle !== "small" || s.restricted.includes(o.id)) return { ok: false, error: "not_eligible" };
  const x = o.assets[a.assetIdx]; if (!x) return { ok: false, error: "no_asset" };
  if (x.pledged || x.stakeOf || x.partnerId || x.kind === "shares" || x.kind === "partner_stake") return { ok: false, error: "not_pledgeable" };
  if (!Number.isInteger(a.pct) || a.pct < RULES.voluntaryMinPct || a.pct > 100 || a.pct % 10 !== 0) return { ok: false, error: "invalid_amount" };
  if ((s.relist?.[relistKey(o.id, x.code, x.price)] ?? 0) > s.round) return { ok: false, error: "relist_wait" };
  const start = Math.ceil((x.price * a.pct) / 100 / RULES.auctionBidStep) * RULES.auctionBidStep;
  const au: Auction = { id: (s.nextAuction = (s.nextAuction ?? 0) + 1), format: "ixtiyoriy", owner: o.id, circle: o.circle, kind: "own", loanIdx: -1,
    lot: [{ code: x.code, kind: x.kind, price: x.price, cardId: x.cardId, credit: x.credit }], due: 0, credits: x.credit, start, step: RULES.auctionBidStep, phase: "open", best: null, bids: 0, passed: [], checked: true };
  if (eligibleBidders(s, au) < RULES.auctionMinBidders) { s.nextAuction = (s.nextAuction ?? 1) - 1; return { ok: false, error: "few_bidders" }; }
  s.auction = au; logf(s, `${o.id}: ${x.code} ni ixtiyoriy auksionga qo'ydi (${a.pct} % = ${start})`); return { ok: true };
}

/** Karta olishning hech bir yo'li yo'qmi (naqd, bank krediti, lombard, sheriklik, o'zaro qarz)? Shunda karta bozor auksioniga chiqadi. */
export function cannotBuyAnyWay(s: GameState, p: GamePlayer, e: { kind: string; asset?: string; price?: number; down?: number }): boolean {
  if (e.kind !== "buy" || e.price === undefined) return false;
  const price = e.price, need = e.down ?? price;
  if (p.cash >= need) return false;
  if (p.cash + maxBankLoan(p) >= need) return false;
  if (p.cash + p.assets.filter(pledgeable).reduce((t, x) => t + Math.floor((x.price * RULES.lombardShare) / 100) * 100, 0) >= need) return false;
  const others = s.players.filter((q) => q.id !== p.id && !s.bots.includes(q.id) && !s.restricted.includes(q.id));
  if (!s.bots.includes(p.id) && (e.asset === "business" || e.asset === "small_business") && p.cash >= price / 2 && others.some((q) => q.cash >= price / 2)) return false;
  if (!s.bots.includes(p.id) && s.players.filter((q) => !s.bots.includes(q.id)).length >= RULES.mutualMinPlayers && others.some((q) => p.cash + Math.floor(q.cash * RULES.mutualGiverCashShare) >= need)) return false;
  return true;
}

/** Bozor auksioni: karta olib bo'lmaydi — bank uni karta narxidan sotadi. Qatnashchi yetmasa `false` (karta odatdagidek hal qilinadi). */
export function startMarketAuction(s: GameState, drawer: GamePlayer, cardId: string, e: { code: string; asset: string; price: number; monthlyIncome?: number; marketValue?: number | null }, step: number = RULES.auctionBidStep, startAt?: number): boolean {
  if (!s.halalFin || s.auction) return false;
  const start = startAt ?? e.price;
  const au: Auction = { id: (s.nextAuction ?? 0) + 1, format: "bozor", owner: drawer.id, circle: drawer.circle, kind: "card", loanIdx: -1,
    lot: [{ code: e.code, kind: e.asset, price: e.price, cardId, credit: 0, income: e.monthlyIncome }], due: 0, credits: 0, start, step, phase: "open", best: null, bids: 0, passed: [], checked: true };
  if (eligibleBidders(s, au) < RULES.auctionMinBidders) return false;
  s.nextAuction = au.id; s.auction = au; logf(s, `${drawer.id}: ${e.code} kartasini olish yo'li topilmadi — bozor auksioniga chiqdi (boshlang'ich narx ${start})`); return true;
}

/** Auksion harakatlari. `s` joyida o'zgaradi (chaqiruvchi klonlagan). */
export function auctionAct(s: GameState, a: AuctionAction): Res {
  if (a.type === "auction_list") return listOwn(s, a);
  const au = s.auction; if (!au) return { ok: false, error: "no_auction" };
  const me = s.players[idx(s, a.playerId === "server" ? au.owner : a.playerId)];
  switch (a.type) {
    case "auction_buyback": {
      if (au.format !== "majburiy" || au.phase !== "owner") return { ok: false, error: "auction_phase" };
      if (a.playerId !== au.owner) return { ok: false, error: "not_owner" };
      if (me.cash < au.due) return { ok: false, error: "insufficient_cash" };
      settle(s, { buyback: true }); startAuction(s); return { ok: true };
    }
    case "auction_decline": {
      if (au.format !== "majburiy" || au.phase !== "owner") return { ok: false, error: "auction_phase" };
      if (a.playerId !== au.owner) return { ok: false, error: "not_owner" };
      au.phase = "open"; logf(s, `${au.owner}: garovni qaytarib olmadi — auksion ochildi`); advance(s); startAuction(s); return { ok: true };
    }
    case "auction_bid": {
      if (au.phase !== "open") return { ok: false, error: "auction_phase" };
      if (a.playerId === au.owner) return { ok: false, error: "owner_cannot_bid" };
      if (!canBid(s, au, me, 0)) return { ok: false, error: "not_eligible" };
      if (!Number.isInteger(a.amount) || a.amount % au.step !== 0) return { ok: false, error: "invalid_amount" };
      if (au.best?.playerId === a.playerId) return { ok: false, error: "already_leader" };
      if (a.amount < nextMinBid(au)) return { ok: false, error: "bid_low" };
      if (me.cash < a.amount) return { ok: false, error: "insufficient_cash" };
      au.best = { playerId: a.playerId, amount: a.amount }; au.bids++; au.passed = [];
      advance(s); startAuction(s); return { ok: true };
    }
    case "auction_pass": {
      if (au.phase !== "open") return { ok: false, error: "auction_phase" };
      if (a.playerId === au.owner || !canBid(s, au, me, 0)) return { ok: false, error: "not_eligible" };
      if (au.best?.playerId === a.playerId) return { ok: false, error: "already_leader" };
      if (!au.passed.includes(a.playerId)) au.passed.push(a.playerId);
      advance(s); startAuction(s); return { ok: true };
    }
    case "auction_close": { // faqat server (vaqt tugadi)
      if (a.playerId !== "server") return { ok: false, error: "bad_action" };
      if (au.phase !== "open") return { ok: false, error: "auction_phase" };
      au.best ? settle(s, { buyer: au.best.playerId, price: au.best.amount }) : settle(s, { buyer: null });
      startAuction(s); return { ok: true };
    }
  }
}

/** Bot qarori (sof funksiya). Botning o'z chegarasi bor: narxning 90, 100 yoki 110 % (bot ID siga qarab); qadam — boshlang'ich narxning 5 %. */
export function botAuctionAction(s: GameState, botId: string): Action | null {
  const au = s.auction; if (!au) return null; const me = s.players.find((p) => p.id === botId); if (!me) return null;
  if (au.phase === "owner") return botId !== au.owner ? null : me.cash >= au.due ? { type: "auction_buyback", playerId: botId } : { type: "auction_decline", playerId: botId };
  if (botId === au.owner || au.passed.includes(botId) || au.best?.playerId === botId) return null;
  if (!canBid(s, au, me, 0)) return null;
  const value = au.lot.reduce((t, x) => t + x.price, 0), pct = 90 + ([...botId].reduce((h, c) => h + c.charCodeAt(0), 0) % 3) * 10;
  const max = Math.floor((value * pct) / 100 / au.step) * au.step, jump = Math.max(au.step, Math.ceil((au.start * 0.05) / au.step) * au.step);
  const next = au.best ? au.best.amount + jump : nextMinBid(au);
  return next <= max && me.cash >= next && canBid(s, au, me, next) ? { type: "auction_bid", playerId: botId, amount: next } : { type: "auction_pass", playerId: botId };
}
