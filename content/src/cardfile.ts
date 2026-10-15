/** Karta rasmi fayl nomi xavfsizligi (§2.5). Tekis papka: yo'l o'tishi (../), kengaytma va begona belgilar rad etiladi. Apostrof ruxsat; rasmlar maketdan .webp (apostrofsiz nom). */
export const SAFE_CARD_FILE = /^[A-Za-z0-9._'-]{1,128}\.(png|jpe?g|webp)$/i;
export const isSafeCardFile = (f: unknown): f is string => typeof f === "string" && SAFE_CARD_FILE.test(f);

/** `${base}/${file}` — fayl nomi URL uchun kodlanadi. Xavfsiz bo'lmasa null. */
export function cardFileUrl(base: string, file: string | undefined | null): string | null {
  if (!isSafeCardFile(file)) return null;
  return `${base.replace(/\/+$/, "")}/${encodeURIComponent(file)}`;
}
