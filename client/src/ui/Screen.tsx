import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { color, font, MIN_TAP, radius, space, tone } from "../theme";
import { uz } from "../i18n/uz";

/** Oddiy ekran qobig'i: sarlavha (h1), «Orqaga» tugmasi tepada, mazmun markazda cheklangan kenglikda. */
export function Screen({ title, subtitle, onBack, backLabel, maxWidth = 560, children, right }: { title: string; subtitle?: string; onBack?: () => void; backLabel?: string; maxWidth?: number; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <ScrollView contentContainerStyle={[s.wrap, { maxWidth }]} keyboardShouldPersistTaps="handled">
      {onBack && <Pressable accessibilityRole="button" accessibilityLabel={backLabel ?? uz.profile.back} onPress={onBack} style={s.back}><Text style={s.backT} aria-hidden>←</Text><Text style={s.backT}>{backLabel ?? uz.profile.back}</Text></Pressable>}
      <View style={s.head}><View style={{ flex: 1 }}><Text style={s.h} aria-level={1} accessibilityRole="header">{title}</Text>{subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}</View>{right}</View>
      {children}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: space.xl, gap: space.lg, width: "100%", alignSelf: "center" },
  back: { minHeight: MIN_TAP, flexDirection: "row", alignItems: "center", gap: space.sm, alignSelf: "flex-start", paddingRight: space.md, borderRadius: radius.md }, backT: { color: color.navy, fontWeight: "700", fontSize: font.md },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.md }, h: { fontSize: font.xxl, fontWeight: "800", color: color.navy }, sub: { color: tone.muted, fontSize: font.md, marginTop: space.xs, lineHeight: 21 },
});
