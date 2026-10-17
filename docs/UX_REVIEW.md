# UX/UI ko'rik (2026-10-17)

Usul: veb mijoz va admin yig'ildi, `server/scripts/screens.ts` va `screens-admin.ts` bilan ekran rasmlari olindi (390 / 1024 / 1440 px), kod o'qildi, CI'dagi `ui` xatosi tekshirildi. **Haqiqiy foydalanuvchi sinovi o'tkazilmagan** (o'qish tezligi, 30 soniyalik qaror yetarlimi, tugmalar joyi) va prototip bilan piksel solishtirish ham qilinmagan (SPEC §16: dizayner tasdig'i kutilmoqda). Quyidagilar ekran va kod asosidagi ekspert fikri.

## Tuzatildi
1. **Xabarlar sarlavhani to'sardi (yuqori).** `CardToast`/`GambleToast` ekranning eng tepasiga qo'yilgan edi va «Qoidalar» tugmasi hamda xona kodini yopib qo'yardi. O'zingizning majburiy kartangiz xabari o'z-o'zidan yopilmaydi, shuning uchun to'siq uzoq turishi mumkin edi. Shu sabab CI'dagi `ui` (e2e) beqaror qulagan («Yopish tugmasi bosishni to'sib turibdi»). Endi xabar sarlavha ostida chiqadi (`HEADER_H`).
2. **Admin diagrammalarida qiymat ko'rinmasdi (o'rta).** 14 kunlik ustunlarda o'q va yorliq yo'q edi, faqat sichqoncha ustida ko'rinardi. Endi birinchi/oxirgi sana va eng katta qiymat ko'rinadi.

## Keyingi bosqichda tuzatildi (2026-10-17)
- **Bosh sahifa:** «Yangi o'yin» yashil ikonka bilan ajratildi; ikonkalar takrorlanmaydi (kubik, kod bilan qo'shilish — odamlar, qoidalar — kitob, reyting — kubok, turnirlar — bayroq, sinf — uy, do'kon — yulduz).
- **Qaror varag'i:** naqd yetmasa, «O'tkazaman» asosiy (yashil) tugma bo'ladi, o'chiq tugma ikkinchi o'rinda.
- **Natija:** «chiqmadi» raqamlar qatoridan kichik, neytral matn bo'ldi.
- **Orzu tanlash:** hisoblagich «0/2 tanlagan» ko'rinishida.
- **Admin:** summalar («30 000 sh.b.») bir qatorda; telefonda sarlavha tugmalari ixcham.

## Tavsiyalar (dizayner/mahsulot qarori kerak)
Quyidagilardan yuqoridagi to'rttasi bajarilgan; qolganlari ochiq.
**Yuqori**
- **Taxta yozuvlari juda mayda.** Katak yozuvi 6–10 px (`Board.tsx` `labelSize`), tizimdagi eng kichik shrift 12 px. Telefonda katak yozuvi umuman yo'q, faqat ikonka va rang. Ma'lumot ikonka va rangdan o'qiladi, lekin yozuvli kataklar kompyuterda o'qilmaydi. Yo'l: yozuv o'rniga ikonka + qisqa belgi, yoki katakni bosganda tushuntirish, yoki kamida 11–12 px (katak balandligi o'zgaradi, maketga ta'sir qiladi).
- **Fishkalar katakni yopadi.** Telefonda o'ng ustundagi «1» va «2» fishkalar katak ikonkasini yopadi, kompyuterda START yozuvi ustiga tushadi. Fishkani katak chetiga yoki bir nechta bo'lsa yonma-yon qo'yish kerak.

**O'rta**
- **Bosh sahifada asosiy amal ajralmagan.** Yetti qator bir xil ko'rinishda; «Yangi o'yin» yagona asosiy amal, lekin boshqalardan farq qilmaydi. Shuningdek ikonkalar takrorlanadi («Yangi o'yin» va «Do'kon» ikkalasida «+», «Reyting» va «Turnirlar» kubok, «Kod bilan qo'shilish» va «Sinf» odamlar), shuning uchun ikonkalar skanerlashga yordam bermaydi. Tavsiya: «Yangi o'yin»ni tugma shaklida ajratish, ikonkalarni har xil qilish. «Salom» sarlavhasida ism yo'q.
- **Qaror varag'ida asosiy tugma o'chiq.** Naqd yetmasa («Naqd yetmadi») asosiy yashil tugma o'chiq va rangi oqargan, faqat «O'tkazaman» ishlaydi. Sababi qizil bannerda yozilgan, lekin asosiy tugma o'chiq turganda uni «o'tkazaman» ga almashtirish yoki tugma ostida sabab matnini aytish aniqroq bo'lardi.
- **Orzu tanlash.** Har kartada alohida «Tanlash» tugmasi, kartaning o'zi bosilmaydi; ro'yxat uzun. Taymer («60 s») tepada kichik. O'yinchi chiplari «O'yinchi 1 …» deb qirqilgan. «0/2» nimani anglatishi aytilmagan.
- **Natija ekrani.** «Kichik aylanadan chiqdi» ko'rsatkichi qiymat o'rnida «chiqmadi» so'zini katta shriftda ko'rsatadi, raqamlar qatorida bu g'alati ko'rinadi. Diagrammada o'q va qiymat yozuvlari yo'q (admin diagrammalari kabi).
- **Profil.** «Tug'ilgan yil» maydoni nima uchun so'ralishini aytmaydi (16 yoshgacha cheklovlar). Matn va yuridik tomoni SPEC §16 va yurist tasdig'iga bog'liq, shuning uchun o'zim yozmadim. Bosh qismida uchta chip («Daraja 0», yulduzlar, «Yollanma ishchi») to'planib qolgan.
- **Admin, telefon.** Sarlavhada «Mening hisobim» va «Chiqish» ikki qator joy oladi, bo'lim yorlig'i qirqilgan («ALANUVCHILAR»). Menyuni yig'iladigan qilish kerak.
- **Admin, pul kartalari.** «30 000 sh.b.» kartada ikki qatorga o'tadi; kartani kengaytirish yoki shriftni kichraytirish.

**Past**
- Admin sana maydonlarida brauzer tilidagi «mm/dd/yyyy» ko'rinadi (o'zbekcha emas).
- Admin yon panelida «Mening hisobim» va «Chiqish» pastda, 900 px balandlikda aylantirmasdan ko'rinmaydi; pastki qismini yopishqoq qilish mumkin.
- Kompyuterda taxta ostida bo'sh joy ko'p.
- Reaksiya (emoji) tugmalarining nomi bor-yo'qligini tekshirish kerak (axe buzilish topmadi).

## Tekshiruv natijasi
`pnpm typecheck`, `pnpm test` (210 server, 748 qoidalar, 63 mijoz va boshqalar), `server/scripts/e2e-play.ts` (telefon va kompyuter, 60 navbat, xatosiz), `pnpm a11y` va admin axe: buzilish yo'q.

## Hali sinalmagan
Haqiqiy telefon/planshet, ekran o'qigichlar bilan qo'lda sinov, 16 yoshgacha oqim (ota-ona tasdig'i), sekin tarmoqda holat xabarlari.
