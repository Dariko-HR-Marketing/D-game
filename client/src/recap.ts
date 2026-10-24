// Bankrot (yangi kasb bilan boshidan) tahlili: server yozgan ma'lumotdan qoida bilan chiqariladi (taxmin yo'q); matnlar `uz.recap` da.
import { money } from "./format";
import { uz } from "./i18n/uz";

export interface RecapAsset { code: string; cardId?: string; kind: string; name?: string; price: number; income: number }
export interface RecapData {
  id: number; playerId: string; month: number; round: number; cause: { kind: "pay" | "cell"; amount?: number; cardId?: string };
  before: { kasb: string; cash: number; owe: number; bankDebt: number; handDebt: number; salary: number; expenses: number; passive: number; cashflow: number; assets: RecapAsset[] };
  newKasb: string; recent: string[];
}
export type RecapKey = "pay" | "cell" | "noBuffer" | "negFlow" | "debt" | "thinPassive" | "assetsLost" | "noAssets";
export interface RecapInsight { key: RecapKey; tone: "bad" | "warn" | "info"; params: Record<string, string> }

export const debtOf = (r: RecapData) => r.before.owe + r.before.bankDebt + r.before.handDebt;
export const lostIncome = (r: RecapData) => r.before.assets.reduce((s, a) => s + a.income, 0);

/** Sabablar va holat — ahamiyat tartibida, ko'pi bilan 6 ta. */
export function recapInsights(r: RecapData, bankLimit: number): RecapInsight[] {
  const b = r.before, out: RecapInsight[] = [];
  if (r.cause.kind === "pay") out.push({ key: "pay", tone: "bad", params: { amount: money(r.cause.amount ?? 0), cash: money(Math.max(0, b.cash)), debt: money(b.owe), limit: money(bankLimit) } });
  else out.push({ key: "cell", tone: "bad", params: {} });
  if (b.expenses > 0 && b.cash < b.expenses) out.push({ key: "noBuffer", tone: "warn", params: { cash: money(Math.max(0, b.cash)), expenses: money(b.expenses) } });
  if (b.cashflow < 0) out.push({ key: "negFlow", tone: "warn", params: { flow: money(b.cashflow) } });
  const d = debtOf(r); if (d > 0) out.push({ key: "debt", tone: "warn", params: { total: money(d) } });
  if (b.passive > 0 && b.passive < b.expenses) out.push({ key: "thinPassive", tone: "info", params: { passive: money(b.passive), expenses: money(b.expenses) } });
  if (b.assets.length) out.push({ key: "assetsLost", tone: "info", params: { n: String(b.assets.length), income: money(lostIncome(r)) } });
  else out.push({ key: "noAssets", tone: "info", params: {} });
  return out.slice(0, 6);
}
export const insightText = (i: RecapInsight): string => Object.entries(i.params).reduce((t, [k, v]) => t.replaceAll(`{${k}}`, v), uz.recap.ins[i.key]);
