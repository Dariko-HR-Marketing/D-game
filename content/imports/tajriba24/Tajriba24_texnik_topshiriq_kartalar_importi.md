# Tajriba24 — Kartalarni o‘yin kodiga avtomatik import qilish: texnik topshiriq (TZ)

Versiya: 1.0 · Sana: 2026-10-21 · Til: o‘zbek (lotin) · Domen: tajriba24.uz

Ushbu hujjat bilan birga beriladigan fayllar:

| Fayl | Vazifasi |
|---|---|
| `Tajriba24_kartalar_import.xlsx` | Odam o‘qiydigan import jadvali (varaqlar: README, Kartalar, Effekt turlari, Qo‘lda xaritalash, Tekshiruv) |
| `tajriba24_cards_import.csv` | Mashina o‘qiydigan manba (UTF-8, 1 052 qator, 50 ustun) |
| `tajriba24_cards_import.json` | Xuddi shu ma’lumot JSON ko‘rinishida (`schema_version`, `columns`, `cards`) |
| `validate_cards.py` | Import oldidan tekshiruv (faqat standart kutubxona) |

CSV va JSON — yagona haqiqat manbai. XLSX faqat ko‘rish va tahrirlash uchun; kodga CSV yoki JSON yuklanadi.

---

## 1. Maqsad

1. O‘yin bazasidagi mavjud 399 ta kartani yangilash (153 ta o‘zgarish), 19 tasini olib tashlash va 634 ta yangi kartani qo‘shish.
2. Jarayon qo‘lda tahrirsiz, takrorlanuvchi (idempotent) va orqaga qaytariladigan bo‘lishi kerak: bir xil faylni ikki marta yuklash natijani o‘zgartirmaydi.
3. Kelgusida karta o‘zgarsa: jadval tahrirlanadi → `validate_cards.py` → import buyrug‘i. Kod o‘zgartirilmaydi.
4. Yangi karta effektlari (Bozor, Hodisa, Xarajat, Sug‘urta va h.k.) tuzilgan maydonlar orqali dvigatelda ishlaydi, matndan o‘qilmaydi.

## 2. Qamrov

Kiradi:
- Import buyrug‘i (CLI): `dry-run`, `apply`, `rollback`, hisobot.
- Bazaga yangi maydonlar (migratsiya).
- Dvigatelga yangi effekt turlari va qoidalar (6-bo‘lim).
- Kolodalarni qayta shakllantirish (Bozor ikki qatlam).
- Avtomatik testlar.

Kirmaydi: rasmlarni chizish (jadvalda `image_status` bilan belgilangan), yuridik/pedagogik tasdiq, balans simulyatsiyasining natijalari.

## 3. Boshlash tartibi (majburiy 0-qadam)

Kod bazasi bu hujjatda tasvirlanmagan. Ishni boshlashdan oldin:
1. Mavjud karta ma’lumotlari qayerda saqlanishini aniqlang (fayl, DB jadvali, CSV) va hisobotga yozing.
2. Kartalar qanday kolodalarga ajratilishi va rasm fayllari (`*.png`) qanday bog‘lanishini aniqlang.
3. Mavjud effekt dvigatelini o‘qing: qaysi effektlar kodda bor (6.1 jadvaliga solishtiring).
4. Xulosani shu hujjatning 12-bo‘limiga («Moslashtirish eslatmalari») yozing va keyin davom eting.
Sir ma’lumotlar (parollar, kalitlar, server manzillari) import fayllariga va hisobotlarga yozilmaydi.

## 4. Ma’lumot modeli

### 4.1. Kalit va operatsiyalar

- `card_id` — yagona kalit. Eski kartalar uchun rasm fayl nomi (kengaytmasiz), masalan `KB_011`; yangi kartalar uchun kod (`Y001`, `BZ001`, `NK2-01`, `K33` va h.k.).
- `legacy_file` — eski kartaning rasm fayli (`UPDATE`, `NOCHANGE`, `REMOVE` uchun majburiy; `INSERT` uchun bo‘sh).
- `operation`:
  - `INSERT` — yangi karta qo‘shiladi (634).
  - `UPDATE` — mavjud karta `legacy_file` bo‘yicha topiladi va jadvaldagi maydonlar bilan almashtiriladi (153).
  - `NOCHANGE` — tegilmaydi (246). Ulardan 12 tasida `review_status=DECIDED` (kvartira kredit foizi va do‘st qarzi bo‘yicha qaror qabul qilingan; karta o‘zgarmaydi).
  - `REMOVE` — karta kolodadan chiqariladi (19). Qattiq o‘chirish emas: `status=retired`, tarix saqlanadi.

### 4.2. Ustunlar (50 ta)

| Guruh | Ustunlar |
|---|---|
| Identifikatsiya | `card_id`, `operation`, `legacy_file` |
| Tasnif | `deck_no` (1–7), `deck_name`, `card_type`, `direction`, `card_kind` (enum), `sector` |
| Matn | `title`, `text`, `option_a`, `option_b`, `option_v` (faqat viktorina), `learning_goal`, `duration`, `age_rating` |
| Pul maydonlari (butun son, sh.b.) | `price`, `down_payment`, `loan`, `loan_payment_monthly` (manfiy), `income_monthly`, `rent_monthly`, `market_price`, `salary`, `monthly_surplus` (kasb uchun), `share_pct`, `qty_min`, `qty_max` (aksiya) |
| Joylashuv | `pool` (`DECK` yoki `TEACHER_PANEL`), `ranked_pool` (`BASE` yoki `EXTENDED`) |
| Effekt | `effect1_*`, `effect2_*` (`type`, `target`, `value`, `duration`, `condition`), `display_effect` (kartada ko‘rsatiladigan matn) |
| Holat | `needs_engine_mapping`, `draw_enabled`, `publish`, `source_batch`, `review_status`, `image_status` |
| Tarix | `change_reason`, `old_value` |

Muhim qoidalar:
- Bo‘sh katak = qiymat yo‘q (NULL), nol emas.
- `price` — kartaning asosiy summasi. Kasb kartasida `salary` ham to‘ldiriladi (bir xil qiymat) va `monthly_surplus` — blankdagi oylik pul oqimi.
- `down_payment + loan = price` (ko‘chmas mulk), `loan_payment_monthly < 0`.
- Sotish narxi bazasi: aktivni sotib olish narxi. `SOTISH_FOIZ` shu narxga qo‘llanadi; `market_price` faqat ma’lumot va o‘yin oxiri baholash uchun.
- Matnlar yozuv qoidalari: `o‘`, `g‘` — `‘` (U+2018); tutuq belgisi — `’` (U+2019); mingliklar bo‘shliq bilan (`20 000`); birlik `sh.b.`; tirnoq `“ ”`.

### 4.3. `card_kind` (enum)

`ASSET_BUY`, `ASSET_SELL_OFFER`, `EXPENSE`, `EVENT`, `MARKET_EVENT`, `MARKET_SIGNAL`, `INCOME_CHANGE`, `CAREER_EVENT`, `GOAL`, `DREAM`, `DEVELOPMENT`, `QUIZ`, `FINANCE_OFFER`, `DEPOSIT`, `INSURANCE`, `SPONSOR_INFO`, `ONE_TIME_INCOME`, `SOCIAL_DUTY`, `PROFESSION`, `AUCTION`, `TEACHER_CASE`.

### 4.4. Migratsiya

Mavjud karta jadvaliga yuqoridagi ustunlar qo‘shiladi (mavjudlari qayta ishlatiladi). Qo‘shimcha jadval: `card_import_log` (id, import_id, card_id, operation, old_json, new_json, created_at). Migratsiya orqaga qaytariladigan (down-skript) bo‘lishi shart.

## 5. Import buyrug‘i

```
python manage_cards.py import tajriba24_cards_import.csv --dry-run
python manage_cards.py import tajriba24_cards_import.csv --apply
python manage_cards.py rollback --import-id <ID>
```

(Buyruq nomi loyiha uslubiga moslashtirilishi mumkin.)

### 5.1. Algoritm

1. `validate_cards.py` mantig‘ini ishga tushirish; xato bo‘lsa — to‘xtash (chiqish kodi 1).
2. Joriy holatning zaxira nusxasi (barcha kartalar JSON, vaqt belgisi bilan).
3. Hammasi bitta tranzaksiyada:
   - `REMOVE`: `legacy_file` bo‘yicha topish, `status=retired`, `retired_reason=change_reason`.
   - `UPDATE`: `legacy_file` bo‘yicha topish; topilmasa — xato (tranzaksiya bekor qilinadi). Jadvaldagi barcha maydonlar yoziladi.
   - `INSERT`: `card_id` bo‘yicha upsert (mavjud bo‘lsa yangilanadi, takror yaratilmaydi).
   - `NOCHANGE`: o‘tkazib yuboriladi.
4. Har bir o‘zgarish `card_import_log` ga eski va yangi qiymat bilan yoziladi.
5. Hisobot (konsol + `import_report_<ID>.json`): nechtasi qo‘shildi/yangilandi/olib tashlandi/o‘tkazildi, `draw_enabled` soni, `image_status` bo‘yicha ro‘yxat (REDRAW va NEW_ART — dizayner uchun).
6. `rollback`: `card_import_log` bo‘yicha oxirgi importni teskari qaytaradi.

### 5.2. Idempotentlik talabi

Bir xil CSV ni ketma-ket ikki marta `--apply` qilish: ikkinchisida 0 ta o‘zgarish. Bu avtomatik testda tekshiriladi.

### 5.3. Rasmlar

- `image_status=OK` — mavjud rasm saqlanadi.
- `REDRAW` — matn o‘zgargan; rasm eskirgan deb belgilanadi (`needs_art=true`), eski rasm vaqtincha ishlatiladi.
- `NEW_ART` — yangi rasm kutilmoqda; rasm yo‘q bo‘lsa kartada matnli zaxira shablon ko‘rsatiladi.
- `TEXT_ONLY`, `NONE` — rasm kerak emas.
Import rasm yo‘qligi sababli to‘xtamaydi.

## 6. Dvigatel talablari

### 6.1. Effekt turlari

To‘liq ro‘yxat va izohlar XLSX dagi «Effekt turlari» varag‘ida (28 ta tur). Asosiylari:

| Tur | Ma’nosi |
|---|---|
| `SOTISH_FOIZ` | Aktivni sotib olingan narx × (1 + value/100) ga sotish imkoniyati |
| `SOTISH_FOIZ_BIRINCHI` | Xuddi shu, faqat birinchi rozi bo‘lgan o‘yinchiga (30 soniya) |
| `SOTISH_NARX` | Qat’iy narxda sotish (eski kartalar uslubi) |
| `NARX_FOIZ` | Nishon aktiv bozor narxi value % ga o‘zgaradi (bir marta) |
| `DAROMAD_FOIZ` | Nishon aktivlar oylik daromadi value % ga o‘zgaradi, `duration` davomida |
| `DAROMAD_NOL`, `DAROMAD_KOPAYTIRISH` | Daromad nolga tushadi / ko‘paytiriladi |
| `KECHIKTIRILGAN_NARX_FOIZ`, `KECHIKTIRILGAN_DAROMAD_FOIZ` | Alomat: ta’sir navbatga qo‘yiladi (6.3) |
| `NAQD_XARAJAT`, `NAQD_BONUS`, `NAQD_JARIMA` | Naqd pul o‘zgarishi (bir marta) |
| `SUGURTA_PREMIYA`, `SUGURTA_QOPLASH` | Sug‘urta polisi (6.5) |
| `ISH_HAQI_*`, `OYLIK_*`, `DOIMIY_XARAJAT`, `XARAJAT_FOIZ`, `KREDIT_TOLOV_FOIZ` | Ish haqi va oylik oqim o‘zgarishlari |
| `DEPOZIT_FOIZ` | Muddatli depozit |
| `XP_BONUS`, `MISSIYA_MUKOFOT`, `ORZU_SHARTI`, `AUKSION_BOSHLANISH`, `VIKTORINA_JAVOB` | Yangi turlar mexanikasi |

Kartada ikkita effekt bo‘lsa (`effect2_*`), ikkalasi ketma-ket qo‘llanadi.

### 6.2. Nishon (target) va shart (condition)

- `target` — aktiv guruhi yoki nomi (masalan «Elektr skuter ijarasi punkti», «Ijara aktivlari», «Ishlab chiqarish sexlari»). Guruh nomlari `sector` ustuni va aktiv kartalaridagi `sector` bilan solishtiriladi. Guruhlarni aniqlash uchun alohida xarita (`asset_groups`) yaratilsin: guruh nomi → aktiv `card_id` ro‘yxati. Xaritani quyidagi manbalardan qurish mumkin: `sector`, `card_type`, va `Kartalar` varag‘ida har bir yangi Bozor/Hodisa kartasining `target` matni.
- Shart: «Mos aktivi bor» — o‘yinchida nishon aktiv yo‘q bo‘lsa karta ta’sir qilmaydi, o‘yin davom etadi; kartada «karta o‘tkaziladi» deb yoziladi.
- Shart: «Aktiv ≥ 1 aylana ushlab turilgan» — sotish kartalarida: aktiv sotib olingan aylanadan keyingi aylanadan boshlab sotilishi mumkin (tezkor arbitrajga yo‘l qo‘ymaydi).
- «Egasi tanlaydi» — bir nechta mos aktivdan o‘yinchi bittasini tanlaydi (interfeysda tanlash oynasi).

### 6.3. Alomat (kechiktirilgan ta’sir)

`KECHIKTIRILGAN_*` karta chiqqanda: shu aylana hech narsa o‘zgarmaydi; ta’sir navbatga (pending queue) yoziladi; keyingi aylana boshida qo‘llanadi va 1 aylana davom etadi. Navbat o‘yin saqlanishiga kiradi (qayta ulanishda yo‘qolmaydi). O‘yinchi alomatni ko‘rgach, sotish yoki ushlab turish haqida qaror qabul qiladi.

### 6.4. Muddat birligi

Daromadlar «oy»da (D katagi o‘tganda oy o‘tadi). Ta’sir muddati «aylana»da: 1 aylana = kichik doira bir marta aylanib chiqilishi. `duration` qiymatlari: `Bir marta`, `1 aylana`, `2 aylana`, `Doimiy`, `Keyingi aylana boshidan 1 aylana`, `5 aylana` (polis) va h.k. Parser ularni raqam va birlikka ajratib o‘qiydi; noma’lum format — xato.

### 6.5. Sug‘urta

`SUGURTA_PREMIYA` — naqd −`price` (bir marta). `SUGURTA_QOPLASH` — polis kartasi o‘yinchida qoladi; `target` matnidagi hodisa turi chiqqanda xarajat 100 % qoplanadi (yoki kartada ko‘rsatilgan qoldiq, masalan «sug‘urta bilan −8 000»); `duration` tugagach polis chiqadi. Polis aktivi yo‘q bo‘lsa — to‘liq xarajat.

### 6.6. Yangi turlar

- Auksion (20): kamida 3 o‘yinchi; boshlang‘ich narx `effect1_value`, qadam `effect1_condition` (`qadam=500`); g‘olib to‘laydi va aktivni oladi.
- Viktorina (20): savol `text`, variantlar `option_a/b/v`, to‘g‘ri javob `effect1_value`; to‘g‘ri javob XP beradi, pulga ta’sir qilmaydi; javob vaqti 30 soniya.
- Homiy (20): pulga ta’sir qilmaydi, XP +5. 16 yoshgacha reklamasiz (`age_rating=6+ (reklamasiz)`).
- Missiya (20) va Orzu (40): maqsad kartalari. Orzu: g‘alaba sharti — pul oqimi ≥ 100 000 + orzu katagi + naqd ≥ orzu narxi. Orzu narxi 800 000–3 000 000 sh.b.
- **Orzular guruhini to‘liq sinxronlash (muhim):** `card_type = Orzu (katta aylana)` (`source_batch = V5_ORZULAR`, `card_id = ORZ-01…ORZ-40`) jadvaldagi yagona to‘g‘ri ro‘yxat. Importda bu guruh uchun: jadvalda bo‘lmagan barcha mavjud orzu elementlari (kazino va boshqa nomaqbul orzular, shu jumladan o‘yin kodida yoki orzu katagi sozlamasida qattiq yozilganlari) `retired` qilinadi, hisobotda ro‘yxati chiqariladi. Orzu tanlash interfeysi faqat shu 40 ta orzudan tanlatadi; `sector` ustunida yo‘nalish, `display_effect` da ufq (Hozirgi/Istiqbol) bor.
- Jamg‘arma va depozit (20): `DEPOZIT_FOIZ`; muddatidan oldin yechilsa foiz yo‘qoladi.
- Ta’lim keysi (20): `pool=TEACHER_PANEL` — o‘yin kolodasiga kirmaydi; o‘qituvchi panelida ko‘rsatiladi.

### 6.7. Reytingli o‘yin

`ranked_pool=BASE` kartalari (asl, tahrirlangan) reytingli o‘yinda ishlatiladi. `EXTENDED` (barcha yangi kartalar) hozircha reytingli o‘yinga kirmaydi; sozlama (`RANKED_ALLOWED_POOLS`) bilan keyin yoqiladi.

### 6.8. Yosh cheklovlari

`age_rating` kartada saqlanadi va filtrlanadi: 16+ kartalar (kafillik, auksion va qarz bilan bog‘liq) 16 yoshgacha o‘yinchilarga tushmaydi. `6+ (reklamasiz)` — homiy kartalari uchun. Yosh siyosatining yuridik tasdig‘i alohida jarayon; kod faqat maydonni qo‘llaydi.

### 6.9. Bozor kolodasi ikki qatlam

Bozor kolodasi (320 karta) ikki qatlamga bo‘linadi va har qatlam alohida tortiladi:
- «Taklif/sotish»: `direction = Aktiv sotish`, `Aktiv sotib olish` (auksion).
- «Hodisa/alomat»: `direction = Hodisa`, `Daromad o‘zgarishi`, `Bozor alomati`, `Majburiy xarajat` (bozor).
Qatlamlar nisbati sozlama (`MARKET_LAYER_RATIO`), boshlang‘ich qiymat 50/50; yakuniy qiymat balans simulyatsiyasidan keyin belgilanadi.

## 7. `draw_enabled` va qo‘lda xaritalash

- `draw_enabled=TRUE` (951 ta) — kolodaga tushadi.
- `draw_enabled=FALSE` (101 ta): 62 ta karta effekti hali tuzilgan maydonlarga o‘tkazilmagan (`needs_engine_mapping=TRUE`, ro‘yxat «Qo‘lda xaritalash» varag‘ida), 20 ta o‘qituvchi paneli kartasi, 19 ta olib tashlangan karta.
- 62 ta kartaning effektlari ikkinchi bosqichda yoziladi: har biri uchun jadvalda taklif etilgan mexanika bor. Ular tayyor bo‘lganda CSV da `needs_engine_mapping=FALSE`, `draw_enabled=TRUE` qilinadi va importni qayta yuklash yetadi.

## 8. Tekshiruvlar (`validate_cards.py`)

Skript quyidagilarni tekshiradi va xato bo‘lsa 1 kodi bilan chiqadi:
- majburiy ustunlar, `card_id` takrori, `operation` qiymatlari, `legacy_file` qoidalari;
- butun son maydonlar, `TRUE/FALSE` maydonlar, `deck_no` ↔ `deck_name`;
- `card_kind` va `effect*_type` ro‘yxati; effekt qiymati va nishoni mavjudligi;
- Xarajat kolodasi ≤ 2 000, Katta aylana xarajati ≥ 3 000;
- yangi aktiv kartalarining qoplanish muddati (kichik 2,5–9 oy, katta 12–60 oy);
- `down_payment + loan = price`, `loan_payment_monthly < 0`;
- kirill va lotin aralashuvi (xato); apostrof, ortiqcha bo‘shliq, mingliklar (ogohlantirish);
- viktorina variantlari to‘liqligi; `draw_enabled` va `needs_engine_mapping` mosligi.
Import dasturi shu qoidalarni o‘z ichiga olishi (yoki skriptni chaqirishi) shart.

## 9. Testlar (qabul mezonlari)

1. `validate_cards.py` joriy CSV da: 0 xato, 0 ogohlantirish.
2. `--dry-run`: bazaga yozmaydi, hisobot: INSERT 634, UPDATE 153, NOCHANGE 246, REMOVE 19.
3. `--apply`: tranzaksiya; baza ichida kartalar soni = eski faol kartalar − 19 + 634.
4. Ikkinchi `--apply`: 0 o‘zgarish.
5. `rollback`: baza zaxira nusxaga teng.
6. Bir xato qator qo‘shilganda (masalan noma’lum `effect1_type`) — hech narsa yozilmaydi.
7. Dvigatel birlik testlari: `SOTISH_FOIZ` (shart bilan), `DAROMAD_FOIZ` (2 aylana, so‘ng tugaydi), `KECHIKTIRILGAN_*` (keyingi aylana boshida), `DAROMAD_NOL`, `SUGURTA_QOPLASH`, `AUKSION_BOSHLANISH`, `VIKTORINA_JAVOB`; mos aktiv yo‘q bo‘lsa karta o‘tkaziladi.
8. `pool=TEACHER_PANEL` kartalari o‘yin kolodasida yo‘q; `RANKED` o‘yinda faqat `BASE` kartalar.
9. 16 yoshgacha o‘yinchiga 16+ kartalar chiqmaydi.
10. Barcha matnlar `‘ ’` apostrof qoidasiga mos; interfeysda `sh.b.` va minglik bo‘shliqlar to‘g‘ri ko‘rsatiladi.

## 10. Qabul qilingan biznes qarorlar (o‘zgartirilmasin)

| № | Qaror |
|---|---|
| 1 | Daromad «oy»da, ta’sir muddati «aylana»da |
| 2 | Effektlar tuzilgan maydonlarda (`effect*_`) |
| 3 | Sotish narxi = sotib olingan narx × (1 + foiz); `market_price` faqat ma’lumot |
| 4 | Sotish kartalari faqat aktivni ≥ 1 aylana ushlagan o‘yinchiga tegishli |
| 5 | Ko‘chmas mulk yangi kartalarida sof oylik oqim ≥ 0 |
| 6 | Alomat ta’sirni navbatga qo‘yadi (keyingi aylana boshida) |
| 7 | Kafillik kartasi 16+; diniy mavzudagi karta olib tashlangan |
| 8 | Yer va dala hovli kartalarida `market_price` raqam bilan berilgan |
| 9 | Bozor ikki qatlam; hech bir karta o‘chirilmagan |
| 10 | Kvartira kredit foizi kartadagi qiymat bilan ishlaydi (20 % bank qoidasi faqat bank qarziga tegishli) |
| 11 | Do‘st qarzi kartasi — NPC qarzi; o‘yinchilar o‘rtasidagi foizsiz qarz qoidasiga tegishli emas |

## 11. Bosqichlar va natijalar

1. **Aniqlash** (0-qadam, 3-bo‘lim): mavjud saqlash va dvigatel hisoboti.
2. **Migratsiya va import**: ma’lumot modeli, `import`/`rollback`, hisobot, testlar 1–6, 10.
3. **Dvigatel**: 6-bo‘lim effektlari, testlar 7–9.
4. **Qo‘lda xaritalash**: 62 karta effekti (7-bo‘lim).
5. **Simulyatsiya**: 1 000 o‘yin, Bozor qatlamlari nisbati, karta chastotalari.
Har bosqich oxirida qisqa hisobot: nima bajarildi, qaysi testlar o‘tdi, nima qoldi.

## 12. Moslashtirish eslatmalari (dasturchi to‘ldiradi)

- Mavjud saqlash joyi va formati: …
- Rasm fayllarining bog‘lanishi: …
- Mavjud effekt dvigateli va unga qo‘shiladigan joylar: …
- Buyruq nomi va joylashuvi: …

## 13. Xavfsizlik va qoidalar

- Import fayllarida shaxsiy ma’lumot, parol, kalit, server manzili bo‘lmaydi; bo‘lsa — to‘xtatib xabar berish.
- Importni faqat vakolatli foydalanuvchi bajaradi; har import `card_import_log` da saqlanadi.
- Reklama/homiy kartalarida real brend nomi ishlatilmaydi (hozirgi jadvalda yo‘q); yangi nom qo‘shilsa yuridik ko‘rikdan o‘tadi.
