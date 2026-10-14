# Joylashtirish (deploy) qo'llanmasi

## Arxitektura
- **Server** — bitta Docker konteyner (`Dockerfile`), WebSocket + HTTP, port 3000. Doimiy ishlaydigan jarayon kerak (taymerlar va xonalar xotirada): serverless (Vercel/Lambda) mos emas.
- **PostgreSQL 16** — boshqariladigan xizmat (zaxira nusxa yoqilgan). Migratsiyalar server ishga tushganda o'zi bajariladi (`server/migrations`).
- **Veb mijoz** (Expo web) va **admin panel** (Vite) — statik fayllar (Cloudflare Pages / Netlify / S3+CDN).
- TLS (wss://, https://) hosting/ingress darajasida.

## Muhit o'zgaruvchilari (server) — qiymatlarni faqat hosting panelida kiriting
| O'zgaruvchi | Vazifa |
|---|---|
| `NODE_ENV=production` | haqiqiy autentifikatsiya talab qilinadi (hozir yo'q — qarang pastda) |
| `DATABASE_URL` | PostgreSQL ulanishi |
| `CORS_ORIGINS` | veb mijoz va admin originlari (vergul bilan) |
| `ADMIN_TOKENS` | vaqtinchalik admin tokenlari (JSON); SSO/2FA ulangach o'chiriladi |
| `METRICS_TOKEN` | `/metrics` uchun (o'rnatilmasa o'chirilgan) |
| `LOG_LEVEL`, `ROOM_IDLE_MINUTES`, `WS_CONNECT_RATE`, `WS_CONNECT_BURST` | ixtiyoriy sozlamalar |

Konteyner sog'liq tekshiruvi: `GET /ready` (200 = server va baza ishlayapti).

## Mijoz va admin build
```bash
EXPO_PUBLIC_SERVER_URL=wss://api.example.uz pnpm --filter @poyga/client export:web     # client/dist
VITE_API_URL=https://api.example.uz pnpm --filter @poyga/admin build                    # admin/dist
```

## Yopiq sinov (staging) — hozirgi tavsiya
`NODE_ENV=production` hozir **ishga tushmaydi** (haqiqiy kirish yo'q, `server/src/app.ts`). Yopiq sinov uchun `NODE_ENV=staging` va tarmoq darajasida kirishni cheklang (hosting'ning parol/IP himoyasi), ommaga ochmang: hozirgi kirish istalgan ID ni qabul qiladi.

## Ommaviy ishga tushirishdan oldin (to'siqlar)
1. Haqiqiy kirish: SMS / Google / Apple (`Authenticate` interfeysi tayyor, xizmat va kalitlar kerak).
2. Mustaqil xavfsizlik sinovi, yuridik masalalar (16 yosh, ma'lumot joylashuvi, o'chirish).
3. Prototipning qolgan ekranlari, karta rasmlari, ochiq qoidalar (`docs/OPEN_QUESTIONS.md`).
4. Monitoring: `docs/ops/alerts.yml`, `docs/ops/RUNBOOK.md`.
