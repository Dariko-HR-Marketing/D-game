import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Icon, type IconName } from "./Icon";
import { color, tone } from "../theme";

export interface NavItem<K extends string> { key: K; label: string; icon: IconName }
/** Pastki navigatsiya (telefon): faol bo'lim qalin va to'q, qolganlari kulrang; faol bo'lim `aria-current`. */
export function BottomNav<K extends string>({ items, active, onChange, label, testID }: { items: NavItem<K>[]; active: K; onChange: (k: K) => void; label: string; testID?: string }) {
  return (
    <View role="navigation" aria-label={label} style={s.nav} testID={testID}>
      {items.map((it) => { const on = it.key === active; return (
        <Pressable key={it.key} accessibilityRole="button" accessibilityLabel={it.label} aria-current={on ? "page" : undefined} onPress={() => onChange(it.key)} style={s.item}>
          <Icon name={it.icon} size={22} stroke={on ? 2.2 : 1.8} color={on ? color.navy : "#6B7C8C"} />
          <Text style={[s.t, on && { color: color.navy, fontWeight: "800" }]}>{it.label}</Text>
        </Pressable>); })}
    </View>
  );
}
const s = StyleSheet.create({
  nav: { height: 62, flexDirection: "row", borderTopWidth: 1, borderTopColor: "#E6ECEF", backgroundColor: color.white },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, minHeight: 44 },
  t: { fontSize: 11, fontWeight: "600", color: tone.muted },
});
