// RN-web: DOM <svg> elementlari. Telefon ilovasi (native) uchun react-native-svg ga almashtiriladi — hozircha faqat veb eksport qilinadi.
import React from "react";
import { Platform } from "react-native";

export const hasDom = Platform.OS === "web";
export const h = (tag: string, props: Record<string, unknown> | null, ...kids: React.ReactNode[]) => React.createElement(tag as any, props, ...kids);
