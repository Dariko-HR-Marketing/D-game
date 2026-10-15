# Qabul qilingan qarorlar jurnali

SPEC aytmagan qoidalar bo'yicha qarorlarni loyiha jamoasi **professional taxmin sifatida qabul qildi** (buyurtmachi tasdig'igacha). Hech biri kodda qattiq yozilmagan: katak qoidalari `cellRules` (JSON, admin panel → «Kontent», versiyali, o'yin boshlanganda qulflanadi), qolganlari `RULES`/`POINTS` konstantalari. Buyurtmachi boshqacha desa — faqat shu qiymat o'zgaradi. Har bir band `OPEN_QUESTIONS.md` da raqam bilan ham bor.

## Katak qoidalari (`content/data/cell_rules.json`)

```json
{
 "small": {
  "K": {
   "kind": "eventCard"
  },
  "Q": {
   "kind": "noSalary",
   "months": 4
  }
 },
 "big": {
  "byType": {
   "Y": {
    "kind": "none"
   },
   "V": {
    "kind": "offerGamble"
   },
   "O": {
    "kind": "drawDeck",
    "deck": "kxar"
   }
  },
  "byIndex": {
   "5": {
    "kind": "loseWorstBusiness"
   },
   "23": {
    "kind": "payCashShare",
    "share": 0.5
   },
   "33": {
    "kind": "payCashShare",
    "share": 0.2
   },
   "34": {
    "kind": "none"
   },
   "47": {
    "kind": "shady",
    "first": 1000000,
    "share": 0.2
   }
  }
 }
}
```

| Katak | Qoida (manba: «POYGA o'yin qo'llanmasi») | Qanday o'zgartiriladi |
|---|---|---|
| Kichik aylana K | «Kutilmagan hodisa»: xona egasi yoqsa hod kartasi (naqd/bank/qarz bilan to'lanadi, yetmasa yangi kasb); o'chirilgan bo'lsa oddiy katak | `small.K`, xona sozlamasi `events` |
| Kichik aylana Q | 4 oy (bir aylana) maosh yo'q, faqat passiv daromad; xarajat to'lanadi | `small.Q.months` |
| Katta aylana Y «Yana pullar» | o'tganda ham, tushganda ham 1 oy: pul oqimi; qarz bo'lsa darhol yopiladi (START dan o'tish oy emas) | dvigatel |
| V Tavakkal | to'liq narx naqd + 1 kubik; yutuq qirralari katakda (`faces`), natija oylik daromad yoki bir martalik (`lump`) | `board_big.json`, `big.byType.V` |
| T/V birovniki | A — oylik daromadni egasiga to'lash; B — 2× narxda sotib olish (2 fishka), keyingisi 3× | dvigatel |
| O Orzu | o'z orzui + 100 000 pul oqimi + naqd yetsa — g'alaba; aks holda kxar kartasi | `big.byType.O` |
| 5 Bankrot | eng kam daromadli biznes yo'qoladi; yo'q bo'lsa naqd va kichik aylana mulki bilan kichik aylanaga qaytadi | `big.byIndex.5` |
| 23 Ajrashish | har safar naqdning 50 % i | `big.byIndex.23.share` |
| 33 Audit | naqdning 20 % i (naqd bo'lmasa ta'sirsiz) | `big.byIndex.33.share` |
| 34 Start | ta'sirsiz | `big.byIndex.34` |
| 47 Nohalol biznes | 1-marta 1 000 000; 2-marta naqdning 20 %; 3-marta ta'sirsiz | `big.byIndex.47` |
| Katta aylana qarzi | pul yetmasa qarz yoziladi, «Yana pullar»da yopiladi; 4 ta o'tishda yopilmasa biznes bankka sotiladi, yo'q bo'lsa yangi kasb bilan kichik aylanaga | dvigatel (`bigDebt`) |
| Bank krediti | 2 000–5 000, garov 120 %, faqat sotib olish uchun, to'lov ≤ daromad (OPEN_QUESTIONS #92) | `RULES.bank*` |
| Lombard | garov qiymatining 50 %, oyiga 10 %, 12 oydan keyin asosiy qarz (#93) | `RULES.lombard*` |
| Qarz (kichik aylana) | naqd yetmasa qarz, naqd paydo bo'lishi bilan yopiladi, chegara 10 000 (#94) | `RULES.bankLimit` |
| Ishdan bo'shash | 3-kichik yoki 1-katta biznesni sotib olganda maosh to'xtaydi | dvigatel (`quitJob`) |

## Boshqa qarorlar

| № | Qaror | Qiymat joyi |
|---|---|---|
| 60 | Jahon inqirozi 36 oy (9 aylana × 4 oy); shu davrda yer, dacha, kvartira, aksiyalarni sotish va sotib olish narxi ×0.5; tugaganda xabarnoma | `rules/src/game.ts` (`crisisMonths`) |
| 60 | Haqiqiy qiymati «?» bo'lgan aktiv bozor narxi = sotib olish narxi | `engine.ts` `marketPrice` |
| 61 | Orzu tanlash: 60 s, takrorlanmaydi, tugasa server tasodifiy beradi | `RULES.dreamSeconds` |
| 62 | Qarz eslatmasi: beruvchi qarzdorga eslatma yuboradi, har bir qarz uchun raundda 1 marta | `game.ts` `loan_remind` |
| 62 | Avto sug'urta kartasi faqat mashinasi borga qo'llanadi | `engine.ts` |
| 63 | Ballar: g'alaba 100, kichik aylanadan chiqish 50; 100 ball = 1 daraja | `server/src/profiles.ts` `POINTS` |
| 66 | «Ishonchsiz»: ochiq qarz yoki sheriklik bilan o'yindan ixtiyoriy chiqqan o'yinchi −50 ball oladi va profilida belgi ko'rinadi (o'yin statistikaga kirmaydi) | `server/src/profiles.ts` `POINTS.unreliable`, `rooms.ts` `leave` |
| 64 | Sheriklik: sherik foydaning 50 % ini oladi; to'lagan ulushi (narxning yarmi) foyda bilan qaytgach yana 24 oy dividend oladi, so'ng ulush egasiga BEPUL o'tadi va sheriklik yopiladi. Ega istalgan payt to'liq narx + 1 oylik foyda bilan erta sotib ola oladi | `RULES.partnerDividendMonths`, `game.ts` `tickStakes`, `partner_buyout` |
| 69 | Yulduz = daraja (ko'pi bilan 5); 0 yulduz «Yollanma ishchi», 5 yulduz «Sarmoyador», oralig'ida unvon nomi yo'q (SPEC'da yo'q) | `profiles.ts` `starsOf`/`titleOf` |

## Hali tashqaridan kerak (qaror emas, ma'lumot/xizmat)

4 ta yangi kasb ma'lumoti, 418 karta rasmi, SMS/Google/Apple kirish xizmati, huquqiy masalalar (16 yosh, ma'lumot joylashuvi), narxlar, VPS provayderi, mustaqil xavfsizlik sinovi. Batafsil: `OPEN_QUESTIONS.md`.
