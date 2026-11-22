import React, { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from "react-native";
import { Icon } from "./Icon";
import { Acc } from "./Accordion";
import type { Http, OpenRoom } from "../net/http";
import type { Lobbies } from "../net/connection";
import { uz } from "../i18n/uz";
import { color, font, radius, space } from "../theme";

const O = uz.openRooms;
type Filter = "all" | OpenRoom["mode"];
const speed = (s: number) => (s === 0 ? uz.home.turn0 : s === 120 ? uz.home.turn60 : uz.home.turn30);
const modeName = (m: OpenRoom["mode"]) => (m === "corporate" ? uz.home.corporate : uz.home.modes[m]);
export const roomLine = (r: OpenRoom) => O.row.replace("{host}", r.host).replace("{mode}", modeName(r.mode)).replace("{speed}", speed(r.turnSeconds)).replace("{n}", String(r.players)).replace("{max}", String(r.seats));

/** «Ochiq o'yinlar»: kutayotgan (Ochiq va Qulfli) hamda hozir o'ynalayotgan xonalar bitta jadvalda — jonli (WebSocket). Tur va holat bo'yicha filtr; qulfli xona kod so'raydi; yashirin xonaga yuqoridagi maydon orqali kod bilan kiriladi. Ensiz joyda qatorlar kartaga aylanadi. */
type Row = { key: string; waiting: boolean; host: string; mode: OpenRoom["mode"]; speed: string; players: number; seats: number | null; round: number; locked: boolean; code?: string; id: string };
export function RoomsList({ http, online, onJoin, pollMs = 5000, live, watch, collapsible }: { collapsible?: boolean; http: Http; online: boolean; onJoin: (code: string) => void; pollMs?: number; live?: Lobbies | null; watch?: (on: boolean) => void }) {
  const [polled, setPolled] = useState<Lobbies | null>(null); const [gone, setGone] = useState(false); const [bad, setBad] = useState(false); const [filter, setFilter] = useState<Filter>("all"); const [ask, setAsk] = useState<string | null>(null); const [code, setCode] = useState(""); const [status, setStatus] = useState<"all" | "waiting" | "playing">("all"); const [wide, setWide] = useState(!collapsible); const [direct, setDirect] = useState(""); const [acc, setAcc] = useState(false);
  // Jonli rejim: server o'zgarishlarni WebSocket orqali yuboradi. `watch` berilmasa (yoki ulanmagan bo'lsa) HTTP bilan har 5 soniyada so'raladi.
  useEffect(() => { if (!watch) return; watch(true); return () => watch(false); }, [watch]);
  useEffect(() => { if (watch && live) return; let off = false; let h: any; const load = async () => { try { const r = await http.openRooms() as any; if (!off) { setPolled({ rooms: r.rooms ?? [], playing: r.playing ?? [], stats: r.stats ?? { playing: { rooms: 0, players: 0 }, waiting: { rooms: 0, players: 0 } }, online: r.online ?? 0 }); setBad(false); } } catch (e: any) { if (!off) { if (e?.status === 404) setGone(true); else setBad(true); } } if (!off) h = setTimeout(load, pollMs); }; load(); return () => { off = true; clearTimeout(h); }; }, [http, pollMs, watch, !!live]); // eslint-disable-line react-hooks/exhaustive-deps
  const data = watch && live ? live : polled; const rooms = data?.rooms ?? null; const isLive = !!(watch && live);
  const codeBox = (
    <View style={s.codeBox} testID="rooms-code-box">
      <Text style={s.codeL} nativeID="roomsCodeLabel">{O.codeTitle}</Text>
      <View style={s.line}>
        <TextInput accessibilityLabelledBy="roomsCodeLabel" aria-label={O.codeDirect} placeholder="ABC123" placeholderTextColor="#6B7C8C" value={direct} onChangeText={(t) => setDirect(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} autoCapitalize="characters" autoCorrect={false} maxLength={6} returnKeyType="go" onSubmitEditing={() => online && direct.length === 6 && onJoin(direct)} style={s.input} testID="rooms-code-input" />
        <Pressable role="button" accessibilityLabel={O.codeGo} testID="rooms-code-go" disabled={!online || direct.length !== 6} onPress={() => onJoin(direct)} style={[s.btn, (!online || direct.length !== 6) && { opacity: 0.45 }]}><Text style={s.btnT}>{O.codeGo}</Text></Pressable>
      </View>
      <Text style={s.mut}>{O.codeHint}</Text>
    </View>);
  if (gone) return codeBox; // server ro'yxatni bermasa ham, kod bilan kirish yo'li qoladi
  const all: Row[] = [
    ...(rooms ?? []).map((r): Row => ({ key: `w${r.id}`, id: r.id, waiting: true, host: r.host, mode: r.mode, speed: speed(r.turnSeconds), players: r.players, seats: r.seats, round: 0, locked: r.locked, code: r.code })),
    ...(data?.playing ?? []).map((p): Row => ({ key: `p${p.id}`, id: p.id, waiting: false, host: p.host, mode: p.mode, speed: O.noSpeed, players: p.players, seats: null, round: p.round, locked: false })),
  ];
  const list = all.filter((r) => (filter === "all" || r.mode === filter) && (status === "all" || (status === "waiting") === r.waiting)); const st = data?.stats;
  const action = (r: Row) => { if (!r.waiting) return null; const full = r.players >= r.seats!; const open = ask === r.id;
    return <Pressable role="button" accessibilityLabel={`${full ? O.full : r.locked ? O.locked : O.join}: ${r.host}`} disabled={!online || full} onPress={() => (r.locked || !r.code ? setAsk(open ? null : r.id) : onJoin(r.code))} style={[s.btn, r.locked && s.btnLock, (!online || full) && { opacity: 0.45 }]}>
      {r.locked && !full && <Icon name="lock" size={14} color={color.navy} />}<Text style={[s.btnT, r.locked && { color: color.navy }]}>{full ? O.full : r.locked ? O.locked : O.join}</Text></Pressable>; };
  const state = (r: Row) => <View style={[s.pill, r.waiting ? s.pillW : s.pillP]}><Text style={[s.pillT, r.waiting ? { color: "#0E6B4A" } : { color: "#7A4B00" }]}>{r.waiting ? O.statusWaiting : `${O.statusPlaying} · ${O.roundN.replace("{n}", String(r.round))}`}</Text></View>;
  const seatsOf = (r: Row) => r.seats ? <View style={s.seatRow} aria-hidden>{Array.from({ length: r.seats }, (_, i) => <View key={i} style={[s.dot, i < r.players && s.dotOn]} />)}</View> : null;
  const ask_ = (r: Row) => ask === r.id && (
    <View style={[s.line, s.askRow]}>
      <TextInput aria-label={O.codeFor} placeholder="ABC123" placeholderTextColor="#6B7C8C" value={code} onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} autoCapitalize="characters" style={s.input} />
      <Pressable role="button" accessibilityLabel={O.enter} disabled={code.length !== 6} onPress={() => onJoin(code)} style={[s.btn, code.length !== 6 && { opacity: 0.45 }]}><Text style={s.btnT}>{O.enter}</Text></Pressable>
    </View>);
  const rowLabel = (r: Row) => `${r.host}, ${modeName(r.mode)}, ${r.waiting ? `${r.speed}, ${r.players}/${r.seats}${r.locked ? `, ${O.lockedLabel}` : ""}` : `${O.statusPlaying}, ${O.roundN.replace("{n}", String(r.round))}, ${r.players}`}`;
  const inner = (<>
      {st && <View style={s.stats} role="list" aria-label={O.title} testID="lobby-stats">
        <View style={s.stat} role="listitem"><Text style={s.statT}>{O.online.replace("{n}", String(data?.online ?? 0))}</Text></View>
        <View style={s.stat} role="listitem"><Text style={s.statT}>{O.playingStat.replace("{p}", String(st.playing.players)).replace("{r}", String(st.playing.rooms))}</Text></View>
        <View style={s.stat} role="listitem"><Text style={s.statT}>{O.waitingStat.replace("{p}", String(st.waiting.players)).replace("{r}", String(st.waiting.rooms))}</Text></View>
      </View>}
      {(() => { const typeChips = (["all", "standard", "student", "corporate"] as const).map((f) => (
        <Pressable key={f} role="radio" aria-checked={filter === f} testID={`rooms-filter-${f}`} accessibilityLabel={f === "all" ? O.all : modeName(f)} onPress={() => setFilter(f)} style={[s.chip, filter === f && s.chipOn]}><Text style={[s.chipT, filter === f && { color: color.white }]} aria-hidden>{f === "all" ? O.all : modeName(f)}</Text></Pressable>));
        const statusChips = (["all", "waiting", "playing"] as const).map((f) => (
        <Pressable key={f} role="radio" aria-checked={status === f} testID={`rooms-status-${f}`} accessibilityLabel={f === "all" ? O.stAll : f === "waiting" ? O.stWaiting : O.stPlaying} onPress={() => setStatus(f)} style={[s.chip, status === f && s.chipOn]}><Text style={[s.chipT, status === f && { color: color.white }]} aria-hidden>{f === "all" ? O.stAll : f === "waiting" ? O.stWaiting : O.stPlaying}</Text></Pressable>));
        return wide ? (<View style={s.filters}><View style={s.chips} role="radiogroup" aria-label={O.colMode}>{typeChips}</View><View style={s.chips} role="radiogroup" aria-label={O.colStatus}>{statusChips}</View></View>)
          : (<ScrollView horizontal showsHorizontalScrollIndicator={false} tabIndex={0} role="region" aria-label={`${O.colStatus} · ${O.colMode}`} contentContainerStyle={s.chipsRow}>
              <View style={s.chipsRow} role="radiogroup" aria-label={O.colStatus}>{statusChips}</View><View style={s.sep} aria-hidden /><View style={s.chipsRow} role="radiogroup" aria-label={O.colMode}>{typeChips}</View>
            </ScrollView>); })()}
      {bad && <Text style={s.err} accessibilityRole="alert">{O.err}</Text>}
      {rooms === null && !bad && <Text style={s.mut}>{O.loading}</Text>}
      {rooms !== null && list.length === 0 && <Text style={s.mut} testID="rooms-empty">{O.empty}</Text>}
      {list.length > 0 && wide && (<View style={s.table} role="table" aria-label={O.title} testID="rooms-table">
        <View style={[s.tr, s.thr]} role="row">
          {[[O.colHost, 2.2], [O.colMode, 1.2], [O.colSpeed, 1.3], [O.colPlayers, 1.5], [O.colStatus, 1.9]].map(([l, f]) => <Text key={l as string} style={[s.th, { flex: f as number }]} role="columnheader">{l}</Text>)}
          <Text style={[s.th, { width: 120 }]} role="columnheader" aria-label={O.colAction} />
        </View>
        {list.map((r) => (
          <View key={r.key} role="rowgroup" style={s.trw}>
            <View style={s.tr} role="row" testID={r.waiting ? "room-row" : "playing-row"} aria-label={rowLabel(r)}>
              <Text style={[s.td, s.tdHost, { flex: 2.2 }]} numberOfLines={1} role="cell">{r.host}</Text>
              <Text style={[s.td, { flex: 1.2 }]} role="cell">{modeName(r.mode)}</Text>
              <Text style={[s.td, { flex: 1.3 }]} role="cell">{r.speed}</Text>
              <View style={{ flex: 1.5, flexDirection: "row", alignItems: "center", gap: space.sm }} role="cell"><Text style={s.td}>{r.waiting ? `${r.players}/${r.seats}` : r.players}</Text>{seatsOf(r)}</View>
              <View style={{ flex: 1.9, alignItems: "flex-start" }} role="cell">{state(r)}</View>
              <View style={{ width: 120, alignItems: "flex-end" }} role="cell">{action(r)}</View>
            </View>
            {ask === r.id && r.waiting && <View role="row"><View role="cell">{ask_(r)}</View></View>}
          </View>))}
      </View>)}
      {list.length > 0 && !wide && (<View style={s.lst} testID="rooms-list" role="list">
        {list.map((r, i) => (
          <View key={r.key} style={[s.li, i > 0 && s.liSep]} testID={r.waiting ? "room-row" : "playing-row"} role="listitem" aria-label={rowLabel(r)}>
            <View style={s.liMain}>
              <Avatar2 name={r.host} on={r.waiting} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.liHost} numberOfLines={1}>{r.host}</Text>
                <Text style={s.liMeta} numberOfLines={1}>{modeName(r.mode)}{r.waiting ? "" : ` · ${r.players}`}</Text>
              </View>
              {r.waiting ? action(r) : state(r)}
            </View>
            {r.waiting && <View style={s.liSeats}><Text style={s.liLock}>{r.speed} · {r.players}/{r.seats}</Text>{seatsOf(r)}{r.locked && <Text style={s.liLock}>· {O.lockedLabel}</Text>}</View>}
            {ask_(r)}
          </View>))}
      </View>)}
      {codeBox}
  </>);
  const sum = st ? O.accSummary.replace("{w}", String(st.waiting.rooms)).replace("{p}", String(st.playing.rooms)) : O.loading;
  if (collapsible) return (
    <View testID="open-rooms" role="region" aria-label={O.title} onLayout={(e) => setWide(e.nativeEvent.layout.width >= 640)}>
      <Acc icon="list" title={O.accRooms} summary={`${isLive ? "● " : ""}${sum}`} open={acc} onToggle={() => setAcc((v) => !v)} testID="rooms-acc" label={`${O.accRooms}. ${sum}`}><View style={{ gap: space.sm }}>{inner}</View></Acc>
    </View>);
  return (
    <View style={s.box} testID="open-rooms" role="region" aria-label={O.title} onLayout={(e) => setWide(e.nativeEvent.layout.width >= 640)}>
      <View style={s.head}><Text style={s.h} aria-level={2} accessibilityRole="header">{O.title}</Text><Text style={s.live}>{isLive ? `● ${O.liveTag}` : O.live}</Text></View>
      {inner}
    </View>);
}
const HUES = ["#11835A", "#1B6FA8", "#7A4B00", "#4B3FA0", "#8F2434", "#0E5F85"];
function Avatar2({ name, on }: { name: string; on: boolean }) { const h = HUES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length]; return <View style={[s.av, { backgroundColor: h }]} aria-hidden><Text style={s.avT}>{(name[0] ?? "?").toUpperCase()}</Text><View style={[s.avDot, { backgroundColor: on ? "#34C27A" : "#F2B233" }]} /></View>; }
const s = StyleSheet.create({
  lst: { borderRadius: radius.md, backgroundColor: color.white, borderWidth: 1, borderColor: color.line, overflow: "hidden" }, li: { paddingHorizontal: space.md, paddingVertical: space.sm, gap: 4 }, liSep: { borderTopWidth: 1, borderTopColor: "#EEF2F4" },
  liMain: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 52 }, liHost: { color: color.navy, fontWeight: "800", fontSize: font.md }, liMeta: { color: color.text2, fontSize: 12, marginTop: 1 },
  liSeats: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingLeft: 52 }, liLock: { color: color.text2, fontSize: 12 },
  av: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, avT: { color: "#fff", fontWeight: "800", fontSize: font.md }, avDot: { position: "absolute", right: -1, bottom: -1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: "#fff" },
  box: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: color.bg, borderWidth: 1, borderColor: color.line },
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.sm, flexWrap: "wrap" }, h: { color: color.navy, fontSize: font.lg, fontWeight: "800" }, live: { color: color.text2, fontSize: 12 },
  filters: { gap: space.xs }, sep: { width: 1, height: 24, backgroundColor: color.line, marginHorizontal: 2 }, chipsRow: { flexDirection: "row", gap: space.xs, alignItems: "center" }, chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs }, chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 2, borderColor: color.line, backgroundColor: color.white, alignItems: "center", justifyContent: "center" }, chipOn: { backgroundColor: color.green, borderColor: color.green }, chipT: { color: color.navy, fontWeight: "700", fontSize: font.sm },
  table: { borderRadius: radius.md, backgroundColor: color.white, borderWidth: 1, borderColor: color.line, overflow: "hidden" },
  tr: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, minHeight: 56 }, thr: { minHeight: 40, backgroundColor: "#F4F7F8", borderBottomWidth: 1, borderBottomColor: color.line }, trw: { borderBottomWidth: 1, borderBottomColor: "#EEF2F4" },
  th: { color: color.text2, fontSize: 12, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" }, td: { color: color.navy, fontSize: font.md }, tdHost: { fontWeight: "800" },
  card: { gap: space.xs, padding: space.md, borderRadius: radius.md, backgroundColor: color.white, borderWidth: 1, borderColor: color.line },
  line: { flexDirection: "row", alignItems: "center", gap: space.sm }, askRow: { paddingHorizontal: space.md, paddingBottom: space.sm },
  btn: { minHeight: 44, minWidth: 96, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: color.green, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }, btnLock: { backgroundColor: color.gold }, btnT: { color: color.white, fontWeight: "800", fontSize: font.sm },
  input: { flex: 1, minWidth: 0, width: 0, minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: color.line, paddingHorizontal: space.md, color: color.navy, fontSize: font.md, fontWeight: "700", letterSpacing: 2, backgroundColor: color.white },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }, pillW: { backgroundColor: "#E7F4EE" }, pillP: { backgroundColor: "#FFF1D6" }, pillT: { fontSize: 12, fontWeight: "800" },
  seatRow: { flexDirection: "row", gap: 3, flexWrap: "wrap", flexShrink: 1 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#DCE3E8" }, dotOn: { backgroundColor: color.green },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space.xs }, stat: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: "#E7F4EE" }, statT: { color: "#0E6B4A", fontWeight: "800", fontSize: 12 },
  codeBox: { gap: space.xs, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: color.line }, codeL: { color: color.navy, fontWeight: "800", fontSize: font.sm },
  mut: { color: color.text2, fontSize: font.sm }, err: { color: color.red, fontSize: font.sm, fontWeight: "700" },
});
