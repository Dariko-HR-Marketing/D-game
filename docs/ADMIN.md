# Admin panel

Veb panel: `https://admin.<domen>`. Kod: `admin/` (Vite + React), server: `server/src/admin*.ts`, `adminAccounts.ts`, `ops.ts`.

## Kirish va xavfsizlik
- **Shaxsiy hisob**: login + parol (scrypt), ixtiyoriy yoki majburiy TOTP (RFC 6238; Google Authenticator, Aegis, 1Password). 5 xato urinish → 15 daqiqa qulf; kirish uchun IP bo'yicha tezlik cheklovi.
- **Birinchi administrator**: serverda `ADMIN_BOOTSTRAP_LOGIN` va `ADMIN_BOOTSTRAP_PASSWORD` (kamida 10 belgi, harf va raqam) berilsa, hisoblar bo'sh bo'lganda yaratiladi. Birinchi kirishda parolni almashtirish majburiy. Keyin bu o'zgaruvchilarni `.env` dan olib tashlash tavsiya etiladi.
- **2FA majburiy**: `ADMIN_REQUIRE_2FA=1` (VPS compose'da standart). Yoqilmaguncha boshqa amallar yopiq.
- **Sessiya**: 12 soat, 2 soat harakatsizlikdan keyin tugaydi; parol almashtirilsa/rol o'zgarsa/hisob o'chirilsa darhol yopiladi. «Mening hisobim»da qurilmalar ro'yxati va yopish.
- **Eski `ADMIN_TOKENS`** (statik token) vaqtincha ishlaydi; `ADMIN_TOKENS` bo'sh qoldirilsa o'chadi. Tokenlar 2FA/qulf ostida emas — ishlab chiqarishda bo'sh qoldiring.
- **Audit**: har amal (va muvaffaqiyatsiz urinish) IP bilan yoziladi; parol/kod/token maydonlari yozilmaydi. Xavfli amallar (ban, qaytarish, Plus berish, hisob o'chirish, majburan yopish, bayroqlar, kontent rad etish) uchun **sabab majburiy**.
- Oxirgi administratorni o'chirib/pasaytirib bo'lmaydi; o'z hisobingizning rolini o'zgartirib bo'lmaydi.

## Rollar
| Rol | Ruxsat |
|---|---|
| Administrator | hamma narsa (hisoblar, nashr, refund, bayroqlar, audit) |
| Kontent muharriri | kontent tayyorlaydi va ko'rib chiqishga topshiradi; **nashr qila olmaydi** |
| Qo'llab-quvvatlash | foydalanuvchi, shikoyat, xona jurnali, bloklash |
| Moderator | qo'llab-quvvatlash + xonani majburan yopish |
| Tahlilchi | shaxssiz analitika, xonalar (ismsiz) |
| Moliyachi | moliya hisoboti, buyurtmalar (tasdiqlash/bekor), narxlar; **refund yo'q** |
| Ta'lim menejeri | tashkilotlar, o'qituvchilar, sinf e'lonlari |
| Turnir menejeri | turnirlar, ishtirokchilar, sovrinlar, turnir e'lonlari |

## Bo'limlar
1. **Boshqaruv paneli** — onlayn o'yinchilar, xonalar, bugungi raqamlar, 14 kunlik grafiklar, «diqqat talab qiladi» (yangi shikoyat, to'lanmagan buyurtma, tugayotgan litsenziya, xatolar, SMS).
2. **Foydalanuvchilar** — qidiruv/filtr/CSV; karta (profil, statistika, buyurtmalar, shikoyatlar, sinf/turnir, ota-ona nazorati); bloklash (muddatli), ism almashtirish, Plus berish/qaytarish, «ishonchsiz» belgisini olib tashlash, telefonni bo'shatish, ma'lumotni yuklab olish, hisobni o'chirish. Telefon raqamlari saqlanmaydi (faqat xesh) — «tasdiqlangan» belgisi ko'rinadi.
3. **Shikoyatlar** — yangi → jarayonda (mas'ul) → hal qilindi/rad etildi, ichki izohlar, takroriy shikoyat hisobi.
4. **Xonalar** — jonli/tugagan/shubhali o'yinlar, jurnal, **qayta o'ynatish** (qadam-baqadam, naqd pul grafigi), majburan yopish (sabab o'yinchilarga ko'rinadi). «Shubhali» — faqat ko'rib chiqish belgisi, avtomatik jazo yo'q.
5. **Kontent** — vizual muharrir (ro'yxat + maydonlar, karta rasmi), versiyalar, **farq** (diff), **tekshiruv** (muvozanat ogohlantirishlari), topshirish → administrator rad etadi/nashr qiladi, eski versiyaga qaytarish. Karta rasmlari uchun `VITE_CARD_IMAGES_URL` (standart `/cards`).
6. **Moliya** — hisobot (daromad, qaytarish, ARPPU, konversiya, MRR, yo'qotish), buyurtmalar (qo'lda tasdiqlash/bekor/refund — refund faqat holatni o'zgartiradi va huquqni oladi, **pulni provayder kabinetida qaytarish kerak**), narxlar, katalogni yashirish, to'lov xabarlari, sozlamalar tarixi.
7. **Ta'lim** — tashkilot tafsiloti (o'qituvchi, sinf, taklif kodlari, litsenziya), jamlama hisobot (o'quvchi nomisiz) va CSV.
8. **Turnirlar** — holat o'tishlari, ishtirokchilar (ota-ona roziligi holati), reyting, sovrinlar jurnali, homiy hisoboti (jamlama, bolalarsiz).
9. **Analitika** — o'sish, ushlab qolish (D1/D7/D30, taxminiy), DAU/WAU/MAU, o'yin sifati, taqsimotlar, soatlar, yosh guruhlari, voronka, kartalar. Hammasi shaxssiz.
10. **E'lonlar** — hammaga/sinfga/turnirga banner (o'yinchi bosh sahifasida), muddat bilan; rol bo'yicha cheklangan.
11. **Tizim** — salomatlik (baza, xotira, SMS, ota-ona so'rovlari, xatolar halqasi), **funksiya bayroqlari** (texnik ishlar, xona yaratish, sotuv, turnir ro'yxati), o'zgarishlar tarixi.
12. **Admin hisoblari**, **Audit** (qidiruv/filtr/CSV).

## Ma'lum cheklovlar
- Zaxira holati panelda faqat `BACKUP_MARKER` (fayl yo'li) berilganda ko'rinadi — `backup.sh` oxirida shu faylni `touch` qilsa va server uni ko'ra olsa.
- Qoida parametrlari (bank, lombard, taymer) hozir kodda; admin faqat `cellRules`, kartalar, orzular va katta aylanani o'zgartiradi.
- Karta rasmlarini yuklash yo'q (rasmlar `deploy/vps/cards/` da); admin faqat fayl nomini boshqaradi.
- Avtomatik haftalik hisobot (e-pochta) yo'q — hisobotlar so'rov bo'yicha CSV.

## Test hisoblar (sinov rejimi)
Admin → Foydalanuvchilar → **Test hisoblar** (ruxsat `users.manage`, ya'ni faqat administrator). Istalgan hisobga to'lovsiz paket vaqtincha ochiladi:
- **Topish**: telefon raqami (hisob shu raqam bilan SMS orqali kirgan bo'lishi kerak) yoki hisob ID. Raqam faqat so'rov ichida HMAC ga aylantiriladi; jurnalga yozilmaydi.
- **Paket ochish**: Hammasi (Premium + Plus + 5 kupon + Tashkilot) · Premium · Plus · 5 kupon · Tashkilot (o'qituvchi litsenziyasi, joylar soni bilan); muddat 30 yoki 365 kun; sabab majburiy.
- **Sinovni qaytarish**: faqat shu yerdan berilgan huquqlarni oladi (`note` «test:» bilan boshlanadigan 0 so'mlik buyurtmalar va «TEST ·» tashkiloti). Haqiqiy xaridga tegmaydi.
- Daromad hisobotiga kirmaydi (0 so'm). Audit: `test.lookup`, `test.grant`, `test.revoke`.
- To'liq o'chirish: serverda `ADMIN_TEST_TOOLS=0` (standart: yoqilgan).

### Birinchi marta kirish (ishga tushirgandan so'ng)
1. VPS `.env` ga `ADMIN_BOOTSTRAP_LOGIN` (masalan `owner`) va o'zingiz o'ylab topgan `ADMIN_BOOTSTRAP_PASSWORD` (≥10 belgi, harf+raqam) yozing; parolni hech qayerga (repo, chat) yubormang. `docker compose up -d`.
2. `https://admin.<domen>` → kirish → parolni almashtiring → 2FA (Google Authenticator) ni yoqing.
3. «Test hisoblar» bo'limiga o'ting. Tugagach bootstrap o'zgaruvchilarini `.env` dan olib tashlang.

## Prototipga moslash (2026-11-25)
- **Karta rasmlari admin domenida**: Caddy `ADMIN_DOMAIN` uchun ham `/cards/*` ni `deploy/vps/cards` dan beradi (avval `index.html` qaytib, rasmlar chiqmas edi). Deploy'dan keyin Caddy qayta yuklanadi (`docker compose up -d`).
- **Boshqaruv paneli**: 9 ko'rsatkich (onlayn, faol/kutayotgan maydon, bugungi o'yin, o'rtacha davomiylik, tashlab ketilgan %, aloqasi uzilganlar, yangi hisoblar, sinf/turnir), 24 soatlik onlayn grafigi (xotirada soatlik eng yuqori; server qayta ishga tushsa yangidan boshlanadi), kontent salomatligi, jonli maydonlar, eng ko'p chiqqan kartalar (rasmli). Baza bo'sh bo'lsa — tushuntirish banneri.
- **Yangi bo'limlar**: Jonli kuzatuv (5 soniyada yangilanadi), Orzular (soha bo'yicha, g'alaba yo'li), Kataklar (katta aylana 53 katak + kichik aylana qoidalari). Tahrir — «Kontent» bo'limida (versiya + ko'rib chiqish).
- **Qo'shildi (2026-11-25, 2-bosqich)**: Analitika → «Kontent» (to'plamlar bo'yicha ulush/qabul, eng ko'p tushgan va eng kam qabul qilingan kartalar, ta'sir turlari, ma'lumot sifati) va haftalik kohortalar («O'sish»); Shikoyatlar → «Ota-ona nazorati» (rozilik so'rovlari, ota-ona raqami ko'rinmaydi); Foydalanuvchilar tablarida hisoblagichlar; katalogda kartaning «Bog'liqliklari».
- **Kuzatilmaydi (alohida qaror kerak, §16)**: bankrotlikka olib borgan kartalar, kichik aylanadan chiqish turi, kasb bo'yicha g'alaba ulushi, katakka tushish chastotasi — hozir bunday hodisalar yozilmaydi; panelda shunday deb yozilgan, raqam to'qilmaydi.
- Prototipdagi sonlar namunaviy edi; haqiqiy panel faqat serverdagi ma'lumotni ko'rsatadi.
