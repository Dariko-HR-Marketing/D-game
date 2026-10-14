// O'yin holati va tranzitsiyalar (sof, deterministik). Tasodifiylik `Rng` orqali tashqaridan beriladi (SPEC §6.6).
import type { Effect } from "@poyga/content/effects";
import { RULES, bankMonthlyPayment } from "./index";

export type Rng = () => number; // [0,1)

/** Tekshiriladigan deterministik tasodifiy manba (mulberry32); serverda urug' jurnalga yoziladi. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rollDie = (rng: Rng) => 1 + Math.floor(rng() * 6);

export function shuffle<T>(xs: readonly T[], rng: Rng): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** §5.2: deka qaytarmasdan tortiladi; tugagach tashlanma qoziq aralashtiriladi. */
export interface Deck<T> { draw: T[]; discard: T[] }
export const newDeck = <T>(cards: readonly T[], rng: Rng): Deck<T> => ({ draw: shuffle(cards, rng), discard: [] });
export function drawCard<T>(d: Deck<T>, rng: Rng): { card: T; deck: Deck<T> } {
  let { draw, discard } = d;
  if (draw.length === 0) { draw = shuffle(discard, rng); discard = []; }
  if (draw.length === 0) throw new Error("deka bo'sh");
  const [card, ...rest] = draw;
  return { card, deck: { draw: rest, discard: [...discard, card] } };
}

/** A ilova: kichik aylana, 48 katak, 0 = START. */
export const SMALL_BOARD = "SIHIHIBIHBIDBIHBHIHBDHBIHIOBIBIQBHIDBHIBHIBIDBKB";
export type SmallCell = "S" | "I" | "H" | "B" | "D" | "K" | "Q" | "O";
export const smallCell = (i: number) => SMALL_BOARD[((i % 48) + 48) % 48] as SmallCell;

/** §5.1: «D» katagidan o'tish yoki tushish — bitta oy. */
export function move(pos: number, steps: number, size = 48, isD: (i: number) => boolean = (i) => smallCell(i) === "D") {
  let months = 0;
  for (let s = 1; s <= steps; s++) if (isD((pos + s) % size)) months++;
  return { pos: (pos + steps) % size, months };
}

export interface Asset {
  kind: string; code: string; price: number; monthlyIncome: number; creditPayment: number; credit: number;
  shares?: number;
  marketValue?: number | null; // kartadagi haqiqiy qiymat (bozor hodisalari uchun); null = noma'lum
  partnerId?: string; // egasi tomonda: sherik
  stakeOf?: string;   // sherik tomonda: biznes egasi
}
/** Bank krediti: asl summa va qolgan oylar. Oylik to'lov = summa/36 + summa×20 %/12 (§5.3), 36 oy davomida. */
export interface BankLoan { amount: number; left: number }
export interface Player {
  id: string; pos: number; circle: "small" | "big"; profession: number;
  cash: number; salary: number; baseExpenses: number; childCost: number; children: number;
  assets: Asset[]; bankDebt: number; bankLoans: BankLoan[]; twoDice?: number; crisisMonths?: number; // inqiroz (§5.7): qolgan oylar (36 oy = 9 aylana × 4 oy)
  // Xayriya: keyingi N navbatda 2 ta kubik (§5.10)
  qar: boolean; insuredCar: boolean; handLoans: number;
}

export function newPlayer(id: string, k: { n: number; salary: number; total: number; save: number; child: number }): Player {
  return { id, pos: 0, circle: "small", profession: k.n, cash: k.save, salary: k.salary, baseExpenses: k.total, childCost: k.child,
    children: 0, assets: [], bankDebt: 0, bankLoans: [], qar: false, insuredCar: false, handLoans: 0 };
}

export const passiveIncome = (p: Player) => p.assets.reduce((s, a) => s + a.monthlyIncome, 0);
export const monthlyExpenses = (p: Player) =>
  p.baseExpenses + p.children * p.childCost + p.assets.reduce((s, a) => s + a.creditPayment, 0) +
  p.bankLoans.reduce((t, l) => t + bankMonthlyPayment(l.amount), 0) + (p.qar ? RULES.qarMonthly : 0);
export const playerCashflow = (p: Player) => p.salary + passiveIncome(p) - monthlyExpenses(p);
export const totalDebt = (p: Player) => p.bankDebt + p.assets.reduce((s, a) => s + a.credit, 0);

/** Bir oy o'tdi: kredit muddati qisqaradi, asosiy qarz (summa/36) kamayadi. */
export function tickLoans<T extends Player>(p: T): T {
  if (p.bankLoans.length === 0) return p;
  const loans = p.bankLoans.map((l) => ({ ...l, left: l.left - 1 })).filter((l) => l.left > 0);
  return { ...p, bankLoans: loans, bankDebt: loans.reduce((t, l) => t + (l.amount * l.left) / RULES.bankTermMonths, 0) };
}
export const passMonths = (p: Player, n: number): Player => {
  let q = p; for (let i = 0; i < n; i++) q = tickLoans({ ...q, cash: q.cash + playerCashflow(q) }); return q;
};

/** Bank krediti (§5.3). Limitdan oshsa — restart. */
export function takeBankLoan(p: Player, amount: number): { player: Player; restart: boolean } {
  if (p.bankDebt + amount > RULES.bankLimit) return { player: p, restart: true };
  return { player: { ...p, bankDebt: p.bankDebt + amount, bankLoans: [...p.bankLoans, { amount, left: RULES.bankTermMonths }], cash: p.cash + amount }, restart: false };
}

export type Result = { ok: true; player: Player } | { ok: false; reason: "insufficient_cash"; shortfall: number } | { ok: false; reason: "not_applicable" };

/** Ixtiyoriy/majburiy karta ta'sirini o'yinchiga qo'llash. Pul yetmasa — shortfall qaytadi (bank/hamkorlik oqimi uchun). */
export function applyEffect(p: Player, e: Effect): Result {
  const pay = (amt: number, next: Player): Result =>
    p.cash < amt ? { ok: false, reason: "insufficient_cash", shortfall: amt - p.cash } : { ok: true, player: { ...next, cash: next.cash - amt } };
  switch (e.kind) {
    case "gain": return { ok: true, player: { ...p, cash: p.cash + e.amount } };
    case "pay": return pay(e.amount, p);
    case "buy": {
      const upfront = e.down ?? e.price;
      return pay(upfront, { ...p, assets: [...p.assets, { kind: e.asset, code: e.code, price: e.price, monthlyIncome: e.monthlyIncome ?? 0,
        creditPayment: -(e.creditPayment ?? 0), credit: e.credit ?? 0, marketValue: e.marketValue }] });
    }
    case "buyShares": return { ok: false, reason: "not_applicable" }; // miqdorni o'yinchi tanlaydi: buyShares()
    case "lendRequest": // «Do'stingiz qarzga so'rayapti»: bugun beriladi, keyin «qarz qaytdi» kartasi qaytaradi (§5.10)
      return pay(e.amount, { ...p, handLoans: p.handLoans + 1 });
    case "charity": { // Umumiy oylik daromadning 10 % i to'lanadi, keyingi 3 navbatda 2 kubik (§5.10)
      const amt = Math.round(e.incomeShare * (p.salary + passiveIncome(p)));
      return pay(amt, { ...p, twoDice: (p.twoDice ?? 0) + e.turns });
    }
    case "qarOffer": return { ok: true, player: { ...p, qar: true } };
    case "courseSalaryPlus": return pay(e.price, { ...p, salary: p.salary + e.salaryPlus });
    case "businessIncomeIncrease": {
      const i = p.assets.findIndex((a) => a.kind === "small_business");
      if (i < 0) return { ok: false, reason: "not_applicable" };
      const assets = p.assets.map((a, k) => (k === i ? { ...a, monthlyIncome: a.monthlyIncome + e.amount } : a));
      return { ok: true, player: { ...p, assets } };
    }
    case "carInsurance": return pay(e.price, { ...p, insuredCar: true });
    case "floodCarRepair":
      if (!p.assets.some((a) => a.kind === "car")) return { ok: false, reason: "not_applicable" };
      return p.insuredCar ? { ok: true, player: p } : pay(e.amount, p);
    default: return { ok: false, reason: "not_applicable" };
  }
}

/** Aksiya: miqdor [min,max] oralig'ida. */
export function buyShares(p: Player, e: Extract<Effect, { kind: "buyShares" }>, qty: number): Result {
  if (!Number.isInteger(qty) || qty < e.min || qty > e.max) return { ok: false, reason: "not_applicable" };
  const cost = qty * e.pricePerShare;
  if (p.cash < cost) return { ok: false, reason: "insufficient_cash", shortfall: cost - p.cash };
  return { ok: true, player: { ...p, cash: p.cash - cost, assets: [...p.assets, { kind: "shares", code: e.code, price: cost, monthlyIncome: 0, creditPayment: 0, credit: 0, shares: qty }] } };
}

/** §5.6 Suyunchi / farzand: bolalar soni +1 (xarajat child bo'yicha). */
export const haveChild = (p: Player): Player => ({ ...p, children: p.children + 1 });

/** Bozor "sotish imkoniyati": mos aktivlarni sotish. */
export function sellAsset(p: Player, code: string, price: number): Result {
  const i = p.assets.findIndex((a) => a.code === code);
  if (i < 0) return { ok: false, reason: "not_applicable" };
  const a = p.assets[i];
  const proceeds = price - a.credit;
  return { ok: true, player: { ...p, cash: p.cash + proceeds, assets: p.assets.filter((_, k) => k !== i) } };
}

// ---------- Bozor: sotish imkoniyatlari (hamma mos aktivli o'yinchiga) ----------
const ALIAS: Record<string, string> = { mb: "kb", ye: "e", kch: "kch", d: "q" }; // bozor kodi → aktiv kodi
const norm = (c: string) => ALIAS[c.toLowerCase()] ?? c.toLowerCase();
export function assetMatches(targets: string[], a: Asset): boolean {
  return targets.some((t) => (t === "KV*" ? a.kind === "apartment" : norm(t) === norm(a.code)));
}
type Sale = Extract<Effect, { kind: "marketSale" }>["amount"];
/** Aktivni sotish narxi. null — bu aktivga narx qo'llanmaydi. */
export function marketPrice(amount: Sale, a: Asset): number | null {
  const unit = (v: number | null) => (v === null ? null : a.shares ? v * a.shares : v);
  if (typeof amount === "number") return unit(amount);
  const room = /^KV(\d)/.exec(a.code)?.[1];
  // Haqiqiy qiymat noma'lum (real = "?") bo'lsa — sotib olish narxi asos qilib olinadi (qaror: OPEN_QUESTIONS #60)
  const mv = a.marketValue ?? a.price;
  const o = amount as { addByType?: Record<string, number>; multiply?: number; percent?: number };
  if (o.addByType) { const add = room ? o.addByType[`KV${room}`] : undefined; return add === undefined ? null : mv + add; }
  if (o.multiply !== undefined) return mv * o.multiply;
  if (o.percent !== undefined) return mv * (1 + o.percent / 100);
  const v = (amount as Record<string, number>)[a.code]; return v === undefined ? null : v;
}
