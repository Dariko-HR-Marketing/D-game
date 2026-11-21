import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { RULES } from "@tajriba24/rules";
import { Screen } from "./Screen";
import { Icon } from "./Icon";
import { uz } from "../i18n/uz";
import { ruleItems } from "../i18n/rulesText";
import { color, font, MIN_TAP, radius, space, tone } from "../theme";

/** Qoidalar: har bir qoida akkordion — katta sarlavha bosilganda matn ochiladi (bir vaqtda bittasi; mobil va kompyuterda bir xil). */
export function RulesScreen({ onBack }: { onBack: () => void }) {
  const items = ruleItems(RULES); const [open, setOpen] = useState<string | null>(null);
  return (
    <Screen title={uz.rules.title} subtitle={uz.rules.intro} onBack={onBack} maxWidth={760}>
      <View style={s.list} testID="rules-list">
        {items.map((r, i) => { const on = open === r.id; return (
          <View key={r.id} style={[s.item, on && s.itemOn]} testID={`rule-${r.id}`}>
            <Pressable accessibilityRole="button" aria-expanded={on} aria-controls={`rule-body-${r.id}`} accessibilityState={{ expanded: on }} onPress={() => setOpen(on ? null : r.id)} style={({ pressed }) => [s.head, pressed && { backgroundColor: "#F4F7F8" }]} testID={`rule-head-${r.id}`}>
              <View style={s.num} aria-hidden><Text style={s.numT}>{i + 1}</Text></View>
              <Text style={s.t} aria-level={2} role="heading">{r.title}</Text>
              <View style={{ transform: [{ rotate: on ? "90deg" : "0deg" }] }} aria-hidden><Icon name="chevron" size={22} color={color.navy} /></View>
            </Pressable>
            {on && (<View style={s.body} nativeID={`rule-body-${r.id}`} role="region" aria-label={r.title}>
              <Text style={s.p}>{r.text}</Text>
              <Text style={s.src}>{uz.rules.source}: {r.source}</Text>
            </View>)}
          </View>); })}
      </View>
    </Screen>);
}
const s = StyleSheet.create({
  list: { gap: space.sm },
  item: { backgroundColor: color.white, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E6ECEF", overflow: "hidden" }, itemOn: { borderColor: color.green },
  head: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 64, paddingHorizontal: space.lg, paddingVertical: space.sm },
  num: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#EAF1F5", alignItems: "center", justifyContent: "center" }, numT: { color: color.navy, fontWeight: "800", fontSize: font.sm },
  t: { flex: 1, fontWeight: "800", fontSize: font.xl, color: color.navy, lineHeight: 28 },
  body: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm, minHeight: MIN_TAP },
  p: { color: color.navy, lineHeight: 24, fontSize: font.md }, src: { color: tone.muted, fontSize: font.xs, fontWeight: "600" },
});
