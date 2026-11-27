import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { color } from "../theme";

/** Ilova foni: matoviy (xiralashtirilgan, rangsizlantirilgan, sahifa rangi bilan 87% aralashtirilgan) rasm — butun ekranni egallaydi, lekin o'yin elementlariga xalaqit bermaydi.
 *  Matoviylik rasmning o'ziga pishirilgan (`assets/backdrop.jpg`): eng qorong'i pikselda ham asosiy matn (#4A5B6C) kontrasti ≥ 4.5 (WCAG AA). Bosilmaydi va ekran o'qish dasturiga ko'rinmaydi. */
export function AppBackdrop() {
  return (
    <View style={s.fill} pointerEvents="none" aria-hidden importantForAccessibility="no-hide-descendants" testID="app-backdrop">
      <Image source={require("../../assets/backdrop.jpg")} resizeMode="cover" style={[s.fill, { width: "100%", height: "100%", objectPosition: "50% 22%" } as any]} accessible={false} />
    </View>
  );
}
const s = StyleSheet.create({ fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color.bg } });
