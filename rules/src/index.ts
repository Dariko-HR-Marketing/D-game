// POYGA qoidalar dvigateli: sof funksiyalar, UI va tarmoqsiz. Manba: docs/SPEC.md §5.
/** Reytingli o'yinda ruxsat etilgan karta havzalari (Tajriba24 TZ §6.7, RANKED_ALLOWED_POOLS): hozircha faqat asl kartalar; «EXTENDED» qo'shilsa yangi kartalar ham kiradi. */
export const RANKED_ALLOWED_POOLS: readonly string[] = ["BASE"];

export const RULES = {
  bankLimit: 10_000, // §5.3 (qo'llanma §09: kichik aylanadagi qarz chegarasi; bank kreditlari yig'indisi ham shundan oshmaydi)
  bankMin: 2_000, bankMax: 5_000, // qo'llanma §08: mini-kredit 2 000–5 000
  bankCollateralShare: 1.2,       // garov = kredit summasining 120 %
  bankEarlyCloseMonths: 12,       // muddatidan oldin yopish: kamida 3 aylanadan (3 × 4 oy) keyin
  lombardShare: 0.5, lombardMonthlyRate: 0.1, lombardTermMonths: 12, // qo'llanma §08: garov qiymatining 50 %, oyiga 10 %, asosiy qarz 1 yil oxirida
  bankTermMonths: 36,
  bankAnnualRate: 0.2,
  exitCash: 1_000_000, // §5.4
  exitPassiveFlow: 25_000,
  winCashflow: 100_000, // §5.5
  quizXp: 0, // viktorinada to'g'ri javob uchun XP: jadvalda berilmagan — sozlamada bo'sh (0), buyurtmachi belgilaydi (SPEC §16)
  suyunchiBank: 500, // §5.6
  suyunchiMin: 10,
  suyunchiMax: 500,
  suyunchiStep: 10,
  mutualMinPlayers: 5,
  mutualGiverCashShare: 0.2,
  mutualLimitShare: 0.5,
  mutualMaxMonths: 36,
  partnerDividendMonths: 24,
  qarMonthly: 100, // §5.8
  pointsPerLevel: 100, // §5.9
  crisisLaps: 9, // §5.7
  cardDecisionSeconds: 30,
  // Taymer jadvali («Qoidalar» varag'i, buyurtmachi tasdig'i): qaror turiga qarab alohida; xona «sekin» bo'lsa hammasi ×2
  timerDiceSeconds: 10, timerMarketSeconds: 20, timerRentSeconds: 20, timerForcedPaySeconds: 60,
  autopilotAfter: 3,            // ketma-ket shuncha marta vaqt tugasa — avtopilot (qaytgach o'chadi, o'rin saqlanadi)
  disconnectAutopilotMinutes: 5, // shuncha vaqt uzilgan o'yinchi avtopilotda (o'rni saqlanadi, qaytsa o'chadi)
  dreamSeconds: 60, // orzu tanlash bosqichi (§6.4, N09): SPEC muddat aytmaydi — qaror (OPEN_QUESTIONS #61)
} as const;

/** Qo'llanma §08 kalkulyatori: oylik to'lov = ceil(summa / 36) + ceil(summa × 20 % / 12); 5 000 → 139 + 84 = 223. */
export function bankMonthlyPayment(amount: number): number {
  return Math.ceil(amount / RULES.bankTermMonths) + Math.ceil((amount * RULES.bankAnnualRate) / 12);
}
/** Qolgan asosiy qarz: summa − o'tgan oylar × ceil(summa / 36) (qo'llanma: 5 000 uchun 1 yildan keyin 3 332). */
export function bankPrincipalDue(amount: number, left: number): number {
  return Math.max(0, amount - (RULES.bankTermMonths - left) * Math.ceil(amount / RULES.bankTermMonths));
}

/** §5.3: bank limiti 10 000 dan oshsa — yangi kasb bilan boshidan. */
export function bankLoanCheck(existingDebt: number, request: number) {
  const total = existingDebt + request;
  return total > RULES.bankLimit
    ? ({ ok: false, restart: true } as const)
    : ({ ok: true, total, monthlyPayment: bankMonthlyPayment(total) } as const);
}

export interface Blank {
  cash: number;
  salary: number;
  passiveIncome: number;
  expenses: number; // oylik jami xarajat (kredit to'lovlari, bolalar, QAR bilan)
  bankDebt: number;
  otherDebt: number; // kreditlar (avto, uy...) va hamkorlik qarzlari
  openPartnerships: number;
}

/** Pul oqimi = oylik daromad − oylik xarajat (§3). */
export const cashflow = (b: Pick<Blank, "salary" | "passiveIncome" | "expenses">) =>
  b.salary + b.passiveIncome - b.expenses;

/** §5.1: «D» katagi — bitta oy, pul oqimi naqdga qo'shiladi. */
export function advanceMonth(b: Blank): Blank {
  return { ...b, cash: b.cash + cashflow(b) };
}

/** O'yin rejimlari (platforma fayli, buyurtmachi tasdig'i): standart, tez, reytingli, o'quv. `minutes` — vaqt chegarasi (tugagach o'yin yakunlanadi), `seats` — [eng kam, eng ko'p] o'yinchi. */
export type GameMode = "standard" | "quick" | "rated" | "tutorial";
export const GAME_MODES: readonly GameMode[] = ["standard", "quick", "rated", "tutorial"];
export const MODES: Record<GameMode, { seats: [number, number]; exitCash: number; exitPassive: number; minutes: number | null; rated: boolean; maxHumans?: number }> = {
  standard: { seats: [2, 8], exitCash: RULES.exitCash, exitPassive: RULES.exitPassiveFlow, minutes: null, rated: false },
  quick: { seats: [2, 6], exitCash: 250_000, exitPassive: 15_000, minutes: null, rated: false }, // «Tez o'yin»: 30–45 daqiqa; chiqish sharti yengil
  rated: { seats: [4, 6], exitCash: RULES.exitCash, exitPassive: RULES.exitPassiveFlow, minutes: 120, rated: true }, // «Reytingli»: 4–6 kishi, 120 daqiqa, liga reytingiga ta'sir qiladi
  tutorial: { seats: [3, 3], exitCash: 250_000, exitPassive: 15_000, minutes: 15, rated: false, maxHumans: 1 }, // «O'quv o'yini»: 1 odam + 2 bot, 15 daqiqa
};
export const modeOf = (m?: GameMode | null): GameMode => (m && m in MODES ? m : "standard");

/** §5.4 / qo'llanma §10: chiqish uchun uchta shart bir vaqtda (passiv daromad ≥ 25 000, naqd ≥ 1 000 000, qarzsiz) + hamkorlik yopilgan. Tez va o'quv rejimida chegaralar yengil (15 000 / 250 000). */
export function canExitSmallCircle(b: Blank, mode?: GameMode | null): boolean {
  const m = MODES[modeOf(mode)];
  return (
    b.cash >= m.exitCash &&
    b.passiveIncome >= m.exitPassive && // qo'llanma §10, TZ, yagona spetsifikatsiya: «25 000 sh.b. oylik passiv daromad» (xarajat ayrilmaydi)
    b.bankDebt + b.otherDebt === 0 &&
    b.openPartnerships === 0
  );
}

/** §5.5: g'alaba sharti uchta. */
export function hasWonBigCircle(p: { cashflow: number; onOwnDreamCell: boolean; cash: number; dreamPrice: number }): boolean {
  return p.cashflow >= RULES.winCashflow && p.onOwnDreamCell && p.cash >= p.dreamPrice;
}

/** §5.6 Suyunchi: ixtiyoriy 10–500, 10 qadam, naqdidan oshmaydi. */
export function isValidSuyunchi(amount: number, cash: number): boolean {
  const { suyunchiMin: lo, suyunchiMax: hi, suyunchiStep: s } = RULES;
  return Number.isInteger(amount) && amount >= lo && amount <= hi && amount % s === 0 && amount <= cash;
}

/** §5.6 O'zaro qarz. */
export function mutualLoanLimit(salary: number, passive: number): number {
  return (salary + passive) * RULES.mutualLimitShare * RULES.mutualMaxMonths;
}
export function checkMutualLoan(p: {
  players: number; // bot bo'lmagan o'yinchilar (§6.5)
  amount: number; months: number; giverCash: number; receiverSalary: number; receiverPassive: number;
  receiverExistingMutualDebt?: number;
}): { ok: true } | { ok: false; reason: string } {
  if (p.players < RULES.mutualMinPlayers) return { ok: false, reason: "5 dan kam o'yinchi" };
  if (p.amount > p.giverCash * RULES.mutualGiverCashShare) return { ok: false, reason: "beruvchi naqdining 20 % idan oshdi" };
  if (p.months > RULES.mutualMaxMonths) return { ok: false, reason: "36 oydan oshdi" };
  const limit = mutualLoanLimit(p.receiverSalary, p.receiverPassive);
  if (p.amount + (p.receiverExistingMutualDebt ?? 0) > limit) return { ok: false, reason: "oluvchi limitidan oshdi" };
  return { ok: true };
}

/** §5.6 Sheriklik: narx va foyda 50/50; sherik faqat naqd to'laydi. */
export function partnershipSplit(price: number, monthlyProfit: number) {
  return { partnerPays: price / 2, ownerPays: price / 2, partnerMonthlyProfit: monthlyProfit / 2, ownerMonthlyProfit: monthlyProfit / 2 };
}
/** Ulush qaytgach 24 oy dividend; keyin sotib olish: to'liq narx + 1 oylik foyda (bepul variant ham bor). */
export function partnerBuyoutPrice(fullPrice: number, monthlyProfit: number) {
  return fullPrice + monthlyProfit;
}

/** Ball qoidalari — «POYGA o'yin qo'llanmasi» §15 (o'yinchilar o'rtasida). 100 ball = 1 daraja. */
// Platforma: Ball, XP va liga (platforma fayli, buyurtmachi tasdig'i). Hisoblash — server/src/progress.ts.
export const BALL = {
  finish: 50, exit: 80, win: 150, firstOfDay: 20, tutorial: 50, place: [100, 60, 30], placeBase: 6,
  dailyCap: 500, expireDays: 365, minHumansFinish: 3, minHumans: 2,
} as const;
export const XP = { game: 100, botGame: 60, tutorial: 150, base: 200, step: 50, maxLevel: 50 } as const;
/** Liga chegaralari (reyting): platforma faylidagi jadval. */
export const LEAGUES = [
  { key: "bronze", from: 0 }, { key: "silver", from: 1100 }, { key: "gold", from: 1300 }, { key: "platinum", from: 1500 }, { key: "diamond", from: 1700 },
] as const;

export const POINTS = { finish: 10, asset: 5, quitJob: 20, exitSmallCircle: 40, win: 100, second: 30, third: 15, auto: -2, abandon: -20, unreliable: -50 } as const;

/** §5.8 Qarov: oylik xarajat +100. */
export const withQar = (monthlyExpenses: number) => monthlyExpenses + RULES.qarMonthly;

/** §5.9: har 100 ball — daraja. */
export const levelFromPoints = (points: number) => Math.floor(Math.max(0, points) / RULES.pointsPerLevel);

export * from "./engine";
export * from "./game";
export * from "./analysis";
