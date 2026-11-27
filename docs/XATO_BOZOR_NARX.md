# XATO (bajarilmagan, reja): bozor taklifi narxi noto'g'ri ko'rsatiladi (2026-11-27)

> Holat: **tahlil tugagan, tuzatilmagan** (buyurtmachi: «boshlamaysan, rejalashtirib ketaver»). «Boshla» deganda eng birinchi shu tuzatiladi: bu pul yo'qotishga olib keladi.

## 1. Buyurtmachi skrinshoti
1. «Shahar chegaralari kengaymoqda … **sotixiga 800** sh.b. narxda sotib olmoqda» → ekranda «Sotish 800», «Kreditdan keyin qoladi: 800».
2. «Transport va logistika: shoshilinch xaridor … sotib olingan narxdan **40 %** qimmatga» → «Sotish 1 680» (aktiv `Y002`).

## 2. Sabab (kodda tasdiqlangan)
### 2.1 Yer taklifi — HAQIQIY XATO
- Karta guruhi «**Yer (sotixiga)**»: 800 — **bir sotix** narxi. 8 ta shunday karta (500, 700, 800, 1 000, 1 500, 2 500, 3 000, 5 000 sh.b. har sotixga).
- Sotib olinadigan yer kartalari (`content/data/cards.json`, kod `E`, 9 ta) matnida sotix soni bor («20 sotix yer», «6 sotix» …), lekin **aktivga saqlanmaydi**: `Asset` da faqat aksiya uchun `shares` bor; yerda sotix maydoni yo'q (`rules/src/engine.ts`, `Asset`).
- `marketPrice(amount, a)` narxni `a.shares` ga ko'paytiradi (`unit = a.shares ? v * a.shares : v`); yerda `shares` yo'q → **ko'paytirilmaydi** → butun yer 800 ga sotiladi.
- **Oqibat (misol):** `E_008` — 20 sotix, sotib olingan narx **16 000**. Taklif 800/sotix bo'lsa to'g'ri summa **16 000**, o'yin esa **800** beradi. `E_002` — 6 sotix, 600: to'g'ri 4 800, beradi 800. O'yinchi yerini arzon sotib yuborishi mumkin (pul yo'qotish).
- Server ham, mijoz ham bir xil xato (mijoz serverning `marketPrice` ini ishlatadi) — ko'rsatilgan va o'tkaziladigan summa mos, lekin ikkalasi ham noto'g'ri.

### 2.2 Transport taklifi (+40 %) — hisob to'g'ri, ko'rsatish yetarli emas
- `Y002` = «Kuryerlik xizmati» (kichik biznes), narxi **1 200**; `sellOffer` (foiz): `1 200 × (1 + 40/100) = 1 680`. Karta matni («sotib olingan narxdan 40 % qimmatga») bilan **mos**.
- Muammo: oynada faqat «1 680» bor; **qaysi narxdan 40 % ekani** ko'rinmaydi, shuning uchun foydalanuvchi tekshira olmaydi va «1 600 chiqdi» deb o'ylashi mumkin.
- Buyurtmachi: «u sotib olingan transport, logistikaning o'zi narxi qimmat» — agar sizda aktiv 1 200 dan qimmatroq sotib olingan bo'lsa (masalan boshqa karta), buni ko'rsating: shunda aktiv kodi va narxini tekshiramiz.

## 3. Tuzatish rejasi (qoidalar dvigateli, SPEC o'zgarmaydi)
1. **Aktivga `units` (sotix) maydoni:** yer sotib olinganda kartaning matnidan `(\d+)\s*sotix` olinadi (`content/src/effects.ts`: kod `E` va `katta` yer; `catalogEffects.ts`: «Ko'chmas mulk (yer)» kartalari, masalan `NK2-19` «4 sotix»). Effekt `units` ni olib yuradi; `applyEffect(buy)` aktivga yozadi.
2. **`marketPrice`:** `unit(v) = v × (a.units ?? a.shares ?? 1)`; faqat yer aktivi uchun «sotixiga» takliflar ko'paytiriladi (kvartira, dacha, biznes — o'zgarmaydi).
3. **Eski saqlangan o'yinlar:** `units` yo'q bo'lsa aktiv `cardId` bo'yicha karta matnidan sotix sonini topadi (zaxira yo'l); topilmasa avvalgidek (ko'paytirmasdan) — jim bo'lmasin, jurnalga ogohlantirish yoziladi.
4. **Ko'rsatish (shaffoflik):** bozor taklifi oynasida hisob qatori: yerda «**800 × 20 sotix = 16 000**», foizda «**Sotib olingan 1 200 + 40 % = 1 680**», inqirozda «yarmi (inqiroz)». «Kreditdan keyin qoladi» o'zgarmaydi.
5. **Testlar:** (a) 20 sotix × 800 = 16 000; 6 sotix × 700 = 4 200; (b) kvartira/biznes taklifi o'zgarmaydi; (c) inqirozda yarmi; (d) eski aktiv (units yo'q) karta matnidan; (e) `sellToMarket` va `marketOffers` bir xil summa; (f) mijoz oynasida hisob qatori.
6. **Balans:** barcha `E` kartalari × barcha «sotixiga» takliflar jadvali (`docs/BALANCE.md`ga) — ba'zi juftliklarda daromad juda katta (masalan `E_002`: 600 → 4 800; 5 000/sotix × 6 = 30 000, narxi 9 000). Bu karta dizaynidan (asl o'yinda ham «sotixiga» narx), lekin buyurtmachi ko'rib chiqsin.

## 4. Buyurtmachidan aniqlashtirish
1. **Transport taklifi:** «1 680 emas, boshqa narx kutgandim» deganda qaysi aktiv va qancha edi? (Ehtimol: aktiv 1 200 emas, boshqa karta.) Yoki yetarli — faqat hisob qatori ko'rsatilsinmi?
2. **Yer takliflari katta daromad beradi** (5–8 barobar). Asl qoida shunday (har sotixga narx) — **tavsiya: asl qoida**; kamaytirish kerak bo'lsa karta narxlarini admin orqali o'zgartiramiz, mantiqni emas.
3. Eski o'yinlardagi yerlar karta matnidan tiklansin (tavsiya: ha).

## 5. Qamrov va xavf
- Qamrov: 8 ta «Yer (sotixiga)» taklif kartasi × 9 yer kartasi + yangi katalogdagi yer kartalari. Server (`game.ts` `sellToMarket`/`marketOffers`) va mijoz (`model.ts`) bitta funksiyani ishlatadi — bitta tuzatish yetadi.
- Xavf: o'yin davomida o'zgarish; deploy o'yinlar kam paytda; eski aktivlar uchun zaxira yo'l shart.
