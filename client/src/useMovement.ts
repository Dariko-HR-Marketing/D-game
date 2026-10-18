import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./motion";
import { planSteps, samePos, type Pos } from "./movement";
import { DICE_MS, STEP_MS } from "./motionConfig";
import { MAX_WALK } from "./movement";
import { sfx } from "./sound";
import type { RoomView } from "./net/connection";

export type Shown = Record<string, Pos>;
const snap = (players: any[]): Shown => Object.fromEntries(players.map((p) => [p.id, { pos: p.pos, circle: p.circle } as Pos]));
type Ev = { id: string; to: Pos; step: boolean; n: number };

/**
 * Server holatni bir martada yangilaydi (fishka darrov yangi katakda). Bu hook fishkani kubik to'xtagach (DICE_MS) har bir katak ustidan
 * (STEP_MS dan) bittalab yurgizadi va har qadamda tovush chaladi. `settled` — harakat tugadimi: karta/qaror shundan keyin ko'rsatiladi.
 * «Harakatni kamaytirish» yoqilgan bo'lsa — kechikishsiz, bir zumda.
 */
export function useMovement(room: RoomView | null): { shown: Shown; settled: boolean } {
  const reduced = useReducedMotion();
  const players: any[] = room?.state?.players ?? [];
  const [shown, setShown] = useState<Shown>(() => snap(players));
  const [landing, setLanding] = useState(false); // oxirgi qadam sakrab tushguncha (karta undan keyin chiqadi)
  const queue = useRef<Ev[]>([]); const tail = useRef<Shown>(snap(players)); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastN = useRef<number | undefined>(room?.state?.lastRoll?.n);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null); const tick = useRef<() => void>(() => {});
  /** Navbatni to'xtatib, fishkalarni oxirgi joyiga qo'yadi: kechikish yoki sekin qurilmada karta/qaror abadiy yashirinib qolmasin (server taymeri to'xtamaydi). */
  const flush = useRef<() => void>(() => {});
  flush.current = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } if (safety.current) { clearTimeout(safety.current); safety.current = null; } queue.current = []; setShown({ ...tail.current }); setLanding(false); };
  tick.current = () => {
    timer.current = null; const ev = queue.current.shift(); if (!ev) return;
    setShown((s) => ({ ...s, [ev.id]: ev.to }));
    if (ev.step) sfx.play("step", 1 + 0.04 * ev.n);
    if (queue.current.length) timer.current = setTimeout(() => tick.current(), ev.step ? STEP_MS : 220);
    else { if (safety.current) { clearTimeout(safety.current); safety.current = null; } if (ev.step) { setLanding(true); timer.current = setTimeout(() => { timer.current = null; setLanding(false); }, STEP_MS); } }
  };
  useEffect(() => {
    const st = room?.state; if (!st) return;
    const roll = st.lastRoll as { n: number } | null | undefined, rolled = !!roll && roll.n !== lastN.current; lastN.current = roll?.n;
    if (reduced) { if (timer.current) { clearTimeout(timer.current); timer.current = null; } queue.current = []; tail.current = snap(st.players); setShown(tail.current); return; }
    let added = false;
    for (const p of st.players) {
      const to: Pos = { pos: p.pos, circle: p.circle }, from = tail.current[p.id];
      if (!from) { tail.current[p.id] = to; setShown((s) => ({ ...s, [p.id]: to })); continue; }
      if (samePos(from, to)) continue;
      const plan = planSteps(from, to);
      if (plan) plan.forEach((pos, i) => queue.current.push({ id: p.id, to: { pos, circle: to.circle }, step: true, n: i })); else queue.current.push({ id: p.id, to, step: false, n: 0 });
      tail.current[p.id] = to; added = true;
    }
    if (added) { if (timer.current) { clearTimeout(timer.current); timer.current = null; setLanding(false); } timer.current = setTimeout(() => tick.current(), rolled ? DICE_MS : 0); if (safety.current) clearTimeout(safety.current); safety.current = setTimeout(() => flush.current(), DICE_MS + (MAX_WALK + 1) * STEP_MS + 800); }
  }, [room?.state, reduced]);
  useEffect(() => {
    const d = (globalThis as any).document; const h = () => { if (d?.visibilityState === "hidden") flush.current(); }; // yashirin yorliqda taymerlar sekinlashadi — darrov oxirgi holat
    d?.addEventListener?.("visibilitychange", h);
    return () => { d?.removeEventListener?.("visibilitychange", h); if (timer.current) clearTimeout(timer.current); if (safety.current) clearTimeout(safety.current); };
  }, []);
  const out = reduced ? snap(players) : shown;
  // Hisoblanadi (effektsiz): holat yangilangan zahoti «tugamagan» — karta bir kadr ham ko'rinib qolmaydi
  const settled = !(landing && !reduced) && players.every((p) => samePos(out[p.id], { pos: p.pos, circle: p.circle }));
  return { shown: out, settled };
}
