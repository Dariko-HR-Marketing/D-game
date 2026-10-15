import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Avatar } from "./Avatar";
import { Card, Pill } from "./kit";
import { levelOf } from "./PlayersLane";
import { money } from "../format";
import { nameOf, currentId, exitProgress } from "../model";
import { uz } from "../i18n/uz";
import { color, font, space, tone } from "../theme";
import type { RoomView } from "../net/connection";

/** «O'yinchilar» bo'limi (maket N20): har bir o'yinchining aylanasi, naqdi va pul oqimi. */
export function PlayerList({ room, userId }: { room: RoomView; userId: string }) {
  const cur = currentId(room);
  return (
    <View style={{ gap: space.md }}>
      <Text style={s.h} aria-level={2} accessibilityRole="header">{uz.hud.playersTitle}</Text>
      {room.state.players.map((p: any, k: number) => { const name = nameOf(room, p.id), e = exitProgress(p), isMe = p.id === userId; const mem = room.members.find((m) => m.userId === p.id);
        return (
          <Card key={p.id} label={`${name}${isMe ? `, ${uz.hud.you}` : ""}: ${uz.game.cash} ${money(p.cash)}, ${uz.game.cashflow} ${money(e.cashflow)}`} style={p.id === cur ? { borderColor: color.green, borderWidth: 2 } : undefined}>
            <View style={s.head} aria-hidden>
              <Avatar name={name} colorIdx={room.names?.[p.id]?.color ?? k} level={levelOf(room, p.id)} online={room.state.bots.includes(p.id) ? undefined : mem?.online !== false} size={44} />
              <View style={{ flex: 1 }}><Text style={s.name}>{name}{isMe ? ` (${uz.hud.you})` : ""}</Text><Text style={s.sub}>{room.professions?.[p.id] ?? ""}</Text></View>
              <Pill label={p.circle === "big" ? uz.hud.bigCircle : uz.hud.smallCircle} kind={p.circle === "big" ? "good" : "info"} />
            </View>
            <View style={s.stats} aria-hidden>
              <View><Text style={s.l}>{uz.hud.cashLabel}</Text><Text style={s.v}>{money(p.cash)}</Text></View>
              <View><Text style={s.l}>{uz.game.cashflow}</Text><Text style={[s.v, { color: e.cashflow < 0 ? tone.bad : tone.good }]}>{e.cashflow > 0 ? "+" : ""}{money(e.cashflow)}</Text></View>
              <View><Text style={s.l}>{uz.game.passive}</Text><Text style={s.v}>{money(e.passive)}</Text></View>
            </View>
          </Card>);
      })}
      <Text style={s.note}>{uz.hud.ownCircleNote}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  h: { fontSize: font.xl, fontWeight: "800", color: color.navy }, head: { flexDirection: "row", alignItems: "center", gap: space.md }, name: { fontWeight: "800", fontSize: font.lg, color: color.navy }, sub: { color: tone.muted, fontSize: font.sm },
  stats: { flexDirection: "row", justifyContent: "space-between", paddingTop: space.sm, borderTopWidth: 1, borderTopColor: "#E6ECEF" }, l: { color: tone.muted, fontSize: 12, fontWeight: "600" }, v: { color: color.navy, fontWeight: "800", fontSize: font.lg },
  note: { color: tone.muted, fontSize: font.sm, lineHeight: 19 },
});
