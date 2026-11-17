import React from "react";
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { Logo } from "./Logo";
import { Cta, Ghost } from "./AuthKit";
import { money } from "../format";
import { uz } from "../i18n/uz";
import { font, night, radius, space } from "../theme";

const L = uz.landing;
/** Ommaviy bosh sahifa (veb, kirmagan mehmonlar uchun; prototip `Landing.html`). Faqat tasdiqlangan raqamlar: 2–8 o'yinchi va standart chiqish sharti (SPEC 5.12). Namuna raqamlar yo'q. */
export function Landing({ onStart }: { onStart: () => void }) {
  const { width } = useWindowDimensions(); const wide = width >= 860;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: night.bg }} contentContainerStyle={{ alignItems: "center" }}>
      <View style={[s.wrap, wide && { paddingHorizontal: space.xl }]}>
        <View style={s.nav}><View style={s.brand}><Logo size={30} /><Text style={s.brandT}>{uz.app.name}</Text></View><View style={{ flex: 1 }} /><View style={{ minWidth: 120 }}><Ghost label={L.signIn} onPress={onStart} /></View></View>
        <View style={s.hero}>
          <Text style={s.badge}>{L.badge}</Text>
          <Text style={[s.h1, wide && { fontSize: 44, lineHeight: 52 }]} aria-level={1} accessibilityRole="header">{uz.login.welcomeLead}</Text>
          <Text style={s.lead}>{L.lead}</Text>
          <View style={[s.ctaRow, wide && { flexDirection: "row" }]}><View style={wide ? { width: 260 } : undefined}><Cta label={L.start} onPress={onStart} /></View></View>
          <View style={s.trust} role="list">{L.trust.map((t) => <Text key={t} style={s.trustT} role="listitem">✓ {t}</Text>)}</View>
        </View>

        <Section title={L.cardsTitle} sub={L.cardsSub}>
          <View style={[s.grid, wide && { flexDirection: "row" }]}>{L.cards.map((c) => <Tile key={c.t} title={c.t} text={c.d} />)}</View>
        </Section>

        <Section title={L.exitTitle} sub={L.exitSub.replace("{cash}", money(1_000_000)).replace("{passive}", money(25_000))} />

        <Section title={L.stepsTitle}>
          <View style={s.steps} role="list">{L.steps.map((t, i) => (
            <View key={t.t} style={s.step} role="listitem"><View style={s.num} aria-hidden><Text style={s.numT}>{i + 1}</Text></View><View style={{ flex: 1 }}><Text style={s.tileT}>{t.t}</Text><Text style={s.tileD}>{t.d}</Text></View></View>))}</View>
        </Section>

        <Section title={L.pathsTitle}>
          <View style={[s.grid, wide && { flexDirection: "row" }]}>{L.paths.map((c) => <Tile key={c.t} title={c.t} text={c.d} />)}</View>
          <View style={wide ? { width: 300 } : undefined}><Cta label={L.start} onPress={onStart} /></View>
        </Section>
        <Text style={s.foot}>{L.footer}</Text>
      </View>
    </ScrollView>);
}
const Section = ({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) => (
  <View style={s.sec}><Text style={s.h2} aria-level={2} accessibilityRole="header">{title}</Text>{sub ? <Text style={s.lead}>{sub}</Text> : null}{children}</View>);
const Tile = ({ title, text }: { title: string; text: string }) => (<View style={s.tile}><Text style={s.tileT} aria-level={3} accessibilityRole="header">{title}</Text><Text style={s.tileD}>{text}</Text></View>);
const s = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 1080, paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.xl },
  nav: { flexDirection: "row", alignItems: "center", paddingTop: space.md }, brand: { flexDirection: "row", alignItems: "center", gap: space.sm }, brandT: { color: night.text, fontSize: font.lg, fontWeight: "800" },
  hero: { gap: space.md, paddingTop: space.lg }, badge: { color: night.accent, fontWeight: "800", fontSize: font.sm, letterSpacing: 1, textTransform: "uppercase" },
  h1: { color: night.text, fontSize: 30, lineHeight: 38, fontWeight: "800" }, h2: { color: night.text, fontSize: font.xl, fontWeight: "800" }, lead: { color: night.muted, fontSize: font.md, lineHeight: 24, maxWidth: 720 },
  ctaRow: { gap: space.sm }, trust: { gap: space.xs }, trustT: { color: night.muted, fontSize: font.sm, fontWeight: "600" },
  sec: { gap: space.md }, grid: { gap: space.md }, tile: { flex: 1, gap: space.xs, padding: space.lg, borderRadius: radius.lg, backgroundColor: night.panel, borderWidth: 1, borderColor: night.lineSoft },
  tileT: { color: night.text, fontSize: font.md, fontWeight: "800" }, tileD: { color: night.muted, fontSize: font.sm, lineHeight: 21 },
  steps: { gap: space.md }, step: { flexDirection: "row", gap: space.md, alignItems: "flex-start" }, num: { width: 30, height: 30, borderRadius: 15, backgroundColor: night.accent, alignItems: "center", justifyContent: "center" }, numT: { color: night.bg, fontWeight: "800" },
  foot: { color: night.muted, fontSize: font.sm, textAlign: "center" },
});
