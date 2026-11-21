import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Avatar } from "./Avatar";
import { Card, Pill } from "./kit";
import { levelOf } from "./PlayersLane";
import { money } from "../format";
import { nameOf, currentId, exitProgress } from "../model";
import { uz } from "../i18n/uz";
import { color, font, space, tone } from "../theme";
import type { RoomView } from "../net/connection";

/** «O'yinchilar» bo'limi (maket N20): har bir o'yinchining aylanasi, naqdi va pul oqimi. */
export function PlayerList({ room, userId, accordion }: { room: RoomView; userId: string; accordion?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null); // akkordeon: bir vaqtda bitta o'yinchi ochiladi
  const cur = currentId(room); const mixed = room.state.players.some((q: any) => q.circle !== room.state.players[0].circle); // hamma bir aylanada bo'lsa chip va izoh ortiqcha: ism uchun joy qoladi
  return (
    <View style={{ gap: space.md }}>
      <Text style={s.h} aria-level={2} accessibilityRole="header">{uz.hud.playersTitle}</Text>
      {room.state.players.map((p: any, k: number) => { const name = nameOf(room, p.id), e = exitProgress(p, room.state.mode), isMe = p.id === userId; const mem = room.members.find((m) => m.userId === p.id);
        if (accordion) { const open = openId === p.id; const cf = e.cashflow; return (
          <View key={p.id} style={[s.acc, p.id === cur && { borderColor: color.green, borderWidth: 2 }]} testID="player-acc">
            <Pressable accessibilityRole="button" aria-expanded={open} accessibilityLabel={`${name}${isMe ? `, ${uz.hud.you}` : ""}`} onPress={() => setOpenId(open ? null : p.id)} style={s.accHead} testID={`player-acc-${p.id}`}>
              <Avatar name={name} colorIdx={room.names?.[p.id]?.color ?? k} level={levelOf(room, p.id)} online={room.state.bots.includes(p.id) ? undefined : mem?.online !== false} size={32} gender={room.names?.[p.id]?.gender} frame={room.names?.[p.id]?.cos?.frame} bgColor={room.names?.[p.id]?.cos?.avatar} photo={room.names?.[p.id]?.photo} />
              <View style={{ flex: 1, minWidth: 0 }}><Text style={s.accName} numberOfLines={1}>{name}{isMe ? ` (${uz.hud.you})` : ""}</Text>{room.professions?.[p.id] ? <Text style={s.sub} numberOfLines={1}>{room.professions[p.id]}</Text> : null}</View>
              {mem?.autopilot && <Pill label={uz.hud.autopilot.pill} kind="warn" />}
              <Text style={s.chev} aria-hidden>{open ? "▴" : "▾"}</Text>
            </Pressable>
            {open && <View style={s.accBody} role="region" aria-label={`${name}: ${uz.game.cash} ${money(p.cash)}, ${uz.game.cashflow} ${money(cf)}, ${uz.game.passive} ${money(e.passive)}`}>
              <View><Text style={s.l}>{uz.hud.cashLabel}</Text><Text style={s.v}>{money(p.cash)}</Text></View>
              <View><Text style={s.l}>{uz.game.cashflow}</Text><Text style={[s.v, { color: cf < 0 ? tone.bad : tone.good }]}>{cf > 0 ? "+" : ""}{money(cf)}</Text></View>
              <View><Text style={s.l}>{uz.game.passive}</Text><Text style={s.v}>{money(e.passive)}</Text></View>
            </View>}
          </View>); }
        return (
          <Card key={p.id} label={`${name}${isMe ? `, ${uz.hud.you}` : ""}: ${uz.game.cash} ${money(p.cash)}, ${uz.game.cashflow} ${money(e.cashflow)}`} style={p.id === cur ? { borderColor: color.green, borderWidth: 2 } : undefined}>
            <View style={s.head} aria-hidden>
              <Avatar name={name} colorIdx={room.names?.[p.id]?.color ?? k} level={levelOf(room, p.id)} online={room.state.bots.includes(p.id) ? undefined : mem?.online !== false} size={44} gender={room.names?.[p.id]?.gender} frame={room.names?.[p.id]?.cos?.frame} photo={room.names?.[p.id]?.photo} bgColor={room.names?.[p.id]?.cos?.avatar} />
              <View style={{ flex: 1 }}><Text style={s.name}>{name}{isMe ? ` (${uz.hud.you})` : ""}</Text><Text style={s.sub}>{room.professions?.[p.id] ?? ""}</Text></View>
              <View style={{ gap: 4, alignItems: "flex-end" }}>{mixed && <Pill label={p.circle === "big" ? uz.hud.bigCircle : uz.hud.smallCircle} kind={p.circle === "big" ? "good" : "info"} />}{mem?.autopilot && <Pill label={uz.hud.autopilot.pill} kind="warn" />}</View>
            </View>
            <View style={s.stats} aria-hidden>
              <View><Text style={s.l}>{uz.hud.cashLabel}</Text><Text style={s.v}>{money(p.cash)}</Text></View>
              <View><Text style={s.l}>{uz.game.cashflow}</Text><Text style={[s.v, { color: e.cashflow < 0 ? tone.bad : tone.good }]}>{e.cashflow > 0 ? "+" : ""}{money(e.cashflow)}</Text></View>
              <View><Text style={s.l}>{uz.game.passive}</Text><Text style={s.v}>{money(e.passive)}</Text></View>
            </View>
          </Card>);
      })}
      {mixed && <Text style={s.note}>{uz.hud.ownCircleNote}</Text>}
    </View>
  );
}
const s = StyleSheet.create({
  h: { fontSize: font.xl, fontWeight: "800", color: color.navy }, head: { flexDirection: "row", alignItems: "center", gap: space.md }, name: { fontWeight: "800", fontSize: font.lg, color: color.navy }, sub: { color: tone.muted, fontSize: font.sm },
  stats: { flexDirection: "row", justifyContent: "space-between", paddingTop: space.sm, borderTopWidth: 1, borderTopColor: "#E6ECEF" }, l: { color: tone.muted, fontSize: 12, fontWeight: "600" }, v: { color: color.navy, fontWeight: "800", fontSize: font.lg },
  acc: { borderRadius: 12, borderWidth: 1, borderColor: color.line, backgroundColor: color.white, overflow: "hidden" }, accHead: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 52, paddingHorizontal: space.sm, paddingVertical: 6 }, accName: { fontWeight: "800", fontSize: font.md, color: color.navy }, chev: { color: color.navy, fontSize: 16, fontWeight: "800", width: 20, textAlign: "center" },
  accBody: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space.md, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: "#E6ECEF", backgroundColor: "#F7FAFB" },
  note: { color: tone.muted, fontSize: font.sm, lineHeight: 19 },
});
