import { uz } from "./i18n/uz";
import type { ChatMsg } from "./net/connection";

/** Xabar matni: erkin matn yoki tayyor ibora. Alohida fayl: sahifa chat oynasini (katta bo'lak) yuklamasdan ekran o'qish dasturi uchun matnni olsin. */
export const chatText = (m: ChatMsg) => (m.text ?? (m.phrase !== undefined ? uz.chat.phrases[m.phrase] ?? "" : ""));
