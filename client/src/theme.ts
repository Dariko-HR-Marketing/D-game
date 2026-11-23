// §10: dizayn tizimi. Tugma balandligi ≥ 44 px (WCAG 2.2 AA).
export const color = { navy: "#08263E", green: "#11835A", gold: "#F2B233", red: "#9E2A30", bg: "#F4F7F8", line: "#DCE3E8", text2: "#4A5B6C", white: "#FFFFFF" };
// §10 yashili (#11835A) oq fonda ≥ 4.5, lekin #F4F7F8 fonda 4.42 — kichik matn uchun biroz to'qroq variant (AA talabi §10 ham bor).
export const GREEN_TEXT = "#0E6B4A";
export const MIN_TAP = 44;
/** UX V2 (B13): asosiy tugma balandligi 52 px (bosish maydoni ≥ 44), fokus halqasi 2 px yashil + 2 px tashqi oraliq. */
export const CTA_H = 52;
export const FOCUS = { color: "#11835A", width: 2, offset: 2 } as const;
/** O'yin sarlavhasi balandligi: xabarlar (CardToast) undan pastda chiqadi, shunda «Qoidalar» va xona kodi tugmalari to'silmaydi. */
export const HEADER_H = 56;
export const PLAYER_COLORS = ["#11835A", "#F2B233", "#9E2A30", "#2C6DB5", "#7B4FA3", "#E07A2F", "#0E8FA0", "#C44E8A"]; // 8 ta fishka rangi (2–8 o'yinchi); fishkada raqam ham bor — rang yagona belgi emas

/** Bo'shliq shkalasi (4 px asosida), burchak va soyalar — barcha ekranlarda bir xil. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
/** Burchak: tugma 10, panel 16 (lg), karta 20 (xl). */
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;
export const font = { xs: 12, sm: 13, md: 15, lg: 17, xl: 20, xxl: 28, display: 40 } as const;
export const shadow = { shadowColor: "#08263E", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 } as const;
/** Ma'no ranglari: yaxshi (yashil), yomon (qizil), diqqat (oltin). Matn uchun kontrasti AA bo'lgan variantlar. */
export const tone = { good: GREEN_TEXT, bad: color.red, warn: "#8A5A00", neutral: color.navy, muted: color.text2 } as const;
export const surface = { good: "#E7F4EE", bad: "#F8E8E9", warn: "#FFF6DD", info: "#E8F0F8", plain: color.white } as const;

/** Kirish sahifasi (qorong'i ko'rinish, prototip bo'yicha). Matn juftliklari WCAG AA: asosiy ≥ 15:1, ikkinchi darajali ≥ 8:1, chegara ≥ 3:1. */
/** Kirish/ro'yxat (och, landing bilan bir xil uslub). Kontrast: matn #08263E/#F7FBF9 ≥ 14:1, yashil tugma #11835A/oq ≥ 4.5:1, maydon chegarasi #7C8FA0 ≥ 3:1. */
export const authUi = { bg: "#F7FBF9", panel: "#FFFFFF", brand: "#EAF8F1", line: "#7C8FA0", lineSoft: "#E1EBE6", text: "#08263E", muted: "#4A5E70", placeholder: "#6B7C8C", accent: "#0A6B49", ring: "#11835A", glow: "rgba(17,131,90,0.10)" } as const;
export const night = { bg: "#07131C", panel: "#0F1B26", brand: "#0B2620", line: "#5B7388", lineSoft: "#1F2F3D", text: "#F1F5F9", muted: "#B4C2CE", placeholder: "#8FA3B5", accent: "#34D399", ring: "#6EE7B7", glow: "rgba(16,185,129,0.14)" } as const;
