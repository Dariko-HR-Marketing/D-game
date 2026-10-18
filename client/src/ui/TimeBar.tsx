import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Icon } from "./Icon";
import { uz } from "../i18n/uz";
import { monthsText, splitMonths, MONTHS_PER_YEAR } from "../estimates";
import { nameOf } from "../model";
import { color, font, radius, space, tone } from "../theme";
import type { RoomView } from "../net/connection";

const months = (p: any): number => (typeof p?.monthsPlayed === "number" ? p.monthsPlayed : 0);

/**
 * O'yin vaqti, oyma-oy (SPEC §5.1: har bir «D» / «Yana pullar» katagidan o'tish yoki tushish — 1 oy). Server hisoblaydi (`monthsPlayed`), mijoz faqat ko'rsatadi.
 * Yil ichidagi oylar 12 ta nuqtada; har tashlashdan keyin (fishka yurib bo'lgach) «+N oy» chiqadi.
 */
export function TimeBar({ room, userId, settled }: { room: RoomView; userId: string; settled: boolean }) {
  const st = room.state, players: any[] = st.players, mine = players.find((p) => p.id === userId);
  const total = months(mine); const [shown, setShown] = useState(total); const [pending, setPending] = useState<{ who: string; m: number } | null>(null); const [delta, setDelta] = useState<{ who: string; m: number } | null>(null);
  const last = useRef<Record<string, number>>(Object.fromEntries(players.map((p) => [p.id, months(p)]))); const seen = useRef<number | undefined>((st.lastRoll as any)?.n);
  const lr = st.lastRoll as { n: number; playerId: string } | null | undefined;
  // Har bir holat yangilanishida (fishka yurib bo'lishini kutmasdan) tashlagan o'yinchining oylar farqi olinadi: ketma-ket ikki tashlash birlashib ketmaydi
  useEffect(() => {
    const now = Object.fromEntries(players.map((p) => [p.id, months(p)]));
    if (lr && lr.n !== seen.current) { seen.current = lr.n; const d = (now[lr.playerId] ?? 0) - (last.current[lr.playerId] ?? 0); if (d > 0) setPending({ who: lr.playerId, m: d }); }
    last.current = now;
  }, [st]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (settled) setShown(total); }, [settled, total]); // jami vaqt fishka yurib bo'lgach yangilanadi (kamaytirilgan harakatda — darrov)
  useEffect(() => { if (!pending || !settled) return; setDelta(pending); setPending(null); const h = setTimeout(() => setDelta(null), 5000); return () => clearTimeout(h); }, [pending, settled]);
  const { months: inYear, total: all } = splitMonths(shown); const w = { year: uz.time.year, month: uz.time.month };
  const text = monthsText(all, w);
  return (
    <View style={s.bar} testID="timebar" role="group" accessible aria-label={`${uz.time.label}: ${text}${delta ? `, ${delta.who === userId ? uz.time.you : nameOf(room, delta.who)}: +${delta.m} ${uz.time.month}` : ""}`}>
      <Icon name="clock" size={18} color={color.navy} />
      <View style={{ flexShrink: 1 }} aria-hidden><Text style={s.l}>{uz.time.label}</Text><Text style={s.v} numberOfLines={1}>{text}</Text></View>
      <View style={s.dots} aria-hidden>{Array.from({ length: MONTHS_PER_YEAR }, (_, k) => <View key={k} style={[s.dot, k < inYear && s.dotOn]} />)}</View>
      {delta && <View style={s.delta} aria-hidden><Text style={s.deltaT} numberOfLines={1}>{delta.who === userId ? "" : `${nameOf(room, delta.who)} `}+{delta.m} {uz.time.month}</Text></View>}
      {all >= MONTHS_PER_YEAR && <Text style={s.tot} aria-hidden>{all} {uz.time.month}</Text>}
    </View>
  );
}
const s = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: color.white, borderWidth: 1, borderColor: "#E6ECEF", borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 6, minHeight: 44 },
  l: { color: tone.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.4 }, v: { color: color.navy, fontSize: font.md, fontWeight: "800", fontVariant: ["tabular-nums"] },
  dots: { flexDirection: "row", gap: 3, flexShrink: 0 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.line }, dotOn: { backgroundColor: color.green },
  delta: { backgroundColor: "#E7F4EE", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, flexShrink: 1 }, deltaT: { color: tone.good, fontWeight: "800", fontSize: font.sm },
  tot: { marginLeft: "auto" as any, color: tone.muted, fontSize: font.sm, fontVariant: ["tabular-nums"], flexShrink: 0 },
});
