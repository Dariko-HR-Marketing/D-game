import { readFileSync } from "node:fs";
import { z } from "zod";
import { BigCell, Cards, Dream } from "./schema";

export * from "./schema";
export * from "./effects";

const read = (n: string) => JSON.parse(readFileSync(new URL(`../data/${n}.json`, import.meta.url), "utf-8"));

export function loadContent() {
  return {
    cards: Cards.parse(read("cards")),
    bigBoard: z.array(BigCell).length(53).parse(read("board_big")),
    dreams: z.array(Dream).parse(read("dreams")),
  };
}
