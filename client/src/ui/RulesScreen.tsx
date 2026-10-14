import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { RULES } from "@poyga/rules";
import { Button } from "./Button";
import { uz } from "../i18n/uz";
import { ruleItems } from "../i18n/rulesText";
import { color } from "../theme";

export function RulesScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.h} aria-level={1} accessibilityRole="header">{uz.rules.title}</Text>
      <Text style={s.sub}>{uz.rules.intro}</Text>
      {ruleItems(RULES).map((r) => (
        <View key={r.id} style={s.card}>
          <Text style={s.t} aria-level={2} accessibilityRole="header">{r.title}</Text>
          <Text style={s.body}>{r.text}</Text>
          <Text style={s.src}>{uz.rules.source}: {r.source}</Text>
        </View>))}
      <Button label={uz.profile.back} kind="ghost" onPress={onBack} />
    </ScrollView>);
}
const s = StyleSheet.create({
  wrap: { padding: 20, gap: 12, maxWidth: 640, width: "100%", alignSelf: "center" }, h: { fontSize: 24, fontWeight: "800", color: color.navy }, sub: { color: color.text2 },
  card: { backgroundColor: color.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: color.line, gap: 6 },
  t: { fontWeight: "700", fontSize: 16, color: color.navy }, body: { color: color.navy, lineHeight: 22 }, src: { color: color.text2, fontSize: 12 },
});
