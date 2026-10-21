import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, Easing, StyleSheet, useWindowDimensions } from "react-native";
import { Icon, type IconName } from "./Icon";
import { useReducedMotion } from "../motion";
import type { ShownMoment } from "../useMoments";
import type { MomentKind } from "../moments";
import { uz } from "../i18n/uz";
import { color, font, HEADER_H, MIN_TAP, radius, shadow, space, surface, tone } from "../theme";

const ICON: Record<MomentKind, IconName> = { child: "heart", payday: "banknote", jobLoss: "alert", quitJob: "star", unexpected: "alert", market: "chart", offer: "hand", opportunity: "dice", expense: "dollar", buy: "cart", sell: "banknote", unlock: "star", lock: "lock", condition: "flag", ready: "trophy", exit: "trophy", newJob: "person" };
const TONE = { good: { fg: tone.good, bg: surface.good, edge: "#11835A" }, bad: { fg: tone.bad, bg: surface.bad, edge: "#9E2A30" }, info: { fg: color.navy, bg: surface.info, edge: "#2C6DB5" }, special: { fg: "#6B4300", bg: "#FFF3CF", edge: "#F2B233" } } as const;

/** Kuchli lahzada ekran chetida qisqa rangli yaltirash (kamaytirilgan harakatda yo'q). */
function Flash({ edge }: { edge: string }) {
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.sequence([Animated.timing(o, { toValue: 0.5, duration: 160, useNativeDriver: false }), Animated.timing(o, { toValue: 0, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: false })]).start(); }, [o]);
  return <Animated.View pointerEvents="none" aria-hidden style={[StyleSheet.absoluteFill, { borderWidth: 10, borderColor: edge, opacity: o, zIndex: 55 }]} />;
}

function MomentView({ m, onClose, reduced }: { m: ShownMoment; onClose: () => void; reduced: boolean }) {
  const t = TONE[m.tone]; const enter = useRef(new Animated.Value(reduced ? 1 : 0)).current; const icon = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.timing(enter, { toValue: 1, duration: 280, easing: Easing.out(Easing.back(1.4)), useNativeDriver: false }).start();
    const seq = m.anim === "shake" ? Animated.sequence([-1, 1, -0.7, 0.7, -0.35, 0].map((v) => Animated.timing(icon, { toValue: v, duration: 70, useNativeDriver: false })))
      : m.anim === "bounce" ? Animated.sequence([Animated.timing(icon, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }), Animated.timing(icon, { toValue: 0, duration: 420, easing: Easing.bounce, useNativeDriver: false })])
      : Animated.loop(Animated.sequence([Animated.timing(icon, { toValue: 1, duration: 420, useNativeDriver: false }), Animated.timing(icon, { toValue: 0, duration: 420, useNativeDriver: false })]), { iterations: 3 });
    seq.start();
  }, [reduced, enter, icon, m.anim]);
  const iconStyle = reduced ? undefined : { transform: [m.anim === "shake" ? { translateX: icon.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }) } : m.anim === "bounce" ? { translateY: icon.interpolate({ inputRange: [0, 1], outputRange: [0, -9] }) } : { scale: icon.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] };
  const style = reduced ? undefined : { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }, { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] };
  return (
    <Animated.View style={[s.card, { backgroundColor: t.bg, borderColor: t.edge }, style as any]} role="status" accessibilityLiveRegion="polite" aria-label={[m.title, m.text, m.note].filter(Boolean).join(". ")} testID={`moment-${m.kind}`}>
      <Animated.View style={[s.mark, { backgroundColor: t.edge }, iconStyle as any]} aria-hidden><Icon name={ICON[m.kind]} size={20} color={color.white} /></Animated.View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[s.title, { color: t.fg }]} aria-hidden>{m.title}</Text>
        {m.text ? <Text style={s.text} aria-hidden numberOfLines={2}>{m.text}</Text> : null}
        {m.note ? <Text style={s.note} aria-hidden>{m.note}</Text> : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={uz.game.close} onPress={onClose} style={s.x}><Text style={s.xT} aria-hidden>✕</Text></Pressable>
    </Animated.View>
  );
}

/** Lahzalar qatlami: tepada markazda (sarlavha ostida), ko'pi bilan 3 ta; hech narsa bloklamaydi. */
export function MomentLayer({ moments, dismiss, onHeight, offset = 0 }: { moments: ShownMoment[]; dismiss: (key: number) => void; onHeight?: (h: number) => void; offset?: number }) {
  const reduced = useReducedMotion(); const { width } = useWindowDimensions(); const strong = moments.find((m) => m.strong && m.mine);
  useEffect(() => { if (!moments.length) onHeight?.(0); }, [moments.length, onHeight]);
  if (!moments.length) return null;
  return (
    <>
      {strong && !reduced ? <Flash key={strong.key} edge={TONE[strong.tone].edge} /> : null}
      <View style={[s.wrap, { top: HEADER_H + space.sm + offset, left: width < 520 ? space.sm : space.md, right: width < 520 ? space.sm : space.md }]} pointerEvents="box-none" testID="moments" onLayout={(e) => onHeight?.(Math.round(e.nativeEvent.layout.height) + space.sm + offset)}>
        {moments.map((m) => <MomentView key={m.key} m={m} reduced={reduced} onClose={() => dismiss(m.key)} />)}
      </View>
    </>
  );
}
const s = StyleSheet.create({
  wrap: { position: "absolute", alignItems: "center", gap: space.sm, zIndex: 58 },
  card: { width: "100%", maxWidth: 520, flexDirection: "row", alignItems: "center", gap: space.md, borderRadius: radius.lg, borderWidth: 2, paddingVertical: space.sm, paddingLeft: space.md, paddingRight: space.xs, ...shadow, shadowOpacity: 0.2, shadowRadius: 12 },
  mark: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { fontSize: font.md, fontWeight: "900", letterSpacing: 0.2 }, text: { color: color.navy, fontSize: font.sm, fontWeight: "600", lineHeight: 18 }, note: { color: color.text2, fontSize: font.xs, lineHeight: 16 },
  x: { width: MIN_TAP, height: MIN_TAP, alignItems: "center", justifyContent: "center" }, xT: { color: tone.muted, fontSize: font.lg, fontWeight: "800" },
});
