import { readFileSync } from "node:fs";
import { z } from "zod";
import { BigCell, Cards, Dream } from "./schema";
import { deriveEffects } from "./effects";

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

export type Bundle = ReturnType<typeof loadContent>;

/** Tashqaridan kelgan (admin) kontentni sxema bo'yicha tekshiradi. */
export function parseBundle(raw: unknown): Bundle {
  const r = raw as { cards: unknown; bigBoard: unknown; dreams: unknown };
  return { cards: Cards.parse(r.cards), bigBoard: z.array(BigCell).length(53).parse(r.bigBoard), dreams: z.array(Dream).parse(r.dreams) };
}

/** O'yinni buzadigan mantiqiy xatolar (sxemadan tashqari). Bo'sh ro'yxat = nashr qilish mumkin. */
export function validateBundle(b: Bundle): string[] {
  const problems: string[] = [];
  for (const e of deriveEffects(b.cards)) if (e.effect.kind === "unresolved") problems.push(`${e.id}: ta'siri aniqlanmadi (${(e.effect as { reason: string }).reason})`);
  const cells = new Set(b.bigBoard.filter((c) => c.t === "O").map((c) => c.name));
  for (const d of b.dreams) if (!cells.has(d.name)) problems.push(`orzu "${d.name}" katta aylanada katak topilmadi`);
  if (b.bigBoard[34]?.name !== "Start") problems.push("katta aylana START (34) katagi o'zgargan");
  if (b.cards.kasb.length === 0) problems.push("kasblar yo'q");
  return problems;
}
export * from "./cardfile";
