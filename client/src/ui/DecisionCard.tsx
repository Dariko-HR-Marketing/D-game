import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Button } from "./Button";
import { Banner, Card, Pill, Row } from "./kit";
import { Dice } from "./Dice";
import { Icon, type IconName } from "./Icon";
import { TimerRing } from "./TimerRing";
import { CardFace } from "./CardFace";
import { cardFacts } from "../cardFacts";
import { exitProgress } from "../model";
import { crisisAdjusted } from "@poyga/rules";
import { money } from "../format";
import { uz } from "../i18n/uz";
import { color, font, radius, space, tone } from "../theme";

const deckOf = (id: string) => uz.deck[id.split("-")[0]] ?? uz.deck.other;
/** Karta turi → sarlavha rangi va ikonka (maket N13: Imkoniyat — yashil, Bozor — ko'k, Xarajat — qizil). */
const HEAD: Record<string, { bg: string; border: string; fg: string; icon: IconName; title: string }> = {
  kichik: { bg: "#DCEEC4", border: "#A9CF7E", fg: "#0A5C3B", icon: "move", title: "Imkoniyat" }, katta: { bg: "#DCEEC4", border: "#A9CF7E", fg: "#0A5C3B", icon: "move", title: "Imkoniyat" },
  choose: { bg: "#DCEEC4", border: "#A9CF7E", fg: "#0A5C3B", icon: "move", title: "Imkoniyat" },
  bozor: { bg: "#C9EBFA", border: "#7CC3E3", fg: "#0E5F85", icon: "cart", title: "Bozor" }, xar: { bg: "#FFD2D5", border: "#E8939B", fg: "#8F2434", icon: "search", title: "Xarajatlar" },
  kxar: { bg: "#FFD2D5", border: "#E8939B", fg: "#8F2434", icon: "star", title: "Orzu · katta xarajat" }, hod: { bg: "#EDF0F3", border: "#C3CBD3", fg: "#1B2733", icon: "alert", title: "Kutilmagan hodisa" },
  big: { bg: "#C9EBFA", border: "#7CC3E3", fg: "#0E5F85", icon: "house", title: "Katta aylana biznesi" }, rent: { bg: "#FFE3B8", border: "#E9A64B", fg: "#6B4300", icon: "house", title: "Birovning biznesi" },
};
const headOf = (id: string, e: any) => {
  if (e?.kind === "gamble") return { ...HEAD.big, bg: "#FFE3B8", border: "#E9A64B", fg: "#6B4300", icon: "dice" as IconName, title: "Tavakkal biznes" };
  const known = HEAD[id.split("-")[0]]; if (known) return known;
  // Yangi kartalar («new») o'z dekasiga ko'ra: sarmoya/xarajat/bozor/hodisa
  return e?.kind === "pay" || e?.kind === "carInsurance" || e?.kind === "floodCarRepair" ? HEAD.xar : e?.kind === "buy" || e?.kind === "courseSalaryPlus" || e?.kind === "charity" ? HEAD.kichik : e?.kind === "marketSale" || e?.kind === "debtRepaid" || e?.kind === "tenantLeft" ? HEAD.bozor : HEAD.big;
};


/** Dekani tanlash (naqd 25 000 dan ko'p, maket N12): ikkita katta tanlov. Vaqt tugasa «Kichik sarmoyalar». */
function DeckChoice({ e, onAct, left }: { e: any; onAct: (a: Record<string, unknown>) => void; left?: number }) {
  const Tile = ({ deck, label, n, bg, fg }: { deck: "kichik" | "katta"; label: string; n: number; bg: string; fg: string }) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${n} ${uz.hud.deckCards}`} onPress={() => onAct({ type: "decide", accept: false, deck })} style={({ pressed }) => [s.deckTile, pressed && { opacity: 0.85 }]}>
      <View style={[s.deckArt, { backgroundColor: bg }]} aria-hidden><Text style={[s.deckArtT, { color: fg }]}>{label.toUpperCase()}</Text></View>
      <Text style={s.deckName} aria-hidden>{label}</Text><Text style={s.deckN} aria-hidden>{n} {uz.hud.deckCards}</Text>
    </Pressable>);
  return (
    <View style={{ gap: space.md }}>
      <Text style={s.deckTitle} aria-level={2} accessibilityRole="header">{uz.hud.deckChoiceTitle}</Text>
      <View style={{ flexDirection: "row", gap: space.md }}>
        <Tile deck="kichik" label={uz.hud.deckSmall} n={e.kichik} bg="#1E9E4A" fg="#fff" /><Tile deck="katta" label={uz.hud.deckBig} n={e.katta} bg="#E8892B" fg="#2B1500" />
      </View>
      <View style={s.note}><Icon name="clock" size={18} color={tone.muted} /><Text style={s.noteT}>{uz.hud.deckChoiceNote}</Text></View>
      <View style={s.note}><Icon name="info" size={18} color={tone.muted} /><Text style={s.noteT}>{uz.hud.deckChoiceWhy}</Text></View>
    </View>
  );
}

/** Qaror kartasi (maket N13): rangli sarlavha (kubik, karta turi, taymer), rasm/matn, «O'zgarishlar» (oldin → keyin), muddat haqida ogohlantirish va asosiy tugma. */
/** `layout` (kompyuter): matn va tugmalarni alohida joylashtirish — uzun karta aylansa ham asosiy tugmalar pastda qotib turadi. */
export function DecisionCard({ card, me, bankRoom, onAct, sheet, left, die, layout }: { card: any; me: any; bankRoom: number; onAct: (a: Record<string, unknown>) => void; sheet?: boolean; left?: number; die?: number | null; layout?: (body: React.ReactNode, actions: React.ReactNode) => React.ReactNode }) {
  const e0 = card.effect; const f = cardFacts(e0, me, bankRoom);
  const e = e0 ? crisisAdjusted(e0, me) : e0; // inqirozda aksiya narxi ham yarim (server shunday hisoblaydi)
  const [q, setQ] = useState(String(e?.min ?? 1)); const [artOk, setArtOk] = useState(false); const { height: vh } = useWindowDimensions();
  const artH = Math.round(sheet ? Math.min(300, vh * 0.34) : Math.min(360, vh * 0.4)); // asl rasm kesilmaydi, ekran balandligiga moslanadi
  const mandatory = card.mode === "mandatory", shares = e?.kind === "buyShares", hod7 = e?.kind === "payOrLoseBusiness", rent = e?.kind === "rentChoice", gamble = e?.kind === "gamble";
  const cashOnly = gamble || String(card.id).startsWith("big-"); // katta aylana biznesi: faqat naqd
  const qty = Number(q) || 0, cost = shares ? qty * (e.pricePerShare) : f.need;
  const lack = cost !== null && cost !== undefined && cost > me.cash ? cost - me.cash : 0;
  const purchase = e?.kind === "buy" || shares; // bank krediti faqat sotib olish uchun (qo'llanma §08)
  const bankOk = lack > 0 && !cashOnly && purchase ? lack <= bankRoom : lack > 0 ? false : null;
  const cantFund = lack > 0 && !bankOk && !hod7;
  const rentCantBuy = rent && me.cash < e.buyPrice;
  const H = headOf(String(card.id), e);
  const flow = exitProgress(me).cashflow;
  const gainCash = e?.kind === "gain" ? e.amount : 0;
  const afterCash = me.cash - (cost ?? 0) + gainCash;
  const showChange = !rent && (cost !== null && cost !== undefined && cost > 0 || gainCash > 0 || (f.flowDelta ?? 0) !== 0);
  const inner = e?.kind === "deckChoice" ? <DeckChoice e={e} onAct={onAct} left={left} /> : null;
  const body = (
    <>
      <View style={[s.head, { backgroundColor: H.bg, borderColor: H.border }]}>
        {typeof die === "number" ? <Dice value={die} size={48} /> : <View style={[s.headIcon, { borderColor: H.border }]}><Icon name={H.icon} size={24} color={H.fg} /></View>}
        <View style={{ flex: 1 }}>
          <Text style={[s.headEyebrow, { color: H.fg }]}>{typeof die === "number" ? `${uz.gamble.die} ${die} · ` : ""}{deckOf(card.id)}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon name={H.icon} size={20} color={H.fg} /><Text style={[s.headTitle, { color: H.fg }]} aria-level={2} accessibilityRole="header">{H.title}</Text></View>
        </View>
        {left ? <TimerRing left={left} size={46} label={`${left} ${uz.game.seconds}`} /> : null}
      </View>
      <View style={s.badges}><Pill label={mandatory ? uz.hud.majburiy : uz.hud.ixtiyoriy} kind={mandatory ? "bad" : "plain"} />{f.rows.some((r) => r.label === uz.facts.income) && <Pill label={uz.facts.income} kind="good" />}</View>
      <CardFace key={card.id} file={card.file} label={card.text} maxH={artH} onState={setArtOk} />
      <Text style={artOk ? s.sr : s.text} aria-hidden={artOk}>{card.text}</Text>
      {showChange && (
        <View style={{ gap: space.xs }}>
          <Text style={s.sec} aria-level={3} accessibilityRole="header">{uz.hud.changes.toUpperCase()}</Text>
          <View style={s.change}><Text style={s.chL}>{uz.facts.yourCash.replace("Sizning naqdingiz", "Naqd")}</Text><Text style={s.chV}><Text style={{ color: tone.muted }}>{money(me.cash)}</Text> → <Text style={{ color: afterCash < 0 ? tone.bad : tone.good }}>{money(afterCash)}</Text></Text></View>
          {f.flowDelta !== null && f.flowDelta !== 0 && <View style={s.change}><Text style={s.chL}>{uz.game.cashflow}</Text><Text style={s.chV}><Text style={{ color: tone.muted }}>{money(flow)}</Text> → <Text style={{ color: flow + f.flowDelta < 0 ? tone.bad : tone.good }}>{money(flow + f.flowDelta)}</Text></Text></View>}
        </View>)}
      {f.rows.length > 0 && (<View style={s.facts} accessibilityLabel={uz.facts.title}>{f.rows.map((r) => <Row key={r.label} l={r.label} v={r.value} kind={r.tone === "bad" ? "bad" : r.tone === "good" ? "good" : "neutral"} />)}</View>)}
      {shares && (<View style={{ gap: space.sm }}>
        <Text style={s.label} nativeID="qtyL">{uz.coop.shares} ({e.min}–{e.max})</Text>
        <TextInput accessibilityLabelledBy="qtyL" aria-label={uz.coop.shares} value={q} keyboardType="number-pad" onChangeText={(t) => setQ(t.replace(/\D/g, ""))} style={s.input} />
        <Row l={uz.facts.total} v={money(qty * e.pricePerShare)} /></View>)}
      {lack > 0 && bankOk && <Banner kind="warn">{uz.facts.short}: {money(lack)}. {uz.facts.bankAuto}.</Banner>}
      {lack > 0 && cashOnly && <Banner kind="bad">{uz.facts.short}: {money(lack)}. {uz.facts.cashOnly}.</Banner>}
      {cantFund && !cashOnly && <Banner kind="bad">{uz.facts.short}: {money(lack)}. {purchase ? uz.facts.bankNo : uz.facts.cashNeeded}.</Banner>}
      {lack === 0 && cost ? <Banner kind="good">{uz.facts.enough}</Banner> : null}
      {f.notes.map((n) => <Text key={n} style={s.noteT}>{n}</Text>)}
      <View style={s.warn}><Icon name="clock" size={18} color={tone.warn} /><Text style={s.warnT}>{uz.hud.timeNote}</Text></View>
    </>
  );
  const actions = (<>
      {!mandatory && rent && (<View style={{ gap: space.sm }}>
        <Button label={`${uz.facts.rentBuy} · ${money(e.buyPrice)}`} disabled={rentCantBuy} onPress={() => onAct({ type: "decide", accept: true })} />
        <Button label={`${uz.facts.rentIncome} · ${money(e.income)}`} kind="ghost" onPress={() => onAct({ type: "decide", accept: false })} /></View>)}
      {!mandatory && !rent && (<View style={{ gap: space.sm }}>
        <Button label={gamble ? `${uz.gamble.title} · ${money(cost ?? 0)}` : hod7 ? uz.hod7.pay : cost ? `${money(cost)} sh.b. olish` : uz.game.accept}
          disabled={(shares && (qty < e.min || qty > e.max)) || cantFund}
          onPress={() => onAct({ type: "decide", accept: true, useBank: !cashOnly, ...(shares ? { qty } : {}) })} />
        <Button label={hod7 ? uz.hod7.lose : uz.game.skip} kind={cantFund && !hod7 ? "primary" : "ghost"} onPress={() => onAct({ type: "decide", accept: false })} /></View>)}
  </>);
  if (e?.kind === "deckChoice") { if (layout) return <>{layout(<View style={{ gap: space.md }}>{inner}</View>, null)}</>; return sheet ? inner : <Card accent="gold" style={{ gap: space.md }}>{inner}</Card>; } // tugmalar DeckChoice ichida; layout bo'lsa ham chap ustun (moliya) saqlanadi
  if (layout) return <>{layout(<View style={{ gap: space.md }}>{body}</View>, <View style={{ gap: space.sm }}>{actions}</View>)}</>;
  const full = <View style={{ gap: space.md }}>{body}{actions}</View>;
  return sheet ? full : <Card accent="gold" style={{ gap: space.md }}>{full}</Card>;
}
const s = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
  headIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: color.white, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headEyebrow: { fontSize: 12, fontWeight: "700" }, headTitle: { fontSize: font.xl, fontWeight: "800" },
  badges: { flexDirection: "row", gap: space.sm, flexWrap: "wrap" },
  sr: { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0 }, text: { color: color.navy, fontSize: font.lg, lineHeight: 24, fontWeight: "600" },
  sec: { color: tone.muted, fontSize: 12, fontWeight: "800", letterSpacing: 0.8 },
  change: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#E6ECEF", borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 44 }, chL: { color: color.navy, fontSize: font.md }, chV: { fontSize: font.lg, fontWeight: "800", fontVariant: ["tabular-nums"] },
  facts: { backgroundColor: color.bg, borderRadius: radius.md, padding: space.md, gap: 2 },
  label: { color: color.navy, fontWeight: "700", fontSize: font.sm },
  input: { minHeight: 44, borderWidth: 1, borderColor: color.line, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: font.lg, backgroundColor: color.white, color: color.navy },
  note: { flexDirection: "row", gap: space.sm, alignItems: "flex-start", backgroundColor: color.bg, borderRadius: radius.md, padding: space.md }, noteT: { color: tone.muted, fontSize: font.sm, lineHeight: 19, flex: 1 },
  warn: { flexDirection: "row", gap: space.sm, alignItems: "flex-start", backgroundColor: "#FFF6DD", borderRadius: radius.md, padding: space.md }, warnT: { color: "#6B4300", fontSize: font.sm, lineHeight: 19, flex: 1, fontWeight: "600" },
  deckTitle: { color: color.navy, fontSize: font.xl, fontWeight: "800" },
  deckTile: { flex: 1, borderWidth: 2, borderColor: color.navy, borderRadius: radius.lg, padding: space.sm, gap: 4, backgroundColor: color.white },
  deckArt: { height: 104, borderRadius: radius.md, alignItems: "center", justifyContent: "center", padding: space.sm }, deckArtT: { fontWeight: "900", fontSize: 18, textAlign: "center", letterSpacing: 0.5 },
  deckName: { color: color.navy, fontWeight: "800", fontSize: font.lg }, deckN: { color: tone.muted, fontSize: font.sm },
});
