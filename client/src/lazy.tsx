import React, { Suspense } from "react";
import { ActivityIndicator, View } from "react-native";
import { color } from "./theme";

/** Kamdan-kam ochiladigan ekranlar alohida bo'lak (chunk) bo'lib yuklanadi: birinchi ochilish tezroq, mobil trafik kam. */
export function lazyNamed<M extends Record<string, any>, K extends keyof M>(load: () => Promise<M>, name: K): M[K] {
  return React.lazy(() => load().then((m) => ({ default: m[name] as React.ComponentType<any> }))) as unknown as M[K];
}

export const Busy = ({ fill = true }: { fill?: boolean }) => (
  <View style={fill ? { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 160 } : { alignItems: "center", padding: 16 }} role="status" aria-busy aria-label="Yuklanmoqda">
    <ActivityIndicator color={color.navy} />
  </View>);

export const Later = ({ children, fill = true }: { children: React.ReactNode; fill?: boolean }) => <Suspense fallback={<Busy fill={fill} />}>{children}</Suspense>;

/** Oyna (modal) bo'lagi yuklanguncha ekran o'rtasida kichik aylanuvchi belgi; sahifa maketini siljitmaydi. */
export const LaterOverlay = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", zIndex: 90 }} role="status" aria-busy aria-label="Yuklanmoqda"><ActivityIndicator color={color.navy} /></View>}>{children}</Suspense>);
