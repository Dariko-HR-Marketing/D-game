# Maketlar (Design canvas «D-game · POYGA — o'yin maketlari») va kod

Manba: foydalanuvchi bergan Design artifact (53 mobil ekran N01–N53, kompyuter D1–D11, planshet T2–T9, konsepsiya C1–C6, 412 karta).
Holat — **kodda bor / qisman / yo'q**. «Qisman» — mantiq bor, ko'rinish maketga to'liq mos emas. Piksel darajasida solishtirilmagan (faqat N05, N11, N13, N12, D1 va N19 render qilib ko'rilgan).

| Maket | Ekran | Holat | Kod |
|---|---|---|---|
| N01 | Xush kelibsiz (taxta rasmi, Boshlash / Hisobim bor) | bor | `ui/Login.tsx` (welcome bosqichi), `assets/board.webp` |
| N02, N03 | Telefon, SMS kod | bor | `ui/Login.tsx` |
| N04 | Profil sozlash | bor | `ui/ProfileScreen.tsx` |
| N05 | Bosh sahifa (salom, qatorlar, pastki navigatsiya) | bor | `ui/Home.tsx` — «Davom etayotgan o'yin» kartasi yo'q: ulanganda o'yin avtomatik tiklanadi |
| N06 | Yangi o'yin sozlamalari | qisman | faqat «Kutilmagan hodisa» tugmasi (`ui/Lobby.tsx`); rejim/vaqt tanlash yo'q (Rejim 2 qo'shilmagan) |
| N07 | Xona | bor | `ui/Lobby.tsx` (rasm, daraja nishoni, yulduz, holat) |
| N08, N10 | Kasb kartasi, Tayyor | qisman | kasb nomi «Moliyaviy holat» da; alohida ekran yo'q |
| N09 | Orzu tanlash | bor | `ui/DreamPick.tsx` |
| N11, N25 | Kichik/katta aylana (kvadrat taxta, ikonli kataklar, o'yinchi lentasi, taymer, CTA) | bor | `ui/Board.tsx`, `ui/Game.tsx`, `ui/PlayersLane.tsx`, `ui/TurnPanel.tsx` |
| N12 | Imkoniyat: dekani tanlash (naqd > 25 000) | bor | `DecisionCard` `DeckChoice`; dvigatel `choose-opp` |
| N13–N17 | Karta varag'i (sarlavha, O'zgarishlar oldin→keyin, ogohlantirish) | bor | `ui/DecisionCard.tsx` |
| N18 | Blank | bor | «Blank» bo'limi: `ui/FinanceCard.tsx` |
| N19 | Bank va lombard (slayder, garov tanlash) | qisman | `ui/Actions.tsx`: summa kiritiladi, garov avtomatik tanlanadi (arzonidan), alohida «Garov tanlash» ekrani yo'q |
| N20 | O'yinchilar | bor | `ui/PlayerList.tsx` |
| N21 | Qoidalar | bor | `ui/RulesScreen.tsx` (qo'llanma bo'yicha yangilangan matn) |
| N22, N39 | Ota bo'ldingiz, Suyunchi | bor | `Actions` (suyunchi) |
| N23, N32 | Kutilmagan hodisa, inqiroz tugadi | bor | `CardToast`, xabarnomalar |
| N24, N26–N29 | Chiqish, turg'un biznes, katak blanki, orzu, g'alaba | qisman | karta varag'i va `Result`; alohida ekranlar yo'q |
| N30, N36, N37, N38 | Profil, reyting, yutuqlar, o'yin tahlili | bor | `ProfileScreen`, `Leaderboard`, `Result` |
| N31 | Kartalar kutubxonasi | yo'q | — |
| N33, N34, N35 | Kubik, vaqt tugadi, boshqa o'yinchi navbati | bor | `Dice`, `TimerRing`, navbat matni |
| N40–N43 | Sheriklik, o'zaro qarz, hamkorlik | bor | `Actions` (16 yoshgacha serverda yopiq) |
| N44, N45, N53, C6 | POYGA Plus, do'kon, daromad modeli | **yo'q** | to'lovlar 2-bosqich — qaror kerak |
| N46, N52 | Hisob, hisobni o'chirish | bor | `ProfileScreen` |
| N47–N49 | Telefon shart, ota-ona tasdig'i | **yo'q** | huquqiy qaror kutilmoqda |
| N50, N51 | Aloqa uzildi, xona to'lgan | bor | oflayn banner, xato matni |
| D1–D3 | Kompyuter o'yin ekrani | qisman | chap panel + taxta; markazda dekalar rasmi (KICHIK SARMOYALAR…) va «Bank / Lombard» tugmalari yo'q (panelda «Moliya amallari») |
| D4, T2, T3, T5–T9 | Planshet | qisman | 900 px dan keng ekranlar bitta kompyuter maketiga tushadi |
| D5, D6, D7, D8, D9 | Xona, hamkorlik, profil, hisob, kirish (kompyuter) | qisman | mobil ekranlar kengaytirilgan, alohida kompyuter maketi yo'q |
| D10 | O'qituvchi paneli | **yo'q** | spetsifikatsiyada yo'q |
| D11 | Homiy turniri | **yo'q** | spetsifikatsiyada yo'q |
| C4 | UI kit (ranglar, Manrope, komponentlar) | bor | `theme.ts` (ranglar maket bilan bir xil), `ui/kit.tsx`, `ui/Icon.tsx`, `ui/Avatar.tsx` |

**Maketdan farqlar (ongli)**: avatar jinsi ko'rsatilmaydi (profilda jins yo'q — soch uslubi ismdan); «1-aylana · 1-oy» o'rniga «N-tur» (dvigatel oylarni o'yinchi bo'yicha sanamaydi); katta aylanada 2 kubik yig'indisi ko'rsatiladi.
