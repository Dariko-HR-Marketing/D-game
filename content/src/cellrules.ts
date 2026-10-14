// Ochiq kataklar uchun ma'lumotga asoslangan qoidalar (SPEC §16: K, Q, V, X, Y kataklari ta'siri aniqlanmagan).
// Qaror kelgach, kod emas — shu JSON (admin panel, versiyali) to'ldiriladi. Bo'sh bo'lsa katak jurnalga "qoida kutilmoqda" yozadi.
import { z } from "zod";

export const DeckRef = z.enum(["hod", "kxar", "xar", "bozor"]);
export const CellAction = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }).strict(),                                                // hech narsa
  z.object({ kind: z.literal("restart") }).strict(),                                             // yangi kasb bilan boshidan
  z.object({ kind: z.literal("skipTurns"), turns: z.number().int().min(1).max(10) }).strict(),  // N navbat o'tkaziladi
  z.object({ kind: z.literal("payday"), times: z.number().int().min(1).max(5) }).strict(),      // pul oqimi N marta qo'shiladi
  z.object({ kind: z.literal("payFixed"), amount: z.number().int().positive().max(100_000_000) }).strict(), // aniq summa to'lanadi
  z.object({ kind: z.literal("loseIncomeShare"), share: z.number().gt(0).lte(1) }).strict(),    // oylik daromadning ulushi yo'qoladi (bir marta)
  z.object({ kind: z.literal("drawDeck"), deck: DeckRef }).strict(),                             // kartalar dekasidan karta tortiladi
  z.object({ kind: z.literal("offerCellAsset") }).strict(),                                      // katakdagi biznes (narx/daromad) sotib olish taklifi
]);
export type CellActionT = z.infer<typeof CellAction>;

export const CellRules = z.object({
  small: z.object({ K: CellAction.optional(), Q: CellAction.optional() }).strict().default({}),
  big: z.object({
    byType: z.object({ T: CellAction.optional(), V: CellAction.optional(), O: CellAction.optional(), X: CellAction.optional(), Y: CellAction.optional() }).strict().default({}),
    byIndex: z.record(z.string().regex(/^\d{1,2}$/), CellAction).default({}), // katak raqami → ta'sir (turdan ustun)
  }).strict().default({}),
}).strict();
export type CellRulesT = z.infer<typeof CellRules>;
export const EMPTY_CELL_RULES: CellRulesT = CellRules.parse({});
