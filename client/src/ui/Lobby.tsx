import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "./Button";
import { uz, errText } from "../i18n/uz";
import { color, PLAYER_COLORS } from "../theme";
import type { RoomView } from "../net/connection";

export function Lobby({ room, userId, error, onStart, onLeave }: { room: RoomView; userId: string; error: string | null; onStart: () => void; onLeave: () => void }) {
  const host = room.members[0]?.userId === userId;
  return (
    <View style={s.wrap}>
      <Text style={s.h} accessibilityRole="header">{uz.lobby.title}</Text>
      <Text style={s.code} selectable accessibilityLabel={`${uz.home.code}: ${room.code}`}>{room.code}</Text>
      <Text style={s.sub}>{uz.lobby.players} · {room.members.length}/6</Text>
      {room.members.map((m, i) => (
        <View key={m.userId} style={s.row}>
          <View style={[s.dot, { backgroundColor: PLAYER_COLORS[i % 6] }]} />
          <Text style={s.name}>{m.bot ? uz.lobby.bot : m.userId}{m.userId === userId ? ` (${uz.lobby.you})` : ""}{m.online ? "" : ` · ${uz.lobby.offline}`}</Text>
        </View>
      ))}
      <Text style={s.note}>{uz.lobby.hint}</Text>
      {host ? <Button label={uz.lobby.start} onPress={onStart} /> : <Text style={s.note}>{uz.lobby.wait}</Text>}
      <Button label="←" kind="ghost" onPress={onLeave} />
      {error && <Text style={s.err} accessibilityRole="alert">{errText(error)}</Text>}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, gap: 12, padding: 24, maxWidth: 420, width: "100%", alignSelf: "center", justifyContent: "center" },
  h: { fontSize: 24, fontWeight: "800", color: color.navy }, code: { fontSize: 36, fontWeight: "800", letterSpacing: 6, color: color.green },
  sub: { color: color.text2 }, row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 36 },
  dot: { width: 16, height: 16, borderRadius: 8 }, name: { color: color.navy, fontSize: 16 }, note: { color: color.text2 }, err: { color: color.red },
});
