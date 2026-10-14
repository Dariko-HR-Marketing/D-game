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
| `ADMIN_TOKENS` | vaqtinchalik admin tokenlari (JSON); SSO/2FA ulangach o'chiriladi |
| `METRICS_TOKEN` | `/metrics` uchun (bo'sh bo'lsa o'chirilgan) |
| `LOG_LEVEL`, `ROOM_IDLE_MINUTES`, `WS_CONNECT_RATE`, `WS_CONNECT_BURST`, `WS_PING_MS` | ixtiyoriy sozlamalar |

Konteyner sog'liq tekshiruvi: `GET /ready` (200 = server va baza ishlayapti).

## Ommaviy ishga tushirishdan oldin (to'siqlar)
1. Haqiqiy kirish: SMS / Google / Apple (`Authenticate` interfeysi tayyor; xizmat va kalitlar kerak).
2. Mustaqil xavfsizlik sinovi, yuridik masalalar (16 yosh, ma'lumot joylashuvi, o'chirish).
3. Prototipning qolgan ekranlari, karta rasmlari, ochiq qoidalar (`docs/OPEN_QUESTIONS.md`).
4. Monitoring: `docs/ops/alerts.yml`, `docs/ops/RUNBOOK.md`.
