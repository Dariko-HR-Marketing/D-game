import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "./Button";
import { Dice } from "./Dice";
import { Pill } from "./kit";
import { nameOf } from "../model";
import { uz } from "../i18n/uz";
import { color, font, space, tone } from "../theme";
import type { RoomView } from "../net/connection";

/** Taxta markazi: oxirgi kubik, kimning navbati, qolgan vaqt va asosiy harakat (kubik tashlash). */
export function TurnPanel({ room, userId, mineTurn, hasCard, left, onRoll, compact }: { room: RoomView; userId: string; mineTurn: boolean; hasCard: boolean; left: number; onRoll: () => void; compact?: boolean }) {
  const st = room.state; const lr = st.lastRoll as { playerId: string; die: number; n: number } | null | undefined;
  const cur = st.players[st.turn % st.players.length].id;
  const who = lr ? (lr.playerId === userId ? uz.result.you : nameOf(room, lr.playerId)) : null;
  if (st.winner) return (<><Text style={s.big} accessibilityLiveRegion="polite">{uz.game.winner}</Text><Text style={s.name}>{nameOf(room, st.winner)}</Text></>);
  return (
    <>
      <Dice value={lr?.die ?? null} n={lr?.n} size={compact ? 52 : 64} />
      <Text style={s.last}>{who ? `${who} ${uz.game.rolled}: ${lr!.die}` : uz.game.diceNone}</Text>
      <View style={s.status}>
        <Text style={[s.turn, mineTurn && { color: tone.good }]} accessibilityLiveRegion="polite">{mineTurn ? uz.game.yourTurn : `${uz.game.waitFor} ${nameOf(room, cur)}`}</Text>
        {left > 0 && <Pill label={`${left} ${uz.game.seconds}`} kind={left <= 8 ? "warn" : "plain"} />}
      </View>
      {mineTurn && !hasCard && <View style={{ alignSelf: "stretch", paddingHorizontal: space.md }}><Button label={uz.game.roll} onPress={onRoll} /></View>}
      {mineTurn && hasCard && <Text style={s.hint}>{uz.game.decideBelow}</Text>}
    </>
  );
}
const s = StyleSheet.create({
  big: { fontSize: font.xl, fontWeight: "800", color: color.navy }, name: { fontSize: font.xxl, fontWeight: "800", color: tone.good, textAlign: "center" },
  last: { color: tone.muted, fontSize: font.sm, fontWeight: "600" }, status: { alignItems: "center", gap: space.xs },
  turn: { fontSize: font.lg, fontWeight: "800", color: color.navy, textAlign: "center" }, hint: { color: tone.muted, fontSize: font.sm, textAlign: "center" },
});
