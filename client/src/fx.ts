// O'yinchi moliyasidagi o'zgarishlarni aniqlash (naqd, passiv daromad, pul oqimi, qarz, aktivlar). React'siz — testlanadi.
import { exitProgress } from "./model";

export interface Snap { cash: number; flow: number; passive: number; debt: number; assets: { code: string; kind: string; monthlyIncome: number }[] }
export type FxKind = "cash" | "passive" | "flow" | "debt" | "assetAdd" | "assetLost";
export interface FxEvent { kind: FxKind; delta?: number; code?: string; assetKind?: string; income?: number; count?: number }

export function snapOf(p: any): Snap {
  const e = exitProgress(p);
  return { cash: p.cash, flow: e.cashflow, passive: e.passive, debt: e.debt, assets: (p.assets ?? []).map((a: any) => ({ code: a.code, kind: a.kind, monthlyIncome: a.monthlyIncome })) };
}
export const sameSnap = (a: Snap, b: Snap) => a.cash === b.cash && a.flow === b.flow && a.passive === b.passive && a.debt === b.debt && a.assets.length === b.assets.length && a.assets.every((x, i) => x.code === b.assets[i].code && x.kind === b.assets[i].kind && x.monthlyIncome === b.assets[i].monthlyIncome);

/** Aktivlar tarkibi (kod bo'yicha ko'p to'plam): qo'shilgan va yo'qolganlar. Aktiv narxi/daromadi o'zgargan bo'lsa (sherik, garov) yangi aktiv hisoblanmaydi. */
function multiDiff(prev: Snap["assets"], next: Snap["assets"]) {
  const key = (a: { code: string; kind: string }) => `${a.kind}:${a.code}`;
  const pool = new Map<string, number>(); for (const a of prev) pool.set(key(a), (pool.get(key(a)) ?? 0) + 1);
  const added: Snap["assets"] = [];
  for (const a of next) { const n = pool.get(key(a)) ?? 0; if (n > 0) pool.set(key(a), n - 1); else added.push(a); }
  const lostPool = new Map<string, number>(); for (const a of next) lostPool.set(key(a), (lostPool.get(key(a)) ?? 0) + 1);
  const lost: Snap["assets"] = [];
  for (const a of prev) { const n = lostPool.get(key(a)) ?? 0; if (n > 0) lostPool.set(key(a), n - 1); else lost.push(a); }
  return { added, lost };
}

/** Oldingi va yangi holat orasidagi ko'rsatiladigan o'zgarishlar. «Pul oqimi» passiv daromad bilan bir xil o'zgargan bo'lsa takrorlanmaydi. */
export function diffSnap(prev: Snap, next: Snap): FxEvent[] {
  const out: FxEvent[] = [];
  const dCash = next.cash - prev.cash, dPassive = next.passive - prev.passive, dFlow = next.flow - prev.flow, dDebt = next.debt - prev.debt;
  if (dCash) out.push({ kind: "cash", delta: dCash });
  if (dPassive) out.push({ kind: "passive", delta: dPassive });
  if (dFlow && dFlow !== dPassive) out.push({ kind: "flow", delta: dFlow });
  if (dDebt) out.push({ kind: "debt", delta: dDebt });
  const { added, lost } = multiDiff(prev.assets, next.assets);
  for (const a of added.slice(0, 3)) out.push({ kind: "assetAdd", code: a.code, assetKind: a.kind, income: a.monthlyIncome });
  if (added.length > 3) out.push({ kind: "assetAdd", count: added.length - 3, assetKind: "more" });
  if (lost.length === 1) out.push({ kind: "assetLost", code: lost[0].code, assetKind: lost[0].kind, income: lost[0].monthlyIncome });
  else if (lost.length > 1) out.push({ kind: "assetLost", count: lost.length });
  return out;
}
/** Ko'rsatish ma'nosi: yaxshi (yashil) yoki yomon (qizil). Qarz kamaysa — yaxshi. */
export const isGood = (e: FxEvent) => (e.kind === "debt" ? (e.delta ?? 0) < 0 : e.kind === "assetLost" ? false : e.kind === "assetAdd" ? true : (e.delta ?? 0) > 0);
