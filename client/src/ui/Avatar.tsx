import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { avatarUrl } from "../net/avatarBase";
import { h, hasDom } from "./svg";
import { PLAYER_COLORS } from "../theme";

const SKIN = ["#E9B98F", "#F1C7A5", "#D9A47A", "#EBC09C", "#C98F63"];
const HAIR = ["#2B1D14", "#4A2A1A", "#1B1B1B", "#1F140E", "#6B4423"];
const BG = ["#E3EEF6", "#F7E6EC", "#E6F1E8", "#F5EEDC", "#ECE6F5"];
const hash = (s: string) => { let x = 7; for (const c of s) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };

/** Foydalanuvchi belgisi: ismdan deterministik chizilgan sodda portret; yuqorida daraja nishoni, pastda onlayn/oflayn nuqtasi.
 *  Jins ixtiyoriy (profilda): berilsa soch uslubi shunga qarab (ayol — uzun), berilmasa ismdan tanlanadi. Ma'no matnda (aria-label tashqarida beriladi). */
export function Avatar({ name, colorIdx = 0, level, online, size = 40, frame, bgColor, photo, gender }: { gender?: "m" | "f" | null; name: string; colorIdx?: number; level?: number; online?: boolean; size?: number; frame?: string; bgColor?: string; photo?: string }) {
  const url = avatarUrl(photo); const [bad, setBad] = useState(false); useEffect(() => setBad(false), [url]);
  const k = hash(name || "?"), skin = SKIN[k % 5], hair = HAIR[(k >> 3) % 5], bg = bgColor ?? BG[(k >> 5) % 5], long = gender ? gender === "f" : ((k >> 7) & 1) === 1, shirt = PLAYER_COLORS[colorIdx % 6];
  const badge = Math.max(14, size * 0.4), dot = Math.max(8, size * 0.25);
  return (
    <View aria-hidden style={[{ width: size, height: size }, frame ? { borderRadius: size / 2, borderWidth: 3, borderColor: frame, boxSizing: "content-box" as any } : null]}>
      {url && !bad ? <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#E6ECEF" }} resizeMode="cover" onError={() => setBad(true)} accessible={false} /> : hasDom && h("svg", { viewBox: "0 0 40 40", width: size, height: size, style: { display: "block", borderRadius: size / 2 } },
        h("rect", { width: 40, height: 40, fill: bg }), long && h("path", { d: "M9.5 33c-.5-12 2-24 10.5-24S31 21 30.5 33z", fill: hair }),
        h("path", { d: "M5 41c1.6-8.4 7.6-12 15-12s13.4 3.6 15 12z", fill: shirt }), h("rect", { x: 17, y: 23, width: 6, height: 7, rx: 2.5, fill: skin }), h("circle", { cx: 20, cy: 17.5, r: 7.8, fill: skin }),
        h("path", { d: long ? "M12.2 17.5c.6-5.6 3.9-8.6 7.8-8.6s7.4 3 7.8 8.6c-2.6-2.2-5-3.4-8.6-3.6-2.6.9-4.9 2-7 3.6z" : "M11.8 17c-.2-5.8 3.4-8.8 8.2-8.8s8.6 3 8.2 8.8c-1-2.6-2.8-3.8-8.2-3.8s-7.2 1.2-8.2 3.8z", fill: hair }))}
      {level !== undefined && <View style={[s.badge, { minWidth: badge, height: badge, borderRadius: badge / 2 }]}><Text style={[s.badgeT, { fontSize: Math.max(9, badge * 0.55) }]}>{level}</Text></View>}
      {online !== undefined && <View style={[s.dot, { width: dot, height: dot, borderRadius: dot / 2, backgroundColor: online ? "#22A559" : "#E5484D" }]} />}
    </View>
  );
}
const s = StyleSheet.create({
  badge: { position: "absolute", left: -3, top: -3, paddingHorizontal: 3, backgroundColor: "#F5B82E", borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  badgeT: { color: "#2B1D00", fontWeight: "800" },
  dot: { position: "absolute", right: -1, bottom: -1, borderWidth: 2, borderColor: "#fff" },
});
