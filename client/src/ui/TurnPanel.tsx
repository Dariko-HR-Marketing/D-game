import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "./Button";
import { Dice } from "./Dice";
import { TimerRing } from "./TimerRing";
import { cellLabel } from "./Board";
import { nameOf } from "../model";
import { uz } from "../i18n/uz";
import { color, font, space, tone } from "../theme";
import type { RoomView } from "../net/connection";

/** Taxta markazi (maket N11): turgan katak nomi, kubik natijasi, kimning navbati. Kompyuterda taymer va asosiy tugma ham shu yerda. */
export function TurnPanel({ room, userId, mineTurn, hasCard, left, onRoll, wide, moving }: { room: RoomView; userId: string; mineTurn: boolean; hasCard: boolean; left: number; onRoll: () => void; wide?: boolean; moving?: boolean }) {
  const st = room.state; const lr = st.lastRoll as { playerId: string; die: number; n: number } | null | undefined;
  const cur = st.players[st.turn % st.players.length]; const curId: string = cur.id;
  const who = lr ? (lr.playerId === userId ? uz.result.you : nameOf(room, lr.playerId)) : null;
  const big = cur.circle === "big";
  if (st.winner) return (<><Text style={s.eyebrow}>{uz.game.winner}</Text><Text style={s.title}>{nameOf(room, st.winner)}</Text></>);
  const hint = big ? uz.hud.hintBig : uz.hud.hintSmall;
  return (
    <View style={s.wrap} testID="turn-panel">
      <Text style={s.eyebrow}>{cellLabel(cur.circle, cur.pos)}</Text>
      <Dice value={lr?.die ?? null} n={lr?.n} size={wide ? 56 : 44} />
      <Text style={s.title} accessibilityLiveRegion="polite">{lr ? `${who} ${uz.game.rolled}: ${lr.die}` : mineTurn ? uz.hud.rollNow : `${uz.game.waitFor} ${nameOf(room, curId)}`}</Text>
      <Text style={s.sub}>{hint}</Text>
      {wide && (
        <View style={s.wideRow}>
          {left > 0 && <TimerRing left={left} size={48} label={`${left} ${uz.game.seconds}`} />}
          <Text style={[s.turn, mineTurn && { color: tone.good }]} accessibilityLiveRegion="polite">{mineTurn ? uz.game.yourTurn : `${uz.game.waitFor} ${nameOf(room, curId)}`}</Text>
        </View>)}
      {wide && mineTurn && !hasCard && !moving && <View style={{ alignSelf: "stretch", paddingHorizontal: space.md }}><Button label={big ? uz.hud.rollBig : uz.hud.rollSmall} onPress={onRoll} /></View>}
      {mineTurn && hasCard && !moving && <Text style={s.sub}>{uz.game.decideBelow}</Text>}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { alignItems: "center", gap: space.sm, paddingHorizontal: space.md },
  eyebrow: { color: tone.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textAlign: "center" },
  title: { color: color.navy, fontSize: font.xl, fontWeight: "800", textAlign: "center", lineHeight: 26 }, sub: { color: tone.muted, fontSize: font.sm, textAlign: "center" },
  wideRow: { flexDirection: "row", alignItems: "center", gap: space.md }, turn: { fontSize: font.lg, fontWeight: "800", color: color.navy },
});
