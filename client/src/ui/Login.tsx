import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Linking, useWindowDimensions } from "react-native";
import { Logo } from "./Logo";
import { Visual } from "./Landing";
import { markSignupOffer } from "../offerSignup";
import { Field, Check, Cta, Ghost, StatusBox, s as k, type Status } from "./AuthKit";
import { uz, errText } from "../i18n/uz";
import { AUTH_METHODS } from "../authMethods";
import { GOOGLE_CLIENT_ID, loadGis, googleEnabled } from "../googleSignIn";
import { font, MIN_TAP, authUi, radius, space } from "../theme";
import { isUnder16, validCode, validName, validPhone, validEmail, validYear, HttpError, type makeAuth } from "../net/http";

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
  const [emailOn, setEmailOn] = useState(false); useEffect(() => { let off = false; auth.config().then((c) => { if (!off) setEmailOn(!!c.email); }).catch(() => {}); return () => { off = true; }; }, [auth]);
  const emailTyped = ident.includes("@");
  const phoneOk = emailTyped ? emailOn && validEmail(ident) : validPhone(ident); // telefon yoki (server yoqqan bo'lsa) email
  const gLocked = tab === "register" && !terms; // Google orqali ro'yxatdan o'tishdan oldin oferta belgisi shart
  const canSend = !busy && phoneOk && (tab === "login" || (validName(name) && validYear(year) && terms));
  const run = async (f: () => Promise<void>) => { setBusy(true); setStatus(null); try { await f(); } catch (e) { setStatus({ kind: "bad", text: errText(e instanceof HttpError ? e.code : "network") }); } finally { setBusy(false); } };
  const send = () => run(async () => { await (emailTyped ? auth.emailRequest(ident.trim()) : auth.request(ident)); if (tab === "register") { onSignupProfile?.({ name: name.trim(), year }); markSignupOffer(); } setStep("code"); setCool(RESEND_S); });
  const verify = (c = code) => run(async () => onDone(await (emailTyped ? auth.emailVerify(ident.trim(), c) : auth.verify(ident, c)), remember));
  const switchTab = (t: Tab) => { setTab(t); setStatus(null); };
  const [gOn, setGOn] = useState(false); const gRef = useRef<any>(null); const [gKey, setGKey] = useState(0);
  useEffect(() => { let off = false; if (!GOOGLE_CLIENT_ID) return; auth.config().then((c) => { if (!off) setGOn(googleEnabled(c.google)); }).catch(() => {}); return () => { off = true; }; }, [auth]);
  useEffect(() => { // Google tugmasi: rasmiy tugma shu joyga chiziladi. Har chizishda serverdan bir martalik nonce olinadi (replay himoyasi); token + nonce serverga yuboriladi, server tekshiradi
    if (!gOn || !gRef.current) return; let off = false;
    Promise.all([loadGis(), auth.nonce()]).then(([g, nonce]) => { if (off || !gRef.current) return; g.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, nonce, callback: (r: { credential?: string }) => { if (r?.credential) run(async () => { try { if (tab === "register") markSignupOffer(); onDone(await auth.google(r.credential!, nonce), remember); } catch (e) { if (e instanceof HttpError && e.code === "bad_nonce") setGKey((k) => k + 1); throw e; } }); } }); g.accounts.id.renderButton(gRef.current, { theme: "filled_black", size: "large", width: 320, text: tab === "login" ? "signin_with" : "signup_with" }); }).catch(() => setStatus({ kind: "bad", text: uz.login.googleSoon }));
    return () => { off = true; };
  }, [gOn, tab, remember, gKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const google = () => setStatus(AUTH_METHODS.google ? null : { kind: "info", text: uz.login.googleSoon });
  return (
    <ScrollView style={{ backgroundColor: authUi.bg }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
      <View style={[s.shell, wide && s.shellWide]}>
        {/* Chap: brend va va'da */}
        <View style={[s.brandPane, wide ? s.brandWide : s.brandNarrow]}>
          <View aria-hidden pointerEvents="none" style={[s.glow, { top: -90, left: -90 }]} />
          <View aria-hidden pointerEvents="none" style={[s.glow, { bottom: -110, right: -110 }]} />
          <View style={{ gap: wide ? space.xl : space.md }} testID="login-intro">
            <View style={s.logoRow}>
              <View style={{ flexShrink: 1, gap: 4 }}>
                <Logo height={wide ? 56 : 42} tone="light" />
                <Text style={s.brandLabel}>{uz.login.brandLabel}</Text>
              </View>
            </View>
            <View style={s.badge}><View style={s.dot} /><Text style={s.badgeT}>{uz.login.badge}</Text></View>
            <Text style={[s.lead, wide && { fontSize: 32, lineHeight: 40 }]} aria-level={1} accessibilityRole="header">{uz.login.welcomeLead}</Text>
            {wide && <View style={{ alignItems: "center" }}><Visual width={420} /></View>}
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
              {tab === "register" && <OfferCheck checked={terms} onChange={setTerms} />}
              <View style={gLocked ? { opacity: 0.45 } : undefined} pointerEvents={gLocked ? "none" : "auto"} testID="google-wrap" aria-disabled={gLocked}>
              {gOn ? <View ref={gRef} testID="google-gis" style={{ alignItems: "center", minHeight: 44 }} />
              : <Pressable accessibilityRole="button" accessibilityLabel={uz.login.google} disabled={gLocked} onPress={google} style={({ pressed }) => [s.google, pressed && { opacity: 0.85 }]}>
                <View style={s.gBadge} aria-hidden><Text style={s.gT}>G</Text></View><Text style={s.googleT}>{uz.login.google}</Text>
              </Pressable>}
              </View>
              {gLocked && <Text style={k.note}>{uz.login.termsNeedGoogle}</Text>}
              <View style={s.divider} aria-hidden><View style={s.rule} /><Text style={s.dividerT}>{uz.login.or}</Text><View style={s.rule} /></View>

              {tab === "register" && <><Field id="nm" label={uz.login.fullName} value={name} onChangeText={setName} placeholder={uz.login.fullNamePh} maxLength={24} autoComplete="nickname" />{!validName(name) && <Text style={k.note}>{uz.login.nameHint}</Text>}</>}
              <Field id="ph" label={uz.login.identifier} value={ident} onChangeText={(v) => setIdent(/[@A-Za-z]/.test(v) ? v : fmtPhone(v))} keyboardType="default" autoCapitalize="none" autoCorrect={false} autoComplete="username" placeholder={uz.login.identifierPh} autoFocus={wide}
                onSubmitEditing={() => canSend && send()} returnKeyType="send" />
              {tab === "register" && <Field id="yr" label={uz.login.year} value={year} onChangeText={(v) => setYear(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" placeholder="1995" maxLength={4} />}
              {tab === "register" && (isUnder16(year) ? <Text style={k.warn} accessibilityLiveRegion="polite">{uz.profile.under16}</Text> : <Text style={k.note}>{uz.login.yearHint}</Text>)}
              {emailTyped && !emailOn && <Text style={k.warn} accessibilityLiveRegion="polite">{uz.login.emailSoon}</Text>}
              {AUTH_METHODS.password && <Field id="pw" label={tab === "login" ? uz.login.password : uz.login.passwordNew} soon={!AUTH_METHODS.password} value={pass} onChangeText={setPass} secureTextEntry={!showPass} autoComplete={tab === "login" ? "current-password" : "new-password"}
                placeholder={tab === "login" ? uz.login.passwordPh : uz.login.passwordNewPh}
                right={tab === "login" ? <Pressable accessibilityRole="link" accessibilityLabel={uz.login.forgot} onPress={() => setStatus({ kind: "info", text: uz.login.forgotSoon })} hitSlop={8}><Text style={k.link}>{uz.login.forgot}</Text></Pressable> : undefined} />}
              {AUTH_METHODS.password && <Pressable accessibilityRole="button" accessibilityLabel={showPass ? uz.login.hide : uz.login.show} onPress={() => setShowPass(!showPass)} style={s.eye}><Text style={s.eyeT}>{showPass ? uz.login.hide : uz.login.show}</Text></Pressable>}

              {tab === "login" && <Check label={uz.login.remember} checked={remember} onChange={setRemember} />}
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
  scroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: space.lg, backgroundColor: authUi.bg },
  shell: { width: "100%", maxWidth: 460, borderRadius: radius.xl + 4, overflow: "hidden", borderWidth: 1, borderColor: authUi.lineSoft, backgroundColor: authUi.panel },
  shellWide: { maxWidth: 960, flexDirection: "row" },
  brandPane: { overflow: "hidden", justifyContent: "space-between", backgroundColor: authUi.brand },
  brandWide: { flex: 1, padding: space.xxxl - 8, minHeight: 560, gap: space.lg, borderRightWidth: 1, borderRightColor: authUi.lineSoft },
  brandNarrow: { padding: space.lg, borderBottomWidth: 1, borderBottomColor: authUi.lineSoft },
  glow: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: authUi.glow },
  logoRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  brandName: { color: authUi.text, fontSize: font.xl, fontWeight: "800", letterSpacing: 0.3 },
  brandLabel: { color: authUi.accent, fontSize: font.xs, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  badge: { flexDirection: "row", alignItems: "center", gap: space.sm, alignSelf: "flex-start", paddingHorizontal: space.md, paddingVertical: space.xs + 2, borderRadius: radius.pill, borderWidth: 1, borderColor: authUi.accent },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: authUi.accent }, badgeT: { color: authUi.accent, fontSize: font.xs, fontWeight: "700" },
  lead: { color: authUi.text, fontSize: font.xl, lineHeight: 26, fontWeight: "800" },
  body: { color: authUi.muted, fontSize: font.md, lineHeight: 22 },
  benefit: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  tick: { width: 24, height: 24, borderRadius: radius.sm, borderWidth: 1, borderColor: authUi.accent, alignItems: "center", justifyContent: "center" }, tickT: { color: authUi.accent, fontWeight: "800", fontSize: font.sm },
  free: { color: authUi.text, fontSize: font.sm, lineHeight: 20, fontWeight: "700" },
  brandFoot: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: space.sm, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: authUi.lineSoft },
  foot: { color: authUi.muted, fontSize: font.xs }, footLink: { color: authUi.accent, fontWeight: "700", textDecorationLine: "underline" },
  formPane: { justifyContent: "space-between", gap: space.lg, backgroundColor: authUi.panel },
  formWide: { flex: 1, padding: space.xxxl - 8 },
  formNarrow: { padding: space.lg },
  tabs: { flexDirection: "row", padding: 6, gap: 6, borderRadius: radius.lg, backgroundColor: authUi.bg, borderWidth: 1, borderColor: authUi.lineSoft },
  tab: { flex: 1, minHeight: MIN_TAP - 4, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  tabOn: { backgroundColor: "#11835A" }, tabT: { color: authUi.muted, fontWeight: "700", fontSize: font.sm },
  google: { minHeight: MIN_TAP + 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: authUi.line, backgroundColor: "#FFFFFF", paddingHorizontal: space.lg },
  gBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: authUi.lineSoft, alignItems: "center", justifyContent: "center" }, gT: { color: "#4285F4", fontWeight: "800", fontSize: 14, lineHeight: 18 },
  googleT: { color: authUi.text, fontWeight: "700", fontSize: font.sm },
  divider: { flexDirection: "row", alignItems: "center", gap: space.md }, rule: { flex: 1, height: 1, backgroundColor: authUi.lineSoft },
  dividerT: { color: authUi.muted, fontSize: font.xs, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  h: { color: authUi.text, fontSize: font.xl, fontWeight: "800" },
  codeInput: { letterSpacing: 10, textAlign: "center", fontWeight: "800", fontSize: font.xxl },
  eye: { alignSelf: "flex-end", minHeight: MIN_TAP - 8, justifyContent: "center" }, eyeT: { color: authUi.accent, fontSize: font.sm, fontWeight: "700" },
    ghostT: { color: authUi.text, fontWeight: "700", fontSize: font.sm, textAlign: "center" },
  toggle: { gap: space.sm, paddingTop: space.md, borderTopWidth: 1, borderTopColor: authUi.lineSoft },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, minHeight: MIN_TAP - 8 },
});

/** Ro'yxatdan o'tishdagi majburiy rozilik: oferta va maxfiylik siyosati havolalari (yangi oynada ochiladi); katak va havolalar alohida bosiladi. */
function OfferCheck({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const open = (path: string) => { try { void Linking.openURL(path); } catch { /* ochilmadi */ } };
  const L = uz.login;
  return (
    <View style={k.checkRow} testID="offer-check">
      <Pressable role="checkbox" aria-checked={checked} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={L.terms} onPress={() => onChange(!checked)} hitSlop={8}>
        <View style={[k.box, checked && k.boxOn]}>{checked && <Text style={k.boxT}>✓</Text>}</View>
      </Pressable>
      <Text style={[k.note, { flex: 1 }]}>{L.termsA}{" "}
        <Text accessibilityRole="link" style={k.link} onPress={() => open("/oferta.html")} testID="offer-link">{L.termsOffer}</Text>{" "}{L.termsAnd}{" "}
        <Text accessibilityRole="link" style={k.link} onPress={() => open("/maxfiylik.html")} testID="privacy-link">{L.termsPrivacy}</Text>{" "}{L.termsTail}</Text>
    </View>
  );
}
