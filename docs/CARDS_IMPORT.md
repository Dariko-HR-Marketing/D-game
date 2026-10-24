# Karta katalogi importi (Tajriba24 paketi)

Karta jadvali (CSV) tahrirlanadi → tekshiriladi → import qilinadi. **Kod o'zgarmaydi**: jadval to'g'irlansa, ushlab turilgan kartalar keyingi importda o'zi jonlanadi.
Manba: `content/imports/tajriba24/` (CSV, JSON, kasb to'ldirmasi, `validate_cards.py`, texnik topshiriq).

## Buyruqlar
```
pnpm --filter @poyga/content cards validate imports/tajriba24/tajriba24_cards_import.csv
pnpm --filter @poyga/content cards import   imports/tajriba24/tajriba24_cards_import.csv --kasb imports/tajriba24/tajriba24_kasblar.csv --dry-run   # hech narsa yozilmaydi, hisobot
pnpm --filter @poyga/content cards import   ... --apply                                                                                            # data/cards.json + jurnal + hisobot
pnpm --filter @poyga/content cards rollback --import-id <ID>                                                                                        # jurnal bo'yicha teskari qaytarish
python3 content/imports/tajriba24/validate_cards.py content/imports/tajriba24/tajriba24_cards_import.csv                                           # asl Python tekshiruvi (CI da)
```
Xato bo'lsa chiqish kodi 1, hech narsa yozilmaydi. Qayta import — 0 o'zgarish (CI da tekshiriladi). Jurnal: `content/data/import_log/`.

## Joriy holat
Ikkinchi import `imp_20261024_tajriba24_orzular` (paket «(3)», 24-oktabr): jadval 1 052 qator; **40 ta orzu (ORZ-01…ORZ-40)** qo'shildi, avvalgi 20 ta orzu kartasi (Y321–Y340) jadvalda yo'qligi uchun olib tashlandi (ID saqlanadi; texnik topshiriq 6.6 «orzular guruhi to'liq sinxronlanadi»). Faol kartalar **1 033**, jonli **817**, ushlab turilgan **216** (orzu kartalari kolodada emas: ular orzu tanlash ekranida ishlatiladi — `dreams.json` jadvaldan hosil bo'ladi, OPEN_QUESTIONS 156). Qayta import — 0 o'zgarish.

Birinchi import `imp_20261021_tajriba24`:
INSERT 614 · UPDATE 153 · NOCHANGE 246 · REMOVE 19. Faol kartalar **1013** (eski 418 − 19 + 614). Ulardan **817 tasi o'yinda jonli** (dvigatel to'liq qo'llaydi), **196 tasi ushlab turilgan** (kolodaga tushmaydi; sabab `cards import --dry-run` hisobotida).
Olib tashlangan 19 karta kolodadan chiqadi, lekin ID si saqlanadi (saqlangan o'yinlar topa olsin). Kasblar 52 (yangi 20 ta; xarajat qatorlari jadvalda yo'q — blankda faqat jami).

## Ma'lumot modeli
Eski kartalar o'z kolodalarida qoladi (`kasb, kichik, katta, bozor, xar, kxar, hod, new`); yangilar `catalog[]` da (ID `cat-<Yxxx>`); `meta` — har karta uchun qo'shimcha maydonlar (id, havza `ranked`, yosh, soha, maqsad, rasm holati, `retired`, koloda). Kolodaga tushish qoidasi: `content/src/pools.ts`.

## Havzalar va filtrlar
- **Reytingli o'yin** — faqat `ranked_pool = BASE` kartalari (`RANKED_ALLOWED_POOLS`); EXTENDED kartalar oddiy rejimlarda.
- **16+ kartalar va homiy kartalari** 16 yoshgacha (cheklangan) o'yinchiga tushmaydi (SPEC §2.8).
- **O'qituvchi paneli (20)** va **auksion (20)**, **orzu (20)**, **karyera (12)**, **missiya (20)** kartalari kolodada emas — ushlab turilgan (OPEN_QUESTIONS).

## Yangi dvigatel imkoniyatlari
Tuzilgan effektlar (`effect1_type…`) dvigatelda `Op` ro'yxatiga aylanadi: naqd (xavf bo'yicha sug'urta qoplashi bilan), ish haqi foizi/qo'shimcha/nol, oylik, xarajat va kredit foizi, daromad (foiz/nol/ko'paytma, «eng yaxshisini tanlash»), narx (hozirgi/modifikator), sotish taklifi (bozor qatlami), sug'urta polisi, depozit (muddatli/talab bo'yicha; muddatidan oldin yechish), homiy (XP, reklama), viktorina (javob serverda, XP). Vaqt: 1 aylana = 4 oy.
