import React, { useEffect, useRef, useState } from "react";
import { View, Image, Animated, Easing, StyleSheet } from "react-native";
import { useReducedMotion } from "../motion";
import { cardImageUrl, CARD_IMAGES_BASE } from "../cardImage";
import { radius, color } from "../theme";

/**
 * Kartaning ASL rasmi (§2.5: ilova kartani qayta chizmaydi): kesilmaydi (`contain`), tabiiy nisbatda, ustiga yozuv qo'yilmaydi.
 * Ochilganda ≈ 0.4 s aylanib chiqadi («harakatni kamaytirish»da — darrov). Rasm yo'q yoki yuklanmasa `onState(false)` — ota matnni ko'rsatadi.
 */
export function CardFace({ file, label, maxH, onState }: { file?: string; label: string; maxH: number; onState?: (ok: boolean) => void }) {
  const url = cardImageUrl(CARD_IMAGES_BASE, file); const [ok, setOk] = useState(false); const [ratio, setRatio] = useState(0.72); const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => { setOk(false); onState?.(false); }, [url]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!ok) return; if (reduced) { v.setValue(1); return; } v.setValue(0); Animated.timing(v, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [ok, reduced, v]);
  if (!url) return null;
  return (
    <Animated.View style={[s.frame, { opacity: ok ? v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }) : 0, height: ok ? undefined : 0,
      transform: [{ perspective: 1000 }, { rotateY: v.interpolate({ inputRange: [0, 1], outputRange: ["-78deg", "0deg"] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
      <Image source={{ uri: url }} accessibilityLabel={label} resizeMode="contain" style={{ height: maxH, aspectRatio: ratio, maxWidth: "100%" }}
        onLoad={(e: any) => { const w = e?.nativeEvent?.source?.width ?? e?.nativeEvent?.width, h = e?.nativeEvent?.source?.height ?? e?.nativeEvent?.height; if (w && h) setRatio(w / h); setOk(true); onState?.(true); }}
        onError={() => { setOk(false); onState?.(false); }} />
    </Animated.View>
  );
}
const s = StyleSheet.create({
  frame: { alignSelf: "center", borderRadius: radius.lg, overflow: "hidden", backgroundColor: color.white, borderWidth: 1, borderColor: "#DCE3E8", shadowColor: "#082238", shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8, maxWidth: "100%" },
});
