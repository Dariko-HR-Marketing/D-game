import React from "react";
import { Image, Platform, View } from "react-native";
import { uz } from "../i18n/uz";

/** Tajriba24 brend logotipi (docs/BRAND.md, «Brend qo'llanmasi»). `full` — D belgisi + yashil tire + tajriba24; `mark` — faqat D emblemasi.
 *  `tone`: «light» — och fon uchun to'q ko'k yozuv; «dark» — to'q fon uchun oq yozuv. Shaklni cho'zmang, fonga mos rangdagi variantni ishlating.
 *  Veb: SVG (`public/brand`); ilova: PNG (`assets/brand`). Balandlik beriladi, kenglik nisbat bo'yicha. */
const RATIO = { full: 1549 / 449, mark: 1 } as const;
const FILE = { full: { light: "Tajriba24_Asosiy_och", dark: "Tajriba24_Asosiy_toq" }, mark: { light: "Tajriba24_Emblema_och", dark: "Tajriba24_Emblema_toq" } } as const;
const NATIVE = {
  full: { light: require("../../assets/brand/Tajriba24_Asosiy_och.png"), dark: require("../../assets/brand/Tajriba24_Asosiy_toq.png") },
  mark: { light: require("../../assets/brand/Tajriba24_Emblema_och.png"), dark: require("../../assets/brand/Tajriba24_Emblema_toq.png") },
} as const;
export function Logo({ height = 32, variant = "full", tone = "light", label = true }: { height?: number; variant?: "full" | "mark"; tone?: "light" | "dark"; label?: boolean }) {
  const source = Platform.OS === "web" ? { uri: `/brand/${FILE[variant][tone]}.svg` } : NATIVE[variant][tone];
  const style = { width: Math.round(height * RATIO[variant]), height };
  return label
    ? <Image source={source} style={style} resizeMode="contain" accessibilityLabel={uz.app.name} role="img" testID="brand-logo" />
    : <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Image source={source} style={style} resizeMode="contain" /></View>;
}
