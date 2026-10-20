import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import { Icon } from "./Icon";
import { isGood } from "../fx";
import type { Chip } from "../useFx";
import { money } from "../format";
import { uz } from "../i18n/uz";
import { color, font, radius, space, surface, tone } from "../theme";

const LABEL: Record<string, string> = { cash: uz.fx.cash, passive: uz.fx.passive, flow: uz.fx.flow, debt: uz.fx.debt };
const sign = (n: number) => (n > 0 ? "+" : "") + money(n);

function ChipView({ chip, reduced }: { chip: Chip; reduced: boolean }) {
  const good = isGood(chip), asset = chip.kind === "assetAdd" || chip.kind === "assetLost";
  const enter = useRef(new Animated.Value(reduced ? 1 : 0)).current, leave = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    // Yashil (qo'shiladi): tepadan tushib raqamga qo'shiladi. Qizil (ketadi): joyidan yuqoriga uchib, so'nib chiqib ketadi.
    Animated.timing(enter, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.6)), useNativeDriver: false }).start();
    const h = setTimeout(() => Animated.timing(leave, { toValue: 1, duration: Math.max(500, chip.ttl - 1700), easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(), good ? 1500 : 700);
    return () => clearTimeout(h);
  }, [reduced, good, chip.ttl, enter, leave]);
  const tr = reduced ? [] : good
    ? [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }) }, { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }, { translateY: leave.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) }]
    : [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }, { translateY: leave.interpolate({ inputRange: [0, 1], outputRange: [0, -70] }) }, { translateX: leave.interpolate({ inputRange: [0, 1], outputRange: [0, 36] }) }];
  const opacity = reduced ? 1 : Animated.multiply(enter.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }), leave.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }));
  const fg = good ? tone.good : tone.bad, bg = good ? surface.good : surface.bad;
  let main: string, sub: string | undefined, icon: "chevron" | "dollar" | "star" = "dollar";
  if (asset) {
    icon = "star";
    if (chip.count && !chip.code) { main = chip.kind === "assetAdd" ? uz.fx.moreAssets.replace("{n}", String(chip.count)) : uz.fx.lostMany.replace("{n}", String(chip.count)); }
    else main = chip.title ? chip.title.split(/(?<=[.!?])\s/)[0].slice(0, 70) : uz.fx.assetKinds[chip.assetKind ?? ""] ?? uz.fx.assetKinds.other;
    sub = `${chip.kind === "assetAdd" ? uz.fx.added : uz.fx.lost}${chip.income ? ` · ${sign(chip.kind === "assetAdd" ? chip.income : -chip.income)} ${uz.fx.perMonth}` : ""}`;
  } else { main = sign(chip.delta ?? 0); sub = LABEL[chip.kind]; }
  return (
    <Animated.View style={[s.chip, { backgroundColor: bg, borderColor: fg, opacity, transform: tr as any }]} aria-hidden>
      <View style={[s.mark, { backgroundColor: fg }]}>{asset ? <Icon name="star" size={16} color={color.white} /> : <Text style={s.markT}>{good ? "▲" : "▼"}</Text>}</View>
      <View style={{ flexShrink: 1 }}>
        <Text style={[asset ? s.assetMain : s.main, { color: fg }]} numberOfLines={asset ? 2 : 1}>{main}</Text>
        {sub ? <Text style={s.sub} numberOfLines={1}>{sub}</Text> : null}
      </View>
    </Animated.View>);
}
const spoken = (c: Chip) => (c.kind === "assetAdd" || c.kind === "assetLost" ? `${c.kind === "assetAdd" ? uz.fx.added : uz.fx.lost}: ${c.title ?? uz.fx.assetKinds[c.assetKind ?? ""] ?? ""}` : `${LABEL[c.kind]} ${sign(c.delta ?? 0)}`);

/** Moliya o'zgarishlari chiplari: ekranning bir joyida (aylantirishga bog'liq emas), bosishni to'smaydi; ekran o'qigichga jonli xabar sifatida o'qiladi. */
export function FxLayer({ chips, reduced, style }: { chips: Chip[]; reduced: boolean; style?: object }) {
  return (
    <View pointerEvents="none" style={[s.layer, style]} testID="fx-layer">
      <View role="status" accessibilityLiveRegion="polite" style={s.sr}><Text>{chips.length ? `${uz.fx.region}: ${chips.map(spoken).join(", ")}` : ""}</Text></View>
      {chips.map((c) => <ChipView key={c.id} chip={c} reduced={reduced} />)}
    </View>);
}
const s = StyleSheet.create({
  layer: { position: "absolute", zIndex: 70, flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: space.sm },
  sr: { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0 },
  chip: { flexDirection: "row", alignItems: "center", gap: space.sm, maxWidth: "100%", paddingVertical: 4, paddingLeft: 6, paddingRight: space.md, borderRadius: radius.pill, borderWidth: 2, shadowColor: "#082238", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  mark: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" }, markT: { color: color.white, fontSize: 12, fontWeight: "900" },
  main: { fontSize: font.lg, fontWeight: "900", fontVariant: ["tabular-nums"], lineHeight: 22 }, assetMain: { fontSize: font.md, fontWeight: "800", lineHeight: 19 },
  sub: { fontSize: 12, fontWeight: "700", color: tone.muted, lineHeight: 15 },
});
