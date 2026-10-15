import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { color, font, PLAYER_COLORS, radius, space, tone } from "../theme";
import { readableOn } from "../contrast";
import { money } from "../format";
import { nameOf, currentId } from "../model";
import { uz } from "../i18n/uz";
import type { RoomView } from "../net/connection";

/** O'yinchilar qatori: rang+raqam, ism, naqd, aylana; navbatdagisi ajratilgan (rangdan tashqari belgi va yozuv bilan). */
export function PlayerStrip({ room, userId }: { room: RoomView; userId: string }) {
  const players: any[] = room.state.players; const cur = currentId(room);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row} role="group" aria-label={uz.game.players}>
      {players.map((p, k) => {
        const hue = PLAYER_COLORS[(room.names?.[p.id]?.color ?? k) % 6], isCur = p.id === cur, isMe = p.id === userId, off = room.members.find((m) => m.userId === p.id)?.online === false;
        return (
          <View key={p.id} role="group" accessible aria-label={`${k + 1}. ${nameOf(room, p.id)}${isMe ? `, ${uz.result.you}` : ""}. ${uz.game.cash}: ${money(p.cash)}${isCur ? `. ${uz.game.turnNow}` : ""}${off ? `. ${uz.lobby.offline}` : ""}`}
            style={[s.chip, isCur && s.cur, off && { opacity: 0.55 }]}>
            <View style={[s.dot, { backgroundColor: hue }]} aria-hidden><Text style={[s.dotT, { color: readableOn(hue) }]}>{k + 1}</Text></View>
            <View aria-hidden>
              <Text style={s.name} numberOfLines={1}>{nameOf(room, p.id)}{isMe ? ` · ${uz.result.you}` : ""}{p.circle === "big" ? " ★" : ""}</Text>
              <Text style={s.cash}>{money(p.cash)}{isCur ? ` · ${uz.game.turnNow}` : ""}</Text>
            </View>
          </View>);
      })}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  row: { gap: space.sm, paddingVertical: space.xs },
  chip: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.sm, paddingHorizontal: space.md, backgroundColor: color.white, borderRadius: radius.pill, borderWidth: 1, borderColor: color.line, maxWidth: 220 },
  cur: { borderColor: color.navy, borderWidth: 2, backgroundColor: "#EAF1F7" },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: color.navy, alignItems: "center", justifyContent: "center" }, dotT: { fontSize: 11, fontWeight: "800" },
  name: { color: color.navy, fontWeight: "800", fontSize: font.sm, maxWidth: 140 }, cash: { color: tone.muted, fontSize: font.xs, fontWeight: "600" },
});
