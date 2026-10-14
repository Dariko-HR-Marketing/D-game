// §2.2: hamma matn shu yerda (o'zbek, lotin). Kodda qattiq yozilgan matn yo'q.
export const uz = {
  app: { name: "POYGA" },
  home: { create: "Xona yaratish", join: "Kod bilan qo'shilish", code: "Xona kodi", name: "Ismingiz", connecting: "Ulanmoqda…", offline: "Aloqa yo'q. Qayta ulanmoqda…" },
  lobby: { title: "Xona", players: "O'yinchilar", start: "O'yinni boshlash", wait: "Xona egasi o'yinni boshlashini kuting", bot: "Bot", you: "Siz", offline: "oflayn", hint: "Odam yetmasa bot qo'shiladi" },
  game: {
    yourTurn: "Sizning navbatingiz", waitFor: "Navbat:", roll: "Kubik tashlash", accept: "Qabul qilaman", skip: "O'tkazaman",
    cash: "Naqd", cashflow: "Pul oqimi", passive: "Passiv daromad", debt: "Qarz va kreditlar", salary: "Ish haqi", expenses: "Oylik xarajat",
    mandatory: "Majburiy karta", optional: "Ixtiyoriy karta", seconds: "soniya", winner: "G'olib", round: "Aylana",
    exitTitle: "Kichik aylanadan chiqish", exitCash: "Naqd ≥ 1 000 000", exitFlow: "Passiv oqim ≥ 25 000", exitDebt: "Qarz yo'q", exitPartner: "Sheriklik yopilgan",
    before: "Oldin", after: "Keyin",
  },
  profile: {
    title: "Profil", name: "Ism", color: "Fishka rangi", birthYear: "Tug'ilgan yil", save: "Saqlash", saved: "Saqlandi", level: "Daraja", games: "O'yinlar", wins: "G'alabalar", big: "Katta aylanaga chiqqan",
    under16: "16 yoshgacha: o'zaro qarz, sheriklik va erkin chat yopiq; to'lov ota-ona tasdig'i bilan.", history: "O'yinlar tarixi", empty: "Hozircha bo'sh", won: "G'alaba", lost: "O'yin tugadi",
    leaderboard: "Reyting", rank: "O'rin", back: "Orqaga", danger: "Hisobni o'chirish",
    consequences: "O'chirilganda: profil va sozlamalar o'chadi; o'yin natijalari ismsiz (anonim) saqlanadi; bu amalni qaytarib bo'lmaydi.",
    export: "Ma'lumotni yuklab olish", typeWord: "Tasdiqlash uchun «O'CHIRISH» deb yozing", deleteBtn: "Hisobni o'chirish", needProfile: "Profilni to'ldiring",
  },
  coop: {
    bank: "Bank", bankHint: "Bank krediti (100 ga karrali)", bankRoom: "Bank limiti qoldig'i", take: "Kredit olish", amount: "Summa",
    suyunchi: "Suyunchi", suyunchiFor: "farzand tug'ildi — suyunchi bering", give: "Berish", loan: "O'zaro qarz", loanAsk: "Qarz so'rash", giver: "Beruvchi", months: "Muddat (oy)", max: "Eng ko'pi",
    loanReq: "qarz so'rayapti", accept: "Qabul qilish", waiting: "Javob kutilmoqda", fewPlayers: "Qarz uchun kamida 5 o'yinchi kerak",
    partner: "Sheriklik", partnerOffer: "Sherik taklif qilish", partnerFrom: "sheriklik taklif qilmoqda", partnerBuyout: "Sherik ulushini sotib olish", chooseHint: "Tanlang…",
    debts: "Hamkorlik qarzlari", repay: "To'lash", sec: "soniya", shares: "Aksiya soni",
  },
  errors: {
    room_not_found: "Bunday xona topilmadi", room_full: "Xona to'la (6/6). Yangi xona yarating", already_in_game: "Siz boshqa o'yinda turibsiz",
    already_started: "O'yin allaqachon boshlangan", not_host: "Faqat xona egasi boshlay oladi", stale_seq: "Holat yangilandi. Qayta urinib ko'ring",
    bad_name: "Ism 2–24 belgi bo'lishi kerak", bad_color: "Rang noto'g'ri", bad_birth_year: "Tug'ilgan yil noto'g'ri", restricted_age: "16 yoshgacha bu amal yopiq", in_game: "Avval o'yindan chiqing", confirm_required: "Tasdiqlash so'zi noto'g'ri",
    invalid_amount: "Summa noto'g'ri", bank_limit: "Bank limiti oshib ketadi", already_given: "Siz allaqachon bergansiz", small_circle_only: "Faqat kichik aylanada", not_needed: "Naqd yoki bank limiti yetadi",
    partner_cash: "Sherikning naqdi yetmaydi", owner_cash: "Sizning naqdingiz yetmaydi", insufficient_cash: "Naqd yetmaydi", bot: "Botlar qatnashmaydi", no_proposal: "Taklif muddati tugadi",
    "5 dan kam o'yinchi": "Qarz uchun kamida 5 o'yinchi kerak", "beruvchi naqdining 20 % idan oshdi": "Beruvchi naqdining 20 % idan oshdi", "oluvchi limitidan oshdi": "Oluvchi limitidan oshdi",
    not_your_turn: "Hozir sizning navbatingiz emas", unauthorized: "Kirish talab qilinadi", unknown: "Xatolik yuz berdi",
  } as Record<string, string>,
} as const;
export const errText = (code: string) => uz.errors[code] ?? uz.errors.unknown;
