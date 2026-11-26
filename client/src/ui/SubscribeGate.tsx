import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Linking, Modal, ScrollView, StyleSheet } from "react-native";
import { sub } from "../i18n/uz";
import { radius, space } from "../theme";
import { loadGis } from "../googleSignIn";
import type { Http, GateStatus } from "../net/http";

const GOOGLE_CLIENT_ID: string = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const open = (u?: string) => { if (u) void Linking.openURL(u); };
/** Google ruxsati (faqat veb): youtube.readonly — obunani tekshirish uchun; token serverga bir martaga yuboriladi. */
async function googleToken(): Promise<string> {
  if (GOOGLE_CLIENT_ID) await loadGis().catch(() => {});
  return new Promise((res, rej) => {
    const g = (globalThis as any).google; if (!g?.accounts?.oauth2 || !GOOGLE_CLIENT_ID) return rej(new Error("web_only"));
    g.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: "https://www.googleapis.com/auth/youtube.readonly", callback: (r: any) => r?.access_token ? res(r.access_token) : rej(new Error("denied")) }).requestAccessToken();
  });
}
const NAMES: Record<string, string> = { telegram: sub.telegram, instagram: sub.instagram, youtube: sub.youtube };

/** Obuna darvozasi. Hamma obuna Telegram botda, bitta joyda: bu oyna faqat botga olib boradi va holatni o'zi kuzatadi (har 3 soniyada). */
export function SubscribeGate({ http, onClose, onDone }: { http: Http; onClose: () => void; onDone: () => void }) {
  const [st, setSt] = useState<GateStatus | null>(null); const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => { try { const s = await http.gate(); setSt(s); if (!s.missing.length) onDone(); return s; } catch { return null; } }, [http, onDone]);
  useEffect(() => { void refresh(); const t = setInterval(() => void refresh(), 3000); return () => clearInterval(t); }, [refresh]);
  const tg = st?.platforms.find((p) => p.id === "telegram"), yt = st?.platforms.find((p) => p.id === "youtube");
  const openBot = async () => { setMsg(null); try { const r = await http.gateStart("telegram"); open(r.url); } catch { setMsg(sub.unavailable); } };
  const checkNow = async () => {
    setBusy(true); setMsg(null);
    try { if (tg && !tg.ok) await http.gateCheck("telegram"); const s = await refresh(); if (s?.missing.length) setMsg(sub.notYet); } catch { setMsg(sub.unavailable); }
    setBusy(false);
  };
  const checkYoutube = async () => { setBusy(true); setMsg(null); try { const r = await http.gateYoutube(await googleToken()); setSt(r.status); if (!r.status.missing.length) onDone(); else setMsg((sub as any)[r.result] ?? sub.unavailable); } catch (e) { setMsg((e as Error).message === "web_only" ? sub.ytWebOnly : sub.unavailable); } setBusy(false); };
  const needs = st?.platforms.filter((p) => !p.ok).length ?? 0;
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}><View style={s.back}><View style={s.box}><ScrollView contentContainerStyle={{ gap: space.md }}>
      <Text style={s.h} accessibilityRole="header">{sub.title}</Text>
      <Text style={s.n}>{sub.lead}</Text>
      <View style={s.list}>{(st?.platforms ?? []).map((p) => (
        <View key={p.id} style={s.item}><Text style={[s.dot, p.ok && s.dotOk]}>{p.ok ? "✓" : "○"}</Text><Text style={s.t}>{NAMES[p.id]}</Text></View>))}</View>
      {tg && !tg.ok && <Pressable accessibilityRole="button" onPress={openBot} style={s.cta}><Text style={s.ctaT}>{sub.openBot}</Text></Pressable>}
      {tg && !tg.ok && <Text style={s.n}>{sub.botSteps}</Text>}
      {yt && !yt.ok && <View style={s.card}><Text style={s.n}>{sub.ytStep}</Text><View style={s.row}><Btn label={sub.ytOpen} onPress={() => open(yt.url)} /><Btn label={busy ? sub.checking : sub.check} onPress={checkYoutube} primary /></View></View>}
      {!!msg && <Text style={s.warn} accessibilityLiveRegion="polite">{msg}</Text>}
      <View style={s.row}>{needs > 0 && <Btn label={busy ? sub.checking : sub.checkAll} onPress={checkNow} />}<Btn label={sub.close} onPress={onClose} /></View>
    </ScrollView></View></View></Modal>
  );
}
const Btn = ({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) => (<Pressable accessibilityRole="button" onPress={onPress} style={[s.b, primary && s.bp]}><Text style={[s.bt, primary && { color: "#fff" }]}>{label}</Text></Pressable>);
const s = StyleSheet.create({
  back: { flex: 1, backgroundColor: "rgba(8,38,62,0.6)", justifyContent: "center", alignItems: "center", padding: space.md }, box: { backgroundColor: "#fff", borderRadius: radius.lg, padding: space.lg, maxWidth: 480, width: "100%", maxHeight: "92%" },
  h: { fontWeight: "700", fontSize: 22, color: "#08263E" }, n: { fontSize: 14, color: "#445", lineHeight: 20 }, t: { fontWeight: "600", fontSize: 16, color: "#08263E" }, warn: { fontSize: 14, color: "#9a5b00" },
  list: { gap: space.sm, paddingVertical: space.xs }, item: { flexDirection: "row", alignItems: "center", gap: space.sm }, dot: { width: 24, height: 24, textAlign: "center", lineHeight: 24, borderRadius: 12, borderWidth: 1, borderColor: "#c4ced6", color: "#8795a1", fontWeight: "700" }, dotOk: { backgroundColor: "#00A86B", borderColor: "#00A86B", color: "#fff" },
  cta: { backgroundColor: "#00A86B", borderRadius: radius.md, minHeight: 52, alignItems: "center", justifyContent: "center", paddingHorizontal: space.md }, ctaT: { color: "#fff", fontWeight: "700", fontSize: 17 },
  card: { borderWidth: 1, borderColor: "#dde4ea", borderRadius: radius.md, padding: space.md, gap: space.sm }, row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  b: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: "#08263E", minHeight: 44, justifyContent: "center" }, bp: { backgroundColor: "#00A86B", borderColor: "#00A86B" }, bt: { fontWeight: "700", fontSize: 14, color: "#08263E" },
});
