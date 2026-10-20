import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { uz } from "../i18n/uz";
import { color, font, HEADER_H, radius, space, tone, surface } from "../theme";
import type { ConnState } from "../net/connection";

const RESTORED_MS = 2600, MIN_DOWN_MS = 1200;
/** Aloqa holati: uzilgan/ilovadan qaytilgan paytda «Aloqa uzildi. Qayta ulanmoqda…», holat qaytgach qisqa «Aloqa tiklandi». Ekranning tepasida, hamma sahifada bir xil. */
export function ConnBanner({ st }: { st: Pick<ConnState, "status" | "lost" | "restoredAt"> }) {
  const down = st.lost || st.status === "offline";
  const [phase, setPhase] = useState<"none" | "down" | "ok">(down ? "down" : "none"); const since = useRef(down ? Date.now() : 0);
  useEffect(() => {
    if (down) { if (phase !== "down") { since.current = Date.now(); setPhase("down"); } return; }
    if (phase !== "down") return;
    // Qisqa uzilish ham ko'rinsin (yaltirab o'tib ketmasin): «uzildi» kamida MIN_DOWN_MS turadi, so'ng «tiklandi»
    const h = setTimeout(() => setPhase("ok"), Math.max(0, MIN_DOWN_MS - (Date.now() - since.current))); return () => clearTimeout(h);
  }, [down, phase]);
  useEffect(() => { if (phase !== "ok") return; const h = setTimeout(() => setPhase("none"), RESTORED_MS); return () => clearTimeout(h); }, [phase]);
  if (phase === "none") return null;
  const bad = phase === "down";
  return (
    <View pointerEvents="none" style={s.wrap} testID="conn-banner">
      <View style={[s.pill, bad ? s.down : s.ok]} role={bad ? "alert" : "status"} accessibilityLiveRegion={bad ? "assertive" : "polite"}>
        <View style={[s.dot, { backgroundColor: bad ? tone.bad : tone.good }]} aria-hidden />
        <Text style={[s.t, { color: bad ? tone.bad : tone.good }]}>{bad ? uz.conn.lost : uz.conn.restored}</Text>
      </View>
    </View>);
}
const s = StyleSheet.create({
  wrap: { position: "absolute", top: 4, left: space.md, right: space.md, alignItems: "center", zIndex: 95, height: HEADER_H - 8, justifyContent: "center" },
  pill: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, minHeight: 40, borderRadius: radius.pill, borderWidth: 2, maxWidth: 560, shadowColor: "#082238", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  down: { backgroundColor: surface.bad, borderColor: tone.bad }, ok: { backgroundColor: surface.good, borderColor: tone.good },
  dot: { width: 10, height: 10, borderRadius: 5 }, t: { fontSize: font.md, fontWeight: "800" },
});
void color;
