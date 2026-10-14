import { loadContent, deriveEffects, type Bundle } from "@poyga/content";
import type { Ctx } from "@poyga/rules";

export function buildCtxFrom(b: Bundle): Ctx {
  const fx = deriveEffects(b.cards);
  const ids = (d: string) => fx.filter((e) => e.deck === d).map((e) => e.id);
  return {
    effects: Object.fromEntries(fx.map((e) => [e.id, e])),
    deckIds: { kasb: ids("kasb"), kichik: ids("kichik"), katta: ids("katta"), bozor: ids("bozor"), xar: ids("xar"), kxar: ids("kxar"), hod: ids("hod") },
    kasb: Object.fromEntries(b.cards.kasb.map((k) => [k.n, k])),
    bigBoard: b.bigBoard, dreams: b.dreams, cellRules: b.cellRules,
  };
}
/** Birlamchi (paketdagi) kontent. */
export const buildCtx = (): Ctx => buildCtxFrom(loadContent());
