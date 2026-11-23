import React from "react";
import { Image, Platform, View } from "react-native";
import { uz } from "../i18n/uz";

/** Moliyaviy savodxonlik kollaji (yoshlar, hisob-kitob, algoritm, grafik, biznes): original vektor rasm `public/art/learn.svg` (veb), ilovada PNG. Nisbat 5:4. */
const NATIVE = require("../../assets/art/learn.png");
export function LearnArt({ width, radius = 28 }: { width: number; radius?: number }) {
  const source = Platform.OS === "web" ? { uri: "/art/learn.svg" } : NATIVE;
  return (<View style={{ width, height: Math.round(width * 0.8), borderRadius: radius, overflow: "hidden" }} testID="learn-art">
    <Image source={source} style={{ width, height: Math.round(width * 0.8) }} resizeMode="cover" accessibilityLabel={uz.landing.artLabel} role="img" />
  </View>);
}
