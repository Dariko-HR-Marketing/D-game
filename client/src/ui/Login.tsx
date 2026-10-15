import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Image } from "react-native";
import { Button } from "./Button";
import { Banner, Card } from "./kit";
import { Logo } from "./Logo";
import { uz, errText } from "../i18n/uz";
import { color, font, MIN_TAP, radius, space, tone } from "../theme";
import { validCode, validPhone, HttpError, type makeAuth } from "../net/http";

const RESEND_S = 60; // server ham 1 daqiqada bitta SMS ruxsat beradi

/** SMS bir martalik kod bilan kirish (§7). Telefon raqami faqat kod yuborish uchun; serverda saqlanmaydi. */
export function Login({ auth, onDone }: { auth: ReturnType<typeof makeAuth>; onDone: (s: { token: string; userId: string }) => void }) {
  const [phone, setPhone] = useState(""); const [code, setCode] = useState(""); const [step, setStep] = useState<"welcome" | "phone" | "code">("welcome");
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [cool, setCool] = useState(0);
  useEffect(() => { if (cool <= 0) return; const h = setTimeout(() => setCool(cool - 1), 1000); return () => clearTimeout(h); }, [cool]);
  const run = async (f: () => Promise<void>) => { setBusy(true); setErr(null); try { await f(); } catch (e) { setErr(e instanceof HttpError ? e.code : "network"); } finally { setBusy(false); } };
  const send = () => run(async () => { await auth.request(phone); setStep("code"); setCool(RESEND_S); });
  if (step === "welcome") return (
    <ScrollView contentContainerStyle={s.scroll}>
      <View style={[s.wrap, { gap: space.xl }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}><Logo size={34} /><Text style={s.brandT}>{uz.app.name}</Text></View>
        <Image source={require("../../assets/board.webp")} accessibilityLabel={uz.login.boardAlt} resizeMode="contain" style={s.board} />
        <View style={{ gap: 6 }}><Text style={s.h} aria-level={1} accessibilityRole="header">{uz.app.name}</Text><Text style={s.lead}>{uz.login.welcomeLead}</Text></View>
        <Text style={s.note}>{uz.login.welcomeText}</Text>
        <View style={{ gap: space.sm }}><Button label={uz.login.start} onPress={() => setStep("phone")} /><Button label={uz.login.haveAccount} kind="ghost" onPress={() => setStep("phone")} /></View>
        <Text style={[s.note, { textAlign: "center", fontSize: 11 }]}>{uz.login.brandLine}</Text>
      </View>
    </ScrollView>);
  return (
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <View style={s.wrap}>
        <View style={s.brand}><Logo size={72} /><Text style={s.h} aria-level={1} accessibilityRole="header">{uz.login.title}</Text></View>
        <Card>
          {step === "phone" ? (<>
            <Text style={s.label} nativeID="ph">{uz.login.phone}</Text>
            <TextInput accessibilityLabelledBy="ph" aria-label={uz.login.phone} style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="90 123 45 67" placeholderTextColor="#6B7C8C"
              onSubmitEditing={() => validPhone(phone) && !busy && send()} returnKeyType="send" />
            <Text style={s.note}>{uz.login.phoneHint}</Text>
            <Button label={busy ? uz.login.wait : uz.login.send} disabled={busy || !validPhone(phone)} onPress={send} />
          </>) : (<>
            <Banner kind="info">{uz.login.sentTo}: {phone}</Banner>
            <Text style={s.label} nativeID="cd">{uz.login.code}</Text>
            <TextInput accessibilityLabelledBy="cd" aria-label={uz.login.code} style={[s.input, s.codeInput]} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoComplete={"one-time-code" as any} textContentType="oneTimeCode" maxLength={6} autoFocus
              onSubmitEditing={() => validCode(code) && !busy && run(async () => onDone(await auth.verify(phone, code)))} placeholder="••••••" placeholderTextColor="#9AA9B6" />
            <Button label={busy ? uz.login.wait : uz.login.confirm} disabled={busy || !validCode(code)} onPress={() => run(async () => onDone(await auth.verify(phone, code)))} />
            <Button label={cool > 0 ? `${uz.login.resendIn} ${cool} s` : uz.login.resend} kind="ghost" disabled={busy || cool > 0} onPress={send} />
            <Button label={uz.login.back} kind="ghost" onPress={() => { setStep("phone"); setCode(""); setErr(null); }} />
          </>)}
          {err && <Banner kind="bad">{errText(err)}</Banner>}
        </Card>
        <Text style={s.note}>{uz.login.note}</Text>
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  brandT: { fontSize: font.lg, fontWeight: "800", color: color.navy, letterSpacing: 2 }, board: { width: "100%", aspectRatio: 1.5, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E6ECEF", backgroundColor: color.white }, lead: { color: tone.muted, fontSize: font.md, lineHeight: 22 },
  scroll: { flexGrow: 1, justifyContent: "center" }, wrap: { gap: space.lg, padding: space.xl, maxWidth: 440, width: "100%", alignSelf: "center" }, brand: { alignItems: "center", gap: space.sm },
  h: { fontSize: font.xxl, fontWeight: "800", color: color.navy }, label: { color: color.navy, fontWeight: "700", fontSize: font.sm }, note: { color: tone.muted, fontSize: font.sm, lineHeight: 19 },
  input: { minHeight: MIN_TAP + 6, borderWidth: 1, borderColor: color.line, borderRadius: radius.md, paddingHorizontal: space.lg, fontSize: font.xl, backgroundColor: color.white, color: color.navy },
  codeInput: { letterSpacing: 10, textAlign: "center", fontWeight: "800", fontSize: font.xxl },
});
