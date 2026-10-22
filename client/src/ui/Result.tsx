import { HistoryDetail } from "./History";
import { accuracyOf, type HView } from "../history";
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "./Button";
import { Banner, Card, Pill } from "./kit";
import { Screen } from "./Screen";
import { ReportView } from "./ReportView";
import { uz } from "../i18n/uz";
import { color, font, space, tone } from "../theme";
import type { ReportData } from "../report";
import type { Http } from "../net/http";

/** O'yin natijasi: g'olib, har bir o'yinchi uchun to'liq tahlil hisoboti (o'ziniki batafsil, boshqalar — umumiy), CSV yuklab olish, tarix. */
export function Result({ http, code, onHome }: { http: Http; code: string; onHome: () => void }) {
  const [d, setD] = useState<ReportData | null>(null); const [err, setErr] = useState<null | "plus" | "fail">(null); const [tries, setTries] = useState(0); const [csvErr, setCsvErr] = useState(false);
  const [acc, setAcc] = useState<ReturnType<typeof accuracyOf>>(null); const [hist, setHist] = useState(false);
  useEffect(() => { setErr(null); (http.report(code) as Promise<ReportData>).then(setD).catch((e: any) => setErr(e?.status === 402 ? "plus" : "fail")); }, [http, code, tries]);
  useEffect(() => { http.gameLog(code).then((h: HView) => setAcc(accuracyOf(h.players.find((p) => p.isMe)?.calc ?? null))).catch(() => {}); }, [http, code]); // hisob aniqligi — qo'shimcha ma'lumot, xato bo'lsa ko'rsatilmaydi
  const download = async () => {
    const doc = (globalThis as any).document; if (!doc) return; setCsvErr(false);
    try { const text = await http.reportCsv(code); const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" })); const a = doc.createElement("a"); a.href = url; a.download = `poyga-hisobot-${code}.csv`; doc.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); } catch { setCsvErr(true); }
  };
  return (
    <Screen title={uz.result.title} subtitle={d ? `${uz.report.title} · ${d.meta.rounds} ${uz.result.round}` : undefined} maxWidth={1080}>
      {d?.meta.winner ? (
        <Card accent="green" style={{ alignItems: "center", gap: space.xs }} label={`${uz.result.winner}: ${d.meta.winner}`}>
          <Text style={s.trophy} aria-hidden>★</Text><Text style={s.winLabel}>{uz.result.winner}</Text><Text style={s.winName}>{d.meta.winner}</Text>
          {d.me.outcome === "won" && <Pill label={uz.result.youWon} kind="good" />}
        </Card>) : d ? <Banner kind="info">{uz.result.noWinner}</Banner> : null}
      {d?.meta.endReason === "time" && <Banner kind="warn">{uz.result.timeUp}</Banner>}
      {!d && !err && <Text style={s.muted} accessibilityLiveRegion="polite">{uz.report.loading}</Text>}
      {err === "plus" && <Banner kind="info">{uz.report.plus}</Banner>}
      {err === "fail" && (<View style={{ gap: space.sm }}><Banner kind="bad">{uz.report.failed}</Banner><Button label={uz.report.retry} kind="ghost" onPress={() => setTries((n) => n + 1)} /></View>)}
      {d && <ReportView data={d} />}
      {d && <View style={s.actions}>
        <View style={s.actionCell}><Button label={uz.report.csv} kind="ghost" onPress={download} /></View>
        <View style={s.actionCell}><Button label={uz.report.history} kind="ghost" onPress={() => setHist(true)} /></View>
      </View>}
      {csvErr && <Banner kind="bad">{uz.report.csvFailed}</Banner>}
      {acc && <Card accent="green" label={uz.ledger.accuracy}><Text style={s.winLabel}>{uz.ledger.accuracy}</Text><Text style={s.winName} testID="calc-accuracy">{acc.pct} %</Text><Text style={s.muted}>{acc.firstTry} / {acc.total} {uz.history.accuracyOf}. {uz.history.accuracyNote}</Text></Card>}
      <Button label={uz.result.home} onPress={onHome} />
      {hist && <HistoryDetail http={http} code={code} onClose={() => setHist(false)} />}
    </Screen>
  );
}
const s = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space.md }, actionCell: { flexGrow: 1, flexBasis: 240 },
  muted: { color: tone.muted, fontSize: font.md }, trophy: { fontSize: 36, color: color.gold }, winLabel: { color: tone.muted, fontWeight: "700", fontSize: font.sm, textTransform: "uppercase", letterSpacing: 1 }, winName: { color: color.navy, fontSize: font.xxl, fontWeight: "800", textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md }, cell: { flexGrow: 1, flexBasis: 300 },
  nameRow: { flexDirection: "row", gap: space.sm, alignItems: "center", flexWrap: "wrap" }, name: { fontWeight: "800", color: color.navy, fontSize: font.lg },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space.md, rowGap: space.lg },
  chartRow: { flexDirection: "row", gap: space.sm }, axis: { justifyContent: "space-between", alignItems: "flex-end" }, axisT: { color: tone.muted, fontSize: 11, fontWeight: "600" },
  chart: { flex: 1, flexDirection: "row", gap: 2, borderBottomWidth: 1, borderBottomColor: color.line }, col: { flex: 1 }, bar: { width: "100%", borderTopLeftRadius: 2, borderTopRightRadius: 2 },
});
