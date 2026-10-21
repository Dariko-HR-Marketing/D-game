import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, useWindowDimensions } from "react-native";
import { Pill, Row } from "./kit";
import { CardFace } from "./CardFace";
import { CardPaper } from "./CardPaper";
import { headOf } from "./cardLook";
import { cardFacts } from "../cardFacts";
import { nameOf } from "../model";
import { uz } from "../i18n/uz";
import { color, font, HEADER_H, MIN_TAP, radius, shadow, space, tone } from "../theme";
import type { RoomView } from "../net/connection";

const seenByRoom = new Map<string, number>();
/** Xabar kartasi 30 soniya (qaror vaqti, SPEC §5.2) yoki «✕» bosilguncha turadi; o'zi erta yo'qolmaydi. */
export const TOAST_MS = 30_000;
const deckOf = (id: string) => uz.deck[id.split("-")[0]] ?? uz.deck.other;

/** Tortilgan karta haqida xabar: majburiy karta darhol qo'llangani uchun (qaror oynasi yo'q) nima bo'lganini ko'rsatadi; boshqalarning kartalari ham ko'rinadi. */
export function CardToast({ room, userId, hold, offset = 0 }: { room: RoomView; userId: string; hold?: boolean; offset?: number }) {
  const lc = room.state.lastCard as { playerId: string; cardId: string; n: number } | null | undefined; const card = room.lastCard;
  const [seen, setSeenState] = useState(() => seenByRoom.get(room.code) ?? 0); const [art, setArt] = useState(false); const { height: vh, width: vw } = useWindowDimensions();
  const setSeen = (n: number) => { seenByRoom.set(room.code, n); setSeenState(n); }; // ekran almashsa (qoidalar) qayta chiqmasin
  const mineMandatory = !!lc && !!card && lc.playerId === userId && card.mode === "mandatory";
  // O'z ixtiyoriy kartangiz — qaror oynasi allaqachon ko'rsatgan (bozor kartasi bundan mustasno: u qaror oynasiga ega emas)
  const ownDecided = !!lc && !!card && lc.playerId === userId && card.mode !== "mandatory" && (card.effect as any)?.kind !== "marketSale";
  const visible = !!lc && !!card && lc.n > seen && !room.pendingCard && !ownDecided && !hold; // fishka yurib bo'lguncha (hold) ko'rsatilmaydi
  // Taymer faqat xabar ko'ringan paytda ishlaydi (boshqa o'yinchi qaror qilayotganda emas)
  useEffect(() => { if (!visible) return; const h = setTimeout(() => setSeen(lc!.n), TOAST_MS); return () => clearTimeout(h); }, [visible, lc?.n]);
  if (!visible || !lc || !card) return null;
  const drawer = room.state.players.find((p: any) => p.id === lc.playerId);
  const f = cardFacts(card.effect, drawer ? { cash: drawer.cash, salary: drawer.salary, assets: drawer.assets, crisisMonths: drawer.crisisMonths } : { cash: 0, salary: 0, assets: [] }, 0);
  if (lc.playerId !== userId) f.notes.length = 0; // «sizda mashina yo'q» kabi izohlar boshqa o'yinchi uchun ma'nosiz
  const who = lc.playerId === userId ? uz.result.you : nameOf(room, lc.playerId);
  return (
    <View style={[s.wrap, offset ? { top: HEADER_H + space.sm + offset } : null]} pointerEvents="box-none">
      <View style={[s.toast, { maxHeight: vh - HEADER_H - 2 * space.md - offset }]} role="status" accessibilityLiveRegion="polite" aria-label={`${who}: ${deckOf(lc.cardId)}. ${card.text}`}>
        <View style={s.head}>
          <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap", flex: 1 }}><Pill label={`${who} ${uz.game.drew}`} kind={lc.playerId === userId ? "bad" : "info"} />{art ? <Pill label={deckOf(lc.cardId)} kind="plain" /> : null}</View>
          <Pressable accessibilityRole="button" accessibilityLabel={uz.game.close} onPress={() => setSeen(lc.n)} style={s.x}><Text style={s.xT} aria-hidden>✕</Text></Pressable>
        </View>
        <ScrollView tabIndex={0} role="region" aria-label={uz.game.drew} style={{ flexShrink: 1 }} contentContainerStyle={{ flexDirection: art && vw >= 520 ? "row" : "column", gap: space.md, alignItems: art && vw >= 520 ? "flex-start" : "stretch" }}>
          <CardFace key={lc.n} file={card.file} label={card.text} maxH={Math.round(Math.min(vw >= 520 ? 230 : 200, vh * 0.3))} onState={setArt} />
          {art ? (
            <View style={{ flex: 1, gap: space.sm, minWidth: 0 }}>
              <Text style={s.sr} aria-hidden>{card.text}</Text>
              {f.rows.map((r) => <Row key={r.label} l={r.label} v={r.value} kind={r.tone === "bad" ? "bad" : r.tone === "good" ? "good" : "neutral"} />)}
            </View>
          ) : (
            <View style={{ minWidth: 0 }}><CardPaper look={headOf(lc.cardId, card.effect)} deck={deckOf(lc.cardId)} text={card.text} rows={f.rows} /></View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
const seenGamble = new Map<string, number>();
/** Tavakkal biznes natijasi: kubik va yutdi/yutqazdi — hamma ko'radi. */
export function GambleToast({ room, userId, hold, offset = 0 }: { room: RoomView; userId: string; hold?: boolean; offset?: number }) {
  const g = room.state.lastGamble as { playerId: string; cell: number; die: number; won: boolean; n: number } | null | undefined;
  const [seen, setSeenState] = useState(() => seenGamble.get(room.code) ?? 0);
  const setSeen = (n: number) => { seenGamble.set(room.code, n); setSeenState(n); };
  const visible = !!g && g.n > seen && !hold;
  useEffect(() => { if (!visible) return; const h = setTimeout(() => setSeen(g!.n), TOAST_MS); return () => clearTimeout(h); }, [visible, g?.n]);
  if (!visible || !g) return null;
  const who = g.playerId === userId ? uz.result.you : nameOf(room, g.playerId);
  return (
    <View style={[s.wrap, offset ? { top: HEADER_H + space.sm + offset } : null]} pointerEvents="box-none">
      <View style={s.toast} role="status" accessibilityLiveRegion="polite" aria-label={`${who} ${uz.gamble.by}: ${uz.gamble.die} ${g.die}, ${g.won ? uz.gamble.won : uz.gamble.lost}`}>
        <View style={s.head}><View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap", flex: 1 }}><Pill label={`${who} ${uz.gamble.by}`} kind="info" /><Pill label={`${uz.gamble.die}: ${g.die}`} kind="plain" /><Pill label={g.won ? uz.gamble.won : uz.gamble.lost} kind={g.won ? "good" : "bad"} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel={uz.game.close} onPress={() => setSeen(g.n)} style={s.x}><Text style={s.xT} aria-hidden>✕</Text></Pressable></View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { position: "absolute", top: HEADER_H + space.sm, left: space.md, right: space.md, alignItems: "center", zIndex: 60 },
  toast: { width: "100%", maxWidth: 560, backgroundColor: color.white, borderRadius: radius.lg, padding: space.lg, gap: space.sm, borderWidth: 2, borderColor: color.navy, ...shadow, shadowOpacity: 0.25, shadowRadius: 16 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.sm }, x: { width: MIN_TAP, height: MIN_TAP, alignItems: "center", justifyContent: "center", marginTop: -space.sm, marginRight: -space.sm }, xT: { color: tone.muted, fontSize: font.lg, fontWeight: "800" },
  text: { color: color.navy, fontSize: font.md, lineHeight: 22, fontWeight: "600" }, sr: { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0 },
});
