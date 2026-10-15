export const ERRORS: Record<string, string> = {
  unauthorized: "Kirish talab qilinadi", forbidden: "Bu amalga ruxsat yo'q", reason_required: "Sabab kamida 3 belgi bo'lishi kerak", bad_credentials: "Login yoki parol noto'g'ri", locked: "Juda ko'p xato urinish. 15 daqiqadan keyin qayta urining",
  disabled: "Hisob o'chirilgan", totp_required: "Ikki bosqichli tasdiq kodi kerak", bad_totp: "Tasdiq kodi noto'g'ri yoki eskirgan", rate_limited: "Juda tez-tez urinish. Biroz kuting", weak_password: "Parol kamida 10 belgi, harf va raqam bo'lsin",
  same_password: "Yangi parol eskisidan farq qilsin", change_password: "Avval parolni almashtiring", setup_2fa: "Avval ikki bosqichli tasdiqni yoqing", login_taken: "Bu login band", bad_login: "Login 3–40 belgi: kichik harf, raqam, . _ -", bad_name: "Nom kamida 2 belgi",
  bad_role: "Rol noto'g'ri", last_admin: "Oxirgi administratorni o'zgartirib bo'lmaydi", self_change: "O'z hisobingizni bu yerda o'zgartirib bo'lmaydi", not_found: "Topilmadi", no_user: "Foydalanuvchi topilmadi", bad_days: "Muddat 1–3650 kun",
  bad_plan: "Reja noto'g'ri", bad_status: "Holat noto'g'ri", bad_assignee: "Mas'ul topilmadi", no_complaint: "Shikoyat topilmadi", bad_text: "Matn juda qisqa", bad_field: "Maydon noto'g'ri to'ldirilgan", "2fa_required": "2FA majburiy, o'chirib bo'lmaydi",
  already_enabled: "Allaqachon yoqilgan", not_enabled: "Yoqilmagan", no_part: "Bunday qism yo'q", price_unset: "Narx belgilanmagan", not_pending: "Holat mos emas",
};
export const t = {
  title: "POYGA admin", token: "Kirish tokeni", login: "Kirish", logout: "Chiqish", loginErr: "Token noto'g'ri yoki ruxsat yo'q", loginHint: "Administrator tokeni parol menejerida saqlanadi. Uni hech kimga yubormang.",
  content: "Kontent", rooms: "Xonalar", users: "Foydalanuvchilar", complaints: "Shikoyatlar", analytics: "Analitika", audit: "Audit", dashboard: "Boshqaruv paneli", accounts: "Admin hisoblari", announce: "E'lonlar", system: "Tizim", shop: "Do'kon va Plus", edu: "Ta'lim", tournaments: "Turnirlar",
  version: "Versiya", active: "Faol", publish: "Nashr qilish", create: "Yangi versiya yaratish", note: "Izoh (nima o'zgardi)", part: "Qism",
  search: "Qidirish", ban: "Bloklash", unban: "Blokdan chiqarish", resolve: "Hal qilish", journal: "O'yin jurnali", forbidden: "Ruxsat yo'q",
  problems: "Muammolar", saved: "Saqlandi", load: "Yuklash", banned: "Bloklangan", open: "Ochiq", resolved: "Hal qilingan",
  cancel: "Bekor qilish", confirm: "Tasdiqlash", reason: "Sabab", close: "Yopish", loading: "Yuklanmoqda…", empty: "Hozircha bo'sh",
  roles: { administrator: "Administrator", content_editor: "Kontent muharriri", support: "Qo'llab-quvvatlash", analyst: "Tahlilchi" } as Record<string, string>,
  parts: {
    cellRules: ["Katak qoidalari", "K, Q, V, X, Y kataklari va aylana boshidagi ta'sirlar (JSON)."],
    dreams: ["Orzular", "Orzu nomi va narxi. Har bir orzu katta aylanadagi «O» katagi bilan nomi bo'yicha bog'lanadi."],
    bigBoard: ["Katta aylana", "53 katak: tur, nom, daromad va narx."],
    cards: ["Kartalar va kasblar", "418 ta karta: kasb, sarmoya, bozor, xarajat, hodisa. Katta hajm — ehtiyot bo'ling."],
  } as Record<string, [string, string]>,
  publishWarn: "Nashr qilingan versiya YANGI boshlangan o'yinlarga qo'llanadi. Davom etayotgan o'yinlar o'z versiyasida qoladi.",
  banWarn: "Foydalanuvchi o'yindan chiqariladi (o'rniga bot o'ynaydi) va qayta kira olmaydi.",
};
