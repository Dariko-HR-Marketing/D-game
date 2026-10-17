// §10: dizayn tizimi. Tugma balandligi ≥ 44 px (WCAG 2.2 AA).
export const color = { navy: "#082238", green: "#11835A", gold: "#F2B233", red: "#9E2A30", bg: "#F4F7F8", line: "#DCE3E8", text2: "#4A5B6C", white: "#FFFFFF" };
// §10 yashili (#11835A) oq fonda ≥ 4.5, lekin #F4F7F8 fonda 4.42 — kichik matn uchun biroz to'qroq variant (AA talabi §10 ham bor).
export const GREEN_TEXT = "#0E6B4A";
export const MIN_TAP = 44;
/** O'yin sarlavhasi balandligi: xabarlar (CardToast) undan pastda chiqadi, shunda «Qoidalar» va xona kodi tugmalari to'silmaydi. */
export const HEADER_H = 56;
export const PLAYER_COLORS = ["#11835A", "#F2B233", "#9E2A30", "#2C6DB5", "#7B4FA3", "#E07A2F"]; // 6 ta fishka rangi

/** Bo'shliq shkalasi (4 px asosida), burchak va soyalar — barcha ekranlarda bir xil. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const font = { xs: 12, sm: 13, md: 15, lg: 17, xl: 20, xxl: 28, display: 40 } as const;
export const shadow = { shadowColor: "#082238", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 } as const;
/** Ma'no ranglari: yaxshi (yashil), yomon (qizil), diqqat (oltin). Matn uchun kontrasti AA bo'lgan variantlar. */
export const tone = { good: GREEN_TEXT, bad: color.red, warn: "#8A5A00", neutral: color.navy, muted: color.text2 } as const;
export const surface = { good: "#E7F4EE", bad: "#F8E8E9", warn: "#FFF6DD", info: "#E8F0F8", plain: color.white } as const;
