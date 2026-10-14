// §15: qoidalar ilovada manbasi (SPEC bo'limi) bilan ko'rinadi. Raqamlar dvigatelning RULES konstantalaridan olinadi — qo'lda yozilmaydi.
import type { RULES } from "@poyga/rules";
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
    { id: "bank", title: "Pul yetmasa: bank krediti", source: "SPEC §5.3",
      text: `Bank limiti ${m(r.bankLimit)} sh.b. Kreditning oylik to'lovi = summa / ${r.bankTermMonths} + summa × ${Math.round(r.bankAnnualRate * 100)} % / 12, ${r.bankTermMonths} oy davomida. Limitdan oshsa, yangi kasb bilan boshidan boshlanadi.` },
    { id: "exit", title: "Kichik aylanadan chiqish", source: "SPEC §5.4",
      text: `Uchta shart bir vaqtda bajarilishi kerak: naqd ≥ ${m(r.exitCash)}; oylik passiv pul oqimi ≥ ${m(r.exitPassiveFlow)}; qarz va kreditlar = 0. Chiqishdan oldin hamkorlik qarzlari va sheriklik yopilgan bo'lishi shart.` },
    { id: "win", title: "Katta aylana: g'alaba", source: "SPEC §5.5",
      text: `G'alaba uchun uchta shart: oylik pul oqimi ≥ ${m(r.winCashflow)}; o'z orzu katagiga tushish; naqd ≥ orzu qiymati.` },
    { id: "suyunchi", title: "Suyunchi", source: "SPEC §5.6",
      text: `Farzand tug'ilsa bank ${m(r.suyunchiBank)} sh.b. beradi. Har bir o'yinchi ixtiyoriy ${m(r.suyunchiMin)}–${m(r.suyunchiMax)} sh.b. (${r.suyunchiStep} qadam bilan) berishi mumkin, naqdidan oshmasligi kerak. Navbatni to'xtatmaydi; faqat kichik aylanada.` },
    { id: "loan", title: "O'zaro qarz", source: "SPEC §5.6",
      text: `Kamida ${r.mutualMinPlayers} o'yinchi kerak (oluvchi, beruvchi va guvohlar). Beruvchi naqdining ≤ ${Math.round(r.mutualGiverCashShare * 100)} % ini beradi; oluvchi limiti (maosh + passiv) × ${Math.round(r.mutualLimitShare * 100)} % × ${r.mutualMaxMonths} oy. Foizsiz, ${r.mutualMaxMonths} oygacha; to'lov ixtiyoriy. Botlar qatnashmaydi.` },
    { id: "partner", title: "Sheriklik", source: "SPEC §5.6",
      text: "Faqat sarmoya bizneslari uchun, naqd va bank limiti tugagach. Narx va foyda 50/50 bo'linadi, sherik faqat naqd to'laydi. Egasi keyin sherik ulushini to'liq narx + 1 oylik foyda evaziga sotib olishi mumkin. Sheriklik yopilmaguncha katta aylanaga chiqib bo'lmaydi." },
    { id: "qar", title: "Qarov (QAR)", source: "SPEC §5.8",
      text: `Oyiga ${m(r.qarMonthly)} sh.b. to'laysiz (oylik xarajat + ${m(r.qarMonthly)}).` },
    { id: "level", title: "Ball va daraja", source: "SPEC §5.9",
      text: `Har ${m(r.pointsPerLevel)} ball — bitta daraja.` },
    { id: "under16", title: "16 yoshgacha", source: "SPEC §2.8",
      text: "O'zaro qarz va sheriklik yopiq, erkin chat yo'q, reklama yo'q; to'lov ota-ona tasdig'i bilan." },
    { id: "circles", title: "Aylanalar o'rtasida", source: "SPEC §2.7",
      text: "Kichik va katta aylana o'yinchilari o'rtasida qarz, sheriklik va suyunchi bo'lmaydi." },
    { id: "fair", title: "Halollik", source: "SPEC §1, §6.6",
      text: "Natija faqat serverda hisoblanadi, kubik va deka aralashtirish serverda tekshiriladigan manbadan; o'yin jurnali nizo uchun saqlanadi. Pulli qo'shimchalar o'yin natijasiga ta'sir qilmaydi." },
  ];
}
