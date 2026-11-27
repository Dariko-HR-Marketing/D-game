# Batafsil savollar — har birida hozirgi holat, variantlar, misol va TAVSIYA (2026-11-27)

> Qoida: javobingizsiz qoida o'zgartirilmaydi. Quyidagi raqamlar (soniya, foiz) — mening **taklifim**, SPEC'da bo'lmasa, siz tasdiqlaysiz. SPEC'dagi raqamlar «SPEC» deb belgilangan.

## A. O'ZARO QARZ (SPEC §5.6): oluvchi faqat kichik aylana; beruvchi kichik yoki katta aylanadan
**Doimiy qoidalar (o'zgarmaydi):** kamida 5 o'yinchi (oluvchi, beruvchi, 3 guvoh) · guvohni oluvchi tanlaydi (bot emas, 16+, beruvchi va o'zi emas) · guvoh «Xabardor bo'ldim» bosadi, 3 tasi bosmaguncha beruvchi qabul qila olmaydi · summa ≤ beruvchi naqdining **30 %** · oluvchi limiti (maosh + passiv) × 50 % × 36 oy · foizsiz · ≤ 36 oy · to'lov ixtiyoriy.

### Q1. Qarz so'rovi eskirsinmi?
- **Hozir:** so'rov muddatsiz turadi. Beruvchi yoki bitta guvoh javob bermasa, so'rov abadiy osilib qoladi.
- **Misol (muammo):** Rustam Sarvinozdan 300 so'radi, guvohlardan Jasur o'yinni tashlab ketdi. So'rov hech qachon yopilmaydi; Rustam yangi so'rov yubora olmaydi (yoki chalkashlik).
- **Variantlar:** A) muddatsiz (hozirgi) · B) soniyalik taymer (SPEC'da «boshqa takliflar 30 s», lekin 3 guvoh bosishi uchun 30 s kam) · C) navbat/aylana bo'yicha (Rustamning keyingi navbatigacha).
- **TAVSIYA: B, 120 soniya**, ekranda ko'rinadigan sanoq bilan. Tugasa: «So'rov eskirdi», pul ko'chmaydi, Rustam qayta so'ray oladi. Sabab: guvohlar bir joyda o'tirgan o'yinchilar, 2 daqiqa yetarli; osilib qolish yo'qoladi.

### Q2. Oluvchi o'z so'rovini bekor qila oladimi?
- **Hozir:** yo'q (protokolda `loan_cancel` yo'q).
- **Misol:** Rustam so'radi, keyin karta tortdi va endi bank krediti kerak, lekin so'rov hali ochiq. Bekor qilolmaydi.
- **Variantlar:** A) yo'q · B) ha, beruvchi qabul qilmaguncha.
- **TAVSIYA: B.** «So'rovni bekor qilish» tugmasi, faqat beruvchi qabul qilmagan paytda. Beruvchi va guvohlarga «Rustam so'rovni bekor qildi» xabari. Pul ko'chgandan keyin bekor qilib bo'lmaydi.

### Q3. Qisman to'lov va minimal summa
- **Hozir:** «To'lash» summani qabul qiladi (qisman mumkin), to'lov ixtiyoriy.
- **Misol:** Rustam 300 qarzdor, naqdi 120. 100 to'laydi → qoldiq 200. Hech qanday jarima yo'q.
- **Variantlar:** A) istalgan summa · B) minimal qadam (masalan 10) · C) faqat to'liq.
- **TAVSIYA: A, qadam 10** (suyunchi bilan bir xil «10 qadam» naqshi): summa chiplari 25/50/100 % va ± qadam; qoldiq har doim ko'rinadi; to'liq to'langanda qarz yopiladi va beruvchiga xabar boradi.

### Q4. Guvoh nomzodi 3 tadan kam bo'lsa nima?
- **Hozir:** so'rov yuborib bo'lmaydi («guvohlar yetarli emas»).
- **Misol:** 6 o'yinchi, ulardan 2 tasi bot, 1 tasi 15 yoshda. Rustam so'rovchi, Sarvinoz beruvchi; qolgan nomzod: faqat 1 odam. Qarz ochiq emas.
- **Variantlar:** A) yopiq (hozirgi, SPEC'ga mos) · B) kamroq guvoh bilan ruxsat · C) botlar guvoh bo'lsin.
- **TAVSIYA: A** (SPEC qoidasini buzmaymiz), lekin **sababni aniq ko'rsatamiz:** «Guvoh bo'la oladiganlar: 1 ta (kerak 3). Botlar va 16 yoshgacha o'yinchilar guvoh bo'la olmaydi.» Nomzod yo'qligi ekrandan oldin ma'lum bo'ladi, foydalanuvchi bekorga to'ldirib o'tirmaydi.

### Q5. Beruvchiga oluvchining moliyaviy holati ko'rsatilsinmi?
- **Hozir:** beruvchi faqat so'rovni ko'radi (kim, summa, muddat).
- **Misol:** Sarvinoz 300 berishdan oldin Rustamning mavjud qarzlari va limitini ko'rmoqchi.
- **Variantlar:** A) hech narsa · B) minimal: limiti, mavjud hamkorlik qarzlari soni va jami · C) to'liq blank.
- **TAVSIYA: B.** «Rustamning limiti: 10 800; ochiq hamkorlik qarzlari: 1 ta, jami 200». Naqd va boshqa daromad ko'rsatilmaydi. Sabab: qaror uchun yetarli, boshqa o'yinchi blankini ochmaydi (SPEC: aylanalar bir-birini ko'rmaydi).

### Q6. Sheriklik taklifi qachon yuboriladi?
- **SPEC:** taklif qiluvchi faqat kichik aylana; sherik kichik yoki katta aylanadan; faqat kichik/katta sarmoya bizneslari; naqd va bank limiti tugagach; narx va foyda 50/50; sherik faqat naqd to'laydi; taklif **30 soniya**.
- **Hozir:** umumiy akkordionda tanlagich; shartlar ko'rinmaydi.
- **Misol:** Rustam 700 li biznes kartasini oldi, naqdi 200, bank limiti tugagan. Kartada «Sherik bilan olish» tugmasi chiqadi → Sarvinoz (naqdi 1 500) tanlanadi → «Siz 350, sherik 350, foyda 50/50, 24 oy dividend» ko'rsatiladi → 30 soniyali taklif yuboriladi.
- **Variantlar:** A) faqat karta qarori paytida (SPEC) · B) karta hal bo'lgandan keyin ham.
- **TAVSIYA: A.** Taklif karta qarori ichidan (kartada tugma), karta hal bo'lsa taklif o'zi o'chadi (hozirgi `pruneStale` bilan mos). Sherik kartochkasida: biznes rasmi, narx, «Sizning ulushingiz», oylik foyda ulushi, 24 oy jadvali, 30 soniyali halqa. Naqdi yetmaganlar nomzod ro'yxatida sabab bilan o'chiq.

## B. ORZU QOIDASI — instruksiyadan topilgan matn
**Manba (asl qo'llanma, kirill, K:148 va K:253–254; `docs/audit/A2_qollanma_kirill.md`):**
- G'alaba sharti: oylik passiv daromad **100 000** + **naqd ≥ orzu narxi**.
- **Orzu faqat o'z katagida** amalga oshadi, **faqat naqd** bilan.
- **Boshqaning orzusi katagiga** tushsa — **Katta aylana xarajat kartasi** tortiladi.
- Orzuni o'yin boshida tanlaysiz; nomi va qiymati blankka yoziladi.

**Keyin o'zgargan (OPEN_QUESTIONS 156, 2026-10-24, sizning «Qaror A»ingiz):** 40 ta orzu paketi kiritildi; 14 ta «O» katagi umumiy «Orzu katagi» bo'ldi; g'alaba — **istalgan «O» katagiga** tushish (katak orzusi bezak). Sabab: 40 orzu 14 katakka sig'maydi.

**Hozirgi kod:** g'alaba = istalgan «O» katagi + naqd ≥ o'z orzu narxi + oqim ≥ 100 000. Yaqinda qo'shildi: tanlangan orzular 14 katakka joylashib, bosganda nom, qiymat va egasi chiqadi (faqat ko'rsatish).

### Q7. G'alaba qaysi katakda bo'ladi?
- **Variantlar:** A) hozirgi: istalgan «O» katak · B) **asl qoida:** faqat o'z orzusi turgan katak; boshqaning orzusi → xarajat kartasi · C) aralash.
- **Misol (B):** 8 kishi, 8 orzu 14 katakning 8 tasida. Rustamning orzusi 5-katakda. U 5-katakka tushsa va naqdi yetarli bo'lsa — yutadi. Sarvinozning katagiga tushsa — Katta aylana xarajat kartasi (zarar). Bo'sh 6 katakka tushsa — Q8.
- **TAVSIYA: B.** Sabablar: (1) siz aytdingiz: «8 o'yinchi bo'lsa 8 orzu aniq ma'lum bo'lishi kerak» — bu aynan asl qoidaning ma'nosi; (2) endi 8 orzu 14 katakka **sig'adi** (avval 40 sig'masdi — qaror A shu sababdan edi); (3) o'yin qiziqarli: boshqaning katagi xavfli. Xavf: g'alaba sekinlashadi (bitta aniq katak) — `docs/BALANCE.md` bo'yicha qayta o'lchash kerak.

### Q8. Bo'sh «O» katakka (orzu tanlanmagan) tushsa?
- **Variantlar:** A) hech narsa · B) xarajat kartasi · C) orzu tanlagan har kim uchun «bo'sh orzu» (g'alaba yo'q).
- **Misol:** 3 kishi o'ynayapti, 14 katakning 11 tasi bo'sh.
- **TAVSIYA: A (hech narsa)** — xavfsiz va tushunarli; bo'sh katak yozuvi «Bu katakda orzu yo'q» (hozir shunday).

### Q9. Orzu joylashuvi qanday aniqlanadi?
- **Variantlar:** A) tasodifiy (xona kodidan; hozirgi, hamma bir xil ko'radi) · B) o'yinchi o'zi katakni tanlaydi (orzu tanlash ekranida taxtada) · C) orzu sektori bo'yicha qat'iy.
- **TAVSIYA: A** boshlash uchun (adolatli, hech kim yaqin katakni tanlab ustunlik olmaydi); keyin B ni sinash mumkin.

## C. KATTA AYLANA va «ISHCHILAR»
**Instruksiyadan topilgan (SPEC §5.5, B ilova, qo'llanma):** katta aylana 53 katak (Start, Turg'un biznes, Tavakkal biznes, Orzu, Yana pullar, Audit, Ajralish, Bankrot, Nohalol), 2 kubik. G'alaba: oqim ≥ 100 000 + «O» katak + naqd ≥ orzu. Qarz olish yopiq; sheriklikda sherik bo'lishi mumkin.
**«Ishchilar» instruksiyada YO'Q.** Qo'llanma va SPEC'da faqat daraja nomi bor: «Yollanma ishchi → Sarmoyador». Biznesga ishchi yollash, ishchi maoshi yoki shunga o'xshash mexanika yo'q. Shu sabab uni o'ylab topib kodga yozmadim.

### Q10. «Ishchilar» deganda nimani nazarda tutdingiz?
Quyidagilardan qaysi biri (yoki boshqasi) — bitta gap bilan yozing:
1. **Biznesga ishchi yollash:** sotib olingan Turg'un/Tavakkal biznesga ishchi qo'yib, daromadni oshirish. *Misol:* «Avtoolam» gazetasi 22 000 beradi; 1 ishchi +4 000, lekin ishchi maoshi −1 500. (SPEC'da yo'q — yangi qoida va balans kerak; raqamlar faqat tushuntirish uchun taxminiy.)
2. **Katta aylanadagi o'yinchining ishi:** kichik aylanadan chiqqach maosh yo'qoladi; ish/kasb bilan nima bo'lishi.
3. **Katakdagi tavsif/yozuv:** biror katakda «ishchi» so'zi bilan bog'liq ko'rinish muammosi.
4. **Boshqa:** rasmga belgilab yuboring.
- **TAVSIYA:** hozir qo'shmaslik. Agar 1-variant kerak bo'lsa, avval alohida qisqa spetsifikatsiya (kim yollaydi, narx, oylik, chegaralar) yozamiz va balansni botlar bilan o'lchaymiz, keyin kodlaymiz.

## D. Javob berish tartibi (sizga qulay)
Har savolga faqat harf yozing, masalan: **Q1: B120, Q2: B, Q3: A10, Q4: A, Q5: B, Q6: A, Q7: B, Q8: A, Q9: A, Q10: 1**. Tavsiyalarimning hammasiga rozi bo'lsangiz — «hammasi tavsiya bo'yicha» deb yozing, shundan keyin «Boshla» desangiz boshlayman.
