# Kirish (SMS bir martalik kod)

## Qanday ishlaydi
1. Mijoz telefon raqamini yuboradi: `POST /auth/sms/request {phone}` → server 6 xonali kod yuboradi (5 daqiqa amal qiladi).
2. Mijoz kodni yuboradi: `POST /auth/sms/verify {phone, code}` → `{token, userId}`.
3. Token (30 kun, HMAC bilan imzolangan) `localStorage` da saqlanadi; HTTP'da `Authorization: Bearer`, WebSocket'da `?token=`.
4. `userId` telefondan HMAC bilan hosil qilinadi (`p` + 20 hex): **telefon raqamining o'zi serverda saqlanmaydi** (maxfiylik; hisobni o'chirish talabi oson). Shu raqam bilan qayta kirilsa, o'sha hisob qaytadi.

## Himoya (mustaqil xavfsizlik ko'rigidan keyin)
- **SMS chegarasi** joy oldindan band qilinadi: parallel so'rovlar chetlab o'tolmaydi; shlyuz xatosi ham hisoblanadi; shlyuzga so'rov 8 s da to'xtatiladi.
- **Kodni taxmin qilish:** noto'g'ri urinishlar *raqam bo'yicha* sanaladi va yangi kod so'rash bilan nolga tushmaydi; 5 xatodan keyin raqam 15 daqiqa bloklanadi. Begona so'rov foydalanuvchining olgan kodini bekor qilmaydi (oxirgi amaldagi kod yaroqli qoladi).
- **Sessiya bekor qilish:** token berilgan vaqtni (`iat`) tashiydi; `POST /auth/logout` va hisobni o'chirish shu vaqtgacha berilgan tokenlarni yaroqsiz qiladi. Ro'yxat xotirada (server qayta ishga tushsa tozalanadi); taqiq esa alohida saqlanadi va har ulanishda tekshiriladi. Hamma sessiyani darrov bekor qilish: `AUTH_SECRET` ni almashtirish.
- **IP bo'yicha cheklov:** IPv6 /64 ga jamlanadi, chelaklar LRU bilan almashadi; `TRUST_PROXY=1` faqat private tarmoqdagi proksiga ishonadi.
- **JWKS:** noma'lum `kid` bilan majburiy yangilash daqiqasiga bir marta, bir vaqtdagi so'rovlar birlashtiriladi, yuklab bo'lmasa eski kalitlar ishlaydi.
- `ConsoleSms` production'da yaratilmaydi; `SMS_HTTP_TOKEN` bo'sh bo'lsa server ishga tushmaydi.

### Ma'lum cheklovlar (qabul qilingan xavf)
- Veb mijozda token `localStorage` da (XSS bo'lsa o'qiladi) va WebSocket URL'ida uzatiladi; server jurnali uni yozmaydi, lekin oraliq proksilar yozishi mumkin. HttpOnly cookie/subprotocol — keyingi bosqich. CSP sarlavhasi Expo veb eksporti bilan sinab qo'shilishi kerak.
- Google/Apple: `nonce` hali yo'q (mijoz tomoni qurilganda qo'shiladi); ID token 1 soat ichida qayta ishlatilishi mumkin.
- Bir NAT ortidagi ko'p foydalanuvchi (maktab) uchun IP chegarasi 10 so'rov/daqiqa — kerak bo'lsa `authLimit` oshiriladi.

## Himoya (asosiy)
- Kod faqat xesh (SHA-256 + maxfiy kalit) ko'rinishida xotirada; 5 noto'g'ri urinishdan keyin bekor; bir marta ishlaydi.
- Bir raqamga: 1 daqiqada 1 ta, 1 soatda 5 ta SMS. IP bo'yicha: ~10 so'rov/daqiqa (`TRUST_PROXY=1` bilan haqiqiy IP).
- Token imzosi doimiy vaqtli solishtiriladi; muddat va ID formati tekshiriladi.
- `NODE_ENV=production` da `AUTH_SECRET` majburiy, `SMS_PROVIDER=console` ruxsat etilmaydi.

## Ulash
1. `.env` da `AUTH_SECRET` (32+ belgi) va SMS shlyuz (`SMS_HTTP_URL`, `SMS_HTTP_TOKEN`) ni kiriting.
1a. **Eskiz:** `SMS_PROVIDER=eskiz`, `ESKIZ_EMAIL`, `ESKIZ_PASSWORD` (Eskiz «SMS shlyuz» sahifasidagi yashirin kalit), `ESKIZ_FROM` (standart `4546` — Eskiz sinov jo'natuvchisi). Adapter `EskizSms` (`server/src/auth.ts`): login → token xotirada, 401 da qayta kirish. Eskiz sinov rejimida faqat tasdiqlangan shablon matnlari o'tadi; ishlab chiqarishda jo'natuvchi nomi va matn shablonlari Eskiz tomonidan tasdiqlanishi kerak.
2. Boshqa provayder API'si `{to,text}` + Bearer ga mos kelmasa, `server/src/auth.ts` da `SmsSender` interfeysini amalga oshiruvchi kichik sinf yoziladi (`send(phone, text)`), `main.ts` da tanlanadi. Provayder tanlangach shuni men yozaman.
3. Staging'da sinash uchun: `SMS_PROVIDER=console` — kod server jurnalida (`docker compose logs server`) ko'rinadi.

## Google / Apple (server tomoni tayyor)
`POST /auth/google` va `POST /auth/apple` `{idToken}` qabul qiladi: RS256 imzo (provayder JWKS, 1 soat kesh, kalit aylansa qayta yuklanadi), emitent, auditoriya (client ID), muddat tekshiriladi; `alg=none/HS256` rad etiladi. Natija — o'sha sessiya tokeni (`userId` = `g…`/`a…` + HMAC(sub)). `.env`: `GOOGLE_CLIENT_IDS` (vergul bilan, web/Android/iOS), `APPLE_CLIENT_ID`. Testlar mahalliy RSA kalit bilan (`oidc.test.ts`).

## Hali yo'q
- Google/Apple **mijoz tomoni** (tugmalar): `expo-auth-session` / Apple Sign In uchun provayder konsolida ilova yaratilib client ID'lar olinishi kerak. Server tayyor, mijozga faqat `idToken` olib `/auth/google` ga yuborish qoladi.
- Sessiyani bekor qilish ro'yxati (hozircha `AUTH_SECRET` almashtirish hamma sessiyani bekor qiladi).
- Telefon raqami egaligi uchun SMS xarajati/spam monitoringi: `poyga_rate_limited_total{scope="auth"}` ko'rsatkichi bor.
