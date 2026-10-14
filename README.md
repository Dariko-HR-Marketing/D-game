# POYGA onlayn

Stol o'yinining onlayn versiyasi (moliyaviy savodxonlik). To'liq spetsifikatsiya: [`docs/SPEC.md`](docs/SPEC.md). Ochiq savollar va qabul qilingan taxminlar: [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md). **Qabul qilingan qarorlar jurnali (qanday o'zgartirish bilan): [`docs/DECISIONS_NEEDED.md`](docs/DECISIONS_NEEDED.md).**

## Tuzilma (pnpm monorepo, TypeScript)
| Paket | Vazifa |
|---|---|
| `rules` | Qoidalar dvigateli: sof funksiyalar, UI va tarmoqsiz. O'yin natijasi faqat shu yerda hisoblanadi |
| `content` | Kartalar, kasblar, orzular (JSON), Zod sxemasi, har bir kartaning tipli ta'siri |
| `server` | Fastify + WebSocket: xonalar, taymerlar, qayta ulanish, o'yin jurnali, profil, admin API, PostgreSQL |
| `client` | Expo (React Native + veb): bosh sahifa, xona, o'yin, profil, reyting |
| `admin` | Veb-panel (Vite + React): kontent versiyalari, foydalanuvchi, shikoyat, jurnal, analitika |

## Ishga tushirish
```bash
pnpm install
docker compose up -d db                      # yoki o'zingizning PostgreSQL (mahalliy ishlab chiqish)
cp .env.example .env                         # qiymatlarni to'ldiring
cd server && DATABASE_URL=... npx tsx src/main.ts      # DATABASE_URL bo'lmasa xotira saqlagichi
cd client && npx expo start --web            # veb mijoz
cd admin && npx vite                         # admin panel
```
Tekshiruvlar: `pnpm typecheck && pnpm test`. PostgreSQL testlari `TEST_DATABASE_URL` berilganda ishlaydi (aks holda o'tkazib yuboriladi).

## Muhim tamoyillar
- Server — holatning yagona manbai; tasodifiylik serverda (urug' o'yin jurnaliga yoziladi, jurnaldan o'yin to'liq qayta tiklanadi).
- Mijozdan kelgan har bir xabar qat'iy sxema (`server/src/protocol.ts`) va qoidalar dvigateli tekshiruvidan o'tadi.
- Matnlar kodda emas: `client/src/i18n/uz.ts`. Narxlar va ball qiymatlari konfiguratsiyada bo'sh (SPEC §2.4).
- Kontent versiyalanadi; o'yin boshlanganda versiya qulflanadi.

## Qulaylik (WCAG 2.2 AA, §10, §13)
- Kontrast va tugma o'lchami birlik testlarda (`client/src/a11y.test.ts`); "harakatni kamaytirish" sozlamasiga bo'ysunadi (`client/src/motion.ts`).
- Avtomatik brauzer tekshiruvi (axe-core, telefon/planshet/kompyuter, 7 ekran): `pnpm --filter @poyga/client export:web`, `cd client/dist && python3 -m http.server 8081`, keyin `cd server && pnpm a11y`. Oxirgi natija: buzilish yo'q.
- Avtomatik tekshiruv hamma muammoni ushlamaydi: ekran o'quvchi (VoiceOver/TalkBack) va klaviatura bilan qo'lda sinov hali o'tkazilmagan.

## Joylashtirish
Bitta VPS'da Docker Compose: [`docs/SERVER.md`](docs/SERVER.md) (qanday server olish, o'rnatish, zaxira) va [`docs/DEPLOY.md`](docs/DEPLOY.md).
