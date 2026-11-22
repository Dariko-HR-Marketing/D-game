import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Icon } from "./Icon";
import { uz } from "../i18n/uz";
import { color, font, radius, space, tone } from "../theme";
import type { TurnSeconds } from "../turnPref";

/** Navbat vaqti: darajaga qarab rang — Odatiy (yashil), Sekin (ko'k), Mehrojiddin (indigo, vaqtsiz). Tanlangan karta to'liq rangda, qolganlari och rangda. */
const LEVELS: { v: TurnSeconds; name: string; time: string; label: string; hue: string; tint: string; line: string; icon: "clock" | "timer" | "star" }[] = [
  { v: 60, name: uz.home.desk.usual, time: uz.home.desk.speed30, label: uz.home.turn30, hue: "#11835A", tint: "#E7F4EE", line: "#A9CF7E", icon: "clock" },
  { v: 120, name: uz.home.desk.slow, time: uz.home.desk.speed60, label: uz.home.turn60, hue: "#1B6FA8", tint: "#E6F1F9", line: "#8EC1E3", icon: "timer" },
  { v: 0, name: uz.home.turn0, time: uz.home.desk.speed0, label: uz.home.turn0Full, hue: "#4B3FA0", tint: "#EEEBF8", line: "#B4ABE0", icon: "star" },
];
export function SpeedPicker({ value, onChange }: { value: TurnSeconds; onChange: (v: TurnSeconds) => void }) {
  const hint = value === 0 ? uz.home.turn0Hint : value === 120 ? uz.home.turn60Hint : uz.home.turn30Hint;
  return (
    <View style={{ gap: space.xs }} testID="home-turn">
      <View style={s.row} role="radiogroup" aria-label={uz.home.desk.stepSpeed}>
        {LEVELS.map((l) => { const on = value === l.v; return (
          <Pressable key={l.v} role="radio" aria-checked={on} testID={`turn-${l.v}`} accessibilityLabel={l.label} onPress={() => onChange(l.v)} style={[s.card, { backgroundColor: on ? l.hue : l.tint, borderColor: on ? l.hue : l.line }]}>
            <Icon name={l.icon} size={20} color={on ? "#fff" : l.hue} />
            <Text style={[s.n, { color: on ? "#fff" : l.hue }]} aria-hidden>{l.name}</Text>
            <Text style={[s.tm, { color: on ? "#fff" : tone.muted }]} aria-hidden>{l.time}</Text>
          </Pressable>); })}
      </View>
      <Text style={s.hint} testID={value === 0 ? "turn0-hint" : undefined}>{hint}</Text>
    </View>);
}
const s = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm }, card: { flex: 1, minHeight: 84, alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: 6, paddingVertical: space.sm, borderRadius: radius.md, borderWidth: 2 },
  n: { fontWeight: "800", fontSize: font.sm, textAlign: "center" }, tm: { fontSize: 12, fontWeight: "700", textAlign: "center" }, hint: { color: tone.muted, fontSize: 12, lineHeight: 17 },
});
