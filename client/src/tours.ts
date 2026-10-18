// Sahifa yo'riqnomalari (onboarding): har bir sahifa uchun alohida, foydalanuvchiga BIR MARTA ko'rsatiladi. Sof mantiq (testlanadi).
export const TOUR_IDS = ["home", "lobby", "dreams", "game-small", "game-big", "result", "profile", "leaderboard", "shop", "class", "tournaments"] as const;
export type TourId = (typeof TOUR_IDS)[number];
export interface KV { get(k: string): string | null; set(k: string, v: string | null): void }
export const OFF_KEY = "poyga-tours-off"; // «1» bo'lsa yo'riqnomalar o'chirilgan (sinov skriptlari va foydalanuvchi sozlamasi)
export const tourKey = (id: TourId) => `poyga-tour-${id}-v2`;
export const shouldShowTour = (kv: KV, id: TourId) => kv.get(OFF_KEY) !== "1" && kv.get(tourKey(id)) !== "1";
export const markTourSeen = (kv: KV, id: TourId) => kv.set(tourKey(id), "1");
/** Hamma yo'riqnomani qayta ko'rsatish (Profil → «Yo'riqnomani qayta ko'rsatish»). */
export const resetTours = (kv: KV) => { for (const id of TOUR_IDS) kv.set(tourKey(id), null); kv.set(OFF_KEY, null); };
/** O'yin yo'riqnomasi: o'yinchi qaysi aylanada bo'lsa, shu aylana uchun alohida (katta aylana — o'z yo'riqnomasi). */
export const gameTourId = (circle: string | undefined): TourId => (circle === "big" ? "game-big" : "game-small");
