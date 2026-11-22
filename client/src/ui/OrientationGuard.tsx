import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { uz } from "../i18n/uz";
import { color, font, space } from "../theme";

/** Telefon (sensorli, kichik ekran) hozir yotiq holatdami? Qurilma yo'nalishi bo'yicha (klaviatura oynani qisqartirsa ham yolg'on ishlamaydi). Planshet va kompyuter — yo'q. */
export function phoneLandscape(g: any = globalThis as any): boolean {
  try {
    const scr = g.screen, w = g.window ?? g; if (!scr) return false;
    const coarse = !!w.matchMedia?.("(pointer: coarse)").matches; const shortSide = Math.min(scr.width ?? 9999, scr.height ?? 9999);
    if (!coarse || shortSide >= 600) return false;
    const wide = (w.innerWidth ?? 0) > (w.innerHeight ?? 0); // klaviatura tik holatda oynani qisqartirsa ham, qurilma yo'nalishi tik bo'lsa yotiq hisoblanmaydi (ikkalasi ham shart)
    const t = scr.orientation?.type; if (typeof t === "string") return t.startsWith("landscape") && wide;
    if (typeof w.orientation === "number") return Math.abs(w.orientation) === 90 && wide;
    return wide;
  } catch { return false; }
}

/** Qat'iy qoida (buyurtmachi, 2026-11-22): telefonda o'yin faqat tik (portret) holatda. Brauzer ruxsat bersa yo'nalish qulflanadi; bo'lmasa yotiq holatda
 *  butun ekranni to'sadigan «Telefonni tik tuting» ko'rsatmasi chiqadi va o'yin yotiq ko'rinishga o'tmaydi (holat saqlanadi, tik tutilganda davom etadi). */
export function OrientationGuard({ children }: { children: React.ReactNode }) {
  const [land, setLand] = useState(() => phoneLandscape());
  useEffect(() => {
    const g: any = globalThis; const w: any = g.window; if (!w?.addEventListener) return;
    const upd = () => setLand(phoneLandscape());
    try { if (phoneLandscape() || w.matchMedia?.("(pointer: coarse)").matches) void g.screen?.orientation?.lock?.("portrait")?.catch?.(() => {}); } catch { /* qulflash faqat to'liq ekran/o'rnatilgan ilovada mumkin */ }
    w.addEventListener("resize", upd); w.addEventListener("orientationchange", upd); g.screen?.orientation?.addEventListener?.("change", upd); upd();
    return () => { w.removeEventListener("resize", upd); w.removeEventListener("orientationchange", upd); g.screen?.orientation?.removeEventListener?.("change", upd); };
  }, []);
  return (<>{children}{land && (
    <View style={s.layer} role="alertdialog" aria-modal aria-label={uz.orient.title} testID="orient-guard">
      <View style={s.phone} aria-hidden><View style={s.body}><View style={s.notch} /></View></View>
      <Text style={s.t} aria-level={1} role="heading">{uz.orient.title}</Text>
      <Text style={s.p}>{uz.orient.text}</Text>
    </View>)}</>);
}
const s = StyleSheet.create({
  layer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: "#08263E", alignItems: "center", justifyContent: "center", gap: space.md, padding: space.xl, flexDirection: "column" } as any,
  phone: { width: 72, height: 72, borderRadius: 20, backgroundColor: "#11835A", alignItems: "center", justifyContent: "center" },
  body: { width: 26, height: 46, borderRadius: 7, borderWidth: 3, borderColor: "#fff", alignItems: "center" }, notch: { width: 8, height: 3, borderRadius: 2, backgroundColor: "#fff", marginTop: 3 },
  t: { color: "#fff", fontSize: font.xl, fontWeight: "800", textAlign: "center" }, p: { color: "#C6D3DC", fontSize: font.md, textAlign: "center", maxWidth: 420, lineHeight: 22 },
});
