# Ochiq savollar va qabul qilingan taxminlar

Buyurtmachi qarori kerak (SPEC §16): 4 ta yangi kasb; narxlar; §5.6 "tasdiq kutilmoqda" qoidalari; 6 soatlik vaqt rejimi; V katagi (DICE); yurist masalalari; dizayner materiallari; muddat/byudjet; KV2-012 "ikki xonali"; korxona nomi.

## Muhandislik taxminlari (konfiguratsiyada, o'zgartirish oson)
1. Bank limiti 10 000 — jami bank qarziga qo'llanadi (SPEC "jami"/"bir martalik" aytmaydi).
2. Bank to'lovi yaxlitlanmaydi (yaxlitlash qoidasi berilmagan).
3. Karta rejimi: xarajat (xar, kxar, hod), bozor "majburiy/daromad/xarajat" va yangi IJR/TOSH/Q — majburiy; sotib olish/sotish/aksiya/TD/QAR/MO/XAY/SUG — ixtiyoriy (§5.2).
4. TD ("foydali ish, bir martalik daromad") ixtiyoriy deb olindi.
5. Kichik aylana `Q` kartasi "qarzga so'rayapti" — qarz so'rovi (qaytarish 600); boshqa ikkita `Q` — kolleksiya sotib olish.
6. `real: "?"` (17 ta) — bozor qiymati noma'lum, `null` saqlanadi; shu mulk uchun bozor kartasi narxi ishlatiladi.
7. Xarajat kartasidagi "A + B" yozuvi `amount` yig'indisi bilan tekshirildi (testda).
8. Kichik aylana K ("O'yinni boshidan boshlang!") va Q ("Ishdan bo'shadingiz!") kataklari ta'siri SPEC'da yozilmagan — dvigatelda hali kodlanmagan, buyurtmachi qoidasi kerak.
9. Imkoniyat (I) katagida kichik/katta sarmoya chegarasi: naqd 25 000 gacha — kichik (A ilova: "asl qoidada tekshirilsin").
10. Ipoteka bilan sotib olishda kredit to'lovi (`interest`, manfiy) xarajat sifatida, `rent` passiv daromad sifatida hisoblanadi.
11. Aksiyalar: `share` — bir aksiya narxi deb olindi; aksiya daromadi/narx o'zgarishi qoidasi SPEC'da yo'q (hozircha daromadsiz).
12. Bozor sotish kartalari narxi: mulk kodi bo'yicha moslashtirish (KV1, KV2…), ko'p variantli kartalar (KV1s/KV2s, "Barcha kvartiralar") effektda tuzilmali saqlanadi, dvigatelda qo'llanishi keyingi bosqich.
13. Katta aylana: oy qachon o'tishi SPEC'da yo'q — START (34) dan o'tish = 1 oy deb olindi (`CONFIG.bigMonthOnStartPass`). V, X, Y kataklari va kxar dekasi qachon tortilishi yozilmagan — jurnalga "qoida kutilmoqda" yoziladi.
14. "Ijarachi ketdi": bitta mulkning 1 oylik ijarasi naqddan ayriladi (keyingi oyda olinmagan daromad o'rniga).
15. "Chiqib ketish" (hod, 9 karta) dekasi qaysi katakda tortilishi SPEC'da yo'q — dvigatelda hali dekaga ulanmagan.
16. Majburiy to'lovda naqd yetmasa: avtomatik bank krediti (100 ga yaxlitlab), limitdan oshsa — yangi kasb (§5.3).
17. Balans: oddiy bot 1500 navbatda kichik aylanadan chiqa olmadi (30 o'yin) — §5.11 va §13 "qog'oz sinovi" bilan tekshirilishi kerak.
18. Kirish (SMS/Google/Apple): server `Authenticate` interfeysi orqali ulanadi; hozir faqat dev-token. Xizmat tanlovi va kalitlar buyurtmachidan.
19. Bazaga yozish: `Store` interfeysi bor, MemoryStore ishlaydi; PostgreSQL implementatsiyasi (sxema/migratsiya) keyingi qadam.
20. Sheriklik: "ulush qaytgach 24 oy dividend" tartibi SPEC'da noaniq — hozir faqat 50/50 foyda va egasi tomonidan sotib olish (to'liq narx + 1 oylik foyda) kodlangan; 24 oylik dividend davri va "bepul" variant kodlanmagan.
21. Hamkorlik qarzi muddati (`months`) saqlanadi, lekin to'lov ixtiyoriy bo'lgani uchun jarima/eslatma avtomatikasi yo'q; "Ishonchsiz" belgisi va −50 ball ("tasdiq kutilmoqda") kodlanmagan.
22. Katta aylana mulkiy sheriklik: faqat bir xil aylanadagi o'yinchilar o'rtasida ruxsat (§2.7).
23. Mijoz (Expo, veb bundle ishlaydi): hozir 3 ta ekran (bosh sahifa, xona, o'yin). Prototipdagi 71 ekranning qolgani, 90° burilgan taxta (telefon), karta rasmlari (fayllar yo'q), hamkorlik/bank ekranlari, Google/Apple tugmalari — dizayner materiali va keyingi bosqichlar.
24. iOS/Android qurilishi (EAS) va do'kon hisoblari sandboxda tekshirilmadi; faqat veb eksport va brauzer e2e tekshirildi.
