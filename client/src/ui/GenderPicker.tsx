import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { uz } from "../i18n/uz";
import { color, font, MIN_TAP, radius, space, tone } from "../theme";

export type Gender = "m" | "f" | null;
/** Ixtiyoriy jins: faqat standart avatar ko'rinishini tanlaydi. Tanlangan tugma qayta bosilsa, tanlov bekor bo'ladi. */
export function GenderPicker({ value, onChange }: { value: Gender; onChange: (g: Gender) => void }) {
  return (
    <View style={{ gap: space.xs }} role="radiogroup" aria-label={uz.profile.gender}>
      <Text style={s.l} aria-hidden>{uz.profile.gender}</Text>
      <View style={s.row}>
        {(["m", "f"] as const).map((g) => (
          <Pressable key={g} role="radio" aria-checked={value === g} testID={`gender-${g}`} onPress={() => onChange(value === g ? null : g)} style={[s.seg, value === g && s.on]}>
            <Text style={[s.t, value === g && { color: color.white }]}>{g === "m" ? uz.profile.male : uz.profile.female}</Text>
          </Pressable>))}
      </View>
      <Text style={s.hint}>{uz.profile.genderHint}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  l: { color: tone.muted, fontSize: font.sm, fontWeight: "700" }, row: { flexDirection: "row", gap: space.sm }, hint: { color: tone.muted, fontSize: font.xs, lineHeight: 17 },
  seg: { flex: 1, minHeight: MIN_TAP, borderRadius: radius.md, borderWidth: 1.5, borderColor: color.line, alignItems: "center", justifyContent: "center", backgroundColor: color.white }, on: { backgroundColor: color.navy, borderColor: color.navy }, t: { color: color.navy, fontWeight: "800", fontSize: font.md },
});
