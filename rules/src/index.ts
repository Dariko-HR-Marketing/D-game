// POYGA qoidalar dvigateli: sof funksiyalar, UI va tarmoqsiz. Manba: docs/SPEC.md §5.
export const RULES = {
  bankLimit: 10_000, // §5.3
  bankTermMonths: 36,
  bankAnnualRate: 0.2,
  exitCash: 1_000_000, // §5.4
  exitPassiveFlow: 25_000,
  winCashflow: 100_000, // §5.5
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
} as const;

/** §5.3: oylik to'lov = summa / 36 + summa × 20 % / 12. Yaxlitlash qoidasi berilmagan (§16). */
export function bankMonthlyPayment(amount: number): number {
  return amount / RULES.bankTermMonths + (amount * RULES.bankAnnualRate) / 12;
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

/** §5.4: chiqish uchun uchta shart bir vaqtda + hamkorlik yopilgan. */
export function canExitSmallCircle(b: Blank): boolean {
  return (
    b.cash >= RULES.exitCash &&
    b.passiveIncome - b.expenses >= RULES.exitPassiveFlow &&
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

/** §5.8 Qarov: oylik xarajat +100. */
export const withQar = (monthlyExpenses: number) => monthlyExpenses + RULES.qarMonthly;

/** §5.9: har 100 ball — daraja. */
export const levelFromPoints = (points: number) => Math.floor(Math.max(0, points) / RULES.pointsPerLevel);

export * from "./engine";
export * from "./game";
export * from "./analysis";
