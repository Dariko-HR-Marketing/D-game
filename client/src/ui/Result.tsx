import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Button } from "./Button";
import { uz } from "../i18n/uz";
import { money } from "../format";
import { color } from "../theme";
import { bars, downsample } from "../analysisView";
import type { Http } from "../net/http";

function Chart({ values }: { values: number[] }) {
  const b = bars(downsample(values, 24)); const hasNeg = b.some((x) => x.neg); const H = hasNeg ? 28 : 56;
  // Musbat qiymat chiziqdan yuqoriga, manfiy — pastga (yo'nalish rangdan tashqari shakl bilan ham ajraladi)
  return (<View style={s.chart} accessibilityRole="image" accessibilityLabel={uz.result.cashflowChart}>
    {b.map((x, i) => (<View key={i} style={s.col}>
      <View style={{ height: H, justifyContent: "flex-end" }}>{!x.neg && <View style={[s.bar, { height: Math.max(2, x.h * H), backgroundColor: color.green }]} />}</View>
      {hasNeg && <View style={{ height: H }}>{x.neg && <View style={[s.bar, { height: Math.max(2, x.h * H), backgroundColor: color.red }]} />}</View>}
    </View>))}</View>);
}

export function Result({ http, code, onHome }: { http: Http; code: string; onHome: () => void }) {
  const [a, setA] = useState<any>(null); const [err, setErr] = useState(false);
  useEffect(() => { http.analysis(code).then(setA).catch(() => setErr(true)); }, [http, code]);
  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.h} accessibilityRole="header">{uz.result.title}</Text>
      {a?.winner && <Text style={s.win}>{uz.result.winner}: {a.winner}</Text>}
      {!a && !err && <Text style={s.sub}>{uz.result.loading}</Text>}
      {err && <Text style={{ color: color.red }} accessibilityRole="alert">{uz.result.failed}</Text>}
      {a && <Text style={s.h2}>{uz.result.analysis} · {a.rounds} {uz.result.round}</Text>}
      {a?.players.map((p: any) => (
        <View key={p.id} style={[s.card, p.isMe && { borderColor: color.green }]}>
          <Text style={s.name}>{p.id}</Text>
          <Chart values={p.series.map((x: any) => x.cashflow)} />
          <Text style={s.sub}>{uz.result.exitRound}: {p.exitRound ?? uz.result.never} · {uz.result.restarts}: {p.restarts}</Text>
          <Text style={s.sub}>{uz.result.peakCash}: {money(p.peakCash)} · {uz.result.peakFlow}: {money(p.peakCashflow)}</Text>
          <Text style={s.sub}>{uz.result.accepted}: {p.decisions.accepted} · {uz.result.skipped}: {p.decisions.skipped} · {uz.result.assets}: {p.assetsAtEnd}</Text>
        </View>))}
      <Button label={uz.result.home} onPress={onHome} />
    </ScrollView>);
}
const s = StyleSheet.create({
  wrap: { padding: 20, gap: 12, maxWidth: 560, width: "100%", alignSelf: "center" }, h: { fontSize: 24, fontWeight: "800", color: color.navy }, h2: { fontSize: 18, fontWeight: "700", color: color.navy },
  win: { fontSize: 20, fontWeight: "700", color: color.green }, sub: { color: color.text2 }, name: { fontWeight: "700", color: color.navy, fontSize: 16 },
  card: { backgroundColor: color.white, borderRadius: 12, padding: 14, borderWidth: 2, borderColor: color.line, gap: 6 },
  chart: { flexDirection: "row", gap: 2 }, col: { flex: 1 }, bar: { width: "100%", borderRadius: 2 },
});
