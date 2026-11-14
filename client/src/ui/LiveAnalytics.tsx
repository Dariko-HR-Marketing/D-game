import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import type { Http } from "../net/http";
import { LineChart, type ChartSeries } from "./LineChart";
import { Bar, Radar } from "./LiveCharts";
import { LiveTheory } from "./LiveTheory";
import { Cell, Grid, Hint, Tbl, scale100 } from "./LiveKit";
import { Card, Pill, SectionTitle } from "./kit";
import { colorOf, coverOf, pct, radarOf, type LiveP, type LiveView } from "../live";
import { chartPoints, insightText, timeText } from "../report";
import { money } from "../format";
import { uz } from "../i18n/uz";
import { color, font, HEADER_H, MIN_TAP, radius, space, tone } from "../theme";

const T = uz.live;
type Tab = "overview" | "player" | "market" | "compare" | "theory";

const series = (view: LiveView, pick: (p: any) => number, only?: LiveP[]): ChartSeries[] => (only ?? view.players).map((p) => ({ id: p.id, label: p.name, color: colorOf(view, p.id), points: chartPoints(p.series, pick) }));
const Legend = ({ view, only }: { view: LiveView; only?: LiveP[] }) => <View style={s.legend}>{(only ?? view.players).map((p) => <View key={p.id} style={s.legItem}><View style={[s.dot, { backgroundColor: colorOf(view, p.id) }]} /><Text style={s.legT}>{p.name}</Text></View>)}</View>;
const circleLabel = (p: LiveP) => (p.circle === "big" ? T.big : T.small);

function Overview({ view }: { view: LiveView }) {
  const ranked = [...view.players].sort((a, b) => a.rank - b.rank);
  return (
    <View style={s.col}>
      <Grid>
        <Cell><Card><SectionTitle>{T.over.net}</SectionTitle><LineChart series={series(view, (x) => x.netWorth)} ariaLabel={T.over.net} xLabel={T.cols.month} height={220} /><Legend view={view} /></Card></Cell>
        <Cell><Card>
          <SectionTitle>{T.over.cover}</SectionTitle>
          {ranked.map((p) => { const c = coverOf(p); return (
            <View key={p.id} style={{ marginTop: space.sm }}><View style={s.rowBetween}><Text style={s.bold}>{p.name}</Text><Text style={s.num}>{Math.round(c * 100)}%</Text></View><Bar parts={[{ pct: c * 100, color: colorOf(view, p.id) }]} ariaLabel={`${p.name}: ${Math.round(c * 100)}%`} /></View>); })}
          <Hint>{T.over.coverNote}</Hint>
        </Card></Cell>
      </Grid>
      <Card>
        <SectionTitle>{T.over.now}</SectionTitle>
        <Tbl head={[T.cols.player, T.cols.circle, T.cols.cash, T.cols.flow, T.cols.passive, T.cols.expenses, T.cols.debt, T.cols.net]} min={640}
          rows={ranked.map((p) => [<Text key="n" style={s.bold}>{p.rank}. {p.name}{p.isMe ? ` ${T.you}` : ""}</Text>, <Pill key="c" label={circleLabel(p)} kind={p.circle === "big" ? "good" : "plain"} />, money(p.final.cash), <Text key="f" style={[s.tdT, { color: p.final.cashflow >= 0 ? tone.good : tone.bad }]}>{money(p.final.cashflow)}</Text>, money(p.final.passive), money(p.final.expenses), money(p.final.debt), money(p.final.netWorth)])} />
      </Card>
    </View>);
}

type MetricKey = "cashflow" | "passive" | "cash" | "expenses" | "debt" | "netWorth";
function PlayerView({ view, p }: { view: LiveView; p: LiveP }) {
  const [metric, setMetric] = useState<MetricKey>("cashflow"); const f = p.final, ids = Object.keys(T.pl.metrics) as MetricKey[];
  const groups = Object.entries(p.decisions.byGroup).filter(([, g]) => g.shown + g.forced > 0);
  const held = p.assets.filter((a) => a.status === "held"), shown = (held.length ? held : p.assets).slice(-8);
  return (
    <View style={s.col}>
      <Card>
        <View style={s.rowWrap}><View style={[s.dot, { backgroundColor: colorOf(view, p.id), width: 16, height: 16 }]} /><Text style={s.h2}>{p.name}{p.isMe ? ` ${T.you}` : ""}</Text><Pill label={circleLabel(p)} kind={p.circle === "big" ? "good" : "plain"} /><Pill label={`${p.rank}${T.rankN}`} kind="info" /><Pill label={T.cmp.style[p.style]} kind={p.style === "active" ? "warn" : "plain"} /><Text style={s.muted}>{timeText(p.months)}</Text></View>
        <View style={s.kpis}>{[[T.cols.cash, money(f.cash)], [T.cols.flow, money(f.cashflow)], [T.cols.passive, money(f.passive)], [T.cols.net, money(f.netWorth)], [T.cols.quiz, p.quizPct === null ? "—" : `${p.quizPct}%`], [T.cols.level, `${p.level}/4`]].map(([l, v]) => <View key={l} style={s.kpi}><Text style={s.kpiV}>{v}</Text><Text style={s.kpiL}>{l}</Text></View>)}</View>
      </Card>
      <Grid>
        <Cell><Card>
          <SectionTitle>{T.pl.dynamics}</SectionTitle>
          <View style={s.chips}>{ids.map((k) => <Pressable key={k} accessibilityRole="button" aria-pressed={metric === k} onPress={() => setMetric(k)} style={[s.chip, metric === k && s.chipOn]}><Text style={[s.chipT, metric === k && { color: color.white }]}>{T.pl.metrics[k]}</Text></Pressable>)}</View>
          <LineChart series={series(view, (x) => x[metric], [p])} ariaLabel={T.pl.metrics[metric]} xLabel={T.cols.month} height={200} />
        </Card></Cell>
        <Cell><Card>
          <SectionTitle>{T.pl.attention}</SectionTitle>
          {groups.length === 0 && <Hint>{T.empty}</Hint>}
          {groups.map(([k, g]) => { const tot = Math.max(1, g.shown); return (
            <View key={k} style={{ marginTop: space.sm }}><View style={s.rowBetween}><Text style={s.bold}>{(T.pl.groups as Record<string, string>)[k]}</Text><Text style={s.num}>{g.accepted} {T.pl.took} · {g.skipped} {T.pl.skipped}{g.forced ? ` · ${g.forced} ${T.pl.forced}` : ""}</Text></View><Bar parts={[{ pct: (g.accepted / tot) * 100, color: tone.good }, { pct: (g.skipped / tot) * 100, color: color.gold }]} ariaLabel={(T.pl.groups as Record<string, string>)[k]} /></View>); })}
        </Card></Cell>
      </Grid>
      <Grid>
        <Cell><Card>
          <SectionTitle>{T.pl.assets}</SectionTitle>
          {shown.length === 0 ? <Hint>{T.pl.noAssets}</Hint> : <Tbl min={560} head={[T.cols.asset, T.cols.month, T.cols.price, T.cols.income, T.cols.yearly, T.cols.payback, T.cols.channel]}
            rows={shown.map((a) => [a.name ?? a.code, a.boughtMonth, money(a.price), money(a.income), a.price > 0 ? `${((a.income * 12 * 100) / a.price).toFixed(1)}%` : "—", a.paybackMonths === null ? "—" : `${a.paybackMonths} ${T.monthN}`, (T.mk.ch as Record<string, string>)[a.channel ?? "karta"]])} />}
        </Card></Cell>
        <Cell><Card>
          <SectionTitle>{T.pl.why}</SectionTitle>
          <View style={{ gap: space.sm }}>{p.insights.length === 0 && <Hint>{T.empty}</Hint>}{p.insights.map((i, k) => <View key={k} style={[s.why, { borderLeftColor: i.level === "good" ? tone.good : i.level === "warn" ? color.gold : color.line }]}><Text style={s.whyT}>{insightText(i as any)}</Text></View>)}</View>
        </Card></Cell>
      </Grid>
    </View>);
}

function Market({ view }: { view: LiveView }) {
  const g = view.group, mx = Math.max(1, ...g.volume.flatMap((v) => [v.bought, v.sold])), chs = Object.entries(g.channels);
  return (
    <View style={s.col}>
      <Grid>
        <Cell><Card><SectionTitle>{T.mk.crisis}</SectionTitle><LineChart series={[{ id: "crisis", label: T.mk.crisis, color: color.red, points: g.crisisShare.map((x) => ({ x: x.month, y: Math.round(x.share * 100) })) }, scale100(g.crisisShare)]} ariaLabel={T.mk.crisis} xLabel={T.cols.month} height={180} /><Hint>{T.mk.crisisNote}</Hint></Card></Cell>
        <Cell><Card>
          <SectionTitle>{T.mk.volume}</SectionTitle>
          {g.volume.map((v) => <View key={v.from} style={{ marginTop: space.sm }}><View style={s.rowBetween}><Text style={s.bold}>{v.from}–{v.to} {T.mk.period}</Text><Text style={s.num}>{v.bought} {T.mk.bought} · {v.sold} {T.mk.sold}</Text></View><Bar parts={[{ pct: (v.bought / mx) * 50, color: tone.good }, { pct: (v.sold / mx) * 50, color: color.gold }]} ariaLabel={`${v.from}–${v.to}`} /></View>)}
        </Card></Cell>
      </Grid>
      <Grid>
        <Cell><Card><SectionTitle>{T.mk.kinds}</SectionTitle>{g.kinds.length === 0 ? <Hint>{T.mk.none}</Hint> : <Tbl min={360} head={[T.cols.asset, T.mk.bought, T.pl.held, T.pl.sold]} rows={g.kinds.map((k) => [(uz.fx.assetKinds as Record<string, string>)[k.kind] ?? k.kind, k.bought, k.held, k.sold])} />}</Card></Cell>
        <Cell><Card><SectionTitle>{T.mk.channels}</SectionTitle>{chs.map(([k, n]) => <View key={k} style={s.rowBetween}><Text style={s.bold}>{(T.mk.ch as Record<string, string>)[k]}</Text><Text style={s.num}>{n}</Text></View>)}</Card></Cell>
      </Grid>
    </View>);
}

function Compare({ view }: { view: LiveView }) {
  const axes = Object.values(T.cmp.axes);
  return (
    <View style={s.col}>
      <Grid>
        <Cell><Card><SectionTitle>{T.cmp.radar}</SectionTitle><Radar axes={axes} series={view.players.map((p) => ({ id: p.name, color: colorOf(view, p.id), values: radarOf(p) }))} ariaLabel={T.cmp.radar} /><Legend view={view} /><Hint>{T.cmp.radarNote}</Hint></Card></Cell>
        <Cell><Card><SectionTitle>{T.cmp.styles}</SectionTitle>
          <Tbl min={460} head={[T.cols.player, T.cols.style, T.cols.quiz, T.cols.auto, T.cols.risk]} rows={view.players.map((p) => [<Text key="n" style={s.bold}>{p.name}</Text>, T.cmp.style[p.style], p.quizPct === null ? "—" : `${p.quizPct}%`, String(p.decisions.auto), p.risks.restarts ? <Pill key="r" label={`${p.risks.restarts}×`} kind="bad" /> : p.risks.unemployedMonths ? <Pill key="u" label={`${p.risks.unemployedMonths} ${T.monthN}`} kind="warn" /> : <Pill key="o" label="OK" kind="good" />])} />
          <Hint>{T.cmp.styleNote}</Hint></Card></Cell>
      </Grid>
    </View>);
}

/** Jonli tahlil ekrani: o'yin davomida hamma o'yinchi, bozor va nazariy matritsalar. Har harakatdan keyin (tick) yangilanadi. */
export function LiveAnalytics({ http, code, tick, onClose }: { http: Http; code: string; tick: number; onClose: () => void }) {
  const { width } = useWindowDimensions(); const [view, setView] = useState<LiveView | null>(null), [err, setErr] = useState(false), [tab, setTab] = useState<Tab>("overview"), [sel, setSel] = useState<string | null>(null);
  const load = useCallback(() => { http.gameLive(code).then((v: LiveView) => { setView(v); setErr(false); }).catch(() => setErr(true)); }, [http, code]);
  useEffect(() => { const h = setTimeout(load, 700); return () => clearTimeout(h); }, [load, tick]); // har harakatdan keyin (ketma-ket o'zgarishlar bitta so'rovga birlashadi)
  useEffect(() => { const i = setInterval(load, 20000); return () => clearInterval(i); }, [load]);
  useEffect(() => { const d = (globalThis as any).document; if (!d?.addEventListener) return; const k = (e: any) => { if (e.key === "Escape") onClose(); }; d.addEventListener("keydown", k); return () => d.removeEventListener("keydown", k); }, [onClose]);
  const me = view?.players.find((p) => p.isMe), cur = view ? view.players.find((p) => p.id === sel) ?? me ?? view.players[0] : null;
  const kpis = useMemo(() => { if (!view) return []; const ps = view.players, avg = ps.length ? ps.reduce((x, p) => x + p.final.cashflow, 0) / ps.length : 0, crisis = view.group.crisisShare[view.group.crisisShare.length - 1]?.share ?? 0;
    return [[T.kpi.players, String(ps.length)], [T.kpi.flow, money(Math.round(avg))], [T.kpi.big, `${ps.filter((p) => p.circle === "big").length}/${ps.length}`], [T.kpi.first, [...ps].sort((a, b) => a.rank - b.rank)[0]?.name ?? "—"], [T.kpi.market, crisis > 0 ? `${T.kpi.crisis} ${pct(crisis)}` : T.kpi.normal], [T.kpi.months, String(view.meta.months)]]; }, [view]);
  const tabs: Tab[] = ["overview", "player", "market", "compare", "theory"];
  return (
    <View style={s.overlay} role="dialog" aria-modal aria-label={T.title} testID="live-analytics">
      <View style={s.bar}>
        <Text style={s.barT} aria-level={1} accessibilityRole="header">{T.title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={T.close} onPress={onClose} style={s.x} testID="live-close"><Text style={s.xT} aria-hidden>✕</Text></Pressable>
      </View>
      <ScrollView tabIndex={0} role="region" aria-label={T.title} contentContainerStyle={[s.body, width >= 1500 && { maxWidth: 1360 }]}>
        <Text style={s.hint}>{T.hint}</Text>
        {!view && !err && <Text style={s.hint} accessibilityLiveRegion="polite">{T.loading}</Text>}
        {err && !view && <View style={s.rowWrap}><Text style={[s.hint, { color: tone.bad }]}>{T.error}</Text><Pressable accessibilityRole="button" onPress={load} style={s.chip}><Text style={s.chipT}>{T.refresh}</Text></Pressable></View>}
        {view && view.players.length === 0 && <Text style={s.hint}>{T.empty}</Text>}
        {view && cur && (
          <View style={s.col}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.strip} testID="live-kpis">{kpis.map(([l, v]) => <View key={l} style={s.kpi}><Text style={s.kpiV} numberOfLines={1}>{v}</Text><Text style={s.kpiL}>{l}</Text></View>)}</ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.strip} testID="live-players">
              {[...view.players].sort((a, b) => a.rank - b.rank).map((p) => <Pressable key={p.id} accessibilityRole="button" aria-pressed={p.id === cur.id} onPress={() => { setSel(p.id); if (tab === "overview" || tab === "market" || tab === "compare") setTab("player"); }} style={[s.pl, p.id === cur.id && s.plOn]} testID={`live-player-${p.rank}`}>
                <View style={[s.dot, { backgroundColor: colorOf(view, p.id) }]} /><View><Text style={s.bold} numberOfLines={1}>{p.rank}. {p.name}{p.isMe ? ` ${T.you}` : ""}</Text><Text style={s.muted} numberOfLines={1}>{T.cols.flow.toLowerCase()} {money(p.final.cashflow)}</Text></View><Pill label={circleLabel(p)} kind={p.circle === "big" ? "good" : "plain"} /></Pressable>)}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.strip} role="tablist" testID="live-tabs">{tabs.map((k) => <Pressable key={k} role="tab" accessibilityRole="tab" aria-selected={tab === k} onPress={() => setTab(k)} style={[s.tab, tab === k && s.tabOn]} testID={`live-tab-${k}`}><Text style={[s.tabT, tab === k && { color: color.white }]}>{T.tabs[k]}</Text></Pressable>)}</ScrollView>
            {tab === "overview" && <Overview view={view} />}
            {tab === "player" && <PlayerView view={view} p={cur} />}
            {tab === "market" && <Market view={view} />}
            {tab === "compare" && <Compare view={view} />}
            {tab === "theory" && <LiveTheory view={view} p={cur} />}
          </View>)}
      </ScrollView>
    </View>);
}

const s = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color.bg, zIndex: 90 },
  bar: { minHeight: HEADER_H, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, backgroundColor: color.white, borderBottomWidth: 1, borderBottomColor: "#E6ECEF" },
  barT: { color: color.navy, fontWeight: "800", fontSize: font.lg }, x: { width: MIN_TAP, height: MIN_TAP, alignItems: "center", justifyContent: "center" }, xT: { color: tone.muted, fontSize: font.xl, fontWeight: "800" },
  body: { padding: space.lg, gap: space.md, width: "100%", maxWidth: 1180, alignSelf: "center", paddingBottom: space.xxxl },
  hint: { color: tone.muted, fontSize: font.sm, lineHeight: 19, marginTop: space.xs }, muted: { color: tone.muted, fontSize: font.xs }, h2: { color: color.navy, fontWeight: "900", fontSize: font.xl },
  col: { gap: space.md, width: "100%" }, grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md, width: "100%" }, cell: { flexGrow: 1, flexBasis: 340, minWidth: 0 },
  strip: { gap: space.sm, paddingVertical: 2, alignItems: "stretch" },
  kpis: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm }, kpi: { minWidth: 132, backgroundColor: color.white, borderRadius: radius.md, borderWidth: 1, borderColor: "#E6ECEF", paddingVertical: 8, paddingHorizontal: space.md },
  kpiV: { color: color.navy, fontWeight: "900", fontSize: font.lg, fontVariant: ["tabular-nums"] }, kpiL: { color: tone.muted, fontSize: font.xs },
  pl: { minWidth: 220, minHeight: 56, flexDirection: "row", gap: space.sm, alignItems: "center", paddingHorizontal: space.md, backgroundColor: color.white, borderRadius: radius.md, borderWidth: 1.5, borderColor: "#E6ECEF" }, plOn: { borderColor: color.green },
  tab: { minHeight: MIN_TAP, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.navy, alignItems: "center", justifyContent: "center", backgroundColor: color.white }, tabOn: { backgroundColor: color.navy }, tabT: { color: color.navy, fontWeight: "800", fontSize: font.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.sm }, chip: { minHeight: MIN_TAP, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.line, alignItems: "center", justifyContent: "center", backgroundColor: color.white }, chipOn: { backgroundColor: color.navy, borderColor: color.navy }, chipT: { color: color.navy, fontWeight: "700", fontSize: font.sm },
  dot: { width: 12, height: 12, borderRadius: 6 }, legend: { flexDirection: "row", flexWrap: "wrap", gap: space.md, marginTop: space.sm }, legItem: { flexDirection: "row", alignItems: "center", gap: 6 }, legT: { color: tone.muted, fontSize: font.sm },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", gap: space.sm, flexWrap: "wrap" }, rowWrap: { flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
  bold: { color: color.navy, fontWeight: "800", fontSize: font.sm }, num: { color: color.navy, fontVariant: ["tabular-nums"], fontWeight: "700", fontSize: font.sm },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E6ECEF", alignItems: "center", gap: space.sm, paddingVertical: 7 }, th: { flex: 1, color: tone.muted, fontSize: font.xs, fontWeight: "700" }, td: { flex: 1, justifyContent: "center", alignItems: "flex-start" }, tdT: { color: color.navy, fontSize: font.sm, fontVariant: ["tabular-nums"] },
  why: { borderLeftWidth: 3, paddingLeft: space.sm, paddingVertical: 4, backgroundColor: "#F2F5F8", borderRadius: 4 }, whyT: { color: color.navy, fontSize: font.sm, lineHeight: 19 },
});
