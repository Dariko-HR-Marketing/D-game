import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SMALL_BOARD } from "@poyga/rules";
import { color, font, PLAYER_COLORS, radius, space, tone } from "../theme";
import { readableOn } from "../contrast";
import { ringPosition } from "../boardLayout";
import { nameOf } from "../model";
import { uz } from "../i18n/uz";
import type { RoomView } from "../net/connection";

export const CELL_COLOR: Record<string, string> = { S: color.navy, I: color.green, H: color.red, B: color.gold, D: "#2C6DB5", K: color.text2, Q: color.text2, O: "#7B4FA3" };

/** Taxta: kataklar halqasi, fishkalar (o'yinchi rangi va raqami), markazda — kubik/navbat paneli (`children`). */
export function Board({ room, size, turns = 0, currentId, children }: { room: RoomView; size: number; turns?: number; currentId: string | null; children?: React.ReactNode }) {
  const players: any[] = room.state.players;
  const anySmall = players.some((p) => p.circle === "small"), anyBig = players.some((p) => p.circle === "big");
  const circle = anySmall ? "small" : "big";
  const n = circle === "small" ? 48 : 53;
  const cell = Math.max(14, Math.floor(((2 * Math.PI * 0.44 * size) / n) * 0.86)); // qo'shni kataklar ustma-ust tushmaydi
  const mixed = anySmall && anyBig; const inner = 0.2, dot = Math.max(6, Math.floor((2 * Math.PI * inner * size) / 53 * 0.7));
  const hue = (p: any, k: number) => PLAYER_COLORS[(room.names?.[p.id]?.color ?? k) % 6];
  const pawn = Math.max(20, Math.round(size * 0.062));
  const curP = players.find((p) => p.id === currentId);
  return (
    <View>
      <View style={{ width: size, height: size }}>
        <View style={StyleSheet.absoluteFill} role="img" aria-label={`Taxta. ${players.map((p) => `${nameOf(room, p.id)}: ${p.pos}-katak${p.circle === "big" ? " (katta aylana)" : ""}`).join("; ")}`}>
        {Array.from({ length: n }, (_, i) => {
          const { x, y } = ringPosition(i, n, 0.44, turns); const t = circle === "small" ? SMALL_BOARD[i] : "";
          const here = curP && curP.circle === circle && curP.pos === i;
          return <View key={i} aria-hidden style={{ position: "absolute", left: x * size - cell / 2, top: y * size - cell / 2, width: cell, height: cell, borderRadius: 5,
            backgroundColor: circle === "small" ? CELL_COLOR[t] : color.line, opacity: here ? 1 : 0.88, borderWidth: here ? 3 : 0, borderColor: color.navy, zIndex: here ? 2 : 0 }}>
            <Text style={{ color: readableOn(circle === "small" ? CELL_COLOR[t] : color.line), fontSize: cell * 0.5, textAlign: "center", fontWeight: "800" }}>{t}</Text></View>;
        })}
        {mixed && Array.from({ length: 53 }, (_, i) => { const { x, y } = ringPosition(i, 53, inner, turns);
          return <View key={`b${i}`} aria-hidden style={{ position: "absolute", left: x * size - dot / 2, top: y * size - dot / 2, width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color.line }} />; })}
        {players.map((p, k) => {
          const big = p.circle === "big" && mixed, nn = p.circle === "small" ? 48 : 53; const isCur = p.id === currentId;
          const pt = ringPosition(p.pos, nn, big ? inner : 0.35, turns);
          // Bir katakdagi fishkalar bir-birini yopmasin: kichik doira bo'ylab joylashadi
          const mates = players.filter((q) => q.circle === p.circle && q.pos === p.pos), gi = mates.findIndex((q) => q.id === p.id);
          const ang = (gi / Math.max(1, mates.length)) * 2 * Math.PI - Math.PI / 2, off = mates.length > 1 ? pawn * 0.55 : 0;
          const x = pt.x + (off * Math.cos(ang)) / size, y = pt.y + (off * Math.sin(ang)) / size;
          return <View key={p.id} aria-hidden style={{ position: "absolute", left: x * size - pawn / 2, top: y * size - pawn / 2, width: pawn, height: pawn, borderRadius: pawn / 2, alignItems: "center", justifyContent: "center", zIndex: isCur ? 5 : 3,
            backgroundColor: hue(p, k), borderWidth: isCur ? 3 : 2, borderColor: color.navy, shadowColor: "#000", shadowOpacity: isCur ? 0.4 : 0.2, shadowRadius: isCur ? 6 : 2, shadowOffset: { width: 0, height: 1 } }}>
            <Text style={{ fontSize: Math.round(pawn * 0.5), fontWeight: "800", color: readableOn(hue(p, k)) }}>{k + 1}</Text></View>;
        })}
        </View>
        {/* Markaz paneli: taxta tasviridan tashqarida (ichida tugma bo'lgani uchun) */}
        <View style={{ position: "absolute", left: size * 0.16, top: size * 0.16, width: size * 0.68, height: size * 0.68, alignItems: "center", justifyContent: "center", gap: space.sm, zIndex: 10 }}>{children}</View>
      </View>
      <Legend />
    </View>
  );
}

/** Katak turlari izohi (yig'iladigan). Harf va rang birga: rangga tayanmaydi. */
function Legend() {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginTop: space.sm }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={s.toggle}><Text style={s.toggleT}>{open ? "▾" : "▸"} {uz.legend.title}</Text></Pressable>
      {open && (<View style={s.grid}>{(["S", "I", "H", "B", "D", "O", "K", "Q"] as const).map((k) => (
        <View key={k} style={s.item}><View style={[s.sw, { backgroundColor: CELL_COLOR[k] }]} aria-hidden><Text style={{ color: readableOn(CELL_COLOR[k]), fontWeight: "800", fontSize: 11 }}>{k}</Text></View>
          <Text style={s.itemT}>{uz.legend.cells[k]}</Text></View>))}</View>)}
    </View>
  );
}
const s = StyleSheet.create({
  toggle: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.sm, alignSelf: "flex-start", borderRadius: radius.sm }, toggleT: { color: color.navy, fontWeight: "700", fontSize: font.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, paddingHorizontal: space.sm },
  item: { flexDirection: "row", alignItems: "center", gap: space.sm, flexBasis: 150, flexGrow: 1 }, sw: { width: 24, height: 24, borderRadius: 5, alignItems: "center", justifyContent: "center" }, itemT: { color: tone.muted, fontSize: font.sm, flex: 1 },
});
