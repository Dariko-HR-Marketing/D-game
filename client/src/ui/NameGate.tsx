import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Logo } from "./Logo";
import { Field, Cta, StatusBox, s as k, type Status } from "./AuthKit";
import { uz, errText } from "../i18n/uz";
import { font, night, PLAYER_COLORS, radius, space } from "../theme";
import { Http, HttpError, isUnder16, validName, validYear } from "../net/http";

/**
 * Birinchi kirishda ism va tug'ilgan yil majburiy: ismsiz xonaga kirib bo'lmaydi (boshqa o'yinchilar sizni shu ism bilan ko'radi).
 * Ro'yxatdan o'tish shaklida ism va yil allaqachon kiritilgan bo'lsa, profil o'zi saqlanadi va bu ekran ko'rinmaydi.
 * Jins bu yerda so'ralmaydi (ixtiyoriy, profilda o'zgartiriladi) — ketma-ket qadamlar kam bo'lsin.
 */
export function NameGate({ http, onDone, initial }: { http: Http; onDone: () => void; initial?: { name: string; year: string } | null }) {
  const [name, setName] = useState((initial?.name ?? "").slice(0, 24)); const [year, setYear] = useState(initial?.year ?? "");
  const [status, setStatus] = useState<Status>(null); const [busy, setBusy] = useState(false);
  const auto = !!initial && validName(initial.name) && validYear(initial.year); const tried = useRef(false); const [autoFailed, setAutoFailed] = useState(false);
  const ok = validName(name) && validYear(year);
  const save = async (n = name, y = year) => {
    if (busy) return; setBusy(true); setStatus(null);
    try { await http.saveProfile({ name: n.trim(), color: Math.abs([...n].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % PLAYER_COLORS.length, birthYear: Number(y) }); onDone(); }
    catch (e) { setStatus({ kind: "bad", text: errText((e as HttpError).code ?? "network") }); setAutoFailed(true); }
    setBusy(false);
  };
  useEffect(() => { if (auto && !tried.current) { tried.current = true; void save(initial!.name, initial!.year); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const preparing = auto && !autoFailed;
  return (
    <ScrollView style={{ backgroundColor: night.bg }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <View style={s.card}>
        <View style={s.logoRow}><Logo height={46} tone="dark" /></View>
        {preparing ? (
          <View style={{ gap: space.sm, paddingVertical: space.lg }} accessibilityLiveRegion="polite"><Text style={s.h} aria-level={1} accessibilityRole="header">{uz.gate.preparing}</Text></View>
        ) : (<>
          <View style={{ gap: space.xs }}>
            <Text style={s.step}>{uz.gate.last}</Text>
            <Text style={s.h} aria-level={1} accessibilityRole="header">{uz.gate.title}</Text>
            <Text style={k.note}>{uz.gate.hint}</Text>
          </View>
          <Field id="gn" testID="gate-name" label={uz.profile.name} value={name} onChangeText={setName} maxLength={24} autoComplete="nickname" placeholder={uz.login.fullNamePh} autoFocus returnKeyType="next" />
          <Field id="gy" testID="gate-year" label={uz.profile.birthYear} value={year} onChangeText={(t) => setYear(t.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" placeholder="1995" maxLength={4} onSubmitEditing={() => ok && save()} />
          {isUnder16(year) ? <Text style={k.warn} accessibilityLiveRegion="polite">{uz.profile.under16}</Text> : <Text style={k.note}>{uz.gate.why}</Text>}
          <StatusBox status={status} />
          <Cta label={busy ? uz.login.wait : uz.gate.next} disabled={!ok || busy} onPress={() => save()} />
        </>)}
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: space.lg, backgroundColor: night.bg },
  card: { width: "100%", maxWidth: 460, gap: space.lg, padding: space.xl, borderRadius: radius.xl + 4, borderWidth: 1, borderColor: night.lineSoft, backgroundColor: night.panel },
  logoRow: { flexDirection: "row", alignItems: "center", gap: space.md }, brand: { color: night.text, fontSize: font.xl, fontWeight: "800", letterSpacing: 0.3 },
  step: { color: night.accent, fontSize: font.xs, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  h: { color: night.text, fontSize: font.xxl - 4, fontWeight: "800", lineHeight: 30 },
});
