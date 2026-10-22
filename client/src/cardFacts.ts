// Karta qarori uchun raqamlar: o'yinchi narx, boshlang'ich to'lov, daromad va pul oqimiga ta'sirni ko'rib qaror qiladi.
import { crisisAdjusted, newAssetIncome, passiveIncome, salaryOf, RULES } from "@poyga/rules";
import { uz } from "./i18n/uz";
import { opsFacts, offerFacts, depositFacts } from "./opsFacts";

export interface FactRow { label: string; value: string; tone?: "good" | "bad" | "neutral" }
export interface Facts {
  rows: FactRow[];
  /** Hozir kerak bo'ladigan naqd (yo'q bo'lsa null) */
  need: number | null;
  /** Naqd yetadimi (need yo'q bo'lsa null) */
  affordable: boolean | null;
  /** Naqd yetmasa: bank krediti bilan yopiladimi (limit ichida) */
  bankCovers: boolean | null;
  /** Oylik pul oqimiga ta'sir (taxminiy, +/−); noma'lum bo'lsa null */
  flowDelta: number | null;
  notes: string[];
}
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const signed = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n));
const F = uz.facts;

interface P { cash: number; salary: number; assets: { kind: string; monthlyIncome: number }[]; crisisMonths?: number; bankDebt?: number; mods?: any[] }

export function cardFacts(effect: any, p: P, bankRoom = 0): Facts {
  const rows: FactRow[] = []; const notes: string[] = []; let need: number | null = null; let flow: number | null = null;
  const e = effect ? crisisAdjusted(effect, p) : effect;
  if ((p.crisisMonths ?? 0) > 0 && JSON.stringify(crisisAdjusted(effect, { crisisMonths: p.crisisMonths })) !== JSON.stringify(effect)) notes.push(F.crisisNote);
  else if (effect && JSON.stringify(e) !== JSON.stringify(effect)) notes.push(F.priceModNote); // faol «xarid narxi» ta'siri (bozor hodisasi)
  switch (e?.kind) {
    case "buy": {
      need = e.down ?? e.price;
      rows.push({ label: F.price, value: fmt(e.price) });
      if (e.credit) { rows.push({ label: F.down, value: fmt(need!) }); rows.push({ label: F.credit, value: fmt(e.credit) }); }
      const income = newAssetIncome(p, e), pay = -(e.creditPayment ?? 0); // kartada foiz manfiy yoziladi; daromad — faol bozor ta'sirlari bilan (server shunday hisoblaydi)
      if (income !== (e.monthlyIncome ?? 0)) notes.push(F.incomeModNote.replace("{n}", fmt(e.monthlyIncome ?? 0)));
      if (income) rows.push({ label: F.income, value: signed(income), tone: "good" });
      if (pay) rows.push({ label: F.creditPay, value: signed(-pay), tone: "bad" });
      flow = income - pay; if (flow !== 0 || income || pay) rows.push({ label: F.flowDelta, value: signed(flow), tone: flow >= 0 ? "good" : "bad" });
      if (e.marketValue === null) notes.push(F.unknownValue);
      break;
    }
    case "buyShares": need = e.min * e.pricePerShare; rows.push({ label: F.perShare, value: fmt(e.pricePerShare) }, { label: F.range, value: `${e.min}–${e.max}` }, { label: F.minCost, value: fmt(need!) }); break;
    case "gain": rows.push({ label: F.gain, value: signed(e.amount), tone: "good" }); break;
    case "pay": rows.push({ label: F.pay, value: signed(-e.amount), tone: "bad" }); need = e.amount; if (e.needs) notes.push(e.needs === "car" ? F.needsCar : F.needsChild); break;
    case "lendRequest": need = e.amount; rows.push({ label: F.lend, value: fmt(e.amount) }, { label: F.lendBack, value: fmt(e.returnAmount), tone: "good" }); notes.push(F.lendNote); break;
    case "qarOffer": rows.push({ label: F.qarMonthly, value: signed(-e.monthlyExpense), tone: "bad" }); flow = -e.monthlyExpense; notes.push(F.qarNote); break;
    case "courseSalaryPlus": { need = e.price; const plus = salaryOf({ salary: p.salary + e.salaryPlus, mods: p.mods }) - salaryOf({ salary: p.salary, mods: p.mods }); // faol ish haqi ta'siri bilan (server shunday hisoblaydi)
      rows.push({ label: F.price, value: fmt(e.price) }, { label: F.salaryPlus, value: signed(plus), tone: "good" }); flow = plus; if (plus !== e.salaryPlus) notes.push(F.salaryModNote.replace("{n}", fmt(e.salaryPlus))); break; }
    case "charity": { need = Math.round(e.incomeShare * (p.salary + passiveIncome({ assets: p.assets } as any))); rows.push({ label: F.charity, value: fmt(need) }, { label: F.twoDice, value: `${e.turns}` }); break; }
    case "carInsurance": need = e.price; rows.push({ label: F.price, value: fmt(e.price) }); if (!p.assets.some((a) => a.kind === "car")) notes.push(F.noCar); break;
    case "payOrLoseBusiness": need = e.amount; rows.push({ label: F.pay, value: signed(-e.amount), tone: "bad" }); notes.push(F.hod7Note); break;
    case "gamble": {
      need = e.price; rows.push({ label: F.price, value: fmt(e.price) }, { label: F.faces, value: (e.faces as number[]).join(` ${F.facesOr} `) });
      if (e.lump) rows.push({ label: F.winLump, value: signed(e.lump), tone: "good" }); else if (e.monthlyIncome) { rows.push({ label: F.winMonthly, value: signed(e.monthlyIncome), tone: "good" }); flow = e.monthlyIncome; }
      notes.push(F.gambleNote); break;
    }
    case "rentChoice": need = null; rows.push({ label: F.income, value: signed(-e.income), tone: "bad" }, { label: F.rentMult, value: `${e.mult}× · ${fmt(e.buyPrice)}` }); notes.push(F.rentNote.replace("{n}", String(e.mult))); break;
    case "ops": { const o = opsFacts(e); rows.push(...o.rows); notes.push(...o.notes); need = o.cost; break; }
    case "deposit": { const o = depositFacts(e); rows.push(...o.rows); notes.push(...o.notes); need = o.cost; break; }
    case "xpInfo": rows.push({ label: uz.ops.xp.title, value: uz.ops.xp.value.replace("{n}", String(e.amount)), tone: "good" }); notes.push(e.sponsor ? uz.ops.xp.sponsor : uz.ops.xp.note); break;
    case "quiz": notes.push(uz.ops.quiz.note); break;
    case "sellOffer": { const o = offerFacts(e); rows.push(...o.rows); notes.push(...o.notes); break; }
    default: break;
  }
  const affordable = need === null ? null : p.cash >= need;
  const bankCovers = need === null || affordable ? null : need - p.cash <= bankRoom;
  return { rows, need, affordable, bankCovers, flowDelta: flow, notes };
}
export const BANK_LIMIT = RULES.bankLimit;
