import { loadContent, deriveEffects } from "@poyga/content";
import type { Ctx } from "./index";

const { cards, bigBoard, dreams } = loadContent();
export { cards, bigBoard, dreams };
const fx = deriveEffects(cards);
const ids = (d: string) => fx.filter((e) => e.deck === d).map((e) => e.id);
export const ctx: Ctx = {
  effects: Object.fromEntries(fx.map((e) => [e.id, e])),
  deckIds: { kasb: ids("kasb"), kichik: ids("kichik"), katta: ids("katta"), bozor: ids("bozor"), xar: ids("xar"), kxar: ids("kxar") },
  kasb: Object.fromEntries(cards.kasb.map((k) => [k.n, k])),
  bigBoard, dreams,
};
