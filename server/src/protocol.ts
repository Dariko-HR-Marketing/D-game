// WebSocket xabarlari: qat'iy sxema (ortiqcha kalit rad etiladi), son chegaralari. Mijozga ishonib bo'lmaydi.
import { z } from "zod";

const id = z.string().min(1).max(64).regex(/^[\w-]+$/);
const int = (min: number, max: number) => z.number().int().min(min).max(max);
const money = int(1, 100_000_000);

const CalcIn = z.object({ cash: int(-1_000_000_000, 1_000_000_000), passive: int(-1_000_000_000, 1_000_000_000), flow: int(-1_000_000_000, 1_000_000_000) }).strict();
/** `playerId` mijozdan qabul qilinmaydi — server o'zi qo'yadi. */
export const ActionIn = z.discriminatedUnion("type", [
  z.object({ type: z.literal("roll") }).strict(),
  z.object({ type: z.literal("decide"), accept: z.boolean(), qty: int(1, 100_000).optional(), useBank: z.boolean().optional(), deck: z.enum(["kichik", "katta"]).optional(), choice: z.enum(["A", "B", "V"]).optional(), calc: CalcIn.optional() }).strict(),
  z.object({ type: z.literal("confirm_calc"), calc: CalcIn }).strict(), // Hisob daftari: o'yinchi o'z hisobini kiritadi (server tekshiradi)
  z.object({ type: z.literal("choose_dream"), dreamIdx: int(0, 999) }).strict(),
  z.object({ type: z.literal("bank_loan"), amount: money }).strict(),
  z.object({ type: z.literal("deposit_withdraw"), depositId: z.number().int().min(1).max(10_000) }).strict(),
  z.object({ type: z.literal("bank_repay"), loanIdx: z.number().int().min(0).max(50) }).strict(),
  z.object({ type: z.literal("lombard"), assetIdx: z.number().int().min(0).max(200) }).strict(),
  z.object({ type: z.literal("sell_asset"), assetIdx: z.number().int().min(0).max(200) }).strict(),
  z.object({ type: z.literal("market_sell"), proposalId: int(1, 1e9), assetCode: z.string().min(1).max(64).optional() }).strict(),
  z.object({ type: z.literal("suyunchi"), proposalId: int(1, 1e9), amount: int(1, 100_000) }).strict(),
  z.object({ type: z.literal("loan_request"), giverId: id, amount: money, months: int(1, 36) }).strict(),
  z.object({ type: z.literal("loan_accept"), proposalId: int(1, 1e9) }).strict(),
  z.object({ type: z.literal("loan_repay"), debtId: int(1, 1e9), amount: money }).strict(),
  z.object({ type: z.literal("loan_remind"), debtorId: id, debtId: int(1, 1e9) }).strict(),
  z.object({ type: z.literal("partner_offer"), partnerId: id }).strict(),
  z.object({ type: z.literal("partner_accept"), proposalId: int(1, 1e9) }).strict(),
  z.object({ type: z.literal("partner_buyout"), assetCode: z.string().min(1).max(64) }).strict(),
  z.object({ type: z.literal("ack_restart"), id: int(1, 1e9) }).strict(), // bankrot tahlili ko'rildi — o'yin davom etadi
]);

const Sdp = z.object({ type: z.enum(["offer", "answer"]), sdp: z.string().min(1).max(30_000) }).strict();
const Cand = z.object({ candidate: z.string().max(2000), sdpMid: z.string().max(64).nullable().optional(), sdpMLineIndex: z.number().int().min(0).max(64).nullable().optional(), usernameFragment: z.string().max(64).nullable().optional() }).strict();
export const Message = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create"), turnSeconds: z.union([z.literal(30), z.literal(60), z.literal(0)]).optional(), calc: z.enum(["auto", "manual"]).optional(), players: z.number().int().min(2).max(8).optional(), mode: z.enum(["standard", "quick", "rated", "tutorial"]).optional() }).strict(), // players: oldindan belgilangan o'yinchilar soni (bo'shlarini botlar egallaydi); qaror vaqti: 30 yoki 60 soniya (standart 30)
  z.object({ type: z.literal("join"), code: z.string().length(6).regex(/^[A-Za-z0-9]+$/) }).strict(),
  z.object({ type: z.literal("start"), events: z.boolean().optional() }).strict(), // events: «Kutilmagan hodisa!» (K katagi) yoqilganmi — xona egasi tanlaydi
  z.object({ type: z.literal("leave") }).strict(),
  z.object({ type: z.literal("react"), emoji: z.string().min(1).max(8) }).strict(),
  z.object({ type: z.literal("chat"), text: z.string().min(1).max(1000).optional(), phrase: int(0, 99).optional() }).strict(), // yoki erkin matn, yoki tayyor ibora (ikkalasi birga — serverda rad etiladi)
  z.object({ type: z.literal("act"), seq: int(0, 1e9), action: ActionIn }).strict(),
  z.object({ type: z.literal("resume") }).strict(),
  z.object({ type: z.literal("voice"), op: z.enum(["join", "leave", "signal"]), to: id.optional(), sdp: Sdp.optional(), candidate: Cand.optional() }).strict(), // ovozli aloqa: ovozga qo'shilish/chiqish va WebRTC signalizatsiyasi (P2P)
  z.object({ type: z.literal("break") }).strict(), // «Vaqtincha chiqib turish»: avtopilot yoqiladi, «Men qaytdim» bilan qaytiladi // «Men qaytdim»: avtopilotni o'chiradi (o'yin harakati emas)
]);
export type Msg = z.infer<typeof Message>;

export function parseMessage(raw: string): { ok: true; msg: Msg } | { ok: false; error: string } {
  let j: unknown; try { j = JSON.parse(raw); } catch { return { ok: false, error: "bad_json" }; }
  const r = Message.safeParse(j);
  return r.success ? { ok: true, msg: r.data } : { ok: false, error: "bad_message" };
}
