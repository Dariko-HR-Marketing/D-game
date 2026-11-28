import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { Banner, Card, Pill } from "./kit";
import { Screen } from "./Screen";
import { Icon } from "./Icon";
import { uz } from "../i18n/uz";
import { color, font, PLAYER_COLORS, radius, space, tone } from "../theme";
import { readableOn } from "../contrast";
import type { Http } from "../net/http";

const MEDAL = ["#F2B233", "#B8C4CE", "#D9955B"]; // oltin, kumush, bronza (raqam va nom ham ko'rsatiladi — rangga yolg'iz tayanilmaydi)
type Row = { rank: number; name: string; color: number; wins: number; games: number; level: number; league?: string; rating?: number };
const tag = (r: Row) => (r.league ? `${uz.progress.leagues[r.league]} · ${r.rating}` : `${uz.profile.level} ${r.level}`);
const aria = (r: Row) => `${r.rank}. ${r.name}. ${uz.profile.wins}: ${r.wins}, ${uz.profile.games}: ${r.games}, ${tag(r)}`;
const Dot = ({ r, size }: { r: Row; size: number }) => { const hue = PLAYER_COLORS[r.color % PLAYER_COLORS.length]; return <View style={[s.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: hue }]} aria-hidden><Text style={{ color: readableOn(hue), fontWeight: "800", fontSize: Math.round(size * 0.4) }}>{(r.name[0] ?? "?").toUpperCase()}</Text></View>; };

/** Reyting: g'oliblar podiumi (1–3 o'rin) va ostida jadval (o'rin · o'yinchi · g'alaba · liga/daraja). Ma'lumot serverdan; mijoz faqat ko'rsatadi. */
export function Leaderboard({ http, onBack }: { http: Http; onBack: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null); const [err, setErr] = useState(false); const [me, setMe] = useState<{ rank: number; total: number; wins: number; games: number; league?: string | null } | null>(null);
  useEffect(() => { http.myRank?.().then((r: any) => setMe(r?.me ?? null)).catch(() => {}); }, [http]);
  useEffect(() => { http.leaderboard().then(setRows).catch(() => { setErr(true); setRows([]); }); }, [http]);
  const narrow = useWindowDimensions().width < 560;
  const top = (rows ?? []).slice(0, 3), rest = (rows ?? []).slice(3);
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top; // o'rtada 1-o'rin
  return (
    <Screen title={uz.profile.leaderboard} subtitle={uz.profile.boardHint} onBack={onBack} maxWidth={720} icon="trophy" chips={rows ? [{ label: uz.profile.boardPlayers, value: String(rows.length) }, ...(me ? [{ label: uz.profile.boardMine, value: `#${me.rank}`, good: true }] : [])] : undefined}>
      {rows === null && <Text style={s.muted} accessibilityLiveRegion="polite">{uz.result.loading}</Text>}
      {err && <Banner kind="bad">{uz.result.failed}</Banner>}
      {rows && rows.length === 0 && !err && (
        <View style={s.emptyWrap} testID="board-empty">
          <View style={s.ghostRow} aria-hidden>{[{ h: 78, r: 2 }, { h: 108, r: 1 }, { h: 58, r: 3 }].map((g) => (
            <View key={g.r} style={[s.ghost, { height: g.h, borderColor: MEDAL[g.r - 1] }]}><View style={[s.ghostMedal, { backgroundColor: MEDAL[g.r - 1] }]}>{g.r === 1 ? <Icon name="trophy" size={14} color={color.navy} /> : <Text style={s.medalT}>{g.r}</Text>}</View></View>))}</View>
          <Text style={s.emptyT}>{uz.profile.boardEmptyTitle}</Text>
          <Text style={s.empty}>{uz.profile.boardEmpty}</Text>
        </View>)}
      {me && <View style={s.me} role="status" testID="my-rank" accessibilityLabel={uz.profile.myRank.replace("{r}", String(me.rank)).replace("{n}", String(me.total))}><Text style={s.meT} aria-hidden>{uz.profile.myRank.replace("{r}", String(me.rank)).replace("{n}", String(me.total))}</Text><Text style={s.muted} aria-hidden>{uz.profile.wins}: {me.wins} · {uz.profile.games}: {me.games}</Text></View>}
      {top.length > 0 && (
        <View style={s.podium} role="list" aria-label={uz.profile.leaderboard} testID="board-podium">
          {order.map((r) => { const first = r.rank === 1; return (
            <View key={r.rank} role="listitem" accessible aria-label={aria(r)} style={[s.pc, first && s.pcFirst, { borderColor: MEDAL[r.rank - 1] ?? color.line }]} testID={`podium-${r.rank}`}>
              <View style={[s.medal, { backgroundColor: MEDAL[r.rank - 1] }]} aria-hidden>{first ? <Icon name="trophy" size={16} color={color.navy} /> : <Text style={s.medalT}>{r.rank}</Text>}</View>
              <Dot r={r} size={first ? 56 : 46} />
              <Text style={[s.pn, first && { fontSize: font.lg }]} numberOfLines={1} aria-hidden>{r.name}</Text>
              <Text style={s.pw} aria-hidden>{r.wins} {uz.profile.winsWord}</Text>
              <View aria-hidden><Pill label={tag(r)} kind={r.league ? "good" : "info"} /></View>
            </View>); })}
        </View>)}
      {rest.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }} raised>
          <View style={s.th} aria-hidden><Text style={[s.thT, { width: 36 }]}>{uz.profile.rank}</Text><Text style={[s.thT, { flex: 1 }]}>{uz.profile.leaderboard}</Text><Text style={[s.thT, { width: 64, textAlign: "right" }]}>{uz.profile.wins}</Text>{!narrow && <Text style={[s.thT, { width: 110, textAlign: "right" }]}>{uz.profile.level}</Text>}</View>
          <View role="list">{rest.map((r, i) => (
            <View key={r.rank} role="listitem" accessible aria-label={aria(r)} style={[s.row, i % 2 === 1 && { backgroundColor: "#F8FAFB" }]}>
              <Text style={s.rank} aria-hidden>{r.rank}</Text>
              <View style={s.who} aria-hidden><Dot r={r} size={32} /><View style={{ flex: 1 }}><Text style={s.name} numberOfLines={1}>{r.name}</Text><Text style={s.muted} numberOfLines={1}>{r.games} {uz.profile.gamesWord}{narrow ? ` · ${tag(r)}` : ""}</Text></View></View>
              <Text style={s.wins} aria-hidden>{r.wins}</Text>
              {!narrow && <View style={{ width: 110, alignItems: "flex-end" }} aria-hidden><Pill label={tag(r)} kind={r.league ? "good" : "info"} /></View>}
            </View>))}</View>
        </Card>)}
    </Screen>
  );
}
const s = StyleSheet.create({
  emptyWrap: { alignItems: "center", gap: space.sm, padding: space.xl, borderRadius: radius.lg, backgroundColor: color.white, borderWidth: 1, borderColor: color.line }, emptyT: { color: color.navy, fontWeight: "800", fontSize: font.lg, textAlign: "center" },
  ghostRow: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, marginBottom: space.sm }, ghost: { width: 78, borderRadius: radius.md, borderWidth: 2, borderStyle: "dashed", alignItems: "center", paddingTop: 8, opacity: 0.75, backgroundColor: "#FAFBFC" }, ghostMedal: { minWidth: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  muted: { color: tone.muted, fontSize: font.sm }, empty: { color: tone.muted, fontSize: font.md, lineHeight: 22 },
  podium: { flexDirection: "row", alignItems: "flex-end", gap: space.sm }, pc: { flex: 1, minWidth: 0, alignItems: "center", gap: 4, paddingVertical: space.md, paddingHorizontal: space.xs, borderRadius: radius.lg, borderWidth: 2, backgroundColor: color.white },
  pcFirst: { paddingVertical: space.lg, backgroundColor: "#FFFBF0" }, medal: { minWidth: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }, medalT: { fontWeight: "800", color: color.navy, fontSize: font.sm },
  pn: { color: color.navy, fontWeight: "800", fontSize: font.md, maxWidth: "100%" }, pw: { color: tone.muted, fontSize: font.sm, fontWeight: "700" },
  dot: { borderWidth: 2, borderColor: color.navy, alignItems: "center", justifyContent: "center" },
  th: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, minHeight: 36, backgroundColor: "#F4F7F8", borderBottomWidth: 1, borderBottomColor: color.line }, thT: { color: tone.muted, fontSize: 12, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, minHeight: 60 }, rank: { width: 36, color: color.navy, fontWeight: "800", fontSize: font.md },
  me: { gap: 2, padding: space.md, borderRadius: radius.md, backgroundColor: "#EAF8F1", borderWidth: 1, borderColor: color.green }, meT: { color: color.navy, fontSize: font.lg, fontWeight: "800" },
  who: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: space.sm }, name: { color: color.navy, fontSize: font.md, fontWeight: "800" }, wins: { width: 64, textAlign: "right", color: color.navy, fontWeight: "800", fontSize: font.md },
});
