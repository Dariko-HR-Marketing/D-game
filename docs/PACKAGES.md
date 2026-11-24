# Paketlar va narxlar (PILOT, buyurtmachi tasdig'i 2026-11-23)

Sinov (pilot) variant: kerak bo'lsa o'zgartiriladi. Narx va chegaralar **kodda emas**, serverdagi sozlamada (`Commerce.config`), admin panelda («Moliya → Narxlar»). Birinchi ishga tushishda `PILOT_CONFIG` (server/src/commerce.ts) bir marta yoziladi; keyin admin tahrirlaydi, har o'zgarish tarixga tushadi.

## Paketlar
| | Start (bepul) | Plus (obuna) | Premium (obuna) | Tashkilot (o'rinlar) |
|---|---|---|---|---|
| O'yin maydonini ochish | kuniga 1, haftasiga 2, oyiga 6 | 3 / 10 / 30 | cheklovsiz | cheklovsiz |
| Qo'shilish | cheksiz, bepul | ✓ | ✓ | ✓ |
Qolgan imkoniyatlar: `client/src/billing/catalog.ts` (`MATRIX`). Ball pulga almashtirilmaydi; pullik narsa natijaga ta'sir qilmaydi; loot box yo'q; 16 yoshgacha to'lov ota-ona tasdig'i bilan; reklama yo'q.

## Qoidalar
- Limit **o'yin boshlanganda** hisoblanadi (kutish zalida bekor qilingan hisoblanmaydi). Oyna Toshkent vaqti (UTC+5): kun 00:00, hafta dushanba, oy 1-sana.
- Limit tugasa: **kupon** (bitta o'yin ochadi, o'yin boshlanganda sarflanadi), Plus yoki Premium. Server `room_limit` + `detail`, mijoz paywall ko'rsatadi (istalgan paytda yopiladi).
- Obuna tugasa Start'ga tushadi, tarix o'chmaydi.
- Paket: Premium > Plus > Start (`Commerce.plan`). SKU: `plus:monthly|yearly`, `premium:monthly|yearly`, `coupon:1`.

## Pilot narxlari (so'm; taklif, tasdiqlangan)
Asos: Milliy statistika qo'mitasi, 2026-yil yanvar–sentyabr o'rtacha oylik ish haqi 7 274 100; mediana (yanvar–avgust) 4 166 300. Mediananing ulushi: kupon 0,24 %, Plus 1,18 %, Premium 2,38 %.
| Mahsulot | Narx |
|---|---|
| O'yin kuponi (1 ta) | 9 900 |
| Plus oylik / yillik (10 oy to'lov) | 49 000 / 490 000 |
| Premium oylik / yillik (10 oy to'lov) | 99 000 / 990 000 |
| Tashkilot, bir o'rin oyiga | 25 000, chegirma 10/25/50/100 o'rin uchun 0/10/20/30 % |
Mantiq: 49 000 / 9 900 ≈ 5 kupon, ya'ni oyiga ~11 dan ko'p o'yin ochadigan odamga Plus arzonroq; Premium = 2 × Plus.
Tashkilot: 10 o'rin 250 000/oy, 25 o'rin 562 500, 50 o'rin 1 000 000, 100 o'rin 1 750 000; yillik (10 oy): 2 500 000 / 5 625 000 / 10 000 000 / 17 500 000.

## Pilot rejasi (4–6 hafta)
Plus narxini 39 000 / 49 000 / 59 000 variantlarida sinash (tasodifiy taqsimot); kuzatiladigan ko'rsatkichlar: limitga yetganlar ulushi, kupon/Plus/Premium'ga o'tish, kupon:Plus nisbati, bekor qilish (churn), ARPU. Mavjud obunachilar narx o'zgarganda kamida bir yil eski narxda qoladi (taklif). Narx variantlari bo'yicha A/B hali kodda YO'Q (keyingi bosqich).

## Qo'shimcha (2026-11-24)
- **Narx sinovi (A/B)**: `plusMonthlyVariants` (admin «Narxlar va chegaralar»), bo'sh = o'chiq (standart holat). Yoqilsa foydalanuvchi identifikatoridan doimiy variant oladi (taqsimot tasodifiy, 1–5 variant), yillik narx = oylik × 10. Hozir O'CHIQ; yoqish faqat buyurtmachi qarori bilan (turli odamlarga turli narx adolat va ishonch masalasi).
- **Tashkilot murojaati**: Paketlar sahifasida «Murojaat qoldirish» (nom, o'rinlar, aloqa, izoh) → admin «Moliya → Tashkilot murojaatlari» (Yangi / Bog'lanildi / Yopildi). Kuniga 3 tagacha. Shartnoma va o'rinlar qo'lda.

