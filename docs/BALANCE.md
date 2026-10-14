# Balans simulyatsiyasi (SPEC §5.11, §13)

Ishga tushirish: `cd rules && npx tsx sim/sim.ts [o'yinlar] [passive|naive|smart] [maks_navbat]`.
Simulyator `rules` dvigatelining o'zini ishlatadi (alohida nusxa yo'q). 2–6 o'yinchi, urug' 1..N, har bir o'yin ≤ 2500 navbat.

## Bot siyosatlari
- **passive** — hamma ixtiyoriy kartani o'tkazadi (nazorat guruhi).
- **naive** — naqdi yetsa hammasini qabul qiladi, kreditdan foydalanadi.
- **smart** — faqat oylik pul oqimini oshiradigan aktivni oladi (kredit foizi hisobga olinadi), qimmatli bozor sotuvlarini ishlatadi.

## Natija (40 o'yin, 160 o'yinchi, ≤ 2500 navbat)
| Siyosat | Kichik aylanadan chiqdi | G'olib bor o'yinlar | Qayta boshlash / o'yinchi | Chiqish aylanasi (median / P90) |
|---|---|---|---|---|
| passive | 0 % | 0 % | 3.24 | — |
| naive | 0 % | 0 % | 0.26 | — |
| smart | 88.1 % | 2.5 % | 0.05 | 384 / 439 |

"Aylana" = bitta o'yinchining navbatlar soni. Median 384 — SPEC'dagi "taxminan 370 navbat" bilan bir tartibda (qog'oz sinovi bilan solishtirish buyurtmachida).

## Xulosa va ogohlantirishlar
1. **Mexanika ishlaydi:** o'ylab o'ynagan o'yinchi kichik aylanadan chiqa oladi; passiv o'yin chiqmaydi; kredit va bozor sotuvi natijaga ta'sir qiladi.
2. **Katta aylana deyarli o'ynalmaydi (g'olib ~2.5 %):** V, X, Y kataklari, kxar dekasi va "chiqib ketish" dekasi qoidasi yo'q (OPEN_QUESTIONS #8, #13, #15), shuning uchun simulyatsiyada ular hech narsa qilmaydi. Natija katta aylana balansi haqida xulosa chiqarishga **yetarli emas**.
3. **Mening taxminlarim natijaga ta'sir qiladi:** bank krediti 36 oyda so'nadi (aks holda qarz hech qachon 0 bo'lmaydi va chiqish mumkin emas); bozor sotuvi har bir o'yinchiga bir marta, mulk `real` qiymati ma'lum bo'lsa; K/Q kataklari ta'sirsiz. Qoidalar aniqlangach qayta o'lchash kerak.
4. **§13 "balans" mezoni** — davomiylik va g'alaba ulushini buyurtmachi qog'oz va ilova sinovi bilan tasdiqlaydi; bu hisobot faqat boshlang'ich nuqta.
5. Bot siyosati oddiy; haqiqiy o'yinchilar strategiyasi (hamkorlik, sheriklik, qarz) hisobga olinmagan.
