import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Pill, Row } from "./kit";
import { cardFacts } from "../cardFacts";
import { nameOf } from "../model";
import { uz } from "../i18n/uz";
import { color, font, MIN_TAP, radius, shadow, space, tone } from "../theme";
import type { RoomView } from "../net/connection";

const deckOf = (id: string) => uz.deck[id.split("-")[0]] ?? uz.deck.other;

/** Tortilgan karta haqida xabar: majburiy karta darhol qo'llangani uchun (qaror oynasi yo'q) nima bo'lganini ko'rsatadi; boshqalarning kartalari ham ko'rinadi. */
export function CardToast({ room, userId }: { room: RoomView; userId: string }) {
  const lc = room.state.lastCard as { playerId: string; cardId: string; n: number } | null | undefined; const card = room.lastCard;
  const [seen, setSeen] = useState(0);
  const mineMandatory = !!lc && !!card && lc.playerId === userId && card.mode === "mandatory";
  useEffect(() => { if (!lc || mineMandatory) return; const h = setTimeout(() => setSeen(lc.n), 9000); return () => clearTimeout(h); }, [lc?.n, mineMandatory]);
  if (!lc || !card || lc.n <= seen || room.pendingCard) return null;
  if (lc.playerId === userId && card.mode !== "mandatory") return null; // o'z ixtiyoriy kartangiz — qaror oynasi allaqachon ko'rsatgan
  const f = cardFacts(card.effect, { cash: 0, salary: 0, assets: [] }, 0);
  const who = lc.playerId === userId ? uz.result.you : nameOf(room, lc.playerId);
  return (
    <View style={s.wrap} pointerEvents="box-none">
      <View style={s.toast} role="status" accessibilityLiveRegion="polite" aria-label={`${who}: ${deckOf(lc.cardId)}. ${card.text}`}>
        <View style={s.head}>
          <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap", flex: 1 }}><Pill label={`${who} ${uz.game.drew}`} kind={lc.playerId === userId ? "bad" : "info"} /><Pill label={deckOf(lc.cardId)} kind="plain" /></View>
          <Pressable accessibilityRole="button" accessibilityLabel={uz.game.close} onPress={() => setSeen(lc.n)} style={s.x}><Text style={s.xT} aria-hidden>✕</Text></Pressable>
        </View>
        <Text style={s.text}>{card.text}</Text>
        {f.rows.map((r) => <Row key={r.label} l={r.label} v={r.value} kind={r.tone === "bad" ? "bad" : r.tone === "good" ? "good" : "neutral"} />)}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { position: "absolute", top: space.sm, left: space.md, right: space.md, alignItems: "center", zIndex: 60 },
  toast: { width: "100%", maxWidth: 520, backgroundColor: color.white, borderRadius: radius.lg, padding: space.lg, gap: space.sm, borderWidth: 2, borderColor: color.navy, ...shadow, shadowOpacity: 0.25, shadowRadius: 16 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.sm }, x: { width: MIN_TAP, height: MIN_TAP, alignItems: "center", justifyContent: "center", marginTop: -space.sm, marginRight: -space.sm }, xT: { color: tone.muted, fontSize: font.lg, fontWeight: "800" },
  text: { color: color.navy, fontSize: font.md, lineHeight: 22, fontWeight: "600" },
});
