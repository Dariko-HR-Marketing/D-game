# Normativ hujjatlar tekshiruvi — ziddiyatlar reestri va yechimlar

Sana: 2026-10-21. Buyurtmachi yuklagan hamma fayl (qo'llanma lotin/kirill, TZ, arxitektura, yagona spetsifikatsiya, UX/UI V2, maketlar, doskalar, hisob varaqlari, 7 ta karta arxivi, kupyuralar) normativ deb qabul qilindi va mavjud tizim (CLAUDE.md, SPEC.md, qoidalar dvigateli, kontent, mijoz) bilan solishtirildi.
Batafsil dalillar: `docs/audit/` (A1 qo'llanma lotin, A2 qo'llanma kirill, B TZ+arxitektura+yagona spetsifikatsiya, C UX V2+doska, D maketlar, E karta rasmlari). Kartalar CSV (Xarajatlar, Kichik/Katta sarmoyalar, Katta aylana xarajatlari) bilan `cards.json` dasturiy solishtirildi.

## 0. Natija bir qarashda
- **Mos:** kichik aylana 48/48 va katta aylana 53/53 katak (doska, qo'llanma); 28 kasb (maosh, 9 xarajat satri, jami, pul oqimi, jamg'arma, kredit, bola xarajati) 100 %; 418 kartaning soni, tartibi, matni va summalari (xarajat, katta xarajat, kichik/katta sarmoya CSV'lari — 0 farq; faqat «100 + 50» yozuvlari yig'indi sifatida saqlangan); bozor 98/98; hodisa 9/9; chegaralar 1 000 000 / 25 000 / 100 000 / 10 000.
- **Hal qilindi (shu PRda):** kasb xarajat satrlari nomlari aniqlandi (hisob varag'ida); «agar bolangiz/mashinangiz bo'lsa» 13 ta karta; №19 «Reklama agenti» rasmi bor; `qqidirmoqda` imlo xatosi; rasmlarni import qiluvchi skript (`deploy/vps/import-cards.py`).
- **Qaror kerak:** quyidagi §1–§3. Har bir band uchun **Tavsiya** — men taklif qiladigan professional yechim; «Qaror» ustuni sizniki.

## 1. Loyiha asosi: hujjatlar o'zaro zid (avval shularni hal qilish kerak)
| № | Mavzu | Zid manbalar | Hozirgi tizim | Tavsiya | Qaror |
|---|---|---|---|---|---|
| D1 | Hujjatlar ustunligi | yagona spetsifikatsiya (9-okt, «ziddiyatda shu amal qiladi»; Claude Docs'da tirik hujjat) ↔ TZ va arxitektura (14-okt) | SPEC.md | Tartib: 1) yozma buyurtmachi qarorlari (shu sessiya) → 2) TZ + arxitektura (MVP) → 3) yagona spetsifikatsiya (ko'rinish va MVP'dan keyingi backlog) → 4) Tajriba24 maketlari. Bitta «Qarorlar reestri» yuritiladi (shu fayl). | ✔ Q1 |
| D2 | Valyuta | «$»: yagona spets., kirill qo'llanma, UX V2, doska; «sh.b.»: TZ («$ ishlatilmaydi»), SPEC, lotin qo'llanma, **hisob varaqlari**, hamma karta matni | sh.b. | **sh.b.** (blanklar va kartalar shunday). `$` faqat tashqi tavsif matnlarida. Valyuta bitta i18n tokenida bo'ladi, keyin bir joydan almashadi. | ✔ Q2 |
| D3 | Yosh cheklovi | yagona spets., TZ, arxitektura: «yosh cheklovi yo'q, yosh tekshiruvisiz himoya» ↔ CLAUDE §2.8 (16 yoshgacha) | `profiles.ts` majburiy tug'ilgan yil | Yurist qarori chiqquncha **himoya saqlansin**, lekin bitta konfiguratsiya bayrog'iga olinadi (`ageRestrictions`); yagona spets.dagi «oilaviy kartalar + 30 tayyor ibora» baribir qo'llanadi. | ✔ Q3 |
| D4 | Kirill yozuvi, Google bilan kirish | yagona spets.: lotin + kirill, telefon/Google; UX V2: «Lotin/Кирилл» tugmasi ↔ CLAUDE §2.2 (faqat lotin) | lotin, telefon | MVP: lotin. Kirill — alohida tarjima jadvali (`uz-Cyrl`) sifatida beta'da (matnlar allaqachon kodda emas). Google — beta; Apple (do'kon siyosati bo'yicha) tekshirilsin. | ✔ Q4 |
| D5 | O'yinchilar soni, rejimlar, davomiylik | yagona spets./V2: 2–8, 8 rejim, 60–180 daq; TZ/arxitektura/kod: 2–6; TZ: 3–8 soat; BALANCE: ≈14 yil | MAX=6, 6 rang | MVP: 2–6 (taxta va 6 fishka rangi shunga qurilgan). 8 ga kengaytirish — konfiguratsiyada qoldiriladi. Rejimlar (tez, reytingli, ssenariy…) — beta; «vaqt» qoidasi (6 soat) hali manbasiz — §16. | ✔ Q5 |
| D6 | Ball, XP, malaka, liga, mukofotlar katalogi, ota-ona paneli, Akademiya, kunlik vaziyat | yagona spets. + V2 maketi (XP/OpenSkill/6 malaka/12 dars) ↔ TZ + SPEC (ball = reyting, har 100 ball = daraja) | SPEC §5.9 | MVP'ga kirmaydi (beta/pilot yo'l xaritasi o'zida shunday). Ball «sarflanadi, sotib olinmaydi, pulga almashtirilmaydi» — CLAUDE §1 bilan mos. | ✔ Q6 |
| D7 | Monetizatsiya | TZ: «ichki to'lovlar yo'q» ↔ yagona spets.: bepul, daromad trening/litsenziya/stol o'yini ↔ SPEC/kod: Plus, kosmetika | `commerce.ts` tayyor | Asosiy o'yin bepul va natijaga ta'sir qilmaydi (hammasi mos). Plus/kosmetika — narx bo'sh, `salesPaused` bayrog'i bilan o'chirib qo'yish mumkin. | ✔ Q7 |
| D8 | Chat | TZ/arxitektura: erkin chat yo'q ↔ yagona spets.: do'stlar xonasida erkin chat + filtr | 4 emoji | MVP: tayyor reaksiyalar/iboralar (TZ: 6 emoji + 4 ibora). Erkin chat — yurist + moderatsiya tayyor bo'lgach. | ✔ Q8 |
| D9 | Profilga jins | arxitektura/TZ: «jins, avatar» ↔ SPEC/kod: yo'q | yo'q | Ixtiyoriy maydon, faqat standart avatar tanlash uchun; ma'lumot eksport/o'chirishga qo'shiladi. | ✔ Q9 |

## 2. O'yin qoidalari: manba va dvigatel o'rtasida (yuqori ta'sir)
| № | Mavzu | Manba | Dvigatel | Tavsiya | Qaror |
|---|---|---|---|---|---|
| R1 ✔ | **Kichik aylanadan chiqish sharti** | qo'llanma, kirill, TZ, yagona spets.: «passiv daromad ≥ 25 000» (xarajat ayrilmaydi); hisob varag'i: «pul oqimi 25 000» | `passiv − barcha xarajat ≥ 25 000` (qattiqroq), `index.ts` | Ziddiyat jiddiy: probada passiv 25 000, xarajat 290 bo'lsa chiqib bo'lmaydi. **Tavsiya: manbalarga ergashish — passiv ≥ 25 000** (+ naqd ≥ 1 000 000 + qarzsiz). Ammo SPEC namunasi («pul oqimi 25 400») va varaqdagi «Passiv daromad (cash flow)» atamasi noaniq — aniq so'z kerak. | ✔ amalga oshirildi: passiv ≥ 25 000 (SPEC §5.4, FinanceCard, hisob varag'i). SPEC namunasi («pul oqimi 25 400») shu bilan mos. |
| R2 ✔ | Chiqishda bizneslar bankka topshiriladi | qo'llanma §10, kirill | topshirilmaydi (`game.ts` 558–564) | Kodlash (Bankrot va katta aylana qarzi «topshiriladigan» kichik bizneslarga tayanadi). | ✔ amalga oshirildi: chiqishda `small_business`/`business` topshiriladi, kvartira/aksiya/yer/avto qoladi; `lockedFlow` topshirishdan oldingi oqim. |
| R3 ✔ | Katta aylanadan qaytish | kirill: **yangi kasb** olinadi, bolalar va mulk qoladi | #95: kasb o'zgarmaydi, ish haqi 0 → daromadsiz «o'lim spirali» | **Kodlash: yangi kasb** (kod hozirgi holatda o'yinchini daromadsiz qoldiradi — xato deb hisoblanadi). | ✔ amalga oshirildi: qarz yopilmasa/Bankrot bilan qaytganda yangi kasb kartasi (maosh va xarajat yangilanadi), naqd/bolalar/mulk saqlanadi. |
| R4 | Kvartira/ipoteka kreditini yopish | kirill §167–171 | harakat yo'q; `a.credit` kamaymaydi, `allDebt` chiqish shartida → ipotekali o'yinchi chiqa olmaydi | Dastlabki baho «xato» edi; tekshiruvda: sotib yopish mumkin (qarang ustun «Qaror»). | Aniqlashtirish: kredit mulk **sotilganda** yopiladi (daromad = narx − kredit) — ipotekali o'yinchi sotib chiqishi mumkin; to'g'ridan-to'g'ri to'lash qoidasi manbada yo'q. Qo'shish kerakmi — tasdiq. |
| R5 | Shartli xarajat kartalari | qo'llanma §07 | hammaga shartsiz | **Tuzatildi** (13 karta: 8 bola, 5 avtomobil). «agar pulingiz bo'lsa» (2 karta, №25 va №27) — ma'nosi noaniq, o'zgarmadi. | ✔ |
| R6 ✔ | Bank to'lovi yaxlitlanishi | qo'llanma kalkulyatori: 5 000 → 139 + 84 = **223**, qoldiq **3 332** | 222,22 va 3 333,33 | Manba kalkulyatoriga ergashish (har qism yuqoriga yaxlitlanadi); «Hisob daftari» tekshiruvi ham shunga mos bo'ladi. | ✔ amalga oshirildi: `bankMonthlyPayment` = ceil + ceil, `bankPrincipalDue` (5 000 → 223, qoldiq 3 332). |
| R7 | Majburiy bozor kartalari, TD, qarovdan voz kechish | kirill §160, §179–193 | ixtiyoriy | Qo'llanma bo'yicha majburiy qilish; QAR №087 va №090 ta'siri tekshirilsin (№087: rasmda majburiy to'lov, JSON `kind` «Sotish imkoniyati»). | ✔ Q12 (qisman amalga oshirildi) |
| R8 | K katagida to'lov usuli tanlovi | qo'llanma §06 | majburiy karta darhol, qarzga yoziladi | Tanlov: naqd/lombard/bank/qarz. | ✔ Q13 |
| R9 | Musodara (2× mulk), «ishonchsiz» (36 oy −50 ball), 3 guvoh, sheriklik «bir juftga 2 ta» | qo'llanma, TZ FR-802/803 | kodlanmagan | Qoidalar dvigateli backlog'iga, testlar bilan. | ✔ Q14 |
| R10 | Birinchi yuruvchi | qo'llanma: kubik bo'yicha | xonaga qo'shilish tartibi | Kubik bo'yicha (serverda, jurnalga yoziladi). | ✔ Q11 (amalga oshirildi) |
| R11 | Imkoniyat katagi 25 000 chegarasi, g'alaba 10 000/100 000, bank muddati «1 yil»/36 oy | manbaning o'zida zid | `<=`, 100 000, 36 oy | 100 000 va 36 oy saqlanadi (SPEC bilan mos); chegara belgisi (`<`/`≤`) metodika kengashiga. | ✔ Q15 |
| R12 | Karta soni | kirill 455 ↔ 412 + 6 | 418 | 43 ta farq (4 kasb, +20 xarajat, +4 bozor, +9 kichik, +6 katta); 39 tasi tushuntirilmagan — to'liq `donishmand-ota-kartalar.xlsx` kerak. | ✔ Q16 |

## 3. Taxta, kartalar va ko'rinish
| № | Mavzu | Topilma | Tavsiya | Qaror |
|---|---|---|---|---|
| B1 | Doska varianti | «Asl doska» va «Frame236» chap ustunda (10 katak) teskari; tizim Frame236 ga mos | **Asl doskani normativ deb qabul qilish** (nomi shunday); katta aylana i43–i52 teskari, «Nohalol» i47 → i48, `cell_rules.json` kaliti o'zgaradi. Tasdiq kerak. | ✔ Q17 |
| B2 | Harakat yo'nalishi | doskada START strelkalari soat mili teskarisiga; qo'llanma/dvigatel — soat mili bo'yicha; indekslar doskaga soat bo'yicha mos | Bosma nomuvofiqlik deb hisoblanadi, dvigatel o'zgarmaydi. Tasdiq kerak. | ✔ Q17 |
| B3 | Chiqindi zavodi (i6) | doska: «sotish narxi 30 000», JSON/qo'llanma: 1 000 000 | Bosma xato bo'lishi mumkin — doskaning o'zidan tekshirish. | ✔ Q17 |
| B4 | «SHIT HAPPENS!» ↔ «KUTILMAGAN HODISA!» | rasm sarlavhasi 9 old tomonda ham «SHIT HAPPENS!»; CLAUDE §2.6 | Rasm qayta chizilmaydi (§2.5) → ikki yo'l: dizayner qayta chizadi YOKI §2.6 «karta nomi rasmda berilgan» deb o'zgaradi. | ✔ Q18 |
| B5 | UTK: «Uztelekom» (rasm, 5 karta) ↔ «O'zbektelekom» (SPEC) | Dizayner qayta chizadi yoki SPEC o'zgaradi. | ✔ Q18 |
| B6 | Karta rasmlari | 408/418 rasm bor (PNG, 1400–1600 px); kupyuralar 12 ta nominal (500 000 ham bor, 50 000 yo'q); 6 yangi karta rasmi yo'q | `import-cards.py` rasmlarni WebP qiladi (960 px). Qolgan 6 karta — dizayner. | ✔ Q19 |
| B7 | Qimorga yaqin kartalar | `cards.json`: «O'yin avtomatlari saloni» ×2 (KS-037, KS-042), Xarajat_031 ↔ yagona spets.: kazino/lotereya yo'q, 7 karta almashtirilgan | 7 kartalik ro'yxat `donishmand-ota-kartalar.xlsx` da — yuklanmagan; ro'yxatsiz o'zgartirilmaydi. | ✔ Q20 |
| B8 | Hodisa #8 matni | rasm: «kvartira aksiyalari narxi»; JSON: «kvartira va aksiyalar narxi» (qaror bilan aniqlashtirilgan) | Rasmga qaytarish yoki qarorni tasdiqlash. | ✔ Q20 |
| B9 | KV2-012 | yangi CSV: «to'rt xonali», JSON: «ikki xonali» (SPEC §16 ochiq savoli) | Rasmdagi matn bo'yicha hal qilinadi — rasmni ko'rib tasdiqlang. | ✔ Q20 |
| B10 | Katta aylana ekran maketi | burchaklar Y kataklari emas; START yuqori qatorda (asl doskada pastda); V2 telefon maketi 36 katakli halqa | Asl doskaga (16/10/17/10 ustun) moslash — B1 hal bo'lgach. | ✔ Q17 |
| B11 | Summa yozuvi | V2: «$550K», «$3M» ↔ CLAUDE §2.3 «to'liq yoziladi» | §2.3 saqlanadi. | ✔ Q2 |
| B12 | Karta yuzi qayta chizilgan (V2 b.29) | ↔ CLAUDE §2.5 asl rasm | §2.5 saqlanadi: ilova rasmni qayta chizmaydi. | ✔ Q21 |
| B13 | Dizayn tokenlari | xato rangi #B72F40 (V2) ↔ #9E2A30 (theme); fokus halqasi, tugma 52 px, shrift (Manrope yuklanadi, qo'llanmaydi), logo vektori | UX V2 bo'yicha bitta tokenlar jadvali; `fontFamily` ulanadi. | ✔ Q22 |
| B14 | Hisob varag'i | kasb kartasidagi 9 satr nomi aniqlandi | **Tuzatildi.** «Uy ijarasi» va «O'qish xarajatlari» kartada yo'q — bo'sh qatorlar. «Yana pullar» ustuni dvigatelda yo'q. | ✔ |

## 4. Yetishmaydigan materiallar
- `poyga-platforma-tuzilmasi.xlsx` (rollar, ruxsatlar, ball katalogi, qiymatlar) va `donishmand-ota-kartalar.xlsx` (7 almashtirilgan karta, balans) — yagona spetsifikatsiya havola qiladi, yuklanmagan.
- Lotin qo'llanma jadvalida 4 biznes ko'rinmaydi (Ofis mebeli, kiyim tikish, UzDigital TV, gaz quyish) — asl HTML bilan tasdiqlash.
- «Zotdor sigirlar fermasi» (150 000, +120 000/oy, qoplanish 1,25 oy) — 8× chetlanish: asl doska bilan tasdiqlansin.
- 6 ta yangi karta rasmi; «Reklama agenti» rasmi endi bor (yopildi).

## 5. Keyingi qadamlar (qaror kelgach)
1. D1–D9 va B1–B5 ni belgilang → shunga qarab SPEC.md/CLAUDE.md yangilanadi (hujjat tuzatishlari).
2. Dvigatel: R1–R4 (eng muhim), keyin R6–R10, har biri testlar bilan.
3. Doska va katta aylana ko'rinishi (B1, B2, B10).
4. Kupyuralar bilan «sanab to'lash» rejimi (12 nominal, `RULES`dagi son bilan).


## 6. Qabul qilingan qarorlar (2026-10-21, buyurtmachi topshirig'i bilan: «barcha qarorlarni professional qaror qil»)
Qarorlar bosqichma-bosqich amalga oshiriladi; kodda o'zgargani «Amalga oshirildi» deb belgilangan.

**Loyiha asosi**
- **Q1 (D1) Ustunlik.** 1) yozma buyurtmachi qarorlari (shu sessiya), 2) asl qo'llanma (lotin/kirill) — o'yin qoidalari uchun, 3) TZ + arxitektura — MVP texnik talablari, 4) yagona spetsifikatsiya — ko'rinish va MVP'dan keyingi yo'l xaritasi, 5) Tajriba24/D-game maketlari — ko'rinish. Ziddiyatlar shu reestrda yuritiladi.
- **Q2 (D2, B11) Valyuta — «sh.b.».** Blanklar, hamma karta matni, qo'llanma (lotin), TZ shunday. «$» faqat kirill nusxa va maketlarda uchraydi; ilovada ishlatilmaydi. Katta summalar to'liq yoziladi (1 020 000), qisqartma yo'q. Valyuta belgisi i18n tokenida (bitta joydan almashadi).
- **Q3 (D3) Yosh.** Yurist qarorigacha 16 yoshgacha cheklovlar saqlanadi (CLAUDE §2.8). Yagona spetsifikatsiyadagi himoya choralari (oilaviy kartalar, 30 ta tayyor ibora, ota-ona paneli) MVP'dan keyin qo'shiladi. Yurist «yosh tekshiruvisiz» ni tasdiqlasa — cheklov bitta konfiguratsiya bayrog'i bilan o'chiriladi.
- **Q4 (D4) Til va kirish.** MVP: lotin + telefon/SMS. Kirill — alohida tarjima jadvali (beta), Google bilan kirish — beta, Apple — do'kon siyosati tekshirilgach.
- **Q5 (D5) O'yinchilar.** 2–6 (taxta 6 fishka rangi; qo'llanma shunday). 8 gacha kengaytirish — konfiguratsiya, beta natijasidan keyin. Rejimlar (tez, reytingli, ssenariy, oilaviy, trener) — beta. Davomiylik qiymatlari manbada zid (3–8 soat / 60–180 daqiqa / ≈14 yil): ilovada ko'rsatilmaydi, «6 soatlik rejim» qoidasi §16 da.
- **Q6 (D6) Ball, XP, malaka, liga, mukofotlar katalogi, ota-ona paneli, Akademiya, kunlik vaziyat.** MVP'ga kirmaydi (yagona spetsifikatsiya yo'l xaritasida beta/pilot). Ball «sarflanadi, sotib olinmaydi, pulga almashtirilmaydi» — CLAUDE §1 bilan mos.
- **Q7 (D7) Monetizatsiya.** Asosiy o'yin bepul va natijaga ta'sir qilmaydi; Plus/kosmetika/turnir tayyor, narxlar bo'sh; `salesPaused` bayrog'i bilan o'chirib qo'yiladi.
- **Q8 (D8) Chat.** MVP: tayyor reaksiyalar. Erkin chat — yurist va moderatsiya tayyor bo'lgach.
- **Q9 (D9) Jins.** Amalga oshirildi: ixtiyoriy maydon (Erkak/Ayol; qayta bosilsa bekor), faqat standart avatarning soch uslubi uchun (ayol — uzun); xona ko'rinishida avatar uchun beriladi, matn sifatida ko'rsatilmaydi; profil eksporti va hisobni o'chirish bilan birga ketadi (migratsiya 008).

**Qoidalar**
- **Q10 (R1–R6).** Amalga oshirildi (qarang №130).
- **Q11 (R10) Birinchi yuruvchi kubik bo'yicha.** Amalga oshirildi: o'yin boshida har bir o'yinchi kubik tashlaydi, eng kattasi boshlaydi, tenglar qayta tashlaydi; tur boshlovchidan hisoblanadi; natija urug'dan aniq (jurnaldan qayta o'ynash mos). Eski o'yinlar o'zgarmaydi.
- **Q12 (R7) Majburiy bozor kartalari.** Amalga oshirildi: «aksiyalar kuyib ketadi» (№60, 65, 66, 69) va eski uy kompensatsiyasi (№91–94) — mos aktivi borlar uchun sotuv avtomatik; QAR №87 — majburiy to'lov (ma'lumotdagi xato tuzatildi), №90 — qarov egalariga +25 000 (meros kvartira sotuvi). Qolgan: tasodifiy tushum (TD) hamma uchun ixtiyoriy qoladi (qo'llanma bilan bu band alohida tekshiriladi).
- **Q13 (R8) K katagida to'lov usuli.** Hozirgi tartib saqlanadi: naqd, yetmasa avtomatik bank krediti (limit ichida), keyin qarz (10 000 gacha). Sabab: tanlov oynasi vaqt cheklangan o'yinda qaror yukini oshiradi va «Hisob daftari» bilan ziddiyat tug'diradi; qo'llanmadagi natija (yetmasa qarz) bir xil.
- **Q14 (R9) Musodara, «ishonchsiz» 36 oy, 3 guvoh, sheriklik «bir juftga 2 ta».** Dvigatel backlog'ida (testlar bilan), keyingi bosqich: manbaning aniq matni (guvohlar, musodara muddati) talab qilinadi; o'ylab topilmaydi.
- **Q15 (R11)** 100 000 g'alaba va 36 oylik bank muddati saqlanadi; «25 000» chegarasi hozirgi `≤`; metodika kengashi aniqlashtirguncha o'zgarmaydi.
- **Q16 (R12) Karta soni.** Bizning 418 ta karta: kasb, xarajat, kichik/katta sarmoya, bozor, hodisa barcha rasm va CSV bilan mos tekshirildi (0 farq). Kirill manbadagi 455 ga yetmaydigan 43 tasi (4 kasb, 20 xarajat, 4 bozor, 9 kichik, 6 katta) uchun matn berilmagan — to'liq `donishmand-ota-kartalar.xlsx` bilan.

**Taxta va kartalar**
- **Q17 (B1, B2, B3, B10) Doska.** Hozirgi tartib saqlanadi: qo'llanmadagi taxta rasmi (chap ustun: Nohalol yuqoridan 6-o'rinda), SPEC B ma'lumoti va «Frame236» bir-biriga mos; «asl doska» PDF'da chap ustun teskari (Nohalol 5-o'rinda) — bir manba va qolgan uchtasiga zid. Harakat qo'llanma va taxta strelkasi bo'yicha «soat mili bo'yicha»; doskadagi START strelkasi bosma nomuvofiqlik. Chiqindi zavodi: 1 000 000 (qo'llanma va ma'lumot; doskadagi «30 000» sotish narxi bosma xato). Buyurtmachi asl doskani jismoniy taxta bilan solishtirib teskarisini tasdiqlasa, `board_big.json` va `cell_rules.json` kaliti i43–i52 bo'yicha aylantiriladi (kichik ish).
- **Q18 (B4, B5) Karta nomlari.** Rasm qayta chizilmaydi (CLAUDE §2.5): hodisa kartalari rasmida «SHIT HAPPENS!», UTK kartalarida «Uztelekom» yozilgan — bu rasmning bosma matni. Ilova o'z matnlarida «KUTILMAGAN HODISA!» va «O'zbektelekom» ishlatadi (§2.6, SPEC). Dizayner rasmlarni almashtirgach (§16) ikkilik yo'qoladi.
- **Q19 (B6) Rasmlar.** 408/418 karta rasmi bor; 6 ta yangi karta rasmi dizayner ishi. Rasmlar `import-cards.py` bilan WebP'ga, serverga qo'lda yuklanadi.
- **Q20 (B7, B8, B9) Karta matnlari.** KV2-012: kartada «to'rt xonali», kod KV2 va narx (35 000) ikki xonalini bildiradi — ma'lumotda «ikki xonali» saqlanadi (avvalgi qaror), rasm xatosi dizayner ro'yxatiga. Hodisa №8: ma'lumotdagi aniqlashtirilgan matn saqlanadi. «O'yin avtomatlari saloni» ×2 va Xarajat_031 — yagona spetsifikatsiyadagi 7 ta almashtirilgan karta ro'yxati kelgunga qadar o'zgartirilmaydi.
- **Q21 (B12)** Karta yuzi asl rasm bilan chiqadi (§2.5), summalar ilova matnida bo'shliq bilan formatlanadi.
- **Q22 (B13) Dizayn tokenlari.** UX V2 bo'yicha bitta tokenlar jadvali (xato rangi, fokus halqasi, tugma balandligi, shrift) — navbatdagi dizayn ishi.
- **Q23 Karta raqamlari (rasm ↔ ma'lumot).** Kichik sarmoya 82/82 va katta sarmoya 83/85 to'liq mos (KS 51/51, KV 25/26, DX 7/8; `docs/audit/F_*`, `G_*`). Ikki farq — KV4-006 (rasmda kredit 90 000, ma'lumotda 80 000: 20 000 + 90 000 ≠ 100 000) va DX-005 (rasmda bo'nak 3 500, ma'lumotda 15 000) — rasmning ichki xatosi; avvalgi qaror bo'yicha **ma'lumot to'g'ri** (hisob ichki mantiqqa mos), rasm dizayner ro'yxatiga. Kontent testiga «bo'nak + kredit = to'liq qiymat» tekshiruvi qo'shildi.
