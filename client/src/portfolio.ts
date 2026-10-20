// «Mening kartalarim»: o'yinchiga tegishli aktivlar, qarzlar (berilgan/olingan), faol kartalar va ularning tahlili. React'siz — testlanadi.
import { passiveIncome, allDebt, monthlyExpenses } from "@poyga/rules";
import { marketOffers, nameOf } from "./model";
import { uz } from "./i18n/uz";

export interface AssetRow {
  idx: number; code: string; kind: string; sub?: string; label: string; title: string; file?: string;
  price: number; income: number; payment: number; credit: number; shares?: number; tokens?: number; pledged?: string;
  partnerName?: string; stakeOfName?: string;
  /** Yillik daromadlilik, % (oylik daromad × 12 / narx); narx yoki daromad yo'q bo'lsa null */
  yearly: number | null;
  /** Qoplanish muddati, oy (narx / oylik daromad); daromad yo'q bo'lsa null */
  payback: number | null;
  /** Aktivning sof oylik hissasi: daromad − kredit to'lovi */
  net: number;
}
export interface DebtRow { id: string; who?: string; amount: number; months?: number; note?: string }
export interface Portfolio {
  assets: AssetRow[];
  lent: DebtRow[]; owed: DebtRow[]; bank: DebtRow[]; lombards: DebtRow[]; owe: number;
  active: { key: "qar" | "insuredCar" | "twoDice" | "crisis" | "noSalary"; value?: number }[];
  offers: ReturnType<typeof marketOffers>;
  totals: { count: number; invested: number; passive: number; payments: number; netPassive: number; expenses: number; debt: number; lent: number; netWorth: number; coverage: number | null };
  shares: { code: string; label: string; income: number; pct: number }[];
  best: AssetRow | null; slowest: AssetRow | null;
}
const first = (t: string, n = 80) => { const s = (t.split(/(?<=[.!?])\s/)[0] ?? t).trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
export const kindLabel = (kind: string, sub?: string) => (sub && uz.portfolio.subs[sub]) || uz.portfolio.kinds[kind] || uz.portfolio.kinds.other;

export function portfolioOf(room: any, userId: string): Portfolio | null {
  const st = room?.state; const p = st?.players?.find((x: any) => x.id === userId); if (!p) return null;
  const cards: Record<string, { text: string; file: string; asset?: string }> = room.assetCards ?? {};
  const assets: AssetRow[] = (p.assets ?? []).map((a: any, idx: number) => {
    const c = cards[a.code]; const label = kindLabel(a.kind, c?.asset); const income = a.monthlyIncome ?? 0;
    return { idx, code: a.code, kind: a.kind, sub: c?.asset, label, title: c?.text ? first(c.text) : label, file: c?.file || undefined, price: a.price ?? 0, income, payment: a.creditPayment ?? 0, credit: a.credit ?? 0,
      shares: a.shares, tokens: a.tokens, pledged: a.pledged, partnerName: a.partnerId ? nameOf(room, a.partnerId) : undefined, stakeOfName: a.stakeOf ? nameOf(room, a.stakeOf) : undefined,
      yearly: a.price > 0 && income > 0 ? Math.round((income * 12 * 1000) / a.price) / 10 : null, payback: income > 0 && a.price > 0 ? Math.ceil(a.price / income) : null, net: income - (a.creditPayment ?? 0) };
  });
  // Men bergan qarzlar: boshqalarning qo'ldagi qarzlari orasida «kimga» = men; olinganlar — o'zimniki
  const lent: DebtRow[] = []; for (const o of st.players) if (o.id !== userId) for (const d of o.handDebts ?? []) if (d.to === userId) lent.push({ id: `l${o.id}${d.id}`, who: nameOf(room, o.id), amount: d.amount, months: d.months });
  const owed: DebtRow[] = (p.handDebts ?? []).map((d: any) => ({ id: `o${d.id}`, who: nameOf(room, d.to), amount: d.amount, months: d.months }));
  const bank: DebtRow[] = (p.bankLoans ?? []).map((l: any, i: number) => ({ id: `b${i}`, amount: l.amount, months: l.left }));
  const lombards: DebtRow[] = (p.lombards ?? []).map((l: any, i: number) => ({ id: `m${i}`, amount: l.amount, months: l.left, note: cards[l.code]?.text ? first(cards[l.code].text, 40) : l.code }));
  const active: Portfolio["active"] = [];
  if (p.qar) active.push({ key: "qar" }); if (p.insuredCar) active.push({ key: "insuredCar" });
  if ((p.twoDice ?? 0) > 0) active.push({ key: "twoDice", value: p.twoDice }); if ((p.crisisMonths ?? 0) > 0) active.push({ key: "crisis", value: p.crisisMonths }); if ((p.noSalary ?? 0) > 0) active.push({ key: "noSalary", value: p.noSalary });
  const passive = passiveIncome(p), payments = assets.reduce((s, a) => s + a.payment, 0), invested = assets.reduce((s, a) => s + a.price, 0);
  const handOwed = owed.reduce((s, d) => s + d.amount, 0), lentSum = lent.reduce((s, d) => s + d.amount, 0), debt = allDebt(p) + handOwed, expenses = monthlyExpenses(p);
  const withIncome = assets.filter((a) => a.income > 0), totalIncome = withIncome.reduce((s, a) => s + a.income, 0);
  const ranked = assets.filter((a) => a.yearly !== null);
  return {
    assets, lent, owed, bank, lombards, owe: p.owe ?? 0, active, offers: marketOffers(room, userId),
    totals: { count: assets.length, invested, passive, payments, netPassive: passive - payments, expenses, debt, lent: lentSum, netWorth: p.cash + invested - debt + lentSum, coverage: expenses > 0 ? Math.round((passive / expenses) * 100) : null },
    shares: withIncome.map((a) => ({ code: a.code, label: `${a.title} (+${a.income})`, income: a.income, pct: totalIncome ? Math.round((a.income / totalIncome) * 100) : 0 })).sort((a, b) => b.income - a.income),
    best: ranked.length ? ranked.reduce((m, a) => (a.yearly! > m.yearly! ? a : m)) : null, slowest: ranked.length > 1 ? ranked.reduce((m, a) => (a.payback! > m.payback! ? a : m)) : null,
  };
}
