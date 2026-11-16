# Qolgan muammolar ro'yxati (yangilandi 2026-11-16)

Holat: ✅ bajarildi · 🟡 branchda, `main` da emas · ⏳ kutmoqda (qaror/ruxsat) · ⬜ qilinmagan. Ustuvorlik tartibida.

## 1. Karta rasmlari (buyurtmachi qarori: dizayner kutilmaydi, rasmlarni o'zimiz chizamiz)
| # | Muammo | Holat |
|---|---|---|
| 1.1 | `cards.new` dagi 6 karta (`099_Q`, `Xarajat_086`, `MO_001`, `XAY_001`, `100_IJR`, `10_SUV_TOSHQINI`) rasmsiz edi | ✅ chizildi (`content/art/generated`), main'da, test bor |
| 1.2 | `Q_001` va `099_Q` rasmida eski matn (qarz/foiz) halol moliyaga zid edi (OPEN_QUESTIONS 170) | ✅ mudoraba/foyda ulushi matni bilan qayta chizildi |
| 1.3 | Generator `cards.new` va `Q_001` ni qo'llamasdi | ✅ `render-card-art.ts` kengaytirildi |
| 1.4 | Orqa tomon rasmlari (2 ta), orzu (40), missiya (20) va karyera (12) kartalari uchun rasm holati | ✅ tekshirildi: katalogdagi 610 ta kartaning hammasida rasm bor (karyera 20, missiya 20, orzu 60 — `content/art/generated`); faqat o'qituvchi paneli keyslari (20) rasmsiz va kolodada yo'q; `dreams.json` dagi 40 orzu tanlash ekranida matn bilan chiqadi (rasm talab qilinmaydi) |
| 1.5 | O'qituvchi paneli keyslari (20, `Y341…Y360`) rasmsiz: kolodada yo'q, rasm talab qilinmaydi | ✅ (xato aytilgan edi: ular «auksion» emas) |
| 1.6 | Auksion kartalari (`Y381…Y400`, 20 ta) rasmi bor; o'yinga to'liq ulanganligi tekshirilmagan | ✅ jonli (`bankSaleLive`, #45); 7 kartada boshlang'ich narx qadamga karrali emas — OPEN_QUESTIONS 176 |
| 1.7 | Qisqa matnli kartalarda katta bo'sh joy (masalan, «Qurilish materiallari qimmatlashdi»): dizayn sayqali | ⬜ ixtiyoriy |
| 1.9 | `client/assets/board.webp` (o'yin maydoni rasmi) ichida eski «POYGA» nomi qolgan; kirish sahifasidan olib tashlandi, boshqa joyda ishlatilsa qayta chizish kerak | ✅ kirish sahifasidan olib tashlandi; hech qayerda ishlatilmaydi (tekshirildi), faylni o'chirish mumkin |
| 1.8 | Eski dizayner rasmlari (`deploy/vps/cards/`) sandbox nusxasida yo'q, faqat serverda; `install-art.sh` generatsiya qilinganlarini ustidan yozadi | ⏳ serverda tekshirish kerak |

## 2. O'yin qoidalari
| # | Muammo | Holat |
|---|---|---|
| 2.1 | O'zaro qarz: 3 guvoh (oluvchi tanlaydi, «Xabardor bo'ldim») va beruvchi chegarasi 30 % | ✅ main'da va productionda (#43) |
| 2.2 | 3 dan kam mos guvoh qolsa ekranda xabar yo'q; qarz holatini oluvchi ko'rmaydi | ✅ xabar (`not_enough_witnesses`) va oluvchiga «n / 3» holati |
| 2.3 | Qarz bo'yicha «qo'shimcha topshiriq» (buyurtmachi keyin aytadi) | ⏳ |
| 2.4 | 6 soatlik vaqt rejimi (qog'oz sinovdan keyin), V katagi, «tasdiq kutilmoqda» qoidalari | ⏳ buyurtmachi |
| 2.5 | Musodara va «ishonchsiz» belgisi (36 oy): manbada matn yo'q | ⏳ buyurtmachi |
| 2.6 | Auksionda «ikkita qatnashchi» taxmini (OPEN_QUESTIONS 173) | ⏳ tasdiq |

## 3. Jonli tahlil
| # | Muammo | Holat |
|---|---|---|
| 3.1 | Tahlil ochilmasdi («Tahlilni yuklab bo'lmadi»): ehtimoliy sabab — eski qoidalar bilan o'ynalgan jurnal | ✅ tuzatish deploy qilindi (PR #42); sababi tasdiqlanmagan |
| 3.2 | Ekranda xato kodi chiqadi: foydalanuvchi kodni yuborsa, aniq sabab topiladi | ⏳ foydalanuvchi |
| 3.3 | Tahlil formulalari tasdig'i (BCG, xavf–daromad, muvaffaqiyat chegarasi, radar) — OPEN_QUESTIONS 175 | ⏳ buyurtmachi |
| 3.4 | Hisobot tahlili (`analyzeGame`) hali qat'iy rejimda: eski jurnalda yiqilishi mumkin | ✅ lenient rejim (#43) |

## 4. Kirish, to'lov, xavfsizlik
| # | Muammo | Holat |
|---|---|---|
| 4.1 | Telefon: istalgan to'qqiz raqam kirib ketardi | ✅ O'zbekiston MOBIL operator kodi tekshiriladi (`bad_operator`); chet el raqamlari qabul qilinadi (#44) |
| 4.2 | SMS: Eskiz ulanishi, belgilangan kodni o'chirish | 🟡 production'da `fixed`/`console` rad etiladi (#45); Eskiz sender nomi, shablon tasdig'i va serverda `SMS_PROVIDER=eskiz` — ⏳ buyurtmachi |
| 4.3 | Yurist xulosasi: 16 yoshgacha to'lov, ma'lumot joylashuvi | ⏳ buyurtmachi |
| 4.4 | IP: karta, qoidalar, «Tajriba 24» nomi huquqi yozma tasdiqlanishi | ⏳ buyurtmachi |
| 4.5 | TURN server (ba'zi tarmoqlarda aloqa) | 🟡 coturn va vaqtinchalik hisob tayyor (#45), yoqilmagan va tarmoqda sinalmagan (OPEN_QUESTIONS 178) |
| 4.6 | To'lov (do'kon, Payme/Click/Uzcard-Humo) va narxlar: MVP'dan keyin; narx variantini buyurtmachi aytadi | ⏳ |

## 5. Mahsulot (kengash shartlari; Founder paketi pauzada)
| # | Muammo | Holat |
|---|---|---|
| 5.1 | O'qituvchi paneli (sinf yaratish, natija hisoboti) | ✅ kodda bor (tekshirildi): sinflar, kod bilan qo'shilish, topshiriqlar, hisobot va CSV, sinf xonasi (faqat faol litsenziya bilan); admin tomonda tashkilot va litsenziya |
| 5.2 | Turnir va korporativ xona boshqaruvi | 🟡 turnir admin boshqaruvi bor edi (yaratish, holat, ishtirokchi, reyting, sovrin, hisobot); korporativ xona (kod bilan, yopiq, 16+) qo'shildi — OPEN_QUESTIONS 179 taxminlari tasdig'i kerak; tashkilotchi roli ⬜ |
| 5.3 | Birinchi besh daqiqa: o'rgatish, yakka yoki kam odam bilan boshlash | ✅ «O'quv o'yini» (1 odam + 2 bot, 15 daqiqa) 8 qadamli yo'l-yo'riq bilan; 0 o'yinli yangi hisobga bosh sahifada ko'rsatiladi; kirish sahifasida «nima bu» bloki. Haqiqiy yangi o'yinchilar bilan kuzatuv seansi — ⏳ buyurtmachi/foydalanuvchi |
| 5.4 | 45 daqiqalik qisqa rejim | ✅ «Tez» rejim bor (2–6 kishi, 30–45 daqiqa, chiqish 15 000 passiv + 250 000 naqd; SPEC 5.12). 6 soatlik rejim — qog'oz sinovdan keyin (2.4) |
| 5.5 | Bir gaplik va'da va MVP'dan olib tashlanadigan funksiyalar ro'yxati | ⏳ buyurtmachi qarori (pozitsiya va auditoriya tanlovi); kirish sahifasida hozirgi matn: «nima bu, bepul/pullik, qanday ishlaydi» |
| 5.6 | Founder paketining qolgani (offer, CFO, marketing, brend, ops, launch, plan) | ⏳ mahsulot tayyor bo'lgach |

## 6. Texnik qarz
| # | Muammo | Holat |
|---|---|---|
| 6.1 | Brauzer tekshiruvlari (`calc-check` va b.) ba'zan tasodifan yiqiladi | 🟡 `calc-check` to'siqlari va axe animatsiya kutishi tuzatildi (#45); boshqalar kuzatuvda |
| 6.2 | Guvoh qoidasi uchun brauzer tekshiruvi yozilmagan | ✅ `witness-check.ts` (telefon va kompyuter), CI ga qo'shildi |
| 6.3 | Eski GitHub branchlari o'chirilmagan (so'ralmaguncha o'chirilmaydi) | ⏳ |

## 7. Xavfsizlik va bog'liqliklar auditi (2026-11-16)
`pnpm audit --prod`: **36 → 7** zaiflik (11 yuqori → 3). Tranzitiv `fast-uri` (fastify/ajv) va `node-forge` (expo CLI) yamalgan versiyalarga ko'tarildi (`pnpm-workspace.yaml` → `overrides`); server 351 test va typecheck o'tdi. Qolganlar:
| Paket | Daraja | Holat |
|---|---|---|
| `content` (2 ta) | yuqori | ✅ yolg'on ogohlantirish: audit bizning ishchi paket nomimizni (`content`) npm'dagi boshqa paket bilan adashtiradi; bizda bunday bog'liqlik yo'q |
| `zod` 3.x (`content`, `server`) | yuqori | 🟡 «oversized constrained collections» xotira sarfi; tuzatish zod 4 ga katta o'tishni talab qiladi. Xavf cheklangan: HTTP tanasi ≤ 64 KB, WebSocket xabari ≤ 16 KB (`app.ts`). Zod 4 ga o'tish — alohida, sinovli vazifa (⬜) |
| `uuid`, `glob`, `minimatch`, `deepmerge` | o'rta/past | ✅ faqat mijoz yig'ish vositasida (expo CLI), productionga tushmaydi |
Qo'shimcha: kod taxminiga qarshi cheklov (hisob bo'yicha ~10 urinish/daqiqa) sinf, litsenziya va korporativ xona kodlariga qo'yildi (429 `rate_limited`, test bor).
