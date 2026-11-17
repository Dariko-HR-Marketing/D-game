# Tajriba 24 — kodlash uchun texnik hujjat (handoff spec)

Bu papka **tajriba24.uz** saytining 11 ekranli HTML prototipini o'z ichiga oladi. Har bir `.html` fayl — mustaqil, to'liq ishlaydigan statik ekran (CSS inline, shrift Google Fonts orqali). Maqsad: shu prototiplarni asos qilib, **haqiqiy production kodni** (React/Next.js, Vue yoki boshqa stack) yozish va mavjud `D-game` repozitoriyasiga merge/push qilish.

## 0. Repo va joylashtirish haqida eslatma
Bu fayllar git repo ichida emas — alohida papkada tayyorlangan. Kodlovchi agent (cloud code) bu papkani mavjud loyihaga import qilgandan keyin:
1. Mos komponent/sahifa strukturasiga ko'chirishi,
2. Statik CSS'ni loyihadagi stilizatsiya tizimiga (Tailwind, CSS modules va h.k.) moslashtirishi,
3. `git add && git commit && git push` qilishi kerak — bu amallar **kodlovchi agent tomonidan, uning o'z repo ulanishi orqali** bajariladi.

## 1. Dizayn tizimi (barcha ekranlarda bir xil)

```css
--navy:#082238      /* asosiy matn, dark panellar */
--green:#11835A     /* asosiy CTA, muvaffaqiyat */
--green-d:#0E6B4A   /* qoramtir yashil, matn urg'u */
--green-l:#E7F4EE   /* yashil fon (light) */
--gold:#F2B233      /* urg'u, hodisa kartalari */
--red:#9E2A30       /* xarajat, xavf, salbiy qiymat */
--blue:#2C6DB5      /* ikkinchi darajali urg'u */
--muted:#4A5B6C     /* ikkinchi darajali matn */
--bg:#F4F7F8        /* sahifa foni (light) */
--line:#DCE3E8      /* chegaralar */
--night:#07131C / #0F1B26 / #0B2620   /* dark fon variantlari */
--accent:#34D399    /* dark temadagi CTA/urg'u */
```
Shrift: **Manrope** (400–800), Google Fonts orqali. Minimal kenglik: 1180px (desktop-first prototip, mobil moslashtirish alohida ish).

## 2. Qat'iy kontent qoidalari (buziladigan EMAS)
- Barcha matn — **o'zbek lotin alifbosida**.
- Katta raqamlar **to'liq so'z/raqam bilan, bo'sh joy ajratgich bilan** yoziladi: `1 000 000`, `25 000` (hech qachon `1M`, `25k`).
- Hech qanday **o'ylab topilgan raqam** ishlatilmaydi — faqat brifda/skrinshotlarda berilgan haqiqiy namunalar. Namuna raqamlar yonida **"namuna"** yoki "Prototipdagi raqamlar namuna sifatida berilgan" izohi bo'lishi shart (qarang: Landing, Oyin, Saboq, Tahlil fayllaridagi `.sample`/`.note` elementlari).
- Taqiqlangan iboralar: **"o'yna va boy bo'l"**, **"boyib ket"**, **"poyga"** va shunga o'xshash boylik-va'dasi iboralari — HECH QAYERDA ishlatilmasin.
- Kutilmagan hodisa kartasi nomi aniq: **"KUTILMAGAN HODISA!"** (Landing.html'da namuna sifatida mavjud).
- **16 yosh va undan kichik foydalanuvchilar uchun himoya** (Royxat.html, Main.html, Chat.html'da aks etgan):
  - To'lov — faqat ota-ona tasdig'i bilan,
  - O'yinchilar orasida pul/qarz berish-olish (peer lending) yo'q,
  - Chat — faqat yopiq, tayyor-ibora (preset-phrase) rejimida,
  - Reklama ko'rsatilmaydi.
- **Kirish faqat SMS bir martalik kod bilan** ishlaydi (Royxat.html). Email/parol/Google tugmalari — **"Tez orada"** belgisi bilan disabled holatda ko'rsatiladi, funksional emas.
- Mavjud o'yin mexanikasi (qoidalar, kataklar, kartalar mantiqi) o'zgartirilmaydi — bu faqat **UX/UI qayta ishlash**.

## 3. Sahifa xaritasi va yo'l (user flow)

| # | Fayl | Yo'l / holat | Qisqa tavsif |
|---|------|------|--------------|
| 1 | `Landing.html` | `/` | Kirish sahifasi, 5 bo'lim, "O'yinni boshlash" CTA → Royxat |
| 2 | `Royxat.html` | `/auth` | 2 bosqich: telefon+SMS kod → ism/yil, bir martalik kod bilan kirish |
| 3 | `Main.html` | `/home` | Bosh sahifa: yangi o'yin sozlash (tur/o'yinchi soni/tezlik), tezkor amallar |
| 4 | `Kutish.html` | `/room/:code/waiting` | Xona kodi, ulashish, o'yinchilar ro'yxati, bot bilan to'ldirish |
| 5 | `Oyin.html` | `/game/:id` | Asosiy o'yin ekrani: taxta, dice, moliyaviy panel + onboarding coach-tooltip overlay |
| 6 | `Kartalarim.html` | `/game/:id/assets` | O'yinchining aktivlar/kartalar jadvali, sof boylik hisob-kitobi |
| 7 | `HisobVaragi.html` | `/game/:id/sheet` | To'liq daromad/xarajat balans varag'i, kichik/katta aylana segment |
| 8 | `Tarix.html` | `/game/:id/history` | O'yin jurnali (amallar logi), CSV eksport |
| 9 | `Tahlil.html` | `/game/:id/analytics` | Jonli tahlil: 5 sub-bo'lim (umumiy/o'yinchi/bozor/taqqoslash/nazariya) |
| 10 | `Chat.html` | `/game/:id` (overlay) | O'yin ichidagi chat panel + karta-qaror modal (decision), ovozli aloqa indikatori |
| 11 | `Saboq.html` | `/game/:id/lesson` | O'quv o'yini yakuni: statistikalar + 3 shaxsiy saboq, CTA |

Flow: **Landing → Royxat → Main → Kutish → Oyin ⇄ (Kartalarim / HisobVaragi / Tarix / Tahlil / Chat ekranlari Oyin ichidagi tab'lar) → Saboq** (faqat o'quv rejimida).

## 4. Komponentlashtirish bo'yicha tavsiya (kodlovchi agent uchun)
Umumiy, qayta ishlatiladigan komponentlar (barcha fayllarda takrorlanadi):
- `AppTopBar` — o'yin ichidagi yuqori panel (gbar), navigatsiya tugmalari (Mening kartalarim / Hisob varag'i / Tarix / Tahlil / Chat / Qoidalar)
- `Pill` / `Badge` — status indikatorlari (`.pill`, `.badge`, `.okpill`, `.warnpill`, `.tag`)
- `Card` — asosiy konteyner (`.card`, oq fon, `--line` border, `--shadow`)
- `Button` — `.btn` (asosiy), `.btn.ghost`/`.btn.o` (ikkinchi darajali), `.btn.light`
- `StatTile` — raqam + label (`.stat`, `.stat2`)
- `Table` — moliyaviy jadvallar (HisobVaragi, Kartalarim, Tahlil'da)
- `ProgressBar` — `.bar`, `.bg i`, `.stackbar`
- `DecisionModal` — Chat.html'dagi `.qaror` bloki (karta chiqqanda ochiladigan qaror oynasi)
- `CoachTooltip` — Oyin.html'dagi onboarding overlay (`.dim`, `.spot`, `.coach`)

## 5. Texnik stack bo'yicha taklif
Loyiha allaqachon `github.com/Dariko-HR-Marketing/D-game` repozitoriyasida mavjud bo'lgani uchun, **kodlovchi agent mavjud stackka mos tushishi kerak** (aniq stack shu repo ichida tekshiriladi). Umumiy tavsiya:
- Komponentlar: har bir ekran — alohida route/page komponenti, umumiy qismlar (`AppTopBar`, `Card`, `Button` va h.k.) — alohida reusable komponentlar sifatida.
- CSS token'lari — loyihaning global stil/theme fayliga (`:root` yoki Tailwind `theme.extend.colors`) ko'chiriladi, har bir sahifada takrorlanmaydi.
- SVG ikonlar — alohida ikon komponentlari/kutubxonaga chiqariladi (hozir inline SVG sifatida takrorlanmoqda).
- Grafik (Tahlil.html'dagi SVG chart'lar) — haqiqiy chart kutubxonasi (masalan Recharts, Chart.js) bilan almashtiriladi, hozirgi SVG — faqat vizual namuna.

## 6. Keyingi qadam (cloud code uchun)
1. Ushbu `export/` papkadagi 11 HTML faylni va shu SPEC.md'ni loyihaga yuklang.
2. Har bir faylni mos route/komponentga aylantiring (bo'lim 3-jadval asosida).
3. Bo'lim 1-dagi design-token'larni loyihaning global stiliga o'tkazing.
4. Bo'lim 2-dagi qat'iy qoidalarni **o'zgarmas talab** sifatida qabul qiling — ular kontentga, loginga va 16 yosh himoyasiga tegishli va UI qayta qurilishida ham saqlanishi shart.
5. Kod yozib bo'lgach, o'z git integratsiyangiz orqali commit va push qiling.
