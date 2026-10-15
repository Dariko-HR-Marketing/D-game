import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { animationMs, useReducedMotion } from "../motion";
import { SMALL_BOARD } from "@poyga/rules";
import { color, font, PLAYER_COLORS, radius, space, tone } from "../theme";
import { readableOn } from "../contrast";
import { pathIndex, squareRing, type Tile } from "../boardLayout";
import { BIG_CELLS } from "../bigBoard";
import { Icon, type IconName } from "./Icon";
import { nameOf } from "../model";
import { uz } from "../i18n/uz";
import type { RoomView } from "../net/connection";

interface Look { bg: string; border: string; fg: string; icon: IconName; label: string }
/** Katak ko'rinishi (maket C4_UIKit): rang + ikonka + yozuv birga — rangga yolg'iz tayanmaydi. */
export const SMALL_LOOK: Record<string, Look> = {
  D: { bg: "#DCEEC4", border: "#A9CF7E", fg: "#0A5C3B", icon: "dollar", label: "DAROMAD" },
  B: { bg: "#C9EBFA", border: "#7CC3E3", fg: "#0E5F85", icon: "cart", label: "BOZOR" },
  I: { bg: "#DCEEC4", border: "#A9CF7E", fg: "#0A5C3B", icon: "move", label: "IMKONIYAT" },
  H: { bg: "#FFD2D5", border: "#E8939B", fg: "#8F2434", icon: "search", label: "XARAJATLAR" },
  K: { bg: "#EDF0F3", border: "#C3CBD3", fg: "#1B2733", icon: "info", label: "BOSHIDAN BOSHLANG" },
  S: { bg: "#0A7A50", border: "#0A7A50", fg: "#FFFFFF", icon: "arrow", label: "START" },
  Q: { bg: "#EDF0F3", border: "#C3CBD3", fg: "#1B2733", icon: "clock", label: "ISHDAN BO'SHADINGIZ" },
  O: { bg: "#C9EBFA", border: "#7CC3E3", fg: "#0E5F85", icon: "person", label: "OTA BO'LDINGIZ" },
};
const BIG_LOOK: Record<string, Look> = {
  T: { bg: "#C9EBFA", border: "#7CC3E3", fg: "#0E5F85", icon: "house", label: "TURG'UN" },
  V: { bg: "#FFE3B8", border: "#E9A64B", fg: "#6B4300", icon: "dice", label: "TAVAKKAL" },
  O: { bg: "#FFD2D5", border: "#E8939B", fg: "#8F2434", icon: "star", label: "ORZU" },
  Y: { bg: "#C73A42", border: "#C73A42", fg: "#FFFFFF", icon: "banknote", label: "YANA PULLAR" },
  X: { bg: "#4A5B6C", border: "#4A5B6C", fg: "#FFFFFF", icon: "alert", label: "" },
};
const X_ICON: Record<string, IconName> = { Bankrot: "alert", Ajrashish: "heart", "Audit tekshiruvi": "search", Start: "flag" };
const lookOf = (circle: "small" | "big", i: number): Look => {
  if (circle === "small") return SMALL_LOOK[SMALL_BOARD[i]];
  const c = BIG_CELLS[i], l = BIG_LOOK[c.t];
  return c.t === "X" ? { ...l, icon: X_ICON[c.name] ?? "lock", label: c.name.startsWith("Siz nohalol") ? "NOHALOL" : c.name.toUpperCase() } : l;
};
export const cellLabel = (circle: "small" | "big", i: number) => (circle === "small" ? SMALL_LOOK[SMALL_BOARD[i]].label : BIG_CELLS[i].t === "O" ? `ORZU: ${BIG_CELLS[i].name}` : lookOf("big", i).label);

/** Yozuv o'lchami: eng uzun so'z katakka sig'adigan eng katta o'lcham (so'z o'rtasidan bo'linmasin). */
const labelSize = (label: string, w: number) => { const longest = Math.max(...label.split(" ").map((x) => x.length), 4); return Math.max(6, Math.min(10, Math.floor(((w - 8) / (longest * 0.78)) * 2) / 2)); };

/** Taxta o'lchamlari: telefonda tor va baland (10 ustun), planshet/kompyuterda keng (16 ustun). */
export function boardGeometry(width: number, wide: boolean, n: number) {
  const cols = n === 48 ? (wide ? 16 : 10) : wide ? 17 : 11;
  const side = n - 2 * cols, rows = Math.ceil(side / 2) + 2; // o'ng ustun chapdan bitta ko'p bo'lishi mumkin
  const c = wide ? Math.max(48, Math.min(72, Math.round(width / (cols + 1.2)))) : Math.round(Math.max(36, Math.min(48, width * 0.128)));
  const sideH = wide ? Math.max(40, c * 0.9) : Math.max(19, c * 0.46);
  return { cols, c, W: width, H: Math.round(2 * c + rows * 0 + Math.ceil(side / 2) * sideH) };
}

/** Taxta: kvadrat halqa (soat yo'nalishida), ikonkali kataklar, o'yinchi fishkalari; markazda — kubik/navbat paneli (`children`). */
export function Board({ room, width, wide, currentId, children }: { room: RoomView; width: number; wide: boolean; currentId: string | null; children?: React.ReactNode }) {
  const players: any[] = room.state.players;
  const anySmall = players.some((p) => p.circle === "small"), anyBig = players.some((p) => p.circle === "big");
  const circle: "small" | "big" = anySmall ? "small" : "big";
  const n = circle === "small" ? 48 : 53;
  const g = boardGeometry(width, wide, n), { W, H, c } = g;
  const offset = circle === "small" ? (wide ? 4 : 12) : 24;
  const tiles = squareRing(n, g.cols, W, H, c);
  const mixed = anySmall && anyBig;
  // Aralash o'yin: katta aylana o'yinchilari uchun ichki halqa (kichik nuqtalar)
  const inset = c + 6, iW = W - 2 * inset, iH = H - 2 * inset, ic = Math.max(8, Math.round(c * 0.28));
  const innerTiles = mixed ? squareRing(53, Math.max(8, Math.round(iW / (ic * 1.6))), iW, iH, ic) : [];
  const hue = (p: any, k: number) => PLAYER_COLORS[(room.names?.[p.id]?.color ?? k) % 6];
  const pawn = wide ? 28 : 22;
  const curP = players.find((p) => p.id === currentId);
  const where = (p: any): { x: number; y: number } => {
    const big = p.circle === "big" && mixed; const t: Tile = big ? innerTiles[pathIndex(p.pos, 53, 24)] : tiles[pathIndex(p.pos, p.circle === "small" ? 48 : 53, p.circle === "small" ? (wide ? 4 : 12) : 24)];
    const ox = big ? inset : 0;
    return { x: ox + t.x + t.w / 2, y: ox + t.y + t.h / 2 };
  };
  return (
    <View>
      <View style={{ width: W, height: H }}>
        <View style={StyleSheet.absoluteFill} role="img" aria-label={`Taxta. ${players.map((p) => `${nameOf(room, p.id)}: ${p.pos}-katak${p.circle === "big" ? " (katta aylana)" : ""}`).join("; ")}`}>
          {tiles.map((t, pi) => {
            const i = (((pi - offset) % n) + n) % n; const L = lookOf(circle, i); const here = curP && curP.circle === circle && curP.pos === i;
            const dream = circle === "big" && BIG_CELLS[i].t === "O" && players.some((p) => p.dreamIdx !== null && room.dreams?.[p.dreamIdx]?.name === BIG_CELLS[i].name && p.id === currentId);
            const side = !t.corner && (pi >= g.cols && pi < g.cols + Math.ceil((n - 2 * g.cols) / 2) || pi >= 2 * g.cols + Math.ceil((n - 2 * g.cols) / 2));
            const small = side && !wide; // telefonda yon kataklar nozik: faqat ikonka
            return (
              <View key={pi} aria-hidden style={[s.tile, { left: t.x + 1, top: t.y + 1, width: t.w - 2, height: t.h - 2, backgroundColor: L.bg, borderColor: here ? color.navy : L.border, borderWidth: here ? 3 : 1, zIndex: here ? 2 : 0 }, dream && { borderStyle: "dashed", borderColor: "#A82F3E", borderWidth: 2 }]}>
                <Icon name={L.icon} size={small ? 12 : t.corner ? 22 : 18} color={L.fg} />
                {!small && (wide || t.corner === false) && t.w > 44 && <Text style={[s.tileT, { color: L.fg, fontSize: labelSize(L.label, t.w) }]} numberOfLines={2}>{L.label}</Text>}
              </View>);
          })}
          {mixed && innerTiles.map((t, pi) => <View key={`b${pi}`} aria-hidden style={{ position: "absolute", left: inset + t.x + 1, top: inset + t.y + 1, width: t.w - 2, height: t.h - 2, borderRadius: 3, backgroundColor: color.line }} />)}
          {players.map((p, k) => {
            const pt = where(p); const mates = players.filter((q) => q.circle === p.circle && q.pos === p.pos), gi = mates.findIndex((q) => q.id === p.id);
            const ang = (gi / Math.max(1, mates.length)) * 2 * Math.PI - Math.PI / 2, off = mates.length > 1 ? pawn * 0.5 : 0;
            return <Pawn key={p.id} x={pt.x + off * Math.cos(ang) - pawn / 2} y={pt.y + off * Math.sin(ang) - pawn / 2} size={pawn} hue={hue(p, k)} label={k + 1} isCur={p.id === currentId} />;
          })}
        </View>
        {/* Markaz paneli (ichida tugma bor — taxta tasviridan tashqarida) */}
        <View style={{ position: "absolute", left: c + 10, top: c + 10, width: W - 2 * c - 20, height: H - 2 * c - 20, alignItems: "center", justifyContent: "center", gap: space.sm, zIndex: 10, borderRadius: radius.md, backgroundColor: color.white, borderWidth: 1, borderColor: "#E6ECEF" }}>{children}</View>
      </View>
      <Legend circle={circle} />
    </View>
  );
}

/** Katak turlari izohi: ikonka + nom + qoida. Har doim ko'rinadi (maket: taxta tagida). */
function Legend({ circle }: { circle: "small" | "big" }) {
  const [open, setOpen] = useState(false);
  const keys = circle === "small" ? (["S", "I", "H", "B", "D", "O", "K", "Q"] as const) : (["T", "V", "O", "Y", "X"] as const);
  return (
    <View style={{ marginTop: space.sm }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={s.toggle}><Text style={s.toggleT}>{open ? "▾" : "▸"} {uz.legend.title}</Text></Pressable>
      {open && (<View style={s.grid}>{keys.map((k) => { const L = circle === "small" ? SMALL_LOOK[k] : BIG_LOOK[k];
        return (<View key={k} style={s.item}><View style={[s.sw, { backgroundColor: L.bg, borderColor: L.border }]} aria-hidden><Icon name={L.icon} size={14} color={L.fg} /></View>
          <Text style={s.itemT}>{circle === "small" ? uz.legend.cells[k] : uz.legend.big[k]}</Text></View>); })}</View>)}
    </View>
  );
}
const s = StyleSheet.create({
  tile: { position: "absolute", borderRadius: 6, alignItems: "center", justifyContent: "center", gap: 1, overflow: "hidden" },
  tileT: { fontWeight: "800", textAlign: "center", letterSpacing: 0.2, lineHeight: 10 },
  toggle: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.sm, alignSelf: "flex-start", borderRadius: radius.sm }, toggleT: { color: color.navy, fontWeight: "700", fontSize: font.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, paddingHorizontal: space.sm },
  item: { flexDirection: "row", alignItems: "center", gap: space.sm, flexBasis: 150, flexGrow: 1 }, sw: { width: 26, height: 26, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" }, itemT: { color: tone.muted, fontSize: font.sm, flex: 1 },
});

/** Fishka: yangi katakka silliq siljiydi (harakatni kamaytirish yoqilgan bo'lsa — darhol). */
function Pawn({ x, y, size, hue, label, isCur }: { x: number; y: number; size: number; hue: string; label: number; isCur: boolean }) {
  const reduced = useReducedMotion(); const pos = useRef(new Animated.ValueXY({ x, y })).current;
  useEffect(() => { Animated.timing(pos, { toValue: { x, y }, duration: animationMs(reduced) * 2, useNativeDriver: false }).start(); }, [x, y, reduced, pos]);
  return (
    <Animated.View aria-hidden style={{ position: "absolute", left: pos.x, top: pos.y, width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", zIndex: isCur ? 6 : 4,
      backgroundColor: hue, borderWidth: isCur ? 3 : 2, borderColor: isCur ? color.navy : "#fff", shadowColor: "#000", shadowOpacity: isCur ? 0.4 : 0.25, shadowRadius: isCur ? 6 : 3, shadowOffset: { width: 0, height: 1 } }}>
      <Text style={{ fontSize: Math.round(size * 0.5), fontWeight: "800", color: readableOn(hue) }}>{label}</Text>
    </Animated.View>
  );
}
