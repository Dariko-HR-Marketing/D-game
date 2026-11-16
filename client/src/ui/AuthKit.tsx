import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { uz } from "../i18n/uz";
import { font, MIN_TAP, night, radius, space } from "../theme";

export type Status = { kind: "info" | "bad"; text: string } | null;

/** Qorong'i fonda maydon: fokusda yorqin chegara (WCAG 2.4.7), chegara kontrasti ≥ 3:1 (1.4.11). `soon` — hali ishlamaydigan maydon (o'chiq, «Tez orada» belgisi bilan). */
export function Field({ label, id, soon, right, ...p }: { label: string; id: string; soon?: boolean; right?: React.ReactNode } & React.ComponentProps<typeof TextInput>) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: space.xs }}>
      <View style={s.labelRow}>
        <Text style={s.label} nativeID={id}>{label}</Text>
        {soon ? <View style={s.soon}><Text style={s.soonT}>{uz.login.soon}</Text></View> : right}
      </View>
      <TextInput accessibilityLabelledBy={id} aria-label={label} placeholderTextColor={night.placeholder} selectionColor={night.accent} editable={!soon} aria-disabled={soon || undefined}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} {...p}
        style={[s.input, focus && s.inputOn, soon && s.inputOff, p.style]} />
    </View>
  );
}

/** Belgilash katagi: bosish maydoni ≥ 44 px, holat ekran o'qish dasturiga aytiladi. */
export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable role="checkbox" aria-checked={checked} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={() => onChange(!checked)} style={s.checkRow}>
      <View style={[s.box, checked && s.boxOn]}>{checked && <Text style={s.boxT}>✓</Text>}</View>
      <Text style={[s.note, { flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}

/** Asosiy tugma: prototipdagi yorqin yashil, to'q matn (kontrast ≥ 8:1). */
export function Cta({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.cta, disabled && { opacity: 0.45 }, pressed && { opacity: 0.85 }]}>
      <Text style={s.ctaT}>{label}</Text>
    </Pressable>
  );
}

export function Ghost({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.ghost, disabled && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}>
      <Text style={s.ghostT}>{label}</Text>
    </Pressable>
  );
}


/** Holat xabari (xato yoki ma'lumot): ekran o'qish dasturiga darhol aytiladi. */
export function StatusBox({ status }: { status: Status }) {
  if (!status) return null;
  return <View style={[s.status, status.kind === "bad" ? s.statusBad : s.statusInfo]} accessibilityRole="alert" role="alert"><Text style={[s.statusT, { color: status.kind === "bad" ? "#FCA5A5" : "#93C5FD" }]}>{status.text}</Text></View>;
}

export const s = StyleSheet.create({
  note: { color: night.muted, fontSize: font.sm, lineHeight: 20 },
  warn: { color: "#FCD34D", fontSize: font.sm, lineHeight: 20 },
  link: { color: night.accent, fontWeight: "700", fontSize: font.sm },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 22 },
  label: { color: night.text, fontWeight: "700", fontSize: font.sm },
  soon: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1, borderColor: night.line }, soonT: { color: night.muted, fontSize: font.xs, fontWeight: "700" },
  input: { minHeight: MIN_TAP + 8, borderWidth: 1, borderColor: night.line, borderRadius: radius.md, paddingHorizontal: space.lg, fontSize: font.md, backgroundColor: night.bg, color: night.text },
  inputOn: { borderColor: night.ring, borderWidth: 2, paddingHorizontal: space.lg - 1 },
  inputOff: { opacity: 0.55, borderStyle: "dashed" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: MIN_TAP },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: night.line, alignItems: "center", justifyContent: "center", backgroundColor: night.bg },
  boxOn: { backgroundColor: "#11835A", borderColor: "#11835A" }, boxT: { color: "#FFFFFF", fontWeight: "800", fontSize: 14, lineHeight: 16 },
  cta: { minHeight: 54, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: "#10B981", paddingHorizontal: space.lg },
  ctaT: { color: "#04130E", fontWeight: "800", fontSize: font.sm, letterSpacing: 0.8, textTransform: "uppercase" },
  ghost: { minHeight: MIN_TAP, paddingHorizontal: space.md, borderRadius: 10, borderWidth: 1, borderColor: night.line, alignItems: "center", justifyContent: "center" },
  ghostT: { color: night.text, fontWeight: "700", fontSize: font.sm, textAlign: "center" },
  status: { padding: space.md, borderRadius: radius.md, borderWidth: 1 },
  statusInfo: { backgroundColor: "rgba(59,130,246,0.10)", borderColor: "rgba(59,130,246,0.35)" }, statusBad: { backgroundColor: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.40)" },
  statusT: { fontSize: font.sm, fontWeight: "600", textAlign: "center", lineHeight: 20 },
});
