/** Bozor taklifi narxi qanday hisoblangani — oynada ko'rsatiladigan qatorlar (foydalanuvchi tekshira olsin). */
import type { MarketOffer } from "./model";
import { money } from "./format";
import { uz } from "./i18n/uz";

const fill = (s: string, p: Record<string, string>) => Object.entries(p).reduce((t, [k, v]) => t.replaceAll(`{${k}}`, v), s);

export function offerHowLines(o: MarketOffer): string[] {
  const L = uz.portfolio, out: string[] = [], sum = (o.crisis ? o.price * 2 : o.price); // inqirozdan oldingi summa
  if (o.how.kind === "unit") out.push(fill(L.calcUnit, { per: money(o.how.per), n: String(o.how.units), sum: money(sum) }));
  else if (o.how.kind === "pct") out.push(fill(o.how.base === o.how.bought ? L.calcPct : L.calcPctAdj, { base: money(o.how.base), bought: money(o.how.bought), pct: String(o.how.pct), sum: money(sum) }));
  if (o.crisis) out.push(fill(L.crisisHalf, { sum: money(o.price) }));
  return out;
}
