import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Button } from "./Button";
import { uz } from "../i18n/uz";
import { color, PLAYER_COLORS } from "../theme";
import type { Http } from "../net/http";

export function Leaderboard({ http, onBack }: { http: Http; onBack: () => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { http.leaderboard().then(setRows).catch(() => setRows([])); }, [http]);
  return (<ScrollView contentContainerStyle={s.wrap}>
    <Text style={s.h} aria-level={1} accessibilityRole="header">{uz.profile.leaderboard}</Text>
    {rows && rows.length === 0 && <Text style={s.sub}>{uz.profile.empty}</Text>}
    {rows?.map((r) => (<View key={r.rank} style={s.row}><Text style={s.rank}>{r.rank}</Text><View style={[s.dot, { backgroundColor: PLAYER_COLORS[r.color % 6] }]} />
      <Text style={s.name}>{r.name}</Text><Text style={s.sub}>{r.wins} / {r.games}</Text></View>))}
    <Button label={uz.profile.back} kind="ghost" onPress={onBack} /></ScrollView>);
}
const s = StyleSheet.create({
  wrap: { padding: 20, gap: 10, maxWidth: 480, width: "100%", alignSelf: "center" }, h: { fontSize: 22, fontWeight: "800", color: color.navy },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, borderBottomWidth: 1, borderColor: color.line }, rank: { width: 28, fontWeight: "800", color: color.navy },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: color.navy }, name: { flex: 1, color: color.navy, fontSize: 16 }, sub: { color: color.text2 },
});
