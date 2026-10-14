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
  errors: {
    room_not_found: "Bunday xona topilmadi", room_full: "Xona to'la (6/6). Yangi xona yarating", already_in_game: "Siz boshqa o'yinda turibsiz",
    already_started: "O'yin allaqachon boshlangan", not_host: "Faqat xona egasi boshlay oladi", stale_seq: "Holat yangilandi. Qayta urinib ko'ring",
    not_your_turn: "Hozir sizning navbatingiz emas", unauthorized: "Kirish talab qilinadi", unknown: "Xatolik yuz berdi",
  } as Record<string, string>,
} as const;
export const errText = (code: string) => uz.errors[code] ?? uz.errors.unknown;
