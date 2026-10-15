import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { RULES } from "@poyga/rules";
import { Card } from "./kit";
import { Screen } from "./Screen";
import { uz } from "../i18n/uz";
import { ruleItems } from "../i18n/rulesText";
import { color, font, space, tone } from "../theme";

export function RulesScreen({ onBack }: { onBack: () => void }) {
  return (
    <Screen title={uz.rules.title} subtitle={uz.rules.intro} onBack={onBack} maxWidth={680}>
      {ruleItems(RULES).map((r) => (
        <Card key={r.id} style={{ gap: space.sm }}>
          <Text style={s.t} aria-level={2} accessibilityRole="header">{r.title}</Text>
          <Text style={s.body}>{r.text}</Text>
          <Text style={s.src}>{uz.rules.source}: {r.source}</Text>
        </Card>))}
    </Screen>);
}
const s = StyleSheet.create({ t: { fontWeight: "800", fontSize: font.lg, color: color.navy }, body: { color: color.navy, lineHeight: 23, fontSize: font.md }, src: { color: tone.muted, fontSize: font.xs, fontWeight: "600" } });
