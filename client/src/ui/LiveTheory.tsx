import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Linking } from "react-native";
import { Scatter } from "./LiveCharts";
import { Bar } from "./LiveCharts";
import { LineChart } from "./LineChart";
import { Cell, Grid, Hint, Note, Tbl } from "./LiveKit";
import { Card, Pill, SectionTitle } from "./kit";
import { colorOf, fill, pct, signedPct, type LiveP, type LiveView } from "../live";
import { successClass, type SuccessClass } from "@tajriba24/rules";
import { money } from "../format";
import { uz } from "../i18n/uz";
import { color, font, MIN_TAP, radius, space, tone } from "../theme";

const T = uz.live, TH = T.th;
type FwKey = keyof typeof TH.fw;
const FW_NEEDS_PLAYER: FwKey[] = ["bcg", "ansoff", "funnel", "swot", "prospect"];
const na = TH.dupont.na;
const short = (t: string, n = 18) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
const num = (v: number | null, d = 2) => (v === null ? na : v.toFixed(d));

const KIND_TONE: Record<string, "good" | "info" | "warn" | "bad"> = { star: "good", cow: "info", question: "warn", dog: "bad" };

function Dupont({ view }: { view: LiveView }) {
  const D = TH.dupont;
  return (
    <Grid>
      <Cell><Card>
        <SectionTitle>{D.title}</SectionTitle>
        <Tbl min={640} head={[T.cols.player, D.margin, "×", D.turn, "×", D.lev, "=", D.roe]} rows={view.players.map((p) => [<Text key="n" style={s.bold}>{p.name}</Text>, p.dupont.netMargin === null ? na : pct(p.dupont.netMargin), "×", num(p.dupont.assetTurn), "×", num(p.dupont.leverage), "=", <Text key="r" style={s.bold}>{p.dupont.roe === null ? na : pct(p.dupont.roe)}</Text>])} />
        <Note label={TH.asos}>{D.src}</Note><Note label={TH.hypo}>{D.hypo}</Note>
      </Card></Cell>
      <Cell><Card>
        <SectionTitle>{D.margin} · {D.lev}</SectionTitle>
        {view.players.map((p) => <View key={p.id} style={{ marginTop: space.sm }}><View style={s.rowBetween}><Text style={s.bold}>{p.name}</Text><Text style={s.num}>{D.margin.toLowerCase()} {p.dupont.netMargin === null ? na : pct(p.dupont.netMargin)} · {D.lev.toLowerCase()} {num(p.dupont.leverage, 1)}×</Text></View><Bar parts={[{ pct: Math.max(0, Math.min(100, (p.dupont.netMargin ?? 0) * 100)), color: colorOf(view, p.id) }]} ariaLabel={p.name} /></View>)}
        <Hint>{D.tipMargin} · {D.tipTurn} · {D.tipLev}</Hint>
      </Card></Cell>
    </Grid>);
}
function Bcg({ view, p }: { view: LiveView; p: LiveP }) {
  const B = TH.bcg, pts = p.bcg.map((b) => ({ id: b.code, x: b.share, y: b.yieldPct, r: 6 + Math.sqrt(b.price) / 14, color: colorOf(view, p.id), label: short(b.name ?? b.code), title: `${b.name ?? b.code}: ${Math.round(b.share * 100)}%, ${b.yieldPct}%` }));
  const yMed = p.bcg.length ? p.bcg.reduce((x, b) => x + b.income, 0) * 12 / p.bcg.reduce((x, b) => x + b.price, 0) * 100 : null;
  return (
    <Grid>
      <Cell><Card><SectionTitle>{B.title}: {p.name}</SectionTitle>{pts.length ? <Scatter points={pts} vx={1 / p.bcg.length} hy={yMed} fx={(v) => `${Math.round(v * 100)}%`} fy={(v) => `${v.toFixed(0)}%`} xLabel={B.x} yLabel={B.y} quads={[B.q.question, B.q.star, B.q.dog, B.q.cow]} ariaLabel={B.title} /> : <Hint>{uz.live.pl.noAssets}</Hint>}<Note label={TH.asos}>{B.src}</Note></Card></Cell>
      <Cell><Card><SectionTitle>{T.pl.assets}</SectionTitle>{p.bcg.length === 0 ? <Hint>{T.pl.noAssets}</Hint> : <View style={{ gap: space.sm }}>{p.bcg.map((b) => <View key={b.code} style={s.item}><View style={s.rowBetween}><Text style={s.bold}>{b.name ?? b.code}</Text><Pill label={B.q[b.quadrant]} kind={KIND_TONE[b.quadrant]} /></View><Text style={s.muted}>{Math.round(b.share * 100)}% · {b.yieldPct}% · {B.hint[b.quadrant]}</Text></View>)}</View>}</Card></Cell>
    </Grid>);
}
function Risk({ view }: { view: LiveView }) {
  const R = TH.risk, pts = view.players.filter((p) => p.riskReturn.debtShare !== null && p.riskReturn.yieldPct !== null).map((p) => ({ id: p.id, x: p.riskReturn.debtShare as number, y: p.riskReturn.yieldPct as number, r: 9, color: colorOf(view, p.id), label: p.name, title: `${p.name}: ${pct(p.riskReturn.debtShare)} · ${p.riskReturn.yieldPct}%` }));
  return (
    <Grid>
      <Cell><Card><SectionTitle>{R.title}</SectionTitle>{pts.length ? <Scatter points={pts} vx={view.group.medianDebtShare} hy={view.group.medianYield} fx={(v) => `${Math.round(v * 100)}%`} fy={(v) => `${v.toFixed(0)}%`} xLabel={R.x} yLabel={R.y} quads={R.q as [string, string, string, string]} ariaLabel={R.title} /> : <Hint>{T.pl.noAssets}</Hint>}<Note label={TH.asos}>{R.src}</Note></Card></Cell>
      <Cell><Card><SectionTitle>{R.title}</SectionTitle><Tbl min={380} head={[T.cols.player, R.x, R.y]} rows={view.players.map((p) => [<Text key="n" style={s.bold}>{p.name}</Text>, pct(p.riskReturn.debtShare), p.riskReturn.yieldPct === null ? na : `${p.riskReturn.yieldPct}%`])} /></Card></Cell>
    </Grid>);
}
function Ansoff({ view, p }: { view: LiveView; p: LiveP }) {
  const A = TH.ansoff, c = p.ansoff, cell = (k: keyof typeof c, bg: string) => <View style={[s.quad, { backgroundColor: bg }]}><Text style={s.bold}>{A[k]}</Text><Text style={s.big}>{c[k]}</Text><Text style={s.muted}>{A.hint[k]}</Text></View>;
  return (
    <Grid>
      <Cell><Card>
        <SectionTitle>{A.title}: {p.name}</SectionTitle>
        <View style={s.rowWrap}><View style={s.half}><Text style={s.muted}>{A.colOld}</Text></View><View style={s.half}><Text style={s.muted}>{A.colNew}</Text></View></View>
        <View style={s.rowWrap}><View style={s.half}>{cell("penetration", "#E7F4EE")}</View><View style={s.half}>{cell("channel", "#E8F0F8")}</View></View>
        <View style={s.rowWrap}><View style={s.half}>{cell("product", "#FFF6DD")}</View><View style={s.half}>{cell("diversification", "#F8E8E9")}</View></View>
        <Hint>{A.rowOld} ↑ · {A.rowNew} ↓</Hint><Note label={TH.asos}>{A.src}</Note>
      </Card></Cell>
      <Cell><Card><SectionTitle>{T.tabs.compare}</SectionTitle>{view.players.map((q) => { const m = q.ansoff, t = Math.max(1, m.penetration + m.channel + m.product + m.diversification); return <View key={q.id} style={{ marginTop: space.sm }}><View style={s.rowBetween}><Text style={s.bold}>{q.name}</Text><Text style={s.num}>{m.penetration}/{m.channel}/{m.product}/{m.diversification}</Text></View><Bar parts={[{ pct: (m.penetration / t) * 100, color: tone.good }, { pct: (m.channel / t) * 100, color: "#2B6CB0" }, { pct: (m.product / t) * 100, color: color.gold }, { pct: (m.diversification / t) * 100, color: color.red }]} ariaLabel={q.name} /></View>; })}<Hint>{A.penetration} / {A.channel} / {A.product} / {A.diversification}</Hint></Card></Cell>
    </Grid>);
}
function Cycle({ view }: { view: LiveView }) {
  const C = TH.cycle, g = view.group;
  return (
    <Grid>
      <Cell><Card><SectionTitle>{T.mk.crisis}</SectionTitle><LineChart series={[{ id: "c", label: T.mk.crisis, color: color.red, points: g.crisisShare.map((x) => ({ x: x.month, y: Math.round(x.share * 100) })) }]} ariaLabel={T.mk.crisis} xLabel={T.cols.month} height={180} /><Note label={TH.asos}>{C.src}</Note><Note label={TH.hypo}>{C.hypo}</Note></Card></Cell>
      <Cell><Card><SectionTitle>{C.title}</SectionTitle>
        <Tbl min={560} head={[T.cols.player, C.before, C.during, C.after, C.period, ""]} rows={view.players.map((p) => [<Text key="n" style={s.bold}>{p.name}</Text>, p.cycle.before, p.cycle.during, p.cycle.after, p.cycle.crisisStart === null ? C.none : `${p.cycle.crisisStart}–${p.cycle.crisisEnd} ${C.months}`, p.cycle.crisisStart === null ? "" : <Pill key="s" label={p.cycle.during > 0 ? C.counter : C.waited} kind={p.cycle.during > 0 ? "good" : "info"} />])} />
      </Card></Cell>
    </Grid>);
}
function Prospect({ view, p }: { view: LiveView; p: LiveP }) {
  const P = TH.prospect, d = p.disposition, tot = d.soldAtLoss + d.soldAtPar + d.soldAtGain;
  return (
    <Grid>
      <Cell><Card><SectionTitle>{P.title}: {p.name}</SectionTitle>
        {tot === 0 ? <Hint>{P.few}</Hint> : <View style={{ gap: space.sm }}>{[[P.loss, d.soldAtLoss, color.red], [P.par, d.soldAtPar, "#8493A2"], [P.gain, d.soldAtGain, tone.good]].map(([l, n, c]) => <View key={String(l)}><View style={s.rowBetween}><Text style={s.bold}>{l}</Text><Text style={s.num}>{n}</Text></View><Bar parts={[{ pct: ((n as number) / tot) * 100, color: c as string }]} ariaLabel={String(l)} /></View>)}</View>}
        <Hint>{P.held}: {d.held} · {P.avg}: {d.heldAvgYield === null ? na : `${d.heldAvgYield}%`}</Hint><Note label={TH.asos}>{P.src}</Note><Note label={TH.hypo}>{P.hypo}</Note>
      </Card></Cell>
      <Cell><Card><SectionTitle>{T.tabs.compare}</SectionTitle><Tbl min={460} head={[T.cols.player, P.loss, P.par, P.gain, P.held]} rows={view.players.map((q) => [<Text key="n" style={s.bold}>{q.name}</Text>, q.disposition.soldAtLoss, q.disposition.soldAtPar, q.disposition.soldAtGain, q.disposition.held])} /></Card></Cell>
    </Grid>);
}
const SC_TONE: Record<SuccessClass, "good" | "warn" | "info" | "bad" | "plain"> = { success: "good", lucky: "warn", stable: "info", fail: "bad", unknown: "plain" };
function Success({ view, p }: { view: LiveView; p: LiveP }) {
  const S = TH.succ, pts = view.players.filter((q) => q.success.growth !== null).map((q) => ({ id: q.id, x: q.success.growth as number, y: q.success.drawdown, r: 9, color: colorOf(view, q.id), label: q.name, title: `${q.name}: ${signedPct(q.success.growth)} · ${pct(q.success.drawdown)}` }));
  return (
    <Grid>
      <Cell><Card><SectionTitle>{S.title}</SectionTitle>{pts.length ? <Scatter points={pts} vx={view.group.medianGrowth} hy={view.group.medianDrawdown} fx={(v) => `${Math.round(v * 100)}%`} fy={(v) => `${Math.round(v * 100)}%`} xLabel={S.x} yLabel={S.y} quads={S.q as [string, string, string, string]} ariaLabel={S.title} /> : <Hint>{T.empty}</Hint>}<Note label={TH.asos}>{S.src}</Note><Note label={TH.hypo}>{S.hypo}</Note></Card></Cell>
      <Cell><Card><SectionTitle>{S.title}</SectionTitle><Tbl min={420} head={[T.cols.player, S.x, S.y, ""]} rows={view.players.map((q) => { const c = successClass(q.success, view.group); return [<Text key="n" style={s.bold}>{q.name}{q.id === p.id ? " •" : ""}</Text>, signedPct(q.success.growth), pct(q.success.drawdown), <Pill key="c" label={S.class[c]} kind={SC_TONE[c]} />]; })} /></Card></Cell>
    </Grid>);
}
function Funnel({ view, p }: { view: LiveView; p: LiveP }) {
  const F = TH.funnel, steps = (q: LiveP) => [[F.shown, q.funnel.shown], [F.accepted, q.funnel.accepted], [F.purchased, q.funnel.purchased], [F.paid, q.funnel.paidBack]] as [string, number][], f = steps(p), r = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : na);
  return (
    <Grid>
      <Cell><Card><SectionTitle>{F.title}: {p.name}</SectionTitle>{f.map(([l, n], i) => <View key={l} style={{ marginTop: space.sm }}><View style={s.rowBetween}><Text style={s.bold}>{l}</Text><Text style={s.num}>{n}{i ? ` · ${r(n, f[i - 1][1])}` : ""}</Text></View><Bar parts={[{ pct: f[0][1] ? (n / f[0][1]) * 100 : 0, color: colorOf(view, p.id) }]} ariaLabel={l} /></View>)}<Note label={TH.asos}>{F.src}</Note><Note label={TH.hypo}>{F.hypo}</Note></Card></Cell>
      <Cell><Card><SectionTitle>{F.conv}</SectionTitle><Tbl min={460} head={[T.cols.player, `${F.accepted} / ${F.shown}`, `${F.purchased} / ${F.accepted}`, `${F.paid} / ${F.purchased}`]} rows={view.players.map((q) => { const g = steps(q); return [<Text key="n" style={s.bold}>{q.name}</Text>, r(g[1][1], g[0][1]), r(g[2][1], g[1][1]), r(g[3][1], g[2][1])]; })} /></Card></Cell>
    </Grid>);
}
function Swot({ p }: { p: LiveP }) {
  const W = TH.swot, items = W.items as Record<string, string>, by = (c: string) => p.swot.filter((x) => x.key.startsWith(c + "_")).map((x) => fill(items[x.key], x.params, money)), box = (title: string, list: string[], bg: string) => <View style={[s.quad, { backgroundColor: bg, flexBasis: 240 }]}><Text style={s.bold}>{title}</Text>{(list.length ? list : [W.none]).map((t, i) => <Text key={i} style={s.li}>• {t}</Text>)}</View>;
  return (
    <Card><SectionTitle>{W.title}: {p.name}</SectionTitle>
      <View style={s.rowWrap}>{box(W.s, by("s"), "#E7F4EE")}{box(W.w, by("w"), "#F8E8E9")}{box(W.o, by("o"), "#E8F0F8")}{box(W.t, by("t"), "#FFF6DD")}</View>
      <Note label={TH.asos}>{W.src}</Note></Card>);
}
function Level({ view }: { view: LiveView }) {
  const L = TH.level, ser = view.players.map((p) => ({ id: p.id, label: p.name, color: colorOf(view, p.id), points: p.levels.map((x) => ({ x: x.month, y: x.level })) })), avg = { id: "avg", label: L.avg, color: color.navy, dash: true, width: 3, points: view.group.levelAvg.map((x) => ({ x: x.month, y: x.avg })) };
  return (
    <Grid>
      <Cell><Card><SectionTitle>{L.title}</SectionTitle><LineChart series={[...ser, avg]} ariaLabel={L.title} xLabel={T.cols.month} height={220} /><View style={s.legend}>{view.players.map((p) => <View key={p.id} style={s.legItem}><View style={[s.dot, { backgroundColor: colorOf(view, p.id) }]} /><Text style={s.muted}>{p.name}</Text></View>)}<Text style={s.muted}>— {L.avg}</Text></View><Note label={TH.asos}>{L.src}</Note><Note label={TH.hypo}>{L.hypo}</Note></Card></Cell>
      <Cell><Card><SectionTitle>{L.now}</SectionTitle>{view.players.map((p) => <View key={p.id} style={[s.item, { marginBottom: space.sm }]}><View style={s.rowBetween}><Text style={s.bold}>{p.name}</Text><Pill label={`${p.level}/4`} kind={p.level >= 3 ? "good" : p.level >= 2 ? "info" : "warn"} /></View><Text style={s.muted}>{L.scale[p.level]}</Text></View>)}</Card></Cell>
    </Grid>);
}
function Sources() {
  const S = TH.src;
  return <Card><SectionTitle>{S.title}</SectionTitle><View style={{ gap: space.sm }}>{S.items.map(([t, u, by]) => <Pressable key={u} accessibilityRole="link" accessibilityLabel={`${t} (${by})`} onPress={() => { Linking.openURL(u).catch(() => {}); }} style={s.src}><Text style={s.link}>{t}</Text><Text style={s.muted}>{by}</Text></Pressable>)}</View><Hint>{S.note}</Hint></Card>;
}

/** Nazariya va matritsalar: DuPont, BCG, xavf–daromad, Ansoff, biznes sikli, sotish sabablari, muvaffaqiyat, voronka, SWOT, savodxonlik darajalari. */
export function LiveTheory({ view, p }: { view: LiveView; p: LiveP }) {
  const [fw, setFw] = useState<FwKey>("dupont"); const keys = Object.keys(TH.fw) as FwKey[];
  return (
    <View style={{ gap: space.md, width: "100%" }}>
      <View style={s.rowWrap} role="tablist" testID="live-fw">{keys.map((k) => <Pressable key={k} role="tab" accessibilityRole="tab" aria-selected={fw === k} onPress={() => setFw(k)} style={[s.chip, fw === k && s.chipOn]} testID={`live-fw-${k}`}><Text style={[s.chipT, fw === k && { color: color.white }]}>{TH.fw[k]}</Text></Pressable>)}</View>
      {FW_NEEDS_PLAYER.includes(fw) && <Text style={s.muted}>{TH.pickPlayer}: <Text style={s.bold}>{p.name}</Text></Text>}
      {fw === "dupont" && <Dupont view={view} />}{fw === "bcg" && <Bcg view={view} p={p} />}{fw === "risk" && <Risk view={view} />}{fw === "ansoff" && <Ansoff view={view} p={p} />}{fw === "cycle" && <Cycle view={view} />}
      {fw === "prospect" && <Prospect view={view} p={p} />}{fw === "succ" && <Success view={view} p={p} />}{fw === "funnel" && <Funnel view={view} p={p} />}{fw === "swot" && <Swot p={p} />}{fw === "level" && <Level view={view} />}{fw === "src" && <Sources />}
    </View>);
}
const s = StyleSheet.create({
  bold: { color: color.navy, fontWeight: "800", fontSize: font.sm }, num: { color: color.navy, fontVariant: ["tabular-nums"], fontWeight: "700", fontSize: font.sm }, muted: { color: tone.muted, fontSize: font.xs },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", gap: space.sm, flexWrap: "wrap" }, rowWrap: { flexDirection: "row", gap: space.sm, flexWrap: "wrap" },
  chip: { minHeight: MIN_TAP, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.line, alignItems: "center", justifyContent: "center", backgroundColor: color.white }, chipOn: { backgroundColor: color.navy, borderColor: color.navy }, chipT: { color: color.navy, fontWeight: "700", fontSize: font.sm },
  quad: { flexGrow: 1, flexBasis: 150, borderRadius: radius.md, padding: space.md, gap: 4, borderWidth: 1, borderColor: "#E6ECEF" }, half: { flex: 1, minWidth: 0 }, big: { color: color.navy, fontWeight: "900", fontSize: font.xxl, fontVariant: ["tabular-nums"] },
  li: { color: color.navy, fontSize: font.sm, lineHeight: 19 }, item: { backgroundColor: "#F2F5F8", borderRadius: radius.md, padding: space.sm, gap: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 }, legend: { flexDirection: "row", flexWrap: "wrap", gap: space.md, marginTop: space.sm }, legItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  src: { minHeight: MIN_TAP, justifyContent: "center", paddingVertical: 4 }, link: { color: "#1F5FA8", fontWeight: "700", fontSize: font.sm, textDecorationLine: "underline" },
});
