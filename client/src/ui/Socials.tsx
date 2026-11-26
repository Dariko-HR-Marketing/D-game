import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import { Icon, type IconName } from "./Icon";
import { soc } from "../i18n/uz";
import { color, radius, space, tone } from "../theme";
import type { Http, SocialItem, SocialsInfo } from "../net/http";
import { googleToken } from "./socialAuth";

export const BRAND: Record<string, string> = { telegram: "#229ED9", instagram: "#C13584", youtube: "#C4302B", facebook: "#1877F2" };
const open = (u?: string) => { if (u) void Linking.openURL(u); };
const when = (t: number | null) => (t ? new Date(t).toLocaleDateString("uz") : "");
export const socialSummary = (i: SocialsInfo | null) => (i ? `★ ${i.stars}/${i.items.filter((x) => x.verifiable && x.configured).length || 3}` : "");

/** Profil → «Ijtimoiy tarmoqlar»: har tarmoq — belgi, holat, yulduzcha va amallar. Yulduzcha faqat serverda TEKSHIRILGAN obuna uchun. */
export function Socials({ http, onInfo }: { http: Http; onInfo?: (i: SocialsInfo) => void }) {
  const [info, setInfo] = useState<SocialsInfo | null>(null); const [busy, setBusy] = useState<string | null>(null); const [msg, setMsg] = useState<Record<string, string>>({}); const [code, setCode] = useState<string | null>(null);
  const load = useCallback(async () => { try { const r = await http.socials(); setInfo(r); onInfo?.(r); return r; } catch { return null; } }, [http, onInfo]);
  useEffect(() => { void load(); }, [load]);
  const say = (id: string, t: string) => setMsg((m) => ({ ...m, [id]: t }));
  const connect = async (it: SocialItem) => {
    say(it.id, "");
    try {
      if (it.id === "telegram") { const r = await http.gateStart("telegram"); open(r.url); }
      else if (it.id === "instagram") { const r = await http.gateStart("instagram"); if (r.code) setCode(r.code); open(r.url); }
      else if (it.id === "facebook") { setBusy(it.id); const r = await http.facebookConfirm(); setInfo(r); onInfo?.(r); }
      else if (it.id === "youtube") { setBusy(it.id); const r = await http.gateYoutube(await googleToken()); await load(); if (!r.ok) say(it.id, soc.notYet); }
    } catch (e) { say(it.id, (e as Error).message === "web_only" ? soc.ytWeb : soc.failed); }
    setBusy(null);
  };
  const check = async (it: SocialItem) => {
    setBusy(it.id); say(it.id, "");
    try { if (it.id === "telegram" || it.id === "instagram") { const r = await http.gateCheck(it.id); if (!r.ok) say(it.id, soc.notYet); } await load(); } catch { say(it.id, soc.failed); }
    setBusy(null);
  };
  const drop = async (it: SocialItem) => { setBusy(it.id); try { const r = await http.socialDisconnect(it.id); setInfo(r); onInfo?.(r); say(it.id, soc.disconnected); } catch { say(it.id, soc.failed); } setBusy(null); };
  if (!info) return <Text style={s.muted}>…</Text>;
  return (
    <View style={{ gap: space.sm }}>
      <Text style={s.muted}>{soc.lead}{info.starXp > 0 ? ` ${soc.xpNote}` : ""}</Text>
      {info.items.map((it) => {
        const live = it.configured && it.verifiable, name = soc.names[it.id];
        return (
          <View key={it.id} style={[s.card, it.ok && s.cardOk]} accessibilityLabel={`${name}: ${it.ok ? soc.connected : live ? soc.notConnected : soc.soon}`}>
            <View style={s.top}>
              <View style={[s.logo, { backgroundColor: BRAND[it.id] }]} aria-hidden><Icon name={it.id as IconName} size={22} color="#fff" stroke={1.9} /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={s.nameRow}><Text style={s.name}>{name}</Text>
                  {(live || (it.self && it.configured)) && <Text style={[s.tag, it.required ? s.tagReq : s.tagOpt]}>{it.required ? soc.required : soc.optional}</Text>}</View>
                <Text style={s.muted}>{it.ok ? `${it.self ? soc.selfConfirmed : soc.connected}${it.at ? ` · ${when(it.at)}` : ""}` : live ? (it.id === "telegram" && it.groupRequired ? `${soc.notConnected} · ${soc.groupToo}` : soc.notConnected) : it.self && it.configured ? soc.fbNote : soc.soon}</Text>
              </View>
              <Text style={[s.star, { color: it.ok ? "#B8860B" : color.line }]} aria-label={it.ok ? soc.starEarned : soc.starAvail}>{it.ok ? "★" : "☆"}</Text>
            </View>
            {live && !it.ok && <View style={s.row}>
              <Btn label={busy === it.id ? soc.checking : soc.connect} onPress={() => connect(it)} primary />
              {(it.id === "telegram" || it.id === "instagram") && <Btn label={soc.check} onPress={() => check(it)} />}
              {it.url && <Btn label={soc.open} onPress={() => open(it.url)} />}</View>}
            {live && it.ok && <View style={s.row}><Btn label={soc.check} onPress={() => check(it)} /><Btn label={soc.disconnect} onPress={() => drop(it)} danger /></View>}
            {it.self && it.configured && !it.ok && <View style={s.row}><Btn label={soc.open} onPress={() => open(it.url)} /><Btn label={busy === it.id ? soc.checking : soc.fbConfirm} onPress={() => connect(it)} primary /></View>}
            {it.self && it.configured && it.ok && <View style={s.row}><Btn label={soc.disconnect} onPress={() => drop(it)} danger /></View>}
            {live && it.id === "telegram" && it.groupUrl && !it.ok && <View style={s.row}><Btn label={soc.group} onPress={() => open(it.groupUrl)} /></View>}
            {it.id === "instagram" && !it.ok && code && <Text style={s.code} selectable>{soc.igCode}: {code}</Text>}
            {it.ok && it.required && <Text style={s.muted}>{soc.requiredNote}</Text>}
            {!!msg[it.id] && <Text style={s.warn} accessibilityLiveRegion="polite">{msg[it.id]}</Text>}
          </View>);
      })}
    </View>
  );
}
const Btn = ({ label, onPress, primary, danger }: { label: string; onPress: () => void; primary?: boolean; danger?: boolean }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={[s.b, primary && s.bp, danger && s.bd]}><Text style={[s.bt, primary && { color: "#fff" }, danger && { color: color.red }]}>{label}</Text></Pressable>);
const s = StyleSheet.create({
  muted: { color: tone.muted, fontSize: 13, lineHeight: 18 }, warn: { color: tone.warn, fontSize: 13 }, code: { color: color.navy, fontWeight: "700", fontSize: 14 },
  card: { borderWidth: 1, borderColor: color.line, borderRadius: radius.md, padding: space.md, gap: space.sm, backgroundColor: color.white }, cardOk: { borderColor: "#BFE3D1", backgroundColor: "#F3FAF6" },
  top: { flexDirection: "row", alignItems: "center", gap: space.md }, logo: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" }, name: { color: color.navy, fontWeight: "800", fontSize: 16 },
  tag: { fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden" }, tagReq: { backgroundColor: "#FDECEC", color: color.red }, tagOpt: { backgroundColor: "#EEF2F5", color: tone.muted },
  star: { fontSize: 26 }, row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  b: { minHeight: 44, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: color.navy, justifyContent: "center" }, bp: { backgroundColor: color.green, borderColor: color.green }, bd: { borderColor: color.red }, bt: { color: color.navy, fontWeight: "700", fontSize: 14 },
});
