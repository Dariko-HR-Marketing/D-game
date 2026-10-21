import { diceOf, placeholderCount } from "../dice";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "./Button";
import { Dice } from "./Dice";
import { TimerRing } from "./TimerRing";
import { cellLabel } from "./Board";
import { nameOf, phaseSeconds } from "../model";
import { uz } from "../i18n/uz";
import { color, font, space, tone } from "../theme";
import type { RoomView } from "../net/connection";

/** Taxta markazi (maket N11): turgan katak nomi, kubik natijasi, kimning navbati. Kompyuterda taymer va asosiy tugma ham shu yerda. */
/** Oxirgi tashlangan kubik(lar) yoki tashlashdan oldin «?» (katta aylanada ikkita). */
function DiceRow({ lr, circle, twoDice, size }: { lr: { die: number; dice?: number[]; n: number } | null | undefined; circle: string; twoDice?: number; size: number }) {
  const list: (number | null)[] = diceOf(lr, false) ?? Array.from({ length: placeholderCount(circle, twoDice) }, () => null); const sz = list.length > 1 ? Math.round(size * 0.86) : size;
  return <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }} testID="turn-dice">{list.map((v, i) => <Dice key={i} value={v} n={lr ? lr.n * 2 + i : undefined} size={sz} />)}</View>;
}
export function TurnPanel({ room, userId, mineTurn, hasCard, left, onRoll, wide, compact, moving, gate }: { compact?: boolean; gate?: React.ReactNode; room: RoomView; userId: string; mineTurn: boolean; hasCard: boolean; left: number; onRoll: () => void; wide?: boolean; moving?: boolean }) {
  const st = room.state; const lr = st.lastRoll as { playerId: string; die: number; n: number } | null | undefined;
  const cur = st.players[st.turn % st.players.length]; const curId: string = cur.id;
  const who = lr ? (lr.playerId === userId ? uz.result.you : nameOf(room, lr.playerId)) : null;
  const big = cur.circle === "big";
  if (st.winner) return (<><Text style={s.eyebrow}>{uz.game.winner}</Text><Text style={s.title}>{nameOf(room, st.winner)}</Text></>);
  const hint = big ? uz.hud.hintBig : uz.hud.hintSmall;
  if (compact) return ( // yotiq telefon: taxta markazi kichik — kubik, taymer, qisqa matn va tugma
    <View style={s.wrapC} testID="turn-panel">
      <View style={s.rowC}>
        <DiceRow lr={lr} circle={cur.circle} twoDice={cur.twoDice} size={36} />
        {left > 0 && <TimerRing left={left} total={phaseSeconds(room)} size={40} label={`${left} ${uz.game.seconds}`} />}
      </View>
      <Text style={[s.turnC, mineTurn && { color: tone.good }]} numberOfLines={2} accessibilityLiveRegion="polite">{lr && !mineTurn ? `${who} ${uz.game.rolled}: ${lr.die}` : mineTurn ? (hasCard && !moving ? uz.game.decideBelow : lr ? `${who} ${uz.game.rolled}: ${lr.die}` : uz.game.yourTurn) : `${uz.game.waitFor} ${nameOf(room, curId)}`}</Text>
      {gate ? <View style={{ alignSelf: "stretch" }}>{gate}</View> : mineTurn && !hasCard && !moving ? <View style={{ alignSelf: "stretch", paddingHorizontal: space.sm }}><Button label={big ? uz.hud.rollBig : uz.hud.rollSmall} onPress={onRoll} /></View> : null}
    </View>
  );
  return (
    <View style={s.wrap} testID="turn-panel">
      {!compact && <Text style={s.eyebrow}>{cellLabel(cur.circle, cur.pos)}</Text>}
      <DiceRow lr={lr} circle={cur.circle} twoDice={cur.twoDice} size={wide ? 56 : 44} />
      <Text style={s.title} accessibilityLiveRegion="polite">{lr ? `${who} ${uz.game.rolled}: ${lr.die}` : mineTurn ? uz.hud.rollNow : `${uz.game.waitFor} ${nameOf(room, curId)}`}</Text>
      {!compact && <Text style={s.sub}>{hint}</Text>}
      {wide && (
        <View style={s.wideRow}>
          {left > 0 && <TimerRing left={left} total={phaseSeconds(room)} size={48} label={`${left} ${uz.game.seconds}`} />}
          <Text style={[s.turn, mineTurn && { color: tone.good }]} accessibilityLiveRegion="polite">{mineTurn ? uz.game.yourTurn : `${uz.game.waitFor} ${nameOf(room, curId)}`}</Text>
        </View>)}
      {wide && gate ? <View style={{ alignSelf: "stretch" }}>{gate}</View> : null}
      {wide && !gate && mineTurn && !hasCard && !moving && <View style={{ alignSelf: "stretch", paddingHorizontal: space.md }}><Button label={big ? uz.hud.rollBig : uz.hud.rollSmall} onPress={onRoll} /></View>}
      {mineTurn && hasCard && !moving && <Text style={s.sub}>{uz.game.decideBelow}</Text>}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { alignItems: "center", gap: space.sm, paddingHorizontal: space.md },
  eyebrow: { color: tone.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1.2, textAlign: "center" },
  title: { color: color.navy, fontSize: font.xl, fontWeight: "800", textAlign: "center", lineHeight: 26 }, sub: { color: tone.muted, fontSize: font.sm, textAlign: "center" },
  wrapC: { alignItems: "center", gap: 4, paddingHorizontal: space.sm }, rowC: { flexDirection: "row", alignItems: "center", gap: space.md }, turnC: { color: color.navy, fontSize: font.sm, fontWeight: "800", textAlign: "center" },
  wideRow: { flexDirection: "row", alignItems: "center", gap: space.md }, turn: { fontSize: font.lg, fontWeight: "800", color: color.navy },
});
