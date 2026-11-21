import React, { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import type { Http, OpenRoom } from "../net/http";
import type { Lobbies } from "../net/connection";
import { uz } from "../i18n/uz";
import { color, font, radius, space } from "../theme";

const O = uz.openRooms;
type Filter = "all" | OpenRoom["mode"];
const speed = (s: number) => (s === 0 ? uz.home.turn0 : s === 120 ? uz.home.turn60 : uz.home.turn30);
const modeName = (m: OpenRoom["mode"]) => (m === "corporate" ? uz.home.corporate : uz.home.modes[m]);
export const roomLine = (r: OpenRoom) => O.row.replace("{host}", r.host).replace("{mode}", modeName(r.mode)).replace("{speed}", speed(r.turnSeconds)).replace("{n}", String(r.players)).replace("{max}", String(r.seats));

/** «Ochiq o'yinlar»: kutish zalidagi Ochiq va Qulfli xonalar, tur bo'yicha filtr. Qulfli xona kod so'raydi. Server `/rooms/open` ulanmagan bo'lsa bo'lim yashirin. */
export function RoomsList({ http, online, onJoin, pollMs = 5000, live, watch }: { http: Http; online: boolean; onJoin: (code: string) => void; pollMs?: number; live?: Lobbies | null; watch?: (on: boolean) => void }) {
  const [polled, setPolled] = useState<Lobbies | null>(null); const [gone, setGone] = useState(false); const [bad, setBad] = useState(false); const [filter, setFilter] = useState<Filter>("all"); const [ask, setAsk] = useState<string | null>(null); const [code, setCode] = useState(""); const [showPlaying, setShowPlaying] = useState(false);
  // Jonli rejim: server o'zgarishlarni WebSocket orqali yuboradi. `watch` berilmasa (yoki ulanmagan bo'lsa) HTTP bilan har 5 soniyada so'raladi.
  useEffect(() => { if (!watch) return; watch(true); return () => watch(false); }, [watch]);
  useEffect(() => { if (watch && live) return; let off = false; let h: any; const load = async () => { try { const r = await http.openRooms() as any; if (!off) { setPolled({ rooms: r.rooms ?? [], playing: r.playing ?? [], stats: r.stats ?? { playing: { rooms: 0, players: 0 }, waiting: { rooms: 0, players: 0 } }, online: r.online ?? 0 }); setBad(false); } } catch (e: any) { if (!off) { if (e?.status === 404) setGone(true); else setBad(true); } } if (!off) h = setTimeout(load, pollMs); }; load(); return () => { off = true; clearTimeout(h); }; }, [http, pollMs, watch, !!live]); // eslint-disable-line react-hooks/exhaustive-deps
  const data = watch && live ? live : polled; const rooms = data?.rooms ?? null; const isLive = !!(watch && live);
  if (gone) return null;
  const list = (rooms ?? []).filter((r) => filter === "all" || r.mode === filter); const st = data?.stats;
  return (
    <View style={s.box} testID="open-rooms" role="region" aria-label={O.title}>
      <View style={s.head}><Text style={s.h} aria-level={2} accessibilityRole="header">{O.title}</Text><Text style={s.live}>{isLive ? `● ${O.liveTag}` : O.live}</Text></View>
      {st && <View style={s.stats} role="list" aria-label={O.title} testID="lobby-stats">
        <View style={s.stat} role="listitem"><Text style={s.statT}>{O.online.replace("{n}", String(data?.online ?? 0))}</Text></View>
        <View style={s.stat} role="listitem"><Text style={s.statT}>{O.playingStat.replace("{p}", String(st.playing.players)).replace("{r}", String(st.playing.rooms))}</Text></View>
        <View style={s.stat} role="listitem"><Text style={s.statT}>{O.waitingStat.replace("{p}", String(st.waiting.players)).replace("{r}", String(st.waiting.rooms))}</Text></View>
      </View>}
      <View style={s.chips} role="radiogroup" aria-label={O.title}>
        {(["all", "standard", "student", "corporate"] as const).map((f) => (
          <Pressable key={f} role="radio" aria-checked={filter === f} testID={`rooms-filter-${f}`} accessibilityLabel={f === "all" ? O.all : modeName(f)} onPress={() => setFilter(f)} style={[s.chip, filter === f && s.chipOn]}><Text style={[s.chipT, filter === f && { color: color.white }]} aria-hidden>{f === "all" ? O.all : modeName(f)}</Text></Pressable>))}
      </View>
      {bad && <Text style={s.err} accessibilityRole="alert">{O.err}</Text>}
      {rooms === null && !bad && <Text style={s.mut}>{O.loading}</Text>}
      {rooms !== null && list.length === 0 && <Text style={s.mut} testID="rooms-empty">{O.empty}</Text>}
      {list.map((r) => { const full = r.players >= r.seats; const open = ask === r.id; return (
        <View key={r.id} style={s.row} testID="room-row">
          <View style={s.line}>
            <Text style={[s.t, { flex: 1 }]} accessibilityLabel={`${roomLine(r)}${r.locked ? `. ${O.lockedLabel}` : ""}`}>{roomLine(r)}</Text>
            <Pressable role="button" accessibilityLabel={`${full ? O.full : r.locked ? O.locked : O.join}: ${r.host}`} disabled={!online || full} onPress={() => (r.locked || !r.code ? setAsk(open ? null : r.id) : onJoin(r.code))} style={[s.btn, r.locked && s.btnLock, (!online || full) && { opacity: 0.45 }]}>
              <Text style={[s.btnT, r.locked && { color: color.navy }]}>{full ? O.full : r.locked ? O.locked : O.join}</Text></Pressable>
          </View>
          {open && <View style={s.line}>
            <TextInput aria-label={O.codeFor} placeholder="ABC123" placeholderTextColor="#6B7C8C" value={code} onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} autoCapitalize="characters" style={s.input} />
            <Pressable role="button" accessibilityLabel={O.enter} disabled={code.length !== 6} onPress={() => onJoin(code)} style={[s.btn, code.length !== 6 && { opacity: 0.45 }]}><Text style={s.btnT}>{O.enter}</Text></Pressable>
          </View>}
        </View>); })}
      {(data?.playing.length ?? 0) > 0 && <View style={{ gap: space.xs }}>
        <Pressable role="button" aria-expanded={showPlaying} testID="playing-toggle" accessibilityLabel={`${O.playingTitle}: ${showPlaying ? O.hidePlaying : O.showPlaying}`} onPress={() => setShowPlaying((v) => !v)} style={s.tog}><Text style={s.togT}>{showPlaying ? "▾" : "▸"} {O.playingTitle} ({data!.playing.length})</Text></Pressable>
        {showPlaying && <View testID="playing-list" role="list">{data!.playing.map((p) => <View key={p.id} style={s.prow} role="listitem"><Text style={s.t}>{O.playingRow.replace("{host}", p.host).replace("{mode}", modeName(p.mode)).replace("{round}", String(p.round)).replace("{n}", String(p.players))}</Text></View>)}</View>}
      </View>}
    </View>);
}
const s = StyleSheet.create({
  box: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: color.bg, borderWidth: 1, borderColor: color.line },
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.sm, flexWrap: "wrap" }, h: { color: color.navy, fontSize: font.lg, fontWeight: "800" }, live: { color: color.text2, fontSize: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs }, chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 2, borderColor: color.line, backgroundColor: color.white, alignItems: "center", justifyContent: "center" }, chipOn: { backgroundColor: color.green, borderColor: color.green }, chipT: { color: color.navy, fontWeight: "700", fontSize: font.sm },
  row: { gap: space.xs, padding: space.md, borderRadius: radius.md, backgroundColor: color.white, borderWidth: 1, borderColor: color.line }, line: { flexDirection: "row", alignItems: "center", gap: space.sm }, t: { color: color.navy, fontSize: font.md, fontWeight: "700" },
  btn: { minHeight: 44, minWidth: 96, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: color.green, alignItems: "center", justifyContent: "center" }, btnLock: { backgroundColor: color.gold }, btnT: { color: color.white, fontWeight: "800", fontSize: font.sm },
  input: { flex: 1, minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: color.line, paddingHorizontal: space.md, color: color.navy, fontSize: font.md, fontWeight: "700", letterSpacing: 2, backgroundColor: color.white },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space.xs }, stat: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: "#E7F4EE" }, statT: { color: "#0E6B4A", fontWeight: "800", fontSize: 12 },
  tog: { minHeight: 44, justifyContent: "center" }, togT: { color: color.navy, fontWeight: "700", fontSize: font.sm }, prow: { padding: space.sm, borderRadius: radius.md, backgroundColor: color.white, borderWidth: 1, borderColor: color.line },
  mut: { color: color.text2, fontSize: font.sm }, err: { color: color.red, fontSize: font.sm, fontWeight: "700" },
});
