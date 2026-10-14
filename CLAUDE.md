# CLAUDE.md — POYGA onlayn

To'liq spetsifikatsiya: `docs/SPEC.md` (A–D ilovalar ham shu yerda). Quyida §1, §2 va §14 ko'chirilgan. Zid bo'lsa SPEC.md ustun. Qoidani o'zingdan to'qima; noaniq joyni SPEC §16 ro'yxatiga yoz va to'xta.

## 1. Mahsulot
- **Nomi:** POYGA onlayn (D-game, DARIKO ekotizimi o'yin brendi). Stol o'yinining onlayn versiyasi: moliyaviy savodxonlik, pul oqimi va passiv daromad yaratishni o'rgatadi.
- **Maqsad:** stol o'yinidagi tajribani saqlab, qalam, o'chirg'ich va qo'lda hisobni olib tashlash.
- **Auditoriya:** o'yinchilar (16+, 16 yoshgacha cheklovlar bilan), ta'lim muassasalari, bank va kompaniyalar.
- **Platforma:** iOS, Android va veb (planshet va kompyuter, veb-to'lov shu yerda). Bitta kod bazasi tavsiya etiladi.
- **Asosiy tamoyil:** asosiy o'yin bepul. Pulli qo'shimchalar o'yin natijasiga ta'sir qilmaydi, loot box yo'q. Ballar pulga almashtirilmaydi va bu haqda hech qayerda gap bo'lmaydi.
- **Prototip (ko'rinish manbasi):** https://claude.ai/artifact/KeUb5G2eTvY86cGJPESv2b — 53 mobil, 18 planshet/kompyuter ekrani. **TZ:** https://claude.ai/code/artifact/8b277748-5a1a-440a-9ff9-e577fa426f71. Ko'rinish prototipdan, xatti-harakat shu fayldan olinadi; ular zid bo'lsa shu fayl ustun.

## 2. Qat'iy cheklovlar (buzilmaydi)
1. O'yin natijasi faqat serverda hisoblanadi; mijoz natijani o'zgartira olmaydi.
2. Hamma matn o'zbek lotin alifbosida; matnlar kodda emas, alohida tarjima jadvalida.
3. Katta summalar doim to'liq yoziladi: `1 020 000` (qisqartirish yo'q).
4. Faqat bu faylda va ilovalarda berilgan raqamlar ishlatiladi. Narxlar yo'q: ular sozlamada (konfiguratsiyada) bo'sh turadi va keyin to'ldiriladi.
5. Kartalar asl rasmi bilan chiqadi; ilova kartani qayta chizmaydi, faqat ta'sirini hisoblaydi.
6. Karta nomi: «KUTILMAGAN HODISA!».
7. Kichik va katta aylana o'yinchilari o'rtasida qarz, sheriklik va suyunchi yo'q.
8. 16 yoshgacha: to'lov ota-ona tasdig'i bilan, o'zaro qarz/sheriklik va erkin chat yopiq, reklama yo'q.
9. Ilovada faqat do'kon to'lovi (App Store / Google Play); Payme, Click, Uzcard/Humo faqat veb-versiyada.


## 14. Claude Code uchun ish tartibi
1. Faylni o'qi, `CLAUDE.md` yarat, texnologiya tanlovini taklif qil va **to'xtab tasdiq so'ra** (tanlov mening qarorim).
2. Monoreponi qur: `rules` (qoidalar dvigateli, UI'siz), `server`, `client`, `content` (ilovalardagi JSON), `admin`.
3. **Birinchi navbatda qoidalar dvigateli** va uning testlari (§5, §13). UI undan keyin.
4. Kontent: A–D ilovalardan JSON import qilib, har bir kartani schema bilan tekshir; kartalarning rasmlari `file` maydonidagi nomlar bilan alohida beriladi (bu faylda yo'q).
5. Server: xonalar, navbat, taymer, qayta ulanish, o'yin jurnali.
6. Mijoz: avval telefon, so'ng planshet va kompyuter ko'rinishi; prototip ekranlari bilan solishtirib tur.
7. Hisob va kirish, so'ng admin; monetizatsiya MVP'dan keyin.
8. Har bosqich oxirida: testlar o'tdi, o'tmagan joy ro'yxatga yozildi, qisqa hisobot.
9. Pul/narx/muddat haqida taxmin qilma; bo'sh joyni konfiguratsiyada qoldir va §16 ga yoz.

## Texnologiya (tasdiqlangan)
TypeScript monorepo (pnpm); `rules` — sof TS + Vitest; `server` — Node + Fastify + WebSocket + PostgreSQL; `client` — Expo (React Native + Web); `content` — JSON + Zod schema; `admin` — React veb.
