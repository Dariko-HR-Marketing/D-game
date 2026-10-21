# F_kichik_raqamlar — Kichik sarmoya kartalari rasmlaridagi raqamlar va cards.json (`kichik`)

## Manba va usul
- Rasmlar: `z_Kichik_sarmoyalar/KICHIK_SARMOYALAR_PNG/*.png` — 82 ta (KB 35, TD 10, AV 6, Q 3, QAR 2, E 9, aksiyalar 17), hammasi ko‘rildi (kontakt varaqlar orqali, raqamlar aniq o‘qildi; «o‘qilmadi» holati yo‘q).
- Solishtirish: `/home/user/D-game/content/data/cards.json`, `kichik` massivi (82 yozuv, `file` .webp ↔ .png).
- Rasmdagi maydonlar xaritasi: KB — «Boshlang‘ich sarmoya»=`price`, «Doimiy daromad»=`income`; TD/AV/Q/QAR — bitta «N sh.b.» = `amount`; E — «To‘liq qiymati»=`full`, «Bo‘nak»=`down`, «Kredit»=`credit`, «Oylik foizlar»=`interest`, «Ijara to‘lovi»=`rent`, «Haqiqiy qiymati»=`real`; aksiyalar — «Aksiya narxi»=`share`, «Minimal miqdor»=`min`, «Maksimal miqdor»=`max`.

## Natija
- Mos: **82** / 82. Farq: **0**.

## Farqlar ro‘yxati
Farq yo‘q.

## Kuzatuvlar (raqam farqi emas)
- Rasmlarda summalar bo‘shliqsiz yozilgan (`12000 sh.b.`, `16000`), CLAUDE.md §2.3 esa katta summalar `12 000` ko‘rinishida chiqishini talab qiladi: bu rasmdan emas, ilova matnlari/UI formatlashiga tegishli (karta rasmi qayta chizilmaydi).
- Aksiyalarda rasmdagi «Aksiya narxi» JSON'da `share` deb nomlangan (nomi chalg‘ituvchi, qiymatlar mos).
- E kartalarida «Haqiqiy qiymati» rasmda «?» — JSON'da `real: '?'` (mos). «Ijara to‘lovi» rasmda `+0`, JSON'da `rent: 0` (mos).
- QAR_001: rasm matnida «har oy 100 sh.b.» va 100 sh.b. maydoni bor; JSON `amount` 100 mos (`note` maydoni qaror izohi, rasmda yo‘q).
- Q_001: rasmda maydon 300 sh.b., matnda «600 sh.b. qilib qaytarish» — JSON `amount` 300 mos.

## Jadval: fayl | rasmdagi raqamlar | JSON raqamlari | mos/farq
| Fayl | Rasmdagi raqamlar | JSON raqamlari | Holat |
|---|---|---|---|
| KB_001.png | Boshlang‘ich sarmoya 1500; Doimiy daromad 100 | price 1500; income 100 | mos |
| KB_002.png | Boshlang‘ich sarmoya 1400; Doimiy daromad 300 | price 1400; income 300 | mos |
| KB_003.png | Boshlang‘ich sarmoya 800; Doimiy daromad 200 | price 800; income 200 | mos |
| KB_004.png | Boshlang‘ich sarmoya 600; Doimiy daromad 200 | price 600; income 200 | mos |
| KB_005.png | Boshlang‘ich sarmoya 400; Doimiy daromad 100 | price 400; income 100 | mos |
| KB_006.png | Boshlang‘ich sarmoya 100; Doimiy daromad 100 | price 100; income 100 | mos |
| KB_007.png | Boshlang‘ich sarmoya 4000; Doimiy daromad 700 | price 4000; income 700 | mos |
| KB_008.png | Boshlang‘ich sarmoya 3000; Doimiy daromad 500 | price 3000; income 500 | mos |
| KB_009.png | Boshlang‘ich sarmoya 1800; Doimiy daromad 300 | price 1800; income 300 | mos |
| KB_010.png | Boshlang‘ich sarmoya 3100; Doimiy daromad 500 | price 3100; income 500 | mos |
| KB_011.png | Boshlang‘ich sarmoya 400; Doimiy daromad 100 | price 400; income 100 | mos |
| KB_012.png | Boshlang‘ich sarmoya 200; Doimiy daromad 100 | price 200; income 100 | mos |
| KB_013.png | Boshlang‘ich sarmoya 700; Doimiy daromad 200 | price 700; income 200 | mos |
| KB_014.png | Boshlang‘ich sarmoya 800; Doimiy daromad 200 | price 800; income 200 | mos |
| KB_015.png | Boshlang‘ich sarmoya 300; Doimiy daromad 100 | price 300; income 100 | mos |
| KB_016.png | Boshlang‘ich sarmoya 1800; Doimiy daromad 300 | price 1800; income 300 | mos |
| KB_017.png | Boshlang‘ich sarmoya 2800; Doimiy daromad 300 | price 2800; income 300 | mos |
| KB_018.png | Boshlang‘ich sarmoya 1700; Doimiy daromad 300 | price 1700; income 300 | mos |
| KB_019.png | Boshlang‘ich sarmoya 900; Doimiy daromad 200 | price 900; income 200 | mos |
| KB_020.png | Boshlang‘ich sarmoya 2800; Doimiy daromad 400 | price 2800; income 400 | mos |
| KB_021.png | Boshlang‘ich sarmoya 4200; Doimiy daromad 700 | price 4200; income 700 | mos |
| KB_022.png | Boshlang‘ich sarmoya 6000; Doimiy daromad 600 | price 6000; income 600 | mos |
| KB_023.png | Boshlang‘ich sarmoya 800; Doimiy daromad 200 | price 800; income 200 | mos |
| KB_024.png | Boshlang‘ich sarmoya 2800; Doimiy daromad 300 | price 2800; income 300 | mos |
| KB_025.png | Boshlang‘ich sarmoya 1000; Doimiy daromad 400 | price 1000; income 400 | mos |
| KB_026.png | Boshlang‘ich sarmoya 2900; Doimiy daromad 500 | price 2900; income 500 | mos |
| KB_027.png | Boshlang‘ich sarmoya 1100; Doimiy daromad 500 | price 1100; income 500 | mos |
| KB_028.png | Boshlang‘ich sarmoya 1200; Doimiy daromad 300 | price 1200; income 300 | mos |
| KB_029.png | Boshlang‘ich sarmoya 800; Doimiy daromad 300 | price 800; income 300 | mos |
| KB_030.png | Boshlang‘ich sarmoya 1400; Doimiy daromad 400 | price 1400; income 400 | mos |
| KB_031.png | Boshlang‘ich sarmoya 800; Doimiy daromad 300 | price 800; income 300 | mos |
| KB_032.png | Boshlang‘ich sarmoya 3000; Doimiy daromad 500 | price 3000; income 500 | mos |
| KB_033.png | Boshlang‘ich sarmoya 1800; Doimiy daromad 300 | price 1800; income 300 | mos |
| KB_034.png | Boshlang‘ich sarmoya 6400; Doimiy daromad 700 | price 6400; income 700 | mos |
| KB_035.png | Boshlang‘ich sarmoya 800; Doimiy daromad 300 | price 800; income 300 | mos |
| TD_001.png | 300 sh.b. | amount 300 | mos |
| TD_002.png | 100 sh.b. | amount 100 | mos |
| TD_003.png | 300 sh.b. | amount 300 | mos |
| TD_004.png | 100 sh.b. | amount 100 | mos |
| TD_005.png | 200 sh.b. | amount 200 | mos |
| TD_006.png | 500 sh.b. | amount 500 | mos |
| TD_007.png | 30 sh.b. | amount 30 | mos |
| TD_008.png | 50 sh.b. | amount 50 | mos |
| TD_009.png | 300 sh.b. | amount 300 | mos |
| TD_010.png | 300 sh.b. | amount 300 | mos |
| AV_001.png | 2500 sh.b. | amount 2500 | mos |
| AV_002.png | 5000 sh.b. | amount 5000 | mos |
| AV_003.png | 3500 sh.b. | amount 3500 | mos |
| AV_004.png | 12000 sh.b. | amount 12000 | mos |
| AV_005.png | 1500 sh.b. | amount 1500 | mos |
| AV_006.png | 3000 sh.b. | amount 3000 | mos |
| Q_001.png | 300 sh.b. | amount 300 | mos |
| Q_002.png | 10 sh.b. | amount 10 | mos |
| Q_003.png | 100 sh.b. | amount 100 | mos |
| QAR_001.png | 100 sh.b. | amount 100 | mos |
| QAR_002.png | 100 sh.b. | amount 100 | mos |
| E_001.png | To‘liq qiymati 10000; Bo‘nak 10000; Kredit 0; Oylik foizlar 0; Ijara to‘lovi +0; Haqiqiy qiymati ? | full 10000; down 10000; credit 0; interest 0; rent 0; real ? | mos |
| E_002.png | To‘liq qiymati 600; Bo‘nak 600; Kredit 0; Oylik foizlar 0; Ijara to‘lovi +0; Haqiqiy qiymati ? | full 600; down 600; credit 0; interest 0; rent 0; real ? | mos |
| E_003.png | To‘liq qiymati 3000; Bo‘nak 3000; Kredit 0; Oylik foizlar 0; Ijara to‘lovi +0; Haqiqiy qiymati ? | full 3000; down 3000; credit 0; interest 0; rent 0; real ? | mos |
| E_004.png | To‘liq qiymati 5000; Bo‘nak 5000; Kredit 0; Oylik foizlar 0; Ijara to‘lovi +0; Haqiqiy qiymati ? | full 5000; down 5000; credit 0; interest 0; rent 0; real ? | mos |
| E_005.png | To‘liq qiymati 5000; Bo‘nak 5000; Kredit 0; Oylik foizlar 0; Ijara to‘lovi +0; Haqiqiy qiymati ? | full 5000; down 5000; credit 0; interest 0; rent 0; real ? | mos |
| E_006.png | To‘liq qiymati 1000; Bo‘nak 1000; Kredit 0; Oylik foizlar 0; Ijara to‘lovi +0; Haqiqiy qiymati ? | full 1000; down 1000; credit 0; interest 0; rent 0; real ? | mos |
| E_007.png | To‘liq qiymati 6000; Bo‘nak 6000; Kredit 0; Oylik foizlar 0; Ijara to‘lovi +0; Haqiqiy qiymati ? | full 6000; down 6000; credit 0; interest 0; rent 0; real ? | mos |
| E_008.png | To‘liq qiymati 16000; Bo‘nak 16000; Kredit 0; Oylik foizlar 0; Ijara to‘lovi +0; Haqiqiy qiymati ? | full 16000; down 16000; credit 0; interest 0; rent 0; real ? | mos |
| E_009.png | To‘liq qiymati 9000; Bo‘nak 9000; Kredit 0; Oylik foizlar 0; Ijara to‘lovi +0; Haqiqiy qiymati ? | full 9000; down 9000; credit 0; interest 0; rent 0; real ? | mos |
| TAPOiCh_001.png | Aksiya narxi 5; Minimal 1; Maksimal 1000 | share 5; min 1; max 1000 | mos |
| TAPOiCh_002.png | Aksiya narxi 5; Minimal 1; Maksimal 100 | share 5; min 1; max 100 | mos |
| TAPOiCh_003.png | Aksiya narxi 30; Minimal 1; Maksimal 1000 | share 30; min 1; max 1000 | mos |
| TAPOiCh_004.png | Aksiya narxi 20; Minimal 1; Maksimal 1000 | share 20; min 1; max 1000 | mos |
| UTK_005.png | Aksiya narxi 5; Minimal 10; Maksimal 1000 | share 5; min 10; max 1000 | mos |
| UTK_006.png | Aksiya narxi 10; Minimal 10; Maksimal 1000 | share 10; min 10; max 1000 | mos |
| UTK_007.png | Aksiya narxi 20; Minimal 10; Maksimal 1000 | share 20; min 10; max 1000 | mos |
| UTK_008.png | Aksiya narxi 30; Minimal 10; Maksimal 5000 | share 30; min 10; max 5000 | mos |
| KCH_009.png | Aksiya narxi 10; Minimal 1; Maksimal 1000 | share 10; min 1; max 1000 | mos |
| KCH_010.png | Aksiya narxi 5; Minimal 1; Maksimal 100 | share 5; min 1; max 100 | mos |
| KCH_011.png | Aksiya narxi 20; Minimal 1; Maksimal 500 | share 20; min 1; max 500 | mos |
| ZA_012.png | Aksiya narxi 10; Minimal 1; Maksimal 1000 | share 10; min 1; max 1000 | mos |
| ZA_013.png | Aksiya narxi 5; Minimal 1; Maksimal 100 | share 5; min 1; max 100 | mos |
| ZA_014.png | Aksiya narxi 15; Minimal 1; Maksimal 1000 | share 15; min 1; max 1000 | mos |
| GZ_015.png | Aksiya narxi 20; Minimal 10; Maksimal 1000 | share 20; min 10; max 1000 | mos |
| GZ_016.png | Aksiya narxi 10; Minimal 10; Maksimal 1000 | share 10; min 10; max 1000 | mos |
| GZ_017.png | Aksiya narxi 10; Minimal 10; Maksimal 500 | share 10; min 10; max 500 | mos |
