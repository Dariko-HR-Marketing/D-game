> **Holat (2026-11-28):** qarz so'rovi 4 oy muddat, bekor qilish, «Guvohman», qarzdor limiti, akkordion va o'lchagichlar bajarilgan va jonli (qarang [ISH_HOLATI.md](ISH_HOLATI.md)). Qolgan bosqichlar shu hujjatda.

# REJA (bajarilmagan): O'zaro qarz, bank krediti va sheriklik — shaxsiy UX/UI va mantiq

> Holat: **faqat reja.** Buyurtmachi (2026-11-27): «Sraz bajarmagin, tayyorlab boravergin. Boshla degandan keyin hammasini boshlaysan.» Hech narsa kodda o'zgartirilmagan.
> Qoida: SPEC o'zgarmaydi (§5.3, §5.6, 2026-11-09 va 2026-11-12 qarorlari). Yangi qoida to'qilmaydi; qaror kerak joylar «OCHIQ SAVOL» deb belgilangan.
> Manba: buyurtmachi skrinshotlari (o'zaro qarz shakli), `client/src/ui/Actions.tsx`, `client/src/i18n/uz.ts` (`coop`), `rules/src/game.ts`, SPEC §5.3, §5.6.

## 1. Hozirgi holat (kodda va skrinshotda ko'ringan kamchiliklar)

**O'zaro qarz shakli** («Moliya amallari» akkordioni ichida, bitta uzun ro'yxat):
1. Hamma narsa bitta uzun varaqda: beruvchi → summa → muddat → 3 ta guvoh bloki → tugma. Telefonda 2–3 ekran aylantirish kerak.
2. Maydonlar belgisiz: «Summa» faqat placeholder, «12» nimaligi (oy) yozilmagan. Birligi, qadami, tez tanlov yo'q.
3. **Guvoh tanlash chalkash:** «Guvoh 1 / 2 / 3 (3 ta tanlang)» — uchta alohida tanlagich, har birida bir xil ismlar. Besh kishilik o'yinda nomzod aynan 3 ta, ya'ni tanlov yo'q, lekin foydalanuvchi 9 marta bosishi kerak.
4. «Qarz so'rash» tugmasi o'chiq turganda **sababi yozilmagan** (summa limitdan oshdimi, guvoh yetmadimi, muddat 36 dan oshdimi — noma'lum). Tugma «ghost» uslubda: asosiy amal zaif ko'rinadi.
5. Natijani oldindan ko'rish yo'q: beruvchining naqdi qancha qoladi, oylik to'lov (ixtiyoriy) qancha, limitingiz qanday hisoblangan.
6. Yuborilgandan keyin holat izi yo'q: guvohlar nechtasi xabardor, beruvchi ko'rdimi, qancha vaqt qoldi — faqat kichik matn.
7. So'rovni **bekor qilish** amali yo'q (protokolda `loan_cancel` yo'q).
8. Terminologiya aralash: «O'zaro qarz» / «Hamkorlik qarzlari» / «Qarz so'rash».

**Sheriklik:** faqat «Sherik taklif qilish» tanlagichi va tugma, umumiy akkordionda. Shartlar (50/50, 24 oy dividend, sotib olish) ko'rinmaydi; qaysi biznes uchun ekani yozilmagan; sherikning naqdi yetarlimi — taklif yuborilgandan keyingina ma'lum.

**Kiruvchi takliflar** (beruvchi, guvoh, sherik) — oddiy qutilar, akkordion ichida; yopiq bo'lsa o'tkazib yuboriladi (hozir faqat nishon son bor).

**Bank krediti/lombard** boshqa uslubda; o'zaro qarz va sheriklikdan vizual jihatdan farq qiladi.

## 2. Dizayn tamoyillari
1. **Rol bo'yicha shaxsiy ekran:** oluvchi, beruvchi, guvoh, sherik taklif qiluvchi, sherik taklif qilinuvchi — har biriga faqat o'ziga kerak narsa.
2. **Bosqichma-bosqich (wizard), bitta qaror — bitta ekran;** telefonda pastki varaq (bottom sheet), kompyuterda markaziy oyna/yon panel (mavjud `Sheet`/`RequestModal` naqshi).
3. **Har bir o'chiq tugma yonida sabab** (bir qator, kerakli summa bilan). Tugma sababsiz o'chiq turmaydi.
4. **Oldindan ko'rish:** «Siz yuborasiz», «Beruvchi naqdi X → Y», «Oylik taxminiy to'lov (ixtiyoriy)».
5. **Tez tanlov:** summa uchun 25/50/100 % chiplar va ± qadam; muddat uchun 6/12/24/36 chip.
6. **Holat izi:** yuborilgandan keyin jonli chizma (guvohlar 1/3 ✔, beruvchi javobi, qolgan vaqt), natija xabari.
7. **Bitta lug'at:** «Qarz» (o'zaro), «Bank krediti», «Sheriklik». «Hamkorlik qarzlari» — faqat blank sarlavhasida (SPEC).
8. **Kiruvchi so'rovlar markazi** (`RequestCenter`) — asosiy kirish: qo'ng'iroqcha + nishon; akkordionga bog'liq emas.
9. **Moslashuvchan:** 390 / 768 / 1440 px; tugma ≥ 44 px; `aria-live` bilan holat; fokus boshqaruvi; «harakatni kamaytirish» hurmat qilinadi.
10. Matn faqat `uz.ts` (alohida jadval), katta summalar to'liq: `1 020 000`.

## 3. Oqimlar va holatlar

### 3.1 O'zaro qarz — OLUVCHI (faqat kichik aylana; beruvchi kichik yoki katta aylanadan)
Kirish: «Moliya amallari» → «Qarz so'rash» (yoki naqd yetmaganda karta ostidagi «Qarz so'rash» tavsiyasi).
- **1-qadam: Kimdan?** Nomzod kartalari (avatar, ism, aylana belgisi, «Eng ko'pi: X» — uning naqdining ≤ 30 %). O'chiq nomzod sababi bilan: bot («Bot qarz bermaydi»), naqdi kam, o'zi. Nomzod yo'q: «Hozir qarz beradigan o'yinchi yo'q» (+ kamida 5 o'yinchi talabi, `fewPlayers`).
- **2-qadam: Summa va muddat.** Summa: maydon + chiplar (25/50/100 % «eng ko'pi»dan) + ± qadam. Muddat: 6/12/24/36 oy. Ko'rsatkichlar: «Sizning limitingiz: (maosh + passiv) × 50 % × 36 oy = X», «Beruvchi chegarasi: Y». Foizsiz; to'lov ixtiyoriy (matn).
- **3-qadam: Guvohlar (3 kishi).** Bitta ko'p tanlovli chiplar bloki «0/3». Nomzod aynan 3 ta bo'lsa — **avtomatik tanlangan** va izoh: «O'yinda 3 ta nomzod bor, hammasi guvoh bo'ladi». Nomzod < 3 bo'lsa — aniq xabar (`fewWitnesses`) va yuborish yopiq. «Guvoh nima qiladi?» — bir qatorli izoh: roziligi shart emas, faqat «Xabardor bo'ldim» bosadi.
- **4-qadam: Tasdiqlash.** Yig'ma kartochka (kimdan, summa, muddat, guvohlar). Asosiy tugma «So'rov yuborish» (to'ldirilgan, ghost emas).
- **Yuborilgandan keyin (holat izi):** «Guvohlar: 1/3 xabardor» (kim bosdi, kim yo'q) → «Beruvchi javobini kutmoqda» → natija: **qabul** (naqd qo'shildi, «Hamkorlik qarzlari»ga yozildi), **rad** (`loan_declined`), **eskirdi** (OCHIQ SAVOL 1). Har natija — xabar va jurnal yozuvi.

### 3.2 O'zaro qarz — BERUVCHI
Kirish: so'rovlar markazi / nishon / (ixtiyoriy) ekran tepasida ixcham banner.
Kartochka: kim so'rayapti, summa, muddat, «Foizsiz, to'lov ixtiyoriy», guvohlar holati (ismlar bilan ✔/…), «Naqdingiz: X → Y».
- «Qabul qilish» o'chiq bo'lsa sabab: «Guvohlar 3 tadan 1 tasi xabardor» / «Naqdingiz yetmaydi: kerak X» / «Summa naqdingizning 30 % idan oshadi».
- «Rad etish» har doim ochiq. Qabulda tasdiq so'ralmaydi (bitta bosish), lekin natija xabari aniq.

### 3.3 GUVOH
Yengil kartochka: «Siz [Oluvchi] ning [Beruvchi] dan qarziga guvoh qilib tanlandingiz. Roziligingiz shart emas.» Bitta tugma «Xabardor bo'ldim». Bosilgach — «Rahmat», kartochka yopiladi, oluvchi va beruvchi holat izida ✔ ko'radi. Taklif eskirsa/rad etilsa kartochka o'zi yo'qoladi.

### 3.4 Qarzlarni boshqarish
- **Oluvchi:** «Mening qarzlarim»: beruvchi, qoldiq, muddat, «To'lash» (summa qadami, qisman to'lov, naqdidan oshmaydi), to'langan tarix. 
- **Beruvchi:** «Menga qaytariladigan»: qarzdor, qoldiq, «Eslatish» (har aylanada bir marta; ishlatilgan bo'lsa «Bu aylanada yuborilgan»).
- Chiqishda ochiq qarz ogohlantirishi (SPEC: −50 ball, «Ishonchsiz» — tasdiq kutilmoqda), vaqt rejimi tugaganda passiv sifatida hisoblanishi — matnda aytiladi.

### 3.5 SHERIKLIK — TAKLIF QILUVCHI (faqat kichik aylana)
Kirish: **karta qaroridan** — naqd va bank limiti tugagach, mos biznes kartasida «Sherik bilan olish» (SPEC §5.6). Umumiy akkordiondagi tanlagich olib tashlanadi (yoki ikkinchi darajali).
- **1-qadam: Kim bilan?** Nomzodlar (kichik yoki katta aylanadan): avatar, ism, aylana, **naqdi yetadimi** (narxning yarmi). Yetmaydiganlar sabab bilan o'chiq.
- **2-qadam: Shartlar (oldindan ko'rish):** biznes nomi va rasmi (asl karta rasmi), narx, «Siz X, sherik X (50/50)», foyda 50/50, 24 oy dividenddan keyin sotib olish (bepul yoki to'liq narx + 1 oylik foyda), yopilmaguncha katta aylanaga chiqib bo'lmasligi.
- **3-qadam: Yuborish** → 30 soniyalik halqa va «Javob kutilmoqda»; natija: qabul / rad (`partner_declined`, karta egasida qoladi) / eskirdi (karta hal bo'ldi — `pruneStale`).

### 3.6 SHERIKLIK — TAKLIF QILINUVCHI
Kartochka: kim taklif qilmoqda, biznes (rasm, nom), narx, **«Sizning ulushingiz: X»**, oylik foyda ulushi, 24 oylik dividend jadvali, sotib olish shartlari, «Naqdingiz: A → B». «Qabul qilish» o'chiq bo'lsa sabab (naqd yetmaydi: kerak X). 30 soniyalik halqa. Rad etish har doim ochiq.

### 3.7 Sherik ulushini sotib olish (`partner_buyout`)
Alohida kartochka: aktiv, qaysi shart (24 oy o'tdimi), narx variantlari (bepul / to'liq narx + 1 oylik foyda), oldindan ko'rish (naqd qancha kamayadi), tasdiq.

### 3.8 Bank krediti va lombard (bir xil naqsh)
Bir xil wizard uslubi: kalkulyator (summa qadami 100 ga karrali, 2 000–5 000), oylik to'lov formulasi (SPEC §5.3: summa/36 + summa×20 %/12), garov 120 %, bir martalik haq (ustama), «Hozir olish mumkin bo'lgan eng ko'p kredit». Sabab bilan o'chiq tugmalar.

### 3.9 Yagona markaz
«Moliya amallari» ichida segment: **Bank · Qarz · Sheriklik · Lombard · Suyunchi** (faqat mavjudlari ko'rinadi), har biri o'z varag'ida; kiruvchi takliflar — so'rovlar markazida.

## 4. Holat mashinalari (hozirgi protokol asosida)
- **Qarz:** `loan_request` → `loansPending` (guvohlar `confirmed` n/3) → `loan_accept` | `loan_decline` → qarz (`handDebts`) → `loan_repay` (qisman/to'liq) / `loan_remind` → yopildi.
- **Sheriklik:** `partner_offer` → `partnerToAccept` → `partner_accept` | `partner_decline` | avtomatik o'chdi (`pruneStale`) → faol (dividend 24 oy) → `partner_buyout` → yopildi.
- **Mavjud xatolar:** `not_giver`, `not_partner`, `no_proposal`, `insufficient_cash`, `partner_cash`.

## 5. Chekka holatlar (ekranda ko'rinishi kerak)
Beruvchi naqdi so'rov paytida kamaydi; guvoh yoki beruvchi chiqib ketdi/ulanishi uzildi; bot; kuzatuvchi (tugma yo'q, faqat ko'radi); 5 dan kam o'yinchi (qarz yopiq, sheriklik ochiq); katta aylana o'yinchisi (qarz ololmaydi, sheriklik taklif qilolmaydi — sababi aytiladi); 16 yoshgacha (qarz/sheriklik yopiq — sabab, ota-ona); qayta ulanish (holat qaytadi, bayram/xabar takrorlanmaydi); ikki marta bosish; bir vaqtda bir nechta so'rov; navbat o'zgarishi; vaqt rejimlari («Mehrojiddin» vaqtsiz xona).

## 6. Server/ma'lumot talablari (tekshirilishi kerak, hali o'zgartirilmagan)
- Taklif muddati (`deadline`) mijozga keladimi (halqa uchun)? Qarz takliflarida muddat maydoni ko'rinmadi.
- Har nomzod uchun «eng ko'pi» mijozda hisoblanadi (`loanBounds`); dvigatel baribir himoya qiladi — mijozga ishonilmaydi.
- Guvoh holati: `confirmed` ro'yxati bor; ism bilan ko'rsatish uchun yetarli.
- Bekor qilish yo'q: kerak bo'lsa yangi xabar (`loan_cancel`) — qoida qarori talab qiladi.

## 7. OCHIQ SAVOLLAR (buyurtmachi qaror qiladi; javobsiz qoida o'ylab topilmaydi)
1. Qarz so'rovi **eskirishi** kerakmi (necha soniya/qadamdan keyin)? Sheriklikda 30 s (SPEC); qarzda yo'q.
2. Oluvchi o'z so'rovini **bekor qila oladimi** (guvohlar kutilayotganda)?
3. **Qisman to'lov** ruxsatmi (hozir `loan_repay` summa bilan — ruxsat ko'rinadi), minimal summa bormi?
4. Nomzod 3 tadan kam bo'lsa nima: so'rov yopiqmi (hozirgidek) yoki kamroq guvoh bilan?
5. Beruvchiga oluvchining moliyaviy holati (limiti, qarzlari) ko'rsatilsinmi? (Maxfiylik va o'yin mantig'i.)
6. Sheriklik takliflari karta qarori paytida (faqat o'sha 30 soniyada) yoki ularni «keyinroq» yuborish mumkinmi?
7. Qarz/sheriklik natijasi (qabul, rad) hammaga jurnalda ko'rinsinmi yoki faqat ishtirokchilarga?
8. Bank krediti wizard'iga bir martalik haqni (ustama) alohida qator qilib ko'rsatish — tasdiqlanadimi (matn SPEC'da bor).

## 8. Amalga oshirish rejasi («Boshla»dan keyin; har bosqich — alohida PR, CI yashil, deploy, jonli tekshiruv)
| Bosqich | Mazmun | Qabul mezoni |
|---|---|---|
| 1. Asos | Yagona «Moliya markazi» (segmentlar), `Sheet` wizard komponenti, har o'chiq tugma uchun sabab komponenti, so'rovlar markazi bilan bog'lash | 390/768/1440 da sig'adi; axe toza |
| 2. O'zaro qarz — oluvchi | 4 qadamli wizard, tez tanlov, guvoh avtotanlovi, oldindan ko'rish, holat izi | e2e: 5 o'yinchi, so'rov → guvohlar → qabul; skrinshotlar |
| 3. Beruvchi va guvoh kartochkalari | Sabab bilan o'chiq «Qabul», guvoh «Xabardor», natija xabarlari | e2e: rad, naqd yetmaydi, guvoh bosmagan |
| 4. Sheriklik | Karta qarori ichidan taklif, shartlar ko'rinishi, taklif qilinuvchi kartochkasi, 30 s halqa, sotib olish | e2e: taklif, rad, eskirish, naqd yetmaydi |
| 5. Qarzlarni boshqarish | «Mening qarzlarim», «Qaytariladigan», eslatish, tarix | Blank bilan mos |
| 6. Bank/lombard bir xil uslub | Kalkulyator wizard | SPEC formulalari testlari |
| 7. Yakun | Matnlar `uz.ts`, hujjat, 16 yosh/chekka holat tekshiruvi, adaptiv skrinshotlar | CI, deploy, hisobot |

Har bosqichda: dvigatel qoidalari **o'zgarmaydi**, mavjud 200+ mijoz va server testlari o'tadi, yangi testlar qo'shiladi (hisoblash yordamchilari uchun birlik testlari, oqimlar uchun brauzer skriptlari).
