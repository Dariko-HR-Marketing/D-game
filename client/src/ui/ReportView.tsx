import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Card, Pill, SectionTitle, Banner } from "./kit";
import { LineChart, type ChartSeries } from "./LineChart";
import { uz } from "../i18n/uz";
import { money } from "../format";
import { color, font, radius, space, tone, PLAYER_COLORS, MIN_TAP } from "../theme";
import { acceptRate, chartPoints, insightText, momentText, ratio, timeText, type DeckGroup, type ReportData, type RMine, type RSummary } from "../report";

const R = uz.report;
type Metric = "netWorth" | "cash" | "cashflow" | "passive";
const METRIC_COLOR: Record<Metric, string> = { netWorth: color.green, cash: color.navy, cashflow: "#2C6DB5", passive: "#7B4FA3" };
const GROUPS: DeckGroup[] = ["invest", "market", "expense", "event", "other"];

const Block = ({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) => (
  <View style={[s.cell, wide && s.cellWide]}><Card style={{ flex: 1 }}><SectionTitle>{title}</SectionTitle>{children}</Card></View>
);
const Kpi = ({ label, value, sub, kind = "neutral" }: { label: string; value: string; sub?: string; kind?: "good" | "bad" | "neutral" }) => (
  <View style={s.kpi}>
    <Text style={s.kpiL}>{label}</Text><Text style={[s.kpiV, kind === "bad" && { color: tone.bad }, kind === "good" && { color: tone.good }]}>{value}</Text>{sub ? <Text style={s.kpiS}>{sub}</Text> : null}
  </View>
);
function Progress({ label, value, need, text, done }: { label: string; value: number; need?: number; text: string; done: boolean }) {
  const pct = need ? Math.round(ratio(value, need) * 100) : done ? 100 : 0;
  return (
    <View style={{ gap: 4 }}>
      <View style={s.rowBetween}><Text style={s.pl}>{label}</Text><Text style={[s.pv, done && { color: tone.good }]}>{done ? "✓ " : ""}{text}</Text></View>
      <View style={s.track} aria-hidden><View style={[s.fill, { width: `${pct}%`, backgroundColor: done ? color.green : color.gold }]} /></View>
    </View>
  );
}
function Segmented<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { v: T; label: string }[]; label: string }) {
  return (
    <View role="radiogroup" aria-label={label} style={s.seg}>{items.map((x) => (
      <Pressable key={x.v} role="radio" aria-checked={value === x.v} accessibilityState={{ selected: value === x.v }} onPress={() => onChange(x.v)} style={[s.segB, value === x.v && s.segOn]}><Text style={[s.segT, value === x.v && { color: color.white }]}>{x.label}</Text></Pressable>))}
    </View>
  );
}

/** Dinamika: tanlangan ko'rsatkich bo'yicha chiziqli grafik, muhim lahzalar belgilari va jadval ko'rinishi (ekran o'qigichlar va aniq qiymatlar uchun). */
function Dynamics({ me }: { me: RMine }) { const [metric, setMetric] = useState<Metric>("netWorth"); const [table, setTable] = useState(false);
  const pts = useMemo(() => chartPoints(me.series, (p) => p[metric], 60), [me.series, metric]); const peak = me.peaks[metric];
  const marks = me.moments.filter((m) => m.kind === "exit" || m.kind === "restart" || m.kind === "crisis" || m.kind === "won");
  const sr: ChartSeries[] = [{ id: metric, label: R.chart[metric], color: METRIC_COLOR[metric], points: pts }];
  const rows = useMemo(() => chartPoints(me.series, (p) => p[metric], 12), [me.series, metric]);
  const first = pts[0]?.y ?? 0, last = pts[pts.length - 1]?.y ?? 0;
  return (
    <View style={{ gap: space.md }}>
      <Segmented value={metric} onChange={setMetric} label={R.sec.dynamics} items={(["netWorth", "cash", "cashflow", "passive"] as Metric[]).map((v) => ({ v, label: R.chart[v] }))} />
      {pts.length < 3 ? <Text style={s.muted}>{R.chart.few}</Text> : (
        <LineChart series={sr} height={220} xLabel={R.chart.x} markers={marks.map((m) => ({ x: m.month, label: momentText(m), color: m.kind === "restart" ? color.red : m.kind === "crisis" ? "#E07A2F" : color.gold }))}
          ariaLabel={R.chart.label.replace("{metric}", R.chart[metric]).replace("{from}", money(first)).replace("{to}", money(last)).replace("{peak}", money(peak.value)).replace("{month}", String(peak.month))} />)}
      {marks.length > 0 && <View style={s.legend} role="group" aria-label={R.chart.markers}>{marks.slice(0, 8).map((m, i) => <Text key={i} style={s.legendT}>┆ {R.mom.month.replace("{n}", String(m.month))} · {momentText(m)}</Text>)}</View>}
      <Pressable accessibilityRole="button" aria-expanded={table} onPress={() => setTable((v) => !v)} style={s.linkBtn}><Text style={s.linkT}>{table ? R.chart.hideTable : R.chart.table}</Text></Pressable>
      {table && (
        <View role="table" aria-label={R.chart[metric]} style={s.table}>
          <View role="row" style={s.tr}><Text role="columnheader" style={[s.th, { flex: 1 }]}>{R.chart.month}</Text><Text role="columnheader" style={[s.th, { flex: 2, textAlign: "right" }]}>{R.chart[metric]}</Text></View>
          {rows.map((r, i) => (<View role="row" key={i} style={s.tr}><Text role="cell" style={[s.td, { flex: 1 }]}>{r.x}</Text><Text role="cell" style={[s.td, { flex: 2, textAlign: "right", fontWeight: "700" }]}>{money(r.y)}</Text></View>))}
        </View>)}
    </View>
  );
}

function Goal({ me }: { me: RMine }) { const G = R.goal;
  if (me.big) return (
    <View style={{ gap: space.md }}>
      <Text style={s.hint}>{G.bigTitle}</Text>
      <Progress label={G.flow} value={me.big.cashflow.value} need={me.big.cashflow.need} text={`${money(me.big.cashflow.value)} / ${money(me.big.cashflow.need)}`} done={me.big.cashflow.value >= me.big.cashflow.need} />
      {me.big.cash.need !== null && <Progress label={`${G.dreamCash}${me.big.dream ? `: ${me.big.dream}` : ""}`} value={me.big.cash.value} need={me.big.cash.need} text={`${money(me.big.cash.value)} / ${money(me.big.cash.need)}`} done={me.big.cash.value >= me.big.cash.need} />}
      {me.exit.month !== null && <Text style={s.muted}>{G.exited.replace("{time}", timeText(me.exit.month))}</Text>}
      {me.outcome === "won" && <Pill label={G.won} kind="good" />}
    </View>);
  const p = me.exit.progress; if (!p) return null;
  return (
    <View style={{ gap: space.md }}>
      <Text style={s.hint}>{G.exitTitle}</Text>
      <Progress label={G.cash} value={p.cash.value} need={p.cash.need} text={`${money(p.cash.value)} / ${money(p.cash.need)}`} done={p.cash.value >= p.cash.need} />
      <Progress label={G.passive} value={p.passive.value} need={p.passive.need} text={`${money(p.passive.value)} / ${money(p.passive.need)}`} done={p.passive.value >= p.passive.need} />
      <Progress label={G.debt} value={0} text={p.debt.value > 0 ? money(p.debt.value) : G.zero} done={p.debt.value === 0} />
      <Progress label={G.partner} value={0} text={p.partnerships.value > 0 ? String(p.partnerships.value) : G.zero} done={p.partnerships.value === 0} />
    </View>);
}

function Decisions({ me }: { me: RMine }) { const D = R.dec, d = me.decisions, rate = acceptRate(d);
  return (
    <View style={{ gap: space.md }}>
      <View style={s.kpis}>
        <Kpi label={D.total} value={String(d.shown)} /><Kpi label={D.accepted} value={String(d.accepted)} kind="good" /><Kpi label={D.skipped} value={String(d.skipped)} />
        <Kpi label={D.rate} value={rate === null ? "—" : `${rate} %`} /><Kpi label={D.forced} value={String(d.forced)} />
        {d.auto > 0 && <Kpi label={D.auto} value={String(d.auto)} kind="bad" />}{me.quiz.answered > 0 && <Kpi label={D.quiz} value={D.quizOf.replace("{c}", String(me.quiz.correct)).replace("{a}", String(me.quiz.answered))} />}
      </View>
      {GROUPS.filter((g) => d.byGroup[g].shown + d.byGroup[g].forced > 0).map((g) => { const x = d.byGroup[g], tot = Math.max(1, x.accepted + x.skipped + x.forced); return (
        <View key={g} style={{ gap: 4 }} role="group" aria-label={`${D.groups[g]}: ${D.accepted} ${x.accepted}, ${D.skipped} ${x.skipped}, ${D.forced} ${x.forced}`}>
          <View style={s.rowBetween}><Text style={s.pl}>{D.groups[g]}</Text><Text style={s.pv}>{x.accepted} / {x.skipped} / {x.forced}</Text></View>
          <View style={s.stack} aria-hidden><View style={{ flex: x.accepted / tot, backgroundColor: color.green }} /><View style={{ flex: x.skipped / tot, backgroundColor: color.gold }} /><View style={{ flex: x.forced / tot, backgroundColor: "#8FA3B3" }} /></View>
        </View>); })}
      <View style={s.legend} aria-hidden><Text style={s.legendT}>{D.legend}</Text></View>
    </View>
  );
}

function Invest({ me }: { me: RMine }) { const I = R.inv; if (!me.assets.length) return <Text style={s.muted}>{I.none}</Text>;
  const tone_ = (st: string): "good" | "bad" | "info" | "plain" => (st === "held" ? "good" : st === "lost" ? "bad" : st === "handed" ? "info" : "plain");
  return (
    <View style={{ gap: space.sm }}>
      <View style={s.kpis}><Kpi label={I.count} value={String(me.spending.purchases)} /><Kpi label={I.total} value={money(me.spending.purchaseTotal)} /></View>
      {me.assets.map((a, i) => (
        <View key={`${a.code}${i}`} style={s.asset} role="group" aria-label={`${a.name ?? a.code}, ${(I.kind as Record<string, string>)[a.kind] ?? a.kind}, ${I.status[a.status]}, ${I.paid} ${money(a.paid)}, ${I.income} ${money(a.income)}`}>
          <View style={s.rowBetween} aria-hidden><Text style={[s.pl, { flex: 1 }]} numberOfLines={2}>{a.name ?? a.code}</Text><Pill label={I.status[a.status]} kind={tone_(a.status)} /></View>
          <Text style={s.muted} aria-hidden>{(I.kind as Record<string, string>)[a.kind] ?? a.kind} · {I.since.replace("{n}", String(a.boughtMonth))} · {I.paid} {money(a.paid)} · {a.income > 0 ? `${money(a.income)} ${I.income}` : I.noIncome}{a.paybackMonths ? ` · ${I.payback.replace("{n}", String(a.paybackMonths))}` : ""}</Text>
        </View>))}
    </View>
  );
}

function Spending({ me }: { me: RMine }) { const S = R.sp, sp = me.spending; const none = (n: number) => (n ? String(n) : S.none);
  return (
    <View style={s.kpis}>
      <Kpi label={S.expenseCards} value={none(sp.expenseCards)} /><Kpi label={S.expenseTotal} value={money(sp.expenseTotal)} kind={sp.expenseTotal ? "bad" : "neutral"} />
      {sp.biggest && <Kpi label={S.biggest} value={money(sp.biggest.amount)} sub={`${R.mom.month.replace("{n}", String(sp.biggest.month))}${sp.biggest.text ? ` · ${sp.biggest.text}` : ""}`} kind="bad" />}
      <Kpi label={S.purchases} value={none(sp.purchases)} /><Kpi label={S.sales} value={none(sp.sales)} /><Kpi label={S.loans} value={none(sp.bankLoans)} />
      <Kpi label={S.restarts} value={none(me.risks.restarts)} kind={me.risks.restarts ? "bad" : "neutral"} /><Kpi label={S.crisis} value={none(me.risks.crisisMonths)} /><Kpi label={S.unemployed} value={none(me.risks.unemployedMonths)} />
    </View>
  );
}

function Moments({ me }: { me: RMine }) {   if (!me.moments.length) return <Text style={s.muted}>{R.mom.none}</Text>;
  return (
    <View style={{ gap: space.xs }} role="list" aria-label={R.sec.moments}>{me.moments.slice(0, 40).map((m, i) => (
      <View key={i} role="listitem" style={s.moment}><Text style={s.momM}>{R.mom.month.replace("{n}", String(m.month))}</Text><Text style={s.momT}>{momentText(m)}</Text></View>))}
    </View>
  );
}

function Insights({ me }: { me: RMine }) { const icon = { good: "✓", info: "i", warn: "!" } as const;
  return (
    <View style={{ gap: space.sm }} role="list" aria-label={R.sec.insights}>{me.insights.map((i, k) => (
      <View key={k} role="listitem"><Banner kind={i.level === "good" ? "good" : i.level === "warn" ? "warn" : "info"}><Text style={{ fontWeight: "800" }} aria-hidden>{icon[i.level]}  </Text>{insightText(i)}</Banner></View>))}
    </View>
  );
}

function Compare({ data }: { data: ReportData }) { const { width } = useWindowDimensions(); const wide = width >= 760; const me = data.me; const C = R.cmp;
  const rows: (RSummary | (RMine & { isMe: true }))[] = [{ ...me, isMe: true } as any, ...data.others].sort((a, b) => a.rank - b.rank);
  const series: ChartSeries[] = rows.map((r, i) => ({ id: r.id, label: r.name, color: PLAYER_COLORS[i % PLAYER_COLORS.length], dash: !(r as any).isMe, width: (r as any).isMe ? 3 : 2, points: chartPoints(((r as any).isMe ? (r as RMine).series.map((p) => ({ month: p.month, netWorth: p.netWorth })) : (r as RSummary).netWorthSeries), (p) => p.netWorth, 50) }));
  return (
    <View style={{ gap: space.md }}>
      <LineChart series={series} height={200} xLabel={R.chart.x} ariaLabel={`${R.chart.netWorth}: ${rows.map((r) => `${r.name} ${money(r.final.netWorth)}`).join("; ")}`} />
      <View style={s.legend} aria-hidden>{rows.map((r, i) => <Text key={r.id} style={s.legendT}><Text style={{ color: PLAYER_COLORS[i % PLAYER_COLORS.length], fontWeight: "900" }}>{(r as any).isMe ? "━" : "┅"}</Text> {r.name}</Text>)}</View>
      <View role="table" aria-label={R.sec.compare} style={s.table}>
        <View role="row" style={s.tr}><Text role="columnheader" style={[s.th, { width: 34 }]}>{C.rank}</Text><Text role="columnheader" style={[s.th, { flex: 2 }]}>{C.name}</Text><Text role="columnheader" style={[s.th, { flex: 2, textAlign: "right" }]}>{C.net}</Text>{wide && <Text role="columnheader" style={[s.th, { flex: 2, textAlign: "right" }]}>{C.passive}</Text>}{wide && <Text role="columnheader" style={[s.th, { flex: 1 }]}>{C.circle}</Text>}{wide && <Text role="columnheader" style={[s.th, { flex: 1, textAlign: "right" }]}>{C.months}</Text>}</View>
        {rows.map((r) => (
          <View role="row" key={r.id} style={[s.tr, (r as any).isMe && { backgroundColor: "#EAF6F0" }]}>
            <Text role="cell" style={[s.td, { width: 34, fontWeight: "800" }]}>{r.rank}</Text>
            <Text role="cell" style={[s.td, { flex: 2 }]} numberOfLines={1}>{r.name}{(r as any).isMe ? ` ${C.you}` : r.bot ? ` · ${C.bot}` : ""}</Text>
            <Text role="cell" style={[s.td, { flex: 2, textAlign: "right", fontWeight: "700" }]}>{money(r.final.netWorth)}</Text>
            {wide && <Text role="cell" style={[s.td, { flex: 2, textAlign: "right" }]}>{money(r.final.passive)}</Text>}
            {wide && <Text role="cell" style={[s.td, { flex: 1 }]}>{r.circle === "big" ? C.big : C.small}</Text>}
            {wide && <Text role="cell" style={[s.td, { flex: 1, textAlign: "right" }]}>{r.months}</Text>}
          </View>))}
      </View>
      <Text style={s.muted}>{C.note}</Text>
    </View>
  );
}

/** O'yin tugagach to'liq hisobot: natija, ko'rsatkichlar, dinamika, maqsad sari yo'l, qarorlar, investitsiyalar, xarajatlar, lahzalar, tavsiyalar va taqqoslash. */
export function ReportView({ data }: { data: ReportData }) { const me = data.me, f = me.final;
  const outcomeKind = me.outcome === "won" ? "good" : me.outcome === "big" ? "info" : "plain";
  return (
    <View style={{ gap: space.lg }} testID="report">
      <Card accent={me.outcome === "won" ? "green" : undefined} label={R.forYou}>
        <View style={s.rowBetween}><Text style={s.hName}>{me.name}</Text><Pill label={R.outcome[me.outcome]} kind={outcomeKind as any} /></View>
        <View style={s.kpis}>
          <Kpi label={R.hero.rank} value={`${me.rank} / ${data.meta.players}`} sub={R.hero.of.replace("{n}", String(data.meta.players))} kind={me.rank === 1 ? "good" : "neutral"} />
          <Kpi label={R.hero.length} value={timeText(me.months)} /><Kpi label={R.hero.turns} value={String(me.turns)} /><Kpi label={R.hero.mode} value={(R.mode as Record<string, string>)[data.meta.mode] ?? data.meta.mode} />
          {me.score ? <><Kpi label={R.hero.points} value={`+${me.score.points.pos}${me.score.points.neg ? ` ${me.score.points.neg}` : ""}`} />{me.score.xp !== null && <Kpi label={R.hero.xp} value={`+${me.score.xp}`} />}</> : <Text style={s.muted}>{R.hero.noScore}</Text>}
        </View>
      </Card>
      <View style={s.grid}>
        <Block title={R.sec.numbers} wide>
          <View style={s.kpis}>
            <Kpi label={R.kpi.netWorth} value={money(f.netWorth)} sub={`${R.kpi.peak}: ${money(me.peaks.netWorth.value)}`} kind={f.netWorth < 0 ? "bad" : "good"} />
            <Kpi label={R.kpi.cash} value={money(f.cash)} sub={`${R.kpi.peak}: ${money(me.peaks.cash.value)}`} /><Kpi label={R.kpi.passive} value={money(f.passive)} sub={`${R.kpi.peak}: ${money(me.peaks.passive.value)}`} />
            <Kpi label={R.kpi.cashflow} value={money(f.cashflow)} kind={f.cashflow < 0 ? "bad" : "good"} sub={`${R.kpi.peak}: ${money(me.peaks.cashflow.value)}`} /><Kpi label={R.kpi.expenses} value={money(f.expenses)} />
            <Kpi label={R.kpi.debt} value={money(f.debt)} kind={f.debt > 0 ? "bad" : "neutral"} />{f.salary > 0 && <Kpi label={R.kpi.salary} value={money(f.salary)} />}
          </View>
          <Text style={s.muted}>{R.kpi.netNote}</Text>
        </Block>
        <Block title={R.sec.dynamics} wide><Dynamics me={me} /></Block>
        <Block title={R.sec.goal}><Goal me={me} /></Block>
        <Block title={R.sec.decisions}><Decisions me={me} /></Block>
        <Block title={R.sec.invest}><Invest me={me} /></Block>
        <Block title={R.sec.spending}><Spending me={me} /></Block>
        <Block title={R.sec.insights} wide><Insights me={me} /></Block>
        <Block title={R.sec.moments}><Moments me={me} /></Block>
        <Block title={R.sec.compare} wide><Compare data={data} /></Block>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.lg }, cell: { flexGrow: 1, flexBasis: 360, minWidth: 0 }, cellWide: { flexBasis: "100%" as any },
  hName: { fontSize: font.xl, fontWeight: "800", color: color.navy, flexShrink: 1 }, rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  kpis: { flexDirection: "row", flexWrap: "wrap", gap: space.md, rowGap: space.lg, marginTop: space.sm }, kpi: { minWidth: 120, flexGrow: 1, flexBasis: 120, gap: 2 },
  kpiL: { color: tone.muted, fontSize: font.xs, fontWeight: "700" }, kpiV: { color: color.navy, fontSize: font.xl, fontWeight: "800", fontVariant: ["tabular-nums"] }, kpiS: { color: tone.muted, fontSize: font.xs },
  muted: { color: tone.muted, fontSize: font.sm, lineHeight: 19 }, hint: { color: color.navy, fontWeight: "700", fontSize: font.md },
  pl: { color: color.navy, fontSize: font.md, fontWeight: "600" }, pv: { color: tone.muted, fontSize: font.sm, fontWeight: "700", fontVariant: ["tabular-nums"] },
  track: { height: 8, borderRadius: 4, backgroundColor: "#E6ECEF", overflow: "hidden" }, fill: { height: 8, borderRadius: 4 },
  stack: { height: 10, borderRadius: 5, overflow: "hidden", flexDirection: "row", backgroundColor: "#E6ECEF" },
  seg: { flexDirection: "row", flexWrap: "wrap", gap: space.sm }, segB: { minHeight: MIN_TAP, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, borderColor: color.line, backgroundColor: color.white, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: color.navy, borderColor: color.navy }, segT: { color: color.navy, fontWeight: "700", fontSize: font.sm },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: space.md }, legendT: { color: tone.muted, fontSize: font.xs },
  linkBtn: { minHeight: MIN_TAP, justifyContent: "center", alignSelf: "flex-start" }, linkT: { color: color.navy, fontWeight: "700", fontSize: font.sm, textDecorationLine: "underline" },
  table: { borderWidth: 1, borderColor: color.line, borderRadius: radius.md, overflow: "hidden" }, tr: { flexDirection: "row", paddingHorizontal: space.md, minHeight: 40, alignItems: "center", gap: space.sm, borderBottomWidth: 1, borderBottomColor: "#EEF2F4" },
  th: { color: tone.muted, fontSize: font.xs, fontWeight: "800" }, td: { color: color.navy, fontSize: font.sm },
  asset: { borderWidth: 1, borderColor: "#E6ECEF", borderRadius: radius.md, padding: space.md, gap: 4 },
  moment: { flexDirection: "row", gap: space.md, alignItems: "flex-start", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#EEF2F4" }, momM: { width: 54, color: tone.muted, fontSize: font.xs, fontWeight: "800", fontVariant: ["tabular-nums"] }, momT: { flex: 1, color: color.navy, fontSize: font.sm },
});
