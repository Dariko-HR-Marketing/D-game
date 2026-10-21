# G: KATTA SARMOYA kartalari rasmlaridagi raqamlar va `content/data/cards.json` (`katta`) solishtiruvi

## Manba qisqacha
- Papka: `norm/z_Kaatta_sarmoyalar/` — 85 ta PNG (1400x900): KS-001..051 (51 biznes), KV*-001..026 (26 kvartira), DX-001..008 (8 dala hovli). `RO'YXAT.csv` va `IZOH.txt` ham bor (IZOH: «ba'zi ko'chmas mulk kartalaridagi hisob-kitoblar manbadagidek qoldirildi»).
- Har bir rasm PIL bilan kontakt varaqlarga (8 tadan, 0.55x) birlashtirilib, Read bilan ko'rildi; barcha raqamlar aniq o'qildi (o'qilmagan raqam yo'q).
- Solishtirilgan JSON: `/home/user/D-game/content/data/cards.json` -> `katta` (85 yozuv). KS uchun `full`/`income`; KV va DX uchun `full`, `down`, `credit`, `interest`, `rent`, `real`.
- Rasmdagi maydonlar: KS — «BOSHLANG'ICH SARMOYA» (= `full`), «DOIMIY DAROMAD / OY» (= `income`). KV/DX — TO'LIQ QIYMAT, BO'NAK, KREDIT, OYLIK FOIZ, IJARA TO'LOVI, HAQIQIY QIYMAT.

## Xulosa
- KS: 51/51 mos (qiymat va daromad).
- KV: 26 kartadan 25 tasi 6 maydon bo'yicha to'liq mos; 1 tasida farq (KV4-006, `credit`).
- DX: 8 kartadan 7 tasi mos; 1 tasida farq (DX-005, `down`).
- Jami: 83/85 to'liq mos, 2 ta maydon farqi (ikkalasi ham JSONda «Foydalanuvchi qarori» `decided` bilan ongli ravishda tuzatilgan; rasm esa manbadagidek xatoli).
- Qo'shimcha: KV2-012 rasmidagi matn «to'rt xonali», JSON matni «ikki xonali» (`note`: «Matn kodga moslandi (qaror)»); raqamlar mos.

## Farqlar (JSON vs rasm)
| Fayl | Maydon | Rasm | JSON | Izoh |
|---|---|---|---|---|
| KV4-006 | KREDIT / `credit` | 90 000 | 80 000 | JSON `decided`: «narx 100 000, to'lov 20 000, kredit 80 000». Rasmda 20 000 + 90 000 = 110 000 != 100 000. JSON ichki jihatdan to'g'ri (20 000 + 80 000 = 100 000), lekin kartaning asl rasmi 90 000 ko'rsatadi (qoida: «kartalar asl rasmi bilan chiqadi» — CLAUDE.md §2.5; rasm va hisoblangan qiymat orasida ko'rinadigan nomuvofiqlik bo'ladi). |
| DX-005 | BO'NAK / `down` | 3 500 | 15 000 | JSON `decided`: «15 000 to'liq naqd». Rasmda 3 500 + 0 (kredit) = 3 500 != 15 000 (to'liq qiymat). Boshqa 7 DX kartada bo'nak = to'liq qiymat, kredit 0. |
| KV2-012 | matn | «Tanishlaringizdan to'rt xonali uyni arzonroq sotib olish» | «ikki xonali» | Raqamlar mos (35 000 / 7 000 / 28 000 / -750 / +500 / 65 000). Kod KV2 (ikki xonali) — rasm matni kod bilan zid; CSV'da ham «to'rt xonali». OPEN_QUESTIONS.md:5 da «KV2-012 "ikki xonali"» sifatida ochiq masala. |

## Ichki mantiqiy xatolar (rasmning o'zida)
1. **KV4-006**: BO'NAK 20 000 + KREDIT 90 000 = 110 000, TO'LIQ QIYMAT 100 000 (farq +10 000). Kredit 20% bo'nak bilan 80 000 bo'lishi kerak edi.
2. **DX-005**: TO'LIQ QIYMAT 15 000, BO'NAK 3 500, KREDIT 0 -> 3 500 + 0 != 15 000 (farq 11 500). Kredit 11 500 bo'lishi yoki bo'nak 15 000 bo'lishi kerak edi; rasmda foiz ham +0, ya'ni kredit bo'lmaydi.
3. Boshqa 32 KV/DX kartada BO'NAK + KREDIT = TO'LIQ QIYMAT bajariladi.

### Qo'shimcha kuzatuvlar (xato deb hisoblanmadi, faqat ma'lumot uchun)
- Bo'nak ulushi: 24 kvartirada 20%; istisnolar — KV1o-004 (8 000 / 30 000 = 26,7%), KV1-008 (7 500 / 30 000 = 25%), KV3-023 (8 000 / 45 000 = 17,8%; 8 000 + 37 000 = 45 000, yig'indi to'g'ri). 20% qoidasi SPEC'da tasdiqlanmagani uchun «xato» deyilmadi.
- OYLIK FOIZ kreditga mutanosib emas (kredit/foiz nisbati 1,15% .. 2,75%): masalan KV1-007 (kredit 28 000 -> -400), KV1s-010 (28 000 -> -650), KV2-012 (28 000 -> -750), KV1o-019 (28 000 -> -750); KV4-018 (kredit 96 000 -> -1 100) KV4-006 (90 000 -> -1 300)dan kam. Manbadagidek qoldirilgan (IZOH.txt); hisoblash formulasi sifatida emas, kartadagi qat'iy raqam sifatida ishlatilishi kerak.
- HAQIQIY QIYMAT har doim TO'LIQ QIYMATdan katta (kvartira), DX da «?» (barcha 8 kartada) — JSON `real: "?"` bilan mos; o'yinda bitim qiymati noma'lum bo'lib, dvigatel `real` qiymatini kutmasligi (yoki «?» ni alohida ishlashi) kerak.
- Oylik foiz kvartiralarda manfiy (-), ijara musbat (+), DX da `+0`/`+0`.

## Jadval: KS (biznes) — fayl | rasm (BOSHLANG'ICH SARMOYA / DAROMAD) | JSON (`full` / `income`) | natija
| Fayl | Rasm | JSON | Natija |
|---|---|---|---|
| KS-001 | 220 000 / 6 000 | 220 000 / 6 000 | mos |
| KS-002 | 780 000 / 45 000 | 780 000 / 45 000 | mos |
| KS-003 | 270 000 / 9 000 | 270 000 / 9 000 | mos |
| KS-004 | 170 000 / 7 000 | 170 000 / 7 000 | mos |
| KS-005 | 310 000 / 7 000 | 310 000 / 7 000 | mos |
| KS-006 | 1 500 000 / 50 000 | 1 500 000 / 50 000 | mos |
| KS-007 | 240 000 / 4 500 | 240 000 / 4 500 | mos |
| KS-008 | 50 000 / 5 000 | 50 000 / 5 000 | mos |
| KS-009 | 250 000 / 4 000 | 250 000 / 4 000 | mos |
| KS-010 | 170 000 / 12 000 | 170 000 / 12 000 | mos |
| KS-011 | 190 000 / 7 000 | 190 000 / 7 000 | mos |
| KS-012 | 330 000 / 11 000 | 330 000 / 11 000 | mos |
| KS-013 | 550 000 / 17 000 | 550 000 / 17 000 | mos |
| KS-014 | 320 000 / 12 000 | 320 000 / 12 000 | mos |
| KS-015 | 120 000 / 2 500 | 120 000 / 2 500 | mos |
| KS-016 | 750 000 / 40 000 | 750 000 / 40 000 | mos |
| KS-017 | 210 000 / 3 500 | 210 000 / 3 500 | mos |
| KS-018 | 210 000 / 8 700 | 210 000 / 8 700 | mos |
| KS-019 | 550 000 / 11 000 | 550 000 / 11 000 | mos |
| KS-020 | 250 000 / 8 000 | 250 000 / 8 000 | mos |
| KS-021 | 150 000 / 1 000 | 150 000 / 1 000 | mos |
| KS-022 | 290 000 / 4 000 | 290 000 / 4 000 | mos |
| KS-023 | 250 000 / 11 000 | 250 000 / 11 000 | mos |
| KS-024 | 1 500 000 / 70 000 | 1 500 000 / 70 000 | mos |
| KS-025 | 300 000 / 14 000 | 300 000 / 14 000 | mos |
| KS-026 | 170 000 / 12 000 | 170 000 / 12 000 | mos |
| KS-027 | 770 000 / 27 000 | 770 000 / 27 000 | mos |
| KS-028 | 700 000 / 25 000 | 700 000 / 25 000 | mos |
| KS-029 | 1 350 000 / 55 000 | 1 350 000 / 55 000 | mos |
| KS-030 | 140 000 / 7 000 | 140 000 / 7 000 | mos |
| KS-031 | 100 000 / 4 000 | 100 000 / 4 000 | mos |
| KS-032 | 60 000 / 2 500 | 60 000 / 2 500 | mos |
| KS-033 | 250 000 / 17 000 | 250 000 / 17 000 | mos |
| KS-034 | 22 000 / 1 200 | 22 000 / 1 200 | mos |
| KS-035 | 120 000 / 7 000 | 120 000 / 7 000 | mos |
| KS-036 | 240 000 / 5 000 | 240 000 / 5 000 | mos |
| KS-037 | 180 000 / 12 000 | 180 000 / 12 000 | mos |
| KS-038 | 90 000 / 7 000 | 90 000 / 7 000 | mos |
| KS-039 | 45 000 / 5 500 | 45 000 / 5 500 | mos |
| KS-040 | 75 000 / 6 000 | 75 000 / 6 000 | mos |
| KS-041 | 55 000 / 3 500 | 55 000 / 3 500 | mos |
| KS-042 | 90 000 / 7 000 | 90 000 / 7 000 | mos |
| KS-043 | 50 000 / 3 000 | 50 000 / 3 000 | mos |
| KS-044 | 80 000 / 5 000 | 80 000 / 5 000 | mos |
| KS-045 | 150 000 / 12 000 | 150 000 / 12 000 | mos |
| KS-046 | 55 000 / 4 000 | 55 000 / 4 000 | mos |
| KS-047 | 170 000 / 6 500 | 170 000 / 6 500 | mos |
| KS-048 | 210 000 / 6 000 | 210 000 / 6 000 | mos |
| KS-049 | 75 000 / 5 500 | 75 000 / 5 500 | mos |
| KS-050 | 160 000 / 9 000 | 160 000 / 9 000 | mos |
| KS-051 | 20 000 / 1 100 | 20 000 / 1 100 | mos |

## Jadval: KV (kvartira) — fayl | rasm (to'liq / bo'nak / kredit / foiz / ijara / haqiqiy) | JSON (`full`/`down`/`credit`/`interest`/`rent`/`real`) | natija
| Fayl | Rasm | JSON | Natija |
|---|---|---|---|
| KV2s-001 | 35 000 / 7 000 / 28 000 / -650 / 200 / 60 000 | 35 000 / 7 000 / 28 000 / -650 / 200 / 60 000 | mos |
| KV3o-002 | 60 000 / 12 000 / 48 000 / -1 000 / 700 / 100 000 | 60 000 / 12 000 / 48 000 / -1 000 / 700 / 100 000 | mos |
| KV2-003 | 55 000 / 11 000 / 44 000 / -850 / 600 / 80 000 | 55 000 / 11 000 / 44 000 / -850 / 600 / 80 000 | mos |
| KV1o-004 | 30 000 / 8 000 / 22 000 / -450 / 400 / 65 000 | 30 000 / 8 000 / 22 000 / -450 / 400 / 65 000 | mos |
| KV2s-005 | 45 000 / 9 000 / 36 000 / -650 / 350 / 90 000 | 45 000 / 9 000 / 36 000 / -650 / 350 / 90 000 | mos |
| KV4-006 | 100 000 / 20 000 / 90 000 / -1 300 / 750 / 250 000 | 100 000 / 20 000 / 80 000 / -1 300 / 750 / 250 000 | FARQ: credit (rasm 90 000 / JSON 80 000) |
| KV1-007 | 35 000 / 7 000 / 28 000 / -400 / 200 / 50 000 | 35 000 / 7 000 / 28 000 / -400 / 200 / 50 000 | mos |
| KV1-008 | 30 000 / 7 500 / 22 500 / -500 / 200 / 45 000 | 30 000 / 7 500 / 22 500 / -500 / 200 / 45 000 | mos |
| KV1-009 | 20 000 / 4 000 / 16 000 / -400 / 200 / 50 000 | 20 000 / 4 000 / 16 000 / -400 / 200 / 50 000 | mos |
| KV1s-010 | 35 000 / 7 000 / 28 000 / -650 / 200 / 45 000 | 35 000 / 7 000 / 28 000 / -650 / 200 / 45 000 | mos |
| KV1-011 | 30 000 / 6 000 / 24 000 / -500 / 300 / 60 000 | 30 000 / 6 000 / 24 000 / -500 / 300 / 60 000 | mos |
| KV2-012 | 35 000 / 7 000 / 28 000 / -750 / 500 / 65 000 | 35 000 / 7 000 / 28 000 / -750 / 500 / 65 000 | mos |
| KV1s-013 | 25 000 / 5 000 / 20 000 / -550 / 200 / 50 000 | 25 000 / 5 000 / 20 000 / -550 / 200 / 50 000 | mos |
| KV3-014 | 40 000 / 8 000 / 32 000 / -800 / 400 / 70 000 | 40 000 / 8 000 / 32 000 / -800 / 400 / 70 000 | mos |
| KV3-015 | 65 000 / 13 000 / 52 000 / -1 100 / 600 / 90 000 | 65 000 / 13 000 / 52 000 / -1 100 / 600 / 90 000 | mos |
| KV4-016 | 60 000 / 12 000 / 48 000 / -1 000 / 600 / 150 000 | 60 000 / 12 000 / 48 000 / -1 000 / 600 / 150 000 | mos |
| KV4-017 | 80 000 / 16 000 / 64 000 / -1 200 / 700 / 200 000 | 80 000 / 16 000 / 64 000 / -1 200 / 700 / 200 000 | mos |
| KV4-018 | 120 000 / 24 000 / 96 000 / -1 100 / 650 / 250 000 | 120 000 / 24 000 / 96 000 / -1 100 / 650 / 250 000 | mos |
| KV1o-019 | 35 000 / 7 000 / 28 000 / -750 / 500 / 75 000 | 35 000 / 7 000 / 28 000 / -750 / 500 / 75 000 | mos |
| KV3-020 | 35 000 / 7 000 / 28 000 / -500 / 300 / 60 000 | 35 000 / 7 000 / 28 000 / -500 / 300 / 60 000 | mos |
| KV2o-021 | 40 000 / 8 000 / 32 000 / -850 / 700 / 85 000 | 40 000 / 8 000 / 32 000 / -850 / 700 / 85 000 | mos |
| KV2o-022 | 40 000 / 8 000 / 32 000 / -850 / 700 / 80 000 | 40 000 / 8 000 / 32 000 / -850 / 700 / 80 000 | mos |
| KV3-023 | 45 000 / 8 000 / 37 000 / -600 / 300 / 80 000 | 45 000 / 8 000 / 37 000 / -600 / 300 / 80 000 | mos |
| KV2-024 | 45 000 / 9 000 / 36 000 / -700 / 400 / 75 000 | 45 000 / 9 000 / 36 000 / -700 / 400 / 75 000 | mos |
| KV2-025 | 45 000 / 9 000 / 36 000 / -650 / 450 / 65 000 | 45 000 / 9 000 / 36 000 / -650 / 450 / 65 000 | mos |
| KV2-026 | 45 000 / 9 000 / 36 000 / -700 / 400 / 75 000 | 45 000 / 9 000 / 36 000 / -700 / 400 / 75 000 | mos |

## Jadval: DX (dala hovli) — xuddi shu maydonlar
| Fayl | Rasm | JSON | Natija |
|---|---|---|---|
| DX-001 | 35 000 / 35 000 / 0 / 0 / 0 / ? | 35 000 / 35 000 / 0 / 0 / 0 / ? | mos |
| DX-002 | 25 000 / 25 000 / 0 / 0 / 0 / ? | 25 000 / 25 000 / 0 / 0 / 0 / ? | mos |
| DX-003 | 15 000 / 15 000 / 0 / 0 / 0 / ? | 15 000 / 15 000 / 0 / 0 / 0 / ? | mos |
| DX-004 | 25 000 / 25 000 / 0 / 0 / 0 / ? | 25 000 / 25 000 / 0 / 0 / 0 / ? | mos |
| DX-005 | 15 000 / 3 500 / 0 / 0 / 0 / ? | 15 000 / 15 000 / 0 / 0 / 0 / ? | FARQ: down (rasm 3 500 / JSON 15 000) |
| DX-006 | 17 000 / 17 000 / 0 / 0 / 0 / ? | 17 000 / 17 000 / 0 / 0 / 0 / ? | mos |
| DX-007 | 21 000 / 21 000 / 0 / 0 / 0 / ? | 21 000 / 21 000 / 0 / 0 / 0 / ? | mos |
| DX-008 | 17 000 / 17 000 / 0 / 0 / 0 / ? | 17 000 / 17 000 / 0 / 0 / 0 / ? | mos |

## Tavsiya
- KV4-006 va DX-005 uchun rasm (asl karta) va JSON/server hisobi o'rtasidagi nomuvofiqlikni buyurtmachi tasdiqlashi kerak: ya'ni (a) kartaning rasmi tuzatilsin (KV4-006 kredit 80 000; DX-005 bo'nak 15 000) yoki (b) JSON rasmdagidek (90 000 / 3 500) qoldirilib, hisob-kitob qoidasi aniqlansin. CLAUDE.md §2.5 («kartalar asl rasmi bilan») bo'yicha rasm ham, ta'sir ham bir xil bo'lishi kerak; hozir JSON `decided` bilan rasmdan chetga chiqadi.
- KV2-012 rasm matni («to'rt xonali») JSON matniga («ikki xonali») moslanmagan; rasm ko'rsatiladigan bo'lsa matn tuzatilgan rasm kerak.
- Kontent import testida `down + credit == full` tekshiruvi (KV/DX uchun) qo'shilsa, ikki istisno `decided` belgisi bilan aniq ajratiladi.

## Kodga ta'siri
- `content/data/cards.json` (`katta`): o'zgartirish talab qilinmaydi (raqamlar rasmga mos; 2 ta ongli istisno `decided` bilan belgilangan).
- Content schema/test (`content/`): KV/DX uchun `down + credit == full` invariant testi va `decided` yozuvlarini istisno sifatida qabul qilish.
- `rules/src` (katta aylana: sotib olish): DX `real: "?"` ni qayta ishlash — mavjud, o'zgartirish kerak emas (tekshirilmadi, faqat JSON ma'lumoti o'qildi).
- Rasm fayllari (`file` maydoni): kartalar `.webp` nomlari bilan; KV4-006, DX-005, KV2-012 rasmlari JSON bilan mos emas — dizayner/buyurtmachi tuzatilgan versiyasi kerak.
