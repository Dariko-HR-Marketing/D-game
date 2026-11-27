/** Ro'yxatdan o'tishda oferta qabul qilingani: kirishdan keyin (sessiya bor bo'lgach) rozilik serverga yoziladi.
 *  Veb'da `localStorage` (sahifa qayta yuklansa ham saqlanadi), boshqa joyda xotirada. */
let mem = false; const KEY = "tajriba24-offer-signup";
export function markSignupOffer() { mem = true; try { (globalThis as any).localStorage?.setItem(KEY, "1"); } catch { /* xotira yopiq */ } }
export function hasSignupOffer(): boolean { try { if ((globalThis as any).localStorage?.getItem(KEY) === "1") return true; } catch { /* xotira yopiq */ } return mem; }
export function clearSignupOffer() { mem = false; try { (globalThis as any).localStorage?.removeItem(KEY); } catch { /* xotira yopiq */ } }
