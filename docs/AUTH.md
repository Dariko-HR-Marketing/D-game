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

## Hali yo'q
- Google/Apple bilan kirish: `Authenticate` interfeysi tayyor, provayder (OAuth client ID) kelgach qo'shiladi.
- Sessiyani bekor qilish ro'yxati (hozircha `AUTH_SECRET` almashtirish hamma sessiyani bekor qiladi).
- Telefon raqami egaligi uchun SMS xarajati/spam monitoringi: `poyga_rate_limited_total{scope="auth"}` ko'rsatkichi bor.
