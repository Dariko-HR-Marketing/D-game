# POYGA — ekspluatatsiya qo'llanmasi (runbook)

## Kuzatuv
| Nima | Qayerda | Eslatma |
|---|---|---|
| Jarayon tirik | `GET /health` | autentifikatsiyasiz, tezlik cheklovidan ozod |
| Tayyorlik | `GET /ready` | 503 = saqlagich (PostgreSQL) javob bermayapti |
| Ko'rsatkichlar | `GET /metrics` + `Authorization: Bearer $METRICS_TOKEN` | token berilmasa 404 (o'chirilgan) |
| Jurnal | stdout, JSON (pino) | `LOG_LEVEL`; token/so'rov parametrlari/IP yozilmaydi |
| Ogohlantirishlar | `docs/ops/alerts.yml` | Prometheus qoidalari |

Asosiy ko'rsatkichlar: `poyga_rooms_active`, `poyga_players_online`, `poyga_ws_sockets`, `poyga_actions_total{type,result}`, `poyga_games_total{event}`, `poyga_action_seconds`, `poyga_http_requests_total{status}`, `poyga_rate_limited_total`, `poyga_ws_errors_total`.

## Server ishlamayapti
1. `curl $HOST/health`. Javob yo'q → konteyner/jarayonni qayta ishga tushiring (tizim `SIGTERM` da toza to'xtaydi).
2. Qayta ishga tushganda tugamagan o'yinlar bazadan tiklanadi (jurnalda `tiklangan o'yinlar: N`). Oflayn o'yinchilar qayta ulangach davom etadi; navbat taymeri 30 soniyada o'zi harakat qiladi.
3. Tiklanmagan bo'lsa: jurnal oxirini ko'ring (`uncaughtException`), keyin bazani tekshiring.

## PostgreSQL
- `/ready` 503: `psql $DATABASE_URL -c 'select 1'`. Baza tiklangach server o'zi qayta ulanadi (pool). Bu vaqtda yozuvlar xatoga tushadi ("persist xatosi" jurnalda) — o'yin xotirada davom etadi, lekin snapshot/jurnal yozilmaydi: baza tiklangach eng oxirgi holat keyingi harakatda yoziladi.
- Zaxira nusxa: kunlik `pg_dump`; migratsiyalar `server/migrations` (ketma-ket, `if not exists`).

## Ichki xatolar
`poyga_ws_errors_total` o'sdi → jurnalda `ws: ichki xato` yozuvlarini toping (`type` maydoni qaysi xabar turi ekanini ko'rsatadi). O'yin holati buzilgan bo'lsa: jurnal (`journal` jadvali) + urug'dan o'yinni qayta o'ynang (`rules/src/analysis.ts: analyzeGame`).

## Nizo / shikoyat
Admin panel → Xonalar → O'yin jurnali. O'yin urug' va harakatlardan to'liq qayta tiklanadi (tekshiriladigan tasodifiy manba).

## Kontent versiyasini qaytarish
Admin → Kontent → oldingi versiyani "Nashr qilish". Boshlangan o'yinlar o'z versiyasida qoladi.

## Tashlab ketilgan xonalar
Hamma odam oflayn bo'lsa o'yin to'xtab turadi; zal va odamsiz qolgan xona `ROOM_IDLE_MINUTES` (standart 30), boshlangan o'yin `ROOM_IDLE_STARTED_HOURS` (standart 24) dan ortiq oflayn bo'lsa har daqiqa ishlaydigan tozalash bilan yopiladi (`poyga_games_total{event="abandoned"}`). Server qayta ishga tushganda tiklangan, hech kim ulanmagan xonalar ham shu muddatdan keyin yopiladi.

## Yuk va cheklovlar
Hozirgi arxitektura bitta jarayon (xonalar xotirada, taymerlar jarayonda). Gorizontal masshtablash uchun xona→jarayon biriktirish (sticky routing yoki xona egasi qulfi) kerak — hali yo'q (OPEN_QUESTIONS #46).
