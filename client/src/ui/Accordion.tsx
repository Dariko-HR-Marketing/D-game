import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Icon, type IconName } from "./Icon";
import { color, font, radius, space, tone } from "../theme";

/** Bosh sahifa akkordioni: bitta qatorli sarlavha (ikonka, nom, qisqa xulosa, strelka); ochilganda ichi ko'rinadi. Ekran o'qigich uchun `aria-expanded`. */
export function Acc({ icon, title, summary, open, onToggle, testID, label, children, badge }: { icon: IconName; title: string; summary?: React.ReactNode; open: boolean; onToggle: () => void; testID?: string; label?: string; badge?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <View style={[s.box, open && s.boxOn]}>
      <Pressable testID={testID} accessibilityRole="button" aria-expanded={open} accessibilityState={{ expanded: open }} accessibilityLabel={label ?? title} onPress={onToggle} style={({ pressed }) => [s.head, pressed && { backgroundColor: "#F4F7F8" }]}>
        <View style={[s.ico, open && { backgroundColor: color.green }]} aria-hidden><Icon name={icon} size={20} color={open ? color.white : color.navy} /></View>
        <View style={{ flex: 1, minWidth: 0 }} aria-hidden><Text style={s.t}>{title}</Text>{summary ? <Text style={s.sum} numberOfLines={1}>{summary}</Text> : null}</View>
        {badge}
        <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }} aria-hidden><Icon name="chevron" size={20} color={tone.muted} /></View>
      </Pressable>
      {open && <View style={s.body}>{children}</View>}
    </View>);
}
const s = StyleSheet.create({
  box: { backgroundColor: color.white, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E6ECEF", overflow: "hidden" }, boxOn: { borderColor: color.green },
  head: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 60, paddingHorizontal: space.md, paddingVertical: space.sm },
  ico: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#F0F4F6", alignItems: "center", justifyContent: "center" },
  t: { color: color.navy, fontWeight: "800", fontSize: font.md }, sum: { color: tone.muted, fontSize: font.sm, marginTop: 1 },
  body: { gap: space.md, padding: space.md, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: "#EEF2F4" },
});
