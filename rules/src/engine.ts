// O'yin holati va tranzitsiyalar (sof, deterministik). Tasodifiylik `Rng` orqali tashqaridan beriladi (SPEC §6.6).
import type { Effect } from "@poyga/content/effects";
import { RULES, bankMonthlyPayment, bankPrincipalDue } from "./index";

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
  recouped?: number;     // sherik tomonda: ulushdan shu paytgacha olingan foyda
  dividendLeft?: number; // sherik tomonda: ulush qaytgach qolgan dividend oylari (qaror #64)
  pledged?: "bank" | "lombard"; // garovda: sotib, qayta garovga qo'yib bo'lmaydi
  tokens?: number;       // katta aylana biznesi: egalik fishkalari (2 bo'lsa keyingi sotib olish 3× narxda, qo'llanma §13)
}
/** Bank krediti: asl summa va qolgan oylar. Oylik to'lov = summa/36 + summa×20 %/12 (§5.3), 36 oy davomida. */
export interface BankLoan { amount: number; left: number; collateral?: { code: string; price: number }[] }
/** Lombard (qo'llanma §08): garov qiymatining 50 % i; foiz oyiga 10 % (xarajatga qo'shiladi), asosiy qarz 12 oydan keyin birdaniga. */
export interface Lombard { code: string; price: number; amount: number; left: number }
export interface Player {
  id: string; pos: number; circle: "small" | "big"; profession: number;
  cash: number; salary: number; baseExpenses: number; childCost: number; children: number;
  assets: Asset[]; bankDebt: number; bankLoans: BankLoan[]; twoDice?: number; crisisMonths?: number; // inqiroz (§5.7): qolgan oylar (36 oy = 9 aylana × 4 oy)
  // Xayriya: keyingi N navbatda 2 ta kubik (§5.10)
  qar: boolean; insuredCar: boolean; handLoans: number;
  lombards?: Lombard[]; owe?: number; // owe: kichik aylanadagi qarz (naqd yetmaganda yoziladi, naqd paydo bo'lishi bilan yopiladi; chegara 10 000)
}

export function newPlayer(id: string, k: { n: number; salary: number; total: number; save: number; child: number }): Player {
  return { id, pos: 0, circle: "small", profession: k.n, cash: k.save, salary: k.salary, baseExpenses: k.total, childCost: k.child,
    children: 0, assets: [], bankDebt: 0, bankLoans: [], qar: false, insuredCar: false, handLoans: 0 };
}

export const passiveIncome = (p: Player) => p.assets.reduce((s, a) => s + a.monthlyIncome, 0);
export const monthlyExpenses = (p: Player) =>
  p.baseExpenses + p.children * p.childCost + p.assets.reduce((s, a) => s + a.creditPayment, 0) +
  p.bankLoans.reduce((t, l) => t + bankMonthlyPayment(l.amount), 0) + (p.lombards ?? []).reduce((t, l) => t + l.amount * RULES.lombardMonthlyRate, 0) + (p.qar ? RULES.qarMonthly : 0);
export const playerCashflow = (p: Player) => p.salary + passiveIncome(p) - monthlyExpenses(p);
export const totalDebt = (p: Player) => p.bankDebt + p.assets.reduce((s, a) => s + a.credit, 0);
/** Barcha ochiq majburiyatlar: bank krediti, aktiv kreditlari, qarz (owe), lombard asosiy qarzi. Chiqish sharti uchun. */
export const allDebt = (p: Player) => totalDebt(p) + (p.owe ?? 0) + (p.lombards ?? []).reduce((s, l) => s + l.amount, 0);

/** Garovga yaroq aktiv: erkin, sheriklik emas, qimmatbaho qog'oz emas (qo'llanma §08). */
export const pledgeable = (a: Asset) => !a.pledged && !a.stakeOf && !a.partnerId && a.kind !== "shares" && a.kind !== "partner_stake";
export const collateralValue = (a: Asset) => Math.max(0, a.price - a.credit);
const monthlyIncomeOf = (p: Player) => p.salary + passiveIncome(p);
/** Hozir olish mumkin bo'lgan eng katta bank krediti (100 ga karrali, 2 000–5 000; garov 120 %; to'lov daromaddan oshmasin; yig'indi limiti). 0 — kredit berilmaydi. */
export function maxBankLoan(p: Player): number {
  const free = p.assets.filter(pledgeable).reduce((s, a) => s + collateralValue(a), 0);
  let amt = Math.min(RULES.bankMax, RULES.bankLimit - p.bankDebt, Math.floor(free / RULES.bankCollateralShare / 100) * 100);
  const existing = p.bankLoans.reduce((t, l) => t + bankMonthlyPayment(l.amount), 0);
  while (amt >= RULES.bankMin && existing + bankMonthlyPayment(amt) > monthlyIncomeOf(p)) amt -= 100;
  return amt >= RULES.bankMin ? amt : 0;
}
/** Garovga eng kichik yetarli to'plam (arzonlaridan boshlab). */
function pickCollateral(p: Player, amount: number): Asset[] {
  const need = amount * RULES.bankCollateralShare; const out: Asset[] = []; let sum = 0;
  for (const a of [...p.assets.filter(pledgeable)].sort((x, y) => collateralValue(x) - collateralValue(y))) { if (sum >= need) break; out.push(a); sum += collateralValue(a); }
  return sum >= need ? out : [];
}
const unpledge = (assets: Asset[], codes: { code: string; price: number }[], kind: "bank" | "lombard"): Asset[] => {
  const left = [...codes]; return assets.map((a) => { const i = a.pledged === kind ? left.findIndex((c) => c.code === a.code && c.price === a.price) : -1; if (i < 0) return a; left.splice(i, 1); return { ...a, pledged: undefined }; });
};

/** Bir oy o'tdi: kredit muddati qisqaradi, asosiy qarz (summa/36) kamayadi; muddati tugagan kreditning garovi bo'shaydi.
 *  Lombard 12-oyda: asosiy qarz naqddan to'lanadi, naqd yetmasa garov yo'qoladi. */
export function tickLoans<T extends Player>(p: T): T {
  let q: T = p;
  if (q.bankLoans.length > 0) {
    const all = q.bankLoans.map((l) => ({ ...l, left: l.left - 1 })); const loans = all.filter((l) => l.left > 0);
    let assets = q.assets; for (const l of all.filter((x) => x.left <= 0)) if (l.collateral) assets = unpledge(assets, l.collateral, "bank");
    q = { ...q, assets, bankLoans: loans, bankDebt: loans.reduce((t, l) => t + bankPrincipalDue(l.amount, l.left), 0) };
  }
  if ((q.lombards ?? []).length > 0) {
    let cash = q.cash, assets = q.assets; const keep: Lombard[] = [];
    for (const l of q.lombards!.map((x) => ({ ...x, left: x.left - 1 }))) {
      if (l.left > 0) { keep.push(l); continue; }
      if (cash >= l.amount) { cash -= l.amount; assets = unpledge(assets, [l], "lombard"); }
      else { const k = assets.findIndex((a) => a.pledged === "lombard" && a.code === l.code && a.price === l.price); if (k >= 0) assets = assets.filter((_, n) => n !== k); }
    }
    q = { ...q, cash, assets, lombards: keep };
  }
  return q;
}
export const passMonths = (p: Player, n: number): Player => {
  let q = p; for (let i = 0; i < n; i++) q = tickLoans({ ...q, cash: q.cash + playerCashflow(q) }); return q;
};

/** Bank krediti (qo'llanma §08): faqat biznes/aksiya/aktiv sotib olish uchun (chaqiruvchi tekshiradi). Garov va to'lov sharti bajarilmasa — `ok: false`. */
export function takeBankLoan(p: Player, amount: number): { player: Player; ok: boolean } {
  if (!Number.isInteger(amount) || amount % 100 !== 0 || amount < RULES.bankMin || amount > maxBankLoan(p)) return { player: p, ok: false };
  const col = pickCollateral(p, amount); if (col.length === 0) return { player: p, ok: false };
  const marks = new Set(col); const pledged = p.assets.map((a) => (marks.has(a) ? { ...a, pledged: "bank" as const } : a));
  return { ok: true, player: { ...p, assets: pledged, bankDebt: p.bankDebt + amount, cash: p.cash + amount,
    bankLoans: [...p.bankLoans, { amount, left: RULES.bankTermMonths, collateral: col.map((a) => ({ code: a.code, price: a.price })) }] } };
}
/** Muddatidan oldin yopish: kamida 3 aylana (12 oy) o'tgach; qolgan asosiy qarz naqd to'lanadi, garov bo'shaydi. */
export function repayBankLoan(p: Player, idx: number): { player: Player; ok: boolean; cost: number } {
  const l = p.bankLoans[idx]; if (!l) return { player: p, ok: false, cost: 0 };
  const cost = bankPrincipalDue(l.amount, l.left);
  if (RULES.bankTermMonths - l.left < RULES.bankEarlyCloseMonths || p.cash < cost) return { player: p, ok: false, cost };
  const loans = p.bankLoans.filter((_, n) => n !== idx);
  return { ok: true, cost, player: { ...p, cash: p.cash - cost, bankLoans: loans, bankDebt: loans.reduce((t, x) => t + bankPrincipalDue(x.amount, x.left), 0), assets: l.collateral ? unpledge(p.assets, l.collateral, "bank") : p.assets } };
}
/** Lombard: aktivni garovga qo'yib qiymatining 50 % ini naqd olish. */
export function takeLombard(p: Player, assetIdx: number): { player: Player; ok: boolean } {
  const a = p.assets[assetIdx]; if (!a || !pledgeable(a)) return { player: p, ok: false };
  const amount = Math.floor((a.price * RULES.lombardShare) / 100) * 100; if (amount <= 0) return { player: p, ok: false };
  return { ok: true, player: { ...p, cash: p.cash + amount, assets: p.assets.map((x, n) => (n === assetIdx ? { ...x, pledged: "lombard" as const } : x)),
    lombards: [...(p.lombards ?? []), { code: a.code, price: a.price, amount, left: RULES.lombardTermMonths }] } };
}
/** Qarz (owe) naqd paydo bo'lishi bilan darhol yopiladi (qo'llanma §09). */
export const settleOwe = <T extends Player>(p: T): T => ((p.owe ?? 0) > 0 && p.cash > 0 ? { ...p, cash: p.cash - Math.min(p.cash, p.owe!), owe: p.owe! - Math.min(p.cash, p.owe!) } : p);

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
    case "carInsurance": // faqat mashinasi borga (yo'q bo'lsa karta o'tkaziladi)
      if (!p.assets.some((a) => a.kind === "car")) return { ok: false, reason: "not_applicable" };
      return pay(e.price, { ...p, insuredCar: true });
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

/** Hisob varag'idagi joylar (hisob listi): ko'chmas mulk 5, kichik biznes 6, katta biznes 7. Aksiya, mashina va kolleksiya cheklanmaydi. */
export const SLOT_LIMITS = { realty: 5, small_business: 6, business: 7 } as const;
export type SlotKey = keyof typeof SLOT_LIMITS;
export const slotKey = (kind: string): SlotKey | null =>
  kind === "land" || kind === "dacha" || kind === "apartment" ? "realty" : kind === "small_business" ? "small_business" : kind === "business" ? "business" : null;
/** Shu turdagi aktivlar soni (sherikning ulushi `partner_stake` hisobga kirmaydi — u hisob varag'ida joy olmaydi). */
export const slotCount = (p: { assets: Asset[] }, key: SlotKey) => p.assets.filter((a) => slotKey(a.kind) === key).length;
/** Shu turdagi yangi aktiv uchun joy qolmaganmi? */
export const slotFull = (p: { assets: Asset[] }, kind: string) => { const k = slotKey(kind); return k !== null && slotCount(p, k) >= SLOT_LIMITS[k]; };
/** Ixtiyoriy sotish mumkin bo'lgan aktiv: ko'chmas mulk va bizneslar (sheriklikdagi va garovdagi emas). Aksiya faqat bozor kartasi bilan sotiladi. */
export const voluntarySellable = (a: Asset) => slotKey(a.kind) !== null && !a.partnerId && !a.stakeOf && !a.pledged;

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
