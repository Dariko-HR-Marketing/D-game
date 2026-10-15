import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Banner, Card, Pill } from "./kit";
import { Screen } from "./Screen";
import { uz } from "../i18n/uz";
import { color, font, PLAYER_COLORS, radius, space, tone } from "../theme";
import { readableOn } from "../contrast";
import type { Http } from "../net/http";

export function Leaderboard({ http, onBack }: { http: Http; onBack: () => void }) {
  const [rows, setRows] = useState<any[] | null>(null); const [err, setErr] = useState(false);
  useEffect(() => { http.leaderboard().then(setRows).catch(() => { setErr(true); setRows([]); }); }, [http]);
  return (
    <Screen title={uz.profile.leaderboard} subtitle={uz.profile.boardHint} onBack={onBack} maxWidth={520}>
      {rows === null && <Text style={s.muted} accessibilityLiveRegion="polite">{uz.result.loading}</Text>}
      {err && <Banner kind="bad">{uz.result.failed}</Banner>}
      {rows && rows.length === 0 && !err && <Card><Text style={s.empty}>{uz.profile.boardEmpty}</Text></Card>}
      {rows && rows.length > 0 && (
        <Card style={{ padding: 0 }} raised>
          <View role="list">{rows.map((r, i) => { const hue = PLAYER_COLORS[r.color % 6]; return (
            <View key={r.rank} role="listitem" accessible aria-label={`${r.rank}. ${r.name}. ${uz.profile.wins}: ${r.wins}, ${uz.profile.games}: ${r.games}, ${uz.profile.level} ${r.level}`} style={[s.row, i > 0 && { borderTopWidth: 1, borderTopColor: color.line }]}>
              <View style={[s.rank, r.rank <= 3 && { backgroundColor: color.gold }]} aria-hidden><Text style={s.rankT}>{r.rank}</Text></View>
              <View style={[s.dot, { backgroundColor: hue }]} aria-hidden><Text style={{ color: readableOn(hue), fontWeight: "800", fontSize: 12 }}>{(r.name[0] ?? "?").toUpperCase()}</Text></View>
              <View style={{ flex: 1 }} aria-hidden><Text style={s.name} numberOfLines={1}>{r.name}</Text><Text style={s.muted}>{r.games} {uz.profile.gamesWord}</Text></View>
              <View style={{ alignItems: "flex-end", gap: 2 }} aria-hidden><Text style={s.wins}>{r.wins} {uz.profile.winsWord}</Text><Pill label={`${uz.profile.level} ${r.level}`} kind="info" /></View>
            </View>); })}</View>
        </Card>)}
    </Screen>
  );
}
const s = StyleSheet.create({
  muted: { color: tone.muted, fontSize: font.sm }, empty: { color: tone.muted, fontSize: font.md, lineHeight: 22 },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, minHeight: 64 },
  rank: { width: 30, height: 30, borderRadius: 15, backgroundColor: color.bg, alignItems: "center", justifyContent: "center" }, rankT: { fontWeight: "800", color: color.navy },
  dot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: color.navy, alignItems: "center", justifyContent: "center" },
  name: { color: color.navy, fontSize: font.lg, fontWeight: "800" }, wins: { color: color.navy, fontWeight: "800", fontSize: font.md },
});
