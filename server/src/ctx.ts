import { loadContent, deriveEffects, buildPools, type Bundle } from "@poyga/content";
import type { Ctx } from "@poyga/rules";

export function buildCtxFrom(b: Bundle): Ctx {
  const fx = deriveEffects(b.cards);
  const { deckIds, extended, adult } = buildPools(fx); // faqat kolodaga tushadigan (olib tashlanmagan, ushlab turilmagan) kartalar
  return {
    effects: Object.fromEntries(fx.map((e) => [e.id, e])), // olib tashlangan kartalar ham: saqlangan o'yinlar eski karta ID larini topa oladi
    deckIds, extended, adult,
    kasb: Object.fromEntries(b.cards.kasb.map((k) => [k.n, k])),
    bigBoard: b.bigBoard, dreams: b.dreams, cellRules: b.cellRules,
  };
}
/** Birlamchi (paketdagi) kontent. */
export const buildCtx = (): Ctx => buildCtxFrom(loadContent());
