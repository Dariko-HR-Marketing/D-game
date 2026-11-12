import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Animated, Easing, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { useReducedMotion } from "../motion";
import { nameOf } from "../model";
import { uz } from "../i18n/uz";
import { color, font, radius, space } from "../theme";

const SHOW_MS = 5600, SHOW_REDUCED_MS = 4000;
const PALETTE = ["#F2B233", "#11835A", "#E0556B", "#2F80ED", "#9B51E0", "#FF8A3D", "#27C4C4"];
const rng = (seed: number) => { let x = (seed * 2654435761) >>> 0; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); };

type Piece = { side: "l" | "r" | "t"; y: number; x: number; w: number; h: number; c: string; delay: number; dur: number; spin: number; drift: number };
const makePieces = (id: number): Piece[] => { const r = rng(id + 7); return Array.from({ length: 84 }, (_, i) => ({ side: (["l", "r", "t"] as const)[i % 3], y: r(), x: r(), w: 6 + r() * 7, h: 9 + r() * 9, c: PALETTE[Math.floor(r() * PALETTE.length)], delay: r() * 900, dur: 2600 + r() * 2000, spin: (r() - 0.5) * 1440, drift: (r() - 0.5) * 140 })); };

function Confetti({ p, W, H }: { p: Piece; W: number; H: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(t, { toValue: 1, duration: p.dur, delay: p.delay, easing: Easing.out(Easing.quad), useNativeDriver: false }).start(); }, [t, p.dur, p.delay]);
  // chap/o'ng chetdan ichkariga otilib, so'ng pastga tushadi; tepadan to'kiladi
  const sx = p.side === "l" ? -16 : p.side === "r" ? W + 16 : p.x * W, sy = p.side === "t" ? -24 : H * (0.35 + p.y * 0.5);
  const ex = p.side === "l" ? W * (0.15 + p.x * 0.45) : p.side === "r" ? W * (0.4 + p.x * 0.45) : sx + p.drift, ey = H + 40;
  const x = t.interpolate({ inputRange: [0, 1], outputRange: [sx, ex] });
  const y = t.interpolate({ inputRange: [0, 0.35, 1], outputRange: [sy, p.side === "t" ? sy + H * 0.3 : sy - H * 0.32, ey] });
  const rot = t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.spin}deg`] });
  const op = t.interpolate({ inputRange: [0, 0.04, 0.85, 1], outputRange: [0, 1, 1, 0] });
  return <Animated.View style={{ position: "absolute", left: 0, top: 0, width: p.w, height: p.h, borderRadius: 2, backgroundColor: p.c, opacity: op, transform: [{ translateX: x }, { translateY: y }, { rotate: rot }] }} />;
}

function Balloon({ i, W, H }: { i: number; W: number; H: number }) {
  const t = useRef(new Animated.Value(0)).current, r = useMemo(() => rng(i * 31 + 5), [i]);
  const c = PALETTE[i % PALETTE.length], left = (0.06 + (i / 7) * 0.88) * W - 22, sway = (r() - 0.5) * 60, dur = 3600 + r() * 1800, delay = r() * 700;
  useEffect(() => { Animated.timing(t, { toValue: 1, duration: dur, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [t, dur, delay]);
  const y = t.interpolate({ inputRange: [0, 1], outputRange: [H + 20, -120] }), x = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, sway, -sway / 2] });
  const op = t.interpolate({ inputRange: [0, 0.05, 0.9, 1], outputRange: [0, 1, 1, 0] });
  return (
    <Animated.View style={{ position: "absolute", left, top: 0, alignItems: "center", opacity: op, transform: [{ translateY: y }, { translateX: x }] }}>
      <View style={{ width: 44, height: 54, borderRadius: 27, backgroundColor: c, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}><View style={{ position: "absolute", top: 9, left: 11, width: 8, height: 14, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.45)" }} /></View>
      <View style={{ width: 8, height: 8, backgroundColor: c, transform: [{ rotate: "45deg" }], marginTop: -2 }} /><View style={{ width: 1.5, height: 46, backgroundColor: "rgba(8,34,56,0.35)" }} />
    </Animated.View>);
}

function Horn({ side, reduced }: { side: "l" | "r"; reduced: boolean }) {
  const t = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => { if (!reduced) Animated.spring(t, { toValue: 1, friction: 4, tension: 90, useNativeDriver: false }).start(); }, [t, reduced]);
  return <Animated.Text aria-hidden style={{ position: "absolute", bottom: 8, [side === "l" ? "left" : "right"]: 8, fontSize: 64, transform: [{ scale: t }, { scaleX: side === "r" ? -1 : 1 }, { rotate: side === "l" ? "-8deg" : "8deg" }] } as any}>🎉</Animated.Text>;
}

/** Farzand tug'ildi (suyunchi taklifi paydo bo'ldi): butun ekranda hammaga ko'rinadigan bayram: konfeti chap, o'ng va tepadan, sharlar, surnaychalar, kimga tug'ilgani katta yozuvda.
 *  O'yinni to'smaydi (bosishlar o'tadi), o'zi yo'qoladi; «harakatni kamaytirish» yoqilgan bo'lsa faqat tinch yozuv. */
export function BirthLayer({ room, userId }: { room: any; userId: string }) {
  const reduced = useReducedMotion(), { width: W, height: H } = useWindowDimensions();
  const seen = useRef<Set<number> | null>(null), [queue, setQueue] = useState<{ id: number; parent: string }[]>([]), [cur, setCur] = useState<{ id: number; parent: string } | null>(null);
  const babies: { id: number; parent: string }[] = (room?.state?.proposals ?? []).filter((x: any) => x.kind === "suyunchi").map((x: any) => ({ id: x.id, parent: x.parent }));
  const key = babies.map((b) => b.id).join(",");
  useEffect(() => { // birinchi holat (ulanish/qayta ulanish): eski takliflar uchun bayram yo'q
    if (seen.current === null) { seen.current = new Set(babies.map((b) => b.id)); return; }
    const fresh = babies.filter((b) => !seen.current!.has(b.id)); if (!fresh.length) return;
    fresh.forEach((b) => seen.current!.add(b.id)); setQueue((q) => [...q, ...fresh]);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!cur && queue.length) { setCur(queue[0]); setQueue((q) => q.slice(1)); } }, [cur, queue]);
  useEffect(() => { if (!cur) return; const h = setTimeout(() => setCur(null), reduced ? SHOW_REDUCED_MS : SHOW_MS); return () => clearTimeout(h); }, [cur, reduced]);
  const pieces = useMemo(() => (cur ? makePieces(cur.id) : []), [cur?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!cur) return null;
  const mine = cur.parent === userId, name = nameOf(room, cur.parent);
  return (
    <View pointerEvents="box-none" style={s.layer} testID="birth-layer">
      <View role="status" accessibilityLiveRegion="assertive" style={s.sr}><Text>{uz.birth.spoken.replace("{name}", name)}</Text></View>
      {!reduced && <View pointerEvents="none" style={StyleSheet.absoluteFill} aria-hidden>
        {pieces.map((p, i) => <Confetti key={`${cur.id}-${i}`} p={p} W={W} H={H} />)}
        {Array.from({ length: 7 }, (_, i) => <Balloon key={`b${cur.id}-${i}`} i={i} W={W} H={H} />)}
        <Horn side="l" reduced={reduced} /><Horn side="r" reduced={reduced} />
      </View>}
      <Pressable accessibilityRole="button" accessibilityLabel={uz.birth.close} onPress={() => setCur(null)} style={s.card} testID="birth-card">
        <Text style={s.kicker}>{uz.birth.title}</Text>
        <Text style={s.name} numberOfLines={2} adjustsFontSizeToFit>{mine ? uz.birth.you : uz.birth.who.replace("{name}", name)}</Text>
        <Text style={s.sub}>{uz.birth.sub}</Text>
      </Pressable>
    </View>);
}
const s = StyleSheet.create({
  layer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 95, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  sr: { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0 },
  card: { maxWidth: 520, width: "86%", minHeight: 44, alignItems: "center", gap: space.sm, paddingVertical: space.lg, paddingHorizontal: space.lg, borderRadius: radius.xl, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 3, borderColor: color.gold, shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  kicker: { fontSize: font.xxl, fontWeight: "900", color: color.green, letterSpacing: 1, textTransform: "uppercase" },
  name: { fontSize: 38, lineHeight: 44, fontWeight: "900", color: color.navy, textAlign: "center" },
  sub: { fontSize: font.md, fontWeight: "700", color: color.text2, textAlign: "center" },
});
