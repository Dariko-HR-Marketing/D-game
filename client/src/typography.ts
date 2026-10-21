// UX V2 (B13): Manrope 400/700/800 hamma matnga ulanadi; veb uchun global fokus halqasi. `fontWeight` o'rniga mos shrift oilasi tanlanadi (soxta qalinlik yo'q).
import React from "react";
import { Platform, StyleSheet, Text, TextInput } from "react-native";
import { FOCUS } from "./theme";

const FAMILY = { regular: "Manrope_400Regular", bold: "Manrope_700Bold", heavy: "Manrope_800ExtraBold" } as const;
/** CSS qalinligidan yuklangan shrift oilasiga: 800+ — ExtraBold, 600–799 — Bold, qolgani — Regular. */
export function familyFor(weight: unknown): string {
  const n = weight === "bold" ? 700 : weight === "normal" || weight === undefined || weight === null ? 400 : Number(weight) || 400;
  return n >= 800 ? FAMILY.heavy : n >= 600 ? FAMILY.bold : FAMILY.regular;
}

let done = false;
export function installTypography() {
  if (done) return; done = true;
  for (const C of [Text, TextInput] as any[]) {
    const render = C.render; if (typeof render !== "function") continue;
    C.render = function (props: any, ref: any) {
      const flat = StyleSheet.flatten(props?.style) ?? {};
      if (flat.fontFamily) return render.call(this, props, ref); // oila aniq berilgan (masalan, Dice3D «inherit»)
      return render.call(this, { ...props, style: [props?.style, { fontFamily: familyFor(flat.fontWeight), fontWeight: "normal" }] }, ref);
    };
  }
  if (Platform.OS === "web" && typeof document !== "undefined" && !document.getElementById("poyga-theme")) {
    const st = document.createElement("style"); st.id = "poyga-theme";
    st.textContent = `:focus-visible{outline:${FOCUS.width}px solid ${FOCUS.color} !important;outline-offset:${FOCUS.offset}px !important}`;
    document.head.appendChild(st);
  }
}
