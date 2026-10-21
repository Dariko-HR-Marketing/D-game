// Aktiv guruhlari (TZ §6.2): jadvaldagi erkin matnli nishon («Savdo va chakana», «Ijara aktivlari», «Elektr taksi parki; Skuter punkti»...) → aniq tanlagich.
// Tanlagich aktivning tuzilgan maydonlariga (soha, tur, nom, belgi) qaraydi; karta matnidan o'qilmaydi. Aniqlanmagan nishon — `null`: karta ushlab turiladi va jadval mualliflari uchun ro'yxatga tushadi.

export type Clause = { sector: string } | { kind: string } | { name: string } | { tag: string } | { code: string };
/** Kamida bittasi mos kelsa aktiv mos (YOKI). `pick`: egasi bitta mos aktivni tanlaydi (jadvaldagi «egasi tanlaydi»). */
export interface Selector { any: Clause[]; pick?: boolean }
/** Aktivning tuzilgan tavsifi (dvigatelda aktivning o'zi shu maydonlarni tashiydi). */
export interface AssetDesc { kind: string; sector?: string; name?: string; tags?: string[]; code?: string }

export const norm = (s: string) => s.toLowerCase().replace(/[‘’'`ʻʼ]/g, "").replace(/\s+/g, " ").trim();

export function matchClause(c: Clause, a: AssetDesc): boolean {
  if ("sector" in c) return !!a.sector && norm(a.sector) === norm(c.sector);
  if ("kind" in c) return a.kind === c.kind;
  if ("name" in c) return !!a.name && norm(a.name).includes(norm(c.name));
  if ("tag" in c) return !!a.tags?.includes(c.tag);
  return a.code === c.code;
}
export const matches = (sel: Selector, a: AssetDesc) => sel.any.some((c) => matchClause(c, a));

const SECTORS = ["Savdo va chakana", "Turizm va mehmondorchilik", "Xizmat va ta’mir", "Ishlab chiqarish", "Transport va logistika", "IT va raqamli", "Energiya", "Agro va oziq-ovqat", "Ta’lim", "Tibbiyot va sog‘liq", "Moliya va mulk xizmatlari"];
const ASSET_SECTORS = ["Kvartira", "Dala hovli", "Yer", "Avtomobil", "Aksiyalar", "Kolleksiya"];
const sec = (...s: string[]): Selector => ({ any: s.map((sector) => ({ sector })) });
const nm = (...n: string[]): Selector => ({ any: n.map((name) => ({ name })) });
const REALTY: Selector = { any: [{ kind: "apartment" }, { kind: "dacha" }, { kind: "land" }] };

/** Jadvaldagi aniq iboralar (normallashtirilgan): qidiruvda soha nomlari va shu ro'yxat ishlatiladi. */
const ALIAS: Record<string, Selector> = {
  "agro aktivlar": sec("Agro va oziq-ovqat"), "turizm aktivlari": sec("Turizm va mehmondorchilik"), "ta’lim aktivlari": sec("Ta’lim"), "tailim aktivlari": sec("Ta’lim"),
  "ijara aktivlari": { any: [{ tag: "ijara" }] }, "ijara aktivi": { any: [{ tag: "ijara" }] }, "kvartira aktivlari": sec("Kvartira"),
  "aksiya": sec("Aksiyalar"), "savdo biznesi": sec("Savdo va chakana"), "it aktivlari": sec("IT va raqamli"), "raqamli bizneslar": sec("IT va raqamli"),
  "kichik biznes": { any: [{ kind: "small_business" }] }, "biznes": { any: [{ kind: "business" }] },
  "savdo va turizm aktivlari": sec("Savdo va chakana", "Turizm va mehmondorchilik"), "kichik xizmat bizneslari": { any: [{ sector: "Xizmat va ta’mir" }] },
  "ishlab chiqarish sexlari": sec("Ishlab chiqarish"), "yer (2 ta karta)": sec("Yer"),
  "mehmon uyi": nm("mehmon uyi"), "quyosh aktivlari": nm("quyosh"), "quyosh stansiyasi": nm("quyosh"), "onlayn dokon": nm("onlayn dokon"), "elektr skuter ijarasi punkti": nm("skuter"),
  "onlayn savdoga bogliq aktivlar": nm("onlayn", "qadoqlash", "kuryer"), "yetkazib berish biznesi": nm("yetkazib", "kuryer"), "savdo va gul biznesi": { any: [{ sector: "Savdo va chakana" }, { name: "gul" }] },
  "konditsioner/ichimlik bizneslari": nm("konditsioner", "ichimlik", "qahva"),
  "dron aktivlari": nm("dron"), "malumot markazlari": nm("malumot markaz", "data"), "3d-ustaxona aktivlari": nm("3d"), "raqamli kurs aktivlari": nm("kurs"),
  "mebel, quritilgan meva, sut aktivlari": nm("mebel", "quritilgan meva", "sut"),
};

/** Bitta iborani tanlagichga aylantiradi (bo'lak, `;` bilan ajratilgan). */
function one(t: string): Selector | null {
  const n = norm(t); if (!n) return null;
  const s = [...SECTORS, ...ASSET_SECTORS].find((x) => norm(x) === n); if (s) return sec(s);
  if (ALIAS[n]) return ALIAS[n];
  const al = Object.entries(ALIAS).find(([k]) => norm(k) === n); if (al) return al[1];
  if (n === "ko‘chmas mulk xarid" || n === "kochmas mulk xarid" || n === "kochmas mulk sotish") return REALTY;
  const m = /^(.+?) \(egasi tanlaydi\)$/.exec(n); if (m) { const inner = one(m[1].replace(/^bitta /, "")); return inner ? { ...inner, pick: true } : null; }
  // «bitta ...» (egasi tanlaydi) bo'lmasa ham nom bo'yicha: aniq nomli aktivlar (jadvalda aktiv nomi sifatida yozilgan)
  return null;
}

/** Nishon matni → tanlagich. `;` bilan ajratilgan bo'laklar YOKI. Hech bo'lak aniqlanmasa `null`. `hint`: «Mos aktiv» uchun kartaning o'z maydonlari (tur nomi, soha). */
export function resolveTarget(text: string, hint?: { cardType?: string; sector?: string }): Selector | null {
  const parts = text.split(";").map((x) => x.trim()).filter(Boolean); if (!parts.length) return null;
  if (norm(text) === "mos aktiv") { // kartaning o'z tavsifi: tur nomi aktiv nomi bo'lgan kartalar (Onlayn do'kon xaridori...) yoki aniq soha
    if (hint?.cardType && !/^bozor/i.test(hint.cardType) && hint.cardType !== "Bozor taklifi") { const byName = ALIAS[norm(hint.cardType)]; if (byName) return byName; if (norm(hint.cardType) === "kolleksiya") return sec("Kolleksiya"); return nm(hint.cardType); }
    if (hint?.sector && hint.sector !== "Boshqa") return sec(hint.sector);
    return null;
  }
  const out: Clause[] = []; let pick = false;
  for (const p of parts) {
    let q = one(p);
    if (!q) { // aktiv nomi sifatida («Elektr taksi parki», «Studiya», «Pavilyon»...): kartaning nomida shu so'z bor aktivlar
      const m = /^(?:moliyaviy: |bir marta: )/.exec(norm(p)); if (m) return null; // moliyaviy mahsulotlar/imtiyozlar: alohida mexanika
      if (/(kartasi|kasb|xarajat|soliq|sheriklik|sug.?urta|jamg.?arma|ovqat|barcha|ofis)/.test(norm(p))) return null; // aktiv emas (karta turi, kasb, xarajat turi)
      q = nm(p);
    }
    out.push(...q.any); pick ||= !!q.pick;
  }
  return { any: out, ...(pick ? { pick: true } : {}) };
}

/** Jonli xarid kartalari yarata oladigan aktivlar to'plamida tanlagichga mos aktiv bormi? (Yo'q bo'lsa karta hech qachon ta'sir qilmaydi — ushlab turiladi.) */
export const satisfiable = (sel: Selector, universe: AssetDesc[]) => universe.some((a) => matches(sel, a));
