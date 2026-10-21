import { useEffect, useRef, useState } from "react";
import { detectMoments, snapRoom, type Moment, type RoomSnap } from "./moments";
import { sfx } from "./sound";
import type { RoomView } from "./net/connection";

export interface ShownMoment extends Moment { key: number }
const MAX_SHOWN = 3, STAGGER_MS = 420;
let nextKey = 1;

/**
 * Muhim voqealar (moments.ts) → ovoz + qisqa animatsiya + tushuntirish. Holat o'zgargan zahoti farq olinadi, lekin ko'rsatish fishka yurib bo'lgach (`settled`)
 * boshlanadi — shunda ovoz va xabar kartaning o'zi bilan bir vaqtda bo'ladi. Sahifa ochilganda (boshlang'ich holat) hech narsa chiqmaydi.
 */
export function useMoments(room: RoomView, userId: string, settled: boolean) {
  const prev = useRef<RoomSnap | null>(snapRoom(room, userId)); const queue = useRef<Moment[]>([]);
  const [shown, setShown] = useState<ShownMoment[]>([]); const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => { // yangi holat: farqni navbatga qo'yamiz
    const next = snapRoom(room, userId); const ms = detectMoments(prev.current, room, userId); prev.current = next; if (ms.length) queue.current.push(...ms);
  }, [room]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { // ko'rsatish: harakat tugagach
    if (!settled || !queue.current.length) return;
    const fresh = queue.current.splice(0).map((m) => ({ ...m, key: nextKey++ }));
    fresh.forEach((m, i) => {
      timers.current.push(setTimeout(() => {
        if (m.sfx && m.mine) sfx.play(m.sfx); else if (m.sfx === "market") sfx.play("market");
        setShown((c) => [m, ...c].slice(0, MAX_SHOWN));
        timers.current.push(setTimeout(() => setShown((c) => c.filter((x) => x.key !== m.key)), m.ttl));
      }, i * STAGGER_MS));
    });
  }, [settled, room]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  return { shown, dismiss: (key: number) => setShown((c) => c.filter((x) => x.key !== key)) };
}
