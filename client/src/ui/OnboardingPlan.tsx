import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MODES } from "@tajriba24/rules";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { money } from "../format";
import { uz } from "../i18n/uz";
import { color, font, night, radius, space } from "../theme";

const P = uz.plan;
/** «Onboarding rejasi»: O'quv o'yinida istalgan payt ochiladigan 12 qadamli reja (prototip `Oyin.html`): orqaga / keyingi / o'tkazib yuborish. O'yin voqealariga qarab chiqadigan yo'l-yo'riq (TutorialCoach) alohida ishlaydi. */
export function OnboardingPlan() {
  const [open, setOpen] = useState(false); const [i, setI] = useState(0); const n = P.steps.length, last = i === n - 1; const need = MODES.tutorial;
  const fill = (t: string) => t.replace("{passive}", money(need.exitPassive)).replace("{cash}", money(need.exitCash));
  return (
    <>
      {!open && <Pressable testID="plan-open" accessibilityRole="button" accessibilityLabel={`${P.pill} ${i + 1}/${n}`} onPress={() => setOpen(true)} style={s.pill}><Icon name="book" size={16} color="#fff" /><Text style={s.pillT}>{P.pill} {i + 1}/{n}</Text></Pressable>}
      {open && (
        <View style={s.wrap} role="dialog" aria-label={P.pill} testID="plan-card">
          <View style={s.head}><Text style={s.headL}>{i + 1} / {n}</Text><Pressable accessibilityRole="button" accessibilityLabel={P.close} onPress={() => setOpen(false)} style={s.x}><Text style={s.xT} aria-hidden>✕</Text></Pressable></View>
          <View style={s.prog} aria-hidden><View style={[s.fill, { width: `${Math.round(((i + 1) / n) * 100)}%` }]} /></View>
          <View style={s.body}>
            <Text style={s.h} aria-level={2} accessibilityRole="header">{P.steps[i].t}</Text>
            <Text style={s.p}>{fill(P.steps[i].d)}</Text>
            {P.steps[i].hint ? <View style={s.hint}><Text style={s.hintT}>{P.steps[i].hint}</Text></View> : null}
            <View style={s.foot}>
              <Pressable accessibilityRole="button" onPress={() => { setOpen(false); }} style={s.skip}><Text style={s.skipT}>{P.skip}</Text></Pressable>
              <View style={{ flex: 1 }} />
              {i > 0 && <View style={{ minWidth: 100 }}><Button label={P.back} kind="ghost" onPress={() => setI(i - 1)} /></View>}
              <View style={{ minWidth: 120 }}><Button label={last ? P.done : P.next} onPress={() => { if (last) { setOpen(false); setI(0); } else setI(i + 1); }} /></View>
            </View>
          </View>
        </View>)}
    </>);
}
const s = StyleSheet.create({
  pill: { position: "absolute", left: space.lg, bottom: 84, zIndex: 60, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: night.brand, borderWidth: 1, borderColor: night.line }, pillT: { color: "#fff", fontWeight: "800", fontSize: font.sm },
  wrap: { position: "absolute", left: space.lg, bottom: 84, zIndex: 90, width: 380, maxWidth: "92%", backgroundColor: color.white, borderRadius: radius.lg, overflow: "hidden", shadowColor: "#08263E", shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: night.bg, paddingLeft: space.md }, headL: { color: night.accent, fontSize: 12, fontWeight: "800", letterSpacing: 0.5 }, x: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, xT: { color: night.text, fontSize: font.lg, fontWeight: "800" },
  prog: { height: 6, backgroundColor: "#E7EDF1" }, fill: { height: 6, backgroundColor: color.green }, body: { padding: space.lg, gap: space.sm }, h: { color: color.navy, fontSize: font.xl, fontWeight: "800" }, p: { color: "#4A5B6C", fontSize: font.md, lineHeight: 22 },
  hint: { backgroundColor: "#E7F4EE", borderRadius: radius.md, padding: space.sm }, hintT: { color: "#0E6B4A", fontWeight: "700", fontSize: font.sm },
  foot: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm, flexWrap: "wrap" }, skip: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 }, skipT: { color: "#4A5B6C", fontWeight: "700", textDecorationLine: "underline" },
});
