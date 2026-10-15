import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Image, StyleSheet } from "react-native";
import { Button } from "./Button";
import { Banner, Card, Pill, Row } from "./kit";
import { CARD_IMAGES_BASE, cardImageUrl } from "../cardImage";
import { cardFacts } from "../cardFacts";
import { crisisAdjusted } from "@poyga/rules";
import { money } from "../format";
import { uz } from "../i18n/uz";
import { color, font, radius, space, tone } from "../theme";

const deckOf = (id: string) => uz.deck[id.split("-")[0]] ?? uz.deck.other;

function CardArt({ file, text }: { file?: string; text: string }) {
  const url = cardImageUrl(CARD_IMAGES_BASE, file); const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (!url || failed) return null;
  return <Image source={{ uri: url }} accessibilityLabel={text} resizeMode="contain" style={s.art} onError={() => setFailed(true)} />;
}

/** Qaror kartasi: turi, rasm/matn, raqamlar (narx, to'lov, daromad, pul oqimiga ta'sir), naqd yetishi va harakatlar. */
export function DecisionCard({ card, me, bankRoom, onAct, sheet, left }: { card: any; me: any; bankRoom: number; onAct: (a: Record<string, unknown>) => void; sheet?: boolean; left?: number }) {
  const e0 = card.effect; const f = cardFacts(e0, me, bankRoom);
  const e = e0 ? crisisAdjusted(e0, me) : e0; // inqirozda aksiya narxi ham yarim (server shunday hisoblaydi)
  const [q, setQ] = useState(String(e?.min ?? 1));
  const mandatory = card.mode === "mandatory", shares = e?.kind === "buyShares", hod7 = e?.kind === "payOrLoseBusiness", rent = e?.kind === "rentChoice", gamble = e?.kind === "gamble";
  const cashOnly = gamble || String(card.id).startsWith("big-"); // katta aylana biznesi: faqat naqd
  const qty = Number(q) || 0, cost = shares ? qty * (e.pricePerShare) : f.need;
  const lack = cost !== null && cost !== undefined && cost > me.cash ? cost - me.cash : 0;
  const bankOk = lack > 0 && !cashOnly ? lack <= bankRoom : lack > 0 ? false : null;
  const rentCantBuy = rent && me.cash < e.buyPrice;
  const inner = (
    <View style={{ gap: space.md }}>
      <View style={s.head}><View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}><Pill label={mandatory ? uz.game.mandatory : uz.game.optional} kind={mandatory ? "bad" : "warn"} /><Pill label={deckOf(card.id)} kind="info" /></View>
        {left ? <Text style={s.timer} accessibilityLabel={`${left} ${uz.game.seconds}`}>{left} {uz.game.secShort}</Text> : null}</View>
      <CardArt file={card.file} text={card.text} />
      <Text style={s.text}>{card.text}</Text>
      {f.rows.length > 0 && (<View style={s.facts} accessibilityLabel={uz.facts.title}>{f.rows.map((r) => <Row key={r.label} l={r.label} v={r.value} kind={r.tone === "bad" ? "bad" : r.tone === "good" ? "good" : "neutral"} />)}</View>)}
      {shares && (<View style={{ gap: space.sm }}>
        <Text style={s.label} nativeID="qtyL">{uz.coop.shares} ({e.min}–{e.max})</Text>
        <TextInput accessibilityLabelledBy="qtyL" aria-label={uz.coop.shares} value={q} keyboardType="number-pad" onChangeText={(t) => setQ(t.replace(/\D/g, ""))} style={s.input} />
        <Row l={uz.facts.total} v={money(qty * e.pricePerShare)} /></View>)}
      {cost !== null && cost !== undefined && cost > 0 && <Row l={uz.facts.yourCash} v={money(me.cash)} />}
      {lack > 0 && bankOk && <Banner kind="warn">{uz.facts.short}: {money(lack)}. {uz.facts.bankAuto}.</Banner>}
      {lack > 0 && cashOnly && <Banner kind="bad">{uz.facts.short}: {money(lack)}. {uz.facts.cashOnly}.</Banner>}
      {lack > 0 && bankOk === false && !hod7 && !cashOnly && <Banner kind="bad">{uz.facts.short}: {money(lack)}. {uz.facts.bankNo}.</Banner>}
      {lack === 0 && cost ? <Banner kind="good">{uz.facts.enough}</Banner> : null}
      {f.notes.map((n) => <Text key={n} style={s.note}>{n}</Text>)}
      {!mandatory && rent && (<View style={{ gap: space.sm }}>
        <Button label={`${uz.facts.rentBuy} · ${money(e.buyPrice)}`} disabled={rentCantBuy} onPress={() => onAct({ type: "decide", accept: true })} />
        <Button label={`${uz.facts.rentIncome} · ${money(e.income)}`} kind="ghost" onPress={() => onAct({ type: "decide", accept: false })} /></View>)}
      {!mandatory && !rent && (<View style={{ gap: space.sm }}>
        <Button label={gamble ? `${uz.gamble.title} · ${money(cost ?? 0)}` : hod7 ? uz.hod7.pay : cost ? `${uz.game.accept} · ${money(cost)}` : uz.game.accept} disabled={(shares && (qty < e.min || qty > e.max)) || (cashOnly && lack > 0)}
          onPress={() => onAct({ type: "decide", accept: true, useBank: !cashOnly, ...(shares ? { qty } : {}) })} />
        <Button label={hod7 ? uz.hod7.lose : uz.game.skip} kind="ghost" onPress={() => onAct({ type: "decide", accept: false })} /></View>)}
    </View>
  );
  return sheet ? inner : <Card accent="gold" style={{ gap: space.md }}>{inner}</Card>;
}
const s = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm }, timer: { color: tone.muted, fontWeight: "800", fontSize: font.sm },
  art: { width: "100%", height: 200, borderRadius: radius.sm, backgroundColor: color.bg }, text: { color: color.navy, fontSize: font.lg, lineHeight: 24, fontWeight: "600" },
  facts: { backgroundColor: color.bg, borderRadius: radius.md, padding: space.md, gap: 2 }, note: { color: tone.muted, fontSize: font.sm },
  label: { color: color.navy, fontWeight: "700", fontSize: font.sm },
  input: { minHeight: 44, borderWidth: 1, borderColor: color.line, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: font.lg, backgroundColor: color.white, color: color.navy },
});
