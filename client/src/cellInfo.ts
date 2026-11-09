/** Katakni bosganda chiqadigan tushuntirish: tur, nom, narx/daromad, qoida, egasi. Faqat ma'lumotdan (`BIG_CELLS`, `CELL_RULES`, o'yin holati) tuziladi. */
import { SMALL_BOARD, RULES } from "@poyga/rules";
import { BIG_CELLS } from "./bigBoard";
import { CELL_RULES } from "./cellRules";
import { money } from "./format";
import { uz } from "./i18n/uz";
import type { BigOwner } from "./bigOwners";

export interface CellLine { k: string; v: string }
export interface CellInfoData { title: string; kind: string; text: string[]; lines: CellLine[]; owners: { id: string; n: number; what: string }[] }
const fill = (s: string, p: Record<string, string>) => Object.entries(p).reduce((t, [k, v]) => t.replaceAll(`{${k}}`, v), s);

export function smallCellInfo(i: number): CellInfoData {
  const l = SMALL_BOARD[i]; const rule = (CELL_RULES.small as Record<string, { kind: string; months?: number }>)[l];
  const text = [uz.legend.cells[l]];
  if (l === "Q" && rule?.months) text.push(fill(uz.cell.noSalary, { n: String(rule.months) }));
  if (l === "K") text.push(uz.cell.restartNote);
  return { title: `${i}-${uz.cell.cellWord}`, kind: uz.cell.small[l] ?? l, text, lines: [], owners: [] };
}

/** `viewer`: ko'ruvchining o'yinchi holati (orzu va g'alaba shartlari bo'yicha shaxsiy ko'rsatkich uchun). */
export function bigCellInfo(i: number, owners: BigOwner[], names: (id: string) => string, viewer?: { cash: number; flow: number; dreamName?: string; dreamPrice?: number }): CellInfoData {
  const c = BIG_CELLS[i]; const byIndex = (CELL_RULES.big.byIndex as Record<string, { kind: string; share?: number; first?: number }>)[String(i)];
  const lines: CellLine[] = []; const text: string[] = [];
  if (c.t === "T" || c.t === "V") { // orzu katagidagi yozuv/narx faqat bezak: g'alaba shartida o'yinchining O'Z orzusi hisoblanadi (OPEN_QUESTIONS 156)
    if (c.price !== undefined) lines.push({ k: uz.cell.price, v: money(c.price) });
    if (c.income !== undefined) lines.push({ k: uz.cell.income, v: money(c.income) });
  }
  if (c.faces?.length) lines.push({ k: uz.cell.faces, v: c.faces.join(", ") });
  if (c.lump !== undefined) lines.push({ k: uz.cell.lump, v: money(c.lump) });
  const biz = owners.find((o) => o.kind === "biz");
  if (c.t === "T") text.push(uz.cell.turnT); else if (c.t === "V") text.push(uz.cell.turnV);
  if (c.t === "T" || c.t === "V") lines.push({ k: uz.cell.owner, v: biz ? names(biz.id) : uz.cell.free });
  if (c.t === "O") {
    text.push(fill(uz.cell.dream, { flow: money(RULES.winCashflow) }));
    if (viewer?.dreamName) { text.push(fill(uz.cell.dreamMine, { name: viewer.dreamName, price: money(viewer.dreamPrice ?? 0) })); lines.push({ k: uz.cell.yourFlow, v: `${money(viewer.flow)} / ${money(RULES.winCashflow)}` }, { k: uz.cell.yourCash, v: `${money(viewer.cash)} / ${money(viewer.dreamPrice ?? 0)}` }); }
  }
  if (c.t === "Y") text.push(uz.cell.yana);
  if (c.t === "X" || byIndex) {
    if (byIndex?.kind === "loseWorstBusiness") text.push(uz.cell.bankrupt);
    else if (byIndex?.kind === "payCashShare") text.push(fill(uz.cell.cashShare, { pct: String(Math.round((byIndex.share ?? 0) * 100)) }));
    else if (byIndex?.kind === "shady") text.push(fill(uz.cell.shady, { first: money(byIndex.first ?? 0), pct: String(Math.round((byIndex.share ?? 0) * 100)) }));
    else if (byIndex?.kind === "none") text.push(uz.cell.noEffect);
  }
  return { title: c.name, kind: uz.cell.big[c.t], text, lines, owners: owners.map((o) => ({ id: o.id, n: o.n, what: o.kind === "dream" ? uz.board.ownerDream : o.kind === "visit" ? uz.cell.dreamVisit : uz.board.ownerBiz })) };
}
