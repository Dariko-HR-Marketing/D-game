import React, { useEffect, useRef, useState } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { money } from "../format";
import { useReducedMotion } from "../motion";
import { tone } from "../theme";

/** Raqam o'zgarganda eski qiymatdan yangisiga sanab o'tadi va qisqa muddat yashil (oshdi) yoki qizil (kamaydi) bo'lib turadi. */
export function CountText({ value, signed, style, ms = 800 }: { value: number; signed?: boolean; style?: StyleProp<TextStyle>; ms?: number }) {
  const reduced = useReducedMotion(); const [shown, setShown] = useState(value); const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const from = useRef(value); const timer = useRef<ReturnType<typeof setInterval> | null>(null); const off = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (value === from.current) return;
    const a = from.current, b = value; from.current = b; setFlash(b > a ? "up" : "down");
    if (off.current) clearTimeout(off.current); off.current = setTimeout(() => setFlash(null), ms + 700);
    if (timer.current) clearInterval(timer.current);
    if (reduced) { setShown(b); return; }
    const t0 = Date.now(); timer.current = setInterval(() => { const k = Math.min(1, (Date.now() - t0) / ms), e = 1 - Math.pow(1 - k, 3); setShown(Math.round(a + (b - a) * e)); if (k >= 1 && timer.current) { clearInterval(timer.current); timer.current = null; } }, 32);
  }, [value, reduced, ms]);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); if (off.current) clearTimeout(off.current); }, []);
  return <Text style={[style, flash === "up" && { color: tone.good }, flash === "down" && { color: tone.bad }]} aria-hidden>{signed && shown > 0 ? "+" : ""}{money(shown)}</Text>;
}
