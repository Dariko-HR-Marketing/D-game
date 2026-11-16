/** Kirish usullari. SMS bir martalik kod serverda ishlaydi (docs/AUTH.md). Qolganlari kirish sahifasida prototip ko'rinishida tayyor,
 *  lekin server tomoni ulanmaguncha o'chiq: foydalanuvchiga «tez orada» deb aniq aytiladi. Ulangach tegishli bayroq `true` qilinadi. */
export const AUTH_METHODS = {
  sms: true,
  /** Parol bilan kirish va ro'yxatdan o'tish (server: parol saqlash, tiklash, urinishlarni cheklash kerak). */
  password: false,
  /** Email bilan kirish (server: email tasdiqlash kerak). */
  email: false,
  /** Google bilan kirish (server `/auth/google` tayyor; mijozga Google client ID kerak). */
  google: false,
} as const;
