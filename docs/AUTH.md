# Kirish (SMS bir martalik kod)

## Qanday ishlaydi
1. Mijoz telefon raqamini yuboradi: `POST /auth/sms/request {phone}` → server 6 xonali kod yuboradi (5 daqiqa amal qiladi).
2. Mijoz kodni yuboradi: `POST /auth/sms/verify {phone, code}` → `{token, userId}`.
3. Token (30 kun, HMAC bilan imzolangan) `localStorage` da saqlanadi; HTTP'da `Authorization: Bearer`, WebSocket'da `?token=`.
4. `userId` telefondan HMAC bilan hosil qilinadi (`p` + 20 hex): **telefon raqamining o'zi serverda saqlanmaydi** (maxfiylik; hisobni o'chirish talabi oson). Shu raqam bilan qayta kirilsa, o'sha hisob qaytadi.

## Himoya
- Kod faqat xesh (SHA-256 + maxfiy kalit) ko'rinishida xotirada; 5 noto'g'ri urinishdan keyin bekor; bir marta ishlaydi.
- Bir raqamga: 1 daqiqada 1 ta, 1 soatda 5 ta SMS. IP bo'yicha: ~10 so'rov/daqiqa (`TRUST_PROXY=1` bilan haqiqiy IP).
- Token imzosi doimiy vaqtli solishtiriladi; muddat va ID formati tekshiriladi.
- `NODE_ENV=production` da `AUTH_SECRET` majburiy, `SMS_PROVIDER=console` ruxsat etilmaydi.

## Ulash
1. `.env` da `AUTH_SECRET` (32+ belgi) va SMS shlyuz (`SMS_HTTP_URL`, `SMS_HTTP_TOKEN`) ni kiriting.
2. Provayder API'si `{to,text}` + Bearer ga mos kelmasa, `server/src/auth.ts` da `SmsSender` interfeysini amalga oshiruvchi kichik sinf yoziladi (`send(phone, text)`), `main.ts` da tanlanadi. Provayder tanlangach shuni men yozaman.
3. Staging'da sinash uchun: `SMS_PROVIDER=console` — kod server jurnalida (`docker compose logs server`) ko'rinadi.

## Google / Apple (server tomoni tayyor)
`POST /auth/google` va `POST /auth/apple` `{idToken}` qabul qiladi: RS256 imzo (provayder JWKS, 1 soat kesh, kalit aylansa qayta yuklanadi), emitent, auditoriya (client ID), muddat tekshiriladi; `alg=none/HS256` rad etiladi. Natija — o'sha sessiya tokeni (`userId` = `g…`/`a…` + HMAC(sub)). `.env`: `GOOGLE_CLIENT_IDS` (vergul bilan, web/Android/iOS), `APPLE_CLIENT_ID`. Testlar mahalliy RSA kalit bilan (`oidc.test.ts`).

## Hali yo'q
- Google/Apple **mijoz tomoni** (tugmalar): `expo-auth-session` / Apple Sign In uchun provayder konsolida ilova yaratilib client ID'lar olinishi kerak. Server tayyor, mijozga faqat `idToken` olib `/auth/google` ga yuborish qoladi.
- Sessiyani bekor qilish ro'yxati (hozircha `AUTH_SECRET` almashtirish hamma sessiyani bekor qiladi).
- Telefon raqami egaligi uchun SMS xarajati/spam monitoringi: `poyga_rate_limited_total{scope="auth"}` ko'rsatkichi bor.
