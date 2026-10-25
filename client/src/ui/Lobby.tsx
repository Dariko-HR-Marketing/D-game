import React, { useState } from "react";
import { View, Text, Pressable, Share, StyleSheet } from "react-native";
import { Button } from "./Button";
import { Banner, Card, Pill } from "./kit";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { Screen } from "./Screen";
import { nameOf } from "../model";
import { turnLabel } from "../turnPref";
import { uz, errText } from "../i18n/uz";
import { color, font, PLAYER_COLORS, radius, space, tone, GREEN_TEXT } from "../theme";
import { readableOn } from "../contrast";
import type { RoomView } from "../net/connection";

const MAX = 6, MIN = 2; // eski xonalar uchun (o'rinlar soni belgilanmagan)
export function Lobby({ room, userId, error, onStart, onLeave }: { room: RoomView; userId: string; error: string | null; onStart: (events: boolean) => void; onLeave: () => void }) {
  const host = (room.hostId ?? room.members[0]?.userId) === userId; const [copied, setCopied] = useState(false); const [events, setEvents] = useState(true);
  const humans = room.members.length, seats = room.seats ?? MIN, bots = Math.max(0, seats - humans); // bo'sh o'rinlarni boshlanganda botlar egallaydi
  const copy = async () => {
    const text = room.code;
    try { const nav = (globalThis as any).navigator; if (nav?.clipboard?.writeText) { await nav.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); return; } } catch { /* pastga */ }
    try { await Share.share({ message: `POYGA: ${text}` }); } catch { /* bekor qilindi */ }
  };
  return (
    <Screen title={uz.lobby.title} subtitle={uz.lobby.share} onBack={onLeave} backLabel={uz.lobby.leave} maxWidth={480}>
      <View testID="lobby-code"><Card style={{ alignItems: "center", gap: space.md }}>
        <Text style={s.codeLabel}>{uz.home.code}</Text>
        <Text style={s.code} selectable accessibilityLabel={`${uz.home.code}: ${room.code.split("").join(" ")}`}>{room.code}</Text>
        <View style={{ alignSelf: "stretch" }}><Button label={copied ? uz.lobby.copied : uz.lobby.copy} kind="ghost" onPress={copy} /></View>
        <View accessibilityLiveRegion="polite"><Text style={s.sr}>{copied ? uz.lobby.copied : ""}</Text></View>
      </Card></View>

      <Card>
        <View style={s.rowHead}><Text style={s.h2} aria-level={2} accessibilityRole="header">{uz.lobby.players}</Text><Pill label={`${humans}/${room.seats ?? MAX}`} kind={humans >= seats ? "good" : "warn"} /></View>
        {room.members.map((m, i) => {
          const label = nameOf(room, m.userId); const lvl = room.names?.[m.userId]?.level; const stars = Math.min(5, lvl ?? 0);
          return (<View key={m.userId} style={s.player} role="group" accessible aria-label={`${i + 1}. ${label}${m.userId === userId ? `, ${uz.lobby.you}` : ""}${lvl !== undefined ? `, ${lvl}-daraja` : ""}${i === 0 ? `, ${uz.lobby.hostWord}` : ""}${m.online ? "" : `, ${uz.lobby.offline}`}`}>
            <Avatar name={label} colorIdx={room.names?.[m.userId]?.color ?? i} level={m.bot ? undefined : lvl} online={m.bot ? undefined : m.online} size={40} frame={room.names?.[m.userId]?.cos?.frame} gender={room.names?.[m.userId]?.gender} photo={room.names?.[m.userId]?.photo} bgColor={room.names?.[m.userId]?.cos?.avatar} />
            <View style={{ flex: 1, gap: 2 }} aria-hidden>
              <Text style={s.name}>{label}{m.userId === userId ? ` (${uz.lobby.you})` : ""}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {!m.bot && lvl !== undefined && <View style={{ flexDirection: "row", gap: 1 }}>{[0, 1, 2, 3, 4].map((k) => <Icon key={k} name="star" size={11} stroke={0} color="none" fill={k < stars ? "#F5B82E" : "#D5DEE4"} />)}</View>}
                <Text style={s.emptyT}>{[lvl !== undefined && !m.bot ? `${lvl}-daraja` : null, i === 0 ? uz.lobby.hostWord : null].filter(Boolean).join(" · ")}</Text>
              </View>
            </View>
            {!m.online && <Text style={{ color: tone.bad, fontWeight: "800", fontSize: font.sm }} aria-hidden>{uz.lobby.offline}</Text>}
          </View>);
        })}
        {Array.from({ length: bots }, (_, i) => (
          <View key={`e${i}`} style={[s.player, s.empty]} aria-hidden><View style={[s.dot, { borderStyle: "dashed", borderColor: color.line, backgroundColor: "transparent" }]} /><Text style={s.emptyT}>{uz.lobby.waitingPlayer}</Text></View>))}
      </Card>

      {typeof room.turnSeconds === "number" ? <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }} testID="lobby-turn"><Icon name="clock" size={18} color={tone.muted} /><Text style={s.emptyT}>{uz.lobby.turnBadge}: <Text style={{ color: color.navy, fontWeight: "800" }}>{turnLabel(room.turnSeconds)}</Text></Text></View> : null}
      {room.mode && room.mode !== "standard" ? <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }} testID="lobby-mode"><Icon name="chart" size={18} color={tone.muted} /><Text style={s.emptyT}>{uz.home.modeLabel}: <Text style={{ color: color.navy, fontWeight: "800" }}>{uz.home.modes[room.mode]}</Text> · {uz.home.modeHints[room.mode]}</Text></View> : null}
      {room.calc ? <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }} testID="lobby-calc"><Icon name="chart" size={18} color={tone.muted} /><Text style={s.emptyT}>{uz.ledger.modeLabel}: <Text style={{ color: color.navy, fontWeight: "800" }}>{room.calc.mode === "manual" ? uz.ledger.manual : uz.ledger.auto}</Text></Text></View> : null}
      {room.seats ? <Text style={s.emptyT} testID="lobby-seats">{uz.lobby.slotsNote.replace("{n}", String(room.seats))}</Text> : null}
      {bots > 0 && <Banner kind="info">{uz.lobby.botsNote.replace("{n}", String(bots))}</Banner>}
      {host && (
        <Card>
          <Pressable testID="lobby-events" role="switch" aria-checked={events} aria-label={uz.lobby.events} onPress={() => setEvents((v) => !v)} style={s.switchRow}>
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
  empty: {}, emptyT: { color: tone.muted, fontSize: font.md },
});
