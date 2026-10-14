# Buyurtmachidan kerak bo'lgan qarorlar

Maqsad: **kichik aylanadan chiqib, katta aylanada g'alabagacha to'liq o'ynash** (MVP mezoni, SPEC §15). Hozir buning oldida SPEC'da aniqlanmagan qoidalar turibdi. Men ularni o'ylab topmadim (SPEC §14.9). Har bir qaror uchun: nima ma'lum, variantlar, mening tavsiyam va qaror kelgach nima bo'lishi.

**Qanday javob berish:** har bir bo'lim oxirida «Javob» qatori bor. Qisqa yozing, masalan `D1 = A`, `D2 = B, 2 navbat`. Tavsiyam bo'lsa «tavsiya» deng. Raqamlarni (navbat soni, summa) faqat siz bilasiz, men ularni taxmin qilmayman.

**Qaror kelgach kod yozish shart emas:** ochiq kataklar **ma'lumot bilan sozlanadi**: admin panel → Kontent → `cellRules` ga JSON kiritiladi, **yangi o'yinlarda** darhol ishlaydi (boshlangan o'yinlar eski qoidada qoladi, §11). Quyida tavsiya variantlar uchun tayyor JSON bor. Kodni faqat yangi tur ta'sir kerak bo'lsa o'zgartiramiz.

Mavjud ta'sir turlari: `none` (hech narsa) · `restart` (yangi kasb bilan boshidan) · `skipTurns` (N navbat o'tkazish) · `payday` (pul oqimi N marta) · `payFixed` (aniq summa) · `loseIncomeShare` (oylik daromad ulushi, bir marta) · `drawDeck` (hod/kxar/xar/bozor dekasidan karta) · `offerCellAsset` (katakdagi biznesni sotib olish taklifi).

---

## A. To'siqlar: shularsiz to'liq o'yin mumkin emas

### D1. Kichik aylana, K katagi: «O'yinni boshidan boshlang!»
- **Ma'lum:** maydonda 1 ta (46-katak). §5.3: «bank limitidan oshsa — yangi kasb bilan boshidan» qoidasi bor.
- **Variantlar:** **A** yangi kasb, aktivlar va qarzlar yo'qoladi (bankrotlik bilan bir xil) · **B** kasb saqlanadi, START'ga qaytasiz, aktivlar qoladi · **C** boshqa.
- **Tavsiya:** A (matn aynan «boshidan boshlang» va §5.3 bilan mos).
- **JSON:** `{"small":{"K":{"kind":"restart"}}}`
- **Javob:** D1 = ____

### D2. Kichik aylana, Q katagi: «Ishdan bo'shadingiz!»
- **Ma'lum:** maydonda 1 ta (31-katak). Qoida va muddat SPEC'da yo'q.
- **Variantlar:** **A** N navbat o'tkazasiz (ish haqi yo'q, xarajatlar to'lanadi) · **B** bir necha navbat ish haqi olinmaydi, lekin yurish davom etadi · **C** yangi kasb.
- **Sizdan kerak:** variant va **navbat soni** (men son aytmayman).
- **JSON (A, N=?):** `{"small":{"Q":{"kind":"skipTurns","turns":N}}}`
- **Javob:** D2 = ____ , navbat soni ____

### D3. Katta aylana: oy qachon o'tadi?
- **Ma'lum:** kichik aylanada oy «D» katagidan o'tish/tushishda. Katta aylanada «D» yo'q (53 katak: T 21, O 14, V 9, X 5, Y 4). §5.4: «katta aylanada o'tgan pul oqimi kamaymaydi».
- **Hozirgi taxmin (kodda):** START (34) dan o'tish = 1 oy.
- **Variantlar:** **A** START'dan o'tish (hozirgi) · **B** har yurishda · **C** «Yana pullar» (Y) katagida tushganda · **D** boshqa.
- **Tavsiya:** A yoki C (aylana boshiga bir marta — tabiiy to'lov davri).
- **Javob:** D3 = ____

### D4. Katta aylana, X kataklari
Ma'lum (maydon ma'lumotidan): **5 Bankrot** · **23 Ajrashish** · **33 Audit tekshiruvi** (izoh: «Daromadingizning 20 foizini yo'qotdingiz!») · **34 Start** · **47 «Siz nohalol biznes olib bordingiz!»** (narx 1 000 000, izoh: «1 000 000 to'lang va ozod bo'ling!»).

| Katak | Tavsiya | Tushuntirish / savol |
|---|---|---|
| 33 Audit | `loseIncomeShare 0.2` | izoh aniq; savol: oylik daromadning 20 % i **bir marta** to'lanadimi yoki daromad doimiy 20 % kamayadimi? |
| 47 Nohalol biznes | `payFixed 1000000` | izoh aniq; savol: pul yetmasa nima bo'ladi (bank limiti bor, yetmasa — restart?) |
| 34 Start | `none` | boshlanish katagi |
| 23 Ajrashish | savol | hod #7 ajralish haqida: «Bankka 75 000 bering va biznesingiz qoladi, aks holda KB laringizdan birini qaytaring» — **tanlov** (pul yoki biznesni yo'qotish). Hozir kodda faqat «75 000 to'lash». Biznesni yo'qotish varianti kerakmi? |
| 5 Bankrot | savol | bankrotlik oqibati? (**A** hod dekasidan karta · **B** restart · **C** boshqa) |
- **Javob:** D4: 33 = ____ ; 47 = ____ ; 23 = ____ ; 5 = ____

### D5. «Kutilmagan hodisa» dekasi (hod, 9 karta)
- **Ma'lum:** matnlar katta biznes yo'qotishlari («Bankka 10 000…75 000 bering»), #8 jahon inqirozi, #7 ajralish. Summalar kichik aylana uchun juda katta (bank limiti 10 000), demak katta aylanaga tegishli. **Qachon tortilishi SPEC'da yo'q.**
- **Savollar:** (1) qaysi katakda/hodisada tortiladi? (X kataklarida? aylana boshida?) (2) #8 inqiroz: §5.7 «9 aylana (3 yil) amal qiladi» — amal qilganda **narxlar ikki baravar tushadimi** (sotish va sotib olish)? Hozir kodda faqat bir marta nominal narx yarmiga tushadi, 9 aylana davomiyligi yo'q. (3) #7 muqobil (D4).
- **Hisob:** kichik aylanada 4 ta «D» katagi bor, ya'ni 1 aylana = 4 oy; 9 aylana = **36 oy = 3 yil** (§5.7 bilan mos). Savol: davomiylik **kimning** oyida o'lchanadi (inqirozni tortgan o'yinchining o'z oyida / hamma o'yinchilarning umumiy o'tgan oylarida)? Tugaganda «aloqador o'yinchilarga xabar» — aloqador = narxi tushgan aktivi borlar.
- **Tavsiya:** hod dekasi X kataklarida (Bankrot) tortiladi; inqiroz — 36 oy davomida (har bir o'yinchining o'z oyida) sotish narxlari ×0.5.
- **Javob:** D5 = ____

### D6. «Yana pullar» (Y) katagi — 4 ta (0, 15, 26, 42)
- **Ma'lum:** faqat nomi.
- **Variantlar:** **A** pul oqimi yana bir marta (qo'shimcha oy daromadi) · **B** aniq summa (sizdan) · **C** kxar/bozor dekasidan karta.
- **Tavsiya:** A.
- **JSON (A):** `{"big":{"byType":{"Y":{"kind":"payday","times":1}}}}`
- **Javob:** D6 = ____

### D7. V kataklari (9 ta): «kubik bilan bog'liq investitsiya»
- **Ma'lum:** 2 Chorvoqda yer (270 000), 6 chiqindi zavodi (500 000), 10 Toshkentdan xonadonlar (500 000), 14 quyosh akkumulyator (200 000), 21 sigirlar fermasi (150 000, daromad 120 000), 24 ehtiyot qismlar sexi (200 000, 20 000), 29 «UzDigital TV» (120 000, 12 000), 37 gaz shoxobchasi (300 000, 30 000), 41 issiqxona patenti (60 000). SPEC §16: qoida «qo'llanmadan aniqlanadi, D ilovadagi `DICE`» — **men qo'llanma/DICE matnini ko'rmadim**.
- **Sizdan kerak:** DICE qoidasining matni (kubik natijasiga qarab foyda/zarar jadvali). Bo'lmasa vaqtincha tavsiya: V = T bilan bir xil (narx/daromad bilan sotib olish taklifi).
- **JSON (vaqtincha):** `{"big":{"byType":{"V":{"kind":"offerCellAsset"}}}}`
- **Javob:** D7 = ____ (DICE matni ilova qilinsin)

### D8. Katta aylana xarajat dekasi (kxar, 25 karta)
- **Ma'lum:** matnlar 3 500…50 000 sh.b. xarajatlar («Mersedes ta'mir», «vazani sindirish»).
- **Savol:** qachon tortiladi? (**A** aylana boshida (START'dan o'tganda) · **B** T-katakka tushganda · **C** alohida katak yo'q — chiqmaydi.)
- **Tavsiya:** A.
- **Javob:** D8 = ____

### D9. Imkoniyat (I) katagi: kichik yoki katta sarmoya kartasi
- **Ma'lum:** A ilova: kichik sarmoya — naqd 25 000 sh.b. gacha, katta — undan ko'p; «bu chegara asl qoidada tekshirilsin».
- **Savol:** chegara 25 000 to'g'rimi va «gacha» chegarani o'z ichiga oladimi (≤ 25 000 kichik)? Hozir shunday.
- **Javob:** D9 = ____

---

## B. Balans va o'yin sifati

### D10. 6 soatlik vaqt rejimi (§5.11)
Sinov (docs/BALANCE.md): aqlli bot kichik aylanadan chiqishi ~384 navbat. **Qoida:** aylana soni yoki vaqt bo'yicha to'xtash; **g'olibni qanday aniqlaymiz** (eng yuqori pul oqimi? aktivlar? eng yaxshi progress?).
**Javob:** D10 = ____

### D11. Bank talqinlari (§5.3)
(a) Limit 10 000 — **jami** qarzga (hozir) yoki har bir kreditga? (b) Kredit **36 oyda so'nadi** (summa/36 + foiz har oy) — to'g'rimi? (c) To'lov yaxlitlanadimi? Hozir yo'q.
**Javob:** D11 = ____

### D12. Aksiyalar
Aksiya kartasida narx (bir aksiya), min–max soni bor, daromad/narx o'zgarishi **yo'q**. Aksiya dividend beradimi? Narxi qanday o'zgaradi (faqat bozor kartalari)?
**Javob:** D12 = ____

### D13. §5.6 «tasdiq kutilmoqda» qoidalar
1. Qarz bilan chiqish: −50 ball va «Ishonchsiz» belgisi. 2. Vaqt rejimi tugaganda ochiq hamkorlik qarzlari passiv sifatida hisoblanadi. 3. 5 dan kam o'yinchi: o'zaro qarz yopiq, sheriklik ochiq (**kodlangan**).
**Javob:** D13 (1) = ____ ; (2) = ____ ; (3) = tasdiqlangan/yo'q

### D14. Sheriklik tafsilotlari
«Ulush qaytgach 24 oy dividend» tartibi va «bepul sotib olish» varianti aniq emas. Hozir: 50/50 foyda va egasi to'liq narx + 1 oylik foyda bilan sotib oladi.
**Javob:** D14 = ____

### D15. Bozor «sotish imkoniyati» (98 kartaning 84 tasi)
Hozir: mos aktivli **har bir o'yinchiga** 30 soniya ochiq, har biri **bir marta bitta** aktiv sotadi; sheriklikdagi aktiv sotilmaydi; `real = "?"` bo'lsa narx o'sishi hisoblanmaydi (17 mulk).
**Savol:** tasdiqlaysizmi? `real = "?"` mulklarning bozor qiymati qancha?
**Javob:** D15 = ____

---

## C. Mahsulot va kontent

### D16. Ball, yulduz, yutuqlar (§5.9)
«Har 100 ball — daraja» bor. Kerak: qaysi hodisaga **necha ball** (g'alaba, chiqish, ...), «5 yulduz — Yollanma ishchi → Sarmoyador» mantig'i, yutuqlar ro'yxati va shartlari. Hozir ball qoidasi bo'sh, reyting g'alabalar soni bo'yicha.
**Javob:** D16 = ____

### D17. Yangi kasblar
SPEC: «4 ta yangi kasb ma'lumoti» — hozir 28 kasb bor. Maydonlar: nom, ish haqi, 9 ta xarajat, jamg'arma, kvartira/mashina narxi, bola xarajati, rasm.
**Javob:** D17 = ma'lumot ilova qilinadi

### D18. Karta rasmlari
418 ta fayl (`file` maydonidagi nomlarda) kerak; kod tayyor (`docs/SERVER.md` — «Karta rasmlari»). Karta orqasi («KUTILMAGAN HODISA!»), «KICHIK AYLANA» sarlavhasi, 6 yangi karta rasmi, Google/Apple rasmiy tugmalari — dizayner.
**Javob:** D18 = ____

### D19. Reaksiyalar va chiqish
Reaksiyalar to'plami (👍 👏 😮 😂) va ixtiyoriy chiqish oqibati («qaytib kira olmaysiz, o'rningizni bot egallaydi», natija reytingga hisoblanmaydi) — siz tasdiqlaysizmi? Tashlab ketilgan xona muddati (hozir 30 daqiqa).
**Javob:** D19 = ____

---

## D. Tashqi qarorlar (men hal qila olmayman)

| # | Qaror | Nima kerak |
|---|---|---|
| D20 | Kirish xizmati (SMS / Google / Apple) | provayder tanlovi va kalitlar; shundan keyingina ommaga ochish mumkin |
| D21 | Yuridik: 16 yosh, to'lov, **ma'lumot joylashuvi (O'zbekiston serverlari)**, hisobni o'chirish | yurist xulosasi; server joyini belgilaydi (`docs/SERVER.md`) |
| D22 | Narxlar: Plus, do'kon, litsenziya | konfiguratsiya bo'sh, qiymatlar sizdan |
| D23 | Hosting: VPS provayder va tarif | `docs/SERVER.md` mezonlari |
| D24 | Mustaqil xavfsizlik sinovi | jamoa/pudratchi (§13) |
| D25 | Muddat va byudjet | sizdan |

---

## Tavsiya variantlar bilan to'liq `cellRules` (tasdiqlansa — shuni kiritasiz)
Faqat siz tasdiqlaganlarni kiriting; **D2 dagi `turns` va D7 ni o'zingiz to'ldirasiz**. Tasdiqlanmagan katak bo'sh qoldirilsa, u hozirgidek ta'sirsiz va jurnalga «qoida kutilmoqda» yoziladi.

```json
{
  "small": {
    "K": { "kind": "restart" },
    "Q": { "kind": "skipTurns", "turns": 0 }
  },
  "big": {
    "byType": {
      "Y": { "kind": "payday", "times": 1 },
      "V": { "kind": "offerCellAsset" }
    },
    "byIndex": {
      "5":  { "kind": "drawDeck", "deck": "hod" },
      "33": { "kind": "loseIncomeShare", "share": 0.2 },
      "34": { "kind": "none" },
      "47": { "kind": "payFixed", "amount": 1000000 }
    }
  }
}
```
(`"turns": 0` ataylab noto'g'ri: admin panel uni rad etadi, shu tariqa D2 ni to'ldirmasdan nashr qilib bo'lmaydi.)
