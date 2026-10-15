# UX/UI: dizayn tizimi va tekshiruv

## Tamoyillar
- **Qaror uchun raqam:** ixtiyoriy kartada narx, boshlang'ich to'lov, kredit, oylik daromad va pul oqimiga ta'sir, naqd yetishi (yetmasa — bank krediti yoki yangi kasb ogohlantirishi) ko'rsatiladi (`client/src/cardFacts.ts`, inqiroz narxi ham hisobga olinadi).
- **Hamma nima bo'lganini ko'radi:** oxirgi kubik (`state.lastRoll`) va tortilgan karta (`state.lastCard`) holatda saqlanadi; majburiy karta darhol qo'llansa ham xabar chiqadi (`CardToast`). Jurnal va ro'yxatlarda xom ID emas, ism.
- **Rangga tayanmaslik:** fishka — rang + raqam + o'yinchilar ro'yxati; holatlar — rang + belgi/matn; fokus ramkasi to'q ko'k.
- **Harakat kamaytirish:** kubik, fishka va karta animatsiyalari tizim sozlamasiga bo'ysunadi.
- **Telefon avval:** taxta markazida «Kubik tashlash», qaror pastki varaqda; planshet/kompyuterda taxta chapda, panel o'ngda; kompyuterda probel — kubik.

## Tizim (`client/src/theme.ts`, `ui/kit.tsx`)
Bo'shliq (4 px shkala), burchak, shrift o'lchamlari, soya, ma'no ranglari (yaxshi/yomon/diqqat — barchasi AA kontrastli, `a11y.test.ts` tekshiradi). Komponentlar: `Card`, `Pill`, `Stat`, `Row`, `Banner`, `Screen`, `Dice`, `Board`, `PlayerStrip`, `FinanceCard`, `DecisionCard`, `TurnPanel`, `CardToast`, `Onboarding`.

## Ekranlar
Bosh sahifa · Kirish (SMS) · Xona · Orzu tanlash · O'yin (+ yo'riqnoma, karta oynasi, moliya amallari) · Natija va tahlil · Profil (yutuqlar, tarix, hisobni boshqarish) · Reyting · Qoidalar · Admin panel (kontent, xonalar, foydalanuvchilar, shikoyatlar, analitika, audit).

## Tekshirish
```bash
cd client && pnpm export:web && (cd dist && python3 -m http.server 8081 &)   # veb versiya
cd server
pnpm a11y                                     # axe-core: 3 o'lcham × barcha ekranlar (390 / 1024 / 1440 px)
OUT=/tmp/shots pnpm screens                   # ekran rasmlari (ko'rik uchun)
OUT=/tmp/shots pnpm tsx scripts/screens-login.ts   # kirish ekrani + axe
(cd ../admin && pnpm build && cd dist && python3 -m http.server 8082 &)
OUT=/tmp/shots pnpm tsx scripts/screens-admin.ts   # admin: rasmlar + axe
```

## Hali odam ko'zi bilan sinalmagan
Ekranlar avtomatik rasm va axe bilan tekshirilgan, lekin haqiqiy telefon/planshetda, haqiqiy foydalanuvchilar bilan sinov (o'qish tezligi, tugmalar joyi, 30 soniyalik qaror yetarlimi) o'tkazilmagan. Dizayner tasdig'i (prototip bilan solishtirish, SPEC §16) ham kutilmoqda.
