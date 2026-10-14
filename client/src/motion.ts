import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export { animationMs, CARD_OPEN_MS } from "./motionConfig";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => live && setReduced(v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => setReduced(v));
    return () => { live = false; sub?.remove?.(); };
  }, []);
  return reduced;
}
