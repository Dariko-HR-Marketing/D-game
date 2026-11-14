import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { h, hasDom } from "./svg";
import { color, font, space, tone } from "../theme";

export interface ScatterPoint { id: string; x: number; y: number; r?: number; color: string; label?: string; title?: string }
/** Nuqtali diagramma (matritsa): o'qlar, chegara chiziqlari va to'rt chorak yozuvi. Veb — SVG; native — ro'yxat (jadval ham beriladi). */
export function Scatter({ points, vx, hy, fx, fy, xLabel, yLabel, quads, ariaLabel, height = 300 }: { points: ScatterPoint[]; vx?: number | null; hy?: number | null; fx: (n: number) => string; fy: (n: number) => string; xLabel: string; yLabel: string; quads?: [string, string, string, string]; ariaLabel: string; height?: number }) {
  const [w, setW] = useState(0); if (!points.length) return null;
  return (
    <View style={{ width: "100%" }}>
      <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))} style={{ width: "100%", height, overflow: "hidden" }}>
        {w > 0 && hasDom && <View style={{ position: "absolute", left: 0, top: 0, width: w, height }}><Plot w={w} H={height} {...{ points, vx, hy, fx, fy, xLabel, yLabel, quads, ariaLabel }} /></View>}
        {!hasDom && <View style={{ gap: 4 }}>{points.map((p) => <Text key={p.id} style={s.t}>{p.label ?? p.id}: {fx(p.x)} · {fy(p.y)}</Text>)}</View>}
      </View>
    </View>);
}
function Plot({ w, H, points, vx, hy, fx, fy, xLabel, yLabel, quads, ariaLabel }: { w: number; H: number; points: ScatterPoint[]; vx?: number | null; hy?: number | null; fx: (n: number) => string; fy: (n: number) => string; xLabel: string; yLabel: string; quads?: [string, string, string, string]; ariaLabel: string }) {
  const L = 52, R = 12, T = 14, B = 40, xs = points.map((p) => p.x).concat(vx != null ? [vx] : []), ys = points.map((p) => p.y).concat(hy != null ? [hy] : []);
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); const px = (x1 - x0 || 1) * 0.18, py = (y1 - y0 || 1) * 0.18; x0 -= px; x1 += px; y0 -= py; y1 += py;
  const X = (v: number) => L + ((w - L - R) * (v - x0)) / (x1 - x0), Y = (v: number) => T + ((H - T - B) * (1 - (v - y0) / (y1 - y0)));
  const grid: React.ReactNode[] = [];
  for (let t = 0; t <= 3; t++) { const vxx = x0 + ((x1 - x0) * t) / 3, vyy = y0 + ((y1 - y0) * t) / 3;
    grid.push(h("line", { key: `gy${t}`, x1: L, x2: w - R, y1: Y(vyy), y2: Y(vyy), stroke: "#E6ECEF", "aria-hidden": true }), h("text", { key: `ty${t}`, x: L - 6, y: Y(vyy) + 4, textAnchor: "end", fontSize: 11, fontFamily: "inherit", fill: tone.muted, "aria-hidden": true }, fy(vyy)), h("text", { key: `tx${t}`, x: X(vxx), y: H - B + 16, textAnchor: "middle", fontSize: 11, fontFamily: "inherit", fill: tone.muted, "aria-hidden": true }, fx(vxx))); }
  const lines = [vx != null ? h("line", { key: "vx", x1: X(vx), x2: X(vx), y1: T, y2: H - B, stroke: "#8493A2", strokeDasharray: "4 4", "aria-hidden": true }) : null, hy != null ? h("line", { key: "hy", y1: Y(hy), y2: Y(hy), x1: L, x2: w - R, stroke: "#8493A2", strokeDasharray: "4 4", "aria-hidden": true }) : null];
  const qs = quads ? ([[L + 6, T + 14, "start"], [w - R - 6, T + 14, "end"], [L + 6, H - B - 8, "start"], [w - R - 6, H - B - 8, "end"]] as const).map(([x, y, a], i) => h("text", { key: `q${i}`, x, y, textAnchor: a, fontSize: 11, fontFamily: "inherit", fontWeight: 700, fill: tone.muted, opacity: 0.85, "aria-hidden": true }, quads[i])) : [];
  const dots = points.flatMap((p) => [h("circle", { key: `c${p.id}`, cx: X(p.x), cy: Y(p.y), r: p.r ?? 8, fill: p.color, fillOpacity: 0.35, stroke: p.color, strokeWidth: 2 }, h("title", null, p.title ?? p.label ?? p.id)), p.label ? h("text", { key: `l${p.id}`, x: X(p.x), y: Y(p.y) - (p.r ?? 8) - 4, textAnchor: "middle", fontSize: 11, fontFamily: "inherit", fill: color.navy, fontWeight: 600, "aria-hidden": true }, p.label) : null]);
  return h("svg", { width: w, height: H, viewBox: `0 0 ${w} ${H}`, role: "img", "aria-label": ariaLabel, style: { display: "block" } }, ...grid, ...lines, ...qs, ...dots,
    h("text", { key: "xl", x: (L + w - R) / 2, y: H - 4, textAnchor: "middle", fontSize: 11, fontFamily: "inherit", fill: tone.muted, "aria-hidden": true }, xLabel), h("text", { key: "yl", transform: `translate(12 ${(T + H - B) / 2}) rotate(-90)`, textAnchor: "middle", fontSize: 11, fontFamily: "inherit", fill: tone.muted, "aria-hidden": true }, yLabel));
}

/** Radar: bir nechta o'yinchining 5 ko'rsatkichi (0–1). */
export function Radar({ axes, series, ariaLabel }: { axes: string[]; series: { id: string; color: string; values: number[] }[]; ariaLabel: string }) {
  if (!hasDom) return <View>{series.map((s2) => <Text key={s2.id} style={s.t}>{s2.id}: {s2.values.map((v) => Math.round(v * 100)).join(" / ")}</Text>)}</View>;
  const C = 170, R = 120, n = axes.length, pt = (i: number, r: number) => [C + R * r * Math.sin((2 * Math.PI * i) / n), C - R * r * Math.cos((2 * Math.PI * i) / n)];
  const kids: React.ReactNode[] = [];
  [0.25, 0.5, 0.75, 1].forEach((r) => kids.push(h("polygon", { key: `g${r}`, points: axes.map((_, i) => pt(i, r).join(",")).join(" "), fill: "none", stroke: "#E6ECEF", "aria-hidden": true })));
  axes.forEach((a, i) => { const [x, y] = pt(i, 1.2); kids.push(h("line", { key: `a${i}`, x1: C, y1: C, x2: pt(i, 1)[0], y2: pt(i, 1)[1], stroke: "#E6ECEF", "aria-hidden": true }), h("text", { key: `t${i}`, x, y, textAnchor: "middle", fontSize: 11, fontFamily: "inherit", fill: tone.muted, "aria-hidden": true }, a.length > 16 ? a.slice(0, 15) + "…" : a)); });
  series.forEach((sr) => kids.push(h("polygon", { key: `p${sr.id}`, points: sr.values.map((v, i) => pt(i, Math.max(0.02, Math.min(1, v))).join(",")).join(" "), fill: sr.color, fillOpacity: 0.12, stroke: sr.color, strokeWidth: 2 })));
  return <View style={{ alignItems: "center", width: "100%" }}>{h("svg", { viewBox: "0 0 340 340", role: "img", "aria-label": ariaLabel, style: { display: "block", width: "100%", maxWidth: 380, height: "auto" } }, ...kids)}</View>;
}

/** Ko'p qismli gorizontal ustun (matn bilan). */
export function Bar({ parts, ariaLabel }: { parts: { pct: number; color: string }[]; ariaLabel: string }) {
  return <View style={s.bar} role="img" aria-label={ariaLabel}>{parts.map((p, i) => <View key={i} style={{ width: `${Math.max(0, Math.min(100, p.pct))}%`, backgroundColor: p.color, height: "100%" }} />)}</View>;
}
const s = StyleSheet.create({ t: { color: tone.muted, fontSize: font.sm }, bar: { height: 10, borderRadius: 6, backgroundColor: "#EEF2F6", overflow: "hidden", flexDirection: "row", marginTop: space.xs } });
