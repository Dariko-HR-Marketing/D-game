import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { RULES } from "@tajriba24/rules";
import { Screen } from "./Screen";
import { Icon, type IconName } from "./Icon";
import { uz } from "../i18n/uz";
import { ruleItems } from "../i18n/rulesText";
import { money } from "../format";
import { color, font, radius, space, tone } from "../theme";

/** Qoida bo'limlari: 25 ta qoida 4 guruhga yig'iladi — sahifa uzun aylanmaydi (yig'iq holatda 4 qator). Matnlar `rulesText`dan, guruhlash faqat tuzilma. */
const GROUPS: { key: string; icon: IconName; ids: string[] }[] = [
  { key: "play", icon: "dice" as IconName, ids: ["turn", "card", "timers", "dream", "birth", "job"] },
  { key: "money", icon: "dollar" as IconName, ids: ["bank", "lombard", "auction", "debt", "suyunchi", "loan", "partner", "requests"] },
  { key: "circles", icon: "trophy" as IconName, ids: ["exit", "win", "circles", "smallcells", "bigcells", "rent", "crisis"] },
  { key: "more", icon: "book" as IconName, ids: ["qar", "level", "live", "under16", "fair"] },
];

/** Qoidalar: ikki bosqichli akkordion — bo'lim (katta) va ichida qoida (nomi kattaroq). Bir vaqtda bitta bo'lim va bitta qoida ochiq; mobil va kompyuterda bir xil. */
/** O'yin yo'li infografikasi: 4 bosqich (raqamlar `RULES` dan; matnlar `uz.rules.path`). */
function PathInfo() {
  const steps = [
    { icon: "dice" as IconName, t: uz.rules.path.s1, d: uz.rules.path.d1 },
    { icon: "dollar" as IconName, t: uz.rules.path.s2, d: uz.rules.path.d2 },
    { icon: "flag" as IconName, t: uz.rules.path.s3.replace("{cash}", money(RULES.exitCash)).replace("{flow}", money(RULES.exitPassiveFlow)), d: uz.rules.path.d3 },
    { icon: "trophy" as IconName, t: uz.rules.path.s4.replace("{flow}", money(RULES.winCashflow)), d: uz.rules.path.d4 },
  ];
  return (
    <View style={s.path} role="group" aria-label={uz.rules.path.title} testID="rules-path">
      <Text style={s.pathH}>{uz.rules.path.title}</Text>
      {steps.map((st, i) => (
        <View key={i} style={s.stepRow}>
          <View style={s.railCol} aria-hidden><View style={s.stepNo}><Icon name={st.icon} size={18} color="#fff" /></View>{i < steps.length - 1 && <View style={s.rail} />}</View>
          <View style={{ flex: 1, paddingBottom: i < steps.length - 1 ? space.md : 0 }}><Text style={s.stepT}><Text style={{ color: color.green }}>{i + 1}. </Text>{st.t}</Text><Text style={s.stepD}>{st.d}</Text></View>
        </View>))}
    </View>);
}

export function RulesScreen({ onBack }: { onBack: () => void }) {
  const items = ruleItems(RULES); const byId = new Map(items.map((r) => [r.id, r])); const used = new Set(GROUPS.flatMap((g) => g.ids));
  const groups = GROUPS.map((g) => ({ ...g, rules: g.ids.map((id) => byId.get(id)).filter(Boolean) as typeof items })).concat([{ key: "extra", icon: "book" as IconName, ids: [], rules: items.filter((r) => !used.has(r.id)) }]).filter((g) => g.rules.length > 0);
  const [openG, setOpenG] = useState<string | null>(null); const [openR, setOpenR] = useState<string | null>(null);
  return (
    <Screen title={uz.rules.title} subtitle={uz.rules.intro} onBack={onBack} maxWidth={760}>
      <PathInfo />
      <View style={s.list} testID="rules-list">
        {groups.map((g) => { const gOn = openG === g.key; const gName = uz.rules.groups[g.key] ?? uz.rules.groups.more; return (
          <View key={g.key} style={[s.group, gOn && s.groupOn]} testID={`rules-group-${g.key}`}>
            <Pressable accessibilityRole="button" aria-expanded={gOn} accessibilityState={{ expanded: gOn }} onPress={() => { setOpenG(gOn ? null : g.key); setOpenR(null); }} style={({ pressed }) => [s.gHead, pressed && { backgroundColor: "#F4F7F8" }]} testID={`rules-group-head-${g.key}`}>
              <View style={s.gIco} aria-hidden><Icon name={g.icon} size={22} color={color.navy} /></View>
              <View style={{ flex: 1 }}><Text style={s.gT} aria-level={2} role="heading">{gName}</Text><Text style={s.gS}>{g.rules.length} {uz.rules.ruleWord}</Text></View>
              <View style={{ transform: [{ rotate: gOn ? "90deg" : "0deg" }] }} aria-hidden><Icon name="chevron" size={22} color={color.navy} /></View>
            </Pressable>
            {gOn && <View style={s.inner}>{g.rules.map((r) => { const on = openR === r.id; return (
              <View key={r.id} style={[s.item, on && s.itemOn]} testID={`rule-${r.id}`}>
                <Pressable accessibilityRole="button" aria-expanded={on} accessibilityState={{ expanded: on }} onPress={() => setOpenR(on ? null : r.id)} style={({ pressed }) => [s.head, pressed && { backgroundColor: "#F4F7F8" }]} testID={`rule-head-${r.id}`}>
                  <Text style={s.t} aria-level={3} role="heading">{r.title}</Text>
                  <View style={{ transform: [{ rotate: on ? "90deg" : "0deg" }] }} aria-hidden><Icon name="chevron" size={20} color={color.navy} /></View>
                </Pressable>
                {on && <View style={s.body} role="region" aria-label={r.title}><Text style={s.p}>{r.text}</Text><Text style={s.src}>{uz.rules.source}: {r.source}</Text></View>}
              </View>); })}</View>}
          </View>); })}
      </View>
    </Screen>);
}
const s = StyleSheet.create({
  path: { backgroundColor: "#F3FAF6", borderWidth: 1, borderColor: "#BFE3D1", borderRadius: radius.lg, padding: space.lg, marginBottom: space.md, gap: space.sm }, pathH: { color: color.navy, fontWeight: "800", fontSize: font.lg, marginBottom: 2 },
  stepRow: { flexDirection: "row", gap: space.md }, railCol: { alignItems: "center", width: 36 }, stepNo: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.green, alignItems: "center", justifyContent: "center" }, rail: { flex: 1, width: 3, minHeight: 14, backgroundColor: "#BFE3D1", marginTop: 2, borderRadius: 2 },
  stepT: { color: color.navy, fontWeight: "800", fontSize: font.md }, stepD: { color: tone.muted, fontSize: font.sm, lineHeight: 19, marginTop: 2 },
  list: { gap: space.sm },
  group: { backgroundColor: color.white, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E6ECEF", overflow: "hidden" }, groupOn: { borderColor: color.green },
  gHead: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 68, paddingHorizontal: space.lg, paddingVertical: space.sm },
  gIco: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#EAF1F5", alignItems: "center", justifyContent: "center" },
  gT: { fontWeight: "800", fontSize: font.xl, color: color.navy, lineHeight: 26 }, gS: { color: tone.muted, fontSize: font.sm, fontWeight: "600" },
  inner: { borderTopWidth: 1, borderTopColor: "#E6ECEF" },
  item: { borderBottomWidth: 1, borderBottomColor: "#EEF2F4" }, itemOn: { backgroundColor: "#FAFCFB" },
  head: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 56, paddingHorizontal: space.lg, paddingVertical: space.sm },
  t: { flex: 1, fontWeight: "800", fontSize: font.lg, color: color.navy, lineHeight: 24 },
  body: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm },
  p: { color: color.navy, lineHeight: 24, fontSize: font.md }, src: { color: tone.muted, fontSize: font.xs, fontWeight: "600" },
});
