import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, Row, SectionTitle, Stat, Pill } from "./kit";
import { money } from "../format";
import { exitProgress } from "../model";
import { color, font, radius, space, tone } from "../theme";
import { uz } from "../i18n/uz";

function Bar({ ratio, ok }: { ratio: number; ok: boolean }) {
  return <View style={s.bar} aria-hidden><View style={[s.fill, { width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`, backgroundColor: ok ? color.green : color.gold }]} /></View>;
}

/** Moliyaviy holat: katta raqamlar (naqd, oylik pul oqimi), tafsilot va kichik aylanadan chiqish shartlari (progress bilan). */
export function FinanceCard({ p, profession, dream, shown }: { p: any; profession?: string; dream?: { name: string; price: number } | null; shown?: { cash: number; flow: number } | null }) {
  const e = exitProgress(p);
  const conds: { k: "cash" | "flow" | "debt" | "partner"; label: string; ratio: number | null; detail?: string }[] = [
    { k: "cash", label: uz.game.exitCash, ratio: p.cash / 1_000_000, detail: `${money(p.cash)} / ${money(1_000_000)}` },
    { k: "flow", label: uz.game.exitFlow, ratio: (e.passive - e.expenses) / 25_000, detail: `${money(e.passive - e.expenses)} / ${money(25_000)}` },
    { k: "debt", label: uz.game.exitDebt, ratio: null }, { k: "partner", label: uz.game.exitPartner, ratio: null },
  ];
  return (
    <Card label={uz.game.finance}>
      <SectionTitle right={profession ? <Pill label={profession} kind="info" /> : undefined}>{uz.game.finance}</SectionTitle>
      {dream && <Text style={s.dream}>{uz.hud.dream}: {dream.name} · {money(dream.price)}</Text>}
      <View style={s.stats}>
        <Stat big label={uz.game.cash} value={money(p.cash)} count={{ value: shown?.cash ?? p.cash }} />
        <Stat big label={uz.game.cashflow} value={`${e.cashflow > 0 ? "+" : ""}${money(e.cashflow)}`} kind={(shown?.flow ?? e.cashflow) < 0 ? "bad" : "good"} count={{ value: shown?.flow ?? e.cashflow, signed: true }} />
      </View>
      <View style={{ gap: 2 }}>
        <Row l={uz.game.salary} v={money(p.salary)} /><Row l={uz.game.passive} v={money(e.passive)} /><Row l={uz.game.expenses} v={money(e.expenses)} kind="bad" />
        <Row l={uz.game.debt} v={money(e.debt)} kind={e.debt > 0 ? "bad" : "neutral"} />
      </View>
      {p.circle === "small" ? (
        <View style={s.exit}>
          <Text style={s.exitTitle} aria-level={3} accessibilityRole="header">{uz.game.exitTitle}</Text>
          {conds.map((c) => { const ok = e.checks[c.k]; return (
            <View key={c.k} role="group" accessible aria-label={`${c.label}: ${ok ? uz.game.done : uz.game.notYet}${c.detail ? `, ${c.detail}` : ""}`} style={{ gap: 4 }}>
              <View style={s.condRow} aria-hidden><Text style={[s.mark, { color: ok ? tone.good : tone.muted }]}>{ok ? "✓" : "○"}</Text><Text style={[s.cond, ok && { color: tone.good }]}>{c.label}</Text></View>
              {c.ratio !== null && <View aria-hidden style={{ paddingLeft: 22 }}><Bar ratio={c.ratio} ok={ok} /><Text style={s.detail}>{c.detail}</Text></View>}
            </View>); })}
        </View>) : <Pill label={uz.game.bigCircle} kind="good" />}
    </Card>
  );
}
const s = StyleSheet.create({
  dream: { color: tone.muted, fontSize: font.sm, lineHeight: 19 },
  stats: { flexDirection: "row", gap: space.lg, flexWrap: "wrap" },
  exit: { gap: space.sm, marginTop: space.xs, paddingTop: space.md, borderTopWidth: 1, borderTopColor: color.line }, exitTitle: { color: color.navy, fontWeight: "800", fontSize: font.md },
  condRow: { flexDirection: "row", gap: space.sm, alignItems: "center" }, mark: { width: 16, fontWeight: "800" }, cond: { color: tone.muted, fontSize: font.md, flexShrink: 1 },
  bar: { height: 6, borderRadius: radius.pill, backgroundColor: color.line, overflow: "hidden" }, fill: { height: 6, borderRadius: radius.pill }, detail: { color: tone.muted, fontSize: font.xs, marginTop: 2 },
});
