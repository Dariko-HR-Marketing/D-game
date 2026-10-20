// WebSocket xabarlari: qat'iy sxema (ortiqcha kalit rad etiladi), son chegaralari. Mijozga ishonib bo'lmaydi.
import { z } from "zod";

const id = z.string().min(1).max(64).regex(/^[\w-]+$/);
const int = (min: number, max: number) => z.number().int().min(min).max(max);
const money = int(1, 100_000_000);

/** `playerId` mijozdan qabul qilinmaydi — server o'zi qo'yadi. */
export const ActionIn = z.discriminatedUnion("type", [
  z.object({ type: z.literal("roll") }).strict(),
  z.object({ type: z.literal("decide"), accept: z.boolean(), qty: int(1, 100_000).optional(), useBank: z.boolean().optional(), deck: z.enum(["kichik", "katta"]).optional() }).strict(),
  z.object({ type: z.literal("choose_dream"), dreamIdx: int(0, 999) }).strict(),
  z.object({ type: z.literal("bank_loan"), amount: money }).strict(),
  z.object({ type: z.literal("bank_repay"), loanIdx: z.number().int().min(0).max(50) }).strict(),
  z.object({ type: z.literal("lombard"), assetIdx: z.number().int().min(0).max(200) }).strict(),
  z.object({ type: z.literal("market_sell"), proposalId: int(1, 1e9), assetCode: z.string().min(1).max(64).optional() }).strict(),
  z.object({ type: z.literal("suyunchi"), proposalId: int(1, 1e9), amount: int(1, 100_000) }).strict(),
  z.object({ type: z.literal("loan_request"), giverId: id, amount: money, months: int(1, 36) }).strict(),
  z.object({ type: z.literal("loan_accept"), proposalId: int(1, 1e9) }).strict(),
  z.object({ type: z.literal("loan_repay"), debtId: int(1, 1e9), amount: money }).strict(),
  z.object({ type: z.literal("loan_remind"), debtorId: id, debtId: int(1, 1e9) }).strict(),
  z.object({ type: z.literal("partner_offer"), partnerId: id }).strict(),
  z.object({ type: z.literal("partner_accept"), proposalId: int(1, 1e9) }).strict(),
  z.object({ type: z.literal("partner_buyout"), assetCode: z.string().min(1).max(64) }).strict(),
]);

export const Message = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create"), turnSeconds: z.union([z.literal(30), z.literal(60)]).optional() }).strict(), // qaror vaqti: 30 yoki 60 soniya (standart 30)
  z.object({ type: z.literal("join"), code: z.string().length(6).regex(/^[A-Za-z0-9]+$/) }).strict(),
  z.object({ type: z.literal("start"), events: z.boolean().optional() }).strict(), // events: «Kutilmagan hodisa!» (K katagi) yoqilganmi — xona egasi tanlaydi
  z.object({ type: z.literal("leave") }).strict(),
  z.object({ type: z.literal("react"), emoji: z.string().min(1).max(8) }).strict(),
  z.object({ type: z.literal("act"), seq: int(0, 1e9), action: ActionIn }).strict(),
]);
export type Msg = z.infer<typeof Message>;

export function parseMessage(raw: string): { ok: true; msg: Msg } | { ok: false; error: string } {
  let j: unknown; try { j = JSON.parse(raw); } catch { return { ok: false, error: "bad_json" }; }
  const r = Message.safeParse(j);
  return r.success ? { ok: true, msg: r.data } : { ok: false, error: "bad_message" };
}
