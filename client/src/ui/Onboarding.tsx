import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "./Button";
import { color, font, radius, space, tone } from "../theme";
import { uz } from "../i18n/uz";

const KEY = "poyga-onboarded-v1";
const read = () => { try { return (globalThis as any).localStorage?.getItem(KEY) === "1"; } catch { return false; } };
const write = () => { try { (globalThis as any).localStorage?.setItem(KEY, "1"); } catch { /* maxfiy rejim: har safar ko'rsatiladi */ } };

/** Birinchi o'yinda qisqa yo'riqnoma (3 qadam). Bir marta ko'rsatiladi; «Qoidalar» ekraniga havola bor. */
export function Onboarding({ onRules }: { onRules: () => void }) {
  const [open, setOpen] = useState(() => !read()); const [i, setI] = useState(0); const steps = uz.onboarding.steps; const last = i === steps.length - 1;
  const close = () => { write(); setOpen(false); };
  if (!open) return null;
  return (
    <View style={s.back}>
      <View style={s.wrapper}>
        <View style={s.card} role="dialog" aria-modal aria-label={steps[i].title}>
          <Text style={s.count}>{i + 1} / {steps.length}</Text>
          <Text nativeID="onb-t" style={s.title} aria-level={2} accessibilityRole="header">{steps[i].title}</Text>
          <Text style={s.body}>{steps[i].text}</Text>
          <View style={s.dots} aria-hidden>{steps.map((_, k) => <View key={k} style={[s.dot, k === i && s.dotOn]} />)}</View>
          <Button label={last ? uz.onboarding.done : uz.onboarding.next} onPress={() => (last ? close() : setI(i + 1))} />
          <View style={s.row}>
            {i > 0 && <View style={{ flex: 1 }}><Button label={uz.onboarding.back} kind="ghost" onPress={() => setI(i - 1)} /></View>}
            <View style={{ flex: 1 }}><Button label={uz.onboarding.skip} kind="ghost" onPress={close} /></View>
          </View>
          <Text style={s.link} accessibilityRole="link" onPress={() => { close(); onRules(); }}>{uz.onboarding.rules}</Text>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  back: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 100 }, wrapper: { flex: 1, backgroundColor: "rgba(8,34,56,0.55)", alignItems: "center", justifyContent: "center", padding: space.lg },
  card: { backgroundColor: color.white, borderRadius: radius.lg, padding: space.xl, gap: space.md, maxWidth: 440, width: "100%" },
  count: { color: tone.muted, fontWeight: "800", fontSize: font.sm }, title: { color: color.navy, fontWeight: "800", fontSize: font.xl }, body: { color: color.navy, fontSize: font.lg, lineHeight: 25 },
  dots: { flexDirection: "row", gap: space.xs, justifyContent: "center" }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.line }, dotOn: { backgroundColor: color.navy, width: 22 },
  row: { flexDirection: "row", gap: space.sm }, link: { color: color.navy, textDecorationLine: "underline", textAlign: "center", fontWeight: "700", minHeight: 44, textAlignVertical: "center", paddingTop: 12 },
});
