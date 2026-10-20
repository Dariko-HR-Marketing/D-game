import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, Animated, Easing, StyleSheet } from "react-native";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { money } from "../format";
import { uz } from "../i18n/uz";
import { color, font, MIN_TAP, radius, space, surface, tone } from "../theme";
import { useReducedMotion } from "../motion";

export interface Snap { cash: number; passive: number; flow: number }
/** Serverdan kelgan hisob natijasi: qaysi maydon to'g'ri, nechanchi urinish, 3 urinishdan keyin yechim. */
export interface CalcFeedback { error: string; n: number; detail?: { fields?: Record<keyof Snap, boolean>; tries?: number; solution?: Snap } }
type Key = keyof Snap;
const KEYS: Key[] = ["cash", "passive", "flow"];

const parse = (raw: string): number | null => { const neg = /^[-−]/.test(raw.trim()); const d = raw.replace(/\D/g, ""); if (!d) return null; return (neg ? -1 : 1) * Number(d); };
const show = (raw: string) => { const neg = /^[-−]/.test(raw.trim()); const d = raw.replace(/\D/g, ""); return (neg ? "−" : "") + (d ? money(Number(d)).replace("−", "") : ""); };

/** Hisob daftari holati: uchta maydon, javob belgilari va xabarlar. Maydonlar va tasdiqlash tugmasi alohida joylashtirilishi mumkin (karta varag'ida tugma pastga qotadi). */
export function useLedger(current: Snap, feedback?: CalcFeedback | null) {
  const [raw, setRaw] = useState<Record<Key, string>>({ cash: "", passive: "", flow: "" });
  const [fb, setFb] = useState<CalcFeedback | null>(null); const lastN = useRef(0); const reduced = useReducedMotion(); const shake = useRef(new Animated.Value(0)).current;
  const refs = useRef<Record<Key, TextInput | null>>({ cash: null, passive: null, flow: null });
  const submitRef = useRef<(() => void) | null>(null);
  useEffect(() => { // yangi javob kelganda belgilarni ko'rsatamiz va qizil javobda silkitamiz
    if (!feedback || feedback.n === lastN.current) return; lastN.current = feedback.n; setFb(feedback);
    if (!reduced && feedback.error === "calc_wrong") Animated.sequence([-8, 8, -5, 5, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 55, easing: Easing.linear, useNativeDriver: false })) as any).start();
  }, [feedback, reduced, shake]);
  const vals = { cash: parse(raw.cash), passive: parse(raw.passive), flow: parse(raw.flow) };
  const ready = KEYS.every((k) => vals[k] !== null);
  const neg = (k: Key) => /^[-−]/.test(raw[k].trim());
  const edit = (k: Key, t: string) => { setRaw((r) => ({ ...r, [k]: (/^[-−]/.test(r[k].trim()) && !/^[-−]/.test(t.trim()) ? "−" : "") + t })); if (fb?.detail?.fields) setFb({ ...fb, detail: { ...fb.detail, fields: { ...fb.detail.fields, [k]: undefined as any } } }); };
  const flip = (k: Key) => setRaw((r) => ({ ...r, [k]: /^[-−]/.test(r[k].trim()) ? r[k].replace(/^[-−]\s*/, "") : "−" + r[k].replace(/\D/g, "") }));
  const sol = fb?.detail?.solution; const tries = fb?.detail?.tries ?? 0;
  const label: Record<Key, string> = { cash: uz.ledger.cash, passive: uz.ledger.passive, flow: uz.ledger.flow };
  const values = (): Snap => ({ cash: vals.cash!, passive: vals.passive!, flow: vals.flow! });
  const body = (
    <Animated.View style={{ gap: space.sm, transform: [{ translateX: shake }] }} role="group" aria-label={uz.ledger.decideTitle}>
      {KEYS.map((k, i) => { const state = fb?.detail?.fields?.[k]; const ok = state === true, bad = state === false;
        return (
          <View key={k} style={s.row}>
            <View style={s.lab}><Text style={s.fl} nativeID={`led-${k}`}>{label[k]}</Text><Text style={s.now}>{uz.ledger.now}: <Text style={{ fontWeight: "800", color: color.navy }}>{money(current[k])}</Text></Text></View>
            <View style={[s.inWrap, ok && { borderColor: tone.good, backgroundColor: surface.good }, bad && { borderColor: tone.bad, backgroundColor: surface.bad }]}>
              <TextInput ref={(r) => { refs.current[k] = r; }} testID={`led-${k}`} accessibilityLabelledBy={`led-${k}`} aria-label={`${label[k]} (${uz.ledger.newWord})`} value={show(raw[k])} onChangeText={(t) => edit(k, t)} placeholder={uz.ledger.newWord}
                keyboardType="number-pad" inputMode="numeric" returnKeyType={i === 2 ? "done" : "next"} blurOnSubmit={i === 2} onSubmitEditing={() => (i === 2 ? submitRef.current?.() : refs.current[KEYS[i + 1]]?.focus())} style={s.input} placeholderTextColor="#9AA8B3" />
              <Pressable accessibilityRole="button" accessibilityLabel={`${label[k]}: ${uz.ledger.minus}`} aria-pressed={neg(k)} onPress={() => flip(k)} style={[s.sign, neg(k) && { backgroundColor: surface.bad }]}><Text style={[s.signT, neg(k) && { color: tone.bad }]} aria-hidden>−</Text></Pressable>
              {ok || bad ? <View style={s.mark} aria-hidden><Text style={{ color: ok ? tone.good : tone.bad, fontWeight: "900", fontSize: font.lg }}>{ok ? "✓" : "✗"}</Text></View> : null}
            </View>
          </View>); })}
      {fb?.error === "calc_wrong" && (<View role="alert" style={[s.msg, { backgroundColor: surface.bad }]}><Text style={[s.msgT, { color: tone.bad }]}>{uz.ledger.wrong} {tries > 0 ? `(${tries}-${uz.ledger.attempt})` : ""}</Text></View>)}
      {sol && (
        <View style={[s.msg, { backgroundColor: surface.warn }]} role="status">
          <Text style={[s.msgT, { color: tone.warn }]}>{uz.ledger.solution}: {uz.ledger.cash} {money(sol.cash)} · {uz.ledger.passive} {money(sol.passive)} · {uz.ledger.flow} {money(sol.flow)}</Text>
          <Pressable accessibilityRole="button" onPress={() => setRaw({ cash: String(sol.cash), passive: String(sol.passive), flow: String(sol.flow) })} style={s.useSol}><Text style={s.useSolT}>{uz.ledger.useSolution}</Text></Pressable>
        </View>)}
    </Animated.View>);
  return { body, ready, values, bindSubmit: (f: () => void) => { submitRef.current = f; } };
}

/** Mustaqil panel (kubik tashlashdan oldingi hisob yangilash): sarlavha, maydonlar va tasdiqlash tugmasi. */
export function LedgerPad({ title, hint, current, feedback, submitLabel, onSubmit, busy, testID }: { title: string; hint?: string; current: Snap; feedback?: CalcFeedback | null; submitLabel: string; onSubmit: (c: Snap) => void; busy?: boolean; testID?: string }) {
  const L = useLedger(current, feedback); const go = () => { if (L.ready && !busy) onSubmit(L.values()); }; L.bindSubmit(go);
  return (
    <View style={s.wrap} testID={testID} role="group" aria-label={title}>
      <Text style={s.title} aria-level={3} accessibilityRole="header">{title}</Text>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
      {L.body}
      <Button label={submitLabel} onPress={go} disabled={!L.ready || busy} />
    </View>);
}
const s = StyleSheet.create({
  wrap: { gap: space.md, backgroundColor: "#F7FAFB", borderRadius: radius.lg, borderWidth: 2, borderColor: color.navy, padding: space.md },
  title: { color: color.navy, fontWeight: "800", fontSize: font.lg }, hint: { color: tone.muted, fontSize: font.sm, lineHeight: 19 },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm }, lab: { width: "40%", gap: 1 }, fl: { color: color.navy, fontWeight: "800", fontSize: font.sm, lineHeight: 17 }, now: { color: tone.muted, fontSize: 12, lineHeight: 15 },
  inWrap: { flex: 1, flexDirection: "row", alignItems: "center", minHeight: 48, borderWidth: 2, borderColor: color.line, borderRadius: radius.md, backgroundColor: color.white, paddingLeft: space.sm },
  input: { flex: 1, color: color.navy, fontSize: font.lg, fontWeight: "800", fontVariant: ["tabular-nums"], paddingVertical: 4, minWidth: 0 },
  sign: { width: 40, height: 44, alignItems: "center", justifyContent: "center", borderLeftWidth: 1, borderLeftColor: color.line }, signT: { color: tone.muted, fontSize: font.xl, fontWeight: "900" },
  mark: { width: 32, alignItems: "center", justifyContent: "center" },
  msg: { borderRadius: radius.md, padding: space.sm, gap: space.xs }, msgT: { fontWeight: "800", fontSize: font.sm, lineHeight: 19 },
  useSol: { alignSelf: "flex-start", minHeight: 36, justifyContent: "center", paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: color.white, borderWidth: 1, borderColor: tone.warn }, useSolT: { color: tone.warn, fontWeight: "800", fontSize: font.sm },
});
