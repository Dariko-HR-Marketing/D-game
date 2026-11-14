# Brief: Tajriba 24 onlayn

(Sub-agentlar bu suhbatni ko'rmaydi; quyidagi hammasi faktlar, fikr emas. Javob o'zbek lotin alifbosida.)

# Tajriba 24 onlayn (D-game)

- What it is: mavjud stol o'yini «Tajriba 24»ning onlayn ko'p o'yinchili versiyasi (2–8 o'yinchi, kichik va katta aylana, 1000+ karta). Moliyaviy savodxonlik, pul oqimi va passiv daromad yaratishni o'rgatadi; qalam va qo'lda hisob yo'q, natija serverda hisoblanadi.
- Who it is for: (1) o'yinchilar (yosh cheklovi yo'q, 16 yoshgacha ota-ona nazorati), (2) ta'lim muassasalari (maktab, kollej, universitet, o'quv markazlari), (3) banklar va kompaniyalar (brendli turnir, korporativ xona). Bozor: O'zbekiston, o'zbek lotin tilida.
- What it sells, at what price: asosiy o'yin BEPUL. Rejalashtirilgan daromad (2–3-bosqich): Plus obuna (tahlil, tarix, cheksiz xona), ta'lim litsenziyasi (o'qituvchi paneli), homiylik/korporativ turnirlar, kosmetika (fishka, ramka). Loot box yo'q, ball pulga almashtirilmaydi, pulli narsa natijaga ta'sir qilmaydi. NARXLAR HALI BELGILANMAGAN (konfiguratsiyada bo'sh).
- Where and how: veb (tajriba24.uz, hozir ishlayapti), keyin iOS/Android (Expo, bitta kod bazasi). Ilovada faqat do'kon to'lovi; veb'da Payme, Click, Uzcard/Humo. Kirish: telefon SMS, Google, Apple.
- Budget and constraints: byudjet va muddat noma'lum. Yurist xulosasi kutilmoqda (16 yoshgacha to'lov, ma'lumot joylashuvi). Stol o'yini kartalari/IP buyurtmachiniki (dizayner rasmlari qisman, generator yuzlari ishlatilgan). Jamoa: DARIKO ekotizimi, ishlab chiqish Claude Code orqali.

## Mahsulot holati (2026-11-14, repo asosida)
- Tayyor va deploy qilingan: qoidalar dvigateli (sof TS + testlar), server (Fastify, WebSocket, PostgreSQL; xonalar, navbat, taymer, qayta ulanish, o'yin jurnali, tiklash), veb mijoz (Expo), admin panel, profil/reyting, jonli tahlil (11 nazariya: DuPont, BCG, SWOT va b.), auksion, bank/lombard/halol (islomiy) moliya rejimi, qarz va sheriklik, farzand tug'ilishi bayrami.
- Kontent: katalogda 1033 faol karta, 817 jonli; 32 kasb; 610 yangi karta yuzi generator bilan chizilgan (dizayner rasmlari kelsa almashtiriladi).
- Sayt https://tajriba24.uz ishlayapti; CI/CD avtomatik deploy (VPS, docker compose). 41 ta PR merge qilingan.
- Hali yo'q: iOS/Android do'kon chiqarilishi, to'lovlar, Plus/litsenziya/homiylik/kosmetika (MVP'dan keyin), ta'lim paneli, TURN server.
- Telefon bilan kirishda format tekshiruvi to'liq emas (istalgan to'qqiz raqam kirib ketyapti); SMS provayder (Eskiz) ulanishi sozlanmoqda, hozircha belgilangan kod rejimi bor.
- Ochiq: narxlar, byudjet, muddat, yurist xulosasi (16 yosh, to'lov, ma'lumot joylashuvi), dizayner rasmlari, ba'zi o'yin qoidalari "tasdiq kutilmoqda", 6 soatlik vaqt rejimi qog'oz sinovdan keyin.

## Qat'iy tamoyillar
Natija faqat serverda; katta summalar to'liq yoziladi; kartalar asl rasmi bilan; 16 yoshgacha: to'lov ota-ona tasdig'i bilan, o'zaro qarz/sheriklik va erkin chat yopiq, reklama yo'q; ilovada faqat do'kon to'lovi.

## Noma'lum (tizim to'qimasin)
Foydalanuvchilar soni, stol o'yinining sotuv hajmi, raqobatchilar, byudjet, narxlar, CAC, retention. Bularni "ochiq savol" deb yozing va qaysi skill javob berishini ayting.
