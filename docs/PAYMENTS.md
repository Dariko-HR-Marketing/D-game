# Karta orqali to'lov (Payme, Click)

Holat: **server tomoni va mijoz tayyor, provayder sinov muhitida (sandbox) hali SINALMAGAN, kalitlar berilmagan** (`server/src/payments.ts`, testlar `payments.test.ts`).
Faqat karta: Humo, Uzcard va korporativ karta provayder to'lov oynasida; hisob-faktura va bank o'tkazmasi yo'q (buyurtmachi qarori 2026-11-21).

## Yoqish
`.env` ga (qiymatlarni provayder kabinetidan oling, repoga yozmang):
- Payme: `PAYME_MERCHANT_ID`, `PAYME_KEY`
- Click: `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY`
- `PAY_RETURN_URL` (to'lovdan keyin qaytish; standart `PUBLIC_URL`)

Berilgan provayderlar `/shop` katalogida `providers` ro'yxatida chiqadi; mijozda «Paketlar → Sotib olish» oynasi ularni ko'rsatadi. Hech biri berilmasa production'da to'lov yo'q.

## Provayder kabinetiga kiritiladigan manzillar
| Provayder | Manzil | Autentifikatsiya |
|---|---|---|
| Payme (Merchant API, JSON-RPC) | `POST https://<API_DOMAIN>/pay/payme` | `Authorization: Basic base64("Paycom:" + PAYME_KEY)` |
| Click Prepare / Complete | `POST https://<API_DOMAIN>/pay/click/prepare` va `/pay/click/complete` (bittasi `/pay/click`) | `sign_string = md5(...)` (SECRET_KEY bilan), `service_id` mosligi |

## Qanday ishlaydi
1. Mijoz `POST /shop/order {sku, provider}` → server buyurtma yaratadi, provayder to'lov oynasi manzilini qaytaradi (`order.checkout`).
2. Foydalanuvchi provayder oynasida to'laydi. Provayder serverimizni chaqiradi: Payme — `CheckPerformTransaction`, `CreateTransaction`, `PerformTransaction`, `CancelTransaction`, `CheckTransaction`, `GetStatement`; Click — Prepare (action=0) va Complete (action=1).
3. Summa va buyurtma tekshiriladi, tasdiqda `commerce.confirmPaid` huquq beradi (Plus muddati). Takroriy chaqiruv ikki marta huquq bermaydi.
4. Qaytarish: Payme `CancelTransaction` (bajarilgan tranzaksiya) → `commerce.refund` → huquq bekor.
5. Summa: so'mda saqlanadi; Payme tiyinda (×100) yuboradi. Payme tranzaksiyasi 12 soatdan keyin bekor bo'ladi (sabab 4).

## Sandbox tekshiruv ro'yxati (kalitlar kelgach)
- [ ] Payme sandbox: har metod uchun javob kodlari (-31001, -31003, -31007, -31008, -31050, -31099) provayder hujjatiga mos.
- [ ] Click: `error`/`error_note` kodlari va `merchant_prepare_id`/`merchant_confirm_id` maydonlari hujjatga mos.
- [ ] Provayder shartnomasida takroriy (avtomatik) to'lov va fiskal chek talablari aniqlansin.
- [ ] Karta bo'yicha bir martalik to'lov chegarasi (Humo/Uzcard) tekshirilsin.
- [ ] Ikki xil provayderda bir buyurtmaga ikki marta to'lov bo'lmasligi sinab ko'rilsin.

## Hali yo'q
- Host-pass, sinf paketi va korporativ paketlar uchun SKU va huquqlar (hozir faqat Plus va kosmetika). Narxlar ham kiritilmagan.
- Telefon tasdig'i buyurtma uchun hali majburiy (`phone_required`): SMS yoqilguncha to'lov Google/email hisoblari uchun yopiq.
- Takroriy (avtomatik) to'lov: Plus muddati oldindan to'lanadi.

## To'lov oqimi UX (2026-11-24)
Mijozda «To'lash» buyurtma yaratadi va **kuzatuv oynasi** (`OrderTracker`) ochiladi: «To'lov oynasini ochish» (yangi oynada), har 3 soniyada holat so'raladi (`GET /shop/orders/:id`), to'lov qabul qilinsa «To'lov qabul qilindi», ota-ona tasdig'i kerak bo'lsa shu aytiladi (SMS ni qayta yuborish), «Holatni tekshirish» va «Buyurtmani bekor qilish». Provayder qaytarish manzili `?tolov=<buyurtma>` bilan keladi: mijoz shu buyurtma holatini ko'rsatadi (`PayResult`). Paketlar sahifasida «Buyurtmalarim». Tekshiruv: `server/scripts/pay-check.ts` (soxta provayder; haqiqiy Payme/Click sandbox'i bilan hali sinalmagan). **Real provayderda sinalishi kerak:** qaytarish manzili (Payme `c=`, Click `return_url`) va `PAY_RETURN_URL`.



## Click hujjati bo'yicha tekshiruv (docs.click.uz, 2026-11-26)
Hujjatning SHOP API (`/shop-api/requests`, `/shop-api/errors`) va to'lov tugmasi (`/click-button`) bo'limlari bilan solishtirildi:
- Imzo: Prepare — `md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)`; Complete — `merchant_prepare_id` `merchant_trans_id` dan keyin qo'shiladi. Kodda shunday (`ClickMerchant.signOk`).
- Xato kodlari `0…-9` va matnlari hujjatga mos; Complete'da to'langan tranzaksiya `-4`, bekor qilingan `-9`; Click manfiy `error` yuborsa tranzaksiya bekor qilinib `-9` qaytadi.
- To'lov havolasi: `https://my.click.uz/services/pay/?service_id&merchant_id&amount&transaction_param&return_url`. **Tuzatildi:** `amount` endi `N.NN` formatida (`9000.00`); `transaction_param` = buyurtma ID (`merchant_trans_id`). Ixtiyoriy `merchant_user_id` va `card_type` (uzcard/humo) yuborilmaydi.
- **Hali yo'q (qaror/ma'lumot kerak):** (a) *Fiskalizatsiya* (Merchant API `payment/ofd_data/submit_items` va `submit_qrcode`, `Auth: merchant_user_id:sha1(timestamp+secret):timestamp`): har bir pozitsiya uchun IKPU kodi, o'ram kodi, QQS foizi va summasi, tashkilot STIR/JSHSHIR kerak — bular bizda yo'q, taxmin qilinmaydi. (b) *Qaytarish* (`payment/reversal`): Complete'dan keyin xizmat berib bo'lmasa to'lovni qaytarish — hozir qo'lda admin orqali. (c) Click shartnomasi: `service_id`, `merchant_id`, `merchant_user_id`, `SECRET_KEY`.
