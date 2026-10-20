// O'yin tarixi qatorlarini matnga aylantirish (sof funksiyalar): nima qilindi, qayerdan qayerga, nima uchun.
import { uz } from "./i18n/uz";
import { money } from "./format";

export interface HEv {
  n: number; seq: number; at: number; round: number; by: string; mine: boolean; type: string; auto: string | null; ok: boolean; error?: string;
  move?: { from: number; to: number; die: number | null; fromCircle: "small" | "big"; toCircle: "small" | "big"; cell: { t: string; name?: string }; months: number };
  card?: { id: string; stage: "drawn" | "applied" | "decided"; deck: string; mode: string; kind: string; text: string; file: string };
  decision?: { accept: boolean; qty?: number; useBank?: boolean };
  invest?: { price: number; down: number; income: number; yieldPct: number | null; paybackMonths: number | null; bankLoan: number };
  before: { cash: number; passive: number; flow: number; debt: number; assets: number; months: number }; after: { cash: number; passive: number; flow: number; debt: number; assets: number; months: number };
  delta: { cash: number; passive: number; flow: number; debt: number };
  assetsAdded: string[]; assetsLost: string[]; log: string[]; calc?: { kind: string; wrong: number; hint: boolean }[];
}
export interface HView { events: HEv[]; players: { id: string; isMe: boolean; bot: boolean }[]; truncated: boolean; winner: string | null }

export const cellName = (m: NonNullable<HEv["move"]>): string => m.toCircle === "big" ? (m.cell.name ?? uz.legend.big[m.cell.t] ?? m.cell.t) : (uz.legend.cells[m.cell.t] ?? m.cell.t);
export const signed = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + money(Math.abs(n));

/** Qisqa sarlavha: nima bo'ldi. */
export function titleOf(e: HEv): string {
  const h = uz.history;
  if (!e.ok) return h.failed;
  if (e.type === "roll" && e.move) return `${h.moved}: ${e.move.from + 1} → ${e.move.to + 1}`;
  if (e.type === "decide" && e.decision) return e.decision.accept ? h.accepted : h.skipped;
  return h.types[e.type] ?? e.type;
}
/** Nima uchun bu amal bo'ldi (sabab). */
export function whyOf(e: HEv): string[] {
  const h = uz.history, out: string[] = [];
  if (e.auto) out.push(h.auto[e.auto] ?? e.auto);
  if (e.type === "roll" && e.move) {
    if (e.move.die != null) out.push(`${h.die}: ${e.move.die}`);
    out.push(`${h.landed}: ${cellName(e.move)}`);
    if (e.move.fromCircle !== e.move.toCircle) out.push(e.move.toCircle === "big" ? h.toBig : h.toSmall);
    if (e.move.months > 0) out.push(`${e.move.months} ${h.monthsPassed}`);
  }
  if (e.card) out.push(`${h.stage[e.card.stage]}: ${e.card.text || e.card.id}`);
  if (e.invest) {
    out.push(`${h.price}: ${money(e.invest.price)}`);
    if (e.invest.down !== e.invest.price) out.push(`${h.down}: ${money(e.invest.down)}`);
    if (e.invest.bankLoan > 0) out.push(`${h.bank}: ${money(e.invest.bankLoan)}`);
    if (e.invest.income > 0) out.push(`${h.income}: ${money(e.invest.income)}`);
    if (e.invest.yieldPct !== null) out.push(`${h.yearly}: ${e.invest.yieldPct} %`);
    if (e.invest.paybackMonths !== null) out.push(`${h.payback}: ${e.invest.paybackMonths} ${h.months}`);
  }
  const wrong = (e.calc ?? []).reduce((n, c) => n + c.wrong, 0);
  if (e.calc?.length) out.push(wrong ? `${h.calcWrong}: ${wrong}` : h.calcRight);
  return out;
}
/** Pul o'zgarishi chiplari (faqat o'zgarganlari). */
export function deltasOf(e: HEv): { label: string; value: string; kind: "good" | "bad" | "plain" }[] {
  const h = uz.history, d = e.delta, k = (n: number, goodUp = true) => (n === 0 ? "plain" : (n > 0) === goodUp ? "good" : "bad") as "good" | "bad" | "plain";
  const r: { label: string; value: string; kind: "good" | "bad" | "plain" }[] = [];
  if (d.cash) r.push({ label: h.cash, value: signed(d.cash), kind: k(d.cash) });
  if (d.passive) r.push({ label: h.passive, value: signed(d.passive), kind: k(d.passive) });
  if (d.flow) r.push({ label: h.flow, value: signed(d.flow), kind: k(d.flow) });
  if (d.debt) r.push({ label: h.debt, value: signed(d.debt), kind: k(d.debt, false) });
  return r;
}
/** Tarixni ko'rsatish uchun filtr: faqat o'zimniki yoki hammasi; texnik (xato) yozuvlar chiqmaydi. */
export const filterEvents = (events: HEv[], onlyMine: boolean) => events.filter((e) => e.ok && (!onlyMine || e.mine));
