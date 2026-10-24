import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { sheetOf, SLOTS, type IncomeLine, type SheetBig, type SheetSmall } from "../sheet";
import { money } from "../format";
import { monthsText, splitMonths, MONTHS_PER_YEAR } from "../estimates";
import { uz } from "../i18n/uz";
import { color, font, HEADER_H, MIN_TAP, radius, space, tone } from "../theme";

const PAPER = { head: "#1D3A52", fill: "#EAF1F4", line: "#B7C6CF" };
const Head = ({ title, sub }: { title: string; sub: string }) => (<><View style={s.title}><Text style={s.titleT} aria-level={2} accessibilityRole="header">{title}</Text></View><Text style={s.sub}>{sub}</Text></>);
const Cell = ({ l, v, flex = 1, strong }: { l: string; v?: string; flex?: number; strong?: boolean }) => (<View style={[s.cell, { flex }]}><Text style={[s.cl, strong && { fontWeight: "800" }]}>{l}</Text>{v !== undefined && <Text style={s.cv}>{v}</Text>}</View>);
const Box = ({ title, children, style }: { title?: string; children: React.ReactNode; style?: object }) => (<View style={[s.box, style]}>{title ? <View style={s.boxH}><Text style={s.boxHT} aria-level={3} accessibilityRole="header">{title}</Text></View> : null}{children}</View>);
const Line = ({ l, v, bold, tint, kind, sub }: { l: string; v?: string; bold?: boolean; tint?: boolean; kind?: "good" | "bad"; sub?: string }) => (
  <View style={[s.line, tint && { backgroundColor: PAPER.fill }]}><View style={{ flex: 2 }}><Text style={[s.ll, bold && { fontWeight: "800" }]}>{l}</Text>{sub ? <Text style={s.lsub} numberOfLines={2}>{sub}</Text> : null}</View><Text style={[s.lv, kind && { color: kind === "bad" ? tone.bad : tone.good }]}>{v ?? ""}</Text></View>);
/** Bo'sh qatorlar ham ko'rinadi (qog'oz blank kabi): kamida `n` qator, ortiq bo'lsa hammasi. */
function Slots({ label, rows, n }: { label: string; rows: IncomeLine[]; n: number }) {
  const all = Array.from({ length: Math.max(n, rows.length) }, (_, i) => rows[i]);
  return <>{all.map((r, i) => <Line key={i} l={label} sub={r?.title} v={r ? money(r.income) : ""} />)}</>;
}
const Meta = ({ d }: { d: { name: string; profession: string; dream: { name: string; price: number } | null } }) => (
  <Box><View style={s.metaRow}><Cell l={`${uz.sheet.player}: ${d.name}`} flex={1.4} strong /><Cell l={`${uz.sheet.position}: ${d.profession || uz.sheet.none}`} strong /></View>
    <View style={s.metaRow}><Cell l={`${uz.sheet.dream}: ${d.dream?.name ?? uz.sheet.none}`} flex={1.4} strong /><Cell l={`${uz.sheet.dreamPrice}: ${d.dream ? money(d.dream.price) : uz.sheet.none}`} strong /></View></Box>);

function SmallSheet({ d, wide }: { d: SheetSmall; wide: boolean }) {
  const { years, months: inYear } = splitMonths(d.months); const e = d.expenses, left = (
    <Box title={uz.sheet.incomes}>
      <Line l={uz.sheet.salary} v={money(d.salary)} />
      <Slots label={uz.sheet.realty} rows={d.realty} n={SLOTS.realty} /><Slots label={uz.sheet.smallBiz} rows={d.small} n={SLOTS.small} /><Slots label={uz.sheet.bigBiz} rows={d.big} n={SLOTS.big} />
      {d.other.length > 0 && <Slots label={uz.sheet.other} rows={d.other} n={0} />}
    </Box>);
  const right = (<View style={{ gap: space.md }}>
    <Box><Line tint bold l={uz.sheet.active} v={money(d.totals.active)} /><Line tint bold l={uz.sheet.passive} v={money(d.totals.passive)} /><Line tint bold l={uz.sheet.total} v={money(d.totals.income)} />
      <Line tint bold l={uz.sheet.expenses} v={money(d.totals.expenses)} kind="bad" /><Line tint bold l={uz.sheet.flow} v={`${d.totals.cashflow > 0 ? "+" : ""}${money(d.totals.cashflow)}`} kind={d.totals.cashflow < 0 ? "bad" : "good"} /></Box>
    <Box title={uz.sheet.shares}>
      <View style={s.tr}><Text style={[s.th, { flex: 1.2 }]}>{uz.sheet.code}</Text><Text style={s.th}>{uz.sheet.count}</Text><Text style={[s.th, { flex: 1.4 }]}>{uz.sheet.buyPrice}</Text></View>
      {d.shares.map((r) => (<View key={r.code} style={s.tr}><Text style={[s.td, { flex: 1.2, fontWeight: "800" }]}>{r.code}</Text><Text style={s.td}>{r.count || ""}</Text><Text style={[s.td, { flex: 1.4 }]}>{r.count ? money(r.price) : ""}</Text></View>))}
      <Line tint bold l={uz.sheet.debts} v={money(d.debt)} kind={d.debt > 0 ? "bad" : undefined} /></Box>
    <Text style={s.note}>{uz.sheet.debtNote}</Text></View>);
  const exp = (<Box title={uz.sheet.expensesTitle}>
    {e.lines.every((x) => x.value === null) ? <Line l={uz.sheet.baseExp} v={money(e.base)} /> : e.lines.map((x) => <Line key={x.key} l={uz.sheet.exp[x.key]} v={x.value === null ? "" : x.value === 0 ? uz.sheet.none : money(x.value)} />)}
    <Line l={`${uz.sheet.children}: ${e.children}`} v={e.children ? `${money(e.childCost)} × ${e.children} = ${money(e.childTotal)}` : money(0)} />
    <Line l={uz.sheet.creditExp} v={money(e.credits)} /><Line l={uz.sheet.bankExp} v={money(e.bank)} /><Line l={uz.sheet.lombExp} v={money(e.lombard)} /><Line l={uz.sheet.qarExp} v={money(e.qar)} />{e.extra !== 0 && <Line l={uz.sheet.extraExp} v={`${e.extra > 0 ? "+" : "−"}${money(Math.abs(e.extra))}`} />}
    <Line tint bold l={uz.sheet.expenses} v={money(d.totals.expenses)} kind="bad" /></Box>);
  const credits = (<View style={{ gap: space.md }}>
    <Box title={uz.sheet.extraCredits}>{Array.from({ length: Math.max(SLOTS.lombard, d.lombards.length) }, (_, i) => <Line key={"l" + i} l={uz.sheet.sumLombard} v={d.lombards[i] ? money(d.lombards[i].amount) : ""} />)}
      {Array.from({ length: Math.max(SLOTS.bank, d.banks.length) }, (_, i) => <Line key={"b" + i} l={uz.sheet.sumBank} v={d.banks[i] ? money(d.banks[i].amount) : ""} />)}<Line l={uz.sheet.pledge} v={d.collateral.join(", ")} /></Box>
    <Box title={uz.sheet.newCredits}>{Array.from({ length: Math.max(SLOTS.lombard, d.lombards.length) }, (_, i) => <Line key={"pl" + i} l={uz.sheet.payLombard} v={d.lombards[i] ? money(d.lombards[i].payment) : ""} />)}
      {Array.from({ length: Math.max(SLOTS.bank, d.banks.length) }, (_, i) => <Line key={"pb" + i} l={uz.sheet.payBank} v={d.banks[i] ? money(d.banks[i].payment) : ""} />)}</Box>
    <View><Text style={s.months}>{uz.sheet.months}: <Text style={{ fontWeight: "900" }} testID="sheet-months">{monthsText(d.months, { year: uz.time.year, month: uz.time.month })}</Text>{d.months >= MONTHS_PER_YEAR ? ` (${uz.time.total} ${d.months} ${uz.time.month})` : ""}</Text>
      <View style={s.grid} aria-hidden>{Array.from({ length: Math.max(24, years + 1) }, (_, i) => <View key={i} style={[s.mc, i < years ? { backgroundColor: color.green } : i === years && inYear > 0 ? { backgroundColor: "#9FD6B9" } : null]} />)}</View>
      <Text style={s.note}>{uz.sheet.yearCell}</Text></View></View>);
  return (<View style={{ gap: space.md }}>
    <Head title={`POYGA | ${uz.sheet.small}`} sub={uz.sheet.smallSub} /><Meta d={d} />
    <View style={[wide && { flexDirection: "row", alignItems: "flex-start" }, { gap: space.md }]}><View style={wide ? { flex: 1 } : undefined}>{left}</View><View style={wide ? { flex: 1 } : undefined}>{right}</View></View>
    <View style={[wide && { flexDirection: "row", alignItems: "flex-start" }, { gap: space.md }]}><View style={wide ? { flex: 1 } : undefined}>{exp}</View><View style={wide ? { flex: 1 } : undefined}>{credits}</View></View>
    <View style={s.goal}><Text style={s.goalT}>{uz.sheet.exitNote} {money(d.exit.cashGoal)} sh.b. {uz.sheet.exitNote2} {money(d.exit.flowGoal)} sh.b.{uz.sheet.exitNote3}</Text></View>
  </View>);
}

function BigSheet({ d }: { d: SheetBig }) {
  const rows = Array.from({ length: Math.max(SLOTS.big, d.businesses.length) }, (_, i) => d.businesses[i]);
  return (<View style={{ gap: space.md }}>
    <Head title={`POYGA | ${uz.sheet.big}`} sub={uz.sheet.bigSub} /><Meta d={d} />
    <Box><View style={s.lockRow}><Text style={[s.cl, { flex: 1, fontWeight: "800" }]}>{uz.sheet.lockedFlow}:</Text><Text style={s.cv} testID="sheet-locked">{d.lockedFlow === null ? uz.sheet.none : money(d.lockedFlow)}</Text></View></Box>
    <Box title={uz.sheet.bizTable}>
      <View style={s.tr}><Text style={[s.th, { flex: 2 }]}>{uz.sheet.bizName}</Text><Text style={s.th}>{uz.sheet.bizValue}</Text><Text style={s.th}>{uz.sheet.bizIncome}</Text></View>
      {rows.map((b, i) => (<View key={i} style={s.tr}><Text style={[s.td, { flex: 2 }]}>{b?.title ?? ""}</Text><Text style={s.td}>{b ? money(b.price) : ""}</Text><Text style={s.td}>{b ? money(b.income) : ""}</Text></View>))}</Box>
    <Box style={{ alignSelf: "center", minWidth: 260 }}><Line tint bold l={uz.sheet.debtBig} v={money(d.debt)} kind={d.debt > 0 ? "bad" : undefined} /></Box>
    <View style={s.goal}><Text style={s.goalT}>{uz.sheet.bigGoal} {money(d.flowGoal)} sh.b.{uz.sheet.bigGoal2}</Text></View>
  </View>);
}

/** «Hisob varag'i»: stol o'yinidagi qog'oz blankning raqamli ko'rinishi (kichik va katta aylana). Qiymatlar serverdan keladi, o'zgartirib bo'lmaydi. */
export function SheetDetail({ room, userId, onClose }: { room: any; userId: string; onClose: () => void }) {
  const { width } = useWindowDimensions(); const wide = width >= 900; const sh = sheetOf(room, userId);
  const [tab, setTab] = useState<"small" | "big">(sh?.circle ?? "small");
  useEffect(() => { const d = (globalThis as any).document; if (!d?.addEventListener) return; const k = (e: any) => { if (e.key === "Escape") onClose(); }; d.addEventListener("keydown", k); return () => d.removeEventListener("keydown", k); }, [onClose]);
  if (!sh) return null;
  return (
    <View style={s.overlay} role="dialog" aria-modal aria-label={uz.sheet.title} testID="sheet-detail">
      <View style={s.bar}>
        <Text style={s.barT} aria-level={1} accessibilityRole="header">{uz.sheet.title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={uz.sheet.close} onPress={onClose} style={s.x} testID="sheet-close"><Text style={s.xT} aria-hidden>✕</Text></Pressable>
      </View>
      <View style={s.tabs} role="tablist" aria-label={uz.sheet.tabs}>
        {(["small", "big"] as const).map((k) => <Pressable key={k} role="tab" aria-selected={tab === k} onPress={() => setTab(k)} style={[s.tab, tab === k && s.tabOn]} testID={`sheet-tab-${k}`}><Text style={[s.tabT, tab === k && { color: color.white }]}>{k === "small" ? uz.sheet.small : uz.sheet.big}</Text></Pressable>)}
      </View>
      <ScrollView tabIndex={0} role="region" aria-label={uz.sheet.title} contentContainerStyle={[s.body, wide && { maxWidth: 1100 }]}>
        {tab === "small" ? <SmallSheet d={sh.small} wide={wide} /> : <BigSheet d={sh.big} />}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color.bg, zIndex: 95 },
  bar: { minHeight: HEADER_H, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, backgroundColor: color.white, borderBottomWidth: 1, borderBottomColor: "#E6ECEF" }, barT: { color: color.navy, fontWeight: "800", fontSize: font.xl },
  x: { width: MIN_TAP, height: MIN_TAP, alignItems: "center", justifyContent: "center" }, xT: { color: tone.muted, fontSize: font.xl, fontWeight: "800" },
  tabs: { flexDirection: "row", gap: space.sm, padding: space.md, paddingBottom: 0, justifyContent: "center" },
  tab: { minHeight: MIN_TAP, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.navy, alignItems: "center", justifyContent: "center", backgroundColor: color.white }, tabOn: { backgroundColor: color.navy }, tabT: { color: color.navy, fontWeight: "800", fontSize: font.sm },
  body: { padding: space.lg, gap: space.md, width: "100%", alignSelf: "center", paddingBottom: space.xxl },
  title: { backgroundColor: PAPER.head, borderRadius: 4, paddingHorizontal: space.lg, paddingVertical: space.md }, titleT: { color: "#fff", fontSize: font.xl, fontWeight: "800", letterSpacing: 0.5 }, sub: { color: color.text2, fontSize: font.sm },
  box: { borderWidth: 1, borderColor: PAPER.line, backgroundColor: "#fff" }, boxH: { backgroundColor: PAPER.fill, paddingHorizontal: space.md, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: PAPER.line }, boxHT: { color: color.navy, fontWeight: "800", fontSize: font.md },
  metaRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: PAPER.line }, cell: { padding: space.sm, paddingHorizontal: space.md, borderRightWidth: 1, borderRightColor: PAPER.line, minHeight: 36, justifyContent: "center" }, cl: { color: color.navy, fontSize: font.sm }, cv: { color: color.navy, fontWeight: "800", fontVariant: ["tabular-nums"] },
  line: { flexDirection: "row", minHeight: 30, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#DCE5EA" }, ll: { color: color.navy, fontSize: font.sm, paddingHorizontal: space.md, paddingVertical: 4 }, lv: { flex: 1, textAlign: "right", color: color.navy, fontWeight: "800", fontSize: font.sm, paddingHorizontal: space.md, borderLeftWidth: 1, borderLeftColor: PAPER.line, minHeight: 30, textAlignVertical: "center", paddingTop: 5, fontVariant: ["tabular-nums"] },
  lsub: { color: color.text2, fontSize: font.xs, paddingHorizontal: space.md, paddingBottom: 4 },
  tr: { flexDirection: "row", minHeight: 32, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#DCE5EA" }, th: { flex: 1, backgroundColor: PAPER.fill, color: color.navy, fontWeight: "800", fontSize: font.sm, paddingHorizontal: space.sm, paddingVertical: 6 }, td: { flex: 1, color: color.navy, fontSize: font.sm, paddingHorizontal: space.sm, paddingVertical: 5, fontVariant: ["tabular-nums"] },
  note: { color: color.text2, fontSize: font.xs, lineHeight: 17 }, months: { color: color.navy, fontSize: font.sm, marginBottom: 4 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 3 }, mc: { width: 18, height: 18, borderWidth: 1, borderColor: PAPER.line, backgroundColor: "#fff" },
  goal: { backgroundColor: PAPER.fill, borderWidth: 1, borderColor: PAPER.line, padding: space.md }, goalT: { color: color.navy, fontWeight: "800", fontSize: font.sm, textAlign: "center", lineHeight: 20 }, lockRow: { flexDirection: "row", alignItems: "center", padding: space.md, gap: space.md },
});
