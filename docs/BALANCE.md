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
| smart | 88.1 % | 12.5 % | 0.05 | 380 / 450 |

"Aylana" = bitta o'yinchining navbatlar soni. Median 384 — SPEC'dagi "taxminan 370 navbat" bilan bir tartibda (qog'oz sinovi bilan solishtirish buyurtmachida).

> **Yangilanish (§5.10 tuzatishlaridan keyin):** 6 ta yangi karta dekalarga qo'shildi (avval hech qachon chiqmasdi) va qarov/inqiroz/qarz qaytishi qoidalari tuzatildi; «smart» qatori shu bilan qayta o'lchandi. G'olib bor o'yinlar ulushi (2.5 % → 12.5 %) 40 o'yinda 1 → 5 o'yin farqi: statistik jihatdan shovqin bo'lishi mumkin, aniq xulosa chiqarilmaydi.

## Xulosa va ogohlantirishlar
1. **Mexanika ishlaydi:** o'ylab o'ynagan o'yinchi kichik aylanadan chiqa oladi; passiv o'yin chiqmaydi; kredit va bozor sotuvi natijaga ta'sir qiladi.
2. **Katta aylana deyarli o'ynalmaydi (g'olib ~2.5 %):** V, X, Y kataklari, kxar dekasi va "chiqib ketish" dekasi qoidasi yo'q (OPEN_QUESTIONS #8, #13, #15), shuning uchun simulyatsiyada ular hech narsa qilmaydi. Natija katta aylana balansi haqida xulosa chiqarishga **yetarli emas**.
3. **Mening taxminlarim natijaga ta'sir qiladi:** bank krediti 36 oyda so'nadi (aks holda qarz hech qachon 0 bo'lmaydi va chiqish mumkin emas); bozor sotuvi har bir o'yinchiga bir marta, mulk `real` qiymati ma'lum bo'lsa; K/Q kataklari ta'sirsiz. Qoidalar aniqlangach qayta o'lchash kerak.
4. **§13 "balans" mezoni** — davomiylik va g'alaba ulushini buyurtmachi qog'oz va ilova sinovi bilan tasdiqlaydi; bu hisobot faqat boshlang'ich nuqta.
5. Bot siyosati oddiy; haqiqiy o'yinchilar strategiyasi (hamkorlik, sheriklik, qarz) hisobga olinmagan.

> **Qayta o'lchash (standart katak qoidalari, 36 oylik inqiroz, sheriklik dividendi, orzu bosqichidan keyin, commit `9f72f04`):** natijalar deyarli o'zgarmadi — passive 0 % / 3.23, naive 0 % / 0.29, smart 88.1 % chiqdi, 12.5 % g'olib, chiqish aylanasi 380 / 450. Simulyator botlari sheriklik va orzu tanlashdan foydalanmaydi, shuning uchun bu yangiliklar balansga bu o'lchovda ta'sir qilmaydi; odam o'yinchilar bilan qog'oz sinovi buyurtmachida.

## O'yin vaqti: oyma-oy (yo'riqnoma va vaqt paneli uchun)
SPEC §5.1: har bir «D» katagidan o'tish yoki tushish — 1 oy (kichik aylanada 4 ta «D» = 4 oy; 3 aylana = 12 oy = 1 yil; inqiroz 9 aylana = 36 oy = 3 yil, §5.7). Katta aylanada oy «Yana pullar» katagida (4 ta). Dvigatel o'yinchi bo'yicha `monthsPlayed` ni sanaydi.

O'lchov: `cd rules && npx tsx sim/sim.ts 60 smart 2500` (smart bot, 60 o'yin, 240 o'yinchi, ≤ 2500 navbat; qayta boshlashlar hisobga olingan):

| Bosqich | Median | 10 % | 90 % | Yil (median) |
|---|---|---|---|---|
| Kichik aylanadan chiqish (boshidan) | 172 oy | 141 | 218 | ≈ 14.3 yil (≈ 43 aylana) |
| Katta aylanada g'alabagacha (chiqqandan keyin) | 58 oy | 38 | 94 | ≈ 4.8 yil |

Ogohlantirishlar: 1) bu bot siyosati — haqiqiy o'yinchilar farq qiladi; 2) faqat chiqqan/yutgan o'yinchilar hisoblanadi (o'lchovda 240 o'yinchidan ~26 % chiqdi, 43 % o'yinda g'olib bor), ya'ni «tez» yo'llar tanlanadi; 3) qoidalar o'zgarsa raqamlar o'zgaradi — `client/src/estimates.ts` ni shu jadvalga mos yangilash kerak. Tasdiq: OPEN_QUESTIONS №114.
