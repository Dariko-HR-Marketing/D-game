import React, { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from "react-native";
import { Button } from "./Button";
import { uz, errText } from "../i18n/uz";
import { color, PLAYER_COLORS, MIN_TAP, GREEN_TEXT } from "../theme";
import { sameWord, Http, HttpError, isUnder16, validName, validYear } from "../net/http";

export function ProfileScreen({ http, onBack, onDeleted }: { http: Http; onBack: () => void; onDeleted: () => void }) {
  const [name, setName] = useState(""); const [col, setCol] = useState(0); const [year, setYear] = useState("");
  const [stats, setStats] = useState<any>(null); const [hist, setHist] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const [word, setWord] = useState(""); const [showDelete, setShowDelete] = useState(false);

  useEffect(() => { (async () => {
    try { const r = await http.profile(); if (r.profile) { setName(r.profile.name); setCol(r.profile.color); setYear(String(r.profile.birthYear)); } setStats(r.stats); setHist(await http.history()); } catch (e) { setErr((e as HttpError).code); }
  })(); }, [http]);

  const save = async () => {
    setErr(null); setMsg(null);
    try { await http.saveProfile({ name: name.trim(), color: col, birthYear: Number(year) }); setMsg(uz.profile.saved); } catch (e) { setErr((e as HttpError).code); }
  };
  const download = async () => {
    const data = await http.exportData(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = (globalThis as any).document?.createElement("a"); if (a) { a.href = URL.createObjectURL(blob); a.download = "poyga-data.json"; a.click(); }
  };
  const del = async () => { try { await http.deleteAccount(word); onDeleted(); } catch (e) { setErr((e as HttpError).code); } };
  const canSave = validName(name) && validYear(year);

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.h} aria-level={1} accessibilityRole="header">{uz.profile.title}</Text>
      {stats && <Text style={s.sub}>{uz.profile.level}: {stats.level} · {"★".repeat(stats.stars)}{stats.title ? ` ${uz.profile.titles[stats.title as "employee" | "investor"]}` : ""} · {uz.profile.games}: {stats.games} · {uz.profile.wins}: {stats.wins} · {uz.profile.big}: {stats.reachedBig}{stats.unreliable > 0 ? ` · ${uz.profile.unreliable}: ${stats.unreliable}` : ""}</Text>}
      <Text style={s.l}>{uz.profile.name}</Text>
      <TextInput accessibilityLabel={uz.profile.name} value={name} onChangeText={setName} maxLength={24} style={s.input} />
      <Text style={s.l}>{uz.profile.color}</Text>
      <View style={s.row}>{PLAYER_COLORS.map((c, i) => (
        <Pressable key={c} accessibilityRole="button" accessibilityLabel={`${uz.profile.color} ${i + 1}`} accessibilityState={{ selected: i === col }} onPress={() => setCol(i)}
          style={[s.dot, { backgroundColor: c }, i === col && s.dotOn]} />))}</View>
      <Text style={s.l}>{uz.profile.birthYear}</Text>
      <TextInput accessibilityLabel={uz.profile.birthYear} value={year} onChangeText={(t) => setYear(t.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" style={s.input} />
      {isUnder16(year) && <Text style={s.note} accessibilityRole="alert">{uz.profile.under16}</Text>}
      <Button label={uz.profile.save} onPress={save} disabled={!canSave} />
      {msg && <Text style={{ color: GREEN_TEXT }} accessibilityLiveRegion="polite">{msg}</Text>}
      {err && <Text style={{ color: color.red }} accessibilityRole="alert">{errText(err)}</Text>}

      <Text style={[s.h, { marginTop: 16 }]} accessibilityRole="header" aria-level={2}>{uz.profile.history}</Text>
      {hist.length === 0 ? <Text style={s.sub}>{uz.profile.empty}</Text> : hist.slice(0, 10).map((h, i) => (
        <Text key={i} style={s.sub}>{new Date(h.finishedAt).toLocaleDateString("uz")} · {h.won ? uz.profile.won : uz.profile.lost} · {h.rounds} {uz.game.round.toLowerCase()}</Text>))}

      <Button label={uz.profile.danger} kind="ghost" onPress={() => setShowDelete(!showDelete)} />
      {showDelete && (<View style={s.danger}>
        <Text style={s.note}>{uz.profile.consequences}</Text>
        <Button label={uz.profile.export} kind="ghost" onPress={download} />
        <Text style={s.l}>{uz.profile.typeWord}</Text>
        <TextInput accessibilityLabel={uz.profile.typeWord} value={word} onChangeText={setWord} style={s.input} autoCapitalize="characters" />
        <Button label={uz.profile.deleteBtn} onPress={del} disabled={!sameWord(word)} /></View>)}
      <Button label={uz.profile.back} kind="ghost" onPress={onBack} />
    </ScrollView>);
}
const s = StyleSheet.create({
  wrap: { padding: 20, gap: 10, maxWidth: 480, width: "100%", alignSelf: "center" }, h: { fontSize: 22, fontWeight: "800", color: color.navy }, l: { color: color.text2, fontWeight: "600" },
  sub: { color: color.text2 }, note: { color: color.text2 }, row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  input: { minHeight: MIN_TAP, borderWidth: 1, borderColor: color.line, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, backgroundColor: color.white, color: color.navy },
  dot: { width: MIN_TAP, height: MIN_TAP, borderRadius: MIN_TAP / 2, borderWidth: 3, borderColor: color.line }, dotOn: { borderColor: color.navy, borderWidth: 4 },
  danger: { borderWidth: 1, borderColor: color.red, borderRadius: 12, padding: 12, gap: 10, backgroundColor: color.white },
});
