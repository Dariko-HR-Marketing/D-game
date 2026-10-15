import React from "react";
import { View, Text } from "react-native";
import { color, PLAYER_COLORS } from "../theme";

/** Belgi: taxta halqasi (kataklar o'yinchi ranglarida) ichida «P». Faqat bezak — ekran o'qish dasturlariga ko'rinmaydi. */
export function Logo({ size = 80 }: { size?: number }) {
  const n = 16, r = size * 0.38, dot = size * 0.13;
  return (
    <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      {Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * Math.PI - Math.PI / 2;
        return <View key={i} style={{ position: "absolute", width: dot, height: dot, borderRadius: dot * 0.3, left: size / 2 + r * Math.cos(a) - dot / 2, top: size / 2 + r * Math.sin(a) - dot / 2, backgroundColor: PLAYER_COLORS[i % 6], opacity: 0.95 }} />; })}
      <View style={{ position: "absolute", left: size * 0.26, top: size * 0.26, width: size * 0.48, height: size * 0.48, borderRadius: size * 0.24, backgroundColor: color.navy, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: color.white, fontWeight: "800", fontSize: size * 0.26 }}>P</Text></View>
    </View>
  );
}
