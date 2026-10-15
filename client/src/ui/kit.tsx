// Umumiy UI to'plami: barcha ekranlar bir xil bo'shliq, burchak va ranglardan foydalanadi.
import React from "react";
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { color, font, radius, shadow, space, surface, tone } from "../theme";

export function Card({ children, style, accent, raised = true, label }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; accent?: "gold" | "green" | "red"; raised?: boolean; label?: string }) {
  return <View {...(label ? { role: "group" as const, "aria-label": label } : {})} style={[k.card, raised && shadow, accent && { borderColor: accent === "gold" ? color.gold : accent === "green" ? color.green : color.red, borderWidth: 2 }, style]}>{children}</View>;
}
export function SectionTitle({ children, level = 2, right }: { children: React.ReactNode; level?: number; right?: React.ReactNode }) {
  return <View style={k.titleRow}><Text style={k.title} aria-level={level} accessibilityRole="header">{children}</Text>{right}</View>;
}
export function Pill({ label, kind = "plain" }: { label: string; kind?: "good" | "bad" | "warn" | "info" | "plain" }) {
  const fg = kind === "good" ? tone.good : kind === "bad" ? tone.bad : kind === "warn" ? tone.warn : color.navy;
  return <View style={[k.pill, { backgroundColor: surface[kind] }]}><Text style={[k.pillText, { color: fg }]}>{label}</Text></View>;
}
/** Katta raqam + izoh (naqd, pul oqimi va h.k.) */
export function Stat({ label, value, kind = "neutral", big }: { label: string; value: string; kind?: "good" | "bad" | "neutral"; big?: boolean }) {
  const fg = kind === "good" ? tone.good : kind === "bad" ? tone.bad : color.navy;
  return (<View style={k.stat} role="group" accessible aria-label={`${label}: ${value}`}>
    <Text style={[big ? k.statBig : k.statVal, { color: fg }]} aria-hidden>{value}</Text><Text style={k.statLabel} aria-hidden>{label}</Text></View>);
}
export function Row({ l, v, kind }: { l: string; v: string; kind?: "good" | "bad" | "neutral" }) {
  const fg = kind === "good" ? tone.good : kind === "bad" ? tone.bad : color.navy;
  return <View style={k.row}><Text style={k.rowL}>{l}</Text><Text style={[k.rowV, { color: fg }]}>{v}</Text></View>;
}
export function Banner({ kind, children }: { kind: "good" | "bad" | "warn" | "info"; children: React.ReactNode }) {
  const fg = kind === "good" ? tone.good : kind === "bad" ? tone.bad : kind === "warn" ? tone.warn : color.navy;
  return <View style={[k.banner, { backgroundColor: surface[kind] }]} accessibilityRole="alert"><Text style={[k.bannerText, { color: fg }]}>{children}</Text></View>;
}
export const Divider = () => <View style={{ height: 1, backgroundColor: color.line }} />;

const k = StyleSheet.create({
  card: { backgroundColor: color.white, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: color.line, gap: space.sm },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  title: { fontSize: font.lg, fontWeight: "800", color: color.navy },
  pill: { alignSelf: "flex-start", paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill },
  pillText: { fontSize: font.xs, fontWeight: "800", letterSpacing: 0.4 },
  stat: { flex: 1, minWidth: 90, gap: 2 },
  statVal: { fontSize: font.xl, fontWeight: "800" }, statBig: { fontSize: font.xxl, fontWeight: "800" }, statLabel: { fontSize: font.xs, color: tone.muted, fontWeight: "600" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: space.md, paddingVertical: 2 },
  rowL: { color: tone.muted, fontSize: font.md, flexShrink: 1 }, rowV: { fontSize: font.md, fontWeight: "800" },
  banner: { borderRadius: radius.md, padding: space.md }, bannerText: { fontSize: font.sm, fontWeight: "700", lineHeight: 19 },
});
