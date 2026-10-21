import { loadContent, deriveEffects, buildPools } from "@poyga/content";
import type { Ctx } from "./index";

const { cards, bigBoard, dreams } = loadContent();
export { cards, bigBoard, dreams };
const fx = deriveEffects(cards);
const { deckIds, extended, adult } = buildPools(fx);
export const ctx: Ctx = {
  effects: Object.fromEntries(fx.map((e) => [e.id, e])),
  deckIds, extended, adult,
  kasb: Object.fromEntries(cards.kasb.map((k) => [k.n, k])),
  bigBoard, dreams,
};
