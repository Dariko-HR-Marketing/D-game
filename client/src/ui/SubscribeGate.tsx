import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Linking, Modal, ScrollView, StyleSheet } from "react-native";
import { Icon, type IconName } from "./Icon";
import { sub } from "../i18n/uz";
import { color, radius, space, tone } from "../theme";
import type { Http, GateStatus } from "../net/http";
import { BRAND } from "./Socials";
import { googleToken } from "./socialAuth";

const open = (u?: string) => { if (u) void Linking.openURL(u); };

/** Obuna darvozasi (premium, minimalistik). Hamma majburiy obuna Telegram botda, bitta joyda; oyna holatni o'zi kuzatadi va tayyor bo'lgach yopiladi. */
export function SubscribeGate({ http, onClose, onDone }: { http: Http; onClose: () => void; onDone: () => void }) {
  const [st, setSt] = useState<GateStatus | null>(null); const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => { try { const s = await http.gate(); setSt(s); if (!s.missing.length) onDone(); return s; } catch { return null; } }, [http, onDone]);
  useEffect(() => { void refresh(); const t = setInterval(() => void refresh(), 3000); return () => clearInterval(t); }, [refresh]);
  const list = st?.platforms ?? [], done = list.filter((p) => p.ok).length;
  const tg = list.find((p) => p.id === "telegram"), yt = list.find((p) => p.id === "youtube"), ig = list.find((p) => p.id === "instagram");
  const viaBot = !!(tg && !tg.ok) || !!(ig && !ig.ok);
  const openBot = async () => { setMsg(null); try { const r = await http.gateStart("telegram"); open(r.url); } catch { setMsg(sub.unavailable); } };
  const checkNow = async () => { setBusy(true); setMsg(null); try { if (tg && !tg.ok) await http.gateCheck("telegram"); if (ig && !ig.ok && ig.linked) await http.gateCheck("instagram"); const s = await refresh(); if (s?.missing.length) setMsg(sub.notYet); } catch { setMsg(sub.unavailable); } setBusy(false); };
  const checkYoutube = async () => { setBusy(true); setMsg(null); try { const r = await http.gateYoutube(await googleToken()); setSt(r.status); if (!r.status.missing.length) onDone(); else setMsg((sub as any)[r.result] ?? sub.unavailable); } catch (e) { setMsg((e as Error).message === "web_only" ? sub.ytWebOnly : sub.unavailable); } setBusy(false); };
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}><View style={s.back}><View style={s.box}><ScrollView contentContainerStyle={{ gap: space.lg }} showsVerticalScrollIndicator={false}>
      <View style={s.head}>
        <View style={s.badge} aria-hidden><Icon name="shield" size={26} color="#fff" stroke={1.7} /></View>
        <Text style={s.h} accessibilityRole="header">{sub.title}</Text>
        <Text style={s.n}>{sub.lead}</Text>
      </View>
      {list.length > 0 && <View style={s.prog} accessibilityLabel={`${done}/${list.length} ${sub.progress}`}><View style={s.bar}><View style={[s.fill, { width: `${(done / list.length) * 100}%` }]} /></View><Text style={s.pt}>{done}/{list.length}</Text></View>}
      <View style={s.list}>{list.map((p) => (
        <View key={p.id} style={[s.item, p.ok && s.itemOk]}>
          <View style={[s.logo, { backgroundColor: p.ok ? color.green : BRAND[p.id] }]} aria-hidden><Icon name={p.ok ? "check" : (p.id as IconName)} size={20} color="#fff" stroke={2} /></View>
          <View style={{ flex: 1 }}><Text style={s.t}>{(sub as any)[p.id]}{p.extraRequired ? " · " + sub.channelGroup : ""}</Text><Text style={s.mut}>{p.ok ? "✓" : sub.required}</Text></View>
        </View>))}</View>
      {viaBot && <Pressable accessibilityRole="button" onPress={openBot} style={({ pressed }) => [s.cta, pressed && { opacity: 0.9 }]}><Icon name="telegram" size={20} color="#fff" /><Text style={s.ctaT}>{sub.openBot}</Text></Pressable>}
      {viaBot && <Text style={s.n}>{sub.botSteps}{ig && !ig.ok ? ` ${sub.igStep}` : ""}</Text>}
      {yt && !yt.ok && <View style={s.card}><Text style={s.n}>{sub.ytStep}</Text><View style={s.row}><Btn label={sub.ytOpen} onPress={() => open(yt.url)} /><Btn label={busy ? sub.checking : sub.check} onPress={checkYoutube} primary /></View></View>}
      {!!msg && <Text style={s.warn} accessibilityLiveRegion="polite">{msg}</Text>}
      <View style={s.row}>{done < list.length && <Btn label={busy ? sub.checking : sub.checkAll} onPress={checkNow} />}<Btn label={sub.close} onPress={onClose} /></View>
      <Text style={s.foot}>{sub.extra}</Text>
    </ScrollView></View></View></Modal>
  );
}
const Btn = ({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) => (<Pressable accessibilityRole="button" onPress={onPress} style={[s.b, primary && s.bp]}><Text style={[s.bt, primary && { color: "#fff" }]}>{label}</Text></Pressable>);
const s = StyleSheet.create({
  back: { flex: 1, backgroundColor: "rgba(8,38,62,0.62)", justifyContent: "center", alignItems: "center", padding: space.md }, box: { backgroundColor: "#fff", borderRadius: 24, padding: space.xl, maxWidth: 440, width: "100%", maxHeight: "92%" },
  head: { alignItems: "center", gap: space.sm }, badge: { width: 56, height: 56, borderRadius: 18, backgroundColor: color.navy, alignItems: "center", justifyContent: "center" },
  h: { fontWeight: "800", fontSize: 22, color: color.navy, textAlign: "center" }, n: { fontSize: 14, color: tone.muted, lineHeight: 20, textAlign: "center" }, mut: { fontSize: 12, color: tone.muted }, warn: { fontSize: 14, color: tone.warn, textAlign: "center" }, foot: { fontSize: 12, color: tone.muted, textAlign: "center" },
  prog: { flexDirection: "row", alignItems: "center", gap: space.sm }, bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "#E6ECF0", overflow: "hidden" }, fill: { height: 6, backgroundColor: color.green, borderRadius: 3 }, pt: { fontWeight: "700", fontSize: 13, color: color.navy },
  list: { gap: space.sm }, item: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: 16, borderWidth: 1, borderColor: color.line }, itemOk: { borderColor: "#BFE3D1", backgroundColor: "#F3FAF6" },
  logo: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" }, t: { fontWeight: "700", fontSize: 16, color: color.navy },
  cta: { flexDirection: "row", gap: space.sm, backgroundColor: color.green, borderRadius: 16, minHeight: 54, alignItems: "center", justifyContent: "center", paddingHorizontal: space.md }, ctaT: { color: "#fff", fontWeight: "800", fontSize: 17 },
  card: { borderWidth: 1, borderColor: color.line, borderRadius: 16, padding: space.md, gap: space.sm }, row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "center" },
  b: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: color.navy, minHeight: 44, justifyContent: "center" }, bp: { backgroundColor: color.green, borderColor: color.green }, bt: { fontWeight: "700", fontSize: 14, color: color.navy },
});
