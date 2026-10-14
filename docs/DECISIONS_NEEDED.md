# Qabul qilingan qarorlar jurnali

SPEC aytmagan qoidalar bo'yicha qarorlarni loyiha jamoasi **professional taxmin sifatida qabul qildi** (buyurtmachi tasdig'igacha). Hech biri kodda qattiq yozilmagan: katak qoidalari `cellRules` (JSON, admin panel → «Kontent», versiyali, o'yin boshlanganda qulflanadi), qolganlari `RULES`/`POINTS` konstantalari. Buyurtmachi boshqacha desa — faqat shu qiymat o'zgaradi. Har bir band `OPEN_QUESTIONS.md` da raqam bilan ham bor.

## Katak qoidalari (`content/data/cell_rules.json`)

```json
{
 "small": {
  "K": {
   "kind": "restart"
  },
  "Q": {
   "kind": "skipTurns",
   "turns": 2
  }
 },
 "big": {
  "byType": {
   "Y": {
    "kind": "payday",
    "times": 1
   },
   "V": {
    "kind": "offerCellAsset"
   }
  },
  "byIndex": {
   "5": {
    "kind": "drawDeck",
    "deck": "hod"
   },
   "23": {
    "kind": "drawCard",
    "cardId": "hod-7"
   },
   "33": {
    "kind": "loseIncomeShare",
    "share": 0.2
   },
   "34": {
    "kind": "none"
   },
   "47": {
    "kind": "payFixed",
    "amount": 1000000
   }
  },
  "onLap": {
   "kind": "drawDeck",
   "deck": "kxar"
  }
 }
}
```

| Katak | Qaror | Qanday o'zgartiriladi |
|---|---|---|
| Kichik aylana K | Kasbni yo'qotish — o'yinchi yangi kasb bilan boshidan boshlaydi | `small.K` |
| Kichik aylana Q | 2 navbat o'tkazib yuboradi | `small.Q.turns` |
| Katta aylana Y (to'lov kuni) | 1 oylik daromad | `big.byType.Y.times` |
| V (aktiv) | Aktivni sotuvga qo'yish taklifi | `big.byType.V` |
| 5 (Bankrot) | «hod» dekasidan karta | `big.byIndex.5` |
| 23 (Ajrashish) | hod-7: 75 000 to'lash yoki eng kam daromadli kichik biznesni yo'qotish (biznes yo'q bo'lsa to'lanadi) | `big.byIndex.23` |
| 33 (Audit) | daromadning 20 % ini yo'qotish | `big.byIndex.33.share` |
| 34 (Start) | ta'sirsiz | `big.byIndex.34` |
| 47 | 1 000 000 to'lanadi (maydondagi narx) | `big.byIndex.47.amount` |
| Aylana boshidan o'tish | «kxar» dekasidan karta | `big.onLap` |

## Boshqa qarorlar

| № | Qaror | Qiymat joyi |
|---|---|---|
| 60 | Jahon inqirozi 36 oy (9 aylana × 4 oy); shu davrda yer, dacha, kvartira, aksiyalarni sotish va sotib olish narxi ×0.5; tugaganda xabarnoma | `rules/src/game.ts` (`crisisMonths`) |
| 60 | Haqiqiy qiymati «?» bo'lgan aktiv bozor narxi = sotib olish narxi | `engine.ts` `marketPrice` |
| 61 | Orzu tanlash: 60 s, takrorlanmaydi, tugasa server tasodifiy beradi | `RULES.dreamSeconds` |
| 62 | Qarz eslatmasi: beruvchi qarzdorga eslatma yuboradi, har bir qarz uchun raundda 1 marta | `game.ts` `loan_remind` |
| 62 | Avto sug'urta kartasi faqat mashinasi borga qo'llanadi | `engine.ts` |
| 63 | Ballar: g'alaba 100, kichik aylanadan chiqish 50; 100 ball = 1 daraja | `server/src/profiles.ts` `POINTS` |
| 64 | Sheriklik: sherik foydaning 50 % ini ega bo'lgunicha oladi, ega istalgan payt to'liq narx + 1 oylik foyda bilan sotib oladi. «24 oy dividend»/«bepul» variant kodlanmadi (SPEC noaniq) | `game.ts` `partner_buyout` |

## Hali tashqaridan kerak (qaror emas, ma'lumot/xizmat)

4 ta yangi kasb ma'lumoti, 418 karta rasmi, SMS/Google/Apple kirish xizmati, huquqiy masalalar (16 yosh, ma'lumot joylashuvi), narxlar, VPS provayderi, mustaqil xavfsizlik sinovi. Batafsil: `OPEN_QUESTIONS.md`.
