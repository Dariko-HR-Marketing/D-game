import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Linking, Modal, ScrollView, StyleSheet } from "react-native";
import { sub } from "../i18n/uz";
import { radius, space } from "../theme";
import { loadGis } from "../googleSignIn";
import type { Http, GateStatus, GateCheck } from "../net/http";

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
/** Obuna darvozasi: server `subscription_required` qaytarganda ko'rsatiladi. Har platforma o'z yo'li bilan serverda tekshiriladi. */
export function SubscribeGate({ http, onClose, onDone }: { http: Http; onClose: () => void; onDone: () => void }) {
  const [st, setSt] = useState<GateStatus | null>(null); const [msg, setMsg] = useState<Record<string, string>>({}); const [busy, setBusy] = useState<string | null>(null); const [code, setCode] = useState<string | null>(null);
  useEffect(() => { http.gate().then(setSt).catch(() => {}); }, [http]);
  const apply = (p: string, r: GateCheck) => { setSt(r.status); setMsg((m) => ({ ...m, [p]: r.ok ? sub.done : (sub as any)[r.result] ?? sub.unavailable })); if (!r.status.missing.length) onDone(); };
  const check = async (p: "telegram" | "instagram" | "youtube") => {
    setBusy(p); try { apply(p, p === "youtube" ? await http.gateYoutube(await googleToken()) : await http.gateCheck(p)); } catch (e) { setMsg((m) => ({ ...m, [p]: (e as Error).message === "web_only" ? sub.ytWebOnly : sub.unavailable })); } setBusy(null);
  };
  const begin = async (p: "telegram" | "instagram") => { try { const r = await http.gateStart(p); if (r.code) setCode(r.code); open(r.url); } catch { setMsg((m) => ({ ...m, [p]: sub.unavailable })); } };
  const row = (id: "telegram" | "instagram" | "youtube", title: string, step: string, actions: React.ReactNode) => {
    const p = st?.platforms.find((x) => x.id === id); if (!p) return null;
    return (<View style={s.card} key={id}><Text style={s.t}>{title}{p.ok ? "  ✓" : ""}</Text>{!p.ok && <Text style={s.n}>{step}</Text>}
      {!p.ok && <View style={s.row}>{actions}<Btn label={busy === id ? sub.checking : sub.check} onPress={() => check(id)} primary /></View>}{!!msg[id] && <Text style={s.n} accessibilityLiveRegion="polite">{msg[id]}</Text>}</View>);
  };
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}><View style={s.back}><View style={s.box}><ScrollView contentContainerStyle={{ gap: space.md }}>
      <Text style={s.h} accessibilityRole="header">{sub.title}</Text><Text style={s.n}>{sub.hint}</Text>
      {row("telegram", sub.telegram, sub.tgStep, <><Btn label={sub.tgBot} onPress={() => begin("telegram")} /><Btn label={sub.tgChannel} onPress={() => open(st?.platforms.find((x) => x.id === "telegram")?.url)} />{!!st?.platforms.find((x) => x.id === "telegram")?.extraUrl && <Btn label={sub.tgGroup} onPress={() => open(st?.platforms.find((x) => x.id === "telegram")?.extraUrl)} />}</>)}
      {row("instagram", sub.instagram, sub.igStep + (code ? `  ${sub.igCode}: ${code}` : ""), <><Btn label={sub.igOpen} onPress={() => begin("instagram")} /></>)}
      {row("youtube", sub.youtube, sub.ytStep, <Btn label={sub.ytOpen} onPress={() => open(st?.platforms.find((x) => x.id === "youtube")?.url)} />)}
      <Btn label={sub.close} onPress={onClose} />
    </ScrollView></View></View></Modal>
  );
}
const Btn = ({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) => (<Pressable accessibilityRole="button" onPress={onPress} style={[s.b, primary && s.bp]}><Text style={[s.bt, primary && { color: "#fff" }]}>{label}</Text></Pressable>);
const s = StyleSheet.create({
  back: { flex: 1, backgroundColor: "rgba(8,38,62,0.6)", justifyContent: "center", alignItems: "center", padding: space.md }, box: { backgroundColor: "#fff", borderRadius: radius.lg, padding: space.lg, maxWidth: 520, width: "100%", maxHeight: "92%" },
  h: { fontWeight: "700", fontSize: 20, color: "#08263E" }, t: { fontWeight: "700", fontSize: 16, color: "#08263E" }, n: { fontSize: 14, color: "#445" },
  card: { borderWidth: 1, borderColor: "#dde4ea", borderRadius: radius.md, padding: space.md, gap: space.sm }, row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  b: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: "#08263E", minHeight: 44, justifyContent: "center" }, bp: { backgroundColor: "#00A86B", borderColor: "#00A86B" }, bt: { fontWeight: "700", fontSize: 14, color: "#08263E" },
});
