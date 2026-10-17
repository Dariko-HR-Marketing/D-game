// Yo'riqnoma kartasini yoritilgan element (spotlight) yaqiniga joylash (sof hisob, testlanadi).
export interface Rect { left: number; top: number; width: number; height: number }
export const M = 12, GAP = 14;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
/** Maqsad yo'q yoki sig'masa — markazda. Aks holda pastda, joy bo'lmasa tepada. */
export function placeCard(target: Rect | null, card: { w: number; h: number }, vw: number, vh: number): { left: number; top: number; mode: "below" | "above" | "center" } {
  const center = { left: clamp((vw - card.w) / 2, M, vw - card.w - M), top: clamp((vh - card.h) / 2, M, vh - card.h - M), mode: "center" as const };
  if (!target) return center;
  const left = clamp(target.left + target.width / 2 - card.w / 2, M, vw - card.w - M);
  const below = target.top + target.height + GAP, above = target.top - GAP - card.h;
  if (below + card.h <= vh - M) return { left, top: below, mode: "below" };
  if (above >= M) return { left, top: above, mode: "above" };
  return center;
}
/** Maqsad ekranda ko'rinadimi (kamida qisman) va o'lchami bor. */
export const visibleRect = (r: Rect | null, vw: number, vh: number): Rect | null => (r && r.width > 4 && r.height > 4 && r.left < vw && r.top < vh && r.left + r.width > 0 && r.top + r.height > 0 ? r : null);
