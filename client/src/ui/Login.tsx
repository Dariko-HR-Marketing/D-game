import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Linking, useWindowDimensions } from "react-native";
import { Logo } from "./Logo";
import { uz, errText } from "../i18n/uz";
import { AUTH_METHODS } from "../authMethods";
import { font, MIN_TAP, night, radius, space } from "../theme";
import { validCode, validName, validPhone, HttpError, type makeAuth } from "../net/http";

const RESEND_S = 60; // server ham 1 daqiqada bitta SMS ruxsat beradi
const WIDE = 860; // shundan keng ekranda ikki ustun: chapda brend, o'ngda kirish
type Tab = "login" | "register";
type Status = { kind: "info" | "bad"; text: string } | null;
export type LoginDone = { token: string; userId: string };

/** Qorong'i fonda maydon: fokusda yorqin chegara (WCAG 2.4.7), chegara kontrasti ≥ 3:1 (1.4.11). `soon` — hali ishlamaydigan maydon (o'chiq, «Tez orada» belgisi bilan). */
function Field({ label, id, soon, right, ...p }: { label: string; id: string; soon?: boolean; right?: React.ReactNode } & React.ComponentProps<typeof TextInput>) {
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
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable role="checkbox" aria-checked={checked} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={() => onChange(!checked)} style={s.checkRow}>
      <View style={[s.box, checked && s.boxOn]}>{checked && <Text style={s.boxT}>✓</Text>}</View>
      <Text style={[s.note, { flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}

/** Asosiy tugma: prototipdagi yorqin yashil, to'q matn (kontrast ≥ 8:1). */
function Cta({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.cta, disabled && { opacity: 0.45 }, pressed && { opacity: 0.85 }]}>
      <Text style={s.ctaT}>{label}</Text>
    </Pressable>
  );
}

function Ghost({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.ghost, disabled && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}>
      <Text style={s.ghostT}>{label}</Text>
    </Pressable>
  );
}

/**
 * Kirish va ro'yxatdan o'tish (buyurtmachi prototipi `tajriba24_login.html` ko'rinishida). Hozir ishlaydigan usul — SMS bir martalik kod (§7);
 * parol, email va Google `AUTH_METHODS` bayroqlari bilan o'chiq turadi va foydalanuvchiga «tez orada» deb aytiladi. Telefon raqami serverda saqlanmaydi.
 */
export function Login({ auth, onDone, onSignupName }: { auth: ReturnType<typeof makeAuth>; onDone: (s: LoginDone, remember: boolean) => void; onSignupName?: (name: string) => void }) {
  const [tab, setTab] = useState<Tab>("login"); const [step, setStep] = useState<"form" | "code">("form");
  const [ident, setIdent] = useState(""); const [name, setName] = useState(""); const [pass, setPass] = useState(""); const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true); const [terms, setTerms] = useState(false); const [code, setCode] = useState("");
  const { width, height } = useWindowDimensions(); const wide = width >= WIDE, tall = height >= 900; // past telefonda ortiqcha matn yig'iladi: kirish bitta ekranga sig'adi
  const [status, setStatus] = useState<Status>(null); const [busy, setBusy] = useState(false); const [cool, setCool] = useState(0);
  useEffect(() => { if (cool <= 0) return; const h = setTimeout(() => setCool(cool - 1), 1000); return () => clearTimeout(h); }, [cool]);
  const emailTyped = ident.includes("@");
  const phoneOk = validPhone(ident);
  const canSend = !busy && phoneOk && (tab === "login" || (validName(name) && terms));
  const run = async (f: () => Promise<void>) => { setBusy(true); setStatus(null); try { await f(); } catch (e) { setStatus({ kind: "bad", text: errText(e instanceof HttpError ? e.code : "network") }); } finally { setBusy(false); } };
  const send = () => run(async () => { await auth.request(ident); if (tab === "register") onSignupName?.(name.trim()); setStep("code"); setCool(RESEND_S); });
  const verify = () => run(async () => onDone(await auth.verify(ident, code), remember));
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

              {tab === "register" && <Field id="nm" label={uz.login.fullName} value={name} onChangeText={setName} placeholder={uz.login.fullNamePh} maxLength={24} autoComplete="name" textContentType="name" />}
              <Field id="ph" label={uz.login.identifier} value={ident} onChangeText={setIdent} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder={uz.login.identifierPh} autoFocus={wide}
                onSubmitEditing={() => canSend && send()} returnKeyType="send" />
              {emailTyped && !AUTH_METHODS.email && <Text style={s.warn} accessibilityLiveRegion="polite">{uz.login.emailSoon}</Text>}
              <Field id="pw" label={tab === "login" ? uz.login.password : uz.login.passwordNew} soon={!AUTH_METHODS.password} value={pass} onChangeText={setPass} secureTextEntry={!showPass} autoComplete={tab === "login" ? "current-password" : "new-password"}
                placeholder={tab === "login" ? uz.login.passwordPh : uz.login.passwordNewPh}
                right={tab === "login" ? <Pressable accessibilityRole="link" accessibilityLabel={uz.login.forgot} onPress={() => setStatus({ kind: "info", text: uz.login.forgotSoon })} hitSlop={8}><Text style={s.link}>{uz.login.forgot}</Text></Pressable> : undefined} />
              {AUTH_METHODS.password && <Pressable accessibilityRole="button" accessibilityLabel={showPass ? uz.login.hide : uz.login.show} onPress={() => setShowPass(!showPass)} style={s.eye}><Text style={s.eyeT}>{showPass ? uz.login.hide : uz.login.show}</Text></Pressable>}
              {!AUTH_METHODS.password && <Text style={s.note}>{uz.login.passwordSoon}</Text>}

              {tab === "login" && <Check label={uz.login.remember} checked={remember} onChange={setRemember} />}
              {tab === "register" && <Check label={uz.login.terms} checked={terms} onChange={setTerms} />}
              {tab === "register" && !terms && validName(name) && phoneOk && <Text style={s.warn} accessibilityLiveRegion="polite">{uz.login.termsNeed}</Text>}
              <Cta label={busy ? uz.login.wait : tab === "login" ? uz.login.submitLogin : uz.login.submitRegister} disabled={!canSend} onPress={send} />
            </>) : (<>
              <View style={{ gap: space.sm }}>
                <Text style={s.h} aria-level={2} accessibilityRole="header">{uz.login.codeTitle}</Text>
                <Text style={s.note}>{uz.login.sentTo}: {ident}. {uz.login.codeLead}</Text>
              </View>
              <Field id="cd" label={uz.login.code} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoComplete={"one-time-code" as any} textContentType="oneTimeCode" maxLength={6} autoFocus
                onSubmitEditing={() => validCode(code) && !busy && verify()} placeholder="••••••" style={s.codeInput} />
              <Cta label={busy ? uz.login.wait : uz.login.confirm} disabled={busy || !validCode(code)} onPress={verify} />
              <View style={{ flexDirection: "row", gap: space.sm }}>
                <View style={{ flex: 1 }}><Ghost label={cool > 0 ? `${uz.login.resendIn} ${cool} s` : uz.login.resend} disabled={busy || cool > 0} onPress={send} /></View>
                <View style={{ flex: 1 }}><Ghost label={uz.login.back} onPress={() => { setStep("form"); setCode(""); setStatus(null); }} /></View>
              </View>
            </>)}
            {status && <View style={[s.status, status.kind === "bad" ? s.statusBad : s.statusInfo]} accessibilityRole="alert" role="alert"><Text style={[s.statusT, { color: status.kind === "bad" ? "#FCA5A5" : "#93C5FD" }]}>{status.text}</Text></View>}
          </View>
          <View style={s.toggle}>
            {step === "form" && (<View style={s.toggleRow}>
              <Text style={s.note}>{tab === "login" ? uz.login.noAccount : uz.login.haveAccount}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={tab === "login" ? uz.login.toRegister : uz.login.toLogin} onPress={() => switchTab(tab === "login" ? "register" : "login")} hitSlop={8}><Text style={s.link}>{tab === "login" ? uz.login.toRegister : uz.login.toLogin}</Text></Pressable>
            </View>)}
            <Text style={[s.note, { textAlign: "center", fontSize: font.xs }]}>{uz.login.note}</Text>
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
  note: { color: night.muted, fontSize: font.sm, lineHeight: 20 },
  warn: { color: "#FCD34D", fontSize: font.sm, lineHeight: 20 },
  link: { color: night.accent, fontWeight: "700", fontSize: font.sm },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 22 },
  label: { color: night.text, fontWeight: "700", fontSize: font.sm },
  soon: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1, borderColor: night.line }, soonT: { color: night.muted, fontSize: font.xs, fontWeight: "700" },
  input: { minHeight: MIN_TAP + 8, borderWidth: 1, borderColor: night.line, borderRadius: radius.md, paddingHorizontal: space.lg, fontSize: font.md, backgroundColor: night.bg, color: night.text },
  inputOn: { borderColor: night.ring, borderWidth: 2, paddingHorizontal: space.lg - 1 },
  inputOff: { opacity: 0.55, borderStyle: "dashed" },
  codeInput: { letterSpacing: 10, textAlign: "center", fontWeight: "800", fontSize: font.xxl },
  eye: { alignSelf: "flex-end", minHeight: MIN_TAP - 8, justifyContent: "center" }, eyeT: { color: night.accent, fontSize: font.sm, fontWeight: "700" },
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
  toggle: { gap: space.sm, paddingTop: space.md, borderTopWidth: 1, borderTopColor: night.lineSoft },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, minHeight: MIN_TAP - 8 },
});
