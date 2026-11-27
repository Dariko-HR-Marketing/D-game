# Buyurtmachi qarorlari va talablari (2026-11-27) — «Boshla» deganda bajariladi

> Buyurtmachi: «Boshla deganimdan keyin boshlaysan. Hozirgacha ma'lumotlarni taqdim etib boraveraman.» Shuning uchun **hech narsa kodlanmagan**; bu hujjat — yagona manba. Qarorlar SPEC §5.5 / §5.6 / §2 ga «Boshla»da sana bilan kiritiladi. Quyida: ✅ qaror aniq · ❓ aniqlashtirish kerak · ⚠ hozirgi jonli holat qarorga zid.

## A. TUZATILGAN TUSHUNCHALAR (men noto'g'ri tushungan edim)
1. **«Ishchilar» degan so'zni buyurtmachi ishlatmagan** — bunday mexanika yo'q (oldingi savol Q10 bekor qilindi, rejadan olib tashlandi).
2. **«Katta aylana» haqidagi gap UX/UI va barcha qurilmalarga moslashish haqida edi**, qoida haqida emas: katta aylana ekranlari (taxta, kataklar, oynalar) hamma qurilmada (telefon, planshet, kompyuter, ultra-keng) to'g'ri joylashsin.
3. «Orzu qoidasi nima?» — savol emas edi; qaror: **asl qoidaga qaytiladi** (qarang B).

## B. ORZU (✅ qaror)
1. **G'alaba — asl qoida:** orzu **faqat o'z katagida**, **faqat naqd** bilan (oqim ≥ 100 000 va naqd ≥ orzu narxi). **Boshqaning orzusi katagiga** tushsa → **Katta aylana xarajat kartasi**. (Manba: qo'llanma K:148, 253–254; `cell_rules.json` O → `drawDeck kxar`.) Qaror 156 («istalgan O katak») **bekor**.
2. **Tanlash:** o'yin boshlanishidan oldin har o'yinchi **40 ta orzudan bittasini** tanlaydi (≤ 8 o'yinchi, takrorlanmaydi).
3. **Joylashtirish:** katta aylanadagi **14 ta orzu katagiga** o'yinchilar tanlagan orzular **albatta** joylashadi; **qolgan kataklarga tanlanmagan orzular tasodifiy** joylashadi (bo'sh katak yo'q — 14 katakning hammasida orzu bor).
4. **Katak bosilganda:** qanday orzu, **kim tanlagani**, summasi chiqadi.
5. ⚠ **Hozirgi kod:** joylashuv faqat mijozda va faqat ko'rsatish uchun (tanlanmaganlar «bo'sh»), g'alaba esa hali «istalgan O katak». **Kerak:** joylashuv **serverda** (qoidalar dvigatelida, xona boshlanganda bir marta, tasodifiy), chunki g'alaba va xarajat kartasi unga bog'liq; mijoz serverdan oladi. Mavjud o'yinlar uchun zaxira: eski qoida yoki joylashuv yo'q.
6. ❓ **Tanlanmagan 6 ta orzu** (tasodifiy) — o'sha 40 ta katalogdan olinadi, takrorlanmaydi (tavsiya).

## C. OFERTA (✅ qaror, ⚠ jonli holat zid)
1. **Oferta faqat ro'yxatdan o'tish paytida, qat'iy, bir marta**: yangi ro'yxatdan o'tgan odam rozilik beradi. **Boshqa hech qachon, hech qayerda oferta/rozilik chiqmaydi** (mavjud o'yinchilarga ham, o'yin ochish/qo'shilishda ham).
2. **Obuna (Instagram va Telegram) — faqat o'yin boshlashdan oldin**, ro'yxatdan o'tishda emas.
3. ⚠ **Hozirgi jonli holat qarorga zid:** (a) server o'yin ochish/qo'shilishda rozilikni talab qiladi (`offer_required`), (b) mavjud o'yinchilarga rozilik oynasi chiqadi (`ConsentGate`), (c) `OFFER_VERSION=2026-11-27` standart qiymati bilan yoqilgan, (d) profilda «Rozilik va maxfiylik» bo'limi bor. **Tuzatish («Boshla»da birinchilardan):** talab va oyna olib tashlanadi; ro'yxatdan o'tishdagi katak va uning serverga yozilishi qoladi. Rozilikni qaytarib olish/hisobni o'chirish bo'limini qoldirish yoki olib tashlash — ❓.
4. ✅ **Google bilan yangi ro'yxatdan o'tish (2026-11-27):** oferta roziligi **Google tugmasi bosilishidan oldin** belgilanadi; «Ro'yxatdan o'tish» yorlig'ida Google tugmasi rozilik belgilanmaguncha o'chiq; «Kirish» yorlig'ida (mavjud hisob) oferta yo'q.

## D. OVOZ (TURN)
- ✅ Kod tayyor va jonli: `deploy/vps/enable-turn.sh` (serverda bor). Buyurtmachi o'zi serverda ishga tushiradi: `cd /opt/tajriba24/deploy/vps && bash enable-turn.sh`. Provayder paneldagi devorda 3478 (udp+tcp) va 49152–49452 (udp) ochiladi.

## E. QARZ VA SHERIKLIK (✅ qarorlar)
1. **Qarz so'rovi eskirishi (✅ 2026-11-27, aniqlashtirildi):** so'rov **1 aylana = 4 o'yin oyi** davomida turadi (so'ralgan paytdan hisoblanadi), keyin o'zi yo'qoladi. (Oldingi «1 yil» — noto'g'ri tushunish; o'yin ichidagi aylana.)
2. **3 ta guvoh shart** (kamroq bo'lsa so'rov yuborilmaydi — Q4 = yopiq). Oluvchi 3 guvohni o'zi tanlaydi.
3. **Guvohga modal chiqadi** (kim kimdan qarz so'rayotgani yozilgan): tugmalar **«Guvohman»** va **«Keyinroq»**.
   - **«Guvohman»** — darrov guvohlik tasdiqlanadi.
   - **«Keyinroq»** — modal yopiladi, taklif **«Moliya amallari»** ga o'tadi; guvoh **istalgan vaqtda** tasdiqlashi mumkin.
   - **Guvoh rad eta olmaydi**; hech narsa qilmasa ham bo'ladi (so'rov 3 tasi tasdiqlamaguncha beruvchiga «qabul» ochilmaydi — SPEC).
4. **Oluvchi so'rovni bekor qila oladi** (✅).
5. **Qisman to'lov ruxsat** (✅): oluvchi imkoniyati yetgan summani to'laydi.
6. ❓ **Javob kutilmoqda:** Q5 (beruvchiga oluvchi holati) va Q6 (sheriklik taklifi vaqti) — hali javob berilmagan; tavsiyalar `SAVOLLAR_BATAFSIL.md` da.

## F. YANGI UX/UI TALABLARI (✅, «Boshla»da)
1. **O'yin sarlavhasi (header) hamma qurilmada bir xil:** «Mening kartalarim», «Hisob varag'i», «Tahlil», «Chat» (hozir telefonda to'rt ikonka; kompyuter/planshetda Tahlil va Chat profil menyusida).
2. **O'yin ichidagi profilga ijtimoiy tarmoqlarga ulanish tugmalari** (Telegram, Instagram, YouTube, Facebook).
3. **Katak bosilganda ma'lumot** (kichik va katta aylanada): katta aylanada biznes — qanday biznes, **kimniki**, narxlar, hamma ma'lumot; tavakkal biznes; orzu — qanday orzu va **kim tanlagani**.
4. **7 kunlik cheklovsiz o'yin yaratish** — hisobga olinadi (jonli).
5. **Do'kon va Plus** — professional o'rganib, UX/UI qaytadan.
6. **Paketlar** — mantiqini o'rganib, UX/UI qaytadan.
7. **Klub yaratish** — mantiq va mantiqiy sxemalarni o'rganib, takliflar bilan **chizib (diagramma)** tayyorlash.
8. **Reyting** — premium darajada.
9. **Qoidalar** — professional UX/UI, **infografik** ma'lumotlar bilan.
10. **Profil** — shu davrda qayta ishlash.
11. **O'zaro qarz va sheriklik** — juda qulay UX/UI, mantiq, **infografik**, chiroyli bezak.
12. **Bank, lombard, kredit** — akkordionga olinib, **infografik va animatsiya** bilan professional.
13. **Voqealar (event feed) — batafsil (2026-11-27):** har yurish uchun: **kim yurdi, kubikda nechta tushdi, qaysi karta chiqdi (nom), nima bo'ldi, pul qancha kamaydi/ko'paydi va nima uchun** (sabab); aniq ko'rinishi kerak. Sig'masa kattaroq va **aylanuvchi (scroll)** bo'lishi mumkin; professional ko'rinish. Hozirgi tasma juda qisqa («orzular tanlandi», «kubik bo'yicha birinchi yuradi»).
14. **Katta aylana UX/UI** barcha qurilmalarga moslab joylashtirish (A.2).

## G. BAJARILDI (2026-11-27, PR #95)
- ✅ **Bozor taklifi narxi:** yer «sotixiga» narx sotixga ko'paytiriladi; transport (+40 %) taklifida hisob qatori; inqiroz/garov mijoz–server mosligi (`XATO_BOZOR_NARX.md`, OPEN_QUESTIONS 236).
- ✅ **Reaksiyalar olib tashlandi** (mijoz, server, testlar, SPEC) — OPEN_QUESTIONS 237.
- ✅ **O'yinchilar tepada, voqealar pastda** — hamma qurilmada (OQ 237).

## H. «Boshla»da tavsiya etilgan tartib
1. **Shoshilinch:** C.3 (oferta talabini olib tashlash; yangi o'yinchi uchun Google rozilik tartibi).
2. **Orzu serverda** (B) — qoidalar dvigateli + testlar.
3. **Qarz/sheriklik/bank/lombard** (E, F.11–12) — `PLAN_QARZ_SHERIKLIK_UX.md` bo'yicha.
4. **Header, profil, katak ma'lumoti, voqealar** (F.1–3, F.13).
5. **Do'kon/Plus/Paketlar/Klub/Reyting/Qoidalar/Profil** (F.5–10) — har biri uchun avval qisqa dizayn va tasdiq.
6. Har bosqich: testlar, CI, avtomatik deploy, jonli tekshiruv, o'zbekcha hisobot.
