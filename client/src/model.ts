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
