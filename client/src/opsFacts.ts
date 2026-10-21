// Katalog kartalari (Tajriba24): tuzilgan ta'sirlarni «Karta raqamlari» qatorlariga aylantirish va o'yinchidagi faol ta'sirlarni matnlash.
import type { Selector } from "@poyga/content/groups";
import { uz } from "./i18n/uz";

export interface OpRow { label: string; value: string; tone?: "good" | "bad" | "neutral" }
const fmt = (n: number) => String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const signed = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(n);
const O = uz.ops;
const pct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)} %`;
const tone = (n: number): "good" | "bad" => (n >= 0 ? "good" : "bad");
/** «N oy» → «N aylana» (4 oy = 1 aylana); butun aylanaga bo'linmasa oy bilan. */
export const spanText = (months: number | null | undefined, wait?: boolean): string => {
  const t = months === null || months === undefined ? O.permanent : months % 4 === 0 ? O.laps.replace("{n}", String(months / 4)) : `${months} ${uz.coop.months.toLowerCase()}`;
  return wait ? `${O.next} · ${t}` : t;
};
/** Tanlagich nomi: kartadagi asl matn (`label`), bo'lmasa soha/nom. */
export const selLabel = (sel: Selector | undefined, label?: string): string => {
  if (label) return label; const c = sel?.any[0] as any; return c ? c.sector ?? c.name ?? c.tag ?? c.kind ?? "" : O.mods.all;
};

type Op = any;
/** Bitta `Op` → jadval qatori. */
export function opRow(op: Op): OpRow | null {
  switch (op.op) {
    case "cash": return { label: O.cash, value: signed(op.amount), tone: tone(op.amount) };
    case "salaryPct": return { label: O.salary, value: `${pct(op.pct)} · ${spanText(op.months)}`, tone: tone(op.pct) };
    case "salaryAdd": return { label: O.salary, value: `${signed(op.amount)} / ${O.perMonth} · ${O.permanent}`, tone: "good" };
    case "salaryZero": return { label: O.salary, value: `${O.none} · ${spanText(op.months)}`, tone: "bad" };
    case "policy": return { label: O.policy, value: `${O.covers}: ${(op.covers as string[]).map((h) => O.hazard[h] ?? h).join(", ")} · ${spanText(op.months)}`, tone: "good" };
    case "monthly": return { label: O.monthly, value: `${signed(op.amount)} · ${spanText(op.months)}`, tone: tone(op.amount) };
    case "expensePct": return { label: O.expense, value: `${pct(op.pct)} · ${spanText(op.months)}`, tone: op.pct <= 0 ? "good" : "bad" };
    case "creditPct": return { label: O.credit, value: `${pct(op.pct)} · ${spanText(op.months)}`, tone: op.pct <= 0 ? "good" : "bad" };
    case "income": return { label: `${selLabel(op.sel, op.label)}: ${uz.facts.income.toLowerCase()}`, value: `${op.mode === "zero" ? O.none : op.mode === "mult" ? O.times.replace("{n}", String(op.value)) : pct(op.value)} · ${spanText(op.months, op.wait)}`, tone: op.mode === "zero" ? "bad" : tone(op.mode === "mult" ? op.value - 1 : op.value) };
    case "priceNow": return { label: `${selLabel(op.sel, op.label)}: ${O.saleBase.toLowerCase()}`, value: pct(op.pct), tone: tone(op.pct) };
    case "priceMod": return { label: `${selLabel(op.sel, op.label)}: ${op.side === "buy" ? O.buyPrice : op.side === "sell" ? O.sellPrice : O.price}`.toLowerCase().replace(/^./, (c) => c.toUpperCase()), value: `${pct(op.pct)} · ${spanText(op.months, op.wait)}`, tone: op.side === "buy" ? (op.pct <= 0 ? "good" : "bad") : tone(op.pct) };
    default: return null;
  }
}

export interface OpsFacts { rows: OpRow[]; notes: string[]; cost: number | null }
/** `ops` ta'siri uchun jadval qatorlari va eslatmalar. */
export function opsFacts(e: any): OpsFacts {
  const rows: OpRow[] = []; const notes: string[] = [];
  if (e.cost) rows.push({ label: O.cost, value: fmt(e.cost), tone: "bad" });
  for (const op of e.ops as Op[]) { const r = opRow(op); if (r) rows.push(r); if (op.op === "income" && op.sel?.pick && !notes.includes(O.pickBest)) notes.push(O.pickBest); }
  const to = (e.ops as Op[]).some((o) => o.to === "all" || ["expensePct", "creditPct", "priceNow", "priceMod"].includes(o.op)) ? "all" : "drawer";
  if ((e.ops as Op[]).some((o) => o.op === "cash" && o.hazard)) notes.push(O.insuredNote);
  notes.push(O.to[to]); if (e.requires) notes.push(O.skip);
  return { rows, notes, cost: e.cost ?? null };
}
/** «Sotish taklifi» ta'siri uchun qatorlar. */
export function offerFacts(e: any): OpsFacts {
  const rows: OpRow[] = [{ label: O.offer.target, value: selLabel(e.sel, e.label) }];
  rows.push(e.mode === "fixed" ? { label: O.offer.fixed, value: fmt(e.value), tone: "good" } : { label: O.offer.pct, value: `${pct(e.value)} (${O.offer.from})`, tone: tone(e.value) });
  const notes: string[] = []; if (e.holdMonths) notes.push(O.offer.hold); if (e.first) notes.push(O.offer.first); return { rows, notes, cost: null };
}

/** O'yinchidagi faol ta'sir (`Mod`) → qisqa matn va qolgan muddat. */
export function modLine(m: any): { text: string; left: string } {
  const M = O.mods; const v = (n: number) => pct(n);
  const left = m.wait ? M.waiting : m.months === null ? O.permanent : M.left.replace("{n}", String(m.months));
  const a = selLabel(m.sel);
  const text = m.t === "policy" ? `${O.policy}: ${(m.covers as string[]).map((h) => O.hazard[h] ?? h).join(", ")}` : m.t === "salary" ? M.salaryPct.replace("{v}", v(m.pct)) : m.t === "salaryZero" ? M.salaryZero : m.t === "monthly" ? M.monthly.replace("{v}", signed(m.amount))
    : m.t === "expense" ? M.expense.replace("{v}", v(m.pct)) : m.t === "credit" ? M.credit.replace("{v}", v(m.pct))
    : m.t === "income" ? (m.mode === "zero" ? M.incomeZero.replace("{a}", a) : m.mode === "mult" ? M.incomeMult.replace("{a}", a).replace("{v}", String(m.value)) : M.income.replace("{a}", a).replace("{v}", v(m.value)))
    : M.price.replace("{a}", a).replace("{v}", v(m.pct));
  return { text, left };
}

/** Depozit kartasi: qatorlar. */
export function depositFacts(e: any): OpsFacts {
  const rows: OpRow[] = [{ label: O.deposit.principal, value: fmt(e.principal), tone: "bad" }, { label: O.deposit.perLap, value: signed(e.perLap), tone: "good" },
    { label: O.deposit.term, value: e.laps === null ? O.deposit.demand : O.laps.replace("{n}", String(e.laps)) }];
  return { rows, notes: e.laps === null ? [] : [O.deposit.early], cost: e.principal };
}
