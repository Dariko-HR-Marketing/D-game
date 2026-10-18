import { useEffect, useRef, useSyncExternalStore } from "react";
import { useReducedMotion } from "./motion";
import { DICE_MS } from "./motionConfig";
import { sfx, type Sfx } from "./sound";
import type { RoomView } from "./net/connection";

/** Tovush sozlamasi (jim/yoqilgan) — `sfx` ga obuna bo'ladi. */
export function useSoundPrefs() {
  const muted = useSyncExternalStore((fn) => sfx.subscribe(fn), () => sfx.muted, () => false);
  return { muted, toggle: () => { sfx.unlock(); sfx.toggle(); if (!sfx.muted) sfx.play("click"); } };
}

/**
 * O'yin holatlari → tovushlar: kubik (shitirlash + to'xtash), navbat, karta, pul (yutuq/to'lov), taymer oxirgi 5 soniya, g'alaba.
 * Fishka qadamlari `useMovement` da. Harakat tugagach (`settled`) chalinadi; sahifa ochilganda mavjud holat uchun chalinmaydi.
 */
export function useGameSounds({ room, userId, settled, mineTurn, left }: { room: RoomView; userId: string; settled: boolean; mineTurn: boolean; left: number }) {
  const st = room.state; const reduced = useReducedMotion();
  const lr = st.lastRoll as { n: number } | null | undefined, lc = st.lastCard as { n: number } | null | undefined;
  const mine = st.players.find((p: any) => p.id === userId);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]), seenRoll = useRef(lr?.n), seenCard = useRef(lc?.n), cash = useRef<number | undefined>(mine?.cash), turnKey = useRef<string | null>(null), ended = useRef(false);
  useEffect(() => {
    if (!lr || lr.n === seenRoll.current) return; seenRoll.current = lr.n;
    if (reduced) { sfx.play("land"); return; }
    sfx.play("roll"); const h = setTimeout(() => sfx.play("land"), DICE_MS - 90); return () => clearTimeout(h);
  }, [lr?.n, reduced]);
  useEffect(() => {
    const key = `${st.round}:${st.turn}`; if (!mineTurn || !settled || st.winner || turnKey.current === key) return;
    turnKey.current = key; sfx.play("turn");
  }, [mineTurn, settled, st.round, st.turn, st.winner]);
  useEffect(() => {
    if (!settled || !lc || lc.n === seenCard.current) return; seenCard.current = lc.n; sfx.play("card");
  }, [lc?.n, settled]);
  useEffect(() => {
    if (!settled || mine?.cash === undefined) return; const prev = cash.current; cash.current = mine.cash;
    if (prev === undefined || prev === mine.cash) return;
    const name: Sfx = mine.cash > prev ? "gain" : "pay"; timers.current.push(setTimeout(() => sfx.play(name), 380)); // bekor qilinmaydi: ketma-ket o'zgarishlarda ham har biri chalinadi
  }, [mine?.cash, settled]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  useEffect(() => { if (mineTurn && !st.winner && left > 0 && left <= 5) sfx.play("tick"); }, [left, mineTurn, st.winner]);
  useEffect(() => { if (!st.winner || ended.current) return; ended.current = true; sfx.play(st.winner === userId ? "win" : "lose"); }, [st.winner, userId]);
}
