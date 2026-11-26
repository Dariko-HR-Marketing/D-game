import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Linking, Modal, ScrollView, StyleSheet } from "react-native";
import { Icon } from "./Icon";
import { offer } from "../i18n/uz";
import { color, radius, space, tone } from "../theme";
import type { Http, ConsentInfo } from "../net/http";

const base = (): string => { try { const l = (globalThis as any).location; return l ? l.origin : ""; } catch { return ""; } };
const open = (path: string) => { void Linking.openURL(`${base()}${path}`); };

/** Oferta roziligi oynasi (premium, minimalistik). Foydalanuvchi o'z roziligi bilan shartlarni qabul qiladi; versiya va vaqt serverda yoziladi. */
export function ConsentGate({ http, info, onClose, onDone }: { http: Http; info: ConsentInfo; onClose: () => void; onDone: () => void }) {
  const [agree, setAgree] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState(false);
  const accept = async () => { if (!agree || busy || !info.required) return; setBusy(true); setErr(false); try { await http.consentAccept(info.required); onDone(); } catch { setErr(true); } setBusy(false); };
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}><View style={s.back}><View style={s.box}><ScrollView contentContainerStyle={{ gap: space.lg }} showsVerticalScrollIndicator={false}>
      <View style={s.head}><View style={s.badge} aria-hidden><Icon name="shield" size={26} color="#fff" stroke={1.7} /></View>
        <Text style={s.h} accessibilityRole="header">{offer.title}</Text><Text style={s.n}>{offer.lead}</Text></View>
      <View style={s.list}>{offer.points.map((p) => (<View key={p} style={s.pt}><Text style={s.dot} aria-hidden>✓</Text><Text style={s.ptT}>{p}</Text></View>))}</View>
      <View style={s.links}><Pressable accessibilityRole="link" onPress={() => open(info.links.offer)} style={s.lk}><Text style={s.lkT}>{offer.offerLink}</Text></Pressable><Pressable accessibilityRole="link" onPress={() => open(info.links.privacy)} style={s.lk}><Text style={s.lkT}>{offer.privacyLink}</Text></Pressable></View>
      <Pressable accessibilityRole="checkbox" aria-checked={agree} accessibilityState={{ checked: agree }} onPress={() => setAgree(!agree)} style={s.chk} testID="consent-check">
        <View style={[s.box2, agree && s.box2On]} aria-hidden>{agree && <Text style={s.tick}>✓</Text>}</View><Text style={s.chkT}>{offer.agree}</Text></Pressable>
      {err && <Text style={s.warn} accessibilityLiveRegion="polite">{offer.failed}</Text>}
      <Pressable accessibilityRole="button" disabled={!agree || busy} onPress={accept} style={[s.cta, (!agree || busy) && { opacity: 0.45 }]} testID="consent-accept"><Text style={s.ctaT}>{busy ? offer.saving : offer.accept}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={onClose} style={s.later}><Text style={s.laterT}>{offer.later}</Text></Pressable>
      <Text style={s.ver}>{offer.version}: {info.required}</Text>
    </ScrollView></View></View></Modal>
  );
}
const s = StyleSheet.create({
  back: { flex: 1, backgroundColor: "rgba(8,38,62,0.62)", justifyContent: "center", alignItems: "center", padding: space.md }, box: { backgroundColor: "#fff", borderRadius: 24, padding: space.xl, maxWidth: 460, width: "100%", maxHeight: "94%" },
  head: { alignItems: "center", gap: space.sm }, badge: { width: 56, height: 56, borderRadius: 18, backgroundColor: color.navy, alignItems: "center", justifyContent: "center" },
  h: { fontWeight: "800", fontSize: 22, color: color.navy, textAlign: "center" }, n: { fontSize: 14, color: tone.muted, lineHeight: 20, textAlign: "center" },
  list: { gap: space.sm }, pt: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" }, dot: { color: color.green, fontWeight: "800", width: 16 }, ptT: { flex: 1, color: color.navy, fontSize: 14, lineHeight: 20 },
  links: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "center" }, lk: { minHeight: 44, justifyContent: "center", paddingHorizontal: 6 }, lkT: { color: color.green, fontWeight: "700", fontSize: 14, textDecorationLine: "underline" },
  chk: { flexDirection: "row", gap: space.md, alignItems: "center", minHeight: 48, padding: space.md, borderRadius: 14, borderWidth: 1, borderColor: color.line, backgroundColor: "#FBFCFD" }, box2: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: color.navy, alignItems: "center", justifyContent: "center" }, box2On: { backgroundColor: color.green, borderColor: color.green }, tick: { color: "#fff", fontWeight: "800" }, chkT: { flex: 1, color: color.navy, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  warn: { color: tone.warn, fontSize: 14, textAlign: "center" }, cta: { backgroundColor: color.green, borderRadius: 16, minHeight: 54, alignItems: "center", justifyContent: "center" }, ctaT: { color: "#fff", fontWeight: "800", fontSize: 17 },
  later: { minHeight: 44, alignItems: "center", justifyContent: "center" }, laterT: { color: tone.muted, fontWeight: "700", fontSize: 14 }, ver: { color: tone.muted, fontSize: 12, textAlign: "center" },
});

/** Profil → «Rozilik va maxfiylik»: qabul qilingan versiya, hujjatlar havolasi, rozilikni qaytarib olish. */
export function ConsentCard({ http }: { http: Http }) {
  const [info, setInfo] = useState<ConsentInfo | null>(null); const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const load = () => http.consent().then(setInfo).catch(() => {}); useEffect(() => { void load(); }, [http]); // eslint-disable-line react-hooks/exhaustive-deps
  const withdraw = async () => { setBusy(true); try { await http.consentWithdraw(); setMsg(offer.withdrawn); await load(); } catch { setMsg(offer.failed); } setBusy(false); };
  return (
    <View style={{ gap: space.sm }}>
      <Text style={c.t}>{info?.accepted ? `${offer.acceptedVersion}: ${info.accepted}` : info?.required ? offer.notAccepted : offer.notRequired}</Text>
      <View style={c.row}><Pressable accessibilityRole="link" onPress={() => open(info?.links.offer ?? "/oferta.html")} style={c.lk}><Text style={s.lkT}>{offer.offerLink}</Text></Pressable><Pressable accessibilityRole="link" onPress={() => open(info?.links.privacy ?? "/maxfiylik.html")} style={c.lk}><Text style={s.lkT}>{offer.privacyLink}</Text></Pressable></View>
      {!!info?.accepted && <Pressable accessibilityRole="button" onPress={withdraw} disabled={busy} style={c.b}><Text style={c.bt}>{offer.withdraw}</Text></Pressable>}
      {!!info?.accepted && <Text style={c.t}>{offer.withdrawNote}</Text>}
      {!!msg && <Text style={s.warn} accessibilityLiveRegion="polite">{msg}</Text>}
    </View>
  );
}
const c = StyleSheet.create({ t: { color: tone.muted, fontSize: 13, lineHeight: 18 }, row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm }, lk: { minHeight: 44, justifyContent: "center", paddingRight: 8 }, b: { minHeight: 44, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: color.red, justifyContent: "center", alignSelf: "flex-start" }, bt: { color: color.red, fontWeight: "700", fontSize: 14 } });
