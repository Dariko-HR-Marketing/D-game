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

## Bitta ko'rinishga sig'ish (kompyuter/planshet)
O'yin ekrani oyna balandligiga teng, sahifa o'zi aylanmaydi. Chapda qaror/moliya (kerak bo'lsa ichida aylanadi, qaror tugmalari pastda qotib turadi), o'ngda o'yinchilar, taxta, «So'nggi voqealar», reaksiyalar va chiqish. Taxta balandlikka ham moslanadi (`Game.tsx`: kenglik kamayadi; juda past ekranda `tight` — kataklar kichikroq, yozuvlar yashirinadi, ikonka va rang qoladi). Telefonda qaror varag'ida ham tugmalar pastda qotib turadi. Tekshiruv: `server/scripts/fit-check.ts` (1024×768 … 1920×1080, sahifa aylanishi va asosiy tugmalar ko'rinishini o'lchaydi):
```bash
OUT=/tmp/fit pnpm tsx scripts/fit-check.ts
```

## Harakat, 3D kubik va tovush
- **Kubik (3D):** CSS 3D kub (`ui/Dice3D.tsx`, veb): uch o'qda aylanib, tepaga otilib, 2–3 marta sakrab natija yuzida to'xtaydi (≈1 s, `DICE_MS`); soya balandlikka qarab o'zgaradi. Qarama-qarshi yuzlar yig'indisi 7, birlik qizil. 7+ (2 kubik yig'indisi) bo'lsa old yuz raqam ko'rsatadi. Native'da tekis yuz (`FlatDice`).
- **Fishka yurishi:** server holatni bir martada yangilaydi, mijoz (`useMovement`) fishkani kubik to'xtagach har bir katak ustidan bittalab yurgizadi (`STEP_MS` ≈ 230 ms, har katakda sakrash). Aylana almashsa, orqaga yursa yoki 12 dan uzoq bo'lsa — bir zumda ko'chadi. Karta, qaror va kubik tugmasi fishka yetib kelgachgina chiqadi (`settled`).
- **Harakatni kamaytirish** (tizim sozlamasi): kubik aylanmaydi, fishka kechikishsiz, bir zumda ko'chadi.
- **Tovush** (`sound.ts`, Web Audio, tashqi fayllarsiz): kubik shitirlashi va to'xtashi, fishka qadami (balandligi oshib boradi), karta, pul yutuq/to'lov, «sizning navbatingiz», taymerning oxirgi 5 soniyasi, g'alaba/yutqazish. Sarlavhadagi tugma (`role=switch`) yoqadi/o'chiradi, holat `localStorage` da saqlanadi. Brauzer siyosati tufayli birinchi bosishdan keyin ochiladi; yorliq yashirin bo'lsa faqat navbat va natija tovushi chalinadi. Native ilovada hozircha jim.
- Tekshiruv: `client/src/motion3d.test.ts` (rejalash, burchaklar, tovush dvigateli) va `server/scripts/motion-check.ts` (haqiqiy brauzerda: kubik aylanishi, fishka qadamlari, kartaning kechikishi, tovush tugmasi). Boshqa skriptlar `reducedMotion` bilan ishlaydi (tez bo'lishi uchun).

## Onboarding, vaqt, fishka, karta, kirish (2026-10-17)
- **Sahifa yo'riqnomalari** (`ui/Tour.tsx`): har sahifada birinchi kirishda bir marta — Bosh sahifa, Xona, Orzu, O'yin (kichik aylana 9 qadam, katta aylanaga chiqqanda alohida 5 qadam), Natija, Profil, Reyting, Do'kon, Sinf, Turnirlar. Veb'da kerakli element yoritiladi (spotlight), karta shu yonida; telefonda markazda/pastda. Qayta ko'rsatish: sahifadagi «?» va Profil → «Yo'riqnomani qayta ko'rsatish». Holat `localStorage` (`poyga-tour-<id>-v2`), `poyga-tours-off=1` — o'chirish (sinov skriptlari). Matnlar `uz.tour`, tartibi `ui/tourData.ts`; tekshiruv: `server/scripts/tour-check.ts`.
- **Oyma-oy vaqt** (`ui/TimeBar.tsx`): «O'yin vaqti 2 yil 5 oy», yil ichidagi oylar 12 nuqtada, har tashlashdan keyin (fishka yurib bo'lgach) «+N oy». Hisobni server qiladi (`monthsPlayed`). Taxminiy davomiylik (≈ 14 / ≈ 5 yil) faqat yo'riqnomada, «taxminiy» deb (OPEN_QUESTIONS №114, BALANCE.md).
- **Fishka**: odam ikonkasi (rang + raqam nishoni), katak USTIDA emas, taxta ramkasi (tashqi chet) bo'ylab yuradi va katak tomonga qaragan strelka bilan; bir katakdagilar chet bo'ylab yonma-yon.
- **Karta**: asl rasm (kesilmaydi, ustiga yozuv yo'q), ochilganda aylanib chiqadi; rasm bo'lsa matn faqat ekran o'qigichga, bo'lmasa ko'rinadi. Boshqa o'yinchi tortgan karta xabari (bozor kartasi ham) 30 soniya yoki «✕» gacha turadi (`toast-check.ts`).
- **Kirish va Bosh sahifa — bitta sahifa**: kirish (telefon/kod) bitta ekranda, past ekranda rasm yashirinadi; Bosh sahifadan «Qanday o'ynaladi» bloki yo'riqnomaga ko'chdi, «Chiqish» Profilga o'tdi. Tekshiruv: `server/scripts/fit-phone.ts` (320×568 … 1440×900).

## Hali odam ko'zi bilan sinalmagan
Ekranlar avtomatik rasm va axe bilan tekshirilgan, lekin haqiqiy telefon/planshetda, haqiqiy foydalanuvchilar bilan sinov (o'qish tezligi, tugmalar joyi, 30 soniyalik qaror yetarlimi) o'tkazilmagan. Dizayner tasdig'i (prototip bilan solishtirish, SPEC §16) ham kutilmoqda.

## Do'kon, sinf, turnir ekranlari

Bosh sahifada uchta yangi qator: «Turnirlar», «Sinf», «Do'kon va Plus» (`ui/Biz.tsx`). Do'kon: telefon tasdig'i bloki, Plus kartasi (narx belgilanmagan bo'lsa tugma o'chiq), kutilayotgan buyurtma (ota-ona kutish / to'lov), fishka-ramka-fon tablari. Sinf: kod bilan qo'shilish, sinf xonasiga kirish, o'qituvchi paneli (sinflar, xona, topshiriqlar, o'quvchilar hisoboti, CSV). Turnir: shartlar, ro'yxatdan o'tish (16 yoshgacha ota-ona telefoni), xona, reyting. Kosmetika taxtadagi fishka rangi, avatar ramkasi va foniga ta'sir qiladi. Axe: `server/scripts/axe-biz.ts` — 390 va 1440 px da buzilish yo'q.

## Ekran turlari va moslashuvchanlik (2026-10-22)
`client/src/layout.ts` — bitta qoida: **phone** (tik telefon, < 600 px: bitta ustun, pastki menyu, qaror — pastki varaq), **tablet** (tik planshet ≥ 600 px: telefon tartibi, taxta kengroq va balandlikka sig'adi, ustun markazda ≤ 760 px), **compact** (yotiq telefon, balandlik < 520: chapda qaror/moliya, o'ngda sig'adigan taxta, qaror tugmalari yonma-yon, sahifa aylanmaydi), **wide** (yotiq planshet/kompyuter ≥ 900 px; ≥ 1366 da uch ustun). Native ilova ikkala yo'nalishda ishlaydi (`app.json` orientation: default).
- Shriftlar: matn ≥ 12 px, nishon raqamlari ≥ 10, katak yozuvlari ≥ 8 (kichikroq bo'lsa yashiriladi — ikonka + rang + «Katak turlari»).
- Tekshiruv: `server/scripts/responsive-check.ts` (21 o'lcham × 15 ekran: gorizontal aylanish, ekrandan chiqqan boshqaruv, bosish maydoni, shrift, asosiy tugma ko'rinishi; `STRICT=1` bo'lsa muammoda xato bilan chiqadi — CI da 3 o'lchamda), `pnpm a11y` (axe: 5 o'lcham, yotiq telefon va tik planshet ham).

## Kubik oynasi (modal)
O'z navbatingizda «Kubikni tashlash» (katta aylanada «Kubiklarni tashlash», 2 ta kubik) tugmasi oynaning eng oldida chiqadi (`ui/DiceModal.tsx`): kubik(lar) «?», navbat taymeri, tugma fokusda (probel/Enter). «Avval hisobni ko'raman» (yoki fon/Esc) — shu tashlash imkoniyati uchun yopiladi, sahifadagi oddiy tugma qoladi (avval aktiv sotish, kredit va h.k.). «Bu oynani o'chirish» — oddiy tugmaga qaytadi (`poyga-roll-modal=off`). Tashlagandan keyin kubik(lar) shu oynada aylanadi, so'ng «Yig'indi: 4 + 5 = 9» (~2,3 s); boshqa o'yinchilarda to'smaydigan ko'rsatma. Yo'riqnoma ochiq bo'lsa tashlash oynasi chiqmaydi, kubik natijasi ko'rsatilayotganda yo'riqnoma ochilmaydi. Tekshiruv: `server/scripts/dice-check.ts` (axe bilan, CI da).

