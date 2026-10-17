// O'yin vaqti: 1 oy = «D» (Daromad) / «Yana pullar» katagidan o'tish yoki tushish (SPEC §5.1); kichik aylanada 4 oy = 1 aylana, 12 oy = 1 yil (3 aylana).
export const MONTHS_PER_YEAR = 12;
export const MONTHS_PER_LAP = 4;

/**
 * Taxminiy davomiylik (oy): `rules/sim` (smart bot, 60 o'yin, ≤ 2500 navbat) o'lchovi — docs/BALANCE.md «O'yin vaqti».
 * Bu — botlar bilan o'lchangan taxmin, qoida emas; haqiqiy o'yinchilarda farq qiladi. Buyurtmachi tasdig'i kutilmoqda (OPEN_QUESTIONS).
 */
export const ESTIMATE = { smallExitMonths: 172, smallExitRange: [141, 218], bigWinMonths: 58, bigWinRange: [38, 94] } as const;

export const splitMonths = (m: number) => { const t = Math.max(0, Math.floor(m)); return { years: Math.floor(t / MONTHS_PER_YEAR), months: t % MONTHS_PER_YEAR, total: t }; };
/** «2 yil 5 oy», «5 oy», «3 yil». */
export function monthsText(m: number, w: { year: string; month: string }): string {
  const { years, months } = splitMonths(m);
  if (years === 0) return `${months} ${w.month}`; if (months === 0) return `${years} ${w.year}`; return `${years} ${w.year} ${months} ${w.month}`;
}
/** Oylarni yilga yaxlitlash (taxminiy matn uchun): 172 → 14. */
export const roundYears = (m: number) => Math.round(m / MONTHS_PER_YEAR);
