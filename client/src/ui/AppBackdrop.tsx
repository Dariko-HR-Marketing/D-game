import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View, useWindowDimensions } from "react-native";
import { color } from "../theme";
import { backdropKind } from "../backdropKind";

/** Ilova foni: matoviy (xiralashtirilgan, rangsizlantirilgan, sahifa rangi bilan 87 % aralashtirilgan) rasm — butun ekranni egallaydi, lekin o'yin elementlariga xalaqit bermaydi.
 *  Matoviylik rasmlarning o'ziga pishirilgan: eng qorong'i pikselda ham asosiy matn (#4A5B6C) kontrasti ≥ 4.7 (WCAG AA ≥ 4.5).
 *  Adaptiv: tik ekran (telefon, tik planshet) — `backdrop.jpg` (720×1280, butun portret); keng ekran (kompyuter, yotiq planshet/telefon) — `backdrop-wide.jpg` (1280×800, yuz markazida kesilgan), shunda rasm cho'zilib yoki «maydalashib» ketmaydi.
 *  Faqat ko'rsatilayotgan rasm yuklanadi. Veb'da «yuqori kontrast» (prefers-contrast: more) yoqilgan bo'lsa rasm ko'rsatilmaydi. Bosilmaydi va ekran o'qish dasturiga ko'rinmaydi. */
const PORTRAIT = require("../../assets/backdrop.jpg"), WIDE = require("../../assets/backdrop-wide.jpg");


function useHighContrast() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mm = (globalThis as any).matchMedia?.("(prefers-contrast: more)"); if (!mm) return;
    const f = () => setOn(!!mm.matches); f(); mm.addEventListener?.("change", f); return () => mm.removeEventListener?.("change", f);
  }, []);
  return on;
}

export function AppBackdrop() {
  const { width, height } = useWindowDimensions(), off = useHighContrast(), kind = backdropKind(width, height);
  return (
    <View style={s.fill} pointerEvents="none" aria-hidden importantForAccessibility="no-hide-descendants" testID="app-backdrop" data-kind={kind}>
      {!off && <Image source={kind === "wide" ? WIDE : PORTRAIT} resizeMode="cover" style={[s.fill, { width: "100%", height: "100%", objectPosition: kind === "wide" ? "50% 50%" : "50% 22%" } as any]} accessible={false} />}
    </View>
  );
}
const s = StyleSheet.create({ fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color.bg } });
