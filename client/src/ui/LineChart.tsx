import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { h, hasDom } from "./svg";
import { money } from "../format";
import { niceTicks, type ChartPoint } from "../report";
import { color, font, space, tone } from "../theme";

export interface ChartSeries { id: string; label: string; color: string; dash?: boolean; points: ChartPoint[]; width?: number }
export interface ChartMarker { x: number; label: string; color?: string }

/** Chiziqli grafik (oy bo'yicha): o'lchamlar konteyner kengligiga moslanadi (matn har doim o'qiladigan o'lchamda). Veb — SVG; native — ustunlar. Rang yagona belgi emas: ro'yxat/jadval ham beriladi. */
export function LineChart({ series, height = 200, ariaLabel, markers = [], xLabel }: { series: ChartSeries[]; height?: number; ariaLabel: string; markers?: ChartMarker[]; xLabel?: string }) {
  const [w, setW] = useState(0); const all = series.flatMap((x) => x.points); if (all.length < 2) return null;
  return (
    <View style={{ width: "100%", gap: space.xs }}>
      {/* o'lchash konteyneri: grafik unga mutlaq joylashadi (grafik kengligi konteyner kengligiga ta'sir qilmasin — cheksiz qayta chizish bo'lmasin) */}
      <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))} style={{ width: "100%", height, overflow: "hidden" }}>
        {w > 0 && <View style={{ position: "absolute", left: 0, top: 0, width: w, height }}>{hasDom ? <Svg w={w} h={height} series={series} markers={markers} ariaLabel={ariaLabel} /> : <Bars w={w} h={height} series={series[0]} ariaLabel={ariaLabel} />}</View>}
      </View>
      {xLabel ? <Text style={s.x} aria-hidden>{xLabel}</Text> : null}
    </View>
  );
}

function Svg({ w, h: H, series, markers, ariaLabel }: { w: number; h: number; series: ChartSeries[]; markers: ChartMarker[]; ariaLabel: string }) {
  const all = series.flatMap((x) => x.points), xs = all.map((p) => p.x), ys = all.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), ticks = niceTicks(Math.min(...ys), Math.max(...ys), 4), y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const label = Math.max(...ticks.map((t) => money(t).length)); const padL = Math.min(96, 14 + label * 7), padR = 10, padT = 10, padB = 22;
  const X = (x: number) => padL + (x1 === x0 ? 0 : ((x - x0) / (x1 - x0)) * (w - padL - padR)), Y = (y: number) => padT + (y1 === y0 ? 0 : (1 - (y - y0) / (y1 - y0)) * (H - padT - padB));
  const xt = (() => { const n = Math.max(2, Math.min(6, Math.floor((w - padL - padR) / 70))); const out: number[] = []; for (let i = 0; i <= n; i++) out.push(Math.round(x0 + ((x1 - x0) * i) / n)); return [...new Set(out)]; })();
  return h("svg", { width: w, height: H, viewBox: `0 0 ${w} ${H}`, role: "img", "aria-label": ariaLabel, style: { display: "block" } },
    ...ticks.map((t) => h("g", { key: `y${t}`, "aria-hidden": true }, h("line", { x1: padL, x2: w - padR, y1: Y(t), y2: Y(t), stroke: t === 0 ? "#9FB0BC" : "#E6ECEF", strokeWidth: t === 0 ? 1.5 : 1 }), h("text", { x: padL - 6, y: Y(t) + 4, textAnchor: "end", fontSize: 12, fill: tone.muted, fontFamily: "inherit" }, money(t)))),
    ...xt.map((t) => h("text", { key: `x${t}`, x: X(t), y: H - 6, textAnchor: t === x0 ? "start" : t === x1 ? "end" : "middle", fontSize: 12, fill: tone.muted, fontFamily: "inherit", "aria-hidden": true }, String(t))),
    ...markers.map((m, i) => h("line", { key: `m${i}`, x1: X(m.x), x2: X(m.x), y1: padT, y2: H - padB, stroke: m.color ?? color.gold, strokeWidth: 1.5, strokeDasharray: "4 3", "aria-hidden": true })),
    ...series.map((sr) => h("polyline", { key: sr.id, fill: "none", stroke: sr.color, strokeWidth: sr.width ?? 2.5, strokeLinejoin: "round", strokeLinecap: "round", strokeDasharray: sr.dash ? "6 4" : undefined, points: sr.points.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" "), "aria-hidden": true })),
    ...series.map((sr) => { const l = sr.points[sr.points.length - 1]; return h("circle", { key: `e${sr.id}`, cx: X(l.x), cy: Y(l.y), r: 3.5, fill: sr.color, "aria-hidden": true }); }));
}

/** Native zaxira: bitta seriya — ustunlar (manfiy qiymat nol chizig'idan pastga qizil). */
function Bars({ w, h: H, series, ariaLabel }: { w: number; h: number; series: ChartSeries; ariaLabel: string }) {
  const ys = series.points.map((p) => p.y), max = Math.max(1, ...ys.map(Math.abs)), neg = ys.some((v) => v < 0), half = neg ? (H - 8) / 2 : H - 8;
  return (
    <View accessibilityRole="image" accessibilityLabel={ariaLabel} style={{ width: w, height: H, flexDirection: "row", alignItems: "stretch", gap: 1 }}>
      {series.points.map((p, i) => (<View key={i} style={{ flex: 1 }}><View style={{ height: half, justifyContent: "flex-end" }}>{p.y >= 0 && <View style={{ height: Math.max(2, (p.y / max) * half), backgroundColor: series.color }} />}</View>{neg && <View style={{ height: half }}>{p.y < 0 && <View style={{ height: Math.max(2, (-p.y / max) * half), backgroundColor: color.red }} />}</View>}</View>))}
    </View>
  );
}

const s = StyleSheet.create({ x: { color: tone.muted, fontSize: font.xs, textAlign: "right" } });
