# Yuklama sinovi (SPEC §11, §13)

Skript: `cd server && pnpm loadtest -- --rooms 200 --players 4 --seconds 30 --think 1000 --metrics-token tok` (server alohida jarayonda: `WS_CONNECT_BURST=9000 METRICS_TOKEN=tok npx tsx src/main.ts`).
Sun'iy mijozlar o'yinni haqiqiy o'ynaydi (kubik, qaror), `think` — o'yinchining o'ylash vaqti.

## Natijalar (bitta jarayon, bitta mashina; mijoz va server bir xil mashinada)
| Holat | Ulanishlar | Harakat/s | Javob p50 / p99 | Server RSS | Izoh |
|---|---|---|---|---|---|
| 200 xona × 4, think 1000 ms, xotira saqlagichi | 800 | 200 | 1.3 / 5.8 ms | 120 → 177 MB | zaxira katta |
| 100 xona × 4, think 500 ms, **PostgreSQL** | 400 | 197 | 5.5 / 13 ms | 117 → 155 MB | saqlash xatosiz |
| 400 xona × 4, think 300 ms (haddan tashqari) | 1600 | ~950 | 73 / 500 ms | 119 → 310 MB | bitta CPU yadrosi ~100 % — chegara |

**Xulosa:** bitta jarayon ~900 harakat/s gacha chidaydi. Real o'yinchi har 5–10 soniyada bir harakat qiladi, ya'ni bitta jarayon taxminan 4 000–8 000 faol o'yinchini (1 000–2 000 xona) ko'taradi, kechikish yuzlab ms dan past. Bu taxmin — sinov bir mashinada o'tkazilgan, tarmoq kechikishi va haqiqiy mijozlar yo'q.

## Sinov topgan va tuzatilgan muammolar
1. **Yashirin ma'lumot sizib chiqardi:** mijozga tasodifiy urug' (`seed`, `rngState`) va deka tartibi yuborilardi — kelgusi kubik va kartalarni oldindan hisoblab aldash mumkin edi. Endi faqat ochiq holat ketadi (`publicState`), testlangan.
2. **WebSocket ulanishi umumiy IP limiti ostida edi:** maktab sinfi (bir IP, 30+ o'quvchi) to'sib qo'yilardi. Endi WS ulanishi alohida kengroq limitda (`WS_CONNECT_RATE`, `WS_CONNECT_BURST`).
3. Har bir ulanishga holat alohida seriyalanardi — endi bir marta (CPU ~15 % kamaydi). Holat hajmi 11 KB dan ~3–7 KB ga tushdi.

## Qolgan cheklovlar
- Bitta jarayon: gorizontal masshtablash uchun xona→jarayon biriktirish kerak (OPEN_QUESTIONS #46).
- Haddan tashqari yuklamada `stale_seq` xatolari ko'payadi (mijoz keyingi holatni kutib qayta uradi) — normal xatti-harakat, lekin mijoz harakatni yangi holat kelgach bir marta avtomatik qayta yuboradi (`client/src/net/connection.ts`).
- Holatning to'liq nusxasi (`structuredClone`) har harakatda olinadi — keyingi optimallashtirish nomzodi.
