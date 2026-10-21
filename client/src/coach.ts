// «O'quv o'yini» yo'l-yo'rig'i (platforma fayli, «O'quv o'yini» varag'i: 8 qadam). Qadamlar o'yin holatidan aniqlanadi (kubik va kartalar majburlanmaydi):
// tegishli voqea birinchi marta bo'lganda o'sha qadam matni ko'rsatiladi. Yangi hisob yo'q.
import { marketOffers, me, isMyTurn } from "./model";

export type CoachStep = "start" | "opportunity" | "shares" | "expense" | "market" | "payday" | "goal";
export const COACH_ORDER: CoachStep[] = ["start", "opportunity", "shares", "expense", "market", "payday", "goal"];

/** Hozir ko'rsatiladigan qadam (ko'rilmaganlardan birinchisi); `null` — hozir yo'q. */
export function coachStep(room: any, userId: string, seen: ReadonlySet<string>): CoachStep | null {
  if (room?.mode !== "tutorial" || !room.state || room.state.winner) return null;
  const st = room.state, mine = me(room, userId); if (!mine) return null;
  const e = room.pendingCard?.effect, mineCard = room.pendingCard && isMyTurn(room, userId);
  const last = st.lastCard && st.lastCard.playerId === userId ? room.lastCard?.effect : null;
  const months = mine.monthsPlayed ?? 0;
  const cond: Record<CoachStep, boolean> = {
    start: (st.round ?? 1) <= 1 && months === 0 && !(st.lastRoll && st.lastRoll.playerId === userId),
    opportunity: !!mineCard && e?.kind === "buy" && (e.asset === "small_business" || e.asset === "business"),
    shares: !!mineCard && e?.kind === "buyShares",
    expense: last?.kind === "pay",
    market: marketOffers(room, userId).length > 0,
    payday: months >= 1,
    goal: months >= 2,
  };
  for (const k of COACH_ORDER) if (cond[k] && !seen.has(k)) return k;
  return null;
}
