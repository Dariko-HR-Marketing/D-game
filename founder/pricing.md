# Narx tahlili: Tajriba 24 onlayn

Sana: 2026-11-14. Manba: `pricing-curve-a.md`, `pricing-curve-b.md` (40 ta simulyatsiya qilingan xaridor), `competitors.md`. Tool chiqishidagi "$" belgisi xato: hamma summa so'mda.
Qaror (idea.md): faqat onlayn; bepul o'yin + obuna. Narx bo'yicha yakuniy raqamlar yo'q: simulyatsiya narxni tanlash uchun, isbot emas.

## 1. Xaridorlar nima dedi (Van Westendorp, so'm)

**Panel A: bitta maktab/markaz uchun bir yillik litsenziya (20 ta javob)**
| nuqta | so'm |
|---|---:|
| PMC (bundan past: "juda arzon, sifatsiz") | 518 600 |
| OPP (eng kam qarshilik) | 524 500 |
| IPP (arzon = qimmat teng) | 1 521 600 |
| PME (bundan yuqori: sotib olmaydi) | 4 984 900 |
Qabul qilinadigan oraliq: **518 600 – 4 984 900 so'm / yil**. Medianlar: juda arzon 300 000, arzon 1 000 000, qimmatlashyapti 3 000 000, juda qimmat 6 000 000.

**Panel B: bitta turnir yoki korporativ xona, bir martalik (20 ta javob)**
| nuqta | so'm |
|---|---:|
| PMC | 3 009 464 |
| OPP | 3 116 250 |
| IPP | 10 217 500 |
| PME | 39 992 917 |
Qabul qilinadigan oraliq: **3 009 464 – 39 992 917 so'm / turnir**. Medianlar: juda arzon 2 000 000, arzon 8 000 000, qimmatlashyapti 25 000 000, juda qimmat 60 000 000.

Ogohlantirish: har ikki panelda hamma xaridor sotib olmaslikni aytgan edi (mahsulot hali tayyor emas). Narx javoblari "agar tayyor bo'lsa" taxminlari, shuning uchun juda yumshoq; haqiqiy to'lov tayyorligi bundan past bo'lishi mumkin.

## 2. Raqobatchi narxlari bilan solishtirish (competitors.md)
- Onlayn raqobatchilar BEPUL: Cashflow Classic, Moliya olami, Finlit.uz. Pullik narsa ularga nisbatan aniq "bepul bermaydigan" qiymat berishi kerak (o'qituvchi paneli, hisobot, sinf boshqaruvi, o'zbek lotin tili).
- Jonli seans: CashFlow Tashkent 200 000 – 250 000 so'm bir o'rin uchun (taxminan 3 soat). Onlayn o'yin xonasi bu narx bilan solishtiriladi, lekin zal va moderator xarajati yo'q.
- Qutidagi Cashflow 169 000 – 500 000 so'm: sizda quti yo'q, shuning uchun to'g'ridan-to'g'ri taqqoslanmaydi.
- Banklar uchun turnir narxi bo'yicha raqobatchi narxi topilmadi (ochiq manbada yo'q): bu taqqoslash qilinmadi.

## 3. Biznes nimaga muhtoj (CFO)
`founder/numbers.json` yo'q: server, SMS va qo'llab-quvvatlash xarajati, byudjet va muddat noma'lum. Shu sababli marja va break-even hisoblanmadi va men uni to'qimayman. Bu `/founder-cfo` ning vazifasi; narx shundan keyin qayta tekshiriladi. Yakuniy narx qarori CFO'dan keyin.

## 4. Narx va zina (tavsiya, test uchun)

**Muassasa (ta'lim):**
- Zina: (1) bepul bitta sinf sinovi → (2) maktab/markaz yillik litsenziyasi → (3) bir nechta maktab/tuman uchun yillik shartnoma.
- Sinash uchun ikki narx, ikkalasi panel oralig'ida: **1 500 000 so'm** (IPP atrofida) va **3 000 000 so'm** (qimmatlashyapti medianiga yaqin) / yil. 4 984 900 dan yuqori sinab ko'rilmaydi.
- Ochilish taklifi: birinchi yil uchun bepul pilot sinf, so'ng to'langan yillik litsenziya, aniq tugash sanasi bilan (tugash sanasini siz belgilaysiz).

**Bank/kompaniya:**
- Zina: demo turnir (bepul yoki ramziy) → bitta brendli turnir → yillik hamkorlik.
- Sinash uchun ikki narx: **8 000 000 so'm** (arzon medianiga yaqin) va **10 217 500 so'm** (IPP). 39 992 917 dan yuqori sinab ko'rilmaydi.
- Bu panel faqat bir martalik turnirga javob bergan; yillik hamkorlik narxi sinalmagan.

**Yakka o'yinchi (Plus):** panel BU yo'nalishni sinamagan (panel A dagi 20% ota-ona maktab litsenziyasiga javob bergan, Plus obunasiga emas). Plus narxi uchun ma'lumot yo'q: to'qimayman. Kerak: Plus uchun alohida kichik so'rov (o'yinchilar bilan), keyin narx. 16 yoshgacha to'lov yurist xulosasini kutadi.

## 5. Narxga qarshi e'tirozlar (marketing javob berishi kerak)
1. "Bepul Finlit.uz / Moliya olami bor, nega to'layman?" (panel A: ko'pchilik)
2. "Narx e'lon qilinmagan, byudjetga kirita olmayman" (panel A va B)
3. "Boshqa bank/maktab sinab ko'rmagan, avval natija ko'rsating" (panel B)

## 6. Haqiqiy odamlar bilan nimani sinash
- Ikki narx (yuqoridagi) bo'yicha 5–10 ta maktab/markaz bilan pilot suhbat yoki oldindan kelishuv (niyat xati).
- 3–5 ta bank/kompaniya bilan demo turnir va narx taklifi.
- Plus uchun 30–50 o'yinchi bilan narx so'rovi (Van Westendorp), 16+.
- Eng muhimi: avval o'qituvchi paneli yoki turnir demosi tayyor bo'lishi kerak, aks holda sotuv bo'lmaydi (ikkala panel shuni aytdi).
