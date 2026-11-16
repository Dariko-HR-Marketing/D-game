import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Linking, useWindowDimensions } from "react-native";
import { Logo } from "./Logo";
import { Field, Check, Cta, Ghost, StatusBox, s as k, type Status } from "./AuthKit";
import { uz, errText } from "../i18n/uz";
import { AUTH_METHODS } from "../authMethods";
import { font, MIN_TAP, night, radius, space } from "../theme";
import { isUnder16, validCode, validName, validPhone, validYear, HttpError, type makeAuth } from "../net/http";

/** O'zbekiston raqamini yozish paytida chiroyli ko'rsatadi: 90 123 45 67 / +998 90 123 45 67. Boshqa davlat raqamlariga tegmaydi. */
function fmtPhone(v: string): string {
  const raw = v.trim(); if (raw.startsWith("+") && !raw.startsWith("+998") && raw.length > 4) return raw;
  const d = raw.replace(/\D/g, ""); const uz998 = d.startsWith("998");
  if (!uz998 && d.length > 9) return raw; // 9 raqamdan uzun va +998 emas: chet el raqami
  const rest = uz998 ? d.slice(3, 12) : d.slice(0, 9); const g = [rest.slice(0, 2), rest.slice(2, 5), rest.slice(5, 7), rest.slice(7, 9)].filter(Boolean).join(" ");
  return uz998 ? `+998${g ? " " + g : ""}` : g;
}
const RESEND_S = 60; // server ham 1 daqiqada bitta SMS ruxsat beradi
const WIDE = 860; // shundan keng ekranda ikki ustun: chapda brend, o'ngda kirish
type Tab = "login" | "register";
export type LoginDone = { token: string; userId: string };

/**
 * Kirish va ro'yxatdan o'tish (buyurtmachi prototipi `tajriba24_login.html` ko'rinishida). Hozir ishlaydigan usul — SMS bir martalik kod (§7);
 * parol, email va Google `AUTH_METHODS` bayroqlari bilan o'chiq turadi va foydalanuvchiga «tez orada» deb aytiladi. Telefon raqami serverda saqlanmaydi.
 */
export function Login({ auth, onDone, onSignupProfile }: { auth: ReturnType<typeof makeAuth>; onDone: (s: LoginDone, remember: boolean) => void; onSignupProfile?: (p: { name: string; year: string }) => void }) {
  const [tab, setTab] = useState<Tab>("login"); const [step, setStep] = useState<"form" | "code">("form");
  const [ident, setIdent] = useState(""); const [name, setName] = useState(""); const [year, setYear] = useState(""); const [pass, setPass] = useState(""); const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true); const [terms, setTerms] = useState(false); const [code, setCode] = useState("");
  const { width, height } = useWindowDimensions(); const wide = width >= WIDE, tall = height >= 900; // past telefonda ortiqcha matn yig'iladi: kirish bitta ekranga sig'adi
  const [status, setStatus] = useState<Status>(null); const [busy, setBusy] = useState(false); const [cool, setCool] = useState(0);
  useEffect(() => { if (cool <= 0) return; const h = setTimeout(() => setCool(cool - 1), 1000); return () => clearTimeout(h); }, [cool]);
  const emailTyped = ident.includes("@");
  const phoneOk = validPhone(ident);
  const canSend = !busy && phoneOk && (tab === "login" || (validName(name) && validYear(year) && terms));
  const run = async (f: () => Promise<void>) => { setBusy(true); setStatus(null); try { await f(); } catch (e) { setStatus({ kind: "bad", text: errText(e instanceof HttpError ? e.code : "network") }); } finally { setBusy(false); } };
  const send = () => run(async () => { await auth.request(ident); if (tab === "register") onSignupProfile?.({ name: name.trim(), year }); setStep("code"); setCool(RESEND_S); });
  const verify = (c = code) => run(async () => onDone(await auth.verify(ident, c), remember));
  const switchTab = (t: Tab) => { setTab(t); setStatus(null); };
  const google = () => setStatus(AUTH_METHODS.google ? null : { kind: "info", text: uz.login.googleSoon });
  return (
    <ScrollView style={{ backgroundColor: night.bg }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
      <View style={[s.shell, wide && s.shellWide]}>
        {/* Chap: brend va va'da */}
        <View style={[s.brandPane, wide ? s.brandWide : s.brandNarrow]}>
          <View aria-hidden pointerEvents="none" style={[s.glow, { top: -90, left: -90 }]} />
          <View aria-hidden pointerEvents="none" style={[s.glow, { bottom: -110, right: -110 }]} />
          <View style={{ gap: wide ? space.xl : space.md }} testID="login-intro">
            <View style={s.logoRow}>
              <Logo size={wide ? 48 : 36} />
              <View style={{ flexShrink: 1 }}>
                <Text style={[s.brandName, wide && { fontSize: 26 }]}>Tajriba<Text style={{ color: night.accent, fontWeight: "800" }}> 24</Text></Text>
                <Text style={s.brandLabel}>{uz.login.brandLabel}</Text>
              </View>
            </View>
            <View style={s.badge}><View style={s.dot} /><Text style={s.badgeT}>{uz.login.badge}</Text></View>
            <Text style={[s.lead, wide && { fontSize: 32, lineHeight: 40 }]} aria-level={1} accessibilityRole="header">{uz.login.welcomeLead}</Text>
            {(wide || tall) && <Text style={s.body}>{uz.login.introWhat}</Text>}
            {wide && (<View style={{ gap: space.md }} role="list">
              {uz.login.benefits.map((t, i) => (
                <View key={i} style={s.benefit} role="listitem"><View style={s.tick} aria-hidden><Text style={s.tickT}>✓</Text></View><Text style={[s.body, { flex: 1 }]}>{t}</Text></View>))}
            </View>)}
            {wide && <Text style={s.free}>{uz.login.introFree}</Text>}
          </View>
          {wide && <View style={s.brandFoot}>
            <Pressable accessibilityRole="link" accessibilityLabel={`${uz.login.siteLabel} ${uz.login.site}`} onPress={() => void Linking.openURL("https://tajriba24.uz")}><Text style={s.foot}>{uz.login.siteLabel} <Text style={s.footLink}>{uz.login.site}</Text></Text></Pressable>
            <Text style={s.foot}>{uz.login.brandLine}</Text>
          </View>}
        </View>

        {/* O'ng: kirish / ro'yxatdan o'tish */}
        <View style={[s.formPane, wide ? s.formWide : s.formNarrow]} role="form" aria-label={uz.login.tabLogin}>
          <View style={{ gap: space.md }}>
            {step === "form" ? (<>
              <View role="tablist" aria-label={uz.login.tabs} style={s.tabs}>
                {([["login", uz.login.tabLogin], ["register", uz.login.tabRegister]] as [Tab, string][]).map(([k, l]) => (
                  <Pressable key={k} role="tab" accessibilityRole="tab" aria-selected={tab === k} accessibilityState={{ selected: tab === k }} onPress={() => switchTab(k)} style={[s.tab, tab === k && s.tabOn]}>
                    <Text style={[s.tabT, tab === k && { color: "#FFFFFF" }]}>{l}</Text></Pressable>))}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={uz.login.google} onPress={google} style={({ pressed }) => [s.google, pressed && { opacity: 0.85 }]}>
                <View style={s.gBadge} aria-hidden><Text style={s.gT}>G</Text></View><Text style={s.googleT}>{uz.login.google}</Text>
              </Pressable>
              <View style={s.divider} aria-hidden><View style={s.rule} /><Text style={s.dividerT}>{uz.login.or}</Text><View style={s.rule} /></View>

              {tab === "register" && <><Field id="nm" label={uz.login.fullName} value={name} onChangeText={setName} placeholder={uz.login.fullNamePh} maxLength={24} autoComplete="nickname" />{!validName(name) && <Text style={k.note}>{uz.login.nameHint}</Text>}</>}
              <Field id="ph" label={uz.login.identifier} value={ident} onChangeText={(v) => setIdent(fmtPhone(v))} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder={uz.login.identifierPh} autoFocus={wide}
                onSubmitEditing={() => canSend && send()} returnKeyType="send" />
              {tab === "register" && <Field id="yr" label={uz.login.year} value={year} onChangeText={(v) => setYear(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" placeholder="1995" maxLength={4} />}
              {tab === "register" && (isUnder16(year) ? <Text style={k.warn} accessibilityLiveRegion="polite">{uz.profile.under16}</Text> : <Text style={k.note}>{uz.login.yearHint}</Text>)}
              {emailTyped && !AUTH_METHODS.email && <Text style={k.warn} accessibilityLiveRegion="polite">{uz.login.emailSoon}</Text>}
              {(tab === "login" || AUTH_METHODS.password) && <Field id="pw" label={tab === "login" ? uz.login.password : uz.login.passwordNew} soon={!AUTH_METHODS.password} value={pass} onChangeText={setPass} secureTextEntry={!showPass} autoComplete={tab === "login" ? "current-password" : "new-password"}
                placeholder={tab === "login" ? uz.login.passwordPh : uz.login.passwordNewPh}
                right={tab === "login" ? <Pressable accessibilityRole="link" accessibilityLabel={uz.login.forgot} onPress={() => setStatus({ kind: "info", text: uz.login.forgotSoon })} hitSlop={8}><Text style={k.link}>{uz.login.forgot}</Text></Pressable> : undefined} />}
              {AUTH_METHODS.password && <Pressable accessibilityRole="button" accessibilityLabel={showPass ? uz.login.hide : uz.login.show} onPress={() => setShowPass(!showPass)} style={s.eye}><Text style={s.eyeT}>{showPass ? uz.login.hide : uz.login.show}</Text></Pressable>}
              {tab === "login" && !AUTH_METHODS.password && <Text style={k.note}>{uz.login.passwordSoon}</Text>}

              {tab === "login" && <Check label={uz.login.remember} checked={remember} onChange={setRemember} />}
              {tab === "register" && <Check label={uz.login.terms} checked={terms} onChange={setTerms} />}
              {tab === "register" && !terms && validName(name) && phoneOk && validYear(year) && <Text style={k.warn} accessibilityLiveRegion="polite">{uz.login.termsNeed}</Text>}
              <Cta label={busy ? uz.login.wait : tab === "login" ? uz.login.submitLogin : uz.login.submitRegister} disabled={!canSend} onPress={send} />
            </>) : (<>
              <View style={{ gap: space.sm }}>
                <Text style={s.h} aria-level={2} accessibilityRole="header">{uz.login.codeTitle}</Text>
                <Text style={k.note}>{uz.login.sentTo}: {ident}. {uz.login.codeLead}</Text>
              </View>
              <Field id="cd" label={uz.login.code} value={code} onChangeText={(v) => { const c = v.replace(/\D/g, "").slice(0, 6); setCode(c); if (c.length === 6 && !busy) void verify(c); }} keyboardType="number-pad" autoComplete={"one-time-code" as any} textContentType="oneTimeCode" maxLength={6} autoFocus
                onSubmitEditing={() => validCode(code) && !busy && verify()} placeholder="••••••" style={s.codeInput} />
              <Cta label={busy ? uz.login.wait : uz.login.confirm} disabled={busy || !validCode(code)} onPress={() => verify()} />
              <View style={{ flexDirection: "row", gap: space.sm }}>
                <View style={{ flex: 1 }}><Ghost label={cool > 0 ? `${uz.login.resendIn} ${cool} s` : uz.login.resend} disabled={busy || cool > 0} onPress={send} /></View>
                <View style={{ flex: 1 }}><Ghost label={uz.login.back} onPress={() => { setStep("form"); setCode(""); setStatus(null); }} /></View>
              </View>
            </>)}
            <StatusBox status={status} />
          </View>
          <View style={s.toggle}>
            {step === "form" && (<View style={s.toggleRow}>
              <Text style={k.note}>{tab === "login" ? uz.login.noAccount : uz.login.haveAccount}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={tab === "login" ? uz.login.toRegister : uz.login.toLogin} onPress={() => switchTab(tab === "login" ? "register" : "login")} hitSlop={8}><Text style={k.link}>{tab === "login" ? uz.login.toRegister : uz.login.toLogin}</Text></Pressable>
            </View>)}
            <Text style={[k.note, { textAlign: "center", fontSize: font.xs }]}>{uz.login.note}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: space.lg, backgroundColor: night.bg },
  shell: { width: "100%", maxWidth: 460, borderRadius: radius.xl + 4, overflow: "hidden", borderWidth: 1, borderColor: night.lineSoft, backgroundColor: night.panel },
  shellWide: { maxWidth: 960, flexDirection: "row" },
  brandPane: { overflow: "hidden", justifyContent: "space-between", backgroundColor: night.brand },
  brandWide: { flex: 1, padding: space.xxxl - 8, minHeight: 600, gap: space.xl, borderRightWidth: 1, borderRightColor: night.lineSoft },
  brandNarrow: { padding: space.lg, borderBottomWidth: 1, borderBottomColor: night.lineSoft },
  glow: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: night.glow },
  logoRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  brandName: { color: night.text, fontSize: font.xl, fontWeight: "800", letterSpacing: 0.3 },
  brandLabel: { color: night.accent, fontSize: font.xs, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  badge: { flexDirection: "row", alignItems: "center", gap: space.sm, alignSelf: "flex-start", paddingHorizontal: space.md, paddingVertical: space.xs + 2, borderRadius: radius.pill, borderWidth: 1, borderColor: night.accent },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: night.accent }, badgeT: { color: night.accent, fontSize: font.xs, fontWeight: "700" },
  lead: { color: night.text, fontSize: font.xl, lineHeight: 26, fontWeight: "800" },
  body: { color: night.muted, fontSize: font.md, lineHeight: 22 },
  benefit: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  tick: { width: 24, height: 24, borderRadius: radius.sm, borderWidth: 1, borderColor: night.accent, alignItems: "center", justifyContent: "center" }, tickT: { color: night.accent, fontWeight: "800", fontSize: font.sm },
  free: { color: night.text, fontSize: font.sm, lineHeight: 20, fontWeight: "700" },
  brandFoot: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: space.sm, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: night.lineSoft },
  foot: { color: night.muted, fontSize: font.xs }, footLink: { color: night.accent, fontWeight: "700", textDecorationLine: "underline" },
  formPane: { justifyContent: "space-between", gap: space.lg, backgroundColor: night.panel },
  formWide: { flex: 1, padding: space.xxxl - 8 },
  formNarrow: { padding: space.lg },
  tabs: { flexDirection: "row", padding: 6, gap: 6, borderRadius: radius.lg, backgroundColor: night.bg, borderWidth: 1, borderColor: night.lineSoft },
  tab: { flex: 1, minHeight: MIN_TAP - 4, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  tabOn: { backgroundColor: "#11835A" }, tabT: { color: night.muted, fontWeight: "700", fontSize: font.sm },
  google: { minHeight: MIN_TAP + 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: night.line, backgroundColor: "#16242F", paddingHorizontal: space.lg },
  gBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: night.text, alignItems: "center", justifyContent: "center" }, gT: { color: "#4285F4", fontWeight: "800", fontSize: 14, lineHeight: 18 },
  googleT: { color: night.text, fontWeight: "700", fontSize: font.sm },
  divider: { flexDirection: "row", alignItems: "center", gap: space.md }, rule: { flex: 1, height: 1, backgroundColor: night.lineSoft },
  dividerT: { color: night.muted, fontSize: font.xs, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  h: { color: night.text, fontSize: font.xl, fontWeight: "800" },
  codeInput: { letterSpacing: 10, textAlign: "center", fontWeight: "800", fontSize: font.xxl },
  eye: { alignSelf: "flex-end", minHeight: MIN_TAP - 8, justifyContent: "center" }, eyeT: { color: night.accent, fontSize: font.sm, fontWeight: "700" },
  ctaT: { color: "#04130E", fontWeight: "800", fontSize: font.sm, letterSpacing: 0.8, textTransform: "uppercase" },
  ghostT: { color: night.text, fontWeight: "700", fontSize: font.sm, textAlign: "center" },
  toggle: { gap: space.sm, paddingTop: space.md, borderTopWidth: 1, borderTopColor: night.lineSoft },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, minHeight: MIN_TAP - 8 },
});
