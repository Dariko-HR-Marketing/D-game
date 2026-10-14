import { loadContent, deriveEffects } from "@poyga/content";
import type { Ctx } from "@poyga/rules";

/** Kontentni bir marta yuklab, qoidalar dvigateli kontekstini quradi. */
export function buildCtx(): Ctx {
  const { cards, bigBoard, dreams } = loadContent();
  const fx = deriveEffects(cards);
  const ids = (d: string) => fx.filter((e) => e.deck === d).map((e) => e.id);
  return {
    effects: Object.fromEntries(fx.map((e) => [e.id, e])),
    deckIds: { kasb: ids("kasb"), kichik: ids("kichik"), katta: ids("katta"), bozor: ids("bozor"), xar: ids("xar"), kxar: ids("kxar") },
    kasb: Object.fromEntries(cards.kasb.map((k) => [k.n, k])),
    bigBoard, dreams,
  };
}
