import { useEffect } from "react";

/** Akkordionlar guruhi: guruhdagi bittasi ochilganda qolganlari yopiladi (hamma akkordion ketma-ket ochilib ketmasin). */
const subs = new Set<(group: string, id: string) => void>();
export const openedExclusive = (group: string, id: string) => { subs.forEach((f) => f(group, id)); };
export function useExclusiveClose(group: string, id: string, close: () => void) {
  useEffect(() => { const f = (g: string, i: string) => { if (g === group && i !== id) close(); }; subs.add(f); return () => { subs.delete(f); }; }, [group, id, close]);
}
