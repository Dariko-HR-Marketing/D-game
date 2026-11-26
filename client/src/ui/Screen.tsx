import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { color, font, MIN_TAP, radius, space, tone } from "../theme";
import { uz } from "../i18n/uz";
import { Icon, type IconName } from "./Icon";

/** Oddiy ekran qobig'i: sarlavha (h1), «Orqaga» tugmasi tepada, mazmun markazda cheklangan kenglikda. */
export function Screen({ title, subtitle, onBack, backLabel, maxWidth = 560, children, right, icon, chips }: { icon?: IconName; chips?: { label: string; value: string; good?: boolean }[]; title: string; subtitle?: string; onBack?: () => void; backLabel?: string; maxWidth?: number; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <ScrollView contentContainerStyle={[s.wrap, { maxWidth }]} keyboardShouldPersistTaps="handled">
      {onBack && <Pressable accessibilityRole="button" accessibilityLabel={backLabel ?? uz.profile.back} onPress={onBack} style={s.back}><Text style={s.backT} aria-hidden>←</Text><Text style={s.backT}>{backLabel ?? uz.profile.back}</Text></Pressable>}
      {icon ? (
        <View style={s.hero}>
          <View style={s.heroDeco1} aria-hidden /><View style={s.heroDeco2} aria-hidden />
          <View style={s.heroTop}>
            <View style={s.heroIco} aria-hidden><Icon name={icon} size={26} color={color.white} stroke={1.8} /></View>
            <View style={{ flex: 1 }}><Text style={s.heroH} aria-level={1} accessibilityRole="header">{title}</Text>{subtitle ? <Text style={s.heroSub}>{subtitle}</Text> : null}</View>{right}
          </View>
          {chips && chips.length > 0 && <View style={s.chips}>{chips.map((c) => (<View key={c.label} style={[s.chip, c.good && s.chipGood]} role="group" accessible aria-label={`${c.label}: ${c.value}`}><Text style={s.chipV}>{c.value}</Text><Text style={s.chipL}>{c.label}</Text></View>))}</View>}
        </View>
      ) : (
      <View style={s.head}><View style={{ flex: 1 }}><Text style={s.h} aria-level={1} accessibilityRole="header">{title}</Text>{subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}</View>{right}</View>
      )}
      {children}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  hero: { backgroundColor: color.navy, borderRadius: 24, padding: space.lg, gap: space.md, overflow: "hidden" },
  heroDeco1: { position: "absolute", right: -40, top: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(17,131,90,0.35)" },
  heroDeco2: { position: "absolute", right: 50, bottom: -70, width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(242,178,51,0.16)" },
  heroTop: { flexDirection: "row", alignItems: "center", gap: space.md }, heroIco: { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  heroH: { fontSize: font.xxl, fontWeight: "800", color: color.white }, heroSub: { color: "#C9D6E0", fontSize: font.md, marginTop: 2, lineHeight: 21 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm }, chip: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, paddingHorizontal: space.md, paddingVertical: space.sm, minWidth: 92 }, chipGood: { backgroundColor: "rgba(17,131,90,0.55)" },
  chipV: { color: color.white, fontWeight: "800", fontSize: font.lg }, chipL: { color: "#C9D6E0", fontSize: font.xs, fontWeight: "600" },
  wrap: { padding: space.xl, gap: space.lg, width: "100%", alignSelf: "center" },
  back: { minHeight: MIN_TAP, flexDirection: "row", alignItems: "center", gap: space.sm, alignSelf: "flex-start", paddingRight: space.md, borderRadius: radius.md }, backT: { color: color.navy, fontWeight: "700", fontSize: font.md },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.md }, h: { fontSize: font.xxl, fontWeight: "800", color: color.navy }, sub: { color: tone.muted, fontSize: font.md, marginTop: space.xs, lineHeight: 21 },
});
