import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import type { ChartSeries } from "./LineChart";
import { color, font, space, tone } from "../theme";

/** Jadval: tor ekranda faqat jadval gorizontal aylanadi (sahifa emas). */
export function Tbl({ head, rows, min = 520 }: { head: string[]; rows: React.ReactNode[][]; min?: number }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: "100%" }}>
      <View style={{ minWidth: min, flexGrow: 1 }} role="table">
        <View style={s.tr} role="row">{head.map((x, i) => <Text key={i} style={[s.th, i === 0 && { flex: 1.4 }]} role="columnheader">{x}</Text>)}</View>
        {rows.map((r, i) => <View key={i} style={s.tr} role="row">{r.map((c, j) => <View key={j} style={[s.td, j === 0 && { flex: 1.4 }]} role="cell">{typeof c === "string" || typeof c === "number" ? <Text style={s.tdT}>{c}</Text> : c}</View>)}</View>)}
      </View>
    </ScrollView>);
}
/** Ustunlar: kengligiga qarab yonma-yon yoki ustma-ust (telefon, planshet, yotiq holat). */
export const Grid = ({ children }: { children: React.ReactNode }) => <View style={s.grid}>{children}</View>;
export const Cell = ({ children }: { children: React.ReactNode }) => <View style={s.cell}>{children}</View>;
export const Hint = ({ children }: { children: React.ReactNode }) => <Text style={s.hint}>{children}</Text>;
export const Note = ({ label, children }: { label: string; children: React.ReactNode }) => <Text style={s.hint}><Text style={s.tag}>{label} </Text>{children}</Text>;
/** Ko'rinmas chiziq: grafik shkalasi har doim 0–100% bo'lsin (inqiroz bo'lmasa ham tekis chiziq o'rniga to'liq o'q chiqadi). */
export const scale100 = (pts: { month: number }[]): ChartSeries => ({ id: "scale", label: "", color: "transparent", points: pts.length ? [{ x: pts[0].month, y: 100 }, { x: pts[pts.length - 1].month, y: 100 }] : [] });
const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md, width: "100%" }, cell: { flexGrow: 1, flexBasis: 340, minWidth: 0 },
  hint: { color: tone.muted, fontSize: font.sm, lineHeight: 19, marginTop: space.sm }, tag: { color: color.navy, fontWeight: "800" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E6ECEF", alignItems: "center", gap: space.sm, paddingVertical: 7 }, th: { flex: 1, color: tone.muted, fontSize: font.xs, fontWeight: "700" },
  td: { flex: 1, justifyContent: "center", alignItems: "flex-start" }, tdT: { color: color.navy, fontSize: font.sm, fontVariant: ["tabular-nums"] },
});
