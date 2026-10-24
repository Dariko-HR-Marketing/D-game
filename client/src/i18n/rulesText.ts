// §15: qoidalar ilovada manbasi (SPEC bo'limi) bilan ko'rinadi. Raqamlar dvigatelning RULES konstantalaridan olinadi — qo'lda yozilmaydi.
import type { RULES } from "@poyga/rules";
import { POINTS, BALL, XP } from "@poyga/rules";
import { money } from "../format";

export interface RuleItem { id: string; title: string; text: string; source: string }
type R = { [K in keyof typeof RULES]: number }; // kengaytirilgan tur: test boshqa qiymatlar bilan chaqira oladi

export function ruleItems(r: R): RuleItem[] {
  const m = money;
  return [
    { id: "turn", title: "Navbat va oy", source: "SPEC §5.1",
      text: "Bitta kubik tashlanadi, tushgan songa teng qadam yurasiz. Kichik aylana 48, katta aylana 53 katakdan iborat. «D» (daromad) katagidan o'tganingizda yoki unga tushganingizda bitta oy o'tadi va pul oqimi naqdingizga qo'shiladi." },
    { id: "card", title: "Karta qarori", source: "SPEC §5.2",
      text: `Har bir karta uchun ${r.cardDecisionSeconds} soniya beriladi. Ixtiyoriy karta vaqt tugasa o'tkaziladi. Majburiy karta avtomatik qabul qilinadi va blankka yoziladi. Deka qaytarmasdan tortiladi, tugagach tashlangan kartalar aralashtiriladi.` },
    { id: "timers", title: "Vaqt va avtopilot", source: "SPEC §5.2",
      text: `Kubik tashlash uchun ${r.timerDiceSeconds} soniya, karta qarori uchun ${r.cardDecisionSeconds}, birovning biznesi bo'yicha qaror uchun ${r.timerRentSeconds}, majburiy to'lov qarori uchun ${r.timerForcedPaySeconds} soniya beriladi; bozor taklifi ${r.timerMarketSeconds} soniya turadi. «Sekin» xonada hamma vaqt ikki baravar. Ketma-ket ${r.autopilotAfter} marta vaqt tugasa o'yinchi avtopilotga o'tadi: navbatlari kutmasdan o'tkaziladi (ixtiyoriy kartalar o'tkaziladi, har safar −2 ball). «Men qaytdim» tugmasi yoki o'zingiz harakat qilsangiz avtopilot o'chadi. ${r.disconnectAutopilotMinutes} daqiqadan ortiq uzilgan o'yinchi ham avtopilotda turadi; o'rni saqlanadi va qaytsa davom etadi. Hamma odam uzilsa o'yin to'xtab turadi.` },
    { id: "bank", title: "Bank krediti", source: "Qo'llanma §08",
      text: `Mini-kredit ${m(r.bankMin)}–${m(r.bankMax)} sh.b., ${r.bankTermMonths} oy, yillik ${Math.round(r.bankAnnualRate * 100)} %. Oylik to'lov = summa / ${r.bankTermMonths} + summa × ${Math.round(r.bankAnnualRate * 100)} % / 12 (xarajatga qo'shiladi). Garov — kredit summasining ${Math.round(r.bankCollateralShare * 100)} %: aktivlaringiz garovda qoladi va sotilmaydi. Faqat biznes, aksiya yoki aktiv sotib olish uchun; to'lov daromaddan katta bo'lsa bank bermaydi. Muddatidan oldin yopish — kamida 3 aylanadan (${r.bankEarlyCloseMonths} oy) keyin.` },
    { id: "lombard", title: "Lombard", source: "Qo'llanma §08",
      text: `Aktivni garovga qo'yib qiymatining ${Math.round(r.lombardShare * 100)} % ini naqd olasiz (qimmatbaho qog'ozlar va sheriklikdan tashqari). Foiz oyiga ${Math.round(r.lombardMonthlyRate * 100)} % (xarajatga qo'shiladi), asosiy qarz ${r.lombardTermMonths} oydan keyin birdaniga. Foiz yoki asosiy qarz to'lanmasa garov yo'qoladi.` },
    { id: "debt", title: "Qarz (kichik aylana)", source: "Qo'llanma §09",
      text: `Naqd yetmasa summa qarz sifatida yoziladi va naqd paydo bo'lishi bilan darhol qaytariladi. Qarz ${m(r.bankLimit)} sh.b. dan oshsa — avval aktivlaringiz (biznes, uy, aksiya, obligatsiya) sotilib qarzga yo'naltiriladi; qarz hali ham chegaradan oshsa kasbingiz almashadi. Bolalar, jarimalar, imtiyozlar va qoldiq qarz saqlanadi.` },
    { id: "exit", title: "Kichik aylanadan chiqish", source: "SPEC §5.4",
      text: `Uchta shart bir vaqtda bajarilishi kerak: naqd ≥ ${m(r.exitCash)}; oylik passiv pul oqimi ≥ ${m(r.exitPassiveFlow)}; qarz va kreditlar = 0. Chiqishdan oldin hamkorlik qarzlari va sheriklik yopilgan bo'lishi shart.` },
    { id: "win", title: "Katta aylana: g'alaba", source: "SPEC §5.5",
      text: `G'alaba uchun uchta shart: oylik pul oqimi ≥ ${m(r.winCashflow)}; orzu katagiga tushish (istalgan «O» katak); naqd ≥ orzu qiymati.` },
    { id: "suyunchi", title: "Suyunchi", source: "SPEC §5.6",
      text: `Farzand tug'ilsa bank ${m(r.suyunchiBank)} sh.b. beradi. Har bir o'yinchi ixtiyoriy ${m(r.suyunchiMin)}–${m(r.suyunchiMax)} sh.b. (${r.suyunchiStep} qadam bilan) berishi mumkin, naqdidan oshmasligi kerak. Navbatni to'xtatmaydi; faqat kichik aylanada.` },
    { id: "loan", title: "O'zaro qarz", source: "SPEC §5.6",
      text: `Kamida ${r.mutualMinPlayers} o'yinchi kerak (oluvchi, beruvchi va guvohlar). Beruvchi naqdining ≤ ${Math.round(r.mutualGiverCashShare * 100)} % ini beradi; oluvchi limiti (maosh + passiv) × ${Math.round(r.mutualLimitShare * 100)} % × ${r.mutualMaxMonths} oy. Foizsiz, ${r.mutualMaxMonths} oygacha; to'lov ixtiyoriy. Botlar qatnashmaydi.` },
    { id: "partner", title: "Sheriklik", source: "SPEC §5.6",
      text: `Faqat sarmoya bizneslari uchun, naqd va bank limiti tugagach. Narx va foyda 50/50 bo'linadi, sherik faqat naqd to'laydi. Sherikning to'lagan ulushi foyda bilan qaytgach u yana ${r.partnerDividendMonths} oy dividend oladi, so'ng ulush egasiga bepul o'tadi. Egasi xohlasa to'liq narx + 1 oylik foyda evaziga erta sotib olishi mumkin. Sheriklik yopilmaguncha katta aylanaga chiqib bo'lmaydi.` },
    { id: "dream", title: "Orzu tanlash", source: "SPEC §6.4",
      text: `O'yin boshida har bir o'yinchi o'z orzusini tanlaydi (ikki kishi bir orzuni tanlay olmaydi). ${r.dreamSeconds} soniyada tanlamasangiz, bo'sh orzulardan biri avtomatik beriladi.` },
    { id: "crisis", title: "Jahon inqirozi", source: "SPEC §5.7",
      text: `«Kutilmagan hodisa» inqirozi har bir o'yinchida ${r.crisisLaps} aylana (${r.crisisLaps * 4} oy) davom etadi: shu paytda yer, dala-hovli, kvartira va aksiyalarni sotish ham, sotib olish ham narxi 2 baravar past. Tugaganda sizga xabar keladi.` },
    { id: "qar", title: "Qarov (QAR)", source: "SPEC §5.8",
      text: `Oyiga ${m(r.qarMonthly)} sh.b. to'laysiz (oylik xarajat + ${m(r.qarMonthly)}).` },
    { id: "level", title: "Ball, daraja va liga", source: "SPEC §5.9",
      text: `Ball: o'yinni oxirigacha o'ynash +${BALL.finish} (kamida ${BALL.minHumansFinish} odam), kichik aylanadan chiqish +${BALL.exit}, g'alaba +${BALL.win}, 1/2/3-o'rin +${BALL.place.join("/")} (6 kishilikda; kamroqda o'yinchilar soniga mutanosib), kunning birinchi o'yini +${BALL.firstOfDay}, o'quv o'yini +${BALL.tutorial} (bir marta). Kunlik chegara ${BALL.dailyCap} ball, ball ${BALL.expireDays / 30 | 0} oy amal qiladi; botlar bilan o'yin ball bermaydi. Avtomatik qaror ${POINTS.auto}, o'yinni tashlab ketish ${POINTS.abandon}, qaytarilmagan o'zaro qarz ${POINTS.unreliable}. Daraja XP dan: tugatilgan o'yin +${XP.game} XP (botlar bilan +${XP.botGame}, birinchi o'quv o'yini +${XP.tutorial}); keyingi daraja uchun ${XP.base} + ${XP.step} × joriy daraja XP, eng yuqori daraja ${XP.maxLevel}. Liga faqat «Reytingli» o'yinlar natijasidan: Bronza 0–1099, Kumush 1100–1299, Oltin 1300–1499, Platina 1500–1699, Olmos 1700+; mavsum 3 oy; mavsumning eng yaxshi 100 o'yinchisi «Donishmand». Reytingli o'yinda daraja yoki toifa ustunlik bermaydi.` },
    { id: "smallcells", title: "Kichik aylana kataklari", source: "Qo'llanma §06",
      text: "Imkoniyat — kichik yoki katta sarmoya kartasi (naqd 25 000 dan ko'p bo'lsa tanlaysiz). Bozor — karta hammaga tegishli bo'lishi mumkin. Xarajatlar — to'lanadi. Daromad — pul oqimi. «Siz ota bo'ldingiz» — suyunchi. «Ishdan bo'shadingiz» — bir aylana (4 oy) maosh yo'q, xarajat to'lanadi. «Boshidan boshlang» — xona egasi yoqsa «Kutilmagan hodisa» kartasi; o'chirilgan bo'lsa oddiy katak." },
    { id: "job", title: "Ishdan bo'shash", source: "Qo'llanma §09",
      text: "Uchinchi kichik yoki birinchi katta biznesni sotib olganingizda ishdan bo'shaysiz: maosh to'xtaydi, faqat biznes daromadi qoladi." },
    { id: "bigcells", title: "Katta aylana kataklari", source: "Qo'llanma §11",
      text: "Yana pullar — o'tganda ham, tushganda ham bir oy: pul oqimi, qarz bo'lsa darhol yopiladi. Turg'un biznes — faqat naqd. Tavakkal biznes — to'liq narx naqd + bitta kubik: yutuqli son tushsa biznes sizniki (yoki bir martalik pul), aks holda pul qaytmaydi. Orzu — o'z orzuingiz bo'lsa va shartlar bajarilsa g'alaba, aks holda katta aylana xarajat kartasi. Audit — naqdning 20 %, Ajrashish — 50 %, Bankrot — eng kam daromadli biznesni yo'qotish, Nohalol biznes — 1-marta 1 000 000, 2-marta naqdning 20 %, 3-marta ta'sirsiz." },
    { id: "rent", title: "Birovning biznesiga tushsangiz", source: "Qo'llanma §13",
      text: "O'zingizniki bo'lsa e'tibor bermang. Boshqaniki bo'lsa: A — oylik daromadni egasiga to'laysiz; B — darhol 2× narxda sotib olasiz (egasi sotishga majbur, biznesga 2 ta egalik fishkasi qo'yiladi; keyingi safar faqat 3× narxda). Pul yetmasa qarz yoziladi va «Yana pullar» katagida yopiladi, bir aylanada yopilmasa biznes bankka sotiladi." },
    { id: "under16", title: "16 yoshgacha", source: "SPEC §2.8",
      text: "O'zaro qarz va sheriklik yopiq, erkin chat yo'q, reklama yo'q; to'lov ota-ona tasdig'i bilan." },
    { id: "circles", title: "Aylanalar o'rtasida", source: "SPEC §2.7",
      text: "Kichik va katta aylana o'yinchilari o'rtasida qarz, sheriklik va suyunchi bo'lmaydi." },
    { id: "fair", title: "Halollik", source: "SPEC §1, §6.6",
      text: "Natija faqat serverda hisoblanadi, kubik va deka aralashtirish serverda tekshiriladigan manbadan; o'yin jurnali nizo uchun saqlanadi. Pulli qo'shimchalar o'yin natijasiga ta'sir qilmaydi." },
  ];
}
