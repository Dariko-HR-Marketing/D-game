# Ochiq savollar va qabul qilingan taxminlar

Buyurtmachi qarori kerak (SPEC §16): 4 ta yangi kasb; narxlar; §5.6 "tasdiq kutilmoqda" qoidalari; 6 soatlik vaqt rejimi; V katagi (DICE); yurist masalalari; dizayner materiallari; muddat/byudjet; KV2-012 "ikki xonali"; korxona nomi.

## Muhandislik taxminlari (konfiguratsiyada, o'zgartirish oson)
1. Bank limiti 10 000 — jami bank qarziga qo'llanadi (SPEC "jami"/"bir martalik" aytmaydi).
2. Bank to'lovi yaxlitlanmaydi (yaxlitlash qoidasi berilmagan).
3. Karta rejimi: xarajat (xar, kxar, hod), bozor "majburiy/daromad/xarajat" va yangi IJR/TOSH/Q — majburiy; sotib olish/sotish/aksiya/TD/QAR/MO/XAY/SUG — ixtiyoriy (§5.2).
4. TD ("foydali ish, bir martalik daromad") ixtiyoriy deb olindi.
5. Kichik aylana `Q` kartasi "qarzga so'rayapti" — qarz so'rovi (qaytarish 600); boshqa ikkita `Q` — kolleksiya sotib olish.
6. `real: "?"` (17 ta) — bozor qiymati noma'lum, `null` saqlanadi; shu mulk uchun bozor kartasi narxi ishlatiladi.
7. Xarajat kartasidagi "A + B" yozuvi `amount` yig'indisi bilan tekshirildi (testda).
