import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, useWindowDimensions, Animated, Easing, AccessibilityInfo, Platform } from "react-native";
import { Logo } from "./Logo";
import { Button } from "./Button";
import { money } from "../format";
import { uz } from "../i18n/uz";
import { color, font, GREEN_TEXT, radius, space } from "../theme";

const L = uz.landing;
const nb = (t: string) => t.replace(/ /g, "\u00a0");
/** Ommaviy bosh sahifa (veb, kirmagan mehmonlar uchun): BITTA ekran, aylantirishsiz (buyurtmachi talabi 2026-11-21). Yorqin, minimalistik: chapda va'da va tugma, o'ngda ikki aylana (telefonda tepada). Faqat tasdiqlangan raqamlar: 2–8 o'yinchi, 48/53 katak, standart chiqish sharti (SPEC 5.4, 5.12). */
export function Landing({ onStart }: { onStart: () => void }) {
  const { width, height } = useWindowDimensions();
  const wide = width >= 860 && height >= 460, tall = height >= 700, tiny = height < 520;
  const size = wide ? Math.max(0, Math.min(height - 190, width * 0.42, 540)) : Math.min(width - 64, height * (tall ? 0.34 : 0.26), 320);
  const showOrbit = size >= 150 && !(tiny && !wide);
  return (
    <View style={s.root} testID="landing">
      <View style={[s.blob, { backgroundColor: "#CFF5E3", width: 460, height: 460, right: -140, top: -150 }]} aria-hidden />
      <View style={[s.blob, { backgroundColor: "#FFE9B5", width: 360, height: 360, left: -140, bottom: -130 }]} aria-hidden />
      <View style={[s.inner, wide && { paddingHorizontal: space.xxl }]}>
        <View style={s.nav}>
          <View style={s.brand}><Logo height={tiny ? 42 : 46} /></View>
          <View style={{ flex: 1 }} />
          <View style={{ minWidth: 110 }}><Button label={L.signIn} kind="ghost" onPress={onStart} /></View>
        </View>
        <View style={[s.main, wide && { flexDirection: "row", gap: space.xxl }]}>
          {!wide && showOrbit && <Orbit size={size} />}
          <View style={[s.copy, wide && { flex: 1, alignItems: "flex-start" }]}>
            <View style={s.badge}><Text style={s.badgeT}>{L.badge}</Text></View>
            <Text style={[s.h1, wide && { fontSize: 46, lineHeight: 54, textAlign: "left" }, !wide && !tall && { fontSize: 24, lineHeight: 30 }]} aria-level={1} accessibilityRole="header">{L.h1a} <Text style={s.h1g}>{L.h1b}</Text></Text>
            {(wide || tall) && <Text style={[s.lead, wide && { textAlign: "left", fontSize: font.lg, lineHeight: 26 }]}>{L.lead}</Text>}
            <View style={[s.cta, wide && { width: 280 }]}><Button label={L.start} onPress={onStart} /></View>
            <View style={[s.chips, wide && { justifyContent: "flex-start" }]} role="list">{L.chips.map((t) => <View key={t} style={s.chip} role="listitem"><Text style={s.chipT}>{t}</Text></View>)}</View>
          </View>
          {wide && showOrbit && <Orbit size={size} />}
        </View>
        {height >= 600 && <Text style={s.foot}>{L.footer}</Text>}
      </View>
    </View>);
}

/** Ikki aylana: tashqi 53, ichki 48 katak; fishkalar sekin aylanadi («harakatni kamaytirish» yoqilgan bo'lsa to'xtab turadi). */
function Orbit({ size }: { size: number }) {
  const spin = useRef(new Animated.Value(0)).current; const [still, setStill] = useState(false);
  useEffect(() => { let on = true; AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (on) setStill(!!v); }).catch(() => {}); return () => { on = false; }; }, []);
  useEffect(() => { if (still) return; const a = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 18000, easing: Easing.linear, useNativeDriver: Platform.OS !== "web" })); a.start(); return () => a.stop(); }, [still, spin]);
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }), rev = spin.interpolate({ inputRange: [0, 1], outputRange: ["360deg", "0deg"] });
  const inner = size * 0.7, pawn = Math.max(14, size * 0.07);
  const Ring = ({ d, c, dash, deg, dot }: { d: number; c: string; dash?: boolean; deg: Animated.AnimatedInterpolation<string>; dot: string }) => (
    <Animated.View style={{ position: "absolute", width: d, height: d, borderRadius: d / 2, borderWidth: 3, borderColor: c, borderStyle: dash ? "dashed" : "solid", alignItems: "center", transform: [{ rotate: still ? "0deg" : deg }] }}>
      <View style={{ position: "absolute", top: -(pawn / 2) - 1.5, width: pawn, height: pawn, borderRadius: pawn / 2, backgroundColor: dot, borderWidth: 3, borderColor: color.white }} />
    </Animated.View>);
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} role="img" aria-label={L.orbitLabel} testID="landing-orbit">
      <Ring d={size - pawn} c="#11835A" dash deg={rot} dot="#F2B233" />
      <Ring d={inner} c="#F2B233" deg={rev} dot="#11835A" />
      <View style={s.core}>
        <Text style={s.coreN}>48</Text><Text style={s.coreL}>{L.small.split(" · ")[0]}</Text>
        <Text style={[s.coreN, { color: "#6B4A00", fontSize: font.xl, marginTop: 6 }]}>53</Text><Text style={s.coreL}>{L.big.split(" · ")[0]}</Text>
        {size >= 240 && <Text style={s.coreG}>{L.goalCash.replace("{cash}", nb(money(1_000_000)))}</Text>}
        {size >= 240 && <Text style={s.coreG2}>{L.goalPassive.replace("{passive}", nb(money(25_000)))}</Text>}
      </View>
    </View>);
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7FBF9", overflow: "hidden" }, blob: { position: "absolute", borderRadius: 999, opacity: 0.8 },
  inner: { flex: 1, width: "100%", maxWidth: 1240, alignSelf: "center", paddingHorizontal: space.lg, paddingVertical: space.md },
  nav: { flexDirection: "row", alignItems: "center" }, brand: { flexDirection: "row", alignItems: "center", gap: space.sm }, brandT: { color: color.navy, fontSize: font.lg, fontWeight: "800" },
  main: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md },
  copy: { alignItems: "center", gap: space.md, maxWidth: 620 },
  badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: "#DDF7EA", borderWidth: 1, borderColor: "#A9E6C9" }, badgeT: { color: GREEN_TEXT, fontWeight: "800", fontSize: font.sm, letterSpacing: 0.5 },
  h1: { color: color.navy, fontSize: 30, lineHeight: 36, fontWeight: "800", textAlign: "center" }, h1g: { color: GREEN_TEXT, fontWeight: "800" },
  lead: { color: color.text2, fontSize: font.md, lineHeight: 22, textAlign: "center", maxWidth: 560 },
  cta: { width: "100%", maxWidth: 340 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "center" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: color.white, borderWidth: 1, borderColor: color.line }, chipT: { color: color.navy, fontWeight: "700", fontSize: font.sm },
  core: { alignItems: "center", paddingHorizontal: space.sm, maxWidth: "62%" }, coreN: { color: GREEN_TEXT, fontSize: font.xxl, fontWeight: "800" }, coreL: { color: color.text2, fontSize: font.sm, fontWeight: "700" }, coreG: { color: color.text2, fontSize: 12, textAlign: "center", marginTop: space.sm, fontWeight: "700" }, coreG2: { color: color.text2, fontSize: 12, textAlign: "center", fontWeight: "700" },
  foot: { color: color.text2, fontSize: 12, textAlign: "center", paddingTop: space.xs },
});
