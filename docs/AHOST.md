# A-HOST (cPanel) bilan joylashtirish

Sizda **A-HOST umumiy (shared) cPanel hosting**, tarif **Nano**, domen `dariko.uz` (server `uz03.ahost.uz`, nom serverlari `dns1/dns2.ahost.uz`). Bu hosting turi nimaga yaroqli va nimaga yaramasligini avval aniq bilib oling.

## 1. Bu hosting nimaga yaraydi / yaramaydi
| Qism | Nano (umumiy cPanel) | Sabab |
|---|---|---|
| **Veb mijoz** (Expo web) | ✅ yaraydi | oddiy statik fayllar (HTML/JS) |
| **Admin panel** | ✅ yaraydi | statik fayllar |
| **O'yin serveri** (Node.js, WebSocket) | ❌ tavsiya etilmaydi | doimiy ishlaydigan jarayon, ochiq WebSocket ulanishlari va xotiradagi taymerlar kerak; umumiy hostingda jarayon va xotira cheklangan, WebSocket proksilanishi kafolatlanmaydi, jarayon istalgan vaqt to'xtatilishi mumkin |
| **PostgreSQL 16** | ❌ ishonchsiz | umumiy hostingda ko'pincha faqat MySQL bo'ladi; serverga alohida baza kerak |

cPanel'da "Setup Node.js App" bo'limi bo'lsa ham (Software bo'limidan qarang) o'yin serveri uchun ishlatmang: yuqoridagi cheklovlar o'zgarmaydi.

## 2. Ma'lumotlar joylashuvi — yurist bilan hal qiling
O'zbekiston qonunchiligi fuqarolarning shaxsiy ma'lumotlarini mamlakat ichidagi serverlarda saqlashni talab qilishi mumkin (aniq talablar va qo'llanishi `docs/OPEN_QUESTIONS.md` da "yurist masalasi" sifatida ochiq turibdi). Agar talab qo'llansa, **server va baza O'zbekistondagi serverda bo'lishi kerak** — Render (chet el) mos kelmaydi. Shuning uchun "serverni qayerga qo'yamiz" qaroridan oldin yuristdan so'rang.

## 3. Variantlar
| Variant | Mijoz + admin | Server + baza | Qachon |
|---|---|---|---|
| **A. Aralash** | A-HOST (sizda bor) | Render (`docs/RENDER.md`) | tezda sinab ko'rish; ma'lumot joylashuvi talabi bo'lmasa |
| **B. Hammasi O'zbekistonda** | A-HOST | **VPS** (A-HOST "Serverga buyurtma bering" bo'limi yoki boshqa UZ provayder) | ma'lumot joylashuvi talabi bo'lsa; uzoq muddatga eng to'g'ri |
| **C. Hammasi Render'da** | Render static | Render | A-HOST kerak emas |

Tavsiyam: **B** (yoki tez sinov uchun avval **A**, so'ng B ga ko'chish). B ga ko'chish oson: baza `pg_dump` bilan ko'chiriladi, mijoz/admin faqat server manzili o'zgargani uchun qayta quriladi.

## 4. Statik qism (mijoz va admin) — A-HOST cPanel'ga (A va B uchun umumiy)

### 4.1. Paketlarni tayyorlash (kompyuterda dasturlash muhiti shart emas)
1. GitHub → repo → **Actions** → **build-static** → **Run workflow**.
2. Maydonlarga server manzillarini kiriting (hali server yo'q bo'lsa, rejalashtirgan manzilni yozing, masalan `wss://api.dariko.uz` va `https://api.dariko.uz`; manzil o'zgarsa qayta ishga tushirasiz).
3. Tugagach (~2 daqiqa) ishga tushirish sahifasidagi **Artifacts → poyga-static** ni yuklab oling va oching: `poyga-client.zip`, `poyga-admin.zip`.
   (Dasturchi kompyuterida: `scripts/build-static.sh wss://… https://…`.)

### 4.2. Subdomenlarni yaratish (asosiy `dariko.uz` saytingizga tegmaydi!)
cPanel → **Domains** (yoki "Subdomains") → **Create A New Domain**:
- `game.dariko.uz` — hujjat ildizi (Document Root) `game.dariko.uz` (cPanel o'zi taklif qiladi)
- `admin.dariko.uz` — hujjat ildizi `admin.dariko.uz`
Asosiy sayt `public_html` da qoladi — uni **o'zgartirmang va ustiga yozmang**.

### 4.3. Fayllarni yuklash
cPanel → **File Manager** → `game.dariko.uz` papkasiga kiring → **Upload** → `poyga-client.zip` → yuklangach zip ustida **Extract** → zip faylni o'chiring. Xuddi shunday `admin.dariko.uz` ga `poyga-admin.zip`.
Tekshiring: papkada `index.html`, `_expo`, **`.htaccess`** bo'lishi kerak. `.htaccess` ko'rinmasa File Manager → **Settings** → "Show Hidden Files (dotfiles)" ni yoqing. Bu fayl HTTPS'ga o'tkazadi va ilova yo'llarini ishlatadi — usiz sahifa yangilanganda 404 chiqadi.

### 4.4. HTTPS (majburiy)
cPanel → **SSL/TLS Status** → `game.dariko.uz` va `admin.dariko.uz` ni belgilab **Run AutoSSL**. Sertifikat chiqmaguncha mijoz ishlamaydi (HTTPS sahifa faqat `wss://` ga ulanadi).

## 5A. Server — Variant A (Render)
`docs/RENDER.md` bo'yicha server va bazani qo'ying (static saytlarini Render'da yaratish **shart emas**: faqat `poyga-server` va `poyga-db` kerak). Serverda:
- `CORS_ORIGINS` = `https://game.dariko.uz,https://admin.dariko.uz`
- Mijoz uchun server manzili: Render bergan `wss://poyga-server.onrender.com` (yoki o'z domeningiz, 5.1). 4.1 qadamini shu manzillar bilan qayta bajaring va yangi zip'larni yuklang.
- 5.1 (ixtiyoriy) `api.dariko.uz` ni Render'ga ulash: Render → Service → Settings → **Custom Domains** → `api.dariko.uz` → Render ko'rsatgan **CNAME** qiymatini cPanel → **Zone Editor** → `dariko.uz` → **Add CNAME** (nomi `api`) ga kiriting. DNS tarqalgach Render sertifikatni o'zi beradi.

## 5B. Server — Variant B (VPS, hammasi O'zbekistonda)
**Nima buyurtma qilish:** Ubuntu 22.04/24.04 li VPS, kamida 2 vCPU va 2 GB RAM, 20+ GB disk. Aniq tarif va narxni provayder sahifasidan tekshiring (sinov yuklamasi bu o'lchamdan yuzlab xonani ko'tarishini ko'rsatgan, `docs/LOADTEST.md`).

1. **DNS:** cPanel → **Zone Editor** → `dariko.uz` → **Add A Record**: nomi `api`, qiymati VPS IP manzili.
2. **VPS xavfsizligi (birinchi 10 daqiqa):** SSH kalit bilan kirish, parol bilan kirishni o'chirish, `ufw allow 22,80,443/tcp && ufw enable`.
3. **Docker o'rnatish:** https://docs.docker.com/engine/install/ubuntu/ qo'llanmasi bo'yicha (Docker Engine + Compose plugin).
4. **Kodni olish va sozlash:**
   ```bash
   git clone https://github.com/Dariko-HR-Marketing/D-game.git && cd D-game/deploy/vps
   cp .env.example .env && nano .env     # API_DOMAIN, parollar, CORS_ORIGINS, ADMIN_TOKENS
   ```
   `POSTGRES_PASSWORD` faqat harf va raqamdan iborat uzun parol bo'lsin (maxsus belgilar ulanish satrini buzadi). `ADMIN_TOKENS` tokenini parol menejerida yarating.
5. **Ishga tushirish:** `docker compose up -d --build` (birinchi marta 5–10 daqiqa). Caddy HTTPS sertifikatini o'zi oladi (DNS 1-qadamda to'g'ri bo'lishi shart).
6. **Tekshirish:** `curl https://api.dariko.uz/ready` → `{"ready":true}`; `docker compose logs -f server`.
7. **Yangilash:** `git pull && docker compose up -d --build`. **Zaxira:** kunlik `docker compose exec -T db pg_dump -U poyga poyga | gzip > /backup/poyga-$(date +%F).gz` (cron) va nusxani boshqa joyga saqlang.
8. 4.1 qadamini `wss://api.dariko.uz` / `https://api.dariko.uz` bilan bajaring (standart qiymatlar shu).

## 6. Yakuniy tekshiruv
1. `https://game.dariko.uz` ochiladi, "Ulanmoqda…" yo'qoladi (bo'lmasa — 7-bo'lim).
2. Ikki brauzerda xona yarating va qo'shiling, bir necha navbat o'ynang.
3. `https://admin.dariko.uz` → `ADMIN_TOKENS` dagi token → xonalar ko'rinadi.
4. **Ommaga e'lon qilmang:** haqiqiy kirish (SMS/Google/Apple) hali yo'q — hozir har kim istalgan ID bilan kira oladi. Havolani faqat sinovchilarga bering (`docs/DEPLOY.md`).

## 7. Muammolar
| Belgi | Sabab | Yechim |
|---|---|---|
| Sahifa yangilanganda 404 | `.htaccess` yuklanmagan | 4.3: yashirin fayllarni ko'rsating, `.htaccess` borligini tekshiring |
| Mijoz "Ulanmoqda…" da qotadi | build'da server manzili noto'g'ri yoki `ws://`; sertifikat yo'q | 4.1 ni to'g'ri `wss://…` bilan qayta bajaring; AutoSSL |
| Brauzer konsolida CORS xatosi | serverda `CORS_ORIGINS` noto'g'ri | aniq `https://game.dariko.uz,https://admin.dariko.uz` (probelsiz, oxirida `/` siz) |
| Caddy sertifikat ololmayapti | `api` A-yozuvi VPS IP'ga ko'rsatmayapti yoki 80/443 yopiq | `dig api.dariko.uz`, `ufw status` |
| Admin "Token noto'g'ri" | `ADMIN_TOKENS` JSON xato yoki admin build'dagi server manzili xato | JSON'ni tekshiring; admin'ni qayta quring |
| Eski versiya ko'rinadi | brauzer keshi | `Ctrl+F5`; `.htaccess` index.html ni keshlamaydi |
