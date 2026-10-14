import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { color, MIN_TAP } from "../theme";

export function Button({ label, onPress, kind = "primary", disabled }: { label: string; onPress: () => void; kind?: "primary" | "ghost"; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.b, kind === "ghost" ? s.ghost : s.primary, disabled && s.off, pressed && { opacity: 0.85 }]}>
      <Text style={[s.t, kind === "ghost" && { color: color.navy }]}>{label}</Text>
    </Pressable>
  );
}
const s = StyleSheet.create({
  b: { minHeight: MIN_TAP, paddingHorizontal: 18, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  primary: { backgroundColor: color.green }, ghost: { backgroundColor: color.white, borderWidth: 1, borderColor: color.line },
  off: { opacity: 0.45 }, t: { color: color.white, fontWeight: "700", fontSize: 16 },
});
