import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Share, Linking, Modal, StyleSheet, useWindowDimensions } from "react-native";
import { Button } from "./Button";
import { Banner, Card, Pill } from "./kit";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { Screen } from "./Screen";
import { nameOf } from "../model";
import { turnLabel } from "../turnPref";
import { uz, errText } from "../i18n/uz";
import { color, font, night, PLAYER_COLORS, radius, space, tone, GREEN_TEXT } from "../theme";
import { readableOn } from "../contrast";
import type { RoomView } from "../net/connection";

const MAX = 6, MIN = 2; // eski xonalar uchun (o'rinlar soni belgilanmagan)
export function Lobby({ room, userId, error, onStart, onLeave, onStay }: { room: RoomView; userId: string; error: string | null; onStart: (events: boolean) => void; onLeave: () => void; onStay?: () => void }) {
  const { width: winW } = useWindowDimensions(); const wide = winW >= 900;
  const host = (room.hostId ?? room.members[0]?.userId) === userId; const [copied, setCopied] = useState(false); const [events, setEvents] = useState(true);
  const humans = room.members.length, seats = room.seats ?? MIN, bots = Math.max(0, seats - humans); // bo'sh o'rinlarni boshlanganda botlar egallaydi
  const [now, setNow] = useState(Date.now()); useEffect(() => { if (!room.autoStartAt) return; const h = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(h); }, [room.autoStartAt]);
  const autoLeft = room.autoStartAt ? Math.max(0, Math.ceil((room.autoStartAt - now) / 1000)) : null;
  const [linkCopied, setLinkCopied] = useState(false);
  const link = `${(globalThis as any).location?.origin ?? "https://tajriba24.uz"}/?kod=${room.code}`;
  const copyLink = async () => { try { const nav = (globalThis as any).navigator; if (nav?.clipboard?.writeText) { await nav.clipboard.writeText(link); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); return; } } catch { /* pastga */ } try { await Share.share({ message: link }); } catch { /* bekor qilindi */ } };
  const shareTelegram = () => { const u = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`Tajriba 24: ${uz.home.code} ${room.code}`)}`; const w = (globalThis as any).open; if (typeof w === "function") w(u, "_blank", "noopener"); else void Linking.openURL(u); };
  const copy = async () => {
    const text = room.code;
    try { const nav = (globalThis as any).navigator; if (nav?.clipboard?.writeText) { await nav.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); return; } } catch { /* pastga */ }
    try { await Share.share({ message: `Tajriba 24: ${text}` }); } catch { /* bekor qilindi */ }
  };
  const ask = host && !!room.idleAskUntil; const [askNow, setAskNow] = useState(Date.now()); useEffect(() => { if (!ask) return; setAskNow(Date.now()); const h = setInterval(() => setAskNow(Date.now()), 1000); return () => clearInterval(h); }, [ask]);
  const askLeft = room.idleAskUntil ? Math.max(0, Math.ceil((room.idleAskUntil - askNow) / 1000)) : 0;
  return (
    <Screen title={uz.lobby.title} subtitle={uz.lobby.share} onBack={onLeave} backLabel={uz.lobby.leave} maxWidth={wide ? 1040 : 480}>
      <View style={wide ? { flexDirection: "row", gap: space.lg, alignItems: "flex-start" } : { gap: space.lg }}>
      <View style={[{ gap: space.lg }, wide && { flex: 1 }]}>
      <View testID="lobby-code" style={s.codeCard}>
        <Text style={s.codeLabelD}>{uz.home.code}</Text>
        <View style={s.codeRow}>
          <View accessible accessibilityLabel={`${uz.home.code}: ${room.code.split("").join(" ")}`} style={{ flexDirection: "row", gap: 14 }}><Text style={s.codeD} selectable>{room.code.slice(0, 4)}</Text>{room.code.length > 4 ? <Text style={s.codeD} selectable>{room.code.slice(4)}</Text> : null}</View>
          <Pressable accessibilityRole="button" accessibilityLabel={copied ? uz.lobby.copied : uz.lobby.copy} onPress={copy} style={s.chipBtn}><Text style={s.chipBtnT}>{copied ? uz.lobby.copied : uz.lobby.copyShort}</Text></Pressable>
        </View>
        <View style={s.shareRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={uz.lobby.telegram} onPress={shareTelegram} style={s.shareBtn} testID="lobby-telegram"><Icon name="chat" size={16} color={night.text} /><Text style={s.shareT}>{uz.lobby.telegram}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={linkCopied ? uz.lobby.copied : uz.lobby.copyLink} onPress={copyLink} style={s.shareBtn} testID="lobby-link"><Icon name="share" size={16} color={night.text} /><Text style={s.shareT}>{linkCopied ? uz.lobby.copied : uz.lobby.copyLink}</Text></Pressable>
        </View>
        <View accessibilityLiveRegion="polite"><Text style={s.sr}>{copied || linkCopied ? uz.lobby.copied : ""}</Text></View>
      </View>

      <View style={s.sumStrip} testID="lobby-summary">
        <View><Text style={s.sumK}>{uz.lobby.sumType}</Text><Text style={s.sumV}>{uz.home.modes[room.mode ?? "standard"]}</Text></View>
        <View><Text style={s.sumK}>{uz.lobby.sumPlayers}</Text><Text style={s.sumV}>{seats} {uz.lobby.sumKishi}</Text></View>
        {typeof room.turnSeconds === "number" ? <View><Text style={s.sumK}>{uz.lobby.sumSpeed}</Text><Text style={s.sumV}>{turnLabel(room.turnSeconds)}</Text></View> : null}
        <View><Text style={s.sumK}>{uz.lobby.sumDur}</Text><Text style={s.sumV}>{uz.home.desk.dur[room.mode ?? "standard"]}</Text></View>
      </View>
      {typeof room.turnSeconds === "number" ? <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }} testID="lobby-turn"><Icon name="clock" size={18} color={tone.muted} /><Text style={s.emptyT}>{uz.lobby.turnBadge}: <Text style={{ color: color.navy, fontWeight: "800" }}>{turnLabel(room.turnSeconds)}</Text></Text></View> : null}
      {room.mode && room.mode !== "standard" ? <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }} testID="lobby-mode"><Icon name="chart" size={18} color={tone.muted} /><Text style={s.emptyT}>{uz.home.modeLabel}: <Text style={{ color: color.navy, fontWeight: "800" }}>{uz.home.modes[room.mode]}</Text> · {uz.home.modeHints[room.mode]}</Text></View> : null}
      {room.calc ? <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }} testID="lobby-calc"><Icon name="chart" size={18} color={tone.muted} /><Text style={s.emptyT}>{uz.ledger.modeLabel}: <Text style={{ color: color.navy, fontWeight: "800" }}>{room.calc.mode === "manual" ? uz.ledger.manual : uz.ledger.auto}</Text></Text></View> : null}
      </View>
      <View style={[{ gap: space.lg }, wide && { flex: 1.3 }]}>
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

      {autoLeft !== null && bots === 0 ? <Text style={s.emptyT} testID="lobby-full" role="status">{uz.lobby.fullStart.replace("{s}", String(autoLeft))}</Text> : null}
      {autoLeft !== null && bots > 0 ? <Text style={s.emptyT} testID="lobby-auto" role="status">{uz.lobby.autoStart.replace("{s}", String(autoLeft))}</Text> : null}
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
      {host ? <><Button label={uz.lobby.start} onPress={() => onStart(events)} />{bots > 0 ? <Text style={s.emptyT} testID="lobby-start-note">{uz.lobby.startNow.replace("{n}", String(bots))}</Text> : null}<Text style={s.emptyT}>{uz.lobby.startNote}</Text></> : <Banner kind="info">{uz.lobby.wait}</Banner>}
      {error && <Text style={{ color: color.red }} accessibilityRole="alert">{errText(error)}</Text>}
      </View>
      </View>
    {ask && <Modal transparent animationType="fade" onRequestClose={() => onStay?.()}>
        <View style={{ flex: 1, backgroundColor: "rgba(8,34,56,0.55)", alignItems: "center", justifyContent: "center", padding: space.lg }}>
          <View role="alertdialog" aria-label={uz.openRooms.stayTitle} testID="idle-ask" style={{ width: "100%", maxWidth: 420, gap: space.md, padding: space.xl, borderRadius: 16, backgroundColor: "#fff" }}>
            <Text style={{ color: "#082238", fontSize: 20, fontWeight: "800" }} aria-level={2} accessibilityRole="header">{uz.openRooms.stayTitle}</Text>
            <Text style={{ color: "#4A5B6C", fontSize: 15, lineHeight: 22 }}>{uz.openRooms.stayText.replace("{s}", String(askLeft))}</Text>
            <Button label={uz.openRooms.stayYes} onPress={() => onStay?.()} />
            <Button label={uz.openRooms.stayNo} kind="ghost" onPress={onLeave} />
          </View>
        </View>
      </Modal>}
    </Screen>
  );
}
const s = StyleSheet.create({
  codeCard: { backgroundColor: night.brand, borderRadius: radius.lg, padding: space.lg, gap: space.md }, codeLabelD: { color: night.muted, fontWeight: "800", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" }, codeRow: { flexDirection: "row", alignItems: "center", gap: space.md, flexWrap: "wrap" },
  codeD: { fontSize: 44, fontWeight: "800", letterSpacing: 6, color: "#fff" }, chipBtn: { backgroundColor: night.accent, borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 44, justifyContent: "center" }, chipBtnT: { color: night.bg, fontWeight: "800", fontSize: font.sm },
  shareRow: { flexDirection: "row", gap: space.sm, flexWrap: "wrap" }, shareBtn: { flexGrow: 1, flexBasis: 150, minHeight: 44, flexDirection: "row", gap: space.sm, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: 1, borderColor: night.line, backgroundColor: "rgba(255,255,255,0.05)" }, shareT: { color: night.text, fontWeight: "700", fontSize: font.sm },
  sumStrip: { flexDirection: "row", flexWrap: "wrap", gap: space.lg, backgroundColor: color.white, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E6ECEF", padding: space.lg }, sumK: { color: tone.muted, fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" }, sumV: { color: color.navy, fontWeight: "800", fontSize: font.md },
  codeLabel: { color: tone.muted, fontWeight: "700", fontSize: font.sm }, code: { fontSize: 44, fontWeight: "800", letterSpacing: 8, color: GREEN_TEXT }, sr: { height: 0, width: 0, opacity: 0 },
  rowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, h2: { fontSize: font.lg, fontWeight: "800", color: color.navy },
  player: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 48, borderTopWidth: 1, borderTopColor: color.line },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: color.navy, alignItems: "center", justifyContent: "center" }, name: { flex: 1, color: color.navy, fontSize: font.lg, fontWeight: "700" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 48 },
  track: { width: 52, height: 30, borderRadius: 15, backgroundColor: tone.muted, padding: 3, justifyContent: "center" }, knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", alignSelf: "flex-start" },
  empty: {}, emptyT: { color: tone.muted, fontSize: font.md },
});
