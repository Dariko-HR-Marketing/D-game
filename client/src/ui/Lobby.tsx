import React, { useState } from "react";
import { View, Text, Pressable, Share, StyleSheet } from "react-native";
import { Button } from "./Button";
import { Banner, Card, Pill } from "./kit";
import { Screen } from "./Screen";
import { uz, errText } from "../i18n/uz";
import { color, font, PLAYER_COLORS, radius, space, tone, GREEN_TEXT } from "../theme";
import { readableOn } from "../contrast";
import type { RoomView } from "../net/connection";

const MAX = 6, MIN = 2;
export function Lobby({ room, userId, error, onStart, onLeave }: { room: RoomView; userId: string; error: string | null; onStart: (events: boolean) => void; onLeave: () => void }) {
  const host = (room.hostId ?? room.members[0]?.userId) === userId; const [copied, setCopied] = useState(false); const [events, setEvents] = useState(true);
  const humans = room.members.length, bots = Math.max(0, MIN - humans);
  const copy = async () => {
    const text = room.code;
    try { const nav = (globalThis as any).navigator; if (nav?.clipboard?.writeText) { await nav.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); return; } } catch { /* pastga */ }
    try { await Share.share({ message: `POYGA: ${text}` }); } catch { /* bekor qilindi */ }
  };
  return (
    <Screen title={uz.lobby.title} subtitle={uz.lobby.share} onBack={onLeave} backLabel={uz.lobby.leave} maxWidth={480}>
      <Card style={{ alignItems: "center", gap: space.md }}>
        <Text style={s.codeLabel}>{uz.home.code}</Text>
        <Text style={s.code} selectable accessibilityLabel={`${uz.home.code}: ${room.code.split("").join(" ")}`}>{room.code}</Text>
        <View style={{ alignSelf: "stretch" }}><Button label={copied ? uz.lobby.copied : uz.lobby.copy} kind="ghost" onPress={copy} /></View>
        <View accessibilityLiveRegion="polite"><Text style={s.sr}>{copied ? uz.lobby.copied : ""}</Text></View>
      </Card>

      <Card>
        <View style={s.rowHead}><Text style={s.h2} aria-level={2} accessibilityRole="header">{uz.lobby.players}</Text><Pill label={`${humans}/${MAX}`} kind={humans >= MIN ? "good" : "warn"} /></View>
        {room.members.map((m, i) => {
          const hue = PLAYER_COLORS[(room.names?.[m.userId]?.color ?? i) % 6];
          const label = m.bot ? uz.lobby.bot : room.names?.[m.userId]?.name ?? `${uz.lobby.playerN} ${i + 1}`;
          return (<View key={m.userId} style={s.player} role="group" accessible aria-label={`${i + 1}. ${label}${m.userId === userId ? `, ${uz.lobby.you}` : ""}${i === 0 ? `, ${uz.lobby.hostWord}` : ""}${m.online ? "" : `, ${uz.lobby.offline}`}`}>
            <View style={[s.dot, { backgroundColor: hue }]} aria-hidden><Text style={{ color: readableOn(hue), fontWeight: "800", fontSize: 12 }}>{i + 1}</Text></View>
            <Text style={s.name} aria-hidden>{label}{m.userId === userId ? ` · ${uz.lobby.you}` : ""}</Text>
            <View style={{ flexDirection: "row", gap: space.xs }} aria-hidden>{i === 0 && <Pill label={uz.lobby.hostWord} kind="info" />}{!m.online && <Pill label={uz.lobby.offline} kind="warn" />}</View>
          </View>);
        })}
        {Array.from({ length: Math.max(0, MIN - humans) }, (_, i) => (
          <View key={`e${i}`} style={[s.player, s.empty]} aria-hidden><View style={[s.dot, { borderStyle: "dashed", borderColor: color.line, backgroundColor: "transparent" }]} /><Text style={s.emptyT}>{uz.lobby.waitingPlayer}</Text></View>))}
      </Card>

      {bots > 0 && <Banner kind="info">{uz.lobby.botsNote.replace("{n}", String(bots))}</Banner>}
      {host && (
        <Card>
          <Pressable role="switch" aria-checked={events} aria-label={uz.lobby.events} onPress={() => setEvents((v) => !v)} style={s.switchRow}>
            <View style={{ flex: 1 }}><Text style={s.name}>{uz.lobby.events}</Text><Text style={s.emptyT}>{uz.lobby.eventsHint}</Text></View>
            <View style={[s.track, events && { backgroundColor: GREEN_TEXT }]} aria-hidden><View style={[s.knob, events && { alignSelf: "flex-end" }]} /></View>
          </Pressable>
        </Card>
      )}
      {host ? <Button label={uz.lobby.start} onPress={() => onStart(events)} /> : <Banner kind="info">{uz.lobby.wait}</Banner>}
      {error && <Text style={{ color: color.red }} accessibilityRole="alert">{errText(error)}</Text>}
    </Screen>
  );
}
const s = StyleSheet.create({
  codeLabel: { color: tone.muted, fontWeight: "700", fontSize: font.sm }, code: { fontSize: 44, fontWeight: "800", letterSpacing: 8, color: GREEN_TEXT }, sr: { height: 0, width: 0, opacity: 0 },
  rowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, h2: { fontSize: font.lg, fontWeight: "800", color: color.navy },
  player: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 48, borderTopWidth: 1, borderTopColor: color.line },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: color.navy, alignItems: "center", justifyContent: "center" }, name: { flex: 1, color: color.navy, fontSize: font.lg, fontWeight: "700" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 48 },
  track: { width: 52, height: 30, borderRadius: 15, backgroundColor: tone.muted, padding: 3, justifyContent: "center" }, knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", alignSelf: "flex-start" },
  empty: { opacity: 0.8 }, emptyT: { color: tone.muted, fontSize: font.md },
});
