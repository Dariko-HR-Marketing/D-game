import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { animationMs, useReducedMotion } from "../motion";
import { color, radius } from "../theme";
import { uz } from "../i18n/uz";
import { hasDom } from "./svg";
import { Dice3D } from "./Dice3D";

// Nuqtalar joyi (3×3 katak): 1..6
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

/** Kubik: veb — 3D (Dice3D), native — tekis yuz. 7+ (xayriyada 2 kubik yig'indisi) bo'lsa raqam ko'rsatiladi. `n` — har yangi tashlashda o'zgaradi (animatsiya uchun). */
export function Dice(props: { value: number | null; n?: number; size?: number }) { return hasDom ? <Dice3D {...props} /> : <FlatDice {...props} />; }
function FlatDice({ value, n, size = 64 }: { value: number | null; n?: number; size?: number }) {
  const reduced = useReducedMotion(); const a = useRef(new Animated.Value(1)).current;
  useEffect(() => { if (value === null) return; a.setValue(0); Animated.timing(a, { toValue: 1, duration: animationMs(reduced) * 1.6, useNativeDriver: true }).start(); }, [n, value, reduced, a]);
  const pad = size * 0.12, cell = Math.floor((size - 4 - pad * 2) / 3), dot = cell * 0.62; // 4 = ikki tomondagi ramka
  return (
    <Animated.View accessible accessibilityRole="image" accessibilityLabel={value === null ? uz.game.diceNone : `${uz.game.diceLabel}: ${value}`}
      style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: color.white, borderWidth: 2, borderColor: color.navy, padding: pad,
        transform: [{ rotate: a.interpolate({ inputRange: [0, 1], outputRange: ["-180deg", "0deg"] }) }, { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }], opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }}>
      {value !== null && value <= 6 ? (
        <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }} aria-hidden>
          {Array.from({ length: 9 }, (_, i) => (<View key={i} style={{ width: cell, height: cell, alignItems: "center", justifyContent: "center" }}>
            {PIPS[value].includes(i) && <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color.navy }} />}</View>))}
        </View>
      ) : (<View style={{ flex: 1, alignItems: "center", justifyContent: "center" }} aria-hidden><Text style={{ fontSize: size * 0.42, fontWeight: "800", color: color.navy }}>{value ?? "?"}</Text></View>)}
    </Animated.View>
  );
}
