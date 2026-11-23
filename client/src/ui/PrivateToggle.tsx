import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Icon } from "./Icon";
import { uz } from "../i18n/uz";
import { color, font, radius, space, tone } from "../theme";

/** «Yopiq xona» galochkasi: belgilansa xona ro'yxatda qulfcha bilan chiqadi va faqat kod bilan kiriladi (kod ro'yxatda ko'rsatilmaydi; kodni xona egasi do'stlariga yuboradi). */
export function PrivateToggle({ value, onChange, dark, compact }: { value: boolean; onChange: (v: boolean) => void; dark?: boolean; compact?: boolean }) {
  if (compact) return (
    <Pressable role="checkbox" aria-checked={value} testID="room-private" accessibilityLabel={`${uz.home.privateRoom}. ${uz.home.privateHint}`} onPress={() => onChange(!value)} hitSlop={8} style={({ pressed }) => [s.mini, pressed && { opacity: 0.8 }]}>
      <View style={[s.miniBox, value && s.boxOn]} aria-hidden>{value && <Text style={s.miniTick}>✓</Text>}</View>
      <Icon name="lock" size={14} color={tone.muted} /><Text style={s.miniT} aria-hidden>{uz.home.privateShort}</Text>
    </Pressable>);
  return (
    <Pressable role="checkbox" aria-checked={value} testID="room-private" accessibilityLabel={`${uz.home.privateRoom}. ${uz.home.privateHint}`} onPress={() => onChange(!value)} style={({ pressed }) => [s.row, value && s.rowOn, pressed && { opacity: 0.85 }]}>
      <View style={[s.box, value && s.boxOn]} aria-hidden>{value && <Text style={s.tick}>✓</Text>}</View>
      <View style={{ flex: 1, minWidth: 0 }} aria-hidden>
        <View style={s.title}><Icon name="lock" size={16} color={color.navy} /><Text style={s.t}>{uz.home.privateRoom}</Text></View>
        <Text style={s.h}>{uz.home.privateHint}</Text>
      </View>
    </Pressable>);
}
const s = StyleSheet.create({
  mini: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, alignSelf: "center", paddingHorizontal: space.sm }, miniBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: "#8696A5", alignItems: "center", justifyContent: "center", backgroundColor: color.white }, miniTick: { color: "#fff", fontWeight: "900", fontSize: 13, lineHeight: 15 }, miniT: { color: tone.muted, fontSize: font.sm, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 56, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: color.line, backgroundColor: color.white }, rowOn: { borderColor: color.gold, backgroundColor: "#FFF8E6" },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: "#8696A5", alignItems: "center", justifyContent: "center", backgroundColor: color.white }, boxOn: { backgroundColor: color.green, borderColor: color.green }, tick: { color: "#fff", fontWeight: "900", fontSize: 16, lineHeight: 18 },
  title: { flexDirection: "row", alignItems: "center", gap: 6 }, t: { color: color.navy, fontWeight: "800", fontSize: font.md }, h: { color: tone.muted, fontSize: 12, lineHeight: 17, marginTop: 1 },
});
