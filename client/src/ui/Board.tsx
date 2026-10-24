import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing } from "react-native";
import { useReducedMotion } from "../motion";
import { stepMs } from "../motionConfig";
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
/** Katakka sig'adigan eng katta o'lcham; 8 dan kichik bo'lsa yozuv ko'rsatilmaydi (ikonka + rang + «Katak turlari» izohi qoladi). */
const labelSize = (label: string, w: number) => { const longest = Math.max(...label.split(" ").map((x) => x.length), 4); return Math.min(10, Math.floor(((w - 8) / (longest * 0.78)) * 2) / 2); };

/** Fishka o'lchami va taxta atrofidagi bo'sh joy (fishka ramka bo'ylab, katak chetida yuradi — chetdan tashqariga chiqadi). */
export const pawnSize = (wide: boolean) => (wide ? 30 : 24);
export const boardPad = (wide: boolean) => Math.round(pawnSize(wide) * 0.75);

/** Taxta o'lchamlari: telefonda tor va baland (10 ustun), planshet/kompyuterda keng (16 ustun). */
export function boardGeometry(width: number, wide: boolean, n: number, tight = false, compact = false, roomy = false) {
  const cols = n === 48 ? (wide ? 16 : 10) : wide ? 17 : 11;
  const side = n - 2 * cols, rows = Math.ceil(side / 2) + 2; // o'ng ustun chapdan bitta ko'p bo'lishi mumkin
  // tight: past ekran (balandlik kam) — kataklar kichikroq (yozuvlar yashirinadi, ikonka va rang qoladi)
  const c = wide ? Math.max(compact ? 22 : tight ? 34 : 48, Math.min(72, Math.round(width / (cols + 1.2)))) : Math.round(Math.max(36, Math.min(roomy ? 72 : 48, width * 0.128))); // roomy: tik planshet — kataklar kattaroq
  const sideH = wide ? Math.max(compact ? 20 : tight ? 30 : 40, c * 0.9) : Math.max(19, c * 0.46);
  return { cols, c, W: width, H: Math.round(2 * c + rows * 0 + Math.ceil(side / 2) * sideH) };
}

/** Taxta: kvadrat halqa (soat yo'nalishida), ikonkali kataklar, o'yinchi fishkalari; markazda — kubik/navbat paneli (`children`). */
export function Board({ room, width, wide, currentId, tight, compact, roomy, viewCircle, movement, children }: { /** viewCircle: ko'ruvchining O'Z aylanasi — taxta shu aylananiki; boshqa aylana o'yinchilari ichki halqada. */ viewCircle?: "small" | "big"; room: RoomView; width: number; wide: boolean; currentId: string | null; tight?: boolean; compact?: boolean; roomy?: boolean; movement?: Record<string, { pos: number; circle: string }>; children?: React.ReactNode }) {
  const players: any[] = room.state.players;
  const anySmall = players.some((p) => p.circle === "small");
  const circle: "small" | "big" = viewCircle ?? (anySmall ? "small" : "big"); // ko'ruvchi kimligi ma'lum bo'lmasa (kuzatuvchi) — eski qoida
  const other: "small" | "big" = circle === "small" ? "big" : "small", otherN = other === "big" ? 53 : 48, otherOffset = other === "big" ? 24 : wide ? 4 : 12;
  const n = circle === "small" ? 48 : 53;
  const g = boardGeometry(width, wide, n, tight, compact, roomy), { W, H, c } = g;
  const offset = circle === "small" ? (wide ? 4 : 12) : 24;
  const tiles = squareRing(n, g.cols, W, H, c);
  const mixed = players.some((p) => p.circle === other);
  // Aralash o'yin: boshqa aylana o'yinchilari uchun ichki halqa (kichik nuqtalar); asosiy taxta — ko'ruvchining o'z aylanasi
  const inset = c + 6, iW = W - 2 * inset, iH = H - 2 * inset, ic = Math.max(8, Math.round(c * 0.28));
  const innerTiles = mixed ? squareRing(otherN, Math.max(8, Math.round(iW / (ic * 1.6))), iW, iH, ic) : [];
  const hue = (p: any, k: number) => room.names?.[p.id]?.cos?.pawn ?? PLAYER_COLORS[(room.names?.[p.id]?.color ?? k) % PLAYER_COLORS.length]; // do'kon kosmetikasi: faqat rang
  const pawn = pawnSize(wide), PAD = boardPad(wide);
  const curP = players.find((p) => p.id === currentId);
  const at = (p: any): { pos: number; circle: string } => movement?.[p.id] ?? { pos: p.pos, circle: p.circle }; // fishka hozir turgan (yurib kelayotgan) katak
  /** Fishka katak USTIDA emas, taxta RAMKASI (tashqi chet) bo'ylab yuradi: katak ikonkasi yopilmaydi. `inward` — katak tomonga qaragan strelka burchagi (gradus). */
  const where = (p: any): { x: number; y: number; inward: number | null; tx: number; ty: number } => {
    const q = at(p), big = q.circle !== circle && mixed; const t: Tile = big ? innerTiles[pathIndex(q.pos, otherN, otherOffset)] : tiles[pathIndex(q.pos, n, offset)];
    if (big) return { x: inset + t.x + t.w / 2, y: inset + t.y + t.h / 2, inward: null, tx: 1, ty: 0 };
    const dx = t.x + t.w >= W - 0.5 ? 1 : t.x <= 0.5 ? -1 : 0, dy = t.y + t.h >= H - 0.5 ? 1 : t.y <= 0.5 ? -1 : 0, lift = pawn * 0.28; // chetdan biroz tashqariga
    return { x: t.x + t.w / 2 + dx * (t.w / 2 + lift), y: t.y + t.h / 2 + dy * (t.h / 2 + lift), inward: (Math.atan2(-dy, -dx) * 180) / Math.PI, tx: dy !== 0 ? 1 : 0, ty: dy !== 0 ? 0 : 1 };
  };
  return (
    <View testID="board" {...({ dataSet: { circle } } as any)} style={{ padding: PAD }}>
      <View style={{ width: W, height: H }}>
        <View style={StyleSheet.absoluteFill} role="img" aria-label={`Taxta. ${players.map((p) => `${nameOf(room, p.id)}: ${p.pos}-katak${p.circle === "big" ? " (katta aylana)" : ""}`).join("; ")}`}>
          {tiles.map((t, pi) => {
            const i = (((pi - offset) % n) + n) % n; const L = lookOf(circle, i); const cq = curP ? at(curP) : null, here = !!cq && cq.circle === circle && cq.pos === i;
            const dream = circle === "big" && BIG_CELLS[i].t === "O" && players.some((p) => p.dreamIdx !== null && p.id === currentId); // istalgan «O» katagi orzu katagi (OPEN_QUESTIONS 156)
            const side = !t.corner && (pi >= g.cols && pi < g.cols + Math.ceil((n - 2 * g.cols) / 2) || pi >= 2 * g.cols + Math.ceil((n - 2 * g.cols) / 2));
            const small = side && !wide; // telefonda yon kataklar nozik: faqat ikonka
            return (
              <View key={pi} aria-hidden style={[s.tile, { left: t.x + 1, top: t.y + 1, width: t.w - 2, height: t.h - 2, backgroundColor: L.bg, borderColor: here ? color.navy : L.border, borderWidth: here ? 3 : 1, zIndex: here ? 2 : 0 }, dream && { borderStyle: "dashed", borderColor: "#A82F3E", borderWidth: 2 }]}>
                <Icon name={L.icon} size={small ? 12 : t.corner ? 22 : 18} color={L.fg} />
                {!small && (wide || t.corner === false) && t.w > 44 && labelSize(L.label, t.w) >= 8 && <Text style={[s.tileT, { color: L.fg, fontSize: labelSize(L.label, t.w) }]} numberOfLines={2}>{L.label}</Text>}
              </View>);
          })}
          {mixed && innerTiles.map((t, pi) => <View key={`b${pi}`} aria-hidden style={{ position: "absolute", left: inset + t.x + 1, top: inset + t.y + 1, width: t.w - 2, height: t.h - 2, borderRadius: 3, backgroundColor: color.line }} />)}
          {players.map((p, k) => {
            const pt = where(p); const ap = at(p), mates = players.filter((q) => at(q).circle === ap.circle && at(q).pos === ap.pos), gi = mates.findIndex((q) => q.id === p.id);
            const shift = mates.length > 1 ? (gi - (mates.length - 1) / 2) * pawn * 0.8 : 0; // bir katakdagi o'yinchilar chet bo'ylab yonma-yon
            return <Pawn key={p.id} x={pt.x + shift * pt.tx - pawn / 2} y={pt.y + shift * pt.ty - pawn / 2} size={pawn} hue={hue(p, k)} label={k + 1} isCur={p.id === currentId} inward={pt.inward} testID={`pawn-${k + 1}`} />;
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
/** O'yinchi belgisi: odam ikonkasi (rang + raqam nishoni — rangga tayanmaydi) va katak tomonga qaragan kichik strelka. Har bir katakka o'tishda sakraydi. */
function Pawn({ x, y, size, hue, label, isCur, testID, inward }: { x: number; y: number; size: number; hue: string; label: number; isCur: boolean; testID?: string; inward: number | null }) {
  const reduced = useReducedMotion(); const pos = useRef(new Animated.ValueXY({ x, y })).current; const hop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const d = stepMs(reduced);
    Animated.timing(pos, { toValue: { x, y }, duration: Math.round(d * 0.92), easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start();
    if (d > 0) { hop.setValue(0); Animated.sequence([Animated.timing(hop, { toValue: 1, duration: d * 0.45, easing: Easing.out(Easing.quad), useNativeDriver: false }), Animated.timing(hop, { toValue: 0, duration: d * 0.45, easing: Easing.in(Easing.quad), useNativeDriver: false })]).start(); }
  }, [x, y, reduced, pos, hop]);
  const fg = readableOn(hue), a = Math.max(8, Math.round(size * 0.34));
  return (
    <Animated.View aria-hidden testID={testID} style={{ position: "absolute", left: pos.x, top: pos.y, width: size, height: size, zIndex: isCur ? 6 : 4,
      transform: [{ translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.55] }) }, { scale: hop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }}>
      {inward !== null && <View style={{ position: "absolute", left: size / 2 - a / 2, top: size / 2 - a, width: 0, height: 0, borderTopWidth: a, borderBottomWidth: a, borderLeftWidth: a * 1.5, borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: isCur ? color.navy : hue,
        transform: [{ rotate: `${inward}deg` }, { translateX: size / 2 - 3 }] }} />}
      <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: hue, borderWidth: isCur ? 3 : 2, borderColor: isCur ? color.navy : "#fff",
        shadowColor: "#000", shadowOpacity: isCur ? 0.4 : 0.25, shadowRadius: isCur ? 6 : 3, shadowOffset: { width: 0, height: 1 } }}>
        <Icon name="person" size={Math.round(size * 0.62)} color={fg} stroke={2.2} fill={fg} />
      </View>
      <View style={{ position: "absolute", right: -size * 0.16, bottom: -size * 0.16, minWidth: Math.max(14, Math.round(size * 0.46)), height: Math.max(14, Math.round(size * 0.46)), borderRadius: size, backgroundColor: color.navy, alignItems: "center", justifyContent: "center", paddingHorizontal: 2, borderWidth: 1.5, borderColor: "#fff" }}>
        <Text style={{ color: "#fff", fontSize: Math.max(10, Math.round(size * 0.32)), fontWeight: "800", lineHeight: Math.max(12, Math.round(size * 0.4)) }}>{label}</Text>
      </View>
    </Animated.View>
  );
}
