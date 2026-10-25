import React, { useEffect, useRef } from "react";
import { Animated, View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Icon, type IconName } from "./Icon";
import { color, tone } from "../theme";
import { useReducedMotion } from "../motion";

/** Bo'lim belgisi: `urgent` — qizil (javob kutilmoqda), `info` — yashil (yangilik/imkoniyat); `temp` — vaqt cheklangan, pulsatsiya qiladi. */
export interface NavBadge { count: number; tone: "urgent" | "info"; temp?: boolean; label: string }
export interface NavItem<K extends string> { key: K; label: string; icon: IconName; badge?: NavBadge | null }

function BadgeDot({ b }: { b: NavBadge }) {
  const reduced = useReducedMotion(); const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!b.temp || reduced) { v.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 700, useNativeDriver: true })]));
    loop.start(); return () => loop.stop();
  }, [b.temp, reduced, v]);
  const bg = b.tone === "urgent" ? color.red : color.green;
  return (
    <Animated.View aria-hidden testID={`nav-badge-${b.tone}`} style={[s.badge, { backgroundColor: bg, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }]}>
      <Text style={s.badgeT}>{b.count > 9 ? "9+" : String(b.count)}</Text>
    </Animated.View>);
}

/** Pastki navigatsiya (telefon): faol bo'lim qalin va to'q, qolganlari kulrang; faol bo'lim `aria-current`. Kutayotgan narsasi bor bo'lim belgi oladi (badges.ts). */
export function BottomNav<K extends string>({ items, active, onChange, label, testID }: { items: NavItem<K>[]; active: K; onChange: (k: K) => void; label: string; testID?: string }) {
  const tiny = useWindowDimensions().width < 320; // katlanuvchi telefon (280 px): yozuv kichrayadi, tugmalar ekrandan chiqmaydi
  return (
    <View role="navigation" aria-label={label} style={s.nav} testID={testID}>
      {items.map((it) => { const on = it.key === active; const b = on ? null : it.badge; return (
        <Pressable key={it.key} accessibilityRole="button" accessibilityLabel={b ? `${it.label}, ${b.label}` : it.label} aria-current={on ? "page" : undefined} onPress={() => onChange(it.key)} style={s.item}>
          <View>
            <Icon name={it.icon} size={22} stroke={on ? 2.2 : 1.8} color={on ? color.navy : "#6B7C8C"} />
            {b && <BadgeDot b={b} />}
          </View>
          <Text numberOfLines={1} style={[s.t, tiny && { fontSize: 11 }, on && { color: color.navy, fontWeight: "800" }]}>{it.label}</Text>
        </Pressable>); })}
    </View>
  );
}
const s = StyleSheet.create({
  nav: { height: 62, flexDirection: "row", borderTopWidth: 1, borderTopColor: "#E6ECEF", backgroundColor: color.white },
  item: { flex: 1, minWidth: 0, paddingHorizontal: 2, alignItems: "center", justifyContent: "center", gap: 3, minHeight: 44 },
  t: { fontSize: 12, fontWeight: "600", color: tone.muted },
  badge: { position: "absolute", top: -7, right: -13, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: color.white },
  badgeT: { color: color.white, fontSize: 12, fontWeight: "800", lineHeight: 14, fontVariant: ["tabular-nums"] },
});
