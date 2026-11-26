# Maxfiylik siyosati — QORALAMA

> **Bu hujjat advokat/huquqshunos tomonidan ko'rib chiqilmagan qoralama.** Ommaga e'lon qilishdan oldin O'zbekiston qonunchiligiga (shaxsiy ma'lumotlar to'g'risidagi qonun, ma'lumotlarni mahalliy saqlash talablari, voyaga yetmaganlar) mosligi tekshirilishi shart. `[...]` — to'ldirilishi kerak bo'lgan joylar.

**Operator:** [yuridik shaxs nomi, STIR, manzil] · **Aloqa:** [email/telefon]

## 1. Qanday ma'lumotlar yig'iladi (haqiqatda kodda nima bor)
| Ma'lumot | Nima uchun | Qayerda |
|---|---|---|
| Telefon raqami | Faqat SMS kod yuborish uchun. **Saqlanmaydi**: undan qaytarib bo'lmaydigan identifikator (HMAC) hosil qilinadi | SMS shlyuz orqali o'tadi |
| Ism (2–24 belgi), rang | O'yinda ko'rsatish | Ma'lumotlar bazasi |
| Tug'ilgan yil | 16 yoshgacha cheklovlar (qarz, sheriklik yopiq); ko'rsatilmaydi | Ma'lumotlar bazasi |
| O'yin tarixi, natijalar, ball | Profil, reyting, o'yin tahlili | Ma'lumotlar bazasi |
| Harakatlar jurnali | Nizoni hal qilish va o'yinni tiklash | Ma'lumotlar bazasi |
| Shikoyatlar | Moderatsiya | Ma'lumotlar bazasi |
| Texnik jurnal | Xatolarni topish. **IP manzil va token yozilmaydi** | Server jurnali |
| Telegram identifikatori (faqat obuna tekshiruvi yoqilganda) | Kanal va guruhga obuna bo'lganingizni tekshirish. Botda «Start» bosganingizda hosil bo'ladi | Ma'lumotlar bazasi |
| Instagram identifikatori (faqat obuna tekshiruvi yoqilganda) | Sahifamizga obuna bo'lganingizni tekshirish. Siz sahifaga kod yuborganingizda hosil bo'ladi | Ma'lumotlar bazasi |
| Obuna tekshiruvi natijasi (ha/yo'q va sanasi) | O'yin ochish va qo'shilishdan oldin tekshirish | Ma'lumotlar bazasi |
| Buyurtmalar va to'lov holati | Xarid (paket) berish va hisob-kitob. **Karta raqami bizda saqlanmaydi**: to'lov Payme/Click sahifasida bo'ladi | Ma'lumotlar bazasi |

Reklama identifikatorlari, joylashuv, kontaktlar va karta ma'lumotlari **yig'ilmaydi**. YouTube obunasini tekshirishda Google ruxsati (faqat obunalarni ko'rish) bir marta ishlatiladi; **token saqlanmaydi**, faqat natija (ha/yo'q) yoziladi.

## 2. Huquqlaringiz
- **Yuklab olish:** Profil → «Ma'lumotni yuklab olish».
- **O'chirish:** Profil → «Hisobni o'chirish» (profil o'chiriladi, o'yin natijalarida ismingiz anonimlashtiriladi).
- Qolgan huquqlar (tuzatish, e'tiroz): [aloqa] orqali, [muddat] ichida javob beramiz.

## 3. 16 yoshgacha foydalanuvchilar
16 yoshgacha bo'lganlar uchun o'yinchilar o'rtasidagi qarz va sheriklik yopiq; boshqa ma'lumot yig'ilmaydi. [Ota-ona roziligi talabi — huquqshunos aniqlaydi.]

## 4. Saqlash muddati va joyi
[Muddatlar: faol hisob — hisob o'chirilgunicha; zaxira nusxalar — 14 kun; jurnallar — [..] kun.] Ma'lumotlar [mamlakat/provayder] serverida saqlanadi. [Ma'lumotlarni O'zbekiston hududida saqlash talabi bo'yicha xulosa — huquqshunos.]

## 4a. Obuna tekshiruvi (majburiy obuna)
Yoqilganda, 16 yoshdan katta o'yinchi o'yin ochish yoki qo'shilishdan oldin bizning Telegram kanali/guruhi, Instagram sahifasi va YouTube kanalimizga obuna bo'lishi kerak. Telegram va Instagram obunasi har safar o'yin boshlashdan oldin qayta tekshiriladi; YouTube har 7 kunda. Obunadan chiqsangiz, o'yinni davom ettirish uchun qayta obuna bo'lishingiz kerak. Bu tekshiruv uchun faqat yuqoridagi identifikatorlar va natija saqlanadi. Hisob o'chirilsa, bu ma'lumot ham o'chadi. 16 yoshgacha foydalanuvchilarga bu talab qo'llanmaydi.

## 5. Uchinchi tomonlar
Hosting: [provayder]. SMS yuborish: [provayder] (faqat telefon raqami va kod matni). To'lov: Payme va Click (karta ma'lumotlarini ular qabul qiladi, biz ko'rmaymiz). Obuna tekshiruvi: Telegram, Meta (Instagram) va Google (YouTube). Boshqa hech kimga ma'lumot sotilmaydi va berilmaydi, qonuniy talablar bundan mustasno.

## 6. Xavfsizlik
Aloqa HTTPS/WSS; kodlar xesh ko'rinishida va qisqa muddatli; kirish tezligi cheklangan; administratorlar rollar bo'yicha cheklangan, harakatlari jurnalga yoziladi.

## 7. O'zgartirishlar
[Qoidalar o'zgarsa foydalanuvchi qanday xabardor qilinadi.]
