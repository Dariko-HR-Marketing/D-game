import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, useWindowDimensions, Animated, Easing, Image, AccessibilityInfo, Platform } from "react-native";
import { Logo } from "./Logo";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { money } from "../format";
import { uz } from "../i18n/uz";
import { color, font, GREEN_TEXT, radius, space } from "../theme";

const L = uz.landing;
const nb = (t: string) => t.replace(/ /g, " ");
const glass: any = Platform.OS === "web" ? { backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } : {};

/** Ommaviy bosh sahifa (veb, kirmagan mehmonlar uchun): BITTA ekran, aylantirishsiz. Premium, minimalistik: chapda va'da va tugma,
 *  o'ngda vizual (suratga joy `public/art/hero.jpg`; surat bo'lmasa brend gradienti) va ustida o'yin mantig'ini ko'rsatadigan shisha kartalar:
 *  Karta → Qaror → Natija va «Kichik aylanadan chiqish» (naqd 1 000 000 va passiv 25 000: SPEC 5.4). Animatsiya «harakatni kamaytirish»da to'xtaydi. */
export function Landing({ onStart }: { onStart: () => void }) {
  const { width, height } = useWindowDimensions();
  const wide = width >= 900 && height >= 520, tall = height >= 720, tiny = height < 560;
  const artW = wide ? Math.round(Math.min(width * 0.44, (height - 190) / 0.82, 640)) : Math.round(Math.min(width - 40, (height * (tall ? 0.36 : 0.3)) / 0.8, 460));
  const showArt = artW >= 220 && !(tiny && !wide);
  return (
    <View style={s.root} testID="landing">
      <View style={[s.blob, { backgroundColor: "#DDF3E8", width: 520, height: 520, right: -180, top: -200 }]} aria-hidden />
      <View style={[s.blob, { backgroundColor: "#FBEFD0", width: 380, height: 380, left: -160, bottom: -170 }]} aria-hidden />
      <View style={[s.inner, wide && { paddingHorizontal: space.xxl }]}>
        <View style={s.nav}>
          <View style={s.brand}><Logo height={tiny ? 40 : 46} /></View>
          <View style={{ flex: 1 }} />
          <View style={{ minWidth: 112 }}><Button label={L.signIn} kind="ghost" onPress={onStart} /></View>
        </View>
        <View style={[s.main, wide && { flexDirection: "row", gap: space.xxxl }]}>
          {!wide && showArt && <Visual width={artW} compact />}
          <View style={[s.copy, wide && { flex: 1, alignItems: "flex-start" }]}>
            {(wide || tall) && <Text style={[s.eyebrow, !wide && { textAlign: "center" }]}>{L.badge}</Text>}
            <Text style={[s.h1, wide && { fontSize: 52, lineHeight: 58, textAlign: "left", letterSpacing: -0.8 }, !wide && !tall && { fontSize: 26, lineHeight: 32 }]} aria-level={1} accessibilityRole="header">{L.h1a} <Text style={s.h1g}>{L.h1b}</Text></Text>
            {(wide || tall) && <Text style={[s.lead, wide && { textAlign: "left", fontSize: font.lg, lineHeight: 27 }]}>{L.lead}</Text>}
            <View style={[s.cta, wide && { width: 300 }]}><Button label={`${L.start}  →`} onPress={onStart} /></View>
            {!wide && <View style={s.chips} role="list">{L.chips.map((t) => <View key={t} style={s.chip} role="listitem"><Text style={s.chipT}>{t}</Text></View>)}</View>}
          </View>
          {wide && showArt && <Visual width={artW} />}
        </View>
        {wide && height >= 700 && <View style={s.feats} role="list">{L.feats.map(([t, d], i) => (
          <View key={t} style={[s.feat, i > 0 && s.featSep]} role="listitem"><View style={s.featIco} aria-hidden><Icon name={(["people", "star", "lock"] as IconName[])[i]} size={22} color={GREEN_TEXT} /></View><View style={{ flex: 1 }}><Text style={s.featT}>{t}</Text><Text style={s.featD}>{d}</Text></View></View>))}</View>}
        {height >= 600 && <Text style={s.foot}>{L.footer}</Text>}
      </View>
    </View>);
}

/** Vizual: surat (bo'lsa) yoki brend gradienti; ustida Karta → Qaror → Natija zanjiri va «Kichik aylanadan chiqish» paneli (animatsiyali). */
export function Visual({ width, compact }: { width: number; compact?: boolean }) {
  const h = Math.round(width * (compact ? 0.8 : 0.82));
  const [photo, setPhoto] = useState(Platform.OS === "web");
  const [still, setStill] = useState(false); const [step, setStep] = useState(0);
  const cash = useRef(new Animated.Value(0)).current, passive = useRef(new Animated.Value(0)).current;
  useEffect(() => { let on = true; AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (on) setStill(!!v); }).catch(() => {}); return () => { on = false; }; }, []);
  useEffect(() => {
    if (still) { cash.setValue(0.72); passive.setValue(0.48); setStep(1); return; }
    const run = (v: Animated.Value, to: number, delay: number) => Animated.loop(Animated.sequence([Animated.timing(v, { toValue: to, duration: 2600, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }), Animated.delay(1800), Animated.timing(v, { toValue: 0, duration: 500, useNativeDriver: false })]));
    const a = run(cash, 0.72, 300), b = run(passive, 0.48, 700); a.start(); b.start();
    const t = setInterval(() => setStep((x) => (x + 1) % 3), 1700);
    return () => { a.stop(); b.stop(); clearInterval(t); };
  }, [still, cash, passive]);
  const pw = (v: Animated.Value) => v.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const pad = compact ? 10 : 18;
  return (
    <View style={[s.vis, { width, height: h }]} testID="landing-visual" role="img" aria-label={L.artLabel}>
      <View style={s.visBg} aria-hidden />
      {photo && Platform.OS === "web" && <Image source={{ uri: "/art/hero.jpg" }} resizeMode="cover" style={StyleSheet.absoluteFill as any} onError={() => setPhoto(false)} />}
      {!photo && <View style={s.ring1} aria-hidden />}{!photo && <View style={s.ring2} aria-hidden />}
      {!photo && <View style={{ position: "absolute", right: width * 0.1, top: h * 0.2, opacity: 0.16 }} aria-hidden><Logo variant="mark" tone="dark" height={Math.round(width * 0.46)} label={false} /></View>}
      {/* Vaziyat belgisi */}
      <View style={[s.glass, s.sit, { left: pad, top: pad }, glass]} aria-hidden><View style={s.sitIco}><Icon name="dice" size={compact ? 15 : 18} color="#fff" /></View><View><Text style={s.sitT}>{L.sitTitle}</Text><Text style={s.sitS}>{L.sitText}</Text></View></View>
      {/* Karta → Qaror → Natija */}
      {!compact && width >= 520 && <View style={[s.glass, s.stepper, { right: pad, top: pad }, glass]} aria-hidden>
        {L.steps.map((t, i) => (<React.Fragment key={t}>{i > 0 && <View style={[s.line, step >= i && { backgroundColor: color.green }]} />}<View style={s.stepItem}><View style={[s.node, step >= i && s.nodeOn]}>{step > i && <Text style={s.nodeTick}>✓</Text>}</View><Text style={[s.stepT, step === i && { color: color.navy, fontWeight: "800" }]}>{t}</Text></View></React.Fragment>))}
      </View>}
      {/* Kichik aylanadan chiqish */}
      <View style={[s.glass, s.panel, { left: pad, right: pad, bottom: pad, padding: compact ? 10 : 16 }, glass]} aria-hidden>
        <View style={{ flex: 1.2, gap: compact ? 8 : 12 }}>
          <Text style={s.panelH}>{L.exitTitle}</Text>
          <View style={{ gap: 4 }}><View style={s.row}><Text style={s.pl}>{L.goalCash.replace("{cash}", nb(money(1_000_000)))}</Text></View><View style={s.track}><Animated.View style={[s.fill, { width: pw(cash) }]} /></View></View>
          <View style={{ gap: 4 }}><View style={s.row}><Text style={s.pl}>{L.goalPassive.replace("{passive}", nb(money(25_000)))}</Text></View><View style={s.track}><Animated.View style={[s.fill, { width: pw(passive), backgroundColor: "#E0A21B" }]} /></View></View>
        </View>
        {!compact && <View style={s.chart}><Text style={s.panelH}>{L.cashflowTitle} <Text style={s.sample}>({L.sample})</Text></Text>{Platform.OS === "web" && <Image source={{ uri: "/art/cashflow.svg" }} style={{ width: "100%", height: 74 }} resizeMode="contain" accessibilityLabel={L.cashflowAlt} />}</View>}
      </View>
    </View>);
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FBFAF7", overflow: "hidden" }, blob: { position: "absolute", borderRadius: 999, opacity: 0.85 },
  inner: { flex: 1, width: "100%", maxWidth: 1280, alignSelf: "center", paddingHorizontal: space.lg, paddingVertical: space.md },
  nav: { flexDirection: "row", alignItems: "center" }, brand: { flexDirection: "row", alignItems: "center", gap: space.sm },
  main: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg },
  copy: { alignItems: "center", gap: space.md, maxWidth: 600 },
  eyebrow: { color: GREEN_TEXT, fontWeight: "800", fontSize: font.sm, letterSpacing: 1.4, textTransform: "uppercase" },
  h1: { color: color.navy, fontSize: 30, lineHeight: 36, fontWeight: "800", textAlign: "center" }, h1g: { color: GREEN_TEXT, fontWeight: "800" },
  lead: { color: color.text2, fontSize: font.md, lineHeight: 22, textAlign: "center", maxWidth: 560 },
  cta: { width: "100%", maxWidth: 340, marginTop: space.xs }, chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "center" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.85)", borderWidth: 1, borderColor: color.line }, chipT: { color: color.navy, fontWeight: "700", fontSize: font.sm },
  feats: { flexDirection: "row", paddingVertical: space.md, borderTopWidth: 1, borderTopColor: "#E6E2D8" },
  feat: { flex: 1, flexDirection: "row", gap: space.md, alignItems: "center", paddingHorizontal: space.lg }, featSep: { borderLeftWidth: 1, borderLeftColor: "#E6E2D8" },
  featIco: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#E4F4EC", alignItems: "center", justifyContent: "center" }, featT: { color: color.navy, fontSize: font.lg, fontWeight: "800" }, featD: { color: color.text2, fontSize: font.sm, lineHeight: 19 },
  foot: { color: color.text2, fontSize: 12, textAlign: "center", paddingTop: space.xs },
  vis: { borderRadius: 32, overflow: "hidden", backgroundColor: "#0B3A2B", ...(Platform.OS === "web" ? ({ boxShadow: "0 30px 60px -24px rgba(8,38,62,0.45)" } as any) : {}) },
  visBg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, ...(Platform.OS === "web" ? ({ backgroundImage: "linear-gradient(135deg,#0B3A2B 0%,#08263E 62%,#0E5A41 100%)" } as any) : { backgroundColor: "#08263E" }) },
  ring1: { position: "absolute", width: "78%", aspectRatio: 1, borderRadius: 999, borderWidth: 2, borderColor: "rgba(255,255,255,0.10)", right: "-18%", top: "-22%" },
  ring2: { position: "absolute", width: "52%", aspectRatio: 1, borderRadius: 999, borderWidth: 2, borderColor: "rgba(242,178,51,0.30)", right: "-4%", top: "-6%" },
  glass: { position: "absolute", backgroundColor: "rgba(255,255,255,0.86)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.7)" },
  sit: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 12 }, sitIco: { width: 30, height: 30, borderRadius: 10, backgroundColor: color.green, alignItems: "center", justifyContent: "center" },
  sitT: { color: color.navy, fontWeight: "800", fontSize: font.sm }, sitS: { color: color.text2, fontSize: 12 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 14 }, stepItem: { alignItems: "center", gap: 4, minWidth: 48 },
  node: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#9FB0BF", backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }, nodeOn: { borderColor: color.green, backgroundColor: "#CFF5E3" }, nodeTick: { color: color.green, fontSize: 11, fontWeight: "900", lineHeight: 13 },
  line: { width: 26, height: 3, borderRadius: 2, backgroundColor: "#D3DCE3", marginBottom: 16 }, stepT: { color: color.text2, fontSize: 12, fontWeight: "700" },
  panel: { flexDirection: "row", gap: space.lg, alignItems: "stretch", borderRadius: 22 }, panelH: { color: color.navy, fontWeight: "800", fontSize: font.sm }, sample: { color: color.text2, fontWeight: "600", fontSize: 12 },
  row: { flexDirection: "row", justifyContent: "space-between" }, pl: { color: color.text2, fontSize: 12, fontWeight: "700" },
  track: { height: 8, borderRadius: 4, backgroundColor: "#DCE5E0", overflow: "hidden" }, fill: { height: 8, borderRadius: 4, backgroundColor: color.green },
  chart: { flex: 1, gap: 2, borderLeftWidth: 1, borderLeftColor: "#E0E6E3", paddingLeft: space.md },
});
