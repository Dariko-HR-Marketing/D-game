// Kubiklar: serverdagi `lastRoll.dice` (har bir kubik) — mijozda ko'rsatish uchun. Eski saqlangan o'yinlarda `dice` yo'q: yig'indi ikkiga bo'linadi (faqat ko'rsatish uchun).
export interface RollView { die: number; dice?: number[] }

/** Tashlangan kubiklar (1 yoki 2 ta). `two` — o'sha o'yinchi 2 kubik tashlaydimi (eski o'yinlarda `dice` bo'lmasa shunga qarab bo'linadi). */
export function diceOf(lr: RollView | null | undefined, two = false): number[] | null {
  if (!lr) return null;
  if (Array.isArray(lr.dice) && lr.dice.length >= 1 && lr.dice.every((d) => Number.isInteger(d) && d >= 1 && d <= 6)) return lr.dice.slice(0, 2);
  if (two || lr.die > 6) { const a = Math.min(6, Math.max(1, Math.ceil(lr.die / 2))), b = Math.min(6, Math.max(1, lr.die - a)); return [a, b]; }
  return [lr.die];
}
/** Hali tashlanmagan holatda nechta «?» kubik ko'rsatiladi. */
export const placeholderCount = (circle: string | undefined, twoDice?: number) => (circle === "big" || (twoDice ?? 0) > 0 ? 2 : 1);
