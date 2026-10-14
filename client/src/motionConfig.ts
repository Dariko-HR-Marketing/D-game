/** §10: karta ochilishi ≈ 240 ms; «harakatni kamaytirish» yoqilgan bo'lsa — animatsiyasiz. (React Native'siz: testlanadi.) */
export const CARD_OPEN_MS = 240;
export const animationMs = (reduceMotion: boolean, ms = CARD_OPEN_MS) => (reduceMotion ? 0 : ms);
