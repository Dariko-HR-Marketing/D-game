/** §10: karta ochilishi ≈ 240 ms; «harakatni kamaytirish» yoqilgan bo'lsa — animatsiyasiz. (React Native'siz: testlanadi.) */
export const CARD_OPEN_MS = 240;
export const animationMs = (reduceMotion: boolean, ms = CARD_OPEN_MS) => (reduceMotion ? 0 : ms);
/** Kubik tashlash animatsiyasi (aylanib tushish) davomiyligi. */
export const DICE_MS = 1000;
/** Fishkaning bitta katakdan ikkinchisiga o'tishi (sakrash bilan). */
export const STEP_MS = 230;
export const stepMs = (reduceMotion: boolean) => (reduceMotion ? 0 : STEP_MS);
