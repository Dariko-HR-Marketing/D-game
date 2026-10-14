import { canExitSmallCircle, monthlyExpenses, passiveIncome, playerCashflow, totalDebt, openPartnerships } from "@poyga/rules";

export const me = (room: any, userId: string) => room?.state?.players.find((p: any) => p.id === userId) ?? null;
export const currentId = (room: any): string | null => (room?.state ? room.state.players[room.state.turn % room.state.players.length].id : null);
export const isMyTurn = (room: any, userId: string) => currentId(room) === userId;

/** Kichik aylanadan chiqish shartlari (§5.4) — progress ekranda doim ko'rinadi. */
export function exitProgress(p: any) {
  const passive = passiveIncome(p), exp = monthlyExpenses(p);
  const handDebt = (p.handDebts ?? []).reduce((s: number, d: any) => s + d.amount, 0);
  const debt = totalDebt(p) + handDebt;
  const checks = {
    cash: p.cash >= 1_000_000, flow: passive - exp >= 25_000, debt: debt === 0, partner: openPartnerships(p) === 0,
  };
  return { checks, passive, expenses: exp, cashflow: playerCashflow(p), debt, canExit: canExitSmallCircle({ cash: p.cash, salary: p.salary, passiveIncome: passive, expenses: exp, bankDebt: p.bankDebt, otherDebt: debt - p.bankDebt, openPartnerships: openPartnerships(p) }) };
}

import { RULES, mutualLoanLimit } from "@poyga/rules";

export const bankRoom = (p: any) => Math.max(0, RULES.bankLimit - p.bankDebt);

/** Menga qaratilgan hamkorlik takliflari (§5.6). */
export function myProposals(room: any, userId: string) {
  const st = room?.state; const p = me(room, userId);
  const all: any[] = st?.proposals ?? [];
  const isBot = (id: string) => st?.bots?.includes(id);
  return {
    suyunchi: all.filter((x) => x.kind === "suyunchi" && x.parent !== userId && !x.given.includes(userId) && p?.circle === "small" && !isBot(userId)),
    loansToAccept: all.filter((x) => x.kind === "loan" && x.giver === userId),
    loansPending: all.filter((x) => x.kind === "loan" && x.receiver === userId),
    partnerToAccept: all.filter((x) => x.kind === "partner" && x.partner === userId),
    partnerPending: all.filter((x) => x.kind === "partner" && x.owner === userId),
  };
}

/** §5.6 Sheriklik: faqat biznes, naqd va bank limiti tugagach. */
export function canOfferPartner(room: any, userId: string): boolean {
  const p = me(room, userId), c = room?.pendingCard;
  if (!p || !c || currentId(room) !== userId) return false;
  const e = c.effect;
  if (e?.kind !== "buy" || !["small_business", "business"].includes(e.asset)) return false;
  return p.cash < e.price && e.price - p.cash > bankRoom(p);
}
export const partnerCandidates = (room: any, userId: string): string[] => {
  const p = me(room, userId), st = room.state;
  return st.players.filter((x: any) => x.id !== userId && x.circle === p.circle && !st.bots.includes(x.id)).map((x: any) => x.id);
};

/** Suyunchi miqdorlari: 10 dan 500 gacha, qadam 10, naqddan oshmaydi. */
export const suyunchiAmounts = (cash: number): number[] =>
  Array.from({ length: RULES.suyunchiMax / RULES.suyunchiStep }, (_, i) => (i + 1) * RULES.suyunchiStep).filter((a) => a <= cash);

/** O'zaro qarz: oluvchi limiti va beruvchi chegarasi (§5.6). */
export function loanBounds(room: any, userId: string, giverId: string) {
  const me_ = me(room, userId), g = me(room, giverId);
  const passive = me_.assets.reduce((s: number, a: any) => s + a.monthlyIncome, 0);
  const used = (me_.handDebts ?? []).reduce((s: number, d: any) => s + d.amount, 0);
  const humans = room.state.players.filter((x: any) => !room.state.bots.includes(x.id)).length;
  return { max: Math.max(0, Math.min(Math.floor(g.cash * RULES.mutualGiverCashShare), mutualLoanLimit(me_.salary, passive) - used)), humans, enough: humans >= RULES.mutualMinPlayers };
}
export const loanGivers = (room: any, userId: string): string[] =>
  room.state.players.filter((x: any) => x.id !== userId && x.circle === "small" && !room.state.bots.includes(x.id)).map((x: any) => x.id);

/** Mening ochiq sheriklik aktivlarim (sotib olish uchun). */
export const myPartneredAssets = (p: any): any[] => p.assets.filter((a: any) => a.partnerId);
