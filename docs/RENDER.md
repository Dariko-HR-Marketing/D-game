# Render'ga joylashtirish — batafsil qo'llanma

Maqsad: **yopiq sinov (staging)** muhitini Render'da ishga tushirish: server (Docker) + PostgreSQL + veb mijoz + admin panel.
Vaqt: taxminan 30–40 daqiqa. Hisob/to'lov/maxfiy qiymatlar faqat sizning qo'lingizda.

> **Muhim ogohlantirish.** Haqiqiy kirish (SMS/Google/Apple) hali yo'q: server hozir istalgan ID bilan kirishni qabul qiladi. Shuning uchun bu **ommaga e'lon qilinmaydigan** sinov muhiti. Render bepul/oddiy rejalarda parol bilan yopish imkonini bermaydi — havolani faqat sinovchilarga bering. `NODE_ENV=production` haqiqiy kirish ulanmaguncha ataylab ishga tushmaydi, shuning uchun hozir `NODE_ENV=staging`.

## 0. Nima kerak
- Render hisobi (https://render.com) va GitHub hisobingiz ulangan bo'lishi (Render → Account Settings → GitHub → Dariko-HR-Marketing tashkilotiga ruxsat bering).
- Repo: `Dariko-HR-Marketing/D-game` (shox: `main`).
- Pullik reja: o'yin serveri uchun **bepul reja yaramaydi** (15 daqiqa harakatsizlikdan keyin uxlaydi, WebSocket'lar uziladi). Bepul PostgreSQL esa cheklangan muddatdan keyin o'chadi. Hozirgi tariflar va narxlarni Render sahifasidan tekshiring.

## 1-usul (tavsiya): Blueprint (`render.yaml`) bilan
1. Render Dashboard → **New +** → **Blueprint**.
2. Repo'ni tanlang (`D-game`), shox `main`. Render `render.yaml` ni o'qiydi va 4 ta resurs ko'rsatadi: `poyga-db`, `poyga-server`, `poyga-client`, `poyga-admin`.
3. Rejalarni tekshiring (`plan:` qatorlari): server — pullik (`starter` yoki undan yuqori), baza — doimiy ish uchun pullik. Xato chiqsa Render aniq qatorni ko'rsatadi, `render.yaml` ni tahrirlab qayta urining.
4. Render maxfiy qiymatlarni so'raydi (`sync: false` bo'lganlari). **Hozircha vaqtinchalik kiriting** (4-qadamda to'g'rilanadi):
   - `CORS_ORIGINS` — vaqtincha `https://example.com`
   - `ADMIN_TOKENS` — `{"UZUN-TASODIFIY-TOKEN":{"id":"root","role":"administrator"}}` (tokenni o'zingiz o'ylab toping: 32+ belgi; parol menejeri bilan yarating; kodga yoki chatga yozmang)
   - `EXPO_PUBLIC_SERVER_URL` — vaqtincha `wss://example.com`
   - `VITE_API_URL` — vaqtincha `https://example.com`
5. **Apply** bosing. Birinchi build 5–10 daqiqa oladi.

## 2-usul: qo'lda (Blueprint ishlamasa)
1. **PostgreSQL:** New + → PostgreSQL. Name `poyga-db`, Database `poyga`, User `poyga`, versiya 16, region'ni o'zingizga yaqin tanlang (serverniki bilan **bir xil**), reja tanlang → Create. Tayyor bo'lgach **Internal Database URL** ni nusxalang.
2. **Server:** New + → Web Service → repo → **Language: Docker** (Render `Dockerfile` ni topadi). Region — bazaniki bilan bir xil. Instance Type — pullik. **Health Check Path:** `/ready`. Environment:
   | Kalit | Qiymat |
   |---|---|
   | `NODE_ENV` | `staging` |
   | `DATABASE_URL` | bazaning **Internal** URL i |
   | `CORS_ORIGINS` | (4-qadamda to'ldiriladi) |
   | `ADMIN_TOKENS` | `{"TOKEN":{"id":"root","role":"administrator"}}` |
   | `METRICS_TOKEN` | uzun tasodifiy satr |
   | `LOG_LEVEL` | `info` |
   `PORT` ni **kiritmang** — Render o'zi beradi, server uni o'qiydi.
3. **Veb mijoz:** New + → Static Site → repo. Build Command: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @poyga/client export:web`. Publish Directory: `client/dist`. Env: `NODE_VERSION=22`, `EXPO_PUBLIC_SERVER_URL=wss://<server-nomi>.onrender.com`. **Redirects/Rewrites:** `/*` → `/index.html` (Rewrite).
4. **Admin:** New + → Static Site → Build: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @poyga/admin build`. Publish: `admin/dist`. Env: `NODE_VERSION=22`, `VITE_API_URL=https://<server-nomi>.onrender.com`. Rewrite `/*` → `/index.html`.

## 3. Birinchi ishga tushirishni tekshirish
1. Server **Logs**: `tiklangan o'yinlar: 0` va `Server listening` qatorlari chiqishi kerak. Migratsiyalar o'zi bajariladi.
2. Brauzerda `https://<server>.onrender.com/ready` → `{"ready":true}`.
   - `503` → `DATABASE_URL` noto'g'ri yoki baza tayyor emas.
   - Deploy "Exited" → Logs'ni o'qing (pastdagi jadvalga qarang).
3. Metrikalar: `curl -H "Authorization: Bearer <METRICS_TOKEN>" https://<server>.onrender.com/metrics`.

## 4. Manzillarni bir-biriga ulash (eng ko'p xato shu yerda)
Static saytlar **build vaqtida** server manzilini o'zlariga "pishirib" oladi, server esa CORS bo'yicha ularning manzilini bilishi kerak. Ketma-ketlik:
1. Uchala xizmatning haqiqiy manzillarini yozib oling (`poyga-server.onrender.com`, `poyga-client.onrender.com`, `poyga-admin.onrender.com`; nomlar band bo'lsa Render qo'shimcha qo'shadi).
2. **Serverda** `CORS_ORIGINS` = `https://poyga-client.onrender.com,https://poyga-admin.onrender.com` (probelsiz, oxirida `/` siz). Saqlang — server qayta ishga tushadi.
3. **Veb mijozda** `EXPO_PUBLIC_SERVER_URL` = `wss://poyga-server.onrender.com` (**wss**, ws emas). → **Manual Deploy → Clear build cache & deploy** (qiymat build vaqtida kiradi, oddiy qayta ishga tushirish yetmaydi; `export:web` skripti Metro keshini o'zi tozalaydi, aks holda eski `ws://localhost:3000` qolib ketishi mumkin edi — buni sinov aniqladi).
4. **Adminda** `VITE_API_URL` = `https://poyga-server.onrender.com` → xuddi shunday qayta build.

## 5. Sinov
1. Mijoz manzilini oching → "Xona yaratish" → kod chiqadi.
2. Boshqa brauzer (yoki inkognito/telefon) → "Kod bilan qo'shilish" → o'yinni boshlang, bir necha navbat o'ynang.
3. Admin manzilini oching → `ADMIN_TOKENS` dagi tokenni kiriting → Xonalar, Kontent, Jurnal ko'rinishi kerak.
4. Servisni qayta ishga tushiring (Manual Deploy → Restart): faol o'yin bazadan tiklanishi kerak (Logs: `tiklangan o'yinlar: 1`), o'yinchilar qayta ulanganda o'yin davom etadi.

## 6. Kundalik ish
- **Yangilash:** `main` ga push → `autoDeploy` o'zi qayta quradi. Docker image'ni CI ham tekshiradi.
- **Orqaga qaytarish:** Server → Events/Deploys → oldingi muvaffaqiyatli deploy → **Rollback**. Kontent o'zgarishini admin panelda "Nashr qilish" bilan qaytarasiz.
- **Jurnal:** Server → Logs (JSON, token/IP yozilmaydi). Ogohlantirish qoidalari: `docs/ops/alerts.yml`, qo'llanma: `docs/ops/RUNBOOK.md`.
- **Zaxira:** Render PostgreSQL zaxira nusxalari reja bo'yicha farq qiladi — hozirgi imkoniyatlarni panelda tekshiring; qo'shimcha `pg_dump` ni ham ko'rib chiqing.
- **Maxsus domen:** Service → Settings → Custom Domains. Domen o'zgarsa `CORS_ORIGINS` va static saytlarning env'larini yangilab qayta quring.

## Muammolar jadvali
| Belgi | Sabab | Yechim |
|---|---|---|
| Deploy darhol "Exited", logda `production: haqiqiy autentifikatsiya…` | `NODE_ENV=production` | `NODE_ENV=staging` qo'ying (haqiqiy kirish ulangach production'ga o'tiladi) |
| Mijoz "Ulanmoqda…" da qotib turadi | `EXPO_PUBLIC_SERVER_URL` noto'g'ri yoki `ws://`; yoki o'zgargandan keyin qayta build qilinmagan | `wss://…` + cache tozalab qayta deploy |
| Brauzer konsolida CORS xatosi | `CORS_ORIGINS` da mijoz/admin manzili yo'q yoki oxirida `/` bor | Aniq originlarni vergul bilan, probelsiz kiriting |
| Admin panel "Token noto'g'ri" | `ADMIN_TOKENS` noto'g'ri JSON, yoki `VITE_API_URL` noto'g'ri | JSON'ni tekshiring; admin'ni qayta quring |
| `/ready` 503 | baza ishlamayapti yoki URL noto'g'ri | **Internal** URL ishlating (server va baza bir regionda) |
| Baza tashqi URL bilan ulanmayapti | tashqi ulanish SSL talab qiladi | URL oxiriga `?sslmode=require` qo'shing (ichki URL uchun kerak emas) |
| 429 (`rate_limited`) | bir IP dan juda ko'p ulanish (maktab/ofis) | `WS_CONNECT_RATE` / `WS_CONNECT_BURST` ni oshiring |
| Tez-tez "Ulanmoqda…" va o'yin uziladi | bepul reja uxlab qoladi; yoki instansiya xotirasi yetmaydi | pullik reja; Metrics'da `poyga_process_resident_bytes` ni kuzating |
| Static sayt build "pnpm: command not found" | `corepack enable` unutilgan | Build Command boshiga `corepack enable &&` qo'shing |

## Ommaviy ishga tushirishdan oldin (hali bajarilmagan)
Haqiqiy kirish (SMS/Google/Apple), mustaqil xavfsizlik sinovi, yuridik masalalar, qolgan ekranlar va karta rasmlari, ochiq qoidalar — `docs/DEPLOY.md` va `docs/OPEN_QUESTIONS.md`.
