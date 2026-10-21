> Avtomatik tahlil (subagent hisoboti, 2026-10-21): dalil sifatida saqlanadi; har bir da'vo qaror qilinishidan oldin manba bilan qayta tekshiriladi. Qarorlar reestri: ../NORMATIVE_AUDIT.md

# A2 — «ДОНИШМАНД ОТА» asl (kirill) uslubiy qo'llanmasi bo'yicha tafovutlar

## 0. Manba qisqacha

- O'qildi: `txt/1791545690283_____________3.txt` (297 qator, ~105 KB, to'liq). Bundan keyin "K:NN" = shu fayldagi qator raqami. Original DOCX sahifa raqamlari yo'q, shuning uchun qator bilan asoslanadi.
- Solishtirildi: `txt/ca191915-POYGA_oyin_qollanmasi.txt` (lotin qo'llanma; "L p.N" = uning bo'limi), `docs/SPEC.md` (§5, A–D), `docs/OPEN_QUESTIONS.md` (#N), `rules/src/index.ts`, `game.ts`, `engine.ts`, `content/src/effects.ts`, `content/data/cards.json`, `board_big.json`, `cell_rules.json`.
- MUHIM: kirill matn faqat QOIDALAR va umumiy sonlarni beradi. Unda kasb jadvali (maosh/xarajat/jamg'arma), alohida karta narxlari/daromadlari, kataklar tartibi va soni, aksiya narxlari YO'Q. Faqat jami karta soni (K:277-285) va pul birligi (dollar) berilgan. Shuning uchun kasb/karta jadvallarini kirill matn bilan solishtirib bo'lmaydi; ular boshqa agentlar tekshiradigan rasm/CSV manbalarida. Bu yerda faqat QOIDALAR va SONLAR solishtirildi.
- Matn Robert Kiyosakining "Cashflow" o'yini asosidagi o'zbek moslamasi: "Donishmand ota" = "O'yna va boyib ket" (K:3, K:78-79, K:266-267), muallif R. J. Ravshanbekov (K:288), guvohnoma 06.04.2009 № 2805 (K:294). Pul birligi "доллар" (K:68, 120, 121, 124...), faqat K:265 da "ш.б.".
- Ko'rsatma kabi ko'ringan matn topilmadi. K:295-298 aloqa telefoni va elektron pochta bor, ular ma'lumot sifatida o'qildi va hech qayerga ko'chirilmadi.

### Kirill sonlar jadvali (aniq ko'chirma)

| Mavzu | Qiymat | Qator |
|---|---|---|
| Aylana ≙ vaqt | 4 "Daromad" katagi = 4 oy; 3 aylana = 1 yil; moliyaviy inqiroz 9 aylana = 3 yil | K:104, K:76 |
| Kubik | kichik aylana 1 ta, katta aylana 2 ta | K:102-103, K:144-146 |
| Kichik karta | faqat 1-aylanada "Imkoniyat" katagida | K:106 |
| Katta karta | 1-aylanada naqd 25 000 bo'lsa, "Imkoniyat" katagida | K:108, K:223 |
| 1-aylanadan chiqish | pul oqimi/passiv daromad 25 000 + naqd 1 000 000 ("1000 000" yozuv xatosi) + hamma qarz va kredit yopilgan | K:120-122 |
| Chiqishdagi holat | hamma kichik va katta bizneslar bankka topshiriladi; kvartira, aksiya, yer, uy, vasiylik (=qarov), mashina qoladi; erishilgan passiv daromad blank orqasiga yoziladi va "o'zgarmas minimal" bo'ladi | K:122, K:143 |
| 2-aylana g'alaba | 100 000 passiv daromad + o'z orzusini sotib olish (faqat o'z katagida, faqat naqd, boshqaning orzusi mumkin emas) | K:148-149, K:254 |
| Tavsiya etilgan g'alaba (matn boshida) | 2-davraga o'tish, oyiga 10 000 daromad, orzu | K:31 (K:148 bilan ZID) |
| Vaqt rejimi | 1–4 tajribali: g'alabagacha; 4 dan ortiq yoki tajribasiz: vaqt bo'yicha. 2 tajribasiz = 3–4 soat; 3 = 4–5; 4 = 6; 5+ = 8 soat | K:31-37 |
| Bola | har safar +1; bank 500 bir martalik yordam; xarajat kasb kartasidagi bola summasi bo'yicha; maksimum cheklanmagan | K:68, K:233 |
| 1-aylana qarzi | "Xarajat" to'lanmasa qarz yoziladi; chegara 10 000; oshsa yangi kasb va boshidan | K:124 |
| Bank mini kredit | 2 000–5 000; garov = kredit × 120 %; yillik 20 %; 5 000 : 36 oy = 139; 1 000 : 12 = 84; oylik 223; 12 oy (3 aylana) dan keyin muddatidan oldin yopish mumkin: 5 000 − 1 668 = 3 332; foizlar bankda qoladi; daromad kredit to'lovidan kam bo'lsa bank bermaydi; qarzni yopish uchun kredit YO'Q; to'lamasa 2× mol-mulk musodara | K:128-139 |
| Lombard | garovning 50 %, oyiga 10 % (yiliga 120 %), eng ko'pi 1 yil, asosiy qarz yil oxirida birdaniga; foiz bir kun kechiksa garov yo'qoladi; qimmatli qog'ozlar garovga yaramaydi | K:127, K:140 |
| 2-aylana qarzi | "Yana pullar" katagida to'lanadi; 1 aylana (4 marta o'tish) ichida yopilmasa korxona bankka sotiladi; bo'lmasa 1-aylanaga, yangi kasb kartasi, bolalar soni saqlanadi, 1-aylanada yig'ilgan mulk qoladi | K:150 |
| Bankrot | eng arzon/eng kam daromadli korxona ketadi; korxona bo'lmasa 1-aylanaga naqd va mulk bilan qaytadi | K:151, K:262-263 |
| Auditor | naqd pulning 20 %; pul bo'lmasa — e'tibor bermang | K:258 |
| Ajralish | har safar naqdning 50 % | K:260 |
| Nohalol biznes | 1-marta 1 000 000 ("ш.б."); 2-marta mavjud pulning 20 %; 3-marta e'tibor bermang | K:265 |
| Boshqaning biznesi | oylik daromadni egasiga to'lash (pul yo'q bo'lsa qarz, 1 aylana) YOKI darhol 2× narxda sotib olish; 2 ta egalik fishkasi; keyingisi 3× | K:242-244, K:249-251 |
| Tavakkal biznes | to'liq narx naqd, banksiz, 1 kubik; yozilgan raqam tushsa biznes sizniki; ba'zilari bir martalik tushum (egalik fishkasi yo'q) | K:247-248 |
| Mahsulot to'plami | kasb 32; Xarajat 105; Bozor 102; Kichik 91; Katta 91; Katta aylana xarajati 25; "O'tish" 9; "Meniki" 6×40 = 240; pul 12 nominal × 50 = 600; 6 fishka, 2 kubik, 20 blank | K:268-285 |

## 1. ZIDDIYATLAR

Og'irlik: yuqori = o'yin natijasini/o'tish imkonini buzadi yoki aniq normativ qoida bajarilmayapti; o'rta = qoida farqi yoki hujjat eskirgan; past = matn/nom/aniqlik.

| № | Mavzu | Yangi manba (iqtibos + qator) | Mavjud tizim (fayl:satr) | Og'irlik | Tavsiya |
|---|---|---|---|---|---|
| 1 | Kichik aylanadan chiqishda bizneslar bankka topshirilmaydi | K:122: "барча кичик ва йирик бизнесларни банкка топширади ... сотиш мумкин бўлган мулк: квартиралар, акциялар, ер, уйлар, васийлик, машиналарни ўзида қолдиради". L p.10: "Bankka topshiriladi: barcha kichik va katta bizneslar". Chiqishdagi passiv daromad "o'zgarmas minimal" (K:143). | `game.ts:558-563` (`endTurn`): faqat `circle="big"`, `pos=34`, `lockedFlow=playerCashflow(p)`; aktivlarga tegilmaydi. Faqat `backToSmall` (`game.ts:282-285`) bizneslarni olib tashlaydi. | yuqori | Chiqishda `small_business`, `business`, `partner_stake` aktivlarni o'chirish (`ownBusinesses` bo'yicha), kvartira/aksiya/yer/uy/dacha/qarov/mashina qoldirish; `lockedFlow` = chiqish paytidagi PASSIV daromad (#6 ga qarang). Aks holda katta aylanada Bankrot/qarz (`ownBusinesses`, `game.ts:302`) eski kichik bizneslarni oladi (qoidada ular allaqachon topshirilgan), Bankrot "korxona yo'q -> kichik aylanaga qaytish" jazosi hech qachon ishlamaydi, eski bizneslar hamda ularning maoshi katta aylanada ham ishlayveradi (`flow = max(base, lockedFlow)`, `game.ts:314`). Testda: chiqishdan keyin `passiveIncome(p)` faqat qolgan aktivlardan. |
| 2 | Kvartira/aktiv krediti (ipoteka) ni ixtiyoriy yopish yo'q — chiqish sharti yopilib qoladi | K:167, 169, 171: "Истаган вақтингизда кредит суммасини тўлашингиз ва харажатларингиздан фоизларни ўчириб ташлашингиз мумкин". K:122: chiqish uchun "барча қарзларингизни ва олган кредитларингизни тўлашингиз лозим". | `engine.ts:86-88`: `allDebt` har bir `a.credit` ni qo'shadi; `credit` hech qayerda kamaymaydi (`tickLoans` faqat bank/lombard). `Action` ro'yxatida (`game.ts:172-188`) aktiv kreditini yopish harakati yo'q (`bank_repay` faqat bank krediti uchun). Yagona yo'l — aktivni bozorda sotish (`engine.ts:217`). | yuqori | Yangi harakat `asset_credit_repay` (naqd = `credit`, `credit=0`, `creditPayment=0`, "foizni xarajatdan o'chirish" K:167). Chiqish va admin hisobotlariga shu holat kiradi. OPEN_QUESTIONS #30 ni yopadi (bank uchun #92 bor, aktiv krediti uchun yo'q). |
| 3 | "Bolangiz bo'lsa" / "mashinangiz bo'lsa" xarajat kartalari shartsiz to'lanyapti | K:207-210: "болаларга тегишли карточкалар Сизда фарзанд бўлган тақдирдагина тўланади"; "автомобилга тегишли харажат карточкаси фақатгина автомобиль бўлган тақдирдагина тўланади". L p.7 shuni takrorlaydi. | `content/src/effects.ts:89`: `c.xar.forEach(... "mandatory", {kind:"pay", amount, to:"bank"})` — shartsiz; `game.ts:362` `applyMandatory.pay` -> `forcePay`. `cards.json` xar: matnida "(agar bolangiz/farzandingiz/farzandlaringiz/bolalaringiz bo'lsa)" — 8 ta karta (n=14,18,28,45,54,75,77,84); "(agar mashinangiz bo'lsa)" — 5 ta (24,39,57,68,71); yangi `SUG` ham (`engine.ts:192` tekshiradi, bu to'g'ri). | yuqori | `xar` kartalarida shart maydoni (`requires: "child" \| "car"`) — kontent importida matndagi qavs bo'yicha belgilash + `Effect.pay` ga `if` qo'shish. Shartsiz qolsa har o'yinchi (bolasiz/mashinasiz) 13 ta kartada 40–5 000 ortiqcha to'laydi; 5 000 li karta (n=54) bolasiz o'yinchini qarz/restartga olib boradi. Test: bolasiz o'yinchi n=54 ni to'lamaydi. |
| 4 | Kasb kartasidagi mashina va kvartira o'yin boshidan aktiv emas | K:209: "Автомобиль Сизда ўйиннинг бошидан мавжуд бўлиши (у касб карточкасида кўрсатилган бўлади) ёки кейин сотиб олинган бўлиши мумкин". | `engine.ts:75-79` `newPlayer`: `assets: []`; `game.ts:19` `Kasb` interfeysida `car`/`kv` yo'q. `cards.json` kasb: mashina (`car`) 7 kasbda (n=1:17 000, 12:9 000, 13:20 000, 16:30 000, 17:20 000, 22:20 000, 25:17 000), kvartira (`kv`) 5 kasbda (n=1:30 000, 14:20 000, 15:15 000, 22:50 000, 25:60 000). | yuqori | `newPlayer` da `car>0` -> `{kind:"car"}`, `kv>0` -> `{kind:"apartment"}` aktivi (daromadsiz, kreditsiz; narx = kasb kartasi). Natijada mashina xarajat kartalari (#3), AV/KV bozor takliflari va garov to'g'ri ishlaydi. Bozor narxi/garov qiymati bo'yicha buyurtmachi qarori kerak (qo'llanmada yo'q). |
| 5 | 2-aylanadan qaytganda (qarz/Bankrot) YANGI KASB kartasi olinadi; kodda maosh 0 qolib ketadi | K:150: "биринчи айланага қайтиб янги касб карточкасини олади ... нечта фарзанд бўлса шунча ... биринчи айланада йиққан барча мулки ўйинчида қолади". K:263 (Касод): "Камбағаллар олами га қайтинг ва янги касб карточкасини олинг ... фақат нақд пуллар ва ... фарзандларингиз сони". K:151: "мавжуд нақд пули ва ... мулки билан". Ichki farq: K:151 yangi kasb demaydi, K:263 va K:150 deydi. | `game.ts:282-285` `backToSmall`: kasb o'zgarmaydi, `salary`/`quitJob` saqlanadi (`game.ts:549`: `quitJob:true, salary:0`). #86/#95: "yangi kasb emas" (buyurtmachi qarori). | yuqori | Qaror #95 ni qayta ko'rish: chiqish uchun passiv daromad 25 000 talab qilingani sababli deyarli har bir o'yinchi `quitJob=true` bilan chiqadi; `backToSmall` dan keyin maosh 0, biznes 0, xarajat bor — har oy manfiy pul oqimi va oxiri `owe` > 10 000 -> restart (o'lim spirali; o'yin "qaytish"ni jazodan ko'ra yo'q qilish bo'lib qoladi). Tavsiya: `backToSmall` da yangi kasb kartasini tortish (maosh/jamg'arma/xarajat yangilanadi), bolalar soni va 1-aylana mulki saqlanadi, `quitJob=false`. Agar yumshatilgan variant qoldirilsa, hech bo'lmaganda maoshni tiklash kerak. |
| 6 | Chiqish sharti: "passiv daromad 25 000" va blank orqasiga yoziladigan summa | K:120: "ойлик пул оқимини 25 000 долларга етказиб"; K:121: "Пул оқими – бу ойлик маошни ҳисобга олмаганда жами оладиган даромадингиз ... ҳеч қаерда ишламаётган ... 25 000 доллар миқдоридаги пассив даромад"; K:143: blank orqasiga "пассив даромад" yoziladi. L p.5, p.10: "25 000 sh.b. oylik passiv daromad". | `index.ts:62-70` `canExitSmallCircle`: `passiveIncome - expenses >= 25 000` (passivdan BARCHA xarajat ayriladi). `game.ts:561`: `lockedFlow = playerCashflow(p)` = maosh + passiv − xarajat. SPEC §5.4: "oylik passiv pul oqimi ≥ 25 000" (namuna "pul oqimi 25 400"). | o'rta | Manbalar "pul oqimi" va "passiv daromad" so'zlarini aralashtiradi; kirill ta'rifi (K:121) = maoshsiz jami daromad (xarajat ayrilmaydi). Hozirgi kod eng qattiq talqin (qo'shimcha ~xarajat miqdori, odatda 300–2 000 + kredit to'lovlari). Buyurtmachidan bitta formulani aniqlash (SPEC §16 ga yozish); tavsiya: chiqish = passiv daromad ≥ 25 000 (K:121), minimum esa chiqish paytidagi PASSIV daromad (K:143), `lockedFlow` ga maosh kirmasin. Namuna 1 020 000/25 400 mos qoladi. |
| 7 | "Imkoniyat" katagida katta karta chegarasi (aynan 25 000) | K:108: "агар сизда 25 000 доллар нақд пул бўлган тақдирдагина" (≥). K:223: "25 000 дан кам бўлса ... Кичик; 25 000 дан зиёд бўлса — ихтиёр" (=25 000 aytilmagan). L p.7 jadval: "naqd ≥ 25 000"; L p.6: "25 000 dan ko'p bo'lsa". | `game.ts:395`: `if (p.cash <= 25_000) return offer(... "kichik")` — aynan 25 000 da kichik; `CONFIG.smallOpportunityBigFrom` nomi "dan" deydi, lekin `<=` ishlatiladi; OPEN_QUESTIONS #9. | past | Chegarani `>=` (K:108 va L p.7 mos) ga o'tkazish yoki aniq "ko'p" (>) deb SPEC §16 ga yozish. Ikkala lotin va kirill matn o'zaro bir-biriga zid, shuning uchun buyurtmachi qarori. |
| 8 | Bozorda majburiy qoidalar: aksiyalarni sotish va buzilayotgan uy tovoni | K:179-183: majburiy = "корхона сотилганда ёки ёпилганда, хусусийлаштирилганда, касодга учраганда акцияларни сотиш; эски уй бузилганда пул компенсацияси олиш; қарув харажатлари; кичик бизнес кенгайиши". K:193: "БУК1, БУК2 – банкдан ... компенсацияни олинг". (Ichki farq: K:191, 200 "agar narx to'g'ri kelsa" ixtiyoriy.) L p.7 ham shu ro'yxatni beradi. | `effects.ts:44-54` barcha `Sotish imkoniyati` (aksiya UTK/ZA/TAPOiCh/KCh/GZ, `KV1s / KV2s`) = ixtiyoriy `marketSale` taklifi; majburiy faqat "Majburiy to'lov"/"Daromad oshadi"/"Xarajat oshadi" (OPEN_QUESTIONS #3). Aksiya kartasi misoli: "UzTelekom korxonasi sotilmoqda ... 30 sh.b." | o'rta | Kontentda har bir bozor kartasiga `mandatory: true` belgisi: (a) aksiya kartalarida "korxona sotilmoqda/yopildi/xususiylashtirildi/bankrot" matni bo'lsa, (b) `KV1s / KV2s` (BUK) tovoni. Ixtiyoriy qolsa o'yinchi inqiroz/yopilish narxidan qochib qutiladi — qoida ma'nosi (zarar qabul qilish) yo'qoladi. Qaysi kartalar ro'yxati buyurtmachi bilan tasdiqlanadi. |
| 9 | "Tasodifiy tushum" (TD) kartasi majburiy | K:156: "Ҳар қандай карточка (фақат “Тасодифий тушум” карточкасидан ташқари) фақат сизнинг хоҳишингизга биноан ўйнайди"; K:164: summani olib, ko'rilgan kartaga qo'shing. | `effects.ts:68`: TD `"optional"` (OPEN_QUESTIONS #4 "ixtiyoriy deb olindi"). `cards.json` kichik TD = 10 ta. | o'rta | TD ni `mandatory` + `gain` qilish. Hozirgi holatda 30 s taymer tugasa (ixtiyoriy karta o'tkaziladi, SPEC §5.2) o'yinchi bepul pulni yo'qotadi va "avtomatik qaror" −2 ball oladi. |
| 10 | Qarovdan voz kechish harakati yo'q | K:160: "Сиз қарашдан истаган вақтингизда воз кечишингиз мумкин. ... карточкани ўйналган карточкалар боғламига қайтарасиз ва ортиқча харажатдан халос бўласиз"; K:201 "ҚАР ... ёки қаровдан воз кечинг". | `p.qar` faqat `true` bo'ladi (`engine.ts:183`); `Action` ro'yxatida voz kechish yo'q (`game.ts:172-188`). Natijada oylik −100 abadiy (kampir vafot kartasi ham `qar` ni o'chirmaydi). | o'rta | Harakat `qar_drop` (xarajat −100 olib tashlanadi) va "vafot etdi" kartasida (hozir: tovon/meros) `qar=false`. Meros kartasi ("25 000 ga sotish") dan keyin ham. |
| 11 | Bank kredit hisob-kitobi yaxlitlanishi | K:131-136: 5 000 : 36 = 139, 1 000 : 12 = 84, oylik 223; muddatidan oldin 5 000 − 12×139 = 3 332. L p.8 xuddi shu (139 / 84 / 223 / 3 332; garov 6 000). | `index.ts:30-32`: `amount/36 + amount*0.2/12` = 222.22 (yaxlitlanmaydi, #2). `engine.ts:147` `repayBankLoan`: `ceil(5000×24/36)` = 3 334. | o'rta | Manba har qismni butun songa yaxlitlaydi (138.89 -> 139, 83.33 -> 84). Qoida: `round(A/36) + round(A×0.2/12)`, qaytarish = `A − 12×round(A/36)`; kalkulyator ekrani va server bir xil bo'lsin. Aks holda mijozdagi "kredit kalkulyatori" qo'llanmadagi misolga mos kelmaydi (223 o'rniga 222,2). Testlarda `guide.test.ts` ga 5 000 misolini qo'shing. |
| 12 | Bank kredit muddati manba ichida zid: "1 yil" va "36 oy" | K:128: "Кредит бир йилга яъни 3 айланага йилига 20 фоиз" (12 oy). K:131: "5000 : 36 ой". K:136: 12 oydan keyin 3 332 qoladi (ya'ni 36 oylik jadval). | `RULES.bankTermMonths=36`; muddatidan oldin yopish 12 oydan (`bankEarlyCloseMonths`). | past | 36 oy to'g'ri (misol shu bilan hisoblangan); "1 yil" = faqat muddatidan oldin yopish chegarasi. Qoidalar matniga bir xil yozing: "36 oy; 12 oydan keyin muddatidan oldin yopish mumkin". |
| 13 | Bank kreditlari jami 10 000 chegarasi manbada yo'q | K:124: 10 000 — faqat 1-aylanada Xarajat bo'yicha QARZ (owe) chegarasi. K:128: har bir kredit 2 000–5 000; jami chegara aytilmagan, faqat "daromad kredit to'lovidan kam bo'lsa bermaydi" (K:139). | `index.ts:3` `bankLimit: 10_000` + "bank kreditlari yig'indisi ham shundan oshmaydi"; SPEC §5.3: "Bank (limit 10 000)". | o'rta | SPEC §5.3 qo'llanma bilan chalkashtirgan ("Bank limit 10 000"). Kod #92/#94 da qarz va bank kreditini ajratgan, lekin bank kreditlari yig'indisi ≤ 10 000 (taxmin) qoidasi manbasiz. Tavsiya: bank uchun yagona cheklov — oylik to'lov ≤ umumiy daromad (K:139) va har kredit 2 000–5 000; yig'indi chegarasini olib tashlash yoki buyurtmachidan tasdiqlash. |
| 14 | SPEC §5.3 matni eskirgan | K:124, 138: pul yetmasa qarz (10 000 gacha), bank qarzni yopish uchun kredit BERMAYDI, lombard bor. | `docs/SPEC.md:53`: "Pul yetmasa. Bank (limit 10 000), so'ng o'zaro qarz va sheriklik. Bank kredit oylik to'lovi = summa/36 + summa×20 %/12." | o'rta | CLAUDE.md "zid bo'lsa SPEC ustun" deydi, shu sababli SPEC §5.3 ni #92-#94 qarorlariga moslab qayta yozish (qarz = `owe`, bank = faqat aktiv sotib olish uchun, lombard, garov 120 %, 50 %). Aks holda yangi agent SPEC bo'yicha eski xatti-harakatni tiklaydi. |
| 15 | Audit katagi matni ("daromadingizning 20 foizi") | K:258: "Мавжуд нақд пулингизнинг 20% фоизини банкка беринг. Агар пулингиз бўлмаса, бу секторга эътибор берманг". L p.11: naqdning 20 %. | `content/data/board_big.json:306` va `SPEC.md` B ilovasi (172-qator JSON): `"note": "Daromadingizning 20 foizini yo‘qotdingiz!"`; kod `cell_rules.json` `payCashShare 0.2` (to'g'ri). | past | `note` matni (katak ustidagi yozuv) noto'g'ri — "naqd pulingizning 20 %" qilib o'zgartirish (agar bu taxtadagi asl yozuv bo'lsa, ilovaga o'zbekcha izoh sifatida alohida maydon). Kod ta'siri o'zgarmaydi. |
| 16 | G'alaba sharti: 10 000 va 100 000 | K:31: "ойлик 10 000 доллар даромадга эришиш"; K:148-149: "100 000 доллар миқдорида пассив даромад". L p.19 "HALI ANIQLASHTIRILMAGAN": 100 000 olingan. | `RULES.winCashflow=100_000`; OPEN_QUESTIONS #90 "matn xatosi deb olindi". | past | Kirill matn ham 100 000 ni ikki joyda (K:148, K:149) takrorlaydi, 10 000 faqat bir marta (K:31, tavsiya qismida). Qaror to'g'ri; buyurtmachi tasdig'ini SPEC §16 da qayd qiling. Qo'shimcha: K:149 "Уриниб кўришингиз мумкин" (orzuni oldin sotib olishga urinish) noaniq — qaror kerak (hozir kod: 100 000 bo'lmasa orzu katagida Katta aylana xarajati kartasi). |
| 17 | "Kichik biznes kengayishi" bozor kartasi kimga tegishli | K:163: "(фақт сизга эмас бошқа ўйинчига ҳам)" — hammaga. K:203: "КБ — ... (бошқа ўйинчиларга тегишли эмас)" — faqat tortganga. Manba ichida zid. | `cards.json` bozor MB (8 ta): `who: "Faqat kartani olgan o'yinchi"`; kod buni bajaradi. | past | Karta matni (rasm) va K:203 bir xil (faqat tortgan). K:163 ni e'tiborsiz qoldirish; Qoidalar matnida aniq yozish. |
| 18 | 2-aylana kreditlari: ipoteka 20 %+20 % va "kredit uyushmasi" 60 % | K:153: "кредит суммасининг 20 %ини олдиндан тўлаган ҳолда квартира сотиб олиш учун яна 20 % йиллик тўлов билан ипотека ... кредит уюшмасидан 60 % йиллик кредит ... активларнинг қиймати кредитнинг 120 %". | L, SPEC, kod: kredit uyushmasi YO'Q; katta aylanada bank yo'q (#84, #86). Ipoteka sifatida `cards.json` katta: 26 ta kartada kredit; boshlang'ich to'lov ~20 % (23 tasi), lekin oylik `interest` kredit×20 %/12 dan 24 kartada >5 % farq qiladi (masalan KV2s-001: 650, 20 % bo'yicha 467; yillik 14–33 %). | o'rta | K:153 "Иккинчи айлана қоидалари" bo'limida turibdi, lekin mazmuni 1-aylana mulkiga tegishli ko'rinadi. Kredit uyushmasi (yillik 60 %) hech qayerda modellashtirilmagan: SPEC §16 ga "kredit uyushmasi kerakmi" savolini yozing, kod o'zgarishsiz. Karta `interest` qiymatlari rasmdan olingan (CLAUDE.md §2.5), 20 % formula emas, shuning uchun qo'llanma matniga "yillik 20 %" deb yozmang. |
| 19 | Bank krediti to'lanmasa musodara | K:138: "Агар бир айлана давомида ... тўламасангиз, банк ... икки баробар ошиқча миқдордаги ... мулк ва активларни мусодара қилишга мажбур". | Yo'q (OPEN_QUESTIONS #90: kredit to'lovi avtomatik yechiladi, kechikish bo'lmaydi). | past | Kechikish yo'qligi uchun qoida o'zi kerak emas, lekin SPEC'ga "avtomatik yechiladi" deb yozing; qo'lda hisob rejimi (#123) bilan birga kechikish mumkinmi — tekshirish. |
| 20 | Vaqt bo'yicha rejim (Rejim 2) kodlanmagan | K:31-37: 1–4 tajribali — g'alabagacha; 4 dan ortiq yoki tajribasiz — vaqt (3–8 soat), vaqt tugaganda "eng ko'p narsaga erishgan" g'olib. | SPEC §5.11: simulyatsiya ~370 navbat (16–20 soat), 6 o'yinchili xonalar; OPEN_QUESTIONS #90 "hozircha yo'q"; #114 median 172 oy. | o'rta | Xonalar 2–6 o'yinchi (6 fishka K:270 mos) bo'lgani uchun 5–6 o'yinchili xona qo'llanma bo'yicha vaqt rejimini talab qiladi. "Eng ko'p erishgan" o'lchovi hech qayerda berilmagan (K:37) — SPEC §16 savoli: g'olibni qanday aniqlash (pul oqimi, sof boylik yoki passiv daromad). Tavsiya: xona sozlamasi `mode: "to_win" \| "timed"` va `timedMinutes` (tavsiya 3–8 soat jadvalidan, K:34). |
| 21 | Hamkorlik (suyunchi, o'zaro qarz, sheriklik) qo'llanmada yo'q | K:68, K:233: faqat bank 500 "bir martalik yordam". K:69-70: foyda bilan xayriyani aralashtirmang, do'stga yo'qotishga tayyor miqdorda qarz bering. O'yinchilar o'rtasidagi yagona iqtisodiy aloqalar: boshqaning biznesiga tushish (to'lov yoki 2×/3× sotib olish), bozor kartalari, qarov. | SPEC §5.6, `game.ts:639-701`: suyunchi 10–500 o'yinchilardan, o'zaro qarz, sheriklik 50/50. | o'rta | Bu yangi mahsulot funksiyalari (asl qoidada yo'q). Zid emas, lekin "asl o'yin qoidalari" deb ko'rsatib bo'lmaydi: rules ekrani/o'quv matnida hamkorlik bo'limi "POYGA onlayn qo'shimchasi" deb ajratilishi kerak; K:119 "bank operatsiyasi paytida boshqalar yurmaydi" bilan SPEC §5.6 "navbatni to'xtatmaydi" muvofiq ravishda aniqlansin (parallel taklif). |
| 22 | Nomlar: sektor va karta nomlari | K:222-265 va K:266-285 | SPEC A/B, `uz.ts`: Q = «Ishdan bo'shadingiz!» (K: "Қисқариш"); K = «O'yinni boshidan boshlang!» (K: "Чиқиб кетиш" karta oladi); "Turg'un biznes" (K: "Барқарор бизнес"); "Audit tekshiruvi" (K: "Аудитор текшируви"); "Siz ota bo'ldingiz" (K: "ота-она"); "Orzu" (K: "Кўнгилдаги орзулар"); "Kambag'allar olami" (K ikkala "Қашшоқлар олами" K:82 va "Камбағаллар олами" K:242, 249, 263); deka "KUTILMAGAN HODISA!" (K "Чиқиб кетиш" K:215, inventarda "Ўтиш" K:283, papka "Shit_happens"). | past | Matn muharriri qarori: CLAUDE.md §2.6 karta nomi «KUTILMAGAN HODISA!» qoladi; qoidalar matnida kirill nomlari izoh sifatida (glossariy 3-bo'limda). Ichki nomuvofiqlik: "Чиқиб кетиш" va "Ўтиш" bir xil 9 karta. |
| 23 | Mahsulot tarkibi va karta soni | K:277-285: kasb 32, Xarajat 105, Bozor 102, Kichik 91, Katta 91, Katta aylana xarajati 25, O'tish 9 = 455. | SPEC D: kasb 28, kichik 82, katta 85, bozor 98, xarajat 85, kxar 25, hod 9 = 412 (+6 yangi = 418). L p.7 xuddi 412+6. | o'rta | Farq: +4 kasb (32 = 28 + L p.19 "4 ta yangi kasb"), +20 xarajat, +4 bozor, +9 kichik, +6 katta = 43. Kasb farqi aniq (4 yangi kasb kutilmoqda). Qolgan 39 karta uchun tushuntirish yo'q: yoki kitob nashrida ko'proq (takroriy) karta bor, yoki rasmlar hali yuborilmagan. Buyurtmachi javobi kerak (SPEC §16). Kirill 1.-4. qatordagi kartalarga "Меники" 240 fishka = 6 rang × 40: egalik fishkasi (K:284; kodda `tokens`). Pul 12 nominal × 50 (K:285) — #123 dagi nominallar ro'yxatidan "500 000?" ni chiqarib tashlash va 12 ta nominal olish (10, 20, 50, 100, 500, 1 000, 5 000, 10 000, 50 000, 100 000, 1 000 000, 5 000 000) mos keladi. |
| 24 | Pul birligi | K:68 va ko'p joyda "доллар" ($), K:265 "ш.б." | CLAUDE.md: «sh.b.»; hamma kontent sh.b. | past | Hamma "dollar" -> "sh.b." (shartli birlik). Qoidalar matnida "dollar" so'zi qolmasin; K:120 "1000 000" -> "1 000 000". |
| 25 | Qarov: "vasiylik" chiqishda saqlanadi, L'da yo'q | K:122: chiqishda "васийлик" (=qarov) mulk qatorida qoladi. | `engine.ts:84` `qar` oylik −100 (chiqishdan keyin ham); L p.10 ro'yxatida qarov yo'q. | past | Qarov chiqishda saqlanadi (mos), lekin 2-aylanada oylik −100 bu yerda "passiv"ga ta'sir qiladimi, belgilanmagan; `lockedFlow` minimum bo'lgani uchun muammo emas. SPEC'ga bir jumla. |
| 26 | Avtomobil sug'urtasi qamrovi | K:211: sug'urta karta "ЙТҲ (yo'l-transport hodisasi) uchun to'lovdan ozod qiladi". | `cards.json` new SUG: YTH; hod TOSH (suv toshqini) ham sug'urtalilarga to'lanmaydi (`engine.ts:195`); xar n=24 (bamper) va n=39 ("rafiqangiz rulga o'tirdi") YTH-ga o'xshash, lekin sug'urta ularni qoplamaydi. | past | Qo'llanma bo'yicha sug'urta YTH-turdagi xarajatlarni ham qoplashi kerak (24, 39). Qaror: karta ikki `kind` (`yth`) bilan belgilansin. Suv toshqini yangi karta (buyurtmachi qarori). |

### Qo'shimcha: "Nohalol biznes" 1-marta to'lov (K:265)

K:265 "бизнесингизда мавжуд 1 000 000 ш.б." — "biznesingizda mavjud" so'zlari noaniq (naqd? biznes qiymati?). L p.11 "1 000 000 to'lang". Kod: naqd yetmasa barcha naqd olinadi va eng arzon biznes yo'qoladi (#95, buyurtmachi qarori). Manbada yetmaganda nima bo'lishi aytilmagan. Qaror #95 ni qoldirish, lekin SPEC'ga yozish.

## 2. KAMCHILIKLAR (manbaning o'zida yetishmaydigan / noaniq / zid joylar)

1. **Ma'lumotlar yo'q**: kirill matnda kasb jadvali, karta narx/daromadlari, kataklar soni va tartibi, aksiya narxlari berilmagan; kasb/karta ma'lumotini faqat rasm va CSV'lardan olish mumkin. Qo'llanma bu ma'lumotlarning qoida manbasi emas.
2. **Pul oqimi va passiv daromad aralash** (K:120-121, 143, 148, 256): bir joyda "pul oqimi 25 000" (K:120), keyingi gapda "maoshsiz jami daromad" (K:121), blankka "passiv daromad" yoziladi (K:143), "Yana pullar"da esa "pul oqimi (korxonalar foydasi)" (K:256). Hisob formulasi (xarajat ayriladimi?) aniq berilmagan -> #6.
3. **Imkoniyat chegarasi aynan 25 000** — ikkala tilda noaniq (#7).
4. **"Bir aylana"** ta'rifi: Qisqarish va qarz muddatlari uchun "aylana" = 4 oy (K:104) deb olingan; katta aylanada 4 "Yana pullar" (K:150). Manbada katta aylana uchun 4 "Yana pullar"ning "aylana" ekani faqat K:150 qavsida. OK, lekin Q katagi katta aylanada yo'q.
5. **Vaqt rejimida g'olib** "eng ko'p narsaga erishgan" (K:37) — o'lchov berilmagan (#20).
6. **K:149 "Уриниб кўришингиз мумкин"** — orzuni 100 000 shartidan oldin sotib olishga urinish mumkinmi, noaniq.
7. **K:198 "П"** kodi ("agar narx mos kelsa ... faqat siz sotasiz") `cards.json` bozor kodlarida (KV*, DX, Ye, MB, UTK, ZA, TAPOiCh, KCh, GZ, AV, D, QAR) yo'q; Ye (yer) va D (kolleksiya) K:189, 192 da nomsiz sanalgan. K:157 yerni "istagan o'yinchi sota oladi" deydi, K:198 esa "faqat siz". Ehtimol Ye/ЕR bilan chalkash.
8. **Qarz kartasi (Q) ikki xil ma'noda**: K:158 qarz so'rash, K:159 spirtli ichimlik uchun ashyo sotish (ya'ni kolleksiya). Kodda bu ajratilgan (#5), manbada "Q" bitta kod.
9. **Katta aylana moliyaviy tizimi**: K:153 (kredit uyushmasi) kontekstsiz.
10. **Bozor kartasi ketma-ketliklari** (K:177): "aksiya narxi bir necha bosqichdan so'ng chorak narxga tushadi"; ammo kartalar aralashtirilgani uchun tartibga bog'lanmaslik aytilgan. Kodda bu muammo yo'q (har karta alohida). OK.
11. **Moliyaviy inqiroz** (K:76, 217): "karta o'ynalgan to'plamga qo'shiladi va keyin e'tibor berilmaydi" — ya'ni inqiroz kartasi qayta tortilsa muddat qayta boshlanadimi? Manbada yo'q. Kodda `crisisMonths` qayta boshlanadi (`game.ts:380`).
12. **Imlo/matn xatolari** (tarjimada ehtiyot): "1000 000" (K:120), "ламбард/ломбард" (K:138), "Тасодифий тушум/даромад" (K:156, 164), "Ўйин майдонидаги" va h.k. Ichki qarama-qarshiliklar: "Қашшоқлар/Камбағаллар олами", "Барқарор" va L "Turg'un".
13. **Lotin qo'llanma bilan o'zaro farq** (qisqacha): (a) L jadvalida 44 biznes deyilgan, lekin 40 qator bor — yo'q: «Ofis mebeli ishlab chiqaruvchi sex» (6 000 / 80 000), «Turk va koreys kiyimlarini tikish» (7 000 / 170 000), «UzDigital TV» (12 000 / 120 000, yutuqli 5 yoki 6), «Gaz quyish shoxobchasi» (30 000 / 300 000, 5 yoki 6) — hammasi `board_big.json` va SPEC B da bor; (b) L p.7 "Imkoniyat ≥ 25 000" va p.6 "ko'p bo'lsa" o'zaro zid; (c) L p.6 K katak (xona egasi yoqsa) kirill matnda sozlama yo'q — K:234-235 doim karta oladi (cell_rules `eventCard` standart yoqilgan, mos); (d) L p.6 hod to'lovi "bank" — K:138 ga zid (bank qarz yopmaydi); kod K:138 ga mos; (e) L hamkorlik, 30 s taymer, ballar K da yo'q (yangi funksiyalar); (f) L "Boshga qayting" tugmasi... (K Start/boshlanish ekran ta'rifi bilan mos).
14. **Zotdor sigirlar fermasi** (`board_big.json` V-21: 150 000 narx, +120 000/oy): 1,25 oyda o'zini qoplaydi (boshqalar 20–35 oy). Bitta shu biznes 100 000 g'alaba chegarasiga 1,2 marta yetadi (3/6 ehtimol). Qo'llanma bu sonlarni bermaydi; asl taxtadan (PDF) tekshirish: 12 000 bo'lishi mumkin. Kirill matn buni tasdiqlamaydi ham, inkor ham qilmaydi.

## 3. Kirill atamalar -> o'zbek lotin (glossariy)

| Kirill | Lotin | Qayd |
|---|---|---|
| ДОНИШМАНД ОТА | Donishmand ota | o'yin nomi (K:1) |
| Ўйна ва бойиб кет | O'yna va boyib ket | asl nom (K:30, 78) |
| Қашшоқлар/Камбағаллар олами | Qashshoqlar/Kambag'allar olami | ichki (kichik) aylana |
| Бойлар олами | Boylar olami | tashqi (katta) aylana |
| Ёлланма ишчи, Мутахассис, Профессионал, Тадбиркор, Бизнесмен, Сармоядор | Yollanma ishchi, Mutaxassis, Professional, Tadbirkor, Biznesmen, Sarmoyador | 6 bosqich (K:9-23). SPEC §5.9 "5 yulduz: Yollanma ishchi -> Sarmoyador" ning oraliq unvon nomlari (#69) shu — 0..5 yulduz = 6 nom |
| Касб карточкаси; Бланка; Фишка | Kasb kartochkasi; Blank; Fishka | |
| Кичик/Катта сармоялар | Kichik/Katta sarmoyalar | |
| Харажатлар; Бозор | Xarajatlar; Bozor | |
| Катта айланадаги харажатлар | Katta aylanadagi xarajatlar | |
| Чиқиб кетиш / Ўтиш карточкалари | Chiqib ketish / O'tish kartochkalari | = «KUTILMAGAN HODISA!» |
| Меники | Meniki (egalik fishkasi) | 6 xil × 40 |
| Имконият | Imkoniyat | |
| Даромад ("Яна пуллар") | Daromad ("Yana pullar") | |
| Қисқариш | Qisqarish | = «Ishdan bo'shadingiz!» |
| Сиз ота-она бўлдингиз | Siz ota-ona bo'ldingiz | SPEC: «Siz ota bo'ldingiz!» |
| Барқарор бизнес | Barqaror biznes | SPEC: Turg'un biznes |
| Таваккал бизнес | Tavakkal biznes | |
| Кўнгилдаги орзулар | Ko'ngildagi orzular | |
| Аудитор текшируви | Auditor tekshiruvi | SPEC: Audit tekshiruvi |
| Ажралиш | Ajralish | |
| Касод / Банкрот | Kasod / Bankrot | |
| Сиз нопок бизнес юритдингиз | Siz nopok biznes yuritdingiz | SPEC: nohalol biznes |
| Ломбард; Кредит уюшмаси; Ипотека | Lombard; Kredit uyushmasi; Ipoteka | |
| Гаров; Бўнак (олдиндан тўлов); Мусодара | Garov; Bo'nak (boshlang'ich to'lov); Musodara | |
| Қарз; Қарув/Қаров (ҚАР); Васийлик | Qarz; Qarov; Vasiylik | |
| Тасодифий тушум/даромад (ТД) | Tasodifiy tushum/daromad (TD) | |
| БУК1/БУК2 | BUK1/BUK2 (buziladigan uy kvartirasi) | kodda KV1s/KV2s |
| КВ1о, КВ2о, КВ3о; КВ1–КВ4; ДҲ; АВ; КБ | KV1o…KV3o; KV1…KV4; DX; AV; KB (=MB) | |
| ТАПОиЧ, ЗА, УТК, ГЗ, КЧ | TAPOiCh, ZA, UTK, GZ, KCh | aksiya kodlari (K:161) |
| Ипотека, ЙТҲ | Ipoteka, YTH | |

## 4. MOS KELADIGANLAR (tasdiqlandi)

- Kichik aylana: 1 kubik, soat mili bo'yicha, 4 "Daromad" = 4 oy, 3 aylana = 1 yil (K:101-104; SPEC §5.1).
- Katta aylana: 2 kubik (K:103, 144-146; `game.ts:209`). 
- Kichik aylana sektorlari to'plami: Start, Imkoniyat, Xarajat, Bozor, Daromad, Qisqarish (Q), Ota-ona (O), Chiqib ketish (K) — 8 tur SPEC A bilan mos; katta aylana: Start, Barqaror, Tavakkal, Orzu, Yana pullar, Audit, Ajralish, Bankrot, Nohalol — 9 nom, 5 X-turi SPEC B bilan mos.
- Imkoniyat: <25 000 -> kichik (K:223; `game.ts:395`).
- Daromad katagidan o'tish/tushish: pul oqimi (maosh emas) (K:228-229; SPEC §5.1; L p.6).
- Qisqarish: 1 aylana (4 oy) maosh yo'q, passiv daromad va xarajatlar davom (K:231; `cell_rules.json` `noSalary months 4`).
- Ota-ona: bank 500, xarajat +bola summasi (K:233; `index.ts` `suyunchiBank 500`, `engine.ts:83`).
- Qarz chegarasi 10 000, naqd paydo bo'lishi bilan yopiladi, oshsa yangi kasb (K:124-125; `game.ts:145-149`, #94).
- Bank mini kredit: 2 000–5 000, 36 oy, yillik 20 %, garov 120 %, 12 oydan keyin yopish, faqat aktiv sotib olish uchun, daromad > to'lov (K:128-139; #92).
- Lombard: 50 %, 10 %/oy, 1 yil, foiz kechiksa garov yo'qoladi, qimmatli qog'ozlar garovga yaramaydi (K:140; `index.ts`, #93).
- Ishdan bo'shash: 3-kichik yoki 1-katta biznesda (K:77, 218; `game.ts:548`).
- Chiqish: passiv 25 000 + naqd 1 000 000 + qarz/kredit 0 (K:120-122; `index.ts`) — formula tafsiloti #6.
- Qarov kartasi: kartani ushlab turish, hamma bozor kartalariga javob berish (K:160; `game.ts:352`); qarov kartalari "Qarov kartasi egasi" (`cards.json` QAR).
- Birovning biznesi: oylik daromadni to'lash yoki 2× sotib olish, 2 fishka, keyin 3× (K:242-244; `game.ts:424-428`, #85).
- Tavakkal biznes: to'liq narx naqd, banksiz, bir kubik (K:247; #84; `board_big.json` `faces`/`lump`).
- Orzu: faqat o'z katagida, faqat naqd, boshqaning orzusi -> Katta aylana xarajat kartasi (K:148, 253-254; `cell_rules.json` O -> `drawDeck kxar`; `game.ts:416-421`).
- Yana pullar: pul oqimi, qarz darhol yopiladi, 4 marta o'tgach biznes sotiladi (K:150, 256; `game.ts:287-300`).
- Audit 20 % naqd, Ajralish 50 % naqd, Nohalol 1 000 000 -> 20 % -> e'tibor bermang (K:258-265; `cell_rules.json`).
- Bankrot: eng kam daromadli biznes yo'qoladi (K:262; `game.ts:467`).
- Inqiroz 9 aylana = 36 oy (K:76; `RULES.crisisLaps`, #67); karta #8 narx 2 barobar pasayadi (`cards.json` hod n=8).
- Xarajat kartalari majburiy, o'ynalgan to'plamga qo'shiladi, jinsga qaramasdan to'lanadi (K:205, 212); bola kartasi summasi bolalar soniga bog'liq emas (K:208).
- Mashina sug'urtasi kartasi o'yinchida qoladi (K:211; `engine.ts:191-193`).
- Bozor kartalari ovoz chiqarib o'qiladi, o'yinchida qolmaydi (K:176; `game.ts:340`); "Hod" kartalari ham (K:216).
- Birinchi yuradigan — katta kubik (K:98-99; SPEC §6).
- 6 fishka -> 2–6 o'yinchi (K:270; SPEC §6.1). Orzu tanlash o'yin boshida, nomi va qiymati blankka (K:95-96; #61).
- Katta aylana qarzi chiqish paytidagi minimal pul oqimini o'zgartirmaydi (K:143; `game.ts:314`).
- Bank daromad kredit to'lovidan kam bo'lsa kredit bermaydi (K:139; `engine.ts:95-99`).
- "Katta aylanada o'tgan pul oqimi kamaymaydi" (SPEC §5.4) = K:143.
- Sektor "Chiqib ketish" (K) kartalari katta pul (5 000–75 000) bo'lgani uchun K katagi restartga olib borishi mumkin — kod `cell_rules` `eventCard` + qarz chegarasi bilan mos (K:124 + K:215-216).

## 5. Kodga ta'siri

| Fayl / modul | O'zgarish |
|---|---|
| `rules/src/game.ts` `endTurn` (558-563) | Chiqishda bizneslarni topshirish, `lockedFlow` = passiv daromad (#1, #6); maosh qolsa to'xtatish yoki chiqish sharti "ishlamaydi" (K:121). |
| `rules/src/game.ts` `backToSmall` (282-285), `bigMonthEnd` (296), `loseWorstBusiness` (471) | Yangi kasb kartasi + `quitJob=false` + bolalar saqlanadi (#5). Qaror #95 qayta ko'rilishi kerak. |
| `rules/src/engine.ts` `newPlayer` (75-79), `Kasb` (`game.ts:19`) | `car`/`kv` -> boshlang'ich aktivlar (#4). |
| `rules/src/engine.ts` `allDebt/totalDebt` + `game.ts` `Action` | Yangi harakat `asset_credit_repay` (#2); `qar_drop` (#10). |
| `content/src/effects.ts` (68, 89) + `content/src/schema` | TD majburiy (#9); `xar` kartalarida `requires: child \| car` va YTH belgisi (#3, #26); bozorda `mandatory` belgisi aksiya-yopilish/BUK uchun (#8). |
| `rules/src/index.ts` (30-32), `engine.ts:147`, `client/src` kalkulyator | Bank to'lovi va muddatidan oldin qaytarish yaxlitlanishi: 139/84/223/3 332 (#11). |
| `rules/src/index.ts:62-70` | Chiqish formulasi (#6). |
| `rules/src/game.ts:395`, `CONFIG.smallOpportunityBigFrom` | `>=` / `>` (#7). |
| `content/data/board_big.json:306`, `docs/SPEC.md` B ilova | Audit `note` matni (#15). |
| `docs/SPEC.md` §5.3, §5.4, §5.5, §16; `docs/OPEN_QUESTIONS.md` | #13/#14: SPEC §5.3 qayta yozish; #16, #18, #20, #23 ni §16 ga yozish. |
| `server/src/profiles.ts:53` (`titleOf`) | 6 unvon nomi: Yollanma ishchi, Mutaxassis, Professional, Tadbirkor, Biznesmen, Sarmoyador (glossariyga qarang, #69). |
| `client/src/i18n/uz.ts` (qoidalar matni) | "dollar" -> "sh.b."; nomlar glossariyga mos; hamkorlik bo'limi "POYGA onlayn qo'shimchasi" sifatida. |
| Yangi: xona sozlamasi `mode`/`timedMinutes` (server `rooms`, client xona yaratish) | Vaqt rejimi (#20), tavsiya 3–8 soat (K:34), g'olib mezoni qaroridan keyin. |
| Testlar `rules/src/guide.test.ts` | 5 000 kredit namunasi (223 / 3 332); bolasiz o'yinchi bola kartasini to'lamaydi; chiqishda biznes topshiriladi; aktiv kreditini yopib chiqish; TD majburiy; qarovdan voz kechish. |

## 6. Natija bo'yicha ustuvorlik

1. yuqori: #1 (chiqishda bizneslar), #2 (aktiv kreditini yopib bo'lmaydi), #3 (shartli xarajat kartalari), #4 (kasbdagi mashina/kvartira), #5 (2-aylanadan qaytish).
2. o'rta: #6, #8, #9, #10, #11, #13, #14, #18, #20, #21, #23.
3. past: #7, #12, #15, #16, #17, #19, #22, #24, #25, #26 va "unvon nomlari".
