// Katalog kartasi → dvigatel ta'siri. Matndan o'qilmaydi: tuzilgan maydonlar (effect*_type/target/value/duration/condition) bo'yicha.
// Aniq talqin qilib bo'lmaydigan yoki dvigatel hali qo'llamaydigan karta `held` (ushlab turilgan) bo'ladi: bazaga yoziladi, kolodaga tushmaydi,
// sababi import hisobotida ko'rinadi. Jadval tuzatilib qayta import qilinsa karta o'zi jonlanadi — kod o'zgarmaydi (TZ §1.3).
import type { CatalogCardT, CatalogEffectT } from "./catalog";
import type { Effect, Mode, Op } from "./effects";
import { resolveTarget, satisfiable, matches, type AssetDesc, type Selector } from "./groups";

export interface CatalogDerived { effect: Effect; mode: Mode; held?: string }

/** 1 aylana = kichik doiradagi «D» kataklari soni = 4 oy (inqiroz 9 aylana = 36 oy bilan bir xil hisob). */
export const LAP_MONTHS = 4;

/** Karta matni: sarlavha + matn (jadvalda ikkalasi ham bo'lishi mumkin). Matn kichik harf bilan boshlansa (jadval xatosi) — tire bilan ulanadi. */
export function catalogText(c: CatalogCardT): string {
  if (c.title && c.text) return /^\p{Ll}/u.test(c.text) ? `${c.title} — ${c.text}` : `${c.title}. ${c.text}`;
  return c.text ?? c.title ?? c.id;
}

/** Qo'llanma §07: «(agar bolangiz/mashinangiz bo'lsa)» — faqat shunday o'yinchi to'laydi. */
export const needsOf = (t: string): "child" | "car" | undefined => { const m = /\(agar ([^)]*)bo[‘'’]lsa\)/i.exec(t)?.[1] ?? ""; return /mashina/i.test(m) ? "car" : /bola|farzand/i.test(m) ? "child" : undefined; };

const intOf = (s: string) => (/^-?\d+$/.test(s.trim()) ? Number(s) : NaN);
const CAT_ASSET_KIND: Record<string, "small_business" | "business" | "apartment" | "dacha" | "land" | "car"> = {
  "Kichik biznes": "small_business", "Kichik ijara": "small_business", "Biznes": "business", "Ko‘chmas mulk (kvartira)": "apartment", "Dala hovli": "dacha", "Ko‘chmas mulk (yer)": "land", "Avtomobil taklifi": "car",
};

/** Xarid kartasi → `buy` ta'siri (mavjud dvigatel mexanizmi). */
export function buyOf(c: CatalogCardT): CatalogDerived | null {
  const asset = CAT_ASSET_KIND[c.cardType]; if (!asset || c.price === undefined) return null;
  const base = { code: c.id, price: c.price, sector: c.sector, name: c.title ?? undefined } as const;
  const tags = c.cardType === "Kichik ijara" || (c.rent ?? 0) > 0 ? ["ijara"] : undefined;
  if (asset === "car") return { mode: "optional", effect: { kind: "buy", asset, ...base, tags } };
  if (c.down !== undefined || c.loan !== undefined) return { mode: "optional", effect: { kind: "buy", asset, ...base, down: c.down, credit: c.loan ?? 0, creditPayment: c.loanPayment ?? 0, monthlyIncome: c.rent ?? c.income ?? 0, marketValue: c.marketPrice ?? null, tags } };
  return { mode: "optional", effect: { kind: "buy", asset, ...base, monthlyIncome: c.income ?? c.rent ?? 0, tags } };
}

// ---------- muddat va shartlar ----------
interface Dur { months: number | null; once: boolean; wait: boolean }
/** «Bir marta» / «Doimiy» / «N aylana» / «Keyingi aylana boshidan 1 aylana» → oylar. Noma'lum format — `null` (karta ushlab turiladi). */
function parseDur(d: string | undefined): Dur | null {
  const t = (d ?? "").trim(); if (t === "") return { months: null, once: true, wait: false };
  if (/^(bir marta|1 marta)$/i.test(t)) return { months: null, once: true, wait: false };
  if (/^(doimiy|bir o‘yin)$/i.test(t)) return { months: null, once: false, wait: false };
  let m = /^(\d+) aylana$/i.exec(t); if (m) return { months: Number(m[1]) * LAP_MONTHS, once: false, wait: false };
  m = /^keyingi aylana boshidan (\d+) aylana$/i.exec(t); if (m) return { months: Number(m[1]) * LAP_MONTHS, once: false, wait: true };
  if (/^keyingi aylana boshida$/i.test(t)) return { months: LAP_MONTHS, once: false, wait: true };
  return null;
}
const P: Record<string, Selector> = {
  "kichik biznes bor": { any: [{ kind: "small_business" }] }, "biznes bor": { any: [{ kind: "business" }] }, "ijara aktivi bor": { any: [{ tag: "ijara" }] },
  "onlayn do‘konli o‘yinchi": { any: [{ name: "onlayn do‘kon" }] }, "issiqxonali o‘yinchi": { any: [{ name: "issiqxona" }] }, "ombor egasi": { any: [{ name: "ombor" }] },
};
/** «Kichik biznes egasi» kabi nishon: tortgan o'yinchi, lekin shu aktivi bo'lsagina (aks holda karta o'tkaziladi). */
const OWNER: Record<string, Selector> = { "kichik biznes egasi": P["kichik biznes bor"], "biznes egasi": P["biznes bor"], "ijara aktivi bor o‘yinchi": P["ijara aktivi bor"] };
const who = (t: string): "drawer" | "all" | null => {
  const n = t.trim().toLowerCase();
  if (n === "o‘yinchi" || n === "1 aylana") return "drawer"; // «1 aylana» — jadvaldagi nishon xatosi (Y217): o'yinchi deb olinadi, jadval mualliflariga hisobotda ko'rsatiladi
  if (n === "barcha o‘yinchilar" || n === "barcha") return "all"; if (OWNER[n]) return "drawer"; return null;
};

type Compiled = { ops: Op[]; requires?: Selector; cost?: number } | { held: string };

/** Bitta karta effektlarini `Op` ro'yxatiga aylantiradi. Aniq bo'lmasa — `held` sababi bilan. */
function compileOps(c: CatalogCardT, universe: AssetDesc[]): Compiled {
  const ops: Op[] = []; let requires: Selector | undefined; let cost = 0;
  const market = c.kind === "MARKET_EVENT" || c.kind === "MARKET_SIGNAL" || c.kind === "INCOME_CHANGE" || c.kind === "DEVELOPMENT" || c.kind === "EXPENSE" && c.deck === 4;
  const hasCost = (c.kind === "DEVELOPMENT" || c.kind === "CAREER_EVENT") && c.effects.length === 2 && c.effects[0].type === "NAQD_XARAJAT";
  // kurs/malaka: ish haqi doimiy oshadi, kurs narxi kartaning price maydonida (NAQD_XARAJAT effekti yo'q): o'yinchi to'laydi
  if ((c.kind === "DEVELOPMENT" || c.kind === "CAREER_EVENT") && c.price && c.effects.some((e) => e.type === "ISH_HAQI_QOSHISH") && !c.effects.some((e) => e.type === "NAQD_XARAJAT")) cost = c.price;
  for (const e of c.effects) {
    const v = intOf(e.value), d = parseDur(e.duration), cond = (e.condition ?? "").trim();
    const hold = (r: string): Compiled => ({ held: `${e.type}: ${r}` });
    if (cond && cond !== "—") { // shart: faqat ma'lum shakllar
      const g = P[cond.toLowerCase()];
      if (g) { if (requires && JSON.stringify(requires) !== JSON.stringify(g)) return hold("bir nechta shart"); requires = g; }
      else if (cond === "Mos aktivi bor") { /* nishon aktivi bor o'yinchilarga tegishli: tanlagich o'zi chegaralaydi */ }
      else if (/ushlab turilgan|faqat birinchi rozi/.test(cond)) { /* sotish kartalarida alohida */ }
      else return hold(`shart tushunarsiz: «${cond}»`);
    }
    switch (e.type) {
      case "NAQD_BONUS": case "NAQD_XARAJAT": case "NAQD_JARIMA": {
        if (!Number.isFinite(v) || v === 0) return hold("summa noto‘g‘ri"); const to = who(e.target); if (!to) return hold(`nishon noma’lum: ${e.target}`);
        const own = OWNER[e.target.trim().toLowerCase()]; if (own) { if (requires && JSON.stringify(requires) !== JSON.stringify(own)) return hold("bir nechta shart"); requires = own; }
        if (!d?.once) return hold(`muddat «${e.duration}» (bir martalik kutilgan)`);
        const amount = e.type === "NAQD_BONUS" ? Math.abs(v) : -Math.abs(v);
        if (hasCost && e.type === "NAQD_XARAJAT") { cost += Math.abs(v); break; }
        ops.push({ op: "cash", amount, to }); break;
      }
      case "ISH_HAQI_FOIZ": {
        const to = who(e.target); if (!to) return hold(`kasb guruhi/nishon aniqlanmagan: «${e.target}»`); if (!Number.isFinite(v) || !d) return hold("qiymat/muddat noto‘g‘ri");
        if (/sinov/.test(cond)) return hold("sinov muddati qoidasi aniqlanmagan");
        ops.push({ op: "salaryPct", pct: v, months: d.once ? null : d.months, to }); break;
      }
      case "ISH_HAQI_NOL": { if (who(e.target) !== "drawer" || !d || d.months === null) return hold("muddat/nishon noto‘g‘ri"); ops.push({ op: "salaryZero", months: d.months }); break; }
      case "ISH_HAQI_QOSHISH": { if (!Number.isFinite(v) || v <= 0 || who(e.target) !== "drawer") return hold("qiymat/nishon noto‘g‘ri"); ops.push({ op: "salaryAdd", amount: v }); break; }
      case "OYLIK_XARAJAT": case "OYLIK_DAROMAD": case "DOIMIY_XARAJAT": {
        if (!Number.isFinite(v) || v === 0 || who(e.target) !== "drawer" || !d) return hold("qiymat/nishon/muddat noto‘g‘ri");
        const amount = e.type === "OYLIK_DAROMAD" ? v : -Math.abs(v); ops.push({ op: "monthly", amount, months: d.once ? null : d.months }); break;
      }
      case "XARAJAT_FOIZ": {
        if (who(e.target) !== "all" || !d || d.months === null) return hold(`xarajat nishoni aniqlanmagan: «${e.target}»`); if (!Number.isFinite(v)) return hold("qiymat noto‘g‘ri");
        ops.push({ op: "expensePct", pct: v, months: d.months }); break;
      }
      case "KREDIT_TOLOV_FOIZ": { if (who(e.target) !== "all" || !d || d.months === null || !Number.isFinite(v)) return hold("nishon/muddat noto‘g‘ri"); ops.push({ op: "creditPct", pct: v, months: d.months }); break; }
      case "DAROMAD_FOIZ": case "DAROMAD_NOL": case "DAROMAD_KOPAYTIRISH": {
        const sel = resolveTarget(e.target, { cardType: c.cardType, sector: c.sector }); if (!sel) return hold(`aktiv guruhi aniqlanmagan: «${e.target}»`);
        if (!satisfiable(sel, universe)) return hold(`nishon aktiv o‘yinda yo‘q: «${e.target}»`);
        if (!d) return hold(`muddat tushunarsiz: «${e.duration}»`);
        const months = d.once ? LAP_MONTHS : d.months; // «Bir marta» = 1 aylana; «Doimiy» = o'yin oxirigacha
        if (months === null && e.type !== "DAROMAD_FOIZ") return hold("muddat «Doimiy» nolga tushirish/ko‘paytirish uchun qo‘llanmaydi");
        const to: "drawer" | "all" = market ? "all" : "drawer"; if (sel.pick) { if (c.kind !== "EVENT") return hold("egasi tanlaydi: faqat hodisa kartasida"); }
        if (e.type === "DAROMAD_NOL") ops.push({ op: "income", sel, mode: "zero", value: 0, months, wait: d.wait, to, label: e.target });
        else if (e.type === "DAROMAD_KOPAYTIRISH") ops.push({ op: "income", sel, mode: "mult", value: v, months, wait: d.wait, to, label: e.target });
        else { if (!Number.isFinite(v)) return hold("qiymat noto‘g‘ri"); ops.push({ op: "income", sel, mode: "pct", value: v, months, wait: d.wait, to, label: e.target }); }
        if (!requires && !market) requires = sel; break;
      }
      case "KECHIKTIRILGAN_DAROMAD_FOIZ": case "KECHIKTIRILGAN_NARX_FOIZ": {
        const sel = resolveTarget(e.target, { cardType: c.cardType, sector: c.sector }); if (!sel) return hold(`aktiv guruhi aniqlanmagan: «${e.target}»`);
        if (!satisfiable(sel, universe)) return hold(`nishon aktiv o‘yinda yo‘q: «${e.target}»`); if (!Number.isFinite(v)) return hold("qiymat noto‘g‘ri");
        if (e.type === "KECHIKTIRILGAN_NARX_FOIZ") ops.push({ op: "priceMod", sel, pct: v, side: "sell", months: LAP_MONTHS, wait: true, label: e.target });
        else ops.push({ op: "income", sel, mode: "pct", value: v, months: LAP_MONTHS, wait: true, to: "all", label: e.target }); break;
      }
      case "NARX_FOIZ": {
        const sel = resolveTarget(e.target, { cardType: c.cardType, sector: c.sector }); if (!sel) return hold(`aktiv guruhi aniqlanmagan: «${e.target}»`);
        if (!satisfiable(sel, universe)) return hold(`nishon aktiv o‘yinda yo‘q: «${e.target}»`); if (!Number.isFinite(v) || !d) return hold("qiymat/muddat noto‘g‘ri");
        if (d.once) { if (c.kind === "DEVELOPMENT" || c.kind === "CAREER_EVENT") return hold("bir martalik imtiyoz (karta turi bo‘yicha chegirma) hali yo‘q"); ops.push({ op: "priceNow", sel, pct: v, label: e.target }); }
        else { const side = /xarid/i.test(e.target) ? "buy" : /sotish/i.test(e.target) ? "sell" : c.kind === "DEVELOPMENT" ? "buy" : "both"; ops.push({ op: "priceMod", sel, pct: v, side, months: d.months ?? LAP_MONTHS, label: e.target }); }
        break;
      }
      default: return hold("dvigatel hali qo‘llamaydi");
    }
  }
  if (!ops.length) return { held: "ta’sir yo‘q" };
  return { ops, ...(requires ? { requires } : {}), ...(cost ? { cost } : {}) };
}

/** `universe`: o'yinda jonli xarid kartalari yarata oladigan aktivlar (nishon aktiv hech qachon bo'lmaydigan kartalar ushlab turiladi). */
export function catalogEffect(c: CatalogCardT, universe: AssetDesc[] = []): CatalogDerived {
  const un = (held: string): CatalogDerived => ({ mode: "mandatory", effect: { kind: "unresolved", reason: held }, held });
  if (c.pool === "TEACHER_PANEL") return un("o‘qituvchi paneli kartasi (o‘yin kolodasiga kirmaydi)");
  if (c.needsMapping) return un("effekt tuzilgan maydonlarga hali o‘tkazilmagan (jadvalda needs_engine_mapping)");
  if (!c.draw || !c.publish) return un("jadvalda kolodaga tushirish o‘chirilgan");
  if (c.deck === 1 && c.kind !== "PROFESSION") return un(`${c.kind === "GOAL" ? "missiya" : "karyera"} kartasi: kasb kolodasidan qaysi katakda/qachon tortilishi aniqlanmagan (SPEC §16)`);
  if (c.kind === "ASSET_BUY") { const b = buyOf(c); return b ?? un(`aktiv turi qo‘llanmaydi: ${c.cardType}`); }
  const types = c.effects.map((e) => e.type);
  if (c.kind === "ASSET_SELL_OFFER") {
    const e = c.effects[0]; if (!e || c.effects.length !== 1 || !/^SOTISH_/.test(e.type)) return un(`sotish taklifi: ${types.join("+") || "effekt yo‘q"} qo‘llanmaydi`);
    if (/daromad/i.test(c.display ?? "") && !/sotil|sotish/i.test(c.display ?? "")) return un("sotish taklifining ko‘rsatmasi (display_effect) daromad o‘zgarishini aytadi — effekt turi mos emas (jadvalni tekshiring)");
    const sel = resolveTarget(e.target, { cardType: c.cardType, sector: c.sector }); if (!sel) return un(`sotish taklifi: aktiv guruhi aniqlanmagan («${e.target}», tur «${c.cardType}»)`);
    if (!satisfiable(sel, universe)) return un(`sotish taklifi: nishon aktiv o‘yinda yo‘q («${e.target}»)`);
    const v = intOf(e.value); if (!Number.isFinite(v)) return un("sotish taklifi: qiymat noto‘g‘ri");
    const hold = /ushlab turilgan/.test(e.condition ?? "") ? LAP_MONTHS : 0, first = e.type === "SOTISH_FOIZ_BIRINCHI" || /birinchi rozi/.test(e.condition ?? "");
    return { mode: "optional", effect: { kind: "sellOffer", sel, mode: e.type === "SOTISH_NARX" ? "fixed" : "pct", value: v, first, holdMonths: hold, label: e.target === "Mos aktiv" ? c.cardType : e.target } };
  }
  const OPS_KINDS = new Set(["EXPENSE", "EVENT", "ONE_TIME_INCOME", "INCOME_CHANGE", "MARKET_EVENT", "MARKET_SIGNAL", "DEVELOPMENT", "CAREER_EVENT"]);
  if (OPS_KINDS.has(c.kind)) {
    // eng oddiy holat — bitta pul ta'siri: mavjud `pay`/`gain` mexanizmi (qarz/kredit/restart oqimi bilan)
    const only = c.effects.length === 1 ? c.effects[0] : null;
    if (only && (only.type === "NAQD_XARAJAT" || only.type === "NAQD_JARIMA" || only.type === "NAQD_BONUS") && !(only.condition ?? "").trim() && who(only.target) === "drawer" && parseDur(only.duration)?.once) {
      const a = Math.abs(intOf(only.value)); if (Number.isFinite(a) && a > 0) {
        if (only.type !== "NAQD_BONUS" && (c.kind === "EXPENSE" || c.kind === "EVENT" || c.kind === "MARKET_EVENT")) return { mode: "mandatory", effect: { kind: "pay", amount: a, to: "bank", ...(needsOf(c.text ?? "") ? { needs: needsOf(c.text ?? "") } : {}) } };
        if (only.type === "NAQD_BONUS" && c.kind === "ONE_TIME_INCOME") return { mode: "optional", effect: { kind: "gain", amount: a } };
      }
    }
    const r = compileOps(c, universe); if ("held" in r) return un(`${c.kind}: ${r.held}`);
    const optional = (r.cost ?? 0) > 0 || c.kind === "ONE_TIME_INCOME";
    return { mode: optional ? "optional" : "mandatory", effect: { kind: "ops", ops: r.ops, ...(r.requires ? { requires: r.requires } : {}), ...(r.cost ? { cost: r.cost } : {}) } };
  }
  return un(`dvigatel hali qo‘llamaydi: ${c.kind}${types.length ? ` (${types.join(" + ")})` : ""}`);
}

export { matches };
