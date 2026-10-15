export const t = {
  title: "POYGA admin", token: "Kirish tokeni", login: "Kirish", logout: "Chiqish", loginErr: "Token noto'g'ri yoki ruxsat yo'q", loginHint: "Administrator tokeni parol menejerida saqlanadi. Uni hech kimga yubormang.",
  content: "Kontent", rooms: "Xonalar", users: "Foydalanuvchilar", complaints: "Shikoyatlar", analytics: "Analitika", audit: "Audit", shop: "Do'kon va Plus", edu: "Ta'lim", tournaments: "Turnirlar",
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
