// Fishka harakati rejasi (sof mantiq, React Native'siz — testlanadi). Server holatni bir martada yangilaydi; mijoz fishkani har bir katak ustidan yurgizadi.
export const CELLS = { small: 48, big: 53 } as const;
export type Pos = { pos: number; circle: "small" | "big" };
export const MAX_WALK = 12; // 2 kubik yig'indisi; undan uzoq o'tish (karta, aylanadan chiqish) — sakrash

export const cellsOf = (circle: string) => (circle === "small" ? CELLS.small : CELLS.big);

/** `from` dan `to` gacha oldinga qadamlar (har bir oraliq katak, `to` ham kiradi). Aylana almashsa, orqaga yursa yoki juda uzoq bo'lsa — null (bir zumda ko'chirish). */
export function planSteps(from: Pos, to: Pos, max = MAX_WALK): number[] | null {
  if (from.circle !== to.circle) return null;
  const n = cellsOf(from.circle);
  const d = (((to.pos - from.pos) % n) + n) % n;
  if (d === 0 || d > max) return null;
  return Array.from({ length: d }, (_, i) => (from.pos + i + 1) % n);
}
export const samePos = (a: Pos | undefined, b: Pos | undefined) => !!a && !!b && a.pos === b.pos && a.circle === b.circle;
