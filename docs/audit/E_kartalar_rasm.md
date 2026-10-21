> Avtomatik tahlil (subagent hisoboti, 2026-10-21): dalil sifatida saqlanadi; har bir da'vo qaror qilinishidan oldin manba bilan qayta tekshiriladi. Qarorlar reestri: ../NORMATIVE_AUDIT.md

# E. Karta RASMLARI (Bozor, Shit_happens, Kasb kartalari) — findings

## 1. Manba (nima o'qildi)
- `z_Kasb_kartalari/` 29 PNG (1120x1620): 00 orqa tomon + 28 kasb kartasi. Hammasi (28 ta) to'liq o'qildi, har bir qator va raqam JSON bilan dasturiy solishtirildi.
- `z_Shit_happens/` 10 PNG (1536x1024): 9 old tomon + `ORQA_TOMON_UMUMIY`. Hammasi o'qildi.
- `z_Bozor/` 98 PNG (1400x900): 98 tasi 6 tadan kontakt varaq qilib to'liq o'qildi (matn + kod + raqam), JSON bilan satrma-satr solishtirildi; fayl nomlari (001..098) `cards.json` `bozor[].file` bilan bir xil tartibda (dasturiy tekshiruv: nom mos kelmasligi 0).
- Solishtirish: `content/data/cards.json` — `kasb` (28), `bozor` (98), `hod` (9), `new` (6). Rasm vositalar bilan o'qildi (OCR yo'q), shuning uchun I/l kabi bir xil ko'rinadigan harflar ajratilmagan.

## 2. OCHIQ SAVOLGA JAVOB: kasb kartasidagi 9 ta xarajat satri nomi va tartibi
Kasb kartasi (barcha 28 ta kartada bir xil shablon). Yuqoridan pastga jadval:

Daromad bloki (kartada ko'rsatiladi, JSON'da alohida maydon yo'q, hammasi passiv=YO'Q):
1. «Ish haqi + daromad (aktiv daromad)» = `salary`
2. «Qo'yilmalar bo'yicha foizlar (passiv daromad)» = YO'Q
3. «Ko'chmas mulkdan daromad (passiv daromad)» = YO'Q
4. «Bizneslardan daromad (passiv daromad)» = YO'Q
5. «Passiv daromad» = 0
6. «YALPI DAROMAD» = `salary`

Xarajat bloki — `exp[0..8]` TARTIB BILAN (rasmda aynan shu tartibda, yuqoridan pastga; 1-karta bilan tekshirildi: [100,350,500,300,100,0,50,300,250]):

| exp[i] | Kartadagi satr nomi (aynan) | Eslatma |
|---|---|---|
| 0 | Kvartira to'lovi | ijara/kommunal; kreditdan alohida |
| 1 | Oziq-ovqat xarajatlari | |
| 2 | Kvartira uchun kredit to'lovi | `kv` (kvartira krediti summasi) > 0 bo'lsa > 0 |
| 3 | Mashina uchun kredit to'lovi | `car` > 0 bo'lsa > 0 |
| 4 | Telefon so'zlashuvlari xarajatlari | |
| 5 | Trening uchun to'lov | faqat 4, 17, 25, 27 kartada > 0, qolganda «YO'Q» (=0) |
| 6 | Kiyim-kechakni yangilash xarajatlari | |
| 7 | Yo'l/yoqilg'i xarajatlari | |
| 8 | Soliqni to'lash | |
| — | YALPI XARAJAT | = sum(exp) = `total` |

Keyin: «Oylik pul oqimi (Cash Flow) = Jami daromad − jami xarajat» = `cf`; «AKTIVLAR: Jamg'arma» = `save`; «KREDITLAR: Kvartira / Mashina» = `kv` / `car` («YO'Q» = 0); «Bir bolaga ketadigan xarajat» = `child`; pastda matn: «BOSHLANG'ICH MA'LUMOTLARNI O'YIN BALANSINGIZGA KO'CHIRIB OLING!». Sarlavha: «KASB KARTOCHKASI (LAVOZIMI / ISH JOYI)». Kartada valyuta belgisi («sh.b.») yo'q; raqamlar probelsiz (30000).
Xulosa: 9 raqam ↔ 9 satr nomi aniq. Tavsiya: `exp` uchun kalit nomlari (i18n): `expRent, expFood, expHomeLoan, expCarLoan, expPhone, expTraining, expClothes, expTransport, expTax`; bola xarajati (`child`) va kreditlar (`kv`, `car`) alohida qoladi.

## 3. 28 KASB: rasm ↔ cards.json
Dasturiy solishtirish natijasi: `salary`, `exp[9]`, `total`, `cf`, `save`, `kv`, `car`, `child` — **28/28 kartada 100% mos** (farq 0). Rasm ichki yig'indilari ham to'g'ri (sum(exp)=total, salary−total=cf; 28/28). Karta №19 «Reklama agenti» rasmi MAVJUD (`19_REKLAMA_AGENTI.png`: 300; [20,150,0,0,20,0,10,20,30]; 250; 50; jamg'arma 500; bola 70) va JSON bilan mos. 28 kasb: yetishmaydigani yo'q, ortiqchasi yo'q.
Nomlar: rasmdagi sarlavha JSON `name` bilan mos, faqat yozuv farqlari: «HUQUQSHUNOS MASLAHATCHI» (JSON «Huquqshunos-maslahatchi»), «PLITACHI - ISHCHI» (JSON «Plitachi-ishchi»), «XALQARO KOMPANIYA TOP MENEJERI» (JSON «top-menejeri»), «BO'LIM/G'AZNACHI/DO'KON/UZOQ YO'LGA» (to'g'ri ʻ yo'q, ASCII apostrof).

## 4. ZIDDIYATLAR
| № | Mavzu | Yangi manba (iqtibos) | Mavjud tizim | Og'irlik | Tavsiya |
|---|---|---|---|---|---|
| 1 | Karta nomi | 9 ta Shit_happens old tomonining sarlavhasi: «SHIT HAPPENS!» (kichik sarlavha «MOLIYAVIY YO'QOTISH»); orqa tomon: «SHIT HAPPENS! … PUL KO'KKA SOVURILDI!» (череп/suyak belgisi) | SPEC §2.6 / CLAUDE.md:19: «Karta nomi: «KUTILMAGAN HODISA!»»; SPEC.md:157 dizayner: «KUTILMAGAN HODISA!» orqasi; client i18n/uz.ts:19,87 «Kutilmagan hodisa!» | yuqori | Rasmlar qayta chizilmaydi (§2.5) — mijoz matni «KUTILMAGAN HODISA!» bo'lib qoladi, rasm sarlavhasi esa «SHIT HAPPENS!» bo'lib chiqadi. Buyurtmachidan qaror: (a) dizayner 10 rasmni «KUTILMAGAN HODISA!» bilan qayta chizadi yoki (b) §2.6 «SHIT HAPPENS!»ga o'zgaradi. Hozircha SPEC §16 ga yozing. Ayrim (inglizcha) sarlavha o'zbek-lotin cheklovi (§2.2) bilan ham zid. |
| 2 | Korxona nomi | Bozor 047–051 (5 ta UTK karta): «“Uztelekom” korxonasi…» (rasmda hamma joyda «Uztelekom») | cards.json `bozor[46..50].text`: «“O‘zbektelekom”»; `group` «Aksiya · O‘zbektelekom»; SPEC.md:157: nom hamma joyda «O'zbektelekom» | yuqori | Matn (JSON) va rasm farqli. SPEC qarori «O'zbektelekom» bo'lgani uchun dizayner 5 rasmni qayta chizsin; ungacha JSON matni rasm bilan zid (UI karta rasmini ko'rsatadi). Bu SPEC §16 dagi allaqachon ochiq band bilan bir xil — tasdiqlandi, manbada «Uztelekom». |
| 3 | Hod #8 matni | Rasm 08: «Yer, dala-hovli **va kvartira aksiyalari** narxi sotilish va sotib olish narxidan ikki barobarga tushib ketdi» | cards.json `hod[7].text`: «Yer, dala-hovli, kvartira **va aksiyalar** narxi…», note «Matn aniqlashtirildi (qaror)» | o'rta | Rasm bo'yicha «kvartira aksiyalari» noaniq (kvartira + aksiya?). Mavjud qaror (yer, dala-hovli, kvartira va aksiyalar tushadi) rasmdan farq qiladi; rasm o'zgarmagani uchun UI tavsifi va rasm mazmuni mos kelmaydi. Tavsiya: buyurtmachi tasdig'i + dizayner rasmni to'g'rilasin; mexanika (4 aktiv turi ÷2) o'zgarmaydi. |
| 4 | Hod #7 matni | Rasm 07: «…KBIlaringizdan birini aylanaga qaytaring» (KB + ortiqcha «I/l») | cards.json hod[6]: «KBllaringizdan» (rasmdagidek) | past | Ikkalasida ham imlo xatosi («KB’laringizdan» bo'lishi kerak). Dizayner/JSON ni to'g'rilash. |
| 5 | Bozor 013 imlo | Rasm: «…qidirmoqda» | cards.json bozor[12].text: «**qq**idirmoqda» | past | JSON matnni to'g'rilash (rasm to'g'ri). |
| 6 | Bozor kategoriya nomlari | Rasm sarlavhasi: «BOZOR / MAJBURIYAT» (QAR), «AKSIYALAR» (UTK, ZA, TAPOiCh, KCh, GZ), «BIZNES» (MB), «YER VA HOVLI» (DX, Ye), «UY-JOY» (KV…, KV1s+KV2s, Barcha kvartiralar), «KOLLEKSIYA», «AVTOMOBIL» | cards.json `group`: «Qarov», «Kichik biznes», «Dala hovli», «Yer (sotixiga)», «Buziladigan uylar» … | past | Faqat ichki guruh; rasm UI da ko'rinadi, JSON `group` faqat admin uchun. Zarar yo'q, lekin QAR deka «MAJBURIYAT» deb nomlangan (sotish ham bor) — mexanika `kind` bo'yicha ishlasin, `group` bo'yicha emas. |
| 7 | Bozor 087 turi | Rasm 087: «Darhol unga 200 sh.b.ga televizor olib bering…» — bu MAJBURIY TO'LOV | cards.json bozor[86] `kind`: «Sotish imkoniyati» (3 ta boshqa QAR to'lovida «Majburiy to'lov») | o'rta | `kind` ni «Majburiy to'lov» ga tuzatish. Agar dvigatel `kind` bo'yicha ishlasa — qarov kartasi egasi televizor uchun 200 oladi (teskari ta'sir). Tekshirish: rules qarov handler. |
| 8 | Hod: 10-karta (TOSH) | Shit_happens da faqat 9 old tomon bor (№10 «Suv toshqini» rasmi yo'q) | cards.json `new[5]` {deck:hod, code:TOSH, file:10_SUV_TOSHQINI.webp} | o'rta | Yangi 6 kartaning rasmi yo'q (SPEC §16: dizayner). Hod deka 9 ta rasm bilan keladi; №10 matnli/shartli qo'shilgan. |
| 9 | Raqam formati | Rasmlarda: bozor «20000 sh.b.» (probelsiz), lekin 097/098/051/054/061/066/091-094 matnida «10 000 sh.b.», «1 000 000 000»; kasb «30000»; hod «10 000 sh.b.» | CLAUDE.md §2.3: katta summalar doim to'liq «1 020 000» | past | Rasmlar o'zgartirilmaydi. UI da (jadval/balans) probelli formatlash; rasm ichidagi probelsiz raqam dizayner tarafidan bir xil qilinishi mumkin (ixtiyoriy). |
| 10 | Karta rasm o'lchamlari | kasb 1120x1620; bozor 1400x900; hod 1536x1024 PNG | OPEN_QUESTIONS #124: «kasb 420×608; bozor 480×~309 (maket paketi)» | past | Manba sifati yuqori: import-cards.py webp ga o'tkazishda o'lchamlarni (masalan 840×1216 / 700×450) tanlab oling; nisbat saqlansin. |
| 11 | Karta №19 rasmi | `19_REKLAMA_AGENTI.png` mavjud | OPEN_QUESTIONS #124: «Reklama agenti rasmi yetishmaydi» | past (yopildi) | Ochiq savolni yoping: №19 rasmi yuklandi, ma'lumotlar JSON bilan mos. |
| 12 | Fayl nomlari | `11_G'AZNACHI.png`, `15_BO'LIM_RAHBARI.png`, `21_UZOQ_YO'LGA_…`, `24_DO'KON_…` (apostrofli) | cards.json `file`: `11_GAZNACHI.webp`, `15_BOLIM_RAHBARI.webp`, `21_UZOQ_YOLGA…`, `24_DOKON…` | past | import-cards.py da nomni normallashtirish (apostrofni olib tashlash) — hozirgi mapping indeks (№) bo'yicha bo'lsin. |

## 5. Bozor 98 karta: rasm ↔ JSON (nomma-nom)
Barcha 98 karta o'qildi: kod (KV1, KV1o, KV2, KV2o, KV3, KV3o, KV4, DX, Ye, MB, UTK, ZA, TAPOiCh, KCh, GZ, AV, D, QAR, KV1s+KV2s, Barcha kvartiralar), narx/summa va matn JSON bilan mos. Farq faqat: 013 imlo (#5), 047–051 «Uztelekom» (#2), 087 turi (#7). Qolganlari (001–012, 014–046, 052–086, 088–098) matn va summa bo'yicha aynan mos. Rasmda ko'rinadigan summalar: KV1 20000/35000/50000/60000; KV1o 35000/55000/65000/75000; KV2 35000/40000/50000/80000; KV2o 50000/70000/85000; KV3 60000/70000/80000/90000; KV3o 80000/100000; KV4 150000/200000/250000; DX 30000/50000/55000/60000/70000/80000; Ye 500/700/800/1000/1500/2500/3000/5000; MB +100/150/200/250/300/400/500/600; UTK 50/100/5/30/200; ZA 40/20/80/5; TAPOiCh 20/30/50/100/5/200; KCh 20/30/40/5/8; GZ 40/70/10/100; AV 8500/9000/6000/10000/3000/7500/12000/20000; D 100/3000/3000/100; QAR +50/+100 xarajat, 100/300/200(TV)/100/300(dafn)/25000(meros); KV1s/KV2s 50000-70000/50000-90000/45000-60000/45000-70000; Barcha kvartiralar +50% / ×2 / +10-20-30-40 ming / +70-90-100-110 ming.
Eslatma (rasm ichida ichki noaniqlik, o'zgartirib bo'lmaydi): 096 «narxni (2 barobar) haqiqiy qiymatga qo'shgan holda» — ×2 mi yoki +100%? JSON `note` «haqiqiy qiymatga qo'shiladi» (ya'ni qiymat ×2). 095 «50% ga qimmatlashdi» = ×1,5. Mavjud dvigatel shunday talqin qilishini tekshiring.

## 6. Shit_happens (9 old + orqa) ↔ `hod`
Tip: bu `hod` deka (SPEC §14.7 / `hod`, K katagi «Kutilmagan hodisa»): rasmda qizil «K» belgisi (=K katak) — mos. `new` bo'limiga TEGISHLI EMAS. Rasmlar `hod[0..8]` bilan indeks (01..09) bo'yicha mos:
| № | Rasm: matn (qisqa) / summa | JSON hod | Natija |
|---|---|---|---|
| 1 | Tovarni halol insonga… 10 000 | amount 10000 | mos |
| 2 | Amerikalik maslahatchi 21 000 | 21000 | mos |
| 3 | Tanishga qarz 5 000 | 5000 | mos |
| 4 | Avto ehtiyot qismlari biznesi 25 000 | 25000 | mos |
| 5 | Piyoz Rossiyaga 25 000 | 25000 | mos |
| 6 | Sharbat konsentrati Ukrainaga 10 000 | 10000 | mos |
| 7 | Biznes sherigi: 75 000 yoki 1 KB qaytarish | 75000 | mos (imlo #4) |
| 8 | Jahon moliyaviy inqirozi: yer, dala-hovli va kvartira aksiyalari narxi ÷2; summa «Barcha o'yinchilar» | amount «Barcha o'yinchilar» | matn farqi #3 |
| 9 | Xitoy poyafzali: 60 000 o'tkazdingiz… Bankka 30 000 | 30000 | mos |
Orqa tomon: qora fon, «SHIT HAPPENS! PUL KO'KKA SOVURILDI!» — import-cards.py `orqa_tomon_umumiy → back_hod.webp` bilan mos (nom bo'yicha), lekin yozuv zid (#1). Kartalarda «K» belgisi, «MOLIYAVIY YO'QOTISH» yorlig'i bor; summa pastda qora «pill»da.

## 7. KAMCHILIKLAR (yangi manbada)
- Yangi 6 karta (`new`: Q 099 qarz qaytdi, IJR 100 ijarachi ketdi, SUG sug'urta, MO malaka oshirish, XAY homiylik, TOSH suv toshqini) rasmi bu papkalarda YO'Q (bozor 098 da tugaydi; hod 09 da tugaydi). SPEC §16 (dizayner) ochiq — o'zgarmadi.
- Kasb kartasida: kvartira/mashina kredit to'lovi va kredit summasi nisbati bir xil emas: mashina 17000→300, 20000→300, 9000→200, **30000→200 (16 DAN kapitani)**; kvartira 15000→200, 20000→300, 30000→500, 50000→500, 60000→500. Qoidaga bog'lanmagan (SPEC'da foiz formulasi yo'q) — raqamlar qo'lda; dvigatel formula bilan hisoblamasligi, balki kartadagi qiymatni ishlatishi kerak. 
- Kartada «Mashina uchun kredit to'lovi» bor-yo'q holati: 12 Taksichi mashina krediti 9000 → to'lov 200, lekin «Yo'l/yoqilg'i» 400 (eng yuqori) — normal.
- Kartada «Qarz» chegarasi, «Soliq 12%» kabi qoidalar yo'q (maketda «Soliq (12%)» bor; kartada faqat raqam). Maketdagi xarajat satrlari (Uy ijarasi, O'qish, Farzandlar, kredit karta, garov) kartadagi 9 satrdan ko'p — qo'shimcha satrlar (O'qish, Uy ijarasi) kartada YO'Q; 9 satrdan tashqari satrlar dvigatel holatidan (bola, kredit) keladi. (Maket: 309eed94-Donishmand_ota…txt:1335–1372 — $ bilan, prototip.)
- Rasmlar ichida orqa tomon (00_ORQA_TOMON) matni: «BOSHLANG'ICH MA'LUMOTLARNI O'YIN BALANSINGIZGA KO'CHIRIB OLING!» — qog'oz o'yin ko'rsatmasi; onlayn versiyada ma'lumot avtomatik ko'chadi (yozuv UI da ishlatilmasin).
- Bozor kartalarida «Bozor xabari» bir xil sarlavha; «kind»/«who» (kimga tegishli) rasmda emas, matnda (masalan «Kartochka faqat sizga tegishli», «Bu qariyani qarovga olish degan kartochkaga ega har bir o'yinchiga tegishli») — shartlarni JSON `who` orqali qo'llash kerak.

## 8. MOS KELADIGANLAR
- 28 kasb: barcha raqamlar (salary, exp[9], total, cf, save, kv, car, child) 100% mos; №19 mavjud; 9 xarajat satri tartibi aniqlandi.
- Bozor 98/98 soni va tartibi, kodlar va summalar (3 ta matn farqidan tashqari).
- Hod 9/9 rasm ↔ JSON (1 matn farqi); «K» belgisi — K katagi (qo'llanma) bilan mos.
- «sh.b.» valyutasi hamma rasmlarda (mos); faqat o'zbek lotin.
- Rasm fayl nomlari tartibi (001..098; 01..28; 01..09) cards.json bilan bir xil.

## 9. Kodga ta'siri
- `content/data/cards.json`: bozor[12] «qq» imlo; bozor[86] `kind` → «Majburiy to'lov»; hod[7], hod[6] matn (buyurtmachi qaroridan keyin); UTK (046–050 indeks) matnida nom (qaror bo'yicha).
- `deploy/vps/import-cards.py` / `extract-cards.py`: ushbu PNG'larni (apostrofli fayl nomlari bilan) `file` nomlariga moslab webp ga aylantirish; kasb №19 endi mavjud; hod orqa tomoni (`orqa_tomon_umumiy`) mavjud; yangi 6 karta rasmi yo'q ro'yxati qoladi.
- `client/src/i18n/uz.ts` + kasb kartasi ko'rinishi (Hisob varag'i): `exp[0..8]` ga satr nomlari (§2 jadval) — OPEN_QUESTIONS #128 (1)-band yopiladi; «Kasb kartasi bo'yicha xarajatlar» bitta jami qatorini 9 satrga ajratish mumkin.
- `docs/OPEN_QUESTIONS.md`: #124 (Reklama agenti rasmi yetishmaydi) → yopildi; #128 (1) → yopildi; yangi band: karta sarlavhasi «SHIT HAPPENS!» ↔ §2.6.
- `docs/SPEC.md` §16: 1-band (karta nomi) va 2-band («Uztelekom») buyurtmachi qarori.
- rules: o'zgarish kerak emas (raqamlar mos); 087 `kind` ni tekshirish (`rules/src` bozor/qarov handler).
