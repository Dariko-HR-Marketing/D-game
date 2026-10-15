# Buyurtmachidan ma'lumot qabul qilish (tayyor vositalar)

Quyidagilar kelganda kod yozish kerak emas — vositalar tayyor, hammasi testdan o'tadi.

## 1. Yangi kasblar
1. `content/templates/kasb.csv` (sarlavhasi tayyor) ga har bir kasb uchun bitta qator yozing. Ustunlar: `n` (kasb raqami, mavjudlari bilan takrorlanmasin), `name`, `salary`, `exp1…exp9` (kasb kartochkasidagi 9 ta xarajat qatori, kartadagi tartibda), `save`, `kv`, `car`, `child`, `flags` (bo'sh yoki `;` bilan), `file` (rasm nomi, masalan `29_NOM.png`).
2. `total` va `cf` **kiritilmaydi** — vosita o'zi hisoblaydi (qo'lda arifmetik xato bo'lmasin).
3. Tekshirish: `pnpm --filter @poyga/content import:kasb content/templates/kasb.csv`
   — qator raqami bilan xatolarni ko'rsatadi (bo'sh maydon, takroriy raqam/fayl, yomon fayl nomi).
4. Hammasi to'g'ri bo'lsa: `… import:kasb content/templates/kasb.csv --write`, so'ng `pnpm test`.
5. Ishlayotgan serverga: admin panel → Kontent → `cards` → yangi versiya → tekshiruv → nashr (o'yin boshlanganda versiya qulflanadi).

## 2. Karta rasmlari (418 ta)
1. Fayllarni `deploy/vps/cards/` ga joylang (nomlar `content/data/cards.json` dagi `file` bilan **aynan** bir xil).
2. Tekshirish: `pnpm --filter @poyga/content check:cards deploy/vps/cards` — nima yetishmaydi / ortiqcha / registr farqi / bo'sh fayl / yaroqsiz nom.
   CI yoki joylashtirishdan oldin: `… check:cards deploy/vps/cards --strict` (kamchilik bo'lsa xato bilan chiqadi).
3. Yetishmaydigan rasm o'yinni buzmaydi (karta matn ko'rinishida chiqadi), lekin to'liq to'plam talab qilinadi (SPEC §2.5).

## 3. SMS provayder
`docs/AUTH.md`. Provayder va API hujjati kelganda: (a) u `POST {to,text}` + Bearer qabul qilsa — faqat `.env` ga manzil va token; (b) aks holda `HttpSms` o'rniga bitta kichik adapter sinfi.

## 4. VPS
`docs/SERVER.md` + tayyor skriptlar: `deploy/vps/setup.sh` (Docker, devor, avtomatik yangilanish), `backup.sh` (kunlik zaxira, tekshiruv, 14 kun, ixtiyoriy tashqariga nusxa), `restore.sh`.
