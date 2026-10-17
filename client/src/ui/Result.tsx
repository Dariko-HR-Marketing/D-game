import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "./Button";
import { Banner, Card, Pill, Stat } from "./kit";
import { Screen } from "./Screen";
import { uz } from "../i18n/uz";
import { money } from "../format";
import { color, font, radius, space, tone } from "../theme";
import { bars, downsample } from "../analysisView";
import type { Http } from "../net/http";

/** Pul oqimi grafigi: o'qlar (eng katta qiymat va aylanalar), manfiy qiymat nol chizig'idan pastga qizil; ma'lumot kam bo'lsa tushuntiriladi. */
function Chart({ values }: { values: number[] }) {
  if (values.length < 4) return <Text style={s.muted}>{uz.result.fewData}</Text>;
  const pts = downsample(values, 28); const b = bars(pts); const hasNeg = b.some((x) => x.neg); const H = hasNeg ? 36 : 72; const max = Math.max(1, ...pts.map(Math.abs)); // o'q ham ustunlar bilan bir xil masshtabda
  return (
    <View accessibilityRole="image" accessibilityLabel={`${uz.result.cashflowChart}: ${uz.result.chartRange} ${money(Math.min(...values))} – ${money(Math.max(...values))}`} style={{ gap: space.xs }}>
      <View style={s.chartRow} aria-hidden>
        <View style={[s.axis, hasNeg && { paddingVertical: 0 }]}><Text style={s.axisT}>{money(max)}</Text><Text style={s.axisT}>0</Text>{hasNeg && <Text style={s.axisT}>{money(-max)}</Text>}</View>
        <View style={s.chart}>{b.map((x, i) => (
          <View key={i} style={s.col}>
            <View style={{ height: H, justifyContent: "flex-end" }}>{!x.neg && <View style={[s.bar, { height: Math.max(2, x.h * H), backgroundColor: color.green }]} />}</View>
            {hasNeg && <View style={{ height: H }}>{x.neg && <View style={[s.bar, { height: Math.max(2, x.h * H), backgroundColor: color.red }]} />}</View>}
          </View>))}</View>
      </View>
      <Text style={s.axisT} aria-hidden>{uz.result.chartX}</Text>
    </View>
  );
}

export function Result({ http, code, onHome }: { http: Http; code: string; onHome: () => void }) {
  const [a, setA] = useState<any>(null); const [err, setErr] = useState(false);
  useEffect(() => { http.analysis(code).then(setA).catch(() => setErr(true)); }, [http, code]);
  const me = a?.players.find((p: any) => p.isMe);
  return (
    <Screen title={uz.result.title} subtitle={a ? `${uz.result.analysis} · ${a.rounds} ${uz.result.round}` : undefined} maxWidth={720}>
      {a?.winner ? (
        <Card accent="green" style={{ alignItems: "center", gap: space.xs }} label={`${uz.result.winner}: ${a.winner}`}>
          <Text style={s.trophy} aria-hidden>★</Text><Text style={s.winLabel}>{uz.result.winner}</Text><Text style={s.winName}>{a.winner}</Text>
          {me && a.players.find((p: any) => p.isMe)?.id === a.winner && <Pill label={uz.result.youWon} kind="good" />}
        </Card>) : a ? <Banner kind="info">{uz.result.noWinner}</Banner> : null}
      {!a && !err && <Text style={s.muted} accessibilityLiveRegion="polite">{uz.result.loading}</Text>}
      {err && <Banner kind="bad">{uz.result.failed}</Banner>}
      <View style={s.grid}>
        {a?.players.map((p: any) => (
          <View key={p.id} style={s.cell}>
            <Card accent={p.isMe ? "green" : undefined} style={{ flex: 1 }}>
              <View style={s.nameRow}><Text style={s.name}>{p.id}</Text>{p.isMe && p.id !== uz.result.you && <Pill label={uz.result.you} kind="good" />}{p.id === a.winner && <Pill label={uz.result.winner} kind="warn" />}</View>
              <Chart values={p.series.map((x: any) => x.cashflow)} />
              <View style={s.stats}>
                <Stat label={uz.result.peakCash} value={money(p.peakCash)} /><Stat label={uz.result.peakFlow} value={money(p.peakCashflow)} kind="good" />
                <Stat label={uz.result.exitRound} value={p.exitRound ?? uz.result.never} text={p.exitRound == null} /><Stat label={uz.result.restarts} value={String(p.restarts)} kind={p.restarts > 0 ? "bad" : "neutral"} />
                <Stat label={uz.result.accepted} value={String(p.decisions.accepted)} /><Stat label={uz.result.skipped} value={String(p.decisions.skipped)} />
              </View>
            </Card>
          </View>))}
      </View>
      <Button label={uz.result.home} onPress={onHome} />
    </Screen>
  );
}
const s = StyleSheet.create({
  muted: { color: tone.muted, fontSize: font.md }, trophy: { fontSize: 36, color: color.gold }, winLabel: { color: tone.muted, fontWeight: "700", fontSize: font.sm, textTransform: "uppercase", letterSpacing: 1 }, winName: { color: color.navy, fontSize: font.xxl, fontWeight: "800", textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md }, cell: { flexGrow: 1, flexBasis: 300 },
  nameRow: { flexDirection: "row", gap: space.sm, alignItems: "center", flexWrap: "wrap" }, name: { fontWeight: "800", color: color.navy, fontSize: font.lg },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space.md, rowGap: space.lg },
  chartRow: { flexDirection: "row", gap: space.sm }, axis: { justifyContent: "space-between", alignItems: "flex-end" }, axisT: { color: tone.muted, fontSize: 11, fontWeight: "600" },
  chart: { flex: 1, flexDirection: "row", gap: 2, borderBottomWidth: 1, borderBottomColor: color.line }, col: { flex: 1 }, bar: { width: "100%", borderTopLeftRadius: 2, borderTopRightRadius: 2 },
});
