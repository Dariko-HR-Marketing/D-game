import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { richLog, type LogKind } from "../model";
import { color, font, tone } from "../theme";

const BAR: Record<LogKind, string> = { good: tone.good, warn: color.gold, bad: tone.bad, info: color.navy, plain: "#DCE3E8" };
const TXT: Record<LogKind, string> = { good: tone.good, warn: "#8A5A00", bad: tone.bad, info: color.navy, plain: tone.muted };

/** Bitta voqea qatori: chap tomonda holat rangi, o'yinchi nomi qalin, holat so'zi («qabul qildi», «o'tkazdi», «rad etdi») rangli va qalin. */
export function LogLine({ room, line, latest, lines }: { room: any; line: string; latest?: boolean; lines?: number }) {
  const { parts, kind } = richLog(room, line);
  return (
    <View style={s.row} testID="log-line">
      <View style={[s.bar, { backgroundColor: BAR[kind] }]} aria-hidden />
      <Text style={[s.t, latest && { color: color.navy }]} numberOfLines={lines}>
        {parts.map((p, i) => <Text key={i} style={p.bold ? { fontWeight: "800", color: p.kind ? TXT[p.kind] : color.navy } : undefined}>{p.t}</Text>)}
      </Text>
    </View>);
}
const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, alignItems: "stretch" }, bar: { width: 4, borderRadius: 2 },
  t: { flex: 1, color: tone.muted, fontSize: font.sm, lineHeight: 19 },
});
