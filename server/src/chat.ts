// Xona chati: erkin matn (16 yoshgacha va ota-ona o'chirgan bolalar uchun yopiq — SPEC §2.8) va tayyor iboralar (hamma uchun).
// Matnlar mijozda (uz.ts); serverda faqat tayyor ibora tartib raqami tekshiriladi. Xabarlar xotirada (so'nggilari), bazaga yozilmaydi.
export const PHRASES = 12; // tayyor iboralar soni (0…PHRASES-1); matnlari mijozda
export const CHAT_MAX = 200; // erkin matn uzunligi chegarasi (belgi)
export const CHAT_KEEP = 100; // xonada saqlanadigan so'nggi xabarlar
export interface ChatMsg { id: number; from: string; at: number; text?: string; phrase?: number }

/** Matnni tozalaydi: boshqaruv belgilari olib tashlanadi, bo'shliqlar bittaga keltiriladi; bo'sh yoki juda uzun bo'lsa `null`. */
export function cleanText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.normalize("NFC").replace(/[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁠-⁤﻿]/g, " ").replace(/\s+/g, " ").trim();
  return t.length >= 1 && t.length <= CHAT_MAX ? t : null;
}
