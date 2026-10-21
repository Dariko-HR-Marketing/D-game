// Tortish havzalari: qaysi kartalar kolodaga tushadi, reytingli o'yinda yopiq (EXTENDED) va 16 yoshgacha yopiq (16+) kartalar. Server va testlar bir xil qoidani ishlatadi.
import { isLive, type CardEffect } from "./effects";

export const DECK_NAMES = ["kasb", "kichik", "katta", "bozor", "xar", "kxar", "hod"] as const;
export type PoolDeck = (typeof DECK_NAMES)[number];
export interface Pools { deckIds: Record<PoolDeck, string[]>; extended: string[]; adult: string[] }

export const isAdultOnly = (age?: string) => /^16\+/.test(age ?? "");

export function buildPools(fx: CardEffect[]): Pools {
  const live = fx.filter(isLive);
  const deckIds = Object.fromEntries(DECK_NAMES.map((d) => [d, live.filter((e) => e.deck === d).map((e) => e.id)])) as Record<PoolDeck, string[]>;
  return { deckIds, extended: fx.filter((e) => e.info?.ranked === "EXTENDED").map((e) => e.id), adult: fx.filter((e) => isAdultOnly(e.info?.age)).map((e) => e.id) };
}
