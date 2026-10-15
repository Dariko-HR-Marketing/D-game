# UX/UI: dizayn tizimi va tekshiruv

## Tamoyillar
- **Qaror uchun raqam:** ixtiyoriy kartada narx, boshlang'ich to'lov, kredit, oylik daromad va pul oqimiga ta'sir, naqd yetishi (yetmasa — bank krediti yoki yangi kasb ogohlantirishi) ko'rsatiladi (`client/src/cardFacts.ts`, inqiroz narxi ham hisobga olinadi).
- **Hamma nima bo'lganini ko'radi:** oxirgi kubik (`state.lastRoll`) va tortilgan karta (`state.lastCard`) holatda saqlanadi; majburiy karta darhol qo'llansa ham xabar chiqadi (`CardToast`). Jurnal va ro'yxatlarda xom ID emas, ism.
- **Rangga tayanmaslik:** fishka — rang + raqam + o'yinchilar ro'yxati; holatlar — rang + belgi/matn; fokus ramkasi to'q ko'k.
- **Harakat kamaytirish:** kubik, fishka va karta animatsiyalari tizim sozlamasiga bo'ysunadi.
- **Telefon avval (maketlarga mos, `docs/DESIGN_MAP.md`):** tepada holat satri (naqd · pul oqimi · passiv), kvadrat taxta (ikonka + yozuv + rang), o'yinchilar lentasi (rasm, daraja nishoni, Navbatda/Onlayn/Oflayn), taymer halqasi va katta yashil «Kubikni tashlash»; pastki navigatsiya: Maydon / Blank / O'yinchilar / Qoidalar. Qaror — pastki varaqda (rangli sarlavha, «O'zgarishlar» oldin → keyin, muddat ogohlantirishi). Kompyuterda (≥ 900 px): chapda moliyaviy panel, markazda keng taxta; probel — kubik.
- **Katta aylana:** 2 kubik yig'indisi; tavakkal biznes va birovning biznesi (A/B) alohida qaror kartalari; Imkoniyatda naqd 25 000 dan ko'p bo'lsa dekani tanlash.

## Tizim (`client/src/theme.ts`, `ui/kit.tsx`)
Bo'shliq (4 px shkala), burchak, shrift o'lchamlari, soya, ma'no ranglari (yaxshi/yomon/diqqat — barchasi AA kontrastli, `a11y.test.ts` tekshiradi). Komponentlar: `Card`, `Pill`, `Stat`, `Row`, `Banner`, `Screen`, `Dice`, `Board`, `PlayerStrip`, `FinanceCard`, `DecisionCard`, `TurnPanel`, `CardToast`, `Onboarding`.

## Ekranlar
Xush kelibsiz · Bosh sahifa (qatorlar, pastki navigatsiya) · Kirish (SMS) · Xona · Orzu tanlash · O'yin (+ yo'riqnoma, karta oynasi, moliya amallari) · Natija va tahlil · Profil (yutuqlar, tarix, hisobni boshqarish) · Reyting · Qoidalar · Admin panel (kontent, xonalar, foydalanuvchilar, shikoyatlar, analitika, audit).

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

## Do'kon, sinf, turnir ekranlari

Bosh sahifada uchta yangi qator: «Turnirlar», «Sinf», «Do'kon va Plus» (`ui/Biz.tsx`). Do'kon: telefon tasdig'i bloki, Plus kartasi (narx belgilanmagan bo'lsa tugma o'chiq), kutilayotgan buyurtma (ota-ona kutish / to'lov), fishka-ramka-fon tablari. Sinf: kod bilan qo'shilish, sinf xonasiga kirish, o'qituvchi paneli (sinflar, xona, topshiriqlar, o'quvchilar hisoboti, CSV). Turnir: shartlar, ro'yxatdan o'tish (16 yoshgacha ota-ona telefoni), xona, reyting. Kosmetika taxtadagi fishka rangi, avatar ramkasi va foniga ta'sir qiladi. Axe: `server/scripts/axe-biz.ts` — 390 va 1440 px da buzilish yo'q.
