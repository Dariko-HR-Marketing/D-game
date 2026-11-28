# ISH HOLATI (2026-11-28)

Bu hujjat joriy haqiqiy holatni ko'rsatadi: nima bajarilgan va jonli, nima qolgan, nima sizdan kutilmoqda. Tafsilot: [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) (236–256), [SPEC.md](SPEC.md) («Buyurtmachi qarorlari 2026-11-27/28»), server uchun: [OVOZ_VA_SOZLAMALAR.md](OVOZ_VA_SOZLAMALAR.md).

## ✅ Bajarilgan va jonli (PR #95–#111)
| Mavzu | Natija |
|---|---|
| Bozor narxi | Yer sotixi bo'yicha to'g'ri hisob, hisob qatori; faol ta'sir aktivga olishdan 12 oy oldingi va keyingi bo'lsagina tegadi |
| Oferta | Faqat ro'yxatdan o'tishda, bir marta; Google tugmasi belgidan keyin va belgisiz o'chiq |
| Orzu | Faqat o'z orzusi turgan katakda g'alaba; 14 «O» katagiga orzular serverda joylashadi; katak bosilsa ma'lumot |
| Qatlamlar | Kubik tugmasi oldinda; bozor taklifi 15 s da yopiladi; boshqa o'yinchi kubigi kartani to'smaydi |
| Auksion | Ochilmaslik sababi tugma yonida yoziladi |
| Sarlavha | Hamma qurilmada bir xil; «N-tur» izohi; o'yin ichida ijtimoiy tarmoqlar |
| Voqealar | Kubik, har naqd o'zgarishi, 40 voqeali aylantiriladigan ro'yxat |
| Qarz | 4 oy muddat, bekor qilish, «Guvohman», beruvchiga qarzdor limiti |
| Moliya | Akkordion bloklar; bank/qarz limiti o'lchagichi; lombard va sheriklik ulush chizig'i |
| Dizayn | Premium a'zolik kartalari; Qoidalar «O'yin yo'li»; Klub diagrammasi; Reyting; Plus narxi xabari |
| Hujjat | SPEC qarorlari; server ko'rsatmasi; reaksiyalar olib tashlandi |

## 🟡 Ko'rilmagan/sinalmagan joylar
- «O'zaro qarz» bloki va yangi o'lchagichlar 5+ o'yinchili haqiqiy o'yinda ko'z bilan tekshirilmagan (skript 2 kishilik).
- Auksion va kubik tugmasi sizning qurilmangizda tekshirilsin.

## 🔲 Qolgan (men qila oladiganlar, alohida qaror/«boshla» bilan)
- Telefon ilovasida (iOS/Android) ovoz: `react-native-webrtc` (katta ish).
- Tik planshet ikki ustunli tartib; 2560+ ekranda ish yuzasi.
- Qo'lda qulaylik tekshiruvi (VoiceOver/TalkBack, 200 % masshtab).
- Hamkorlik qarzida «Ishonchsiz» belgisi (SPEC «tasdiq kutilmoqda»).
- Telefon raqam formati bilan kirish (SPEC OQ 174).
- Moliya bo'limida lombard/sheriklik/aktiv sotish uchun qo'shimcha animatsiyalar.

## ⛔ Sizdan kutilmoqda
1. **Ovoz (TURN):** VPS portlari (3478 udp/tcp, 49152–49452 udp) va `enable-turn.sh`.
2. **Telegram obuna:** `.env` ga bot/kanal sozlamalari; `GATE_TG_GROUP` yoki `GATE_TG_GROUP_URL`; `GATE_FB_URL`.
3. **`SOCIAL_STAR_XP`:** raqamni siz belgilaysiz.
4. **Oferta imzosi:** hujjatlardagi «Loyiha» belgisini olib tashlash (yurist tasdiqlagan, imzo keyin).
5. **Keyinroq:** Instagram, YouTube, Eskiz, Payme/Click kalitlari; Google/email; reklama video qarori; turnirlar savollari; SPEC §16 qarorlari (4 kasb narxi va boshqalar).
