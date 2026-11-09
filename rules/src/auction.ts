// Garov auksioni (halol moliya, buyurtmachi qarori 2026-11-09): to'lanmagan lombard yoki bank kreditining garovi
// avval egasiga taklif qilinadi, u olmasa boshqa o'yinchilar o'rtasida auksionga qo'yiladi.
// Boshlang'ich narx = bankning qarzi + qo'shimcha haq (+ aktivning o'z krediti). Eng ko'p bergan oladi; bank o'z haqini olib,
// ORTIQCHASINI EGASIGA QAYTARADI. Hamma taymerlar serverda (holatda faqat bosqich va takliflar), shuning uchun jurnaldan qayta o'ynash deterministik.
import { RULES, bankLoanPayoff, bankPrincipalDue, lombardPayoff } from "./index";
import { slotFull, unpledge, type Asset } from "./engine";
import type { GameState, GamePlayer, Action } from "./game";

export interface Auction {
  id: number; owner: string; kind: "lombard" | "bank"; loanIdx: number;
  lot: { code: string; kind: string; price: number; cardId?: string; credit: number }[];
  due: number;      // bankka qarz + qo'shimcha haqning to'lanmagan qismi
  reserve: number;  // boshlang'ich narx: due + garovdagi aktivlarning o'z kreditlari (sotuvdan yopiladi)
  phase: "owner" | "open";
  best: { playerId: string; amount: number } | null;
  bids: number; passed: string[];
}

export type AuctionAction =
  | { type: "auction_buyback"; playerId: string }
  | { type: "auction_decline"; playerId: string; auto?: true }
  | { type: "auction_bid"; playerId: string; amount: number }
  | { type: "auction_pass"; playerId: string }
  | { type: "auction_close"; playerId: string };
export const isAuctionAction = (a: { type: string }): a is AuctionAction => a.type.startsWith("auction_");

type Res = { ok: true } | { ok: false; error: string };
const idx = (s: GameState, id: string) => s.players.findIndex((p) => p.id === id);
const logf = (s: GameState, m: string) => { s.log.push(m); s.logN = (s.logN ?? 0) + 1; if (s.log.length > 30) s.log.splice(0, s.log.length - 30); };

/** Garov (lot) bo'lgan aktivlar indekslari. Lombard: bitta aktiv; bank krediti: kredit garovi sifatida belgilangan hamma aktivlar. */
function lotIdx(p: GamePlayer, kind: "lombard" | "bank", loanIdx: number): number[] {
  const out: number[] = [];
  const take = (code: string, price: number) => { const i = p.assets.findIndex((a, n) => !out.includes(n) && a.pledged === kind && a.code === code && a.price === price); if (i >= 0) out.push(i); };
  if (kind === "lombard") { const l = (p.lombards ?? [])[loanIdx]; if (l) take(l.code, l.price); }
  else for (const c of p.bankLoans[loanIdx]?.collateral ?? []) take(c.code, c.price);
  return out;
}

/** Qaysi majburiyat sotuvni boshlaydi: egasi tomonidan eng erta olingan (qo'llanma: «birinchi qaysi olingan bo'lsa, o'shasi»). */
export function nextDefault(s: GameState): { pid: string; kind: "lombard" | "bank"; loanIdx: number } | null {
  for (const p of s.players) {
    const c: { kind: "lombard" | "bank"; loanIdx: number; since: number }[] = [];
    (p.lombards ?? []).forEach((l, i) => { if (l.overdue) c.push({ kind: "lombard", loanIdx: i, since: l.since ?? 0 }); });
    if ((p.missed ?? 0) >= RULES.missedMonthsToSale && p.bankLoans.length > 0) {
      let b = 0; p.bankLoans.forEach((l, i) => { if ((l.since ?? 0) < (p.bankLoans[b].since ?? 0)) b = i; });
      c.push({ kind: "bank", loanIdx: b, since: p.bankLoans[b].since ?? 0 });
    }
    if (c.length === 0) continue;
    c.sort((x, y) => x.since - y.since || (x.kind === "bank" ? -1 : 1));
    return { pid: p.id, kind: c[0].kind, loanIdx: c[0].loanIdx };
  }
  return null;
}

/** Taklif qila oladimi: boshqa o'yinchi, 16 yoshgacha emas, bir aylanada, naqdi yetadi, aktivlar uchun joy bor. */
export function canBid(s: GameState, a: Auction, p: GamePlayer, amount: number): boolean {
  const owner = s.players[idx(s, a.owner)];
  if (p.id === a.owner || s.restricted.includes(p.id) || p.circle !== owner.circle || p.cash < amount) return false;
  const extra: Record<string, number> = {};
  for (const l of a.lot) {
    const probe = { assets: [...p.assets, ...Array.from({ length: extra[l.kind] ?? 0 }, () => ({ kind: l.kind }) as Asset)] };
    if (slotFull(probe, l.kind)) return false;
    extra[l.kind] = (extra[l.kind] ?? 0) + 1;
  }
  return true;
}
export const nextMinBid = (a: Auction) => (a.best ? a.best.amount + RULES.auctionBidStep : a.reserve);
/** Hozir harakat qila oladigan (hali o'tkazmagan, yetakchi emas) takliflovchilar. */
export const activeBidders = (s: GameState, a: Auction): GamePlayer[] =>
  s.players.filter((p) => !a.passed.includes(p.id) && a.best?.playerId !== p.id && canBid(s, a, p, nextMinBid(a)));

/** Majburiyatni yopib, garovni topshiradi/qaytaradi. `buyer`: g'olib (yoki bank — null); `price`: g'olib to'lagan summa. */
function settle(s: GameState, how: { buyer: string; price: number } | { buyer: null } | { buyback: true }) {
  const a = s.auction!; const oi = idx(s, a.owner); let o = { ...s.players[oi] };
  const ids = lotIdx(o, a.kind, a.loanIdx);
  const lot = ids.map((i) => o.assets[i]);
  const loans = a.kind === "lombard" ? (o.lombards ?? []) : o.bankLoans;
  const loan = loans[a.loanIdx]; const collateral = a.kind === "bank" ? o.bankLoans[a.loanIdx]?.collateral : undefined;
  const rest = (xs: Asset[]) => xs.filter((_, i) => !ids.includes(i));
  const dropLoan = () => {
    if (a.kind === "lombard") o.lombards = (o.lombards ?? []).filter((_, n) => n !== a.loanIdx);
    else { o.bankLoans = o.bankLoans.filter((_, n) => n !== a.loanIdx); o.bankDebt = o.bankLoans.reduce((t, l) => t + bankPrincipalDue(l.amount, l.left), 0); o.missed = 0; }
  };
  if ("buyback" in how) { // egasi qarzni to'laydi, aktivlar o'zida qoladi (aktivning o'z krediti davom etadi)
    o.cash -= a.due; if (loan) { dropLoan(); if (a.kind === "bank") { if (collateral) o.assets = unpledge(o.assets, collateral, "bank"); } else o.assets = unpledge(o.assets, [loan as { code: string; price: number }], "lombard"); }
    s.players[oi] = o; logf(s, `${a.owner}: garovdagi qarzni to'lab, mulkini saqlab qoldi (${a.due})`); s.auction = null; return;
  }
  const lotValue = lot.reduce((t, x) => t + x.price, 0);
  const proceeds = how.buyer ? how.price : lotValue; // g'olib bo'lmasa — bank garovni aktivning narxida oladi
  const surplus = proceeds - a.reserve;
  o.assets = rest(o.assets);
  if (loan) { dropLoan(); if (collateral) o.assets = unpledge(o.assets, collateral, "bank"); }
  if (surplus >= 0) o.cash += surplus; else o.owe = (o.owe ?? 0) - surplus; // yetmagan qismi qarz bo'lib qoladi (qo'shimcha foiz yo'q)
  s.players[oi] = o;
  if (how.buyer) {
    const bi = idx(s, how.buyer); const w = { ...s.players[bi] }; w.cash -= how.price;
    let left = how.price;
    lot.forEach((x, k) => { const share = k === lot.length - 1 ? left : Math.round((how.price * x.price) / (lotValue || 1)); left -= share; w.assets = [...w.assets, { ...x, pledged: undefined, credit: 0, creditPayment: 0, price: share }]; });
    s.players[bi] = w;
    logf(s, `${how.buyer}: garov auksionida ${how.price} ga sotib oldi; ${a.owner} ga ortiqcha ${Math.max(0, surplus)} qaytarildi`);
  } else logf(s, `Garov auksionida taklif bo'lmadi: bank mulkni ${lotValue} ga oldi, ${a.owner} ga ortiqcha ${Math.max(0, surplus)} qaytarildi`);
  s.auction = null;
}

/** Bosqichni oldinga suradi: sotib oladigan qolmagan bo'lsa yoki hamma o'tkazgan bo'lsa auksion yopiladi. */
function advance(s: GameState) {
  const a = s.auction; if (!a) return;
  if (a.phase === "owner" && s.players[idx(s, a.owner)].cash < a.due) a.phase = "open"; // egasida qarzni to'lashga pul yo'q — kutish befoyda
  if (a.phase === "open" && activeBidders(s, a).length === 0) a.best ? settle(s, { buyer: a.best.playerId, price: a.best.amount }) : settle(s, { buyer: null });
}

/** To'lanmagan majburiyat bor bo'lsa auksionni ochadi (agar boshqasi ochiq bo'lmasa). */
export function startAuction(s: GameState) {
  if (!s.halalFin) return;
  for (let guard = 0; !s.auction && guard < 20; guard++) {
    const d = nextDefault(s); if (!d) return;
    const o = s.players[idx(s, d.pid)]; const ids = lotIdx(o, d.kind, d.loanIdx);
    const l = d.kind === "lombard" ? (o.lombards ?? [])[d.loanIdx] : o.bankLoans[d.loanIdx];
    const due = d.kind === "lombard" ? lombardPayoff(l) : bankLoanPayoff(l);
    const lot = ids.map((i) => ({ code: o.assets[i].code, kind: o.assets[i].kind, price: o.assets[i].price, cardId: o.assets[i].cardId, credit: o.assets[i].credit }));
    const a: Auction = { id: (s.nextAuction = (s.nextAuction ?? 0) + 1), owner: d.pid, kind: d.kind, loanIdx: d.loanIdx, lot, due, reserve: due + lot.reduce((t, x) => t + x.credit, 0), phase: "owner", best: null, bids: 0, passed: [] };
    s.auction = a;
    logf(s, `${d.pid}: to'lanmagan ${d.kind === "bank" ? "bank krediti" : "lombard"} garovi auksionga qo'yildi (boshlang'ich narx ${a.reserve})`);
    if (lot.length === 0) { // garov topilmadi (kutilmagan): majburiyat egasining qarziga o'tadi
      s.auction = null; const oo = { ...o }; const pay = Math.min(Math.max(0, oo.cash), due); oo.cash -= pay; oo.owe = (oo.owe ?? 0) + (due - pay);
      if (d.kind === "lombard") oo.lombards = (oo.lombards ?? []).filter((_, n) => n !== d.loanIdx); else { oo.bankLoans = oo.bankLoans.filter((_, n) => n !== d.loanIdx); oo.missed = 0; oo.bankDebt = oo.bankLoans.reduce((t, x) => t + bankPrincipalDue(x.amount, x.left), 0); }
      s.players[idx(s, d.pid)] = oo; continue;
    }
    advance(s);
  }
}

/** Auksion harakatlari. `s` joyida o'zgaradi (chaqiruvchi klonlagan). */
export function auctionAct(s: GameState, a: AuctionAction): Res {
  const au = s.auction; if (!au) return { ok: false, error: "no_auction" };
  const me = s.players[idx(s, a.playerId === "server" ? au.owner : a.playerId)];
  switch (a.type) {
    case "auction_buyback": {
      if (au.phase !== "owner") return { ok: false, error: "auction_phase" };
      if (a.playerId !== au.owner) return { ok: false, error: "not_owner" };
      if (me.cash < au.due) return { ok: false, error: "insufficient_cash" };
      settle(s, { buyback: true }); startAuction(s); return { ok: true };
    }
    case "auction_decline": {
      if (au.phase !== "owner") return { ok: false, error: "auction_phase" };
      if (a.playerId !== au.owner) return { ok: false, error: "not_owner" };
      au.phase = "open"; logf(s, `${au.owner}: garovni qaytarib olmadi — auksion ochildi`); advance(s); startAuction(s); return { ok: true };
    }
    case "auction_bid": {
      if (au.phase !== "open") return { ok: false, error: "auction_phase" };
      if (a.playerId === au.owner) return { ok: false, error: "owner_cannot_bid" };
      if (!canBid(s, au, me, 0)) return { ok: false, error: "not_eligible" };
      if (!Number.isInteger(a.amount) || a.amount % 100 !== 0) return { ok: false, error: "invalid_amount" };
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

/** Bot qarori (server vaqti kelganda yuboradi; sof funksiya). Egasi bo'lsa — qarzni to'lab qoladi (pul yetsa); aks holda arzon narxda taklif qiladi yoki o'tkazadi. */
export function botAuctionAction(s: GameState, botId: string): Action | null {
  const au = s.auction; if (!au) return null; const me = s.players.find((p) => p.id === botId); if (!me) return null;
  if (au.phase === "owner") return botId !== au.owner ? null : me.cash >= au.due ? { type: "auction_buyback", playerId: botId } : { type: "auction_decline", playerId: botId };
  if (botId === au.owner || au.passed.includes(botId) || au.best?.playerId === botId) return null;
  if (!canBid(s, au, me, 0)) return null;
  // Har bir botning o'z narx chegarasi bor (aktiv narxining 60–90 %, bot ID siga qarab); taklif qadami — boshlang'ich narxning 5 % i (urush uzoq cho'zilmasin)
  const value = au.lot.reduce((t, x) => t + x.price, 0), pct = 60 + ([...botId].reduce((h, c) => h + c.charCodeAt(0), 0) % 4) * 10;
  const max = Math.floor((value * pct) / 10_000) * 100, jump = Math.max(RULES.auctionBidStep, Math.ceil((au.reserve * 0.05) / 100) * 100);
  const next = au.best ? au.best.amount + jump : au.reserve;
  return next <= max && me.cash >= next && canBid(s, au, me, next) ? { type: "auction_bid", playerId: botId, amount: next } : { type: "auction_pass", playerId: botId };
}
