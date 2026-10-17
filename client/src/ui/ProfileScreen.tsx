import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Button } from "./Button";
import { Banner, Card, Pill, SectionTitle, Stat } from "./kit";
import { tourKV } from "./tourStore";
import { resetTours } from "../tours";
import { Screen } from "./Screen";
import { uz, errText } from "../i18n/uz";
import { color, font, PLAYER_COLORS, MIN_TAP, radius, space, tone } from "../theme";
import { readableOn } from "../contrast";
import { sameWord, Http, HttpError, isUnder16, validName, validYear } from "../net/http";

export function ProfileScreen({ http, onBack, onDeleted, onLogout }: { http: Http; onBack: () => void; onDeleted: () => void; onLogout?: () => void }) {
  const [name, setName] = useState(""); const [col, setCol] = useState(0); const [year, setYear] = useState("");
  const [stats, setStats] = useState<any>(null); const [hist, setHist] = useState<any[]>([]); const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const [word, setWord] = useState(""); const [showDelete, setShowDelete] = useState(false); const [tourReset, setTourReset] = useState(false);

  useEffect(() => { (async () => {
    try { const r = await http.profile(); if (r.profile) { setName(r.profile.name); setCol(r.profile.color); setYear(String(r.profile.birthYear)); } setStats(r.stats); setHist(await http.history()); } catch (e) { setErr((e as HttpError).code ?? "network"); }
    setLoaded(true);
  })(); }, [http]);

  const save = async () => { setErr(null); setMsg(null); try { await http.saveProfile({ name: name.trim(), color: col, birthYear: Number(year) }); setMsg(uz.profile.saved); } catch (e) { setErr((e as HttpError).code ?? "network"); } };
  const download = async () => {
    try { const data = await http.exportData(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = (globalThis as any).document?.createElement("a"); if (a) { const u = URL.createObjectURL(blob); a.href = u; a.download = "poyga-data.json"; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); } else setErr("web_only");
    } catch (e) { setErr((e as HttpError).code ?? "network"); }
  };
  const del = async () => { try { await http.deleteAccount(word); onDeleted(); } catch (e) { setErr((e as HttpError).code ?? "network"); } };
  const canSave = validName(name) && validYear(year);
  const hue = PLAYER_COLORS[col % 6]; const lvlProgress = stats ? (stats.points % 100) / 100 : 0;

  return (
    <Screen title={uz.profile.title} onBack={onBack}>
      <Card style={{ gap: space.md }}>
        <View style={s.who}>
          <View style={[s.avatar, { backgroundColor: hue }]} aria-hidden><Text style={[s.avatarT, { color: readableOn(hue) }]}>{(name.trim()[0] ?? "?").toUpperCase()}</Text></View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.whoName}>{name.trim() || uz.profile.noName}</Text>
            {stats && <View style={s.pills}><Pill label={`${uz.profile.level} ${stats.level}`} kind="info" /><Pill label={`${"★".repeat(stats.stars)}${"☆".repeat(5 - stats.stars)}`} kind="warn" />{stats.title && <Pill label={uz.profile.titles[stats.title as "employee" | "investor"]} kind="good" />}</View>}
          </View>
        </View>
        {stats && (<>
          <View role="group" accessible aria-label={`${uz.profile.nextLevel}: ${stats.points % 100} / 100`} style={{ gap: 4 }}>
            <View style={s.bar} aria-hidden><View style={[s.fill, { width: `${Math.round(lvlProgress * 100)}%` }]} /></View>
            <Text style={s.muted} aria-hidden>{uz.profile.nextLevel}: {stats.points % 100} / 100</Text>
          </View>
          <View style={s.stats}>
            <Stat label={uz.profile.games} value={String(stats.games)} /><Stat label={uz.profile.wins} value={String(stats.wins)} kind="good" /><Stat label={uz.profile.big} value={String(stats.reachedBig)} />
            {stats.unreliable > 0 && <Stat label={uz.profile.unreliableShort} value={String(stats.unreliable)} kind="bad" />}
          </View>
        </>)}
      </Card>

      <Card>
        <SectionTitle>{uz.profile.edit}</SectionTitle>
        <Text style={s.l} nativeID="nm">{uz.profile.name}</Text>
        <TextInput accessibilityLabelledBy="nm" aria-label={uz.profile.name} value={name} onChangeText={setName} maxLength={24} style={s.input} autoComplete="nickname" />
        <Text style={s.l}>{uz.profile.color}</Text>
        <View style={s.row} accessibilityRole="radiogroup">{PLAYER_COLORS.map((c, i) => (
          <Pressable key={c} accessibilityRole="radio" accessibilityLabel={`${uz.profile.color} ${i + 1}`} aria-checked={i === col} onPress={() => setCol(i)}
            style={[s.dot, { backgroundColor: c }, i === col && s.dotOn]}>{i === col && <Text style={{ color: readableOn(c), fontWeight: "800" }} aria-hidden>✓</Text>}</Pressable>))}</View>
        <Text style={s.l} nativeID="by">{uz.profile.birthYear}</Text>
        <TextInput accessibilityLabelledBy="by" aria-label={uz.profile.birthYear} value={year} onChangeText={(t) => setYear(t.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" style={s.input} />
        {isUnder16(year) && <Banner kind="warn">{uz.profile.under16}</Banner>}
        <Button label={uz.profile.save} onPress={save} disabled={!canSave} />
        {msg && <Banner kind="good">{msg}</Banner>}
        {err && <Banner kind="bad">{errText(err)}</Banner>}
      </Card>

      {stats?.achievements && (
        <Card>
          <SectionTitle right={<Pill label={`${stats.achievements.length}/${Object.keys(uz.achievements).length}`} kind="info" />}>{uz.profile.achievements}</SectionTitle>
          <View role="list" style={s.ach}>
            {Object.entries(uz.achievements).map(([k, a]) => { const on = stats.achievements.includes(k); return (
              <View key={k} role="listitem" aria-label={`${a.name}: ${on ? uz.profile.earned : uz.profile.locked}. ${a.desc}`} style={[s.achItem, on && s.achOn]}>
                <Text style={[s.star, { color: on ? "#8A5A00" : color.line }]} aria-hidden>{on ? "★" : "☆"}</Text>
                <View style={{ flex: 1 }} aria-hidden><Text style={[s.achName, !on && { color: tone.muted }]}>{a.name}</Text><Text style={s.muted}>{a.desc}</Text></View>
              </View>); })}
          </View>
        </Card>)}

      <Card>
        <SectionTitle>{uz.profile.history}</SectionTitle>
        {!loaded ? <Text style={s.muted}>{uz.result.loading}</Text> : hist.length === 0 ? <Text style={s.muted}>{uz.profile.emptyHistory}</Text> : hist.slice(0, 10).map((h, i) => (
          <View key={i} style={s.hist} role="group" accessible aria-label={`${new Date(h.finishedAt).toLocaleDateString("uz")}, ${h.won ? uz.profile.won : uz.profile.lost}, ${h.rounds} ${uz.game.round.toLowerCase()}`}>
            <Text style={s.histD} aria-hidden>{new Date(h.finishedAt).toLocaleDateString("uz")}</Text><Pill label={h.won ? uz.profile.won : uz.profile.lost} kind={h.won ? "good" : "plain"} />
            <Text style={s.muted} aria-hidden>{h.rounds} {uz.game.round.toLowerCase()} · {h.players} {uz.profile.playersWord}</Text></View>))}
      </Card>

      <Card>
        <Text style={s.body}>{uz.onboarding.replayHint}</Text>
        <Button label={tourReset ? uz.profile.saved : uz.onboarding.replay} kind="ghost" onPress={() => { resetTours(tourKV); setTourReset(true); }} />
      </Card>

      {onLogout && <Button label={uz.login.logout} kind="ghost" onPress={onLogout} />}
      <Button label={uz.profile.danger} kind="ghost" onPress={() => setShowDelete(!showDelete)} />
      {showDelete && (<Card accent="red" raised={false}>
        <Text style={s.body}>{uz.profile.consequences}</Text>
        <Button label={uz.profile.export} kind="ghost" onPress={download} />
        <Text style={s.l} nativeID="dw">{uz.profile.typeWord}</Text>
        <TextInput accessibilityLabelledBy="dw" aria-label={uz.profile.typeWord} value={word} onChangeText={setWord} style={s.input} autoCapitalize="characters" />
        <Button label={uz.profile.deleteBtn} onPress={del} disabled={!sameWord(word)} /></Card>)}
    </Screen>
  );
}
const s = StyleSheet.create({
  who: { flexDirection: "row", gap: space.lg, alignItems: "center" }, avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: color.navy, alignItems: "center", justifyContent: "center" }, avatarT: { fontSize: 28, fontWeight: "800" },
  whoName: { fontSize: font.xl, fontWeight: "800", color: color.navy }, pills: { flexDirection: "row", gap: space.xs, flexWrap: "wrap" },
  bar: { height: 8, borderRadius: radius.pill, backgroundColor: color.line, overflow: "hidden" }, fill: { height: 8, backgroundColor: color.green, borderRadius: radius.pill },
  stats: { flexDirection: "row", gap: space.lg, flexWrap: "wrap" }, muted: { color: tone.muted, fontSize: font.sm }, body: { color: color.navy, fontSize: font.md, lineHeight: 22 },
  l: { color: color.navy, fontWeight: "700", fontSize: font.sm, marginTop: space.xs }, row: { flexDirection: "row", gap: space.md, flexWrap: "wrap" },
  input: { minHeight: MIN_TAP, borderWidth: 1, borderColor: color.line, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: font.lg, backgroundColor: color.white, color: color.navy },
  dot: { width: MIN_TAP, height: MIN_TAP, borderRadius: MIN_TAP / 2, borderWidth: 3, borderColor: color.line, alignItems: "center", justifyContent: "center" }, dotOn: { borderColor: color.navy, borderWidth: 4 },
  ach: { gap: space.sm }, achItem: { flexDirection: "row", gap: space.md, alignItems: "center", padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: color.line }, achOn: { backgroundColor: "#FFF6DD", borderColor: color.gold },
  star: { fontSize: 26 }, achName: { fontWeight: "800", color: color.navy, fontSize: font.md },
  hist: { flexDirection: "row", gap: space.md, alignItems: "center", flexWrap: "wrap", minHeight: 40, borderTopWidth: 1, borderTopColor: color.line, paddingTop: space.sm }, histD: { color: color.navy, fontWeight: "700" },
});
