import React, { useEffect, useState } from "react";
import { TimerRing } from "./ui/TimerRing";
import { uz } from "./i18n/uz";

/**
 * Qolgan soniyalar. Har soniyada FAQAT shu hookni ishlatgan kichik komponent qayta chiziladi (avval butun `Game` daraxti — taxta,
 * o'yinchilar, panellar — har soniyada qayta chizilardi: o'rta telefonda uzluksiz kadr tushishi).
 */
export function useCountdown(deadline: number | null | undefined) {
  const [left, setLeft] = useState(() => (deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0));
  useEffect(() => {
    if (!deadline) return setLeft(0);
    const tick = () => setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick(); const id = setInterval(tick, 500); return () => clearInterval(id);
  }, [deadline]);
  return left;
}

/** Qolgan soniyani bola funksiyaga beradi: tik-tak faqat shu bo'lakni yangilaydi. */
export function Countdown({ deadline, children }: { deadline: number | null | undefined; children: (left: number) => React.ReactNode }) {
  return <>{children(useCountdown(deadline))}</>;
}

/** Taymer halqasi (qolgan vaqt 0 bo'lsa ko'rinmaydi). */
export function DeadlineRing({ deadline, total, size }: { deadline: number | null | undefined; total: number; size: number }) {
  const left = useCountdown(deadline);
  return left > 0 ? <TimerRing left={left} total={total} size={size} label={`${left} ${uz.game.seconds}`} /> : null;
}
