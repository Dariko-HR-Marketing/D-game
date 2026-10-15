import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { color, font, radius, space, tone } from "../theme";
import { money } from "../format";
import { nameOf, currentId } from "../model";
import { uz } from "../i18n/uz";
import type { RoomView } from "../net/connection";

export const levelOf = (room: RoomView, id: string): number | undefined => room.names?.[id]?.level;

/** O'yinchilar lentasi (maket N11/D1): rasm + daraja nishoni, ism, holat (Navbatda / Onlayn / Oflayn). Navbatdagisi yashil ramkada. */
export function PlayersLane({ room, userId, wide }: { room: RoomView; userId: string; wide?: boolean }) {
  const players: any[] = room.state.players; const cur = currentId(room);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.row, wide && { flexWrap: "nowrap" }]} role="group" aria-label={uz.game.players}>
      {players.map((p, k) => {
        const isCur = p.id === cur, isMe = p.id === userId, mem = room.members.find((m) => m.userId === p.id);
        const bot = room.state.bots.includes(p.id), off = !bot && mem?.online === false;
        const name = nameOf(room, p.id), cidx = room.names?.[p.id]?.color ?? k, lvl = levelOf(room, p.id);
        const status = isCur ? uz.hud.onTurn : off ? uz.hud.offline : uz.hud.online;
        return (
          <View key={p.id} role="group" accessible aria-label={`${k + 1}. ${name}${isMe ? `, ${uz.hud.you}` : ""}${lvl !== undefined ? `, ${lvl}-daraja` : ""}. ${status}. ${uz.game.cash}: ${money(p.cash)}. ${p.circle === "big" ? uz.hud.bigCircle : uz.hud.smallCircle}`}
            style={[s.card, wide && s.cardWide, isCur && s.cur, off && { opacity: 0.9 }]}>
            <Avatar name={name} colorIdx={cidx} level={lvl} online={bot ? undefined : !off} size={wide ? 44 : 44} frame={room.names?.[p.id]?.cos?.frame} bgColor={room.names?.[p.id]?.cos?.avatar} />
            <View aria-hidden style={{ flexShrink: 1 }}>
              <Text style={s.name} numberOfLines={1}>{name}{isMe ? ` (${uz.hud.you})` : ""}</Text>
              <Text style={[s.status, isCur && { color: tone.good }, off && { color: tone.bad }]}>{status}{off ? ` · ${uz.hud.autoNote}` : ""}</Text>
              {wide && <Text style={s.sub}>{p.circle === "big" ? uz.hud.bigCircle : uz.hud.smallCircle}</Text>}
            </View>
            {p.circle === "big" && <Icon name="star" size={14} color="#B7791F" fill="#F5B82E" />}
          </View>);
      })}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  row: { gap: space.sm, paddingVertical: space.xs, paddingHorizontal: 2 },
  card: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.sm, paddingRight: space.md, backgroundColor: color.white, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E6ECEF", minWidth: 104 },
  cardWide: { minWidth: 200, flex: 1 },
  cur: { borderColor: color.green, borderWidth: 2, backgroundColor: "#EEF8F2" },
  name: { color: color.navy, fontWeight: "800", fontSize: font.sm, maxWidth: 110 }, status: { color: tone.muted, fontSize: 11, fontWeight: "700" }, sub: { color: tone.muted, fontSize: 11 },
});
