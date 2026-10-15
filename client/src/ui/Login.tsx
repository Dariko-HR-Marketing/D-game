import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Button } from "./Button";
import { uz, errText } from "../i18n/uz";
import { color, MIN_TAP } from "../theme";
import { validCode, validPhone, HttpError, type makeAuth } from "../net/http";

/** SMS bir martalik kod bilan kirish (§7). Telefon raqami faqat kod yuborish uchun; serverda saqlanmaydi. */
export function Login({ auth, onDone }: { auth: ReturnType<typeof makeAuth>; onDone: (s: { token: string; userId: string }) => void }) {
  const [phone, setPhone] = useState(""); const [code, setCode] = useState(""); const [step, setStep] = useState<"phone" | "code">("phone");
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<void>) => { setBusy(true); setErr(null); try { await f(); } catch (e) { setErr(e instanceof HttpError ? e.code : "network"); } finally { setBusy(false); } };
  return (
    <View style={s.wrap}>
      <Text style={s.h} aria-level={1} accessibilityRole="header">{uz.login.title}</Text>
      {step === "phone" ? (<>
        <Text style={s.label} nativeID="ph">{uz.login.phone}</Text>
        <TextInput accessibilityLabelledBy="ph" aria-label={uz.login.phone} style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="90 123 45 67" />
        <Text style={s.note}>{uz.login.phoneHint}</Text>
        <Button label={busy ? uz.login.wait : uz.login.send} disabled={busy || !validPhone(phone)} onPress={() => run(async () => { await auth.request(phone); setStep("code"); })} />
        <Text style={s.note}>{uz.login.note}</Text>
      </>) : (<>
        <Text style={s.note} accessibilityLiveRegion="polite">{uz.login.sentTo}: {phone}</Text>
        <Text style={s.label} nativeID="cd">{uz.login.code}</Text>
        <TextInput accessibilityLabelledBy="cd" aria-label={uz.login.code} style={s.input} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoComplete="sms-otp" textContentType="oneTimeCode" maxLength={6} />
        <Button label={busy ? uz.login.wait : uz.login.confirm} disabled={busy || !validCode(code)} onPress={() => run(async () => onDone(await auth.verify(phone, code)))} />
        <Button label={uz.login.back} kind="ghost" onPress={() => { setStep("phone"); setCode(""); setErr(null); }} />
      </>)}
      {err && <Text style={s.err} accessibilityRole="alert">{errText(err)}</Text>}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, gap: 12, padding: 24, maxWidth: 420, width: "100%", alignSelf: "center", justifyContent: "center" },
  h: { fontSize: 28, fontWeight: "800", color: color.navy }, label: { color: color.navy, fontWeight: "700" }, note: { color: color.text2 }, err: { color: color.red },
  input: { minHeight: MIN_TAP, borderWidth: 1, borderColor: color.line, borderRadius: 10, paddingHorizontal: 12, fontSize: 18, color: color.navy, backgroundColor: color.white },
});
