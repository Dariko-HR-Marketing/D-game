import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import type { Http } from "../net/http";
import { deltasOf, filterEvents, titleOf, whyOf, type HEv, type HView } from "../history";
import { uz } from "../i18n/uz";
import { color, font, HEADER_H, MIN_TAP, radius, space, surface, tone } from "../theme";

function Chip({ label, kind = "plain" }: { label: string; kind?: "good" | "bad" | "plain" }) {
  const fg = kind === "good" ? tone.good : kind === "bad" ? tone.bad : color.navy;
  return <View style={[s.chip, { backgroundColor: surface[kind] }]}><Text style={[s.chipT, { color: fg }]}>{label}</Text></View>;
}

function Row({ e }: { e: HEv }) {
  const why = whyOf(e), ds = deltasOf(e);
  return (
    <View style={[s.row, e.mine && s.mine]} role="listitem" testID="history-row">
      <View style={s.num}><Text style={s.numT}>{e.n}</Text></View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={s.top}><Text style={s.who}>{e.by}</Text><Text style={s.meta}>{uz.history.round} {e.round} · {e.after.months} {uz.history.month}</Text></View>
        <Text style={s.title}>{titleOf(e)}</Text>
        {why.map((w, i) => <Text key={i} style={s.why}>• {w}</Text>)}
        {ds.length > 0 && <View style={s.chips}>{ds.map((d) => <Chip key={d.label} label={`${d.label} ${d.value}`} kind={d.kind} />)}</View>}
        {(e.assetsAdded.length > 0 || e.assetsLost.length > 0) && <View style={s.chips}>
          {e.assetsAdded.map((c) => <Chip key={"a" + c} label={`${uz.history.added}: ${c}`} kind="good" />)}{e.assetsLost.map((c) => <Chip key={"l" + c} label={`${uz.history.lost}: ${c}`} kind="bad" />)}</View>}
      </View>
    </View>
  );
}

/** Har bir amal tarixi: qaysi katakdan qayerga, qaysi karta, qanday qaror, pul o'zgarishi va sabab. Tahlil uchun CSV ham beriladi. */
export function HistoryDetail({ http, code, onClose }: { http: Http; code: string; onClose: () => void }) {
  const { width } = useWindowDimensions(); const wide = width >= 900;
  const [h, setH] = useState<HView | null>(null); const [err, setErr] = useState(false); const [onlyMine, setOnlyMine] = useState(true);
  useEffect(() => { http.gameLog(code).then(setH).catch(() => setErr(true)); }, [http, code]);
  useEffect(() => { const d = (globalThis as any).document; if (!d?.addEventListener) return; const k = (e: any) => { if (e.key === "Escape") onClose(); }; d.addEventListener("keydown", k); return () => d.removeEventListener("keydown", k); }, [onClose]);
  const list = useMemo(() => (h ? filterEvents(h.events, onlyMine) : []), [h, onlyMine]);
  const download = async () => {
    const d = (globalThis as any).document; if (!d) return;
    const text = await http.gameLogCsv(code); const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    const a = d.createElement("a"); a.href = url; a.download = `poyga-${code}.csv`; d.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };
  return (
    <View style={s.overlay} role="dialog" aria-modal aria-label={uz.history.title} testID="history-detail">
      <View style={s.bar}>
        <Text style={s.barT} aria-level={1} accessibilityRole="header">{uz.history.title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={uz.history.close} onPress={onClose} style={s.x} testID="history-close"><Text style={s.xT} aria-hidden>✕</Text></Pressable>
      </View>
      <ScrollView tabIndex={0} role="region" aria-label={uz.history.title} contentContainerStyle={[s.body, wide && { maxWidth: 900 }]}>
        <Text style={s.hint}>{uz.history.hint}</Text>
        <View style={s.tools}>
          {[true, false].map((v) => <Pressable key={String(v)} accessibilityRole="button" aria-pressed={onlyMine === v} onPress={() => setOnlyMine(v)} style={[s.tab, onlyMine === v && s.tabOn]} testID={v ? "history-mine" : "history-all"}><Text style={[s.tabT, onlyMine === v && { color: color.white }]}>{v ? uz.history.mine : uz.history.all}</Text></Pressable>)}
          <View style={{ flex: 1 }} />
          {h && <Pressable accessibilityRole="button" onPress={download} style={s.tab} testID="history-csv"><Text style={s.tabT}>{uz.history.csv}</Text></Pressable>}
        </View>
        {!h && !err && <Text style={s.hint} accessibilityLiveRegion="polite">{uz.history.loading}</Text>}
        {err && <Text style={[s.hint, { color: tone.bad }]}>{uz.history.error}</Text>}
        {h?.truncated && <Text style={s.hint}>{uz.history.truncated}</Text>}
        {h && list.length === 0 && <Text style={s.hint}>{uz.history.empty}</Text>}
        {h && list.length > 0 && <Text style={s.hint}>{list.length} {uz.history.count}</Text>}
        <View role="list" style={{ gap: space.sm }}>{list.map((e) => <Row key={e.seq} e={e} />)}</View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color.bg, zIndex: 90 },
  bar: { minHeight: HEADER_H, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, backgroundColor: color.white, borderBottomWidth: 1, borderBottomColor: "#E6ECEF" }, barT: { color: color.navy, fontWeight: "800", fontSize: font.xl },
  x: { width: MIN_TAP, height: MIN_TAP, alignItems: "center", justifyContent: "center" }, xT: { color: tone.muted, fontSize: font.xl, fontWeight: "800" },
  body: { padding: space.lg, gap: space.md, width: "100%", alignSelf: "center", paddingBottom: space.xxl },
  hint: { color: tone.muted, fontSize: font.sm, lineHeight: 19 },
  tools: { flexDirection: "row", gap: space.sm, alignItems: "center", flexWrap: "wrap" },
  tab: { minHeight: MIN_TAP, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.navy, alignItems: "center", justifyContent: "center", backgroundColor: color.white }, tabOn: { backgroundColor: color.navy }, tabT: { color: color.navy, fontWeight: "800", fontSize: font.sm },
  row: { flexDirection: "row", gap: space.md, backgroundColor: color.white, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: "#E6ECEF" }, mine: { borderColor: color.green, borderWidth: 1.5 },
  num: { width: 34, height: 34, borderRadius: 17, backgroundColor: surface.info, alignItems: "center", justifyContent: "center" }, numT: { color: color.navy, fontWeight: "800", fontSize: font.xs, fontVariant: ["tabular-nums"] },
  top: { flexDirection: "row", justifyContent: "space-between", gap: space.sm, flexWrap: "wrap" }, who: { color: color.navy, fontWeight: "800", fontSize: font.sm }, meta: { color: tone.muted, fontSize: font.xs },
  title: { color: color.navy, fontWeight: "800", fontSize: font.md }, why: { color: color.text2, fontSize: font.sm, lineHeight: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill }, chipT: { fontSize: 12, fontWeight: "800", fontVariant: ["tabular-nums"] },
});
