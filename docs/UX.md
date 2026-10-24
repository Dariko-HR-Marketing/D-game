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

## O'yin tugagach shaxsiy hisobot (2026-10-22)
- Natija ekrani har bir o'yinchiga **o'z hisobotini** ko'rsatadi: yakuniy ko'rsatkichlar, oyma-oy dinamika (sof boylik, naqd, pul oqimi, passiv daromad; grafik + jadval ko'rinishi), maqsad sari yo'l, qarorlar (qabul/o'tkazildi/majburiy), investitsiyalar, xarajat va xavflar, xulosa va tavsiyalar, muhim lahzalar, boshqalar bilan taqqoslash, CSV yuklab olish.
- Hisob serverda jurnaldan qayta o'ynatib quriladi (`rules/src/report.ts`); boshqa o'yinchilarning faqat umumiy ko'rsatkichlari beriladi. Tavsiyalar qoida bilan ma'lumotdan chiqariladi (matnlar `uz.ts`da), taxmin yo'q.
- Rang yagona belgi emas: grafikka jadval ko'rinishi, qarorlar ustunida raqamlar beriladi. Tekshiruv: `server/scripts/report-check.ts` (4 o'lcham, axe, CSV, jadval, gorizontal aylanish yo'q).

## Faol ta'sirlar ixchamlashtirildi va portfel karta nomlari (2026-10-24, buyurtmachi izohi)
- **Faol ta'sirlar** (chap ustun, moliyaviy holat): endi yig'iladigan bo'lim — yopiq holatda faqat sarlavha va soni (balandlik ~49 px); bosilsa ro'yxat (240 px dan oshsa aylanadi). Yangi ta'sir kelsa sarlavhada «+N yangi» belgisi chiqadi va ekran o'qigichga xabar beriladi; ochilganda yangilari ajratib ko'rsatiladi, o'yin boshida/sahifa yangilanganda mavjud ta'sirlar «yangi» sanalmaydi. Tekshiruv: `server/scripts/mods-check.ts`.
- **«Mening kartalarim»da kichik biznes nomlari:** barcha 35 ta kichik biznes kartasining `code` i bir xil («KB»), shuning uchun hamma aktiv birinchi kartaning nomi bilan chiqardi («Mahallangizda elchixona ochilmoqda»). Endi aktivga sotib olingan karta ID si yoziladi (`Asset.cardId`) va nom aynan shu kartadan olinadi. **Eski (shu tuzatishdan oldin sotib olingan) aktivlarda karta ID si yo'q** — ular avvalgidek tur bo'yicha nom bilan chiqadi; yangi sotib olinganlar to'g'ri.

## Bankrot (yangi kasb) tanaffusi (2026-10-24, buyurtmachi talabi)
Muammo: o'yinchi bankrot bo'lsa (qarz chegarasi oshsa) o'yin darrov keyingi kartaga o'tib ketardi. Endi:
- O'yin **to'xtaydi** (`recapPause`, yangi o'yinlarda). Egasiga tahlil oynasi: avvalgi va yangi kasb, **nima bo'ldi** (majburiy to'lov va qarz chegarasi, zaxira naqd, manfiy pul oqimi, qarz, passiv daromad yetmagani), sabab bo'lgan karta, bankrotgacha holat, yo'qotilgan aktivlar (nom, narx, daromad), oxirgi voqealar, yangi boshlanish. Sabablar faqat o'yin ma'lumotidan qoida bilan chiqariladi (`client/src/recap.ts`), taxmin yo'q.
- Tanlov: **«Yangi kasb bilan davom etish»** (asosiy tugma), **«Vaqtincha chiqib turish»** (avtopilot yoqiladi, «Men qaytdim» bilan qaytiladi), **«O'yindan chiqish»** (tasdiq bilan; o'rnini bot egallaydi, 2 kishilik o'yinda ham).
- Boshqa o'yinchilarga faqat qisqa xabar («X bankrot bo'ldi…») va qolgan vaqt. Vaqt tugasa (karta qarori vaqti: 30 s) yoki bot/avtopilot bo'lsa o'yin o'zi davom etadi; bu «o'tkazib yuborilgan harakat» (ball −2) hisoblanmaydi.
- Yotiq telefonda tahlil chapda (aylanadi), tanlovlar o'ngda. Tekshiruv: `server/scripts/recap-check.ts`.
- **Qoida o'zgarmagan:** SPEC §5.3 bo'yicha bankrotda hamma aktiv va qarz yo'qoladi, yangi kasb tasodifiy tortiladi. «Bir qism aktiv qolsin» taklifi — OPEN_QUESTIONS 158.

## O'yin ichida chat (2026-10-24, buyurtmachi talabi)
- Sarlavhadagi «Chat» tugmasi (o'qilmagan xabarlar soni belgisi bilan) yon panel (kompyuter) yoki pastki varaq (telefon) ochadi. Yopiq paytda yangi xabar ekran o'qigichga e'lon qilinadi.
- **Erkin matn** (≤ 200 belgi) — 16 yoshgacha va ota-ona o'chirgan bolalar uchun **yopiq** (SPEC §2.8); ularga va hammaga **12 ta tayyor ibora** ochiq (matnlar `uz.chat.phrases`). Server erkin matnni o'zi tekshiradi (`chat_restricted`).
- Himoya: tezlik chegarasi (taxminan 1 xabar / 2 s, burst 4), bir xil xabarni 10 s ichida takrorlash rad etiladi, boshqaruv/yo'nalish belgilari tozalanadi, xabarlar xotirada (so'nggi 100 ta, bazaga yozilmaydi).
- **Jim qilish** — o'yinchi xabarlarini faqat shu qurilmada yashiradi. **Shikoyat** — xabar matni bilan mavjud `/complaints` ga yuboriladi (admin «Shikoyatlar»da ko'radi). Tekshiruv: `server/scripts/chat-check.ts`.

## Ovozli aloqa: naushnik/dinamik orqali gaplashish (2026-10-24, buyurtmachi talabi)
- Chat panelining tepasida «Ovozli aloqa»: **Ovozga qo'shilish** (mikrofon so'raladi) yoki **Faqat tinglash** (mikrofonsiz/ruxsatsiz ham ulanadi). Qo'shilgach: mikrofonni o'chirish/yoqish (sarlavhada ham tugma — chat yopiq bo'lsa ham), kim ovozda, kim **gapiryapti** (yashil belgi), har bir o'yinchini shu qurilmada **jim qilish**, qurilmalar (mikrofon va dinamik/naushnik tanlash — brauzer qo'llasa).
- Audio **P2P (WebRTC)**: o'yinchilar o'rtasida to'g'ridan-to'g'ri, serverda saqlanmaydi/yozilmaydi. Signalizatsiya mavjud WebSocket orqali (`voice` xabari); taklifni har juftlikda ID si kichigi yuboradi (to'qnashuv bo'lmaydi). 8 kishigacha (har biri 7 ulanish).
- **16 yoshgacha va ota-ona o'chirgan bolalarga yopiq** (erkin gaplashish = erkin chat, SPEC §2.8); server ham rad etadi (`voice_restricted`).
- Aks-sado: naushnik tavsiya etiladi (hint), brauzer echo/noise suppression yoqilgan. Qo'shilgach chiqib ketsa/uzilsa, ovozdan avtomatik chiqadi; uzilishdan keyin qaytsa qayta qo'shiladi.
- Cheklov: hozir faqat **veb** (telefon brauzeri ham). Native ilovada ovoz — keyingi bosqich (react-native-webrtc, dev client). TURN sozlamasi: `docs/DEPLOY.md`. Tekshiruv: `server/scripts/voice-check.ts` (soxta mikrofon bilan haqiqiy P2P, uch o'yinchi, jim qilish, ruxsatsiz tinglovchi, bola yopiq).

