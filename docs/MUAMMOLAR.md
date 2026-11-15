# Qolgan muammolar ro'yxati (2026-11-15)

Holat: ✅ bajarildi · 🟡 branchda, `main` da emas · ⏳ kutmoqda (qaror/ruxsat) · ⬜ qilinmagan. Ustuvorlik tartibida.

## 1. Karta rasmlari (buyurtmachi qarori: dizayner kutilmaydi, rasmlarni o'zimiz chizamiz)
| # | Muammo | Holat |
|---|---|---|
| 1.1 | `cards.new` dagi 6 karta (`099_Q`, `Xarajat_086`, `MO_001`, `XAY_001`, `100_IJR`, `10_SUV_TOSHQINI`) rasmsiz edi | 🟡 chizildi (`content/art/generated`), test bor |
| 1.2 | `Q_001` va `099_Q` rasmida eski matn (qarz/foiz) halol moliyaga zid edi (OPEN_QUESTIONS 170) | 🟡 mudoraba/foyda ulushi matni bilan qayta chizildi |
| 1.3 | Generator `cards.new` va `Q_001` ni qo'llamasdi | 🟡 `render-card-art.ts` kengaytirildi |
| 1.4 | Orqa tomon rasmlari (2 ta), orzu (40), missiya (20) va karyera (12) kartalari uchun rasm holati | ⬜ tekshirilmagan |
| 1.5 | O'qituvchi paneli keyslari (20, `Y341…Y360`) rasmsiz: kolodada yo'q, rasm talab qilinmaydi | ✅ (xato aytilgan edi: ular «auksion» emas) |
| 1.6 | Auksion kartalari (`Y381…Y400`, 20 ta) rasmi bor; o'yinga to'liq ulanganligi tekshirilmagan | ⬜ |
| 1.7 | Qisqa matnli kartalarda katta bo'sh joy (masalan, «Qurilish materiallari qimmatlashdi»): dizayn sayqali | ⬜ ixtiyoriy |
| 1.9 | `client/assets/board.webp` (o'yin maydoni rasmi) ichida eski «POYGA» nomi qolgan; kirish sahifasidan olib tashlandi, boshqa joyda ishlatilsa qayta chizish kerak | 🟡 |
| 1.8 | Eski dizayner rasmlari (`deploy/vps/cards/`) sandbox nusxasida yo'q, faqat serverda; `install-art.sh` generatsiya qilinganlarini ustidan yozadi | ⏳ serverda tekshirish kerak |

## 2. O'yin qoidalari
| # | Muammo | Holat |
|---|---|---|
| 2.1 | O'zaro qarz: 3 guvoh (oluvchi tanlaydi, «Xabardor bo'ldim») va beruvchi chegarasi 30 % | 🟡 branchda (`e5427f6`), `main` ga merge ruxsati kerak |
| 2.2 | 3 dan kam mos guvoh qolsa ekranda xabar yo'q; qarz holatini oluvchi ko'rmaydi | ⬜ |
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
| 3.4 | Hisobot tahlili (`analyzeGame`) hali qat'iy rejimda: eski jurnalda yiqilishi mumkin | ⬜ |

## 4. Kirish, to'lov, xavfsizlik
| # | Muammo | Holat |
|---|---|---|
| 4.1 | Telefon: istalgan to'qqiz raqam kirib ketardi | 🟡 O'zbekiston MOBIL operator kodi tekshiriladi (`bad_operator`); chet el raqamlari va davlat kodi siyosati ochiq (OPEN_QUESTIONS 174) |
| 4.2 | SMS: Eskiz ulanishi, belgilangan kodni o'chirish | ⬜ |
| 4.3 | Yurist xulosasi: 16 yoshgacha to'lov, ma'lumot joylashuvi | ⏳ buyurtmachi |
| 4.4 | IP: karta, qoidalar, «Tajriba 24» nomi huquqi yozma tasdiqlanishi | ⏳ buyurtmachi |
| 4.5 | TURN server (ba'zi tarmoqlarda aloqa) | ⬜ |
| 4.6 | To'lov (do'kon, Payme/Click/Uzcard-Humo) va narxlar: MVP'dan keyin; narx variantini buyurtmachi aytadi | ⏳ |

## 5. Mahsulot (kengash shartlari; Founder paketi pauzada)
| # | Muammo | Holat |
|---|---|---|
| 5.1 | O'qituvchi paneli (sinf yaratish, natija hisoboti) | ⬜ |
| 5.2 | Turnir va korporativ xona boshqaruvi | ⬜ |
| 5.3 | Birinchi besh daqiqa: o'rgatish, yakka yoki kam odam bilan boshlash | ⬜ |
| 5.4 | 45 daqiqalik qisqa rejim | ⬜ |
| 5.5 | Bir gaplik va'da va MVP'dan olib tashlanadigan funksiyalar ro'yxati | ⬜ |
| 5.6 | Founder paketining qolgani (offer, CFO, marketing, brend, ops, launch, plan) | ⏳ mahsulot tayyor bo'lgach |

## 6. Texnik qarz
| # | Muammo | Holat |
|---|---|---|
| 6.1 | Brauzer tekshiruvlari (`calc-check` va b.) ba'zan tasodifan yiqiladi | ⬜ barqarorlashtirish |
| 6.2 | Guvoh qoidasi uchun brauzer tekshiruvi yozilmagan | ⬜ |
| 6.3 | Eski GitHub branchlari o'chirilmagan (so'ralmaguncha o'chirilmaydi) | ⏳ |
