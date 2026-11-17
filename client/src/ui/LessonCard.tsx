import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "./kit";
import { Button } from "./Button";
import { insightText, type ReportData } from "../report";
import { money } from "../format";
import { uz } from "../i18n/uz";
import { color, font, radius, space, tone } from "../theme";

const L = uz.lesson;
/** Saboq kartasi (O'quv o'yini oxirida): o'yin hisobotidagi 3 ta shaxsiy xulosa. Yangi hisob yo'q — faqat `insights` va yakuniy raqamlar. */
export function LessonCard({ data, onStart }: { data: ReportData; onStart: () => void }) {
  const me = data.me, d = me.decisions, made = d.accepted + d.skipped + d.auto + d.forced;
  const order = { warn: 0, good: 1, info: 2 } as const; // avval ehtiyot, so'ng yutuq, so'ng umumiy
  const [saved, setSaved] = useState(false);
  const top = [...me.insights].sort((a, b) => order[a.level] - order[b.level]).slice(0, 3);
  return (
    <Card accent="green" label={L.title} style={{ gap: space.md }}>
      <View testID="lesson-card" style={{ gap: space.md }}>
        <Text style={s.badge}>{L.badge}</Text>
        <Text style={s.h} aria-level={2} accessibilityRole="header">{L.heading.replace("{name}", me.name)}</Text>
        <Text style={s.p}>{L.lead}</Text>
        <View style={s.stats}>
          <Stat label={L.cash} value={money(me.final.cash)} /><Stat label={L.passive} value={money(me.final.passive)} /><Stat label={L.decisions} value={String(made)} />
        </View>
        {top.length === 0 ? <Text style={s.p}>{L.empty}</Text> : top.map((i, k) => (
          <View key={i.key + k} style={s.lesson} role="listitem"><View style={s.num} aria-hidden><Text style={s.numT}>{k + 1}</Text></View><Text style={[s.p, { flex: 1, color: color.navy }]}>{insightText(i)}</Text></View>))}
        <Button label={L.start} onPress={onStart} />
        {(globalThis as any).document ? <Button label={saved ? L.saved : L.save} kind="ghost" onPress={() => { const doc = (globalThis as any).document; const text = [L.title, L.heading.replace("{name}", me.name), "", `${L.cash}: ${money(me.final.cash)}`, `${L.passive}: ${money(me.final.passive)}`, `${L.decisions}: ${made}`, "", ...top.map((i, k) => `${k + 1}. ${insightText(i)}`)].join("\n"); const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })); const a = doc.createElement("a"); a.href = url; a.download = "tajriba24-saboq.txt"; doc.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); setSaved(true); }} /> : null}
      </View>
    </Card>);
}
const Stat = ({ label, value }: { label: string; value: string }) => (<View style={s.stat}><Text style={s.sl}>{label}</Text><Text style={s.sv}>{value}</Text></View>);
const s = StyleSheet.create({
  badge: { color: tone.muted, fontWeight: "700", fontSize: font.sm, textTransform: "uppercase", letterSpacing: 1 }, h: { color: color.navy, fontSize: font.xl, fontWeight: "800" }, p: { color: tone.muted, fontSize: font.md, lineHeight: 22 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space.sm }, stat: { flexGrow: 1, flexBasis: 140, padding: space.md, borderRadius: radius.md, backgroundColor: "#F4F7F8" }, sl: { color: tone.muted, fontSize: font.sm, fontWeight: "700" }, sv: { color: color.navy, fontSize: font.lg, fontWeight: "800" },
  lesson: { flexDirection: "row", gap: space.md, alignItems: "flex-start" }, num: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.green, alignItems: "center", justifyContent: "center" }, numT: { color: color.white, fontWeight: "800" },
});
