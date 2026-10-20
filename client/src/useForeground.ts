import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

/** Ilova/ustun fonga ketib qaytganda (≥ `minHiddenMs`) `onResume`; tarmoq yo'qolsa `onOffline`, qaytsa `onResume`. Veb'da `visibilitychange`, mobilda `AppState`. */
export function useForeground(onResume: () => void, onOffline: () => void, minHiddenMs = 1000) {
  const resume = useRef(onResume), offline = useRef(onOffline); resume.current = onResume; offline.current = onOffline;
  useEffect(() => {
    let hiddenAt: number | null = null;
    const leave = () => { if (hiddenAt === null) hiddenAt = Date.now(); };
    const back = () => { const t = hiddenAt; hiddenAt = null; if (t !== null && Date.now() - t >= minHiddenMs) resume.current(); };
    const sub = AppState.addEventListener("change", (s) => (s === "active" ? back() : leave()));
    const w = Platform.OS === "web" ? (globalThis as any) : null;
    const onVis = () => (w.document.visibilityState === "hidden" ? leave() : back());
    const onNet = () => resume.current(), onOff = () => offline.current();
    if (w?.document) { w.document.addEventListener("visibilitychange", onVis); w.addEventListener?.("online", onNet); w.addEventListener?.("offline", onOff); w.addEventListener?.("pageshow", (e: any) => { if (e?.persisted) resume.current(); }); }
    return () => { sub.remove(); if (w?.document) { w.document.removeEventListener("visibilitychange", onVis); w.removeEventListener?.("online", onNet); w.removeEventListener?.("offline", onOff); } };
  }, [minHiddenMs]);
}
