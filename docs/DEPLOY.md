# Joylashtirish (deploy)

**Yo'l bitta:** o'z VPS'ingizda `deploy/vps/` (Docker Compose). Qaysi server olish, o'rnatish tartibi, zaxira va muammolar — **[`docs/SERVER.md`](SERVER.md)**.

## Arxitektura
- **Server** — Fastify + WebSocket (Docker, `Dockerfile`). Doimiy ishlaydigan jarayon kerak (taymerlar va xonalar xotirada): serverless va umumiy hosting mos emas.
- **PostgreSQL 16** — o'yin jurnali, snapshotlar, admin ma'lumotlari. Migratsiyalar server ishga tushganda o'zi bajariladi (`server/migrations`).
- **Veb mijoz** (Expo web) va **admin panel** (Vite) — `deploy/vps/Dockerfile.web` quradi, Caddy tarqatadi.
- **Caddy** — HTTPS (Let's Encrypt) va WebSocket (wss) proksisi.

## Server muhit o'zgaruvchilari
| O'zgaruvchi | Vazifa |
|---|---|
| `NODE_ENV` | `staging` (production haqiqiy autentifikatsiyasiz ataylab ishga tushmaydi) |
| `DATABASE_URL` | PostgreSQL ulanishi (compose o'zi beradi) |
| `CORS_ORIGINS` | mijoz va admin originlari (compose `APP_DOMAIN`/`ADMIN_DOMAIN` dan o'zi tuzadi) |
| `ADMIN_BOOTSTRAP_LOGIN`, `ADMIN_BOOTSTRAP_PASSWORD` | birinchi administrator (faqat hisoblar bo'sh bo'lganda); keyin olib tashlang |
| `ADMIN_REQUIRE_2FA` | `1` — 2FA majburiy (standart) |
| `ADMIN_TOKENS` | eski statik tokenlar (JSON); bo'sh qoldiring — 2FA/qulf ostida emas |
| `BACKUP_MARKER` | ixtiyoriy: zaxira oxirida yangilanadigan fayl (panelda ko'rsatiladi) |
| `METRICS_TOKEN` | `/metrics` uchun (bo'sh bo'lsa o'chirilgan) |
| `LOG_LEVEL`, `ROOM_IDLE_MINUTES`, `ROOM_IDLE_STARTED_HOURS`, `WS_CONNECT_RATE`, `WS_CONNECT_BURST`, `WS_PING_MS` | ixtiyoriy sozlamalar |

Konteyner sog'liq tekshiruvi: `GET /ready` (200 = server va baza ishlayapti).

## Ommaviy ishga tushirishdan oldin (to'siqlar)
1. Haqiqiy kirish: SMS / Google / Apple (`Authenticate` interfeysi tayyor; xizmat va kalitlar kerak).
2. Mustaqil xavfsizlik sinovi, yuridik masalalar (16 yosh, ma'lumot joylashuvi, o'chirish).
3. Prototipning qolgan ekranlari, karta rasmlari, ochiq qoidalar (`docs/OPEN_QUESTIONS.md`).
4. Monitoring: `docs/ops/alerts.yml`, `docs/ops/RUNBOOK.md`.

## Do'kon, ta'lim va turnirlar (qo'shimcha sozlamalar)

- `PUBLIC_URL` — ota-ona SMS havolalari uchun asosiy manzil (masalan `https://poyga.example`).
- `PAYMENT_WEBHOOK_SECRET` — `/pay/confirm` imzosi (HMAC-SHA256, sarlavha `x-signature`). Bo'sh bo'lsa marshrut yopiq.
- To'lov provayderi ulanmaguncha xaridlar `payments_unavailable` qaytaradi — bu kutilgan holat.
- Narxlar va bepul tarif chegaralari admin panelda «Do'kon va Plus» bo'limida kiritiladi; bo'sh narx = sotuv yopiq.
- Migratsiya `005_docs.sql` avtomatik qo'llanadi.

## Admin birinchi marta

1. `.env` ga `ADMIN_BOOTSTRAP_LOGIN` va `ADMIN_BOOTSTRAP_PASSWORD` yozing, `docker compose up -d`.
2. `https://admin.<domen>` da kiring → parolni almashtiring → 2FA ni sozlang.
3. «Admin hisoblari»da jamoa uchun shaxsiy hisoblar yarating; bootstrap o'zgaruvchilarini `.env` dan olib tashlang. Batafsil: [ADMIN.md](ADMIN.md).

## Kontent (kartalar, orzular) va deploy
Kontent (`content/data/*.json`) kod bilan yetkaziladi, lekin server uni **PostgreSQL dagi versiyalardan** o'qiydi: baza bo'sh bo'lmasa paket faqat birinchi ishga tushishda ishlatilardi, shuning uchun deploy'dan keyin ham eski kartalar turardi. Endi har ishga tushishda paket bazadagi faol versiya bilan solishtiriladi (`ContentRegistry.syncPackage`):
- Farq bo'lsa **yangi versiya** («Paket yangilandi (xesh)») yaratiladi va faollashadi; o'yinlar o'zlari boshlangan versiyada davom etadi, faqat yangi o'yinlar yangi kartalarni oladi.
- Faol versiya **admin tahriri** bo'lsa avtomatik almashtirilmaydi (jurnalda ogohlantirish); admin `POST /admin/content/sync-package` (ruxsat `content.publish`) paketni majburan faollashtiradi (admin tahrirlari almashtiriladi, eski versiyalar saqlanadi).
- O'chirish: `CONTENT_SYNC=off`.
Tekshirish: admin → kontent versiyalari ro'yxatida eng oxirgi versiya «Paket yangilandi» va faol bo'lishi kerak.

## Ovozli aloqa (WebRTC): STUN/TURN
Audio o'yinchilar o'rtasida **to'g'ridan-to'g'ri** (P2P) o'tadi; server faqat signal uzatadi va audioni saqlamaydi. Ko'p tarmoqlarda to'g'ridan-to'g'ri ulanish ishlaydi, lekin ba'zilarida (korporativ tarmoq, simmetrik NAT, ba'zi mobil operatorlar) **TURN** kerak bo'ladi — aks holda «ulanmadi» deb ko'rinadi.
1. `deploy/vps/.env` da `ICE_SERVERS` (JSON massiv) bering. Bo'sh bo'lsa ommaviy STUN (`stun.l.google.com`) ishlatiladi — u faqat manzilni aniqlaydi (IP shu xizmatga ko'rinadi).
2. TURN uchun ochiq manbali **coturn** ni alohida VPS'da (yoki shu serverda alohida konteynerda) ishga tushiring: `3478/udp+tcp` va `5349/tcp` (TLS), `49152–65535/udp` oralig'i ochiq; `lt-cred-mech` bilan foydalanuvchi/parol. Misol sozlama: `ICE_SERVERS=[{"urls":["turn:turn.example.uz:3478","turns:turn.example.uz:5349"],"username":"poyga","credential":"PAROL"}]`.
3. TURN trafigi sarflanadi (audio ~ 30–50 kb/s bitta ulanishga) — kuzatib boring. Doimiy parol mijozga ko'rinadi: ommaviy ishga tushirishdan oldin vaqtinchalik (REST/HMAC) hisob ma'lumotlariga o'ting (keyingi bosqich).
4. Tekshirish: ikki turli tarmoqdan (masalan, Wi-Fi va mobil internet) o'yinga kirib, chatdagi «Ovozga qo'shilish» ni bosing; ikkala tomonda «ulangan» ko'rinishi kerak.
Native ilovalar (iOS/Android) uchun ovoz keyingi bosqich: `react-native-webrtc` va Expo dev client kerak; hozir ovoz veb-versiyada (telefon brauzerida ham ishlaydi).

