// Har bir karta uchun tipli ta'sir. Ma'lumotdan deterministik hosil qilinadi; qoida to'qilmaydi.
// Aniq bo'lmagan karta `unresolved` bo'ladi va test uni ro'yxatga oladi (SPEC §16).
import type { Cards } from "./schema";

export type Mode = "optional" | "mandatory";
export type Effect =
  | { kind: "profession"; n: number }
  | { kind: "buy"; asset: "small_business" | "business" | "land" | "dacha" | "apartment" | "car" | "collectible"; code: string;
      price: number; down?: number; credit?: number; creditPayment?: number; monthlyIncome?: number; marketValue?: number | null }
  | { kind: "buyShares"; code: string; pricePerShare: number; min: number; max: number }
  | { kind: "gain"; amount: number }
  | { kind: "pay"; amount: number; to: "bank" | "bank_insurable_car"; needs?: "child" | "car" } // needs: karta matnidagi «(agar bolangiz/mashinangiz bo'lsa)» sharti — qo'llanma §07: faqat bola yoki avtomobili borlar to'laydi
  | { kind: "lendRequest"; amount: number; returnAmount: number }
  | { kind: "qarOffer"; monthlyExpense: number }
  | { kind: "qarEvent"; payNow?: number; monthlyExpenseIncrease?: number; scope: "drawer" | "holders" } // drawer: faqat kartani olgan (qarovi bo'lsa); holders: qarov kartasi egalari hammasi
  | { kind: "marketSale"; targets: string[]; amount: number | Record<string, number> | { addByType: Record<string, number> } | { multiply: number } | { percent: number } }
  | { kind: "businessIncomeIncrease"; amount: number }
  | { kind: "marketCrash"; factor: 0.5 }
  | { kind: "payOrLoseBusiness"; amount: number } // hod #7: pul to'lang YOKI kichik biznesingizdan birini qaytaring (tanlov)
  | { kind: "debtRepaid"; amount: number }
  | { kind: "courseSalaryPlus"; price: number; salaryPlus: number }
  | { kind: "charity"; incomeShare: 0.1; turns: 3; dice: 2 }
  | { kind: "tenantLeft" }
  | { kind: "carInsurance"; price: number }
  | { kind: "floodCarRepair"; amount: number; exemptWithInsurance: true }
  | { kind: "deckChoice"; kichik: number; katta: number } // Imkoniyat, naqd > 25 000: kichik yoki katta sarmoya dekasini tanlash (qo'llanma §06)
  | { kind: "gamble"; price: number; faces: number[]; monthlyIncome?: number; lump?: number } // tavakkal biznes (qo'llanma §11): to'liq narx naqd + 1 kubik
  | { kind: "rentChoice"; cell: number; owner: string; income: number; buyPrice: number; mult: 2 | 3 } // birovning biznesi (§13): A — oylik daromadni to'lash; B — mult × narxda sotib olish
  | { kind: "unresolved"; reason: string };

export interface CardEffect { deck: string; id: string; file: string; mode: Mode; effect: Effect; text?: string }

const num = (s: string) => Number(s.replace(/[^\d.-]/g, ""));
const assetOf = (code: string): "apartment" | "dacha" | "land" => (code === "DX" ? "dacha" : code === "E" ? "land" : "apartment");
const real = (r: unknown) => (typeof r === "number" ? r : null);

function bozorEffect(c: Cards["bozor"][number]): Effect {
  const t = c.code;
  if (c.kind === "Daromad oshadi") return { kind: "businessIncomeIncrease", amount: c.amount as number };
  if (c.kind === "Majburiy to‘lov") return { kind: "qarEvent", payNow: c.amount as number, scope: c.who === "Qarov kartasi egasi" ? "holders" : "drawer" };
  if (c.kind === "Xarajat oshadi") return { kind: "qarEvent", monthlyExpenseIncrease: c.amount as number, scope: c.who === "Qarov kartasi egasi" ? "holders" : "drawer" };
  if (c.kind !== "Sotish imkoniyati") return { kind: "unresolved", reason: `noma'lum bozor turi: ${c.kind}` };
  const a = c.amount;
  if (typeof a === "number") return { kind: "marketSale", targets: [t], amount: a };
  if (t === "KV1s / KV2s") {
    const [x, y] = a.split("/").map(num);
    return { kind: "marketSale", targets: ["KV1s", "KV2s"], amount: { KV1s: x, KV2s: y } };
  }
  if (a.startsWith("+") && a.includes("/")) {
    const v = a.split("/").map(num);
    return { kind: "marketSale", targets: ["KV1", "KV2", "KV3", "KV4"], amount: { addByType: { KV1: v[0], KV2: v[1], KV3: v[2], KV4: v[3] } } };
  }
  if (/^\+\d+%$/.test(a)) return { kind: "marketSale", targets: ["KV*"], amount: { percent: num(a) } };
  if (a === "×2") return { kind: "marketSale", targets: ["KV*"], amount: { multiply: 2 } };
  return { kind: "unresolved", reason: `bozor summasi tushunarsiz: ${a}` };
}

export function deriveEffects(c: Cards): CardEffect[] {
  const out: CardEffect[] = [];
  const push = (deck: string, id: string, file: string, mode: Mode, effect: Effect) => out.push({ deck, id, file, mode, effect });

  c.kasb.forEach((k) => push("kasb", `kasb-${k.n}`, k.file, "mandatory", { kind: "profession", n: k.n }));

  c.kichik.forEach((k, i) => {
    const id = `kichik-${i + 1}`, f = k.file;
    switch (k.code) {
      case "KB": return push("kichik", id, f, "optional", { kind: "buy", asset: "small_business", code: k.code, price: k.price!, monthlyIncome: k.income });
      case "TD": return push("kichik", id, f, "optional", { kind: "gain", amount: k.amount! });
      case "AV": return push("kichik", id, f, "optional", { kind: "buy", asset: "car", code: k.code, price: k.amount! });
      case "QAR": return push("kichik", id, f, "optional", { kind: "qarOffer", monthlyExpense: k.amount! });
      case "E": return push("kichik", id, f, "optional", { kind: "buy", asset: "land", code: k.code, price: k.full!, down: k.down, credit: k.credit, creditPayment: k.interest, monthlyIncome: k.rent, marketValue: real(k.real) });
      case "Q":
        if (/qarzga/.test(k.text)) return push("kichik", id, f, "optional", { kind: "lendRequest", amount: k.amount!, returnAmount: 600 });
        return push("kichik", id, f, "optional", { kind: "buy", asset: "collectible", code: k.code, price: k.amount! });
      default:
        if (k.share !== undefined) return push("kichik", id, f, "optional", { kind: "buyShares", code: k.code, pricePerShare: k.share, min: k.min!, max: k.max! });
        return push("kichik", id, f, "optional", { kind: "unresolved", reason: `kichik kod: ${k.code}` });
    }
  });

  c.katta.forEach((k, i) => {
    const id = `katta-${i + 1}`;
    if (k.income !== undefined && k.credit === undefined)
      return push("katta", id, k.file, "optional", { kind: "buy", asset: "business", code: k.code, price: k.full, monthlyIncome: k.income });
    return push("katta", id, k.file, "optional", { kind: "buy", asset: assetOf(k.code), code: k.code, price: k.full, down: k.down, credit: k.credit, creditPayment: k.interest, monthlyIncome: k.rent, marketValue: real(k.real) });
  });

  c.bozor.forEach((b, i) => push("bozor", `bozor-${i + 1}`, b.file, b.kind === "Sotish imkoniyati" ? "optional" : "mandatory", bozorEffect(b)));
  const needsOf = (t: string): "child" | "car" | undefined => { const m = /\(agar ([^)]*)bo[‘'’]lsa\)/i.exec(t)?.[1] ?? ""; return /mashina/i.test(m) ? "car" : /bola|farzand/i.test(m) ? "child" : undefined; };
  c.xar.forEach((x) => { const needs = needsOf(x.text); push("xar", `xar-${x.n}`, x.file, "mandatory", { kind: "pay", amount: x.amount, to: "bank", ...(needs ? { needs } : {}) }); });
  c.kxar.forEach((x) => push("kxar", `kxar-${x.n}`, x.file, "mandatory", { kind: "pay", amount: x.amount, to: "bank" }));
  c.hod.forEach((h) => {
    // «Aks holda KB laringizdan birini aylanaga qaytaring» — pul yoki biznes: o'yinchi tanlaydi (karta qaroriga aylanadi)
    if (typeof h.amount === "number" && /Aks holda/.test(h.text)) return push("hod", `hod-${h.n}`, h.file, "optional", { kind: "payOrLoseBusiness", amount: h.amount });
    return push("hod", `hod-${h.n}`, h.file, "mandatory",
      typeof h.amount === "number" ? { kind: "pay", amount: h.amount, to: "bank" } : h.n === 8 ? { kind: "marketCrash", factor: 0.5 } : { kind: "unresolved", reason: "hod summasi" });
  });

  // §5.10: 6 yangi karta — har biri o'z dekasiga qo'shiladi (`deck` maydoni: kichik/bozor/xar/hod). Aks holda hech qachon chiqmaydi.
  c.new.forEach((n) => {
    const id = `new-${n.code}`;
    const push = (_d: string, i: string, f: string, m: Mode, e: Effect) => out.push({ deck: n.deck, id: i, file: f, mode: m, effect: e, text: n.text });
    switch (n.code) {
      case "MO": return push("new", id, n.file, "optional", { kind: "courseSalaryPlus", price: n.price as number, salaryPlus: n.salary_plus! });
      case "XAY": return push("new", id, n.file, "optional", { kind: "charity", incomeShare: 0.1, turns: 3, dice: 2 });
      case "IJR": return push("new", id, n.file, "mandatory", { kind: "tenantLeft" });
      case "TOSH": return push("new", id, n.file, "mandatory", { kind: "floodCarRepair", amount: 2000, exemptWithInsurance: true });
      case "SUG": return push("new", id, n.file, "optional", { kind: "carInsurance", price: n.amount as number });
      case "Q": return push("new", id, n.file, "mandatory", { kind: "debtRepaid", amount: n.amount as number });
      default: return push("new", id, n.file, "optional", { kind: "unresolved", reason: `new kod: ${n.code}` });
    }
  });
  // Karta matni (UI uchun): har kolodada tartib manba massivi bilan bir xil.
  const src: Record<string, string[]> = {
    kasb: c.kasb.map((k) => k.name), kichik: c.kichik.map((k) => k.text), katta: c.katta.map((k) => k.text), bozor: c.bozor.map((k) => k.text),
    xar: c.xar.map((k) => k.text), kxar: c.kxar.map((k) => k.text), hod: c.hod.map((k) => k.text), new: c.new.map((k) => k.text),
  };
  const seen: Record<string, number> = {};
  for (const e of out) { if (e.text !== undefined) continue; const i = (seen[e.deck] = (seen[e.deck] ?? -1) + 1); e.text = src[e.deck][i]; }
  return out;
}
