# Bosh sahifa va onboarding: desktop prototip (2026-11-16)

Fayl: `design/prototypes/home-desktop.html`: bitta HTML, brauzerda ochiladi (internet faqat shrift uchun). Mobil moslashtirish keyingi bosqich: avval desktop tasdiqlanadi.

## Buyurtmachi so'rovi → prototipdagi yechim (yuqoridagi «Izohlarni ko'rsat» tugmasi 1–4 raqamlarni ko'rsatadi)
| № | So'rov | Yechim |
|---|---|---|
| 1 | O'quv o'yini (15 daqiqa): real o'yin; davomida hamma yangi karta, holat va bo'lim onboarding bilan tushuntirilsin | Bosh sahifada «Birinchi qadam» hero kartasi. «2 · O'quv o'yini» ko'rinishida 12 qadamli onboarding: qadam soni, 15 daqiqalik vaqt, yoritilgan joy, «Orqaga / Keyingi / O'tkazib yuborish», pastki chapda «Onboarding rejasi» (istalgan qadamni qayta ko'rish) |
| 1b | Yuqoridagi sahifalar (Mening kartalarim, Hisob varag'i, Tarix, Tahlil, Chat, Qoidalar, Moliyaviy holat) ichiga kirganda tushuntirish | Har bo'limga birinchi kirishda o'ng tomondan «Bu bo'lim nima?» paneli: qisqa izoh, nimani ko'rasiz, maslahat, «Tushundim». Ko'rilgach «yangi» belgisi yo'qoladi. Moliyaviy holat — onboarding 1, 2 va 7-qadamlarda |
| 2 | Yangi o'yin xona yaratadi | O'ng tomonda «Sizning xonangiz» xulosa paneli va bitta tugma |
| 3 | O'yin turi: Standart, Tez, Reytingli, O'quv + **Korporativ** | 5 ta tur kartasi; tanlanganda tushuntirish paneli; Korporativda «Tashkilot kodi» maydoni |
| 4 | O'yinchilar soni: hamma turda 2–8 | 2–8 tanlovi, «Siz + N o'rin» ko'rinishi |
| 5 | Tezlik 2 xil: Odatiy 30 soniya, Sekin 1 daqiqa; «Mehrojiddin» qoladi | 3 ta variant, har birida qaror vaqti va kubik vaqti |

## Qaror kerak (taxminlar)
1. **«0.3 sekund» = 30 soniya** deb tushunildi (karta qarori vaqti: Odatiy 30 soniya, Sekin 1 daqiqa, kubik 10 va 20 soniya). Agar boshqacha nazarda tutilgan bo'lsa, ayting.
2. **Hamma turda 2–8 o'yinchi** SPEC 5.12 dan farq qiladi (Tez 2–6, Reytingli 4–6, O'quv 3). Tasdiqlansa SPEC va dvigatel chegaralari yangilanadi; O'quv turida odam yetmasa botlar to'ldiradi.
3. **Korporativ tur** bosh sahifada qanday ishlashi: taklif — tashkilot kodi bilan yopiq xona (hozirgi korporativ xona tizimi, OPEN_QUESTIONS 179), faqat 16+. Boshqa variant: tashkilotchi xonani shu yerdan yaratadi.
4. **Onboarding hajmi:** 12 qadam / 15 daqiqa. Haqiqiy o'yinda qadamlar voqeaga bog'lanadi (tegishli karta birinchi marta chiqqanda), ketma-ket majburlanmaydi; mavjud 7 qadamli yo'l-yo'riq (`coach.ts`) kengaytiriladi.
5. Prototipdagi raqam va kartalar namuna.
