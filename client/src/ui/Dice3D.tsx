import React, { useEffect, useRef, useState } from "react";
import { h } from "./svg";
import { useReducedMotion } from "../motion";
import { DICE_MS } from "../motionConfig";
import { FACE_ANGLE, faceOf, rollAngles, type Angles, type Face } from "../diceFace";
import { color } from "../theme";
import { uz } from "../i18n/uz";

// Aylanib tushish: kub uch o'qda aylanadi (sekinlashib), tepaga otilib, 2–3 marta sakrab joyiga tushadi; soya balandlikka qarab kichrayadi.
const CSS = ["a", "b"].map((k) => `@keyframes poyga-toss-${k}{0%{transform:translateY(0) scale(1)}26%{transform:translateY(calc(var(--up)*-1)) scale(1.1)}56%{transform:translateY(0) scale(1)}70%{transform:translateY(calc(var(--up)*-.3))}84%{transform:translateY(0)}92%{transform:translateY(calc(var(--up)*-.09))}100%{transform:translateY(0)}}
@keyframes poyga-shadow-${k}{0%{transform:scale(1);opacity:.4}26%{transform:scale(.55);opacity:.16}56%{transform:scale(1);opacity:.4}70%{transform:scale(.85);opacity:.28}84%{transform:scale(1);opacity:.4}100%{transform:scale(1);opacity:.4}}`).join("\n");
let injected = false;
const inject = () => { const d = (globalThis as any).document; if (injected || !d?.head) return; injected = true; const el = d.createElement("style"); el.setAttribute("data-poyga", "dice"); el.textContent = CSS; d.head.appendChild(el); };

const PIPS: Record<number, number[]> = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const FACE_TF: Record<Face, string> = { front: "", back: "rotateY(180deg)", right: "rotateY(90deg)", left: "rotateY(-90deg)", top: "rotateX(90deg)", bottom: "rotateX(-90deg)" };
const FACES = Object.keys(FACE_TF) as Face[];
const VAL: Record<Face, number> = { front: 1, back: 6, right: 2, left: 5, top: 3, bottom: 4 };

function face(f: Face, size: number, numeral: string | null) {
  const v = VAL[f], showNum = f === "front" && numeral !== null, pip = size * 0.17, one = size * 0.25;
  return h("div", { key: f, style: { position: "absolute", inset: 0, transform: `${FACE_TF[f]} translateZ(${size / 2}px)`, backfaceVisibility: "hidden", borderRadius: size * 0.17, boxSizing: "border-box",
      background: "linear-gradient(145deg,#ffffff 0%,#f0f4f7 55%,#d9e2e8 100%)", border: "1px solid rgba(8,34,56,.28)", boxShadow: `inset 0 0 ${size * 0.14}px rgba(8,34,56,.14)`,
      display: "grid", gridTemplateColumns: "repeat(3,1fr)", gridTemplateRows: "repeat(3,1fr)", padding: size * 0.13, placeItems: "center" } },
    showNum ? h("span", { style: { gridColumn: "1 / 4", gridRow: "1 / 4", fontWeight: 800, fontSize: size * 0.5, color: color.navy, fontFamily: "inherit" } }, numeral)
      : Array.from({ length: 9 }, (_, i) => h("span", { key: i, style: PIPS[v].includes(i) ? (v === 1
        ? { width: one, height: one, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%,#d0545a,#9E2A30 70%)", boxShadow: "inset 0 -1px 2px rgba(0,0,0,.35)" }
        : { width: pip, height: pip, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%,#3d566b,#082238 72%)", boxShadow: "inset 0 -1px 2px rgba(0,0,0,.45)" }) : { width: pip, height: pip } })));
}

/** 3D kubik (veb): CSS 3D, natija yuzida to'xtaydi. `n` har yangi tashlashda o'zgaradi. 7+ (yig'indi) yoki natija yo'q bo'lsa old yuz raqam/«?» ko'rsatadi. */
export function Dice3D({ value, n, size = 64 }: { value: number | null; n?: number; size?: number }) {
  const reduced = useReducedMotion(); inject();
  const rest = (v: number | null): Angles => FACE_ANGLE[v !== null && v >= 1 && v <= 6 ? faceOf(v) : "front"];
  const [a, setA] = useState<Angles>(() => rest(value)); const [k, setK] = useState(0); const [rolling, setRolling] = useState(false);
  const prevN = useRef(n), angles = useRef(a); angles.current = a;
  useEffect(() => {
    if (value === null) { setA(rest(null)); return; }
    if (n === undefined || n === prevN.current) { if (n === undefined) setA(rest(value)); return; } // faqat yangi tashlashda aylanadi
    prevN.current = n;
    if (reduced) { setA(rest(value)); return; }
    setA(rollAngles(angles.current, value, n)); setK((x) => x + 1); setRolling(true);
    const t = setTimeout(() => setRolling(false), DICE_MS + 60); return () => clearTimeout(t);
  }, [n, value, reduced]);
  const numeral = value === null ? "?" : value > 6 ? String(value) : null;
  const label = value === null ? uz.game.diceNone : `${uz.game.diceLabel}: ${value}`, ab = k % 2 ? "b" : "a";
  return h("div", { role: "img", "aria-label": label, style: { width: size, height: size, position: "relative", flexShrink: 0, perspective: size * 5, margin: `${size * 0.16}px ${size * 0.18}px ${size * 0.1}px` } },
    h("div", { "aria-hidden": true, style: { position: "absolute", left: size * 0.08, right: size * 0.08, bottom: -size * 0.1, height: size * 0.2, borderRadius: "50%", background: "radial-gradient(closest-side,rgba(8,34,56,.6),rgba(8,34,56,0))", opacity: 0.4,
      animation: rolling ? `poyga-shadow-${ab} ${DICE_MS}ms ease-out both` : undefined } }),
    h("div", { "aria-hidden": true, style: { width: "100%", height: "100%", transformStyle: "preserve-3d", ["--up" as any]: `${size * 0.5}px`, animation: rolling ? `poyga-toss-${ab} ${DICE_MS}ms cubic-bezier(.3,.55,.4,1) both` : undefined } },
      h("div", { style: { width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d", transform: `rotateX(-22deg) rotateY(28deg) rotateX(${a.x}deg) rotateY(${a.y}deg)`,
        transition: rolling ? `transform ${Math.round(DICE_MS * 0.93)}ms cubic-bezier(.16,.66,.28,1)` : "none" } }, FACES.map((f) => face(f, size, numeral)))));
}
