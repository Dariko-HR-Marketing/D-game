import React from "react";
import { h, hasDom } from "./svg";

type P = (string | [string, Record<string, unknown>])[];
// Chiziqli ikonkalar (24×24). Har biri — path'lar ro'yxati yoki [tag, atributlar].
const ICONS: Record<string, P> = {
  dollar: [["circle", { cx: 12, cy: 12, r: 9 }], "M12 7v10", "M9.5 9.7c0-1 1-1.6 2.5-1.6s2.5.7 2.5 1.7-1 1.4-2.5 1.8-2.5.8-2.5 1.9 1 1.7 2.5 1.7 2.5-.6 2.5-1.6"],
  cart: ["M3 4h2l2.3 10.6h9.4L19 7.5H6.2", ["circle", { cx: 9.5, cy: 19, r: 1.4 }], ["circle", { cx: 16.5, cy: 19, r: 1.4 }]],
  move: ["M12 3v18M3 12h18", "M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5"],
  search: [["circle", { cx: 10.5, cy: 10.5, r: 6 }], "M15 15l5.5 5.5"],
  info: [["circle", { cx: 12, cy: 12, r: 9 }], "M12 11v5", "M12 7.8v.2"],
  arrow: ["M5 12h14", "M13 6l6 6-6 6"],
  chevron: ["M9 18l6-6-6-6"], back: ["M15 18l-6-6 6-6"],
  clock: [["circle", { cx: 12, cy: 12, r: 9 }], "M12 7v5l3 2"],
  person: [["circle", { cx: 12, cy: 8, r: 3.8 }], "M4.5 20.5a7.5 7.5 0 0 1 15 0"],
  people: [["circle", { cx: 9, cy: 8, r: 3.5 }], "M2.5 20a6.5 6.5 0 0 1 13 0", "M16 4.5a3.5 3.5 0 0 1 0 7", "M18 14a6 6 0 0 1 3.5 6"],
  home: ["M3 11l9-7 9 7", "M5 10v10h14V10"],
  trophy: ["M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z", "M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"],
  book: ["M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z", "M4 19V5"],
  board: [["rect", { x: 4, y: 4, width: 16, height: 16, rx: 2.5 }], ["rect", { x: 9, y: 9, width: 6, height: 6, rx: 1 }]],
  chart: ["M4 19V9M10 19V5M16 19v-7M22 19H2"],
  house: ["M4 20V10l8-6 8 6v10z", "M9.5 20v-6h5v6"],
  dice: [["rect", { x: 4, y: 4, width: 16, height: 16, rx: 3 }], ["circle", { cx: 9, cy: 9, r: 1 }], ["circle", { cx: 15, cy: 9, r: 1 }], ["circle", { cx: 9, cy: 15, r: 1 }], ["circle", { cx: 15, cy: 15, r: 1 }]],
  star: ["M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2 6.4 20.2l1.1-6.3L2.9 9.5l6.3-.9z"],
  banknote: [["rect", { x: 3, y: 6.5, width: 18, height: 11, rx: 2 }], ["circle", { cx: 12, cy: 12, r: 2.5 }], "M6.5 9.5v.1M17.5 14.5v.1"],
  lock: [["rect", { x: 5, y: 11, width: 14, height: 9, rx: 2 }], "M8 11V8a4 4 0 0 1 8 0v3"],
  heart: ["M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"],
  flag: ["M6 21V4", "M6 4h11l-2 4 2 4H6"],
  alert: [["circle", { cx: 12, cy: 12, r: 9 }], "M12 7.5v5.5", "M12 16.4v.2"],
  bank: ["M3 10h18L12 4z", "M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"],
  share: [["circle", { cx: 18, cy: 5, r: 3 }], ["circle", { cx: 6, cy: 12, r: 3 }], ["circle", { cx: 18, cy: 19, r: 3 }], "M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"],
  help: [["circle", { cx: 12, cy: 12, r: 9 }], "M9.6 9.4a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.8", "M12 16.8v.2"],
  chat: ["M4 5h16v11H9l-5 4z", "M8 9.5h8M8 12.5h5"],
  mic: [["rect", { x: 9, y: 3, width: 6, height: 11, rx: 3 }], "M5.5 11.5a6.5 6.5 0 0 0 13 0", "M12 18v3M9 21h6"],
  micOff: [["rect", { x: 9, y: 3, width: 6, height: 11, rx: 3 }], "M5.5 11.5a6.5 6.5 0 0 0 13 0", "M12 18v3M9 21h6", "M4 4l16 16"],
  volume: ["M4 9.5v5h4l5 4v-13l-5 4H4z", "M16.5 9a4.2 4.2 0 0 1 0 6", "M19 6.5a8 8 0 0 1 0 11"],
  mute: ["M4 9.5v5h4l5 4v-13l-5 4H4z", "M16.5 9.5l5 5M21.5 9.5l-5 5"],
  plus: ["M12 5v14M5 12h14"], check: ["M5 12l5 5L20 7"], close: ["M6 6l12 12M18 6L6 18"],
  file: ["M6 3h8l4 4v14H6z", "M14 3v4h4", "M9 13h6M9 17h6"],
  timer: [["circle", { cx: 12, cy: 14, r: 6.5 }], "M12 11v3l2 1", "M10 3.5h4"],
  hand: ["M7 12V6.5a1.5 1.5 0 0 1 3 0V11", "M10 11V4.5a1.5 1.5 0 0 1 3 0V11", "M13 11V6a1.5 1.5 0 0 1 3 0v6", "M16 12V9.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L4 14.5a1.5 1.5 0 0 1 2.3-1.8L7 14"],
};
export type IconName = keyof typeof ICONS;

/** Dekorativ ikonka (ekran o'qish dasturlariga ko'rinmaydi); ma'nosi doim yonidagi matnda. */
export function Icon({ name, size = 20, color = "currentColor", stroke = 2, fill = "none" }: { name: IconName; size?: number; color?: string; stroke?: number; fill?: string }) {
  if (!hasDom) return null;
  return h("svg", { width: size, height: size, viewBox: "0 0 24 24", fill, stroke: color, strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, style: { flexShrink: 0, display: "block" } },
    ...ICONS[name].map((p, i) => (typeof p === "string" ? h("path", { key: i, d: p }) : h(p[0], { key: i, ...p[1] }))));
}
