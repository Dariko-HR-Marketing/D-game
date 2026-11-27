# ISH REJASI — bajarilmagan va rejalashtirilgan ishlar (2026-11-27)

> Manba: suhbat davomidagi topshiriqlar, `docs/OPEN_QUESTIONS.md`, `docs/PLAN_QARZ_SHERIKLIK_UX.md`, SPEC. Holat belgilari: ✅ bajarilgan va jonli · 🟡 kod tayyor, yoqilmagan/sinalmagan · ⛔ sizdan qaror/material/sozlama kerak · 🔲 hali qilinmagan · ⏸ to'xtatib turilgan.
> Qoida: SPEC o'zgarmaydi; narx, raqam va qoida o'ylab topilmaydi. «Boshla» deguningizcha yangi katta ish boshlanmaydi.

## 0. Hozir jonli (✅, qisqacha)
Obuna darvozasi va profilda ijtimoiy tarmoqlar (4 tarmoq, yulduzcha) · oferta va rozilik tizimi (yoqilmagan, qarang 🟡) · 7 kunlik cheklovsiz davr (yangi profillarga) · bozor taklifi oynasi · orzular katta aylanadagi «O» kataklarda · tik planshet moslashuvi · Do'kon `[object Object]` xatosi tuzatildi · ovoz uchun aniq xato xabari va admin belgisi · matoviy adaptiv fon · avtomatik deploy (GitHub → server) ishlaydi.

## 1. ⛔ SIZDAN KERAK (shu bo'lmaguncha oldinga yurib bo'lmaydi)

| # | Nima kerak | Nimani ochadi |
|---|---|---|
| 1 | **TURN serverini yoqish** (serverda `.env`: `TURN_SECRET`, `TURN_URLS`, `TURN_REALM`, `TURN_EXTERNAL_IP`; `docker compose --profile turn up -d turn`; portlar 3478, 5349, 49152–49452) | Turli tarmoqdagi o'yinchilar bir-birini eshitadi |
| 2 | **Qarz/sheriklik 6 ta savol** (PLAN_QARZ_SHERIKLIK_UX §7): qarz so'rovi eskirishi, bekor qilish, qisman to'lov, nomzod <3, beruvchiga oluvchi holati, sheriklik takliflari vaqti | Qarz va sheriklik UX ni boshlash |
| 3 | **«Boshla» buyrug'i** qarz/sheriklik uchun | Shu bosqichlar |
| 4 | **Orzu qoidasi:** birovning orzu katagiga tushsam nima bo'ladi; joylashuv tasodifiymi/qat'iymi (OQ 230) | Orzu kataklari mantig'i |
| 5 | **Katta aylana «ishchilar»:** nima qilish kerakligini yozma yoki rasmga belgilab | Katta aylana yangi imkoniyati (SPEC'da yo'q) |
| 6 | **Yurist:** oferta + maxfiylik tasdig'i, shaxsiy ma'lumotlar qonuni, bazani ro'yxatdan o'tkazish/lokalizatsiya, 16 yoshgacha | `OFFER_VERSION` ni yoqish |
| 7 | **Obuna sozlamalari:** `GATE_TG_GROUP` (+ bot guruhda admin), `GATE_FB_URL`, **`SOCIAL_STAR_XP` qiymati** | Guruh majburiyligi, Facebook, yulduzcha XP |
| 8 | **Instagram:** Meta ilovasi + App Review + kalitlar; **YouTube:** Google tekshiruvi + `GATE_YT_*` | Instagram/YouTube haqiqiy tekshiruvi |
| 9 | **SMS (Eskiz):** hisob, nik, shablon, balans | Haqiqiy SMS kirish |
| 10 | **To'lov:** Payme/Click shartnomasi (yuridik shaxs), IKPU/QQS/STIR, sandbox kalitlari | Haqiqiy to'lov, fiskalizatsiya |
| 11 | **Google (`GOOGLE_CLIENT_ID`), email yuboruvchi (`EMAIL_HTTP_*`)** | Google/email bilan kirish |
| 12 | **SPEC §16 qarorlari:** 4 yangi kasb narxlari; «tasdiq kutilmoqda» qoidalari (§5.6); 6 soatlik vaqt rejimi; V katagi (kubik); korxona nomi | O'yin qoidalarining yopiq joylari |
| 13 | **Mavjud o'yinchilarga ham 7 kun berilsinmi?** (OQ 227) | Trial qamrovi |
| 14 | Reklama video: `assets.vidiq.com` hostini sessiya tarmog'iga ruxsat etish (yoki boshqa ovoz manbai) | 70 s video |
| 15 | Turnirlar tahlili: 8 ta ochiq savolga javob (artifact `5abVnDXAgJm5kevwFj6t2e`) | Turnirlar kengaytmasi |

## 2. 🟡 Kod tayyor, faqat sozlama/sinov kerak
- **Oferta roziligi:** `OFFER_VERSION` bo'sh = o'chiq. Yoqilsa, hamma yangi o'yin ochish/qo'shilishdan oldin rozilik beradi. Yurist tasdiqlaguncha yoqilmaydi.
- **Obuna darvozasi:** Telegram jonli ishlaydi (kanal); guruh, Instagram, YouTube — yuqoridagi kalitlar bo'yicha. Facebook faqat o'z tasdig'i bilan («tasdiqlanmagan»).
- **Payme/Click, Google, email, Eskiz:** hujjat bo'yicha yozilgan, sandbox/haqiqiy kalit bilan solishtirilmagan.
- **Plus narxi A/B**, tashkilot murojaati, klublar, Premium «Qaror tahlili»: bor; narxlar konfiguratsiyada bo'sh/pilot.
- **Admin:** «Rozilik va ma'lumotlar», «Obuna darvozasi», «SMS tayyorligi», ovoz TURN belgisi, test ssenariylari — tayyor.

## 3. 🔲 Bajarilmagan ishlar (men qila oladiganlar; ba'zilari yuqoridagi qarorga bog'liq)

### 3.0 ⚠ TEZ TUZATILADIGAN XATO (birinchi navbat)
- 🔲 **Bozor taklifi narxi:** yer «sotixiga» taklifi sotix soniga ko'paytirilmaydi (20 sotixli yer 16 000 o'rniga 800 ga sotiladi); transport (+40 %) taklifida hisob qatori ko'rinmaydi. Tahlil: `docs/XATO_BOZOR_NARX.md`. «Boshla» deganda **birinchi** shu tuzatiladi.

### 3.1 Qarz, sheriklik, bank — shaxsiy UX/UI (eng katta)
Reja tayyor: `PLAN_QARZ_SHERIKLIK_UX.md` (7 bosqich: asos → qarz oluvchi → beruvchi/guvoh → sheriklik → qarzlarni boshqarish → bank/lombard → yakun). **Boshla** + 6 savol javobi kerak.

### 3.2 Ovoz
- 🔲 Telefon ilovasida (iOS/Android) ovoz yo'q — faqat veb. Kerak: `react-native-webrtc` moduli, ruxsatlar, sinov. (Katta ish, alohida qaror.)
- 🔲 TURN yoqilgach: ikki xil tarmoqda (Wi-Fi + mobil internet) haqiqiy sinov va hisobot.

### 3.3 Vizual tekshiruv (ekranda hali ko'rilmaganlar)
- 🔲 **Profil → «Ijtimoiy tarmoqlar» va «Rozilik va maxfiylik», rozilik oynasi** — hech qachon skrinshot bilan ko'rilmagan.
- 🔲 Do'kon, Sinf, Turnirlar, Paketlar, Klublar — planshet o'lchamlarida; «Sinf paneli» (skript eskirgan, moslash kerak).
- 🔲 Tik planshet uchun ikki ustunli tartib; 2560+ ekranda ish yuzasini to'ldirish (taxta balandlikka bog'langan).
- 🔲 Fon: Reyting, Qoidalar, Profil sahifalari o'z oq foni bilan (fon faqat bosh sahifa va o'yinda). Yuz ko'rinishi darajasi — sizning bahoingiz.
- 🔲 Qo'lda qulaylik tekshiruvi: VoiceOver/TalkBack, klaviatura fokus tartibi, 200 % masshtab (OQ 45).

### 3.4 O'yin qoidalari va kontent (SPEC'ga bog'liq)
- 🔲 Hamkorlik qarzi: «Ishonchsiz» belgisi va −50 ball (OQ 21, «tasdiq kutilmoqda»).
- 🔲 Qarz berishda «tasdiqlanmagan telefon/guvoh» cheklovi (OQ 102, N47).
- 🔲 Telefon raqam formati bilan kirish (OQ 174: +998? SMS tasdig'i?) — alohida topshiriq sifatida kutilgan.
- 🔲 Orzu katagi qoidasi va joylashuvi (yuqorida 4-band).
- 🔲 Sinf/turnir: o'yin tugaganda avtomatik natija bildirishnomasi; o'qituvchi ko'p sinfli hisobot; turnir pley-off (OQ 106).
- 🔲 Ijtimoiy yulduzcha XP ga ta'siri (qiymat kerak).
- ⏸ **Turnirlar kengaytmasi** (A korporativ, B liga, C maktab marafoni) — tahlil bor, kod yo'q.
- ⏸ **Reklama video** (#25): 30 s yuborilgan; 70 s — animatsiya tayyor, diktor yaratilgan, yuklab olish bloklangan.

### 3.5 Chiqarish va infratuzilma
- 🔲 iOS/Android ilova chiqarish: Expo build, do'kon to'lovlari (App Store/Google Play), ilovada YouTube tekshiruvi. **Xavf:** do'konlar majburiy ijtimoiy obunani cheklashi mumkin — yurist bilan tekshirish.
- 🔲 `/opt/poyga` bilan compose nomi to'qnashuvi (`vps`) aniqlanishi kerak (bir serverda ikki loyiha).
- 🔲 Zaxira nusxa va tiklashni haqiqiy sinash; «baza shifrlangan» da'vosi tekshirilmagan (oferta/maxfiylikda yozilmagan).
- 🔲 CI `ui` ishi ~30 daqiqa: parallellashtirish/optimallashtirish (har PR uchun kutish uzun).
- 🔲 Ma'lum beqaror a11y: o'yin ekranida `aria-live` elementi (#a9b3bb) kontrasti ba'zan 2.13 bo'ladi (bir marta CI'da, qayta yurishda o'tgan).
- 🔲 Eskirgan tekshiruv skriptlari (`axe-biz.ts` «Sinf maydoni» matni) yangilash.
- 🔲 Deploy tekshiruvini avtomatlashtirish: jonli yo'llar (`/ready`, 401 lar, veb-paket matnlari) skripti — har deploydan keyin.

### 3.6 Admin
- 🔲 7 kunlik davr uchun admin ko'rinishi (nechta o'yinchi sinov davrida, `TRIAL_DAYS` admin sozlamasi) — hozir faqat serverda sozlanadi.
- 🔲 Oferta versiyasini admin paneldan yoqish/o'chirish (hozir `.env`).

## 4. Tavsiya etilgan tartib (kelishilgandan keyin)
1. **Sizning 15 band** javoblari/materiallari (eng birinchi: 1, 2, 6, 7, 13).
2. **Faza A (tez, past xavf):** vizual tekshiruv (3.3) + topilgan xatolarni tuzatish; deploy skripti; eskirgan skriptlar; CI tezlashtirish.
3. **Faza B (asosiy):** qarz/sheriklik/bank UX (3.1), 7 bosqich, har biri alohida PR + deploy + jonli hisobot.
4. **Faza C:** orzu va katta aylana qoidalari (javoblarga qarab); sinf/turnir bildirishnomalari; telefon formati; «Ishonchsiz» belgisi.
5. **Faza D (katta):** native ovoz, ilova chiqarish, to'lov/SMS/Google/email haqiqiy ulash (kalitlar kelgach).
6. **Faza E:** turnirlar kengaytmasi, video (blok yechilgach).

Har fazada: qoidalar dvigateli o'zgarmaydi (SPEC'dan tashqari), testlar o'tadi, CI yashil, avtomatik deploy, jonli tekshiruv va o'zbekcha hisobot.
