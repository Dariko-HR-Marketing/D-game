import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { Button } from "./Button";
import { Banner, Card, Pill } from "./kit";
import { uz, errText } from "../i18n/uz";
import { money } from "../format";
import { nameOf } from "../model";
import { color, font, PLAYER_COLORS, radius, space, tone } from "../theme";
import { readableOn } from "../contrast";
import type { RoomView } from "../net/connection";

/** §6.4 / N09: o'yin boshlanishidan oldin har bir o'yinchi orzusini tanlaydi (takrorlanmaydi). */
export function DreamPick({ room, userId, error, onPick }: { room: RoomView; userId: string; error?: string | null; onPick: (idx: number) => void }) {
  const players: any[] = room.state?.players ?? []; const { width } = useWindowDimensions();
  const mine = players.find((p) => p.id === userId)?.dreamIdx ?? null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const h = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(h); }, []);
  const left = room.deadline ? Math.max(0, Math.ceil((room.deadline - now) / 1000)) : null;
  const takenBy = (i: number) => players.find((p) => p.dreamIdx === i)?.id as string | undefined;
  const cols = width >= 1000 ? 3 : width >= 640 ? 2 : 1;
  const done = players.filter((p) => p.dreamIdx !== null).length;
  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <View style={s.head}>
        <View style={{ flex: 1 }}><Text style={s.h} aria-level={1} accessibilityRole="header">{uz.dreams.title}</Text><Text style={s.sub}>{uz.dreams.hint}</Text></View>
        {left !== null && <Pill label={`${left} ${uz.game.secShort}`} kind={left <= 10 ? "warn" : "plain"} />}
      </View>
      <View style={s.who} role="group" aria-label={uz.game.players}>
        {players.map((p, k) => { const hue = PLAYER_COLORS[(room.names?.[p.id]?.color ?? k) % PLAYER_COLORS.length]; const ok = p.dreamIdx !== null; return (
          <View key={p.id} role="group" accessible aria-label={`${nameOf(room, p.id)}: ${ok ? uz.dreams.chosen : uz.dreams.choosing}`} style={s.who1}>
            <View style={[s.dot, { backgroundColor: hue }]} aria-hidden><Text style={{ color: readableOn(hue), fontWeight: "800", fontSize: 12 }}>{k + 1}</Text></View>
            <Text style={s.whoT} aria-hidden>{nameOf(room, p.id)} {ok ? "✓" : "…"}</Text></View>); })}
        <Text style={s.cnt}>{done}/{players.length} {uz.dreams.chosen}</Text>
      </View>
      {mine !== null && <Banner kind="good">{uz.dreams.waiting}</Banner>}
      {error ? <Text style={{ color: color.red }} accessibilityRole="alert">{errText(error)}</Text> : null}
      <View style={s.grid}>
        {(room.dreams ?? []).map((d, i) => {
          const by = takenBy(i); const isMine = by === userId; const k = by ? players.findIndex((p) => p.id === by) : -1;
          return (
            <View key={i} style={[s.cell, { width: `${100 / cols - 2}%` as any }]}>
              <Card accent={isMine ? "green" : undefined} style={[{ flex: 1, justifyContent: "space-between" }, by && !isMine && { opacity: 0.6 }]}>
                <View style={{ gap: space.sm }}><Text style={s.name}>{d.name}</Text><Text style={s.price}>{uz.dreams.price}: <Text style={s.priceV}>{money(d.price)}</Text> sh.b.</Text></View>
                {by ? <Pill label={isMine ? uz.dreams.yours : `${uz.dreams.taken} · ${nameOf(room, by)}${k >= 0 ? ` (${k + 1})` : ""}`} kind={isMine ? "good" : "plain"} />
                  : <Button label={mine === null ? uz.dreams.pick : uz.dreams.change} kind={mine === null ? "primary" : "ghost"} onPress={() => onPick(i)} />}
              </Card>
            </View>);
        })}
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: space.xl, gap: space.lg, maxWidth: 1100, width: "100%", alignSelf: "center" },
  head: { flexDirection: "row", gap: space.md, alignItems: "flex-start" }, h: { fontSize: font.xxl, fontWeight: "800", color: color.navy }, sub: { color: tone.muted, fontSize: font.md, lineHeight: 21, marginTop: space.xs },
  who: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, alignItems: "center" }, who1: { flexDirection: "row", alignItems: "center", gap: space.xs, backgroundColor: color.white, borderRadius: radius.pill, borderWidth: 1, borderColor: color.line, paddingVertical: space.xs, paddingHorizontal: space.md },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.navy, alignItems: "center", justifyContent: "center" }, whoT: { color: color.navy, fontSize: font.sm, fontWeight: "700" }, cnt: { color: tone.muted, fontWeight: "800", marginLeft: space.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md }, cell: { minWidth: 260, flexGrow: 1 },
  name: { color: color.navy, fontSize: font.lg, fontWeight: "800", lineHeight: 23 }, price: { color: tone.muted, fontSize: font.md }, priceV: { color: color.navy, fontWeight: "800" },
});
