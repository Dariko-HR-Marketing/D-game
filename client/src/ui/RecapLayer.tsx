import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { RULES } from "@poyga/rules";
import { Button } from "./Button";
import { Pill } from "./kit";
import { money } from "../format";
import { humanize, nameOf, me } from "../model";
import { debtOf, insightText, lostIncome, recapInsights, type RecapData } from "../recap";
import { color, font, radius, shadow, space, tone } from "../theme";
import { uz } from "../i18n/uz";
import type { RoomView } from "../net/connection";

const useLeft = (deadline: number | null) => {
  const calc = () => (deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : null); const [left, setLeft] = useState(calc);
  useEffect(() => { setLeft(calc()); const h = setInterval(() => setLeft(calc()), 500); return () => clearInterval(h); }, [deadline]); // eslint-disable-line react-hooks/exhaustive-deps
  return left;
};

/**
 * Bankrot (yangi kasb bilan boshidan): o'yin to'xtaydi. Egasiga tahlil (nima bo'ldi, nimani yo'qotdi, yangi boshlanish) va tanlov: davom etish /
 * vaqtincha chiqib turish (avtopilot) / o'yindan chiqish. Boshqalarga — qisqa xabar. Vaqt tugasa o'yin o'zi davom etadi (server).
 */
export function RecapLayer({ room, userId, onAck, onBreak, onLeave }: { room: RoomView; userId: string; onAck: (id: number) => void; onBreak: () => void; onLeave: () => void }) {
  const r = (room.state?.recaps?.[0] ?? null) as RecapData | null; const left = useLeft(room.deadline); const [askLeave, setAskLeave] = useState(false); const { width, height } = useWindowDimensions(); const compact = height < 520 && width > height; // yotiq telefon: tahlil chapda (aylanadi), tanlovlar o'ngda
  useEffect(() => { setAskLeave(false); }, [r?.id]);
  if (!r) return null;
  if (r.playerId !== userId) {
    return (
      <View style={s.toastWrap} pointerEvents="none" role="status" aria-live="polite" testID="recap-others">
        <View style={s.toast}><Text style={s.toastT}>{uz.recap.others.replace("{name}", nameOf(room, r.playerId))}</Text>{left !== null && <Text style={s.toastS}>{uz.recap.othersSub.replace("{n}", String(left))}</Text>}</View>
      </View>);
  }
  const mine = me(room, userId); const ins = recapInsights(r, RULES.bankLimit); const b = r.before; const card = room.recapCard;
  const lines = (r.recent ?? []).slice().reverse().map((l) => humanize(room, l));
  return (
    <View style={s.layer} role="dialog" aria-modal={true} aria-label={uz.recap.title} testID="recap">
      <View style={s.backdrop} />
      <View style={s.center}>
        <View style={[s.card, compact ? [s.cardRow, { height: height - 24 }] : { maxHeight: Math.max(360, height - 32) }]}>
          <ScrollView style={compact ? { flex: 1 } : undefined} contentContainerStyle={{ gap: space.md }} showsVerticalScrollIndicator {...({ tabIndex: 0 } as any)} aria-label={uz.recap.title}>
            <View style={s.head}><Pill label={uz.recap.title} kind="bad" /><Text style={s.sub}>{uz.recap.sub}</Text></View>
            <View style={s.kasb} role="group" aria-label={`${uz.recap.from}: ${b.kasb}, ${uz.recap.to}: ${r.newKasb}`}>
              <View style={{ flex: 1 }}><Text style={s.kL}>{uz.recap.from}</Text><Text style={s.kV}>{b.kasb || "—"}</Text></View><Text style={s.arrow} aria-hidden>→</Text>
              <View style={{ flex: 1 }}><Text style={s.kL}>{uz.recap.to}</Text><Text style={[s.kV, { color: tone.good }]}>{r.newKasb || "—"}</Text></View>
            </View>
            <Text style={s.h} aria-level={2} accessibilityRole="header">{uz.recap.what}</Text>
            <View style={{ gap: space.xs }} role="list" aria-label={uz.recap.what}>
              {ins.map((i, k) => <View key={k} role="listitem" style={[s.ins, i.tone === "bad" && s.insBad, i.tone === "warn" && s.insWarn]}><Text style={s.insT}>{insightText(i)}</Text></View>)}
            </View>
            {card?.text ? <View style={s.cardBox}><Text style={s.kL}>{uz.recap.cardTitle}</Text><Text style={s.cardT}>{card.title ? `${card.title}: ` : ""}{card.text}</Text></View> : null}
            <Text style={s.h} aria-level={2} accessibilityRole="header">{uz.recap.state}</Text>
            <View style={s.kpis}>
              {([[uz.recap.cash, money(b.cash)], [uz.recap.debt, money(debtOf(r))], [uz.recap.flow, `${b.cashflow > 0 ? "+" : ""}${money(b.cashflow)}`], [uz.recap.salary, money(b.salary)], [uz.recap.passive, money(b.passive)], [uz.recap.expenses, money(b.expenses)]] as [string, string][]).map(([l, v]) => (
                <View key={l} style={s.kpi}><Text style={s.kL}>{l}</Text><Text style={s.kpiV}>{v}</Text></View>))}
            </View>
            {b.assets.length > 0 && (<>
              <Text style={s.h} aria-level={2} accessibilityRole="header">{uz.recap.lost} · {b.assets.length}</Text>
              <View style={{ gap: 2 }} role="list" aria-label={uz.recap.lost}>
                {b.assets.slice(0, 6).map((a, i) => <View key={i} role="listitem" style={s.asset}><Text style={[s.insT, { flex: 1 }]} numberOfLines={2}>{a.name || a.kind}</Text><Text style={s.assetV}>{money(a.price)}{a.income ? ` · +${money(a.income)} ${uz.recap.income}` : ""}</Text></View>)}
                {b.assets.length > 6 && <Text style={s.more}>{uz.recap.more.replace("{n}", String(b.assets.length - 6))} · {money(lostIncome(r))} {uz.recap.income}</Text>}
              </View></>)}
            {lines.length > 0 && (<><Text style={s.h} aria-level={2} accessibilityRole="header">{uz.recap.recent}</Text>{lines.slice(0, 4).map((l, i) => <Text key={i} style={s.log}>• {l}</Text>)}</>)}
            <View style={s.fresh}>
              <Text style={s.h} aria-level={2} accessibilityRole="header">{uz.recap.fresh}</Text>
              <Text style={s.freshT}>{uz.recap.freshHint}</Text>
              {mine && <Text style={s.freshN}>{r.newKasb} · {uz.recap.cash} {money(mine.cash)} · {uz.recap.salary} {money(mine.salary ?? 0)}</Text>}
            </View>
          </ScrollView>
          <View style={[s.actions, compact && s.actionsSide]}>
            {left !== null && <Text style={s.auto} role="timer">{uz.recap.autoIn.replace("{n}", String(left))}</Text>}
            <Button label={uz.recap.cont} onPress={() => onAck(r.id)} />
            <Button label={uz.recap.pause} kind="ghost" onPress={onBreak} /><Text style={s.hint}>{uz.recap.pauseHint}</Text>
            {!askLeave ? <Button label={uz.recap.leave} kind="ghost" onPress={() => setAskLeave(true)} /> : (
              <View style={s.ask} role="group"><Text style={s.insT}>{uz.leave.warn}</Text><Button label={uz.leave.confirm} onPress={onLeave} /><Button label={uz.leave.cancel} kind="ghost" onPress={() => setAskLeave(false)} /></View>)}
          </View>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  layer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 120 }, backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(8,34,56,0.62)" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.md },
  card: { width: "100%", maxWidth: 560, backgroundColor: color.white, borderRadius: radius.lg + 4, borderWidth: 2, borderColor: color.red, padding: space.lg, gap: space.md, ...shadow, shadowOpacity: 0.3, shadowRadius: 28 },
  cardRow: { flexDirection: "row", maxWidth: 820, gap: space.lg }, actionsSide: { width: 270, borderTopWidth: 0, borderLeftWidth: 1, borderLeftColor: color.line, paddingTop: 0, paddingLeft: space.md, justifyContent: "center" },
  head: { gap: space.xs, alignItems: "flex-start" }, sub: { color: tone.muted, fontSize: font.md, lineHeight: 21 },
  kasb: { flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: "#F3F7FA", borderRadius: radius.md, padding: space.md }, arrow: { color: tone.muted, fontSize: font.xl, fontWeight: "800" },
  kL: { color: tone.muted, fontSize: font.xs, fontWeight: "700" }, kV: { color: color.navy, fontSize: font.lg, fontWeight: "800" },
  h: { color: color.navy, fontSize: font.md, fontWeight: "800", marginTop: space.xs },
  ins: { backgroundColor: "#E8F0F7", borderRadius: radius.md, paddingVertical: space.sm, paddingHorizontal: space.md }, insBad: { backgroundColor: "#FDECEC" }, insWarn: { backgroundColor: "#FFF6DD" },
  insT: { color: color.navy, fontSize: font.md, lineHeight: 21 },
  cardBox: { borderLeftWidth: 3, borderLeftColor: color.gold, paddingLeft: space.md, gap: 2 }, cardT: { color: color.navy, fontSize: font.sm, lineHeight: 19 },
  kpis: { flexDirection: "row", flexWrap: "wrap", gap: space.sm }, kpi: { minWidth: 120, flexGrow: 1, flexBasis: 120, backgroundColor: "#F3F7FA", borderRadius: radius.md, padding: space.sm }, kpiV: { color: color.navy, fontSize: font.lg, fontWeight: "800", fontVariant: ["tabular-nums"] },
  asset: { flexDirection: "row", gap: space.sm, justifyContent: "space-between", alignItems: "center", paddingVertical: 2 }, assetV: { color: tone.muted, fontSize: font.sm, fontVariant: ["tabular-nums"] }, more: { color: tone.muted, fontSize: font.sm },
  log: { color: tone.muted, fontSize: font.sm, lineHeight: 19 },
  fresh: { backgroundColor: "#EAF6EF", borderRadius: radius.md, padding: space.md, gap: space.xs }, freshT: { color: color.navy, fontSize: font.sm, lineHeight: 19 }, freshN: { color: tone.good, fontSize: font.md, fontWeight: "800" },
  actions: { gap: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: color.line }, auto: { color: tone.muted, fontSize: font.sm, textAlign: "center", fontVariant: ["tabular-nums"] }, hint: { color: tone.muted, fontSize: font.xs, textAlign: "center" },
  ask: { gap: space.sm, backgroundColor: "#FDECEC", borderRadius: radius.md, padding: space.md },
  toastWrap: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center", paddingTop: 72, zIndex: 110 },
  toast: { backgroundColor: color.navy, borderRadius: radius.lg, paddingVertical: space.sm, paddingHorizontal: space.lg, alignItems: "center", maxWidth: 520, ...shadow }, toastT: { color: color.white, fontSize: font.md, fontWeight: "800", textAlign: "center" }, toastS: { color: "#C9D6E0", fontSize: font.sm },
});
