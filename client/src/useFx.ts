import { useEffect, useMemo, useRef, useState } from "react";
import { diffSnap, sameSnap, snapOf, type FxEvent, type Snap } from "./fx";
import { useReducedMotion } from "./motion";

export interface Chip extends FxEvent { id: number; title?: string; ttl: number }
const CHIP_MS = 3400, CHIP_REDUCED_MS = 2400, MAX_CHIPS = 5;
let nextId = 1;

/**
 * Moliya o'zgarishlari (naqd, passiv daromad, pul oqimi, qarz, aktivlar): server holati o'zgargan zahoti farq olinadi, lekin ko'rsatish
 * fishka yurib bo'lgach (`settled`) boshlanadi — shunda raqam o'zgarishi kartaning o'zi bilan bir vaqtda ko'rinadi. `shown` — hozir ekranda
 * turishi kerak bo'lgan (hali animatsiya bermagan o'zgarishlarni o'z ichiga olmagan) holat.
 */
export function useFx(player: any | undefined, lastCardText: string | null | undefined, settled: boolean) {
  const reduced = useReducedMotion();
  const target = useMemo<Snap | null>(() => (player ? snapOf(player) : null), [player]);
  const last = useRef<Snap | null>(target); const queue = useRef<FxEvent[]>([]);
  const [shown, setShown] = useState<Snap | null>(target); const [chips, setChips] = useState<Chip[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]); const cardText = useRef(lastCardText); cardText.current = lastCardText;
  useEffect(() => { // yangi holat: farqni navbatga qo'yamiz (animatsiya `settled` bo'lgach)
    if (!target) return;
    if (last.current && !sameSnap(last.current, target)) queue.current.push(...diffSnap(last.current, target));
    last.current = target;
  }, [target]);
  useEffect(() => { // fishka yurib bo'ldi: ko'rsatilgan raqamlar yangilanadi va chiplar chiqadi
    if (!settled || !target) return;
    setShown(target);
    if (!queue.current.length) return;
    const ttl = reduced ? CHIP_REDUCED_MS : CHIP_MS;
    const fresh: Chip[] = queue.current.splice(0).map((e) => ({ ...e, id: nextId++, ttl, title: e.kind === "assetAdd" && e.assetKind !== "more" ? cardText.current ?? undefined : undefined }));
    setChips((c) => [...fresh, ...c].slice(0, MAX_CHIPS));
    for (const ch of fresh) timers.current.push(setTimeout(() => setChips((c) => c.filter((x) => x.id !== ch.id)), ttl + 100));
  }, [settled, target, reduced]);
  useEffect(() => () => { for (const t of timers.current) clearTimeout(t); timers.current = []; }, []);
  return { shown, chips, reduced };
}
