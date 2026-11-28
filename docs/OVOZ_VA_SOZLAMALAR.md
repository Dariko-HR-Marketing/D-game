# Serverda bajariladigan ishlar: ovozli aloqa va obuna sozlamalari

Hamma buyruq serverda (SSH, `root`) bajariladi. Maxfiy qiymatlar **faqat serverdagi `/opt/tajriba24/deploy/vps/.env` faylida** turadi; chatga, repoga va GitHub'ga yozilmaydi. Kod yangilanishi esa o'zi (GitHub Actions deploy) keladi, uni qo'lda qilish shart emas.

## 1. Ovozli aloqa (TURN)

Nega kerak: ovoz brauzerlar orasida to'g'ridan-to'g'ri ulanadi. Telefon tarmog'i yoki korporativ tarmoq orqasidagi o'yinchilar uchun aloqa TURN serveri orqali o'tishi kerak. Hozir TURN yoqilmagan, shuning uchun ba'zi o'yinchilar bir-birini eshitmaydi.

### 1.1. Portlarni VPS panelida oching (bir marta)
VPS provayderingizning xavfsizlik devori (firewall) panelida kiruvchi ruxsat qo'shing:

| Port | Protokol | Nima uchun |
|---|---|---|
| 3478 | UDP va TCP | TURN asosiy |
| 49152–49452 | UDP | TURN relay oralig'i |
| 5349 | TCP | TURN TLS (ixtiyoriy) |

Server ichidagi `ufw` ni skript o'zi sozlaydi (agar `ufw` yoqilgan bo'lsa).

### 1.2. Skriptni ishga tushiring
```bash
cd /opt/tajriba24/deploy/vps && bash enable-turn.sh
```
Skript: sirni (`TURN_SECRET`) yaratadi va ko'rsatmaydi, ochiq IP va domenni `.env` ga yozadi, coturn va serverni qayta ishga tushiradi, natijani tekshiradi. Qayta ishga tushirsangiz mavjud sirni saqlaydi (xavfsiz).

Agar IP ni o'zi aniqlay olmasa:
```bash
cd /opt/tajriba24/deploy/vps && TURN_EXTERNAL_IP=SERVER_IP_MANZILI bash enable-turn.sh
```
Avval sinab ko'rish (hech narsani ishga tushirmaydi):
```bash
cd /opt/tajriba24/deploy/vps && DRY_RUN=1 bash enable-turn.sh
```

### 1.3. Tekshiring
```bash
cd /opt/tajriba24/deploy/vps && docker compose ps
```
`turn` va `server` konteynerlari `Up` bo'lishi kerak.
```bash
cd /opt/tajriba24/deploy/vps && docker compose logs turn --tail 30
```
Xato bo'lmasligi kerak. So'ng admin panelda («Tizim» / «Insight») **TURN** belgisi yashil bo'lishi kerak. Haqiqiy sinov: ikki xil tarmoqdan (masalan, bir telefon mobil internetda, ikkinchisi Wi-Fi'da) o'yinga kirib, ovozni yoqing.

Muammo bo'lsa: eng ko'p sabab — portlar VPS panelida ochilmagan (1.1).

## 2. Obuna darvozasi (Telegram / Instagram / Facebook / YouTube)

Qoida (sizning qaroringiz): obuna **faqat o'yin boshlashdan oldin** tekshiriladi, ro'yxatdan o'tishda emas. 16 yoshgacha o'yinchilar uchun qo'llanmaydi. Sozlama bo'sh bo'lsa darvoza o'chiq (hech kim to'silmaydi).

### 2.1. Hozir nima ishlaydi va nima kerak

| O'zgaruvchi | Vazifasi | Kim to'ldiradi | Holat |
|---|---|---|---|
| `GATE_TG_BOT_TOKEN`, `GATE_TG_BOT_USERNAME`, `GATE_TG_CHANNEL`, `GATE_TG_WEBHOOK_SECRET` | Telegram kanalga obunani tekshirish | siz (BotFather) | Telegram kanal uchun kerak |
| `GATE_TG_GROUP` | Telegram **guruh** ham majburiy bo'lsin | siz | ixtiyoriy |
| `GATE_TG_GROUP_URL` | Guruh faqat tavsiya (majburiy emas), havola beriladi | siz | ixtiyoriy |
| `GATE_FB_URL` | Facebook sahifa havolasi. Tekshirib bo'lmaydi: foydalanuvchi «O'zim obuna bo'ldim» deb tasdiqlaydi (tavsiya, majburiy emas) | siz | ixtiyoriy |
| `SOCIAL_STAR_XP` | Har tasdiqlangan tarmoq uchun beriladigan XP | **siz raqamni belgilaysiz** | bo'sh = 0 (o'chiq) |
| `GATE_IG_*`, `GATE_YT_*` | Instagram va YouTube | keyinroq (kalitlar tayyor bo'lganda) | hozir bo'sh |
| `GATE_REQUIRED` | Majburiy tarmoqlar ro'yxati. Standart `telegram,instagram` | — | o'zgartirmang |

Muhim: `GATE_REQUIRED` da Instagram bor, lekin Instagram kalitlari hali yo'q. Kalit bo'lmasa Instagram «sozlanmagan» hisoblanadi va **majburiy bo'lmaydi**, ya'ni hozir faqat Telegram talab qilinadi. Instagram kalitlari kiritilgach, u avtomatik majburiy bo'ladi.

### 2.2. Telegram bot (bir marta)
1. Telegram'da `@BotFather` → `/newbot` → nom va `..._bot` bilan tugaydigan foydalanuvchi nomi bering. Bot tokenini oling.
2. Kanalingizni oching → Administratorlar → botni **administrator** qilib qo'shing (a'zolarni ko'rish huquqi yetarli).
3. Agar guruh ham **majburiy** bo'lsa: botni guruhga ham administrator qiling.

### 2.3. `.env` ga yozing
Faylni oching:
```bash
nano /opt/tajriba24/deploy/vps/.env
```
Qatorlarni qo'shing (qiymatlarni o'zingiznikiga almashtiring):
```
GATE_TG_BOT_TOKEN=BOTFATHER_TOKENI
GATE_TG_BOT_USERNAME=BOT_FOYDALANUVCHI_NOMI
GATE_TG_CHANNEL=@kanal_nomi
GATE_TG_WEBHOOK_SECRET=BU_YERGA_TASODIFIY_SIR
```
`GATE_TG_WEBHOOK_SECRET` uchun tasodifiy qiymatni serverda yarating va nusxalab qo'ying:
```bash
openssl rand -hex 24
```
Guruh majburiy bo'lsa: `GATE_TG_GROUP=@guruh_nomi`. Faqat tavsiya bo'lsa: `GATE_TG_GROUP_URL=https://t.me/guruh_nomi` (va `GATE_TG_GROUP` yozilmaydi).
Facebook (ixtiyoriy): `GATE_FB_URL=https://www.facebook.com/SAHIFA_NOMI`.
XP: `SOCIAL_STAR_XP=` uchun raqamni siz aytasiz (men taxmin qilmayman).

### 2.4. Qo'llang va tekshiring
```bash
cd /opt/tajriba24/deploy/vps && docker compose up -d server
```
Server Telegram webhook'ni o'zi ulaydi (`GATE_PUBLIC_API_URL` o'zi `https://api.tajriba24.uz` bo'ladi). Holat: admin panel → «Obuna darvozasi» (webhook yashil, yetishmayotgan o'zgaruvchilar ro'yxati ko'rinadi).

## 3. Oferta
Oferta yurist tomonidan tasdiqlangan; imzolash masalasi keyinroq hal qilinadi. Hozir:
- Rozilik **faqat ro'yxatdan o'tishda**, bir marta (o'yin ochish/qo'shilishda va mavjud foydalanuvchilarda talab yo'q).
- `OFFER_VERSION` standart qiymati `2026-11-27`; u `client/public/oferta.html` dagi versiya bilan bir xil bo'lishi kerak. Hujjat matni o'zgarsa, versiyani yangilang: yangi foydalanuvchilar yangi versiyaga rozilik beradi, eskilariga yozuv tarixi saqlanadi.
- `client/public/oferta.html`, `tolov-oferta.html`, `tashkilot-oferta.html`, `maxfiylik.html` ichida hozir «Loyiha» belgisi turibdi. Imzo/tasdiq tayyor bo'lgach uni olib tashlaymiz (hozir tegilmadi).

## 4. Keyinroq (kalitlar tayyor bo'lganda)
Instagram (`GATE_IG_*`), YouTube (`GATE_YT_*`), Eskiz (SMS), Payme/Click: batafsil [DEPLOY.md](DEPLOY.md) va [PAYMENTS.md](PAYMENTS.md). Kalit kelganda shu hujjatga yangi bo'lim qo'shamiz.
