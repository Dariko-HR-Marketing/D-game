import React from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { LearnArt } from "./LearnArt";
import { Logo } from "./Logo";
import { Button } from "./Button";
import { uz } from "../i18n/uz";
import { color, font, GREEN_TEXT, radius, space } from "../theme";

const L = uz.landing;
const nb = (t: string) => t.replace(/ /g, "\u00a0");
/** Ommaviy bosh sahifa (veb, kirmagan mehmonlar uchun): BITTA ekran, aylantirishsiz (buyurtmachi talabi 2026-11-21). Yorqin, minimalistik: chapda va'da va tugma, o'ngda moliyaviy savodxonlik kollaji (`LearnArt`; telefonda tepada). Faqat tasdiqlangan raqamlar: 2–8 o'yinchi, 48/53 katak, standart chiqish sharti (SPEC 5.4, 5.12). */
export function Landing({ onStart }: { onStart: () => void }) {
  const { width, height } = useWindowDimensions();
  const wide = width >= 860 && height >= 460, tall = height >= 700, tiny = height < 520;
  const artW = wide ? Math.max(0, Math.min((height - 170) / 0.8, width * 0.46, 600)) : Math.min(width - 48, (height * (tall ? 0.34 : 0.27)) / 0.8, 420);
  const showArt = artW >= 170 && !(tiny && !wide);
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
          {!wide && showArt && <LearnArt width={Math.round(artW)} radius={22} />}
          <View style={[s.copy, wide && { flex: 1, alignItems: "flex-start" }]}>
            <View style={s.badge}><Text style={s.badgeT}>{L.badge}</Text></View>
            <Text style={[s.h1, wide && { fontSize: 46, lineHeight: 54, textAlign: "left" }, !wide && !tall && { fontSize: 24, lineHeight: 30 }]} aria-level={1} accessibilityRole="header">{L.h1a} <Text style={s.h1g}>{L.h1b}</Text></Text>
            {(wide || tall) && <Text style={[s.lead, wide && { textAlign: "left", fontSize: font.lg, lineHeight: 26 }]}>{L.lead}</Text>}
            <View style={[s.cta, wide && { width: 280 }]}><Button label={L.start} onPress={onStart} /></View>
            <View style={[s.chips, wide && { justifyContent: "flex-start" }]} role="list">{L.chips.map((t) => <View key={t} style={s.chip} role="listitem"><Text style={s.chipT}>{t}</Text></View>)}</View>
          </View>
          {wide && showArt && <LearnArt width={Math.round(artW)} />}
        </View>
        {height >= 600 && <Text style={s.foot}>{L.footer}</Text>}
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
  foot: { color: color.text2, fontSize: 12, textAlign: "center", paddingTop: space.xs },
});
