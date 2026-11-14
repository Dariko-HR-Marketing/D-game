# Tajriba 24 onlayn (D-game) — yangi chat uchun to'liq topshirish fayli

Sana: 2026-11-11. Repo: `Dariko-HR-Marketing/D-game`. Til: javoblar o'zbek lotin alifbosida.
Yangi chatda birinchi ish: `CLAUDE.md`, `docs/SPEC.md` va `docs/OPEN_QUESTIONS.md` ni o'qish, so'ng shu faylni.

## 1. Joriy holat (qisqa)
- `main` oxirgi commit: `2ad0a7f` (PR #35). PR #26–#35 hammasi squash-merge qilingan, ochiq PR yo'q.
- `main` dagi CI yashil (test, docker, ui). Brauzer skriptlari (`calc-check`, `rejoin-check`, `auction-check`) ba'zan tasodifan yiqiladi: avval yiqilgan jobni bir marta qayta ishga tushir, so'ng tahlil qil.
- **Deploy:** foydalanuvchi serverda qo'lda qildi (`cd ~/D-game && git pull origin main && cd deploy/vps && ./install-art.sh && docker compose up -d --build`). Men serverga kira olmayman; GitHub'dagi `DEPLOY_HOST/USER/PATH/READY_URL/SSH_KEY/KNOWN_HOSTS` sirlari bo'sh, shuning uchun avtomatik deploy ogohlantirish bilan o'tkazib yuboriladi ("success" ko'rinsa ham haqiqiy deploy emas). Saytning haqiqiy ochilishi tasdiqlanmagan; foydalanuvchi tekshiruv natijasini hali bermagan.
- Sirlar: hech qachon so'ramang, yozmang, chop etmang. `DEPLOY_*` ni faqat foydalanuvchi kiritadi.

## 2. Loyiha (CLAUDE.md dan)
pnpm monorepo: `rules` (sof TS dvigatel + Vitest), `server` (Node, Fastify, WebSocket, PostgreSQL), `client` (Expo RN + veb), `content` (JSON + Zod), `admin` (React). Qat'iy cheklovlar: natija faqat serverda; matn faqat `client/src/i18n/uz.ts` (va `rulesText.ts`); katta summa to'liq (`1 020 000`); raqam o'ylab topilmaydi (noaniqlik → `docs/OPEN_QUESTIONS.md` ga yoz va to'xta); karta nomi «KUTILMAGAN HODISA!»; 16 yoshgacha himoya; ilovada faqat do'kon to'lovi.
Buyruqlar: `pnpm typecheck` (**`-s` siz, chiqish kodini tekla** — yashirin xatolar bo'lgan), `pnpm test`, server `cd server && npx tsx src/main.ts`, veb `cd client && npx expo start --web`.

## 3. Ish tartibi (foydalanuvchi talabi)
- `main` ga to'g'ridan-to'g'ri push yo'q: yangi branch → PR → CI yashil → squash-merge (`gh api repos/Dariko-HR-Marketing/D-game/pulls/N/merge --method PUT --input m.json`, `m.json` = `{"merge_method":"squash"}`). GitHub faqat `gh api` REST orqali.
- Foydalanuvchi tasdiq/sana qayta tekshirishni xohlamaydi: berilgan vazifani bajarib ket.
- Token tejash: bir mavzu — bitta chat, aniq so'rov, ortiqcha hisobot yo'q. Javoblar qisqa.
- Commit oxiriga: `Co-Authored-By` va `Claude-Session` qatorlari; PR tavsifiga "Generated with Claude Code".

## 4. Shu sessiyada bajarilgan ishlar (hammasi main da)
1. **Kredit erta to'lash + lombard to'lash.**
2. **Katta aylana:** egalik belgilari (fishka rangidagi dumaloq belgi), har bir katak bosilsa tushuntirish oynasi (tur, nom, narx/daromad, qoida, egasi). Taxta kataklari `dataSet:{dense:"1"}` — bosish maydoni tekshiruvidan istisno (`responsive-check`).
3. **Karta rasmlari:** 610 yangi + 108 qayta chizilgan yuz; generator `server/scripts/render-card-art.ts` (Playwright → webp, `--only=ids`), natija `content/art/generated`; dizayner rasmi kelsa shu nomda almashtiriladi (`docs/CARDS_IMPORT.md`).
4. **Islomiy (halol) moliya — faqat YANGI o'yinlarga** (`halalFin` bayrog'i; eski o'yinlar eski foizli hisobda qoladi):
   - Foiz yo'q, bir martalik haq. Bank krediti: haq 50%, muddat 36 oy; oylik = ceil(summa/36) + ceil(haq/36). Lombard: haq 50%, 12 oy.
   - Farzand chegirmasi: kredit berilganda haqning 10% har farzand uchun. Erta to'lasa ham to'liq haq to'lanadi.
   - Atamalar o'zgartirilmagan, qavsda islomiy nomi: murobaha, rahn, mudoraba, sukuk, takaful. Kartalar moslashtirilgan, o'chirilmagan.
   - Kechikish: oylik naqd yetmasa `arrears` yig'iladi; 36-oyda to'lanmagan kredit `overdue` → auksion. `settleOwe` naqd paydo bo'lganda arrearsni ham yopadi.
   - RULES: `bankFeePct:50, childFeeDiscountPct:10, lombardFeePct:50`; yordamchilar `oneTimeFee, bankLoanMonthly, bankLoanPayoff, bankLoanDebt, newBankLoanMonthly, lombardMonthly, lombardPayoff`.
5. **Auksion tizimi** (`rules/src/auction.ts`, server taymeri `armAuction` rooms.ts da):
   - **Majburiy** (garov/muddati o'tgan kredit): boshlang'ich narx = mulkning narxi; bank qarzi bankka, ortiqcha egasiga; bir nechta garovda eng qimmati birinchi; hech kim olmasa mulk egasida qoladi, qarz `owe` bo'lib qaytadi.
   - **Ixtiyoriy**: egasi o'z bo'sh mulkini 50–100% (qadam 10) ga qo'yadi, pulning hammasi egasiga; avval o'z krediti yopiladi; sotilmasa `relistLaps`=4 aylanadan keyin qayta qo'yiladi.
   - **Bozor**: sotib olib bo'lmaydigan karta (`cannotBuyAnyWay`), faqat kichik aylana, pul bankka.
   - Umumiy: faqat naqd; faqat shu aylanadagi 16+ qatnashchi; boshlang'ich narxni to'lay oladigan kamida `auctionMinBidders`=2 qatnashchi; boshqa aylana qatnasha olmaydi, kuzatadi; taklif qadami `auctionBidStep`=100; egasiga qaror vaqti 1× navbat vaqti (30 s), ochiq bosqich ×`auctionTimeFactor`=5 (150 s); vaqtsiz xonada hamma o'tkazganda yopiladi; botlar 90–110% gacha, 5% sakrash bilan.
   - Harakatlar: `auction_buyback|decline|bid|list|pass|close` (`auction_close` faqat server). `reduce` da `auction_open` boshqa harakatlarni to'sadi.
6. **Aylanalar qoidasi (buyurtmachi qarori 2026-11-09):** qarzni faqat kichik aylana o'yinchisi so'raydi (beruvchi istalgan aylanadan); sheriklikni faqat kichik aylana o'yinchisi taklif qiladi (sherik istalgan aylanadan); suyunchi faqat kichik aylanada. Xato kodlari `big_cannot_borrow`, `big_cannot_offer_partner`. `CLAUDE.md` §2.7 va SPEC §5.3/§5.6 yangilangan.
7. **Karta yuzi:** umumiy narx + katta (34px, oltin chegara) «Hozir to'lanadi» (`DecisionCard.tsx`).
8. **Sayqal (#35):** tik telefonda sarlavhadan «Qoidalar» olib tashlandi, vaqt paneli zichroq, "Kichik aylana" chipi/izohi faqat aralash o'yinda, deploy sirsiz qizil xato bermaydi.
9. **CI tuzatishlari:** typecheck xatolari, `calc-check` ochiq auksionlarni yopadi, `auction-check` sahifa yangilanishini kutadi, `responsive-check` `[data-dense]` ni istisno qiladi.

## 5. Muhim texnik tafsilotlar
- Dvigatel jurnalni qayta o'ynaydi (`reduce`); eski o'yinlar buzilmasligi uchun yangi maydonlar ixtiyoriy (`since, overdue, arrears, fee`) va holat bayroqlari (`halalFin`) bilan.
- Bot auksion: `pct = 90 + (charCode yig'indisi % 3)*10`, `max=floor(value*pct/100/step)*step`, `jump=max(step, ceil(start*0.05/step)*step)`. Birinchi taklif qadamga yuqoriga yaxlitlanadi.
- Kontent: manba `content/imports/tajriba24/tajriba24_cards_import.csv` → `pnpm --filter @tajriba24/content cards import --apply` → `content/data/cards.json`. Katalog: faol 1033, jonli 817. `content/src/effects.ts` dagi regex matn o'zgarsa buzilishi mumkin (`lendRequest` tuzatilgan).
- Fayllar: `client/src/ui/AuctionLayer.tsx`, `Actions.tsx` (ixtiyoriy joylash 50–100), `DecisionCard.tsx`, `Board.tsx`; `client/src/model.ts` (`partnerCandidates`, `loanGivers`); `rules/src/{index,engine,game,auction}.ts`; testlar `rules/src/{auction,halal,crosscircle}.test.ts`, `server/src/auction.test.ts`, skript `server/scripts/auction-check.ts`.
- RN-web da `data-*` uchun `dataSet` prop kerak (oddiy `data-dense` DOM ga o'tmaydi).
- Yangi xato kodlari/matnlar `uz.ts` da: `big_cannot_borrow`, `big_cannot_offer_partner`, `relist_wait`, `few_bidders`, auksion bloki.

## 6. Ochiq ishlar (ustuvorlik tartibida)
1. **Deployni tasdiqlash:** foydalanuvchi serverda `git log -1` (=`2ad0a7f`), `docker compose ps`, `docker compose logs --tail=50 server` natijasini beradi; yangi o'yinda "Hozir to'lanadi", auksion, katak tushuntirishi tekshiriladi. Saytning domeni (`APP_DOMAIN/API_DOMAIN`) repoda yo'q — foydalanuvchidan so'ra.
2. **Avtomatik deploy:** foydalanuvchi GitHub Secrets'ga `DEPLOY_*` ni qo'shadi.
3. **20 ta «AUKSION» katalog kartasi** ulanmagan (matndan daromadni ajratish kerak; bozor infratuzilmasi tayyor).
4. **Dizayner:** `Q_001` va `099_Q` karta rasmlari qayta chizilsin (OPEN_QUESTIONS 170). Karta matni yana o'zgarsa, yuzlarni `render-card-art.ts --only=ids` bilan qayta chiqar.
5. **Tasdiqlanmagan taxmin:** "ikkita" = sotuvchidan tashqari kamida ikkita to'lov qila oladigan raqib (OPEN_QUESTIONS 173).
6. Boshqa ochiq masalalar: TURN server, to'lovlar (MVP'dan keyin), UX/UI sayqali (vazifa #15), 16 yoshgacha himoya (yurist xulosasi).
7. Foydalanuvchining oldingi noaniq so'rovi: "kreditni uy/o'yinni boshlashdan oldin..." — hech qachon aniqlashtirilmagan; kerak bo'lsa so'ra.

## 7. Yangi chat uchun birinchi xabar (nusxa ko'chiring)
> Repoda `CLAUDE.md`, `docs/OPEN_QUESTIONS.md` va `HANDOFF.md` ni o'qi. `main` da (commit 2ad0a7f) auksion formatlari, halol moliya, aylanalar qoidasi, karta yuzi tayyor va deploy qilingan. Tartib: yangi branch → PR → CI yashil → squash-merge. Qisqa javob ber, o'zbekcha. Birinchi vazifa: …

Eski suhbatning to'liq yozuvi (kerak bo'lsa): `/root/.claude/projects/-home-user-D-game/9d2ba933-94f6-572e-b226-c7561aeb90ac.jsonl` (faqat shu sessiya konteynerida mavjud).
