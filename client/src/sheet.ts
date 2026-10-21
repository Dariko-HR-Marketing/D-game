// «Hisob varag'i» (stol o'yinidagi «POYGA | KICHIK AYLANA» va «KATTA AYLANA» blanklari): hamma qiymat server holatidan olinadi, yangi hisob yo'q. React'siz — testlanadi.
import { RULES, SLOT_LIMITS, allDebt, bankMonthlyPayment, monthlyExpenses, monthlyBonus, passiveIncome, playerCashflow, salaryOf } from "@poyga/rules";
import { portfolioOf, type AssetRow } from "./portfolio";
import { nameOf } from "./model";

/** Qog'oz blankdagi qatorlar soni: bo'sh qatorlar ham ko'rinadi. Aktivlar uchun chegara dvigatelniki (SLOT_LIMITS) — o'yin ham shuni majburlaydi. */
export const SLOTS = { realty: SLOT_LIMITS.realty, small: SLOT_LIMITS.small_business, big: SLOT_LIMITS.business, lombard: 2, bank: 2 } as const;
/** Kasb kartasidagi xarajat satrlari (`exp[0..8]`, kartadagi tartibda) → blankdagi satr nomi va o'rni. Blankdagi «Uy ijarasi» va «O'qish xarajatlari» kartada yo'q: bo'sh qoladi. */
export const EXP_ROWS: { key: string; exp: number | null }[] = [
  { key: "flat", exp: 0 }, { key: "rent", exp: null }, { key: "flatCredit", exp: 2 }, { key: "food", exp: 1 }, { key: "carCredit", exp: 3 }, { key: "study", exp: null },
  { key: "training", exp: 5 }, { key: "phone", exp: 4 }, { key: "clothes", exp: 6 }, { key: "road", exp: 7 }, { key: "tax", exp: 8 },
];
export const SHARE_CODES = ["TAPOiCh", "KCH", "ZA", "UTK", "GZ"] as const;
const REALTY = new Set(["land", "dacha", "apartment"]);

export interface IncomeLine { title: string; income: number }
export interface SheetSmall {
  name: string; profession: string; dream: { name: string; price: number } | null;
  salary: number;
  realty: IncomeLine[]; small: IncomeLine[]; big: IncomeLine[]; other: IncomeLine[];
  totals: { active: number; passive: number; income: number; expenses: number; cashflow: number };
  shares: { code: string; count: number; price: number }[];
  debt: number;
  expenses: { lines: { key: string; value: number | null }[]; base: number; children: number; childCost: number; childTotal: number; credits: number; bank: number; lombard: number; qar: number; extra: number };
  lombards: { amount: number; payment: number }[]; banks: { amount: number; payment: number }[]; collateral: string[];
  months: number;
  exit: { cash: number; cashGoal: number; flow: number; flowGoal: number; debt: number };
}
export interface SheetBig {
  name: string; profession: string; dream: { name: string; price: number } | null;
  lockedFlow: number | null; inBig: boolean;
  businesses: { title: string; price: number; income: number }[];
  debt: number; cash: number; flow: number; flowGoal: number;
}
export interface Sheet { small: SheetSmall; big: SheetBig; circle: "small" | "big" }

const line = (a: AssetRow): IncomeLine => ({ title: a.title, income: a.income });
const isBigAsset = (a: AssetRow) => a.code.startsWith("big-");

export function sheetOf(room: any, userId: string): Sheet | null {
  const p = room?.state?.players?.find((x: any) => x.id === userId); const pf = portfolioOf(room, userId); if (!p || !pf) return null;
  const name = nameOf(room, userId), profession = room.professions?.[userId] ?? "";
  const dream = p.dreamIdx !== null && p.dreamIdx !== undefined ? room.dreams?.[p.dreamIdx] ?? null : null;
  const small = pf.assets.filter((a) => !isBigAsset(a)), withInc = (a: AssetRow) => a.income !== 0;
  const realty = small.filter((a) => REALTY.has(a.sub ?? "") && withInc(a)).map(line);
  const smallBiz = small.filter((a) => a.sub === "small_business" && withInc(a)).map(line);
  const bigBiz = small.filter((a) => a.sub === "business" && withInc(a)).map(line);
  const grouped = new Set([...small.filter((a) => REALTY.has(a.sub ?? "") || a.sub === "small_business" || a.sub === "business")]);
  const other = small.filter((a) => !grouped.has(a) && withInc(a)).map(line);
  const passive = passiveIncome(p), expenses = monthlyExpenses(p), cashflow = playerCashflow(p);
  const shares = SHARE_CODES.map((code) => { const rows = small.filter((a) => a.kind === "shares" && a.code.toLowerCase() === code.toLowerCase()); const count = rows.reduce((s, a) => s + (a.shares ?? 0), 0), cost = rows.reduce((s, a) => s + a.price, 0); return { code, count, price: count ? Math.round(cost / count) : 0 }; });
  const credits = small.reduce((s, a) => s + a.payment, 0), bankPay = (p.bankLoans ?? []).reduce((s: number, l: any) => s + bankMonthlyPayment(l.amount), 0), lombPay = (p.lombards ?? []).reduce((s: number, l: any) => s + l.amount * RULES.lombardMonthlyRate, 0);
  const debt = allDebt(p) + (p.handDebts ?? []).reduce((s: number, d: any) => s + d.amount, 0);
  const sm: SheetSmall = {
    name, profession, dream, salary: salaryOf(p), realty, small: smallBiz, big: bigBiz, other,
    totals: { active: salaryOf(p) + monthlyBonus(p), passive, income: salaryOf(p) + monthlyBonus(p) + passive, expenses, cashflow }, shares, debt,
    expenses: { lines: EXP_ROWS.map((r) => ({ key: r.key, value: r.exp === null ? null : room.professionExp?.[userId]?.[r.exp] ?? null })), base: p.baseExpenses, children: p.children, childCost: p.childCost, childTotal: p.children * p.childCost, credits, bank: bankPay, lombard: lombPay, qar: p.qar ? RULES.qarMonthly : 0, extra: Math.round(expenses - (p.baseExpenses + p.children * p.childCost + credits + bankPay + lombPay + (p.qar ? RULES.qarMonthly : 0))) }, // extra: faol bozor ta'sirlari (xarajat ±%, oylik, kredit ±%)
    lombards: (p.lombards ?? []).map((l: any) => ({ amount: l.amount, payment: l.amount * RULES.lombardMonthlyRate })), banks: (p.bankLoans ?? []).map((l: any) => ({ amount: l.amount, payment: bankMonthlyPayment(l.amount) })),
    collateral: small.filter((a) => a.pledged === "lombard").map((a) => a.title), months: p.monthsPlayed ?? 0,
    exit: { cash: p.cash, cashGoal: 1_000_000, flow: passive, flowGoal: 25_000, debt },
  };
  const bg: SheetBig = {
    name, profession, dream, inBig: p.circle === "big", lockedFlow: p.circle === "big" ? p.lockedFlow ?? 0 : null,
    businesses: pf.assets.filter(isBigAsset).map((a) => ({ title: a.title, price: a.price, income: a.income })), debt: p.bigDebt ?? 0, cash: p.cash, flow: cashflow, flowGoal: 100_000,
  };
  return { small: sm, big: bg, circle: p.circle };
}
