import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Screen } from "./Screen";
import { Card, Banner, SectionTitle } from "./kit";
import { Button } from "./Button";
import { Acc } from "./Accordion";
import { Icon } from "./Icon";
import { Avatar } from "./Avatar";
import type { Http } from "../net/http";
import { uz, errText } from "../i18n/uz";
import { color, font, GREEN_TEXT, MIN_TAP, radius, space, tone } from "../theme";

const K = uz.clubs;
/** Klub qanday ishlaydi: 3 bosqichli gorizontal diagramma (belgi → belgi → belgi); tor ekranda ustma-ust. */
function HowItWorks() {
  const steps = [{ icon: "star" as const, t: K.how1t, d: K.how1d }, { icon: "share" as const, t: K.how2t, d: K.how2d }, { icon: "trophy" as const, t: K.how3t, d: K.how3d }];
  return (<View style={s.how} role="group" aria-label={K.howTitle} testID="club-how"><Text style={s.h}>{K.howTitle}</Text>
    <View style={s.howRow}>{steps.map((st, i) => (<View key={i} style={s.howStep}>
      <View style={s.howIco} aria-hidden><Icon name={st.icon} size={22} color="#fff" /></View>
      <Text style={s.howT}><Text style={{ color: GREEN_TEXT }}>{i + 1}. </Text>{st.t}</Text><Text style={s.howD}>{st.d}</Text></View>))}</View></View>);
}
type ClubInfo = { id: string; name: string; members: number; owner: boolean; code?: string };
type Row = { rank: number; name: string; color: number; level: number; games: number; wins: number; me: boolean };

/** Klublar (Premium yaratadi, hamma bepul qo'shiladi): ro'yxat, kod bilan qo'shilish, klub reytingi. */
export function ClubScreen({ http, onBack, onPacks }: { http: Http; onBack: () => void; onPacks?: () => void }) {
  const [list, setList] = useState<ClubInfo[] | null>(null); const [premium, setPremium] = useState(false); const [restricted, setRestricted] = useState(false);
  const [code, setCode] = useState(""); const [name, setName] = useState(""); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null); const [rows, setRows] = useState<Record<string, Row[]>>({});
  const load = async () => { try { const r = await http.clubs(); setList(r.clubs); setPremium(!!r.premium); setRestricted(!!r.restricted); } catch { setList([]); } };
  useEffect(() => { void load(); }, [http]);
  const run = async (f: () => Promise<any>) => { setBusy(true); setErr(null); try { await f(); await load(); } catch (e: any) { setErr(String(e?.code ?? "unknown")); } finally { setBusy(false); } };
  const toggle = async (id: string) => { const n = open === id ? null : id; setOpen(n); if (n) { try { const r = await http.clubBoard(id); setRows((x) => ({ ...x, [id]: r.board })); } catch { /* ro'yxat bo'sh qoladi */ } } };
  return (
    <Screen title={K.title} subtitle={K.lead} onBack={onBack} backLabel={K.back} maxWidth={680} icon="people" chips={list ? [{ label: "Klublarim", value: String(list.length) }, ...(premium ? [{ label: "Premium", value: "Faol", good: true }] : [])] : undefined}>
      {err && <Banner kind="bad">{errText(err)}</Banner>}
      <HowItWorks />
      {restricted ? <Banner kind="warn">{K.restricted}</Banner> : (<>
        <Card>
          <SectionTitle>{K.join}</SectionTitle>
          <View style={s.row}>
            <TextInput aria-label={K.code} placeholder="ABC123" placeholderTextColor="#6B7C8C" value={code} onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} style={[s.input, { flex: 1 }]} autoCapitalize="characters" testID="club-code" />
            <View style={{ flexShrink: 0 }}><Button label={K.joinBtn} onPress={() => run(async () => { await http.clubJoin(code); setCode(""); })} disabled={busy || code.length !== 6} /></View>
          </View>
        </Card>
        <Card>
          <SectionTitle>{K.create}</SectionTitle>
          {premium ? (<View style={s.row}>
            <TextInput aria-label={K.name} placeholder={K.name} placeholderTextColor="#6B7C8C" value={name} onChangeText={setName} maxLength={30} style={[s.input, { flex: 1 }]} testID="club-name" />
            <View style={{ flexShrink: 0 }}><Button label={K.createBtn} onPress={() => run(async () => { await http.clubCreate(name.trim()); setName(""); })} disabled={busy || name.trim().length < 2} /></View>
          </View>) : (<><Text style={s.p}>{K.premiumNeed}</Text>{onPacks && <Button label={K.seePacks} kind="ghost" onPress={onPacks} />}</>)}
        </Card>
      </>)}
      <SectionTitle>{K.mine}</SectionTitle>
      {list === null ? <Text style={s.p}>{K.loading}</Text> : list.length === 0 ? <View style={s.empty}><View style={s.emptyIco} aria-hidden><Icon name="people" size={28} color={color.navy} /></View><Text style={s.p}>{K.empty}</Text></View> : list.map((c) => (
        <Acc key={c.id} icon="people" title={c.name} summary={`${K.members.replace("{n}", String(c.members))}${c.owner ? ` · ${K.owner}` : ""}`} open={open === c.id} onToggle={() => toggle(c.id)} testID={`club-${c.id}`}>
          <View style={{ gap: space.md }}>
            {c.code && <View style={s.codeBox}><Text style={s.p}>{K.codeIs}</Text><Text style={s.code} testID="club-share-code">{c.code}</Text><Text style={s.hint}>{K.codeHint}</Text></View>}
            <Text style={s.h}>{K.board}</Text>
            {(rows[c.id] ?? []).map((r) => (<View key={r.rank + r.name} style={[s.rrow, r.me && s.rme]}><Text style={s.rk}>{r.rank}</Text><Avatar name={r.name} colorIdx={r.color} size={28} /><Text style={s.rn} numberOfLines={1}>{r.name}{r.me ? ` ${K.you}` : ""}</Text><Text style={s.rs}>{r.wins} {K.wins} · {r.games} {K.games}</Text></View>))}
            <View style={s.row}>
              <View style={{ flex: 1 }}><Button label={K.leave} kind="ghost" onPress={() => run(() => http.clubLeave(c.id))} disabled={busy} /></View>
              {c.owner && <View style={{ flex: 1 }}><Button label={K.del} kind="ghost" onPress={() => run(() => http.clubDelete(c.id))} disabled={busy} /></View>}
            </View>
          </View>
        </Acc>))}
    </Screen>);
}
const s = StyleSheet.create({
  how: { backgroundColor: "#F3FAF6", borderWidth: 1, borderColor: "#BFE3D1", borderRadius: radius.lg, padding: space.lg, gap: space.md }, howRow: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  howStep: { flexGrow: 1, flexBasis: 170, gap: 6 }, howIco: { width: 40, height: 40, borderRadius: 13, backgroundColor: color.green, alignItems: "center", justifyContent: "center" },
  howT: { color: color.navy, fontWeight: "800", fontSize: font.md }, howD: { color: tone.muted, fontSize: font.sm, lineHeight: 19 },
  empty: { alignItems: "center", gap: space.sm, padding: space.xl, borderRadius: radius.xl, borderWidth: 1, borderStyle: "dashed", borderColor: color.line, backgroundColor: color.white }, emptyIco: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#EEF2F5", alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", gap: space.sm, alignItems: "stretch" }, p: { color: tone.muted, fontSize: font.md, lineHeight: 22 }, h: { color: color.navy, fontWeight: "800", fontSize: font.md },
  input: { minHeight: MIN_TAP, minWidth: 0, borderWidth: 1, borderColor: "#7C8FA0", borderRadius: radius.md, paddingHorizontal: space.md, fontSize: font.lg, color: color.navy, backgroundColor: color.white },
  codeBox: { gap: 2, padding: space.md, borderRadius: radius.md, backgroundColor: "#EAF8F1", borderWidth: 1, borderColor: color.green }, code: { color: color.navy, fontSize: 28, fontWeight: "800", letterSpacing: 6 }, hint: { color: tone.muted, fontSize: 12 },
  rrow: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 6, paddingHorizontal: 8, borderRadius: radius.sm }, rme: { backgroundColor: "#EAF8F1" }, rk: { width: 22, color: color.navy, fontWeight: "800" }, rn: { flex: 1, minWidth: 0, color: color.navy, fontWeight: "700" }, rs: { color: tone.muted, fontSize: 12 },
});
void Icon;
