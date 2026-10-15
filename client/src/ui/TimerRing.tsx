import React from "react";
import { View, Text } from "react-native";
import { h, hasDom } from "./svg";
import { color } from "../theme";

/** Qolgan vaqt halqasi (0:26). Rang va raqam birga; ≤ 8 s da qizg'ish. Ma'no `label` orqali (ekran o'qish dasturi uchun). */
export function TimerRing({ left, total = 30, size = 44, label }: { left: number; total?: number; size?: number; label: string }) {
  const r = size / 2 - 3, c = 2 * Math.PI * r, ratio = Math.max(0, Math.min(1, left / total)), warn = left <= 8;
  return (
    <View accessible role="timer" aria-label={label} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {hasDom && h("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, style: { position: "absolute", transform: "rotate(-90deg)" }, "aria-hidden": true },
        h("circle", { cx: size / 2, cy: size / 2, r, fill: "#fff", stroke: "#E6ECEF", strokeWidth: 4 }),
        h("circle", { cx: size / 2, cy: size / 2, r, fill: "none", stroke: warn ? "#B42D33" : color.navy, strokeWidth: 4, strokeLinecap: "round", strokeDasharray: c, strokeDashoffset: c * (1 - ratio) }))}
      <Text aria-hidden style={{ fontWeight: "800", fontSize: size * 0.3, color: warn ? "#B42D33" : color.navy, fontVariant: ["tabular-nums"] }}>{`0:${String(Math.max(0, left)).padStart(2, "0")}`}</Text>
    </View>
  );
}
