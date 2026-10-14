# O'yin serveri uchun qanday server olish kerak

## Qisqa javob
**VPS** (virtual private server) kerak: Linux, to'liq (root) kirish, Docker o'rnatish imkoniyati, statik IPv4 manzil. Oddiy umumiy (shared) hosting **yaramaydi**: o'yin serveri doimiy ishlaydigan jarayon, ochiq WebSocket ulanishlari va xotiradagi taymerlar talab qiladi, umumiy hostingda jarayon/xotira cheklangan va WebSocket kafolatlanmagan; PostgreSQL ham ishonchli emas.

Bitta VPS'da hammasi ishlaydi: PostgreSQL + o'yin serveri + veb mijoz + admin panel + HTTPS (`deploy/vps/`).

## Tarif tanlash (o'lchamlar sinov natijalariga asoslangan, `docs/LOADTEST.md`)
Sinov: bitta server jarayoni ~900 harakat/soniyagacha chidadi; 1 600 ulanishda xotira ~310 MB. Real o'yinchi har 5–10 soniyada bir harakat qiladi.

| Bosqich | Bir vaqtdagi o'yinchi | vCPU | RAM | Disk | Izoh |
|---|---|---|---|---|---|
| Yopiq sinov / pilot | ~50–200 | 2 | 2 GB | 40 GB SSD | Docker build uchun 2 GB dan kam olmang (kam bo'lsa swap qo'shing) |
| Kichik ishga tushirish | ~1 000 | 2–4 | 4 GB | 60 GB SSD | |
| Katta (bitta server chegarasi) | ~4 000–8 000 | 4 | 8 GB | 100 GB SSD | Node bitta yadroda ishlaydi: **yadro soni emas, bitta yadroning tezligi** muhim; undan oshsa ko'p serverli arxitektura kerak (`OPEN_QUESTIONS.md` 46) |

Taxminlar yuklama sinovidan (bir mashinada, haqiqiy tarmoqsiz) olingan: haqiqiy ko'rsatkichlarni `/metrics` bilan kuzatib boring va kerak bo'lsa tarifni oshiring (VPS'ni odatda keyin kattalashtirish mumkin).

**Trafik:** har bir harakatda holat xonadagi hamma o'yinchiga yuboriladi (~3–7 KB × 4). Yuklama sinovida 200 harakat/s ≈ 2.7 MB/s. 1 000 doimiy faol o'yinchi taxminan 2 MB/s beradi; bu faqat eng yuqori yuklamada oylik o'nlab TB bo'lishi mumkin, o'rtacha yuklama ancha past. Cheklangan trafikli tarifda bu hisobni oldindan qiling (kerak bo'lsa holatni to'liq emas, o'zgarish bilan yuborishga o'tish mumkin — hozircha yo'q).

## Tanlash mezonlari (provayderga savollar)
- [ ] **Ma'lumotlar markazi O'zbekistonda** (agar yurist shaxsiy ma'lumotlarni mamlakat ichida saqlash talabi qo'llanadi desa — `OPEN_QUESTIONS.md` yurist masalalari). Aniq qo'llanishini yurist hal qiladi.
- [ ] Virtualizatsiya **KVM** (OpenVZ/LXC'da Docker ishlamasligi mumkin).
- [ ] **Root/SSH** kirish, Ubuntu 24.04 LTS yoki 22.04 LTS tasviri.
- [ ] Statik ommaviy **IPv4**; **80 va 443 portlar** ochiq va filtrlanmagan (HTTPS sertifikati va wss uchun).
- [ ] Trafik chegarasi va tezligi (yuqoridagi hisob).
- [ ] Avtomatik **zaxira nusxa/snapshot** imkoniyati (baza uchun alohida `pg_dump` baribir kerak, pastga qarang).
- [ ] DDoS himoyasi, texnik yordam (sutka davomida bo'lsa yaxshi), so'mda to'lov, konsol (VNC) orqali kirish (SSH sozlamasi buzilganda qutqaradi).
- [ ] Tarifni keyin oshirish (upgrade) imkoniyati.

## O'rnatish tartibi
### 1. Domenlar (DNS)
Uchta manzil kerak va uchalasi **bir xil VPS IP manziliga** A-yozuv bilan ulanadi (domen qayerda boshqarilsa o'sha yerda DNS yozuvlarini qo'shing):
- `api.<domen>` — o'yin serveri
- `game.<domen>` — o'yin mijozi (veb)
- `admin.<domen>` — admin panel

`dig +short api.<domen>` VPS IP ni qaytarguncha kuting (HTTPS sertifikati DNS to'g'ri bo'lgandagina olinadi).

### 2. VPS xavfsizligi (birinchi 10 daqiqa)
```bash
adduser deploy && usermod -aG sudo deploy          # alohida foydalanuvchi
mkdir -p /home/deploy/.ssh && cp ~/.ssh/authorized_keys /home/deploy/.ssh/ && chown -R deploy:deploy /home/deploy/.ssh
# /etc/ssh/sshd_config: PermitRootLogin no, PasswordAuthentication no  → systemctl restart ssh
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
apt update && apt -y upgrade && apt -y install unattended-upgrades
```
Yangi sessiyada `deploy` foydalanuvchi bilan kirib tekshirmasdan turib eski sessiyani yopmang.

### 3. Docker
Rasmiy qo'llanma bo'yicha (Docker Engine + Compose plugin): https://docs.docker.com/engine/install/ubuntu/ — keyin `sudo usermod -aG docker deploy` va qayta kiring.

### 4. Kod va sozlama
```bash
git clone https://github.com/Dariko-HR-Marketing/D-game.git && cd D-game/deploy/vps
cp .env.example .env && nano .env
```
`.env` da: uchta manzil, `POSTGRES_PASSWORD` (faqat harf va raqam, uzun), `ADMIN_TOKENS` (parol menejerida yaratilgan 32+ belgili token), `NODE_ENV=staging`. `.env` ni hech qachon GitHub'ga yuklamang (`.gitignore` da bor).

### 5. Ishga tushirish
```bash
docker compose up -d --build        # birinchi marta 5–10 daqiqa
docker compose ps                   # hammasi "running/healthy"
docker compose logs -f server       # "tiklangan o'yinlar: 0", "Server listening"
```

### 6. Tekshirish
- `curl https://api.<domen>/ready` → `{"ready":true}`
- `https://game.<domen>` ochiladi → "Xona yaratish" → ikkinchi brauzerdan qo'shilib o'ynang.
- `https://admin.<domen>` → `ADMIN_TOKENS` dagi token → xonalar ko'rinadi.
- Server qayta ishga tushirilsa (`docker compose restart server`) faol o'yin bazadan tiklanadi.

## Karta rasmlari (§2.5)
Rasm fayllari (`KB_001.png`, `01_BEGONA_FIRMA_DIREKTORI.png` va h.k.) alohida beriladi va repoga qo'shilmaydi. Hammasini **bitta tekis papkaga** (`deploy/vps/cards/`) qo'ying, masalan: `scp -r cards/* deploy@<server>:~/D-game/deploy/vps/cards/`. Nomlar `content/data/cards.json` dagi `file` maydoniga aynan mos bo'lishi shart (katta-kichik harf ham). Qayta qurish kerak emas: Caddy papkani to'g'ridan-to'g'ri o'qiydi, mijoz `https://game.<domen>/cards/<fayl>` dan oladi. Fayl bo'lmasa karta matn bilan chiqadi.

## Kundalik ish
| Vazifa | Buyruq |
|---|---|
| Yangilash | `cd D-game && git pull && cd deploy/vps && docker compose up -d --build` |
| Orqaga qaytarish | `git checkout <oldingi-commit-yoki-teg>` va `docker compose up -d --build` |
| Jurnal | `docker compose logs --tail 200 server` (JSON; token/IP yozilmaydi) |
| Metrikalar | `curl -H "Authorization: Bearer $METRICS_TOKEN" https://api.<domen>/metrics` (`.env` da `METRICS_TOKEN` o'rnatilgan bo'lsa) |
| **Baza zaxirasi (kunlik)** | `docker compose exec -T db pg_dump -U poyga poyga \| gzip > /backup/poyga-$(date +%F).gz` — `crontab -e` ga qo'shing va nusxani **boshqa joyga** ham ko'chiring |
| Zaxiradan tiklash | `gunzip -c poyga-YYYY-MM-DD.gz \| docker compose exec -T db psql -U poyga poyga` (bo'sh bazaga) |
| Disk | `df -h`, `docker system df`; eski image'lar: `docker image prune` |

Kuzatuv, ogohlantirish qoidalari va nosozliklarni bartaraf etish: `docs/ops/RUNBOOK.md`, `docs/ops/alerts.yml`.

## Muammolar
| Belgi | Sabab | Yechim |
|---|---|---|
| HTTPS sertifikati olinmayapti | DNS A-yozuvi VPS IP'ga ko'rsatmayapti yoki 80/443 yopiq | `dig +short api.<domen>`, `ufw status`, provayder firewall'i |
| `docker compose up` "variable is not set" | `.env` to'liq emas | `.env.example` bilan solishtiring |
| Mijoz "Ulanmoqda…" | build vaqtida `API_DOMAIN` noto'g'ri bo'lgan | `.env` ni tuzating va `docker compose up -d --build web` |
| Brauzerda CORS xatosi | `APP_DOMAIN`/`ADMIN_DOMAIN` noto'g'ri (CORS ular asosida avtomatik tuziladi) | `.env` ni tuzating, `docker compose up -d` |
| Server "Exited", logda `production: haqiqiy autentifikatsiya…` | `NODE_ENV=production` | `NODE_ENV=staging` (haqiqiy kirish ulangach production'ga o'tiladi) |
| Build "killed"/xotira yetmadi | RAM kam | 2 GB+ RAM yoki swap: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile` |
| 429 (`rate_limited`) | bir IP'dan juda ko'p ulanish (maktab/ofis) | serverga `WS_CONNECT_RATE` / `WS_CONNECT_BURST` ni oshiring |

## Ommaga ochishdan oldin (hali bajarilmagan)
Haqiqiy kirish (SMS/Google/Apple) — hozir har kim istalgan ID bilan kira oladi; mustaqil xavfsizlik sinovi; yuridik masalalar; ochiq qoidalar va ekranlar (`docs/OPEN_QUESTIONS.md`). Shu vaqtgacha havolani faqat sinovchilarga bering.
