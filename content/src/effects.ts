// Har bir karta uchun tipli ta'sir. Ma'lumotdan deterministik hosil qilinadi; qoida to'qilmaydi.
// Aniq bo'lmagan karta `unresolved` bo'ladi va test uni ro'yxatga oladi (SPEC §16).
import type { Cards } from "./schema";
import type { Selector } from "./groups";
import { fileKey } from "./catalog";
import { catalogEffect, catalogText, buyOf } from "./catalogEffects";
import type { AssetDesc } from "./groups";

export type Mode = "optional" | "mandatory";
/** Katalog kartasining bitta ta'siri (TZ §6.1). `to`: kimga tegishli — kartani tortgan o'yinchiga yoki hamma o'yinchiga (har kim o'z aktivlari bo'yicha). `months`: ta'sir muddati (1 aylana = 4 oy), `null` — doimiy.
 *  `wait`: ta'sir keyingi aylana boshida (START dan o'tganda) boshlanadi (alomat, TZ §6.3). */
export type Op =
  | { op: "cash"; amount: number; to: "drawer" | "all" }                                  // NAQD_BONUS (+) / NAQD_XARAJAT, NAQD_JARIMA (−)
  | { op: "salaryPct"; pct: number; months: number | null; to: "drawer" | "all" }       // ISH_HAQI_FOIZ
  | { op: "salaryAdd"; amount: number }                                                    // ISH_HAQI_QOSHISH (doimiy)
  | { op: "salaryZero"; months: number }                                                   // ISH_HAQI_NOL
  | { op: "monthly"; amount: number; months: number | null }                               // OYLIK_DAROMAD (+), OYLIK_XARAJAT / DOIMIY_XARAJAT (−)
  | { op: "expensePct"; pct: number; months: number }                                      // XARAJAT_FOIZ (barcha o'yinchilar): oylik xarajat ±%
  | { op: "creditPct"; pct: number; months: number }                                       // KREDIT_TOLOV_FOIZ (barcha): kredit to'lovlari ±%
  | { op: "income"; sel: Selector; mode: "pct" | "zero" | "mult"; value: number; months: number | null; wait?: boolean; to: "drawer" | "all"; label?: string } // DAROMAD_FOIZ / DAROMAD_NOL / DAROMAD_KOPAYTIRISH
  | { op: "priceNow"; sel: Selector; pct: number; label?: string }                                         // NARX_FOIZ «Bir marta»: egalik qilinayotgan aktivlarning sotish bazasi doimiy o'zgaradi
  | { op: "priceMod"; sel: Selector; pct: number; side: "buy" | "sell" | "both"; months: number; wait?: boolean; label?: string }; // NARX_FOIZ muddatli / KECHIKTIRILGAN_NARX_FOIZ

export type Effect =
  | { kind: "profession"; n: number }
  | { kind: "buy"; asset: "small_business" | "business" | "land" | "dacha" | "apartment" | "car" | "collectible"; code: string;
      price: number; down?: number; credit?: number; creditPayment?: number; monthlyIncome?: number; marketValue?: number | null;
      /** Katalog kartasi: aktivning nomi va sohasi (bozor kartalari soha/nom bo'yicha nishonlaydi), qo'shimcha belgilar (masalan «ijara»). */
      sector?: string; name?: string; tags?: string[] }
  | { kind: "buyShares"; code: string; pricePerShare: number; min: number; max: number; sector?: string }
  | { kind: "gain"; amount: number }
  | { kind: "pay"; amount: number; to: "bank" | "bank_insurable_car"; needs?: "child" | "car" } // needs: karta matnidagi «(agar bolangiz/mashinangiz bo'lsa)» sharti — qo'llanma §07: faqat bola yoki avtomobili borlar to'laydi
  | { kind: "lendRequest"; amount: number; returnAmount: number }
  | { kind: "qarOffer"; monthlyExpense: number }
  | { kind: "qarEvent"; payNow?: number; gainNow?: number; monthlyExpenseIncrease?: number; scope: "drawer" | "holders" } // drawer: faqat kartani olgan (qarovi bo'lsa); holders: qarov kartasi egalari hammasi
  | { kind: "marketSale"; forced?: boolean; targets: string[]; amount: number | Record<string, number> | { addByType: Record<string, number> } | { multiply: number } | { percent: number } }
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
  /** Katalog kartasi: tuzilgan ta'sirlar ketma-ket. `requires`: kartani tortgan o'yinchida mos aktiv bo'lmasa karta o'tkaziladi. `cost`: oldindan to'lov (ixtiyoriy karta: o'yinchi qaror qiladi). */
  | { kind: "ops"; ops: Op[]; requires?: Selector; cost?: number }
  /** Bozor «sotish taklifi» (TZ §6.1): mos aktivni `sotish bazasi × (1 + value/100)` yoki qat'iy narxda sotish. `first`: faqat birinchi rozi bo'lgan o'yinchi. `holdMonths`: aktiv kamida shuncha oy ushlab turilgan bo'lsin. */
  | { kind: "sellOffer"; sel: Selector; mode: "pct" | "fixed"; value: number; first: boolean; holdMonths: number; label?: string }
  | { kind: "unresolved"; reason: string };

/** Kartaning jadvaldagi holati (Tajriba24): reyting havzasi, yosh, soha; `held` — kolodaga tushmaydi (sabab matni); `retired` — olib tashlangan. */
export interface CardInfo { ranked: "BASE" | "EXTENDED"; age?: string; sector?: string; kind?: string; image?: string; goal?: string; held?: string; retired?: string; catalog?: boolean }
export interface CardEffect { deck: string; id: string; file: string; mode: Mode; effect: Effect; text?: string; title?: string; info?: CardInfo }

const num = (s: string) => Number(s.replace(/[^\d.-]/g, ""));
const assetOf = (code: string): "apartment" | "dacha" | "land" => (code === "DX" ? "dacha" : code === "E" ? "land" : "apartment");
const real = (r: unknown) => (typeof r === "number" ? r : null);

function bozorEffect(c: Cards["bozor"][number]): Effect {
  const t = c.code;
  if (c.kind === "Daromad oshadi") return { kind: "businessIncomeIncrease", amount: c.amount as number };
  if (c.kind === "Majburiy to‘lov") return { kind: "qarEvent", payNow: c.amount as number, scope: c.who === "Qarov kartasi egasi" ? "holders" : "drawer" };
  if (c.kind === "Xarajat oshadi") return { kind: "qarEvent", monthlyExpenseIncrease: c.amount as number, scope: c.who === "Qarov kartasi egasi" ? "holders" : "drawer" };
  if (t === "QAR" && c.kind === "Sotish imkoniyati") return { kind: "qarEvent", gainNow: c.amount as number, scope: "holders" }; // №90: kampir meros qoldirgan kvartirani qarov egalari 25 000 ga sotadi (kartada aktiv yo'q — naqd tushadi)
  if (c.kind !== "Sotish imkoniyati") return { kind: "unresolved", reason: `noma'lum bozor turi: ${c.kind}` };
  const a = c.amount;
  const forced = /kuyib ket/i.test(c.text) ? { forced: true as const } : {}; // «aks holda aksiyalar kuyib ketadi» — qo'llanma §07: majburiy sotuv
  if (typeof a === "number") return { kind: "marketSale", ...forced, targets: [t], amount: a };
  if (t === "KV1s / KV2s") {
    const [x, y] = a.split("/").map(num);
    return { kind: "marketSale", forced: true, targets: ["KV1s", "KV2s"], amount: { KV1s: x, KV2s: y } }; // eski uy buzilganda kompensatsiya — majburiy
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

  c.bozor.forEach((b, i) => push("bozor", `bozor-${i + 1}`, b.file, b.kind === "Sotish imkoniyati" && b.code !== "QAR" ? "optional" : "mandatory", bozorEffect(b)));
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
  // Eski xarid kartalariga jadvaldagi soha/belgi (bozor kartalari soha bo'yicha nishonlaydi): meta kalit — fayl.
  for (const ce of out) {
    if (ce.info?.catalog || (ce.effect.kind !== "buy" && ce.effect.kind !== "buyShares")) continue;
    const m = c.meta?.[fileKey(ce.file)]; const ef = ce.effect as { sector?: string; tags?: string[]; kind: string; asset?: string; monthlyIncome?: number };
    if (m?.sector) ef.sector = m.sector;
    if (ef.kind === "buy" && (ef.asset === "apartment" || ef.asset === "dacha") && (ef.monthlyIncome ?? 0) > 0) ef.tags = ["ijara"]; // ijaraga beriladigan ko'chmas mulk
  }
  // Tajriba24 katalogi: har bir karta o'z kodi bilan (`cat-<id>`). Kasb kolodasidagi karyera/missiya kartalari tortish havzasiga kirmaydi (kasb kolodasi faqat kasblar uchun).
  // Bozor/hodisa kartalari nishon aktivlarni jonli xarid kartalari orqali tekshiradi: aktivi hech qachon bo'lmaydigan karta ushlab turiladi.
  const CAT_DECK: Record<number, string> = { 1: "kasb_ext", 2: "kichik", 3: "katta", 4: "bozor", 5: "xar", 6: "kxar", 7: "hod" };
  const universe: AssetDesc[] = [];
  for (const ce of out) if (!ce.info?.catalog && (ce.effect.kind === "buy" || ce.effect.kind === "buyShares")) { const ef = ce.effect as any; universe.push({ kind: ef.kind === "buyShares" ? "shares" : ef.asset, sector: ef.sector, name: ef.name, tags: ef.tags }); }
  for (const k of c.catalog) { const b = k.kind === "ASSET_BUY" && k.pool === "DECK" && k.draw && k.publish ? buyOf(k) : null; if (b && b.effect.kind === "buy") universe.push({ kind: b.effect.asset, sector: b.effect.sector, name: b.effect.name, tags: b.effect.tags }); }
  for (const k of c.catalog) {
    const d = catalogEffect(k, universe);
    out.push({ deck: CAT_DECK[k.deck], id: `cat-${k.id}`, file: k.file ?? "", mode: d.mode, effect: d.effect, text: catalogText(k), title: k.title,
      info: { ranked: k.ranked, age: k.age, sector: k.sector, kind: k.kind, image: k.image, goal: k.goal, ...(d.held ? { held: d.held } : {}), catalog: true } });
  }
  // Karta matni (UI uchun): har kolodada tartib manba massivi bilan bir xil.
  const src: Record<string, string[]> = {
    kasb: c.kasb.map((k) => k.name), kichik: c.kichik.map((k) => k.text), katta: c.katta.map((k) => k.text), bozor: c.bozor.map((k) => k.text),
    xar: c.xar.map((k) => k.text), kxar: c.kxar.map((k) => k.text), hod: c.hod.map((k) => k.text), new: c.new.map((k) => k.text),
  };
  const seen: Record<string, number> = {};
  for (const e of out) { if (e.text !== undefined) continue; const i = (seen[e.deck] = (seen[e.deck] ?? -1) + 1); e.text = src[e.deck][i]; }
  // Eski kartalar uchun jadval ma'lumoti (meta): reyting havzasi, yosh, soha, olib tashlash, koloda o'tkazilishi.
  for (const ce of out) {
    if (ce.info?.catalog) continue;
    const key = ce.id.startsWith("kasb-") ? ce.id : fileKey(ce.file); const m = c.meta?.[key]; if (!m) continue;
    ce.info = { ranked: m.ranked, age: m.age, sector: m.sector, kind: m.kind, image: m.image, goal: m.goal, ...(m.retired ? { retired: m.retired } : {}) }; // eski kartalar dvigatelda allaqachon bor (SPEC §5.10): jadvaldagi draw_enabled/needs_engine_mapping ularni o'chirmaydi
    if (m.deck) ce.deck = m.deck;
  }
  return out;
}

/** Kolodaga tushadigan (tortiladigan) karta: olib tashlanmagan, ushlab turilmagan, ta'siri aniq. */
export const isLive = (ce: CardEffect) => !ce.info?.retired && !ce.info?.held && ce.effect.kind !== "unresolved";

export interface CatalogSummary { active: number; live: number; held: number; retired: number; heldByReason: Record<string, number> }
/** Import hisoboti uchun: faol/o'yinda/ushlab turilgan/olib tashlangan kartalar soni. */
export function catalogSummary(fx: CardEffect[], _cards?: Cards): CatalogSummary {
  const s: CatalogSummary = { active: 0, live: 0, held: 0, retired: 0, heldByReason: {} };
  for (const e of fx) {
    if (e.info?.retired) { s.retired++; continue; }
    s.active++;
    if (isLive(e)) s.live++; else { s.held++; const r = (e.info?.held ?? (e.effect.kind === "unresolved" ? (e.effect as { reason: string }).reason : "")).replace(/\(.*\)/, "").trim(); s.heldByReason[r] = (s.heldByReason[r] ?? 0) + 1; }
  }
  return s;
}
