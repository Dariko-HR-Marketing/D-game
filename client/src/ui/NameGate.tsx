import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Button } from "./Button";
import { Banner, Card } from "./kit";
import { Screen } from "./Screen";
import { uz, errText } from "../i18n/uz";
import { color, font, MIN_TAP, PLAYER_COLORS, radius, space, tone } from "../theme";
import { GenderPicker, type Gender } from "./GenderPicker";
import { Http, HttpError, isUnder16, validName, validYear } from "../net/http";

/** Birinchi kirishda ism majburiy: ismsiz xonaga kirib bo'lmaydi (boshqa o'yinchilar sizni shu ism bilan ko'radi). */
export function NameGate({ http, onDone }: { http: Http; onDone: () => void }) {
  const [name, setName] = useState(""); const [year, setYear] = useState(""); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [gender, setGender] = useState<Gender>(null);
  const ok = validName(name) && validYear(year);
  const save = async () => {
    if (!ok || busy) return; setBusy(true); setErr(null);
    try { await http.saveProfile({ name: name.trim(), color: Math.abs([...name].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % PLAYER_COLORS.length, birthYear: Number(year), ...(gender ? { gender } : {}) }); onDone(); }
    catch (e) { setErr((e as HttpError).code ?? "network"); }
    setBusy(false);
  };
  return (
    <Screen title={uz.gate.title} maxWidth={520}>
      <Card style={{ gap: space.md }}>
        <Text style={s.hint}>{uz.gate.hint}</Text>
        <Text style={s.l} nativeID="gn">{uz.profile.name}</Text>
        <TextInput testID="gate-name" accessibilityLabelledBy="gn" aria-label={uz.profile.name} value={name} onChangeText={setName} maxLength={24} style={s.input} autoComplete="nickname" autoFocus />
        <Text style={s.l} nativeID="gy">{uz.profile.birthYear}</Text>
        <TextInput testID="gate-year" accessibilityLabelledBy="gy" aria-label={uz.profile.birthYear} value={year} onChangeText={(t) => setYear(t.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" style={s.input} />
        <GenderPicker value={gender} onChange={setGender} />
        <Text style={s.hint}>{uz.gate.why}</Text>
        {isUnder16(year) && <Banner kind="warn">{uz.profile.under16}</Banner>}
        {err && <Banner kind="bad">{errText(err)}</Banner>}
        <Button label={uz.gate.next} onPress={save} disabled={!ok || busy} />
      </Card>
    </Screen>);
}
const s = StyleSheet.create({
  hint: { color: tone.muted, fontSize: font.sm, lineHeight: 19 }, l: { color: color.navy, fontWeight: "700", fontSize: font.sm },
  input: { minHeight: MIN_TAP, borderWidth: 1, borderColor: color.line, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: font.lg, backgroundColor: color.white, color: color.navy },
});
