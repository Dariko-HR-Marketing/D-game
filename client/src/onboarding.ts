import { tourKV } from "./ui/tourStore";

/** Majburiy o'quv o'yini (buyurtmachi qarori 2026-11-18): yangi o'yinchi (hali bitta o'yin tugatmagan) avval o'quv o'yinini o'tadi, shundan keyin oddiy o'yinlar ochiladi.
 *  Server o'yinlar sonini (games) beradi; o'quv o'yini tugagach qurilmada ham belgi qo'yiladi: tugallanmagan natija o'yinchini abadiy qamab qo'ymasin. */
const KEY = "tajriba24-tutorial-done";
export const tutorialDone = (): boolean => tourKV.get(KEY) === "1";
export const markTutorialDone = () => tourKV.set(KEY, "1");
/** BEKOR QILINDI (buyurtmachi, 2026-11-26): alohida majburiy onboarding yo'q. Yangi o'yinchi to'g'ridan-to'g'ri o'ynaydi; yo'riqnomalar sahifa/o'yin doskasi
 *  birinchi ochilganda har bir o'yinchiga o'zi uchun (faqat shu qurilmada, serverga va boshqa o'yinchilarga ta'sirsiz) ko'rsatiladi (`Tour`, `tours.ts`). */
export const needsTutorial = (_me: { games: number } | null | undefined): boolean => false;
