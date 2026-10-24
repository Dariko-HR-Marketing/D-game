// Tajriba24 import: jadval qatorlarini kontentga qo'llash (INSERT / UPDATE / NOCHANGE / REMOVE). Sof funksiyalar: kirish — kontent va qatorlar, chiqish — yangi kontent, jurnal va hisobot.
// Takrorlash xavfsiz (idempotent): bir xil jadvalni ikkinchi marta qo'llash 0 ta o'zgarish beradi. Jurnal orqali oxirgi import qaytariladi (`rollbackImport`).
import { Kasb, type Cards } from "./schema";
import { CatalogCard, type CatalogCardT, type CardMetaT, type RawRow, fileKey, rowToCard, rowToMeta, validateRows, parseCatalogCsv } from "./catalog";
import { parseCsv } from "./csv";

export type DeckKey = "kasb" | "kichik" | "katta" | "bozor" | "xar" | "kxar" | "hod" | "new";
const DECK_KEYS: DeckKey[] = ["kasb", "kichik", "katta", "bozor", "xar", "kxar", "hod", "new"];

/** Kasb uchun jadvalda bo'lmagan maydonlar (v4 «Kasblar» varag'i): jamg'arma, kvartira, avtomobil, bolaga xarajat, ixtiyoriy xarajat qatorlari. */
export interface KasbSupplement { n: number; salary: number; total: number; cf: number; save: number; kv: number; car: number; child: number; exp?: number[] }

export function parseKasbSupplement(csv: string): KasbSupplement[] {
  const rows = parseCsv(csv.replace(/^﻿/, "")); const head = rows[0].map((x) => x.trim());
  return rows.slice(1).map((r) => { const g = (k: string) => (r[head.indexOf(k)] ?? "").trim(); const exp = g("exp") ? g("exp").split("|").map(Number) : undefined;
    return { n: Number(g("n")), salary: Number(g("salary")), total: Number(g("total")), cf: Number(g("cf")), save: Number(g("save")), kv: Number(g("kv")), car: Number(g("car")), child: Number(g("child")), exp }; });
}

/** Jurnal yozuvi: o'zgargan element (kalit bo'yicha) va uning eski/yangi holati. `old: null` — element yo'q edi (INSERT); `new: null` — o'chirildi. */
export interface LogEntry { id: string; op: "INSERT" | "UPDATE" | "NOCHANGE" | "REMOVE"; where: "catalog" | "meta" | DeckKey; key: string | number; old: unknown | null; new: unknown | null; changes?: string[] }
export interface ImportReport {
  importId: string; rows: number; counts: Record<string, number>; inserted: number; updated: number; retired: number; unchanged: number; metaUpdated: number;
  drawEnabled: number; needsMapping: number; imageStatus: Record<string, number>; art: { REDRAW: string[]; NEW_ART: string[] }; warnings: string[];
}
export interface ImportResult { cards: Cards; log: LogEntry[]; report: ImportReport }

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const nz = (s: string) => (s === "" ? undefined : Number(s));
const normText = (s: string) => s.replace(/\s+/g, " ").replace(/[‘’'`ʻʼ]/g, "'").trim();
const DECK_OF: Record<string, Exclude<DeckKey, "new">> = { "Kasb": "kasb", "Kichik sarmoya": "kichik", "Katta sarmoya": "katta", "Bozor": "bozor", "Xarajat": "xar", "Katta aylana xarajati": "kxar", "Kutilmagan hodisa": "hod" };

/** Eski karta: ichida qaysi massivda va qaysi indeksda turibdi. */
function findLegacy(cards: Cards, key: string): { deck: DeckKey; i: number; card: any } | null {
  for (const d of DECK_KEYS) { const arr = (cards as any)[d] as any[]; const i = arr.findIndex((c) => c.file && fileKey(c.file) === key); if (i >= 0) return { deck: d, i, card: arr[i] }; }
  return null;
}

/** Jadval qatori → eski kartaga yoziladigan maydonlar (faqat jadvalda berilganlari). */
function legacyFields(deck: DeckKey, card: any, r: RawRow, supp?: KasbSupplement): Record<string, unknown> {
  const text = r.text || undefined; const price = nz(r.price); const f: Record<string, unknown> = {};
  const put = (k: string, v: unknown) => { if (v !== undefined) f[k] = v; };
  switch (deck) {
    case "kasb": {
      put("name", r.title || undefined); put("salary", nz(r.salary)); const cf = nz(r.monthly_surplus); put("cf", cf);
      if (nz(r.salary) !== undefined && cf !== undefined) f.total = Number(r.salary) - cf;
      if (supp) { for (const k of ["save", "kv", "car", "child"] as const) f[k] = supp[k]; if (f.total === undefined) f.total = supp.total; }
      const total = (f.total ?? card.total) as number; const exp = supp ? supp.exp : card.exp;
      f.exp = exp && exp.reduce((a: number, b: number) => a + b, 0) === total ? exp : undefined; // jami o'zgargan va qatorlar qayta taqsimlanmagan bo'lsa — qatorlar olib tashlanadi (blankda faqat jami xarajat)
      return f;
    }
    case "kichik": {
      put("text", text);
      if (["KB"].includes(card.code)) { put("price", price); put("income", nz(r.income_monthly)); }
      else if (card.share !== undefined) { put("share", nz(r.share_pct)); put("min", nz(r.qty_min)); put("max", nz(r.qty_max)); }
      else if (card.full !== undefined) { put("full", price); put("down", nz(r.down_payment)); put("credit", nz(r.loan)); put("interest", nz(r.loan_payment_monthly)); put("rent", nz(r.rent_monthly)); put("real", nz(r.market_price)); }
      else put("amount", price);
      return f;
    }
    case "katta": {
      put("text", text); put("full", price); put("income", nz(r.income_monthly));
      if (card.down !== undefined) { put("down", nz(r.down_payment)); put("credit", nz(r.loan)); put("interest", nz(r.loan_payment_monthly)); put("rent", nz(r.rent_monthly)); put("real", nz(r.market_price)); }
      return f;
    }
    case "bozor": {
      put("text", text); if (typeof card.amount === "number") put("amount", price);
      const m = /^(.+?) · Kim uchun: (.+)$/.exec(r.display_effect); // «Tur · Kim uchun: kimga» — tur yoki kimga o'zgargan bo'lishi mumkin (087_QAR)
      if (m) { const kinds = ["Sotish imkoniyati", "Daromad oshadi", "Majburiy to‘lov", "Xarajat oshadi"]; if (kinds.includes(m[1])) { put("kind", m[1]); put("who", m[2]); } }
      return f;
    }
    case "xar": case "kxar": case "hod": put("text", text); if (typeof card.amount === "number") put("amount", price); return f;
    case "new": put("text", text); if (typeof card.amount === "number") put("amount", price); if (typeof card.price === "number") put("price", price); return f;
  }
}

/** Jadvalda yo'q kasb bo'lsa jamg'arma/kvartira ma'lumoti: yangi kasb kartasi (`Kxx`) → Kasb yozuvi. */
function newKasb(r: RawRow, supp: KasbSupplement): unknown {
  const salary = Number(r.salary), cf = Number(r.monthly_surplus);
  return Kasb.parse({ n: supp.n, name: r.title, salary, exp: supp.exp && supp.exp.reduce((a, b) => a + b, 0) === salary - cf ? supp.exp : undefined, total: salary - cf, cf, save: supp.save, kv: supp.kv, car: supp.car, child: supp.child, flags: [], file: "" });
}

/** Jadvalni kontentga qo'llaydi. Xato bo'lsa (`validateRows`) hech narsa qo'llanmaydi — istisno tashlaydi. */
export function applyImport(base: Cards, rows: RawRow[], opts: { importId: string; kasb?: KasbSupplement[] }): ImportResult {
  const v = validateRows(rows); if (v.errors.length) throw new Error(`Tekshiruv xatolari (${v.errors.length}):\n${v.errors.slice(0, 20).join("\n")}`);
  const cards = clone(base) as Cards; const log: LogEntry[] = []; const suppOf = new Map((opts.kasb ?? []).map((k) => [k.n, k]));
  const warnings: string[] = [...v.warnings]; const counts: Record<string, number> = {}; let inserted = 0, updated = 0, retired = 0, unchanged = 0, metaUpdated = 0;
  const art = { REDRAW: [] as string[], NEW_ART: [] as string[] }; const imageStatus: Record<string, number> = {};
  const touch = (where: LogEntry["where"], key: string | number, id: string, op: LogEntry["op"], old: unknown, neu: unknown, changes?: string[]) => { if (!same(old, neu)) { log.push({ id, op, where, key, old: old === undefined ? null : clone(old), new: neu === undefined ? null : clone(neu), changes }); return true; } return false; };
  const setMeta = (key: string, m: CardMetaT, op: LogEntry["op"], id: string): boolean => {
    const old = (cards.meta as any)[key]; const merged: CardMetaT = { ...m }; (cards.meta as any)[key] = merged;
    if (touch("meta", key, id, op, old, merged)) { metaUpdated++; return true; } return false;
  };
  const order: Record<string, number> = { REMOVE: 0, UPDATE: 1, NOCHANGE: 2, INSERT: 3 }; // tartib: olib tashlash, yangilash, tegmaslik, qo'shish
  const sorted = [...rows].sort((a, b) => order[a.operation] - order[b.operation]);
  for (const r of sorted) {
    counts[r.operation] = (counts[r.operation] ?? 0) + 1;
    if (r.operation !== "REMOVE") { imageStatus[r.image_status] = (imageStatus[r.image_status] ?? 0) + 1; if (r.image_status === "REDRAW" || r.image_status === "NEW_ART") art[r.image_status].push(r.card_id); }
    if (r.operation === "INSERT") {
      if (r.card_kind === "PROFESSION" && r.deck_no === "1") { // yangi kasb → Kasb yozuvi (№ = kodning raqami)
        const n = Number(/^K(\d+)$/.exec(r.card_id)?.[1]); const supp = suppOf.get(n);
        if (!Number.isInteger(n) || !supp) throw new Error(`${r.card_id}: kasb ma'lumoti (jamg'arma, kvartira, avtomobil, bolaga xarajat) topilmadi — tajriba24_kasblar.csv`);
        const neu = newKasb(r, supp) as any; const i = cards.kasb.findIndex((k) => k.n === n); const old = i >= 0 ? cards.kasb[i] : null;
        if (i >= 0) cards.kasb[i] = neu; else cards.kasb.push(neu);
        if (touch("kasb", n, r.card_id, "INSERT", old, neu)) inserted++; else unchanged++;
        setMeta(`kasb-${n}`, rowToMeta(r), "INSERT", r.card_id); continue;
      }
      const neu = rowToCard(r); const i = cards.catalog.findIndex((c) => c.id === neu.id); const old = i >= 0 ? cards.catalog[i] : null;
      const merged = { ...neu, file: old?.file } as CatalogCardT; if (merged.file === undefined) delete merged.file; // rasm keyin qo'shilgan bo'lsa saqlanadi
      if (i >= 0) cards.catalog[i] = merged; else cards.catalog.push(merged);
      if (touch("catalog", neu.id, neu.id, "INSERT", old, merged)) inserted++; else unchanged++;
      continue;
    }
    const key = fileKey(r.legacy_file); const hit = findLegacy(cards, key);
    if (!hit) throw new Error(`${r.card_id}: ${r.operation} uchun eski karta topilmadi (${r.legacy_file})`); // tranzaksiya bekor: hech narsa yozilmaydi
    const kasbN = hit.deck === "kasb" ? hit.card.n : undefined;
    if (r.operation === "REMOVE") {
      const m = rowToMeta(r); if (setMeta(key, m, "REMOVE", r.card_id)) retired++; else unchanged++; continue;
    }
    if (r.operation === "UPDATE") {
      const supp = kasbN !== undefined ? suppOf.get(kasbN) : undefined;
      const f = legacyFields(hit.deck, hit.card, r, supp); const next: any = { ...hit.card }; const changes: string[] = [];
      for (const [k, val] of Object.entries(f)) { if (val === undefined) { if (k in next) { delete next[k]; changes.push(k); } } else if (!same(next[k], val)) { if (k === "text" && r.old_value && /^(Matn|Imlo|Real|Tur)/.test(r.change_reason) && normText(hit.card.text ?? "") !== normText(r.old_value)) warnings.push(`${r.card_id}: bizdagi matn jadvaldagi old_value dan farq qiladi (oldin qo‘lda o‘zgartirilgan); jadval matni qo‘llandi`); next[k] = val; changes.push(k); } }
      if (hit.deck === "kasb") { const kk = Kasb.safeParse(next); if (!kk.success) throw new Error(`${r.card_id}: kasb sxemasi buzildi: ${kk.error.issues.map((i) => i.message).join("; ")}`); }
      (cards as any)[hit.deck][hit.i] = next; if (touch(hit.deck, hit.deck === "kasb" ? kasbN : key, r.card_id, "UPDATE", hit.card, next, changes)) updated++; else unchanged++;
    } else { // NOCHANGE: karta tegilmaydi. Faqat bizdagi matn jadvaldagidan farq qilsa (masalan, kirill harfi qolib ketgan) jadval matni qo'llanadi va ogohlantiriladi; raqam farqi ogohlantiriladi, qo'llanmaydi.
      const f = legacyFields(hit.deck, hit.card, r, kasbN !== undefined ? suppOf.get(kasbN) : undefined); const key2 = "text" in f ? "text" : "name" in f ? "name" : null;
      const num = Object.keys(f).filter((k) => typeof f[k] === "number" && !same(f[k], hit.card[k])); if (num.length) warnings.push(`${r.card_id}: NOCHANGE, lekin raqam farq qiladi (${num.join(", ")}); tegilmadi`);
      if (key2 && typeof f[key2] === "string" && f[key2] !== hit.card[key2]) {
        const next = { ...hit.card, [key2!]: f[key2!] }; (cards as any)[hit.deck][hit.i] = next;
        if (touch(hit.deck, hit.deck === "kasb" ? kasbN : key, r.card_id, "UPDATE", hit.card, next, [key2!])) { updated++; warnings.push(`${r.card_id}: NOCHANGE, lekin matn jadvaldan farq qilardi — jadval matni qo‘llandi`); } else unchanged++;
      } else unchanged++;
    }
    const mv = DECK_OF[r.deck_name]; const own = hit.deck === "new" ? hit.card.deck : hit.deck; // jadvaldagi koloda eski joydan farq qilsa (008_xarajat, Xarajat_034...): meta orqali o'tkaziladi, karta ID si o'zgarmaydi
    const meta: CardMetaT = { ...rowToMeta(r), ...(hit.deck !== "kasb" && mv && mv !== "kasb" && mv !== own ? { deck: mv } : {}) };
    setMeta(kasbN !== undefined ? `kasb-${kasbN}` : key, meta, r.operation as LogEntry["op"], r.card_id);
  }
  // Orzular guruhi to'liq sinxronlanadi (texnik topshiriq 6.6): jadvalda bo'lmagan mavjud orzu kartalari olib tashlanadi (ID saqlanadi, kolodaga tushmaydi).
  const dreamIds = new Set(rows.filter((r) => r.card_kind === "DREAM" && r.operation !== "REMOVE").map((r) => r.card_id));
  if (dreamIds.size) cards.catalog.forEach((c, i) => {
    if (c.kind !== "DREAM" || dreamIds.has(c.id) || c.retired) return;
    const neu = { ...c, retired: "orzular to'plami almashtirildi (jadvalda yo'q)", draw: false, publish: false } as CatalogCardT; cards.catalog[i] = neu;
    if (touch("catalog", c.id, c.id, "REMOVE", c, neu)) retired++;
  });
  const drawEnabled = rows.filter((r) => r.operation !== "REMOVE" && r.draw_enabled === "TRUE").length, needsMapping = rows.filter((r) => r.needs_engine_mapping === "TRUE").length;
  return { cards, log, report: { importId: opts.importId, rows: rows.length, counts, inserted, updated, retired, unchanged, metaUpdated, drawEnabled, needsMapping, imageStatus, art, warnings } };
}

/** Jurnal bo'yicha oxirgi importni teskari qaytaradi (yozuvlar teskari tartibda). */
export function rollbackImport(current: Cards, log: LogEntry[]): Cards {
  const cards = clone(current) as Cards;
  for (const e of [...log].reverse()) {
    if (e.where === "catalog") { const i = cards.catalog.findIndex((c) => c.id === e.key); if (e.old === null) { if (i >= 0) cards.catalog.splice(i, 1); } else if (i >= 0) cards.catalog[i] = e.old as CatalogCardT; else cards.catalog.push(e.old as CatalogCardT); }
    else if (e.where === "meta") { if (e.old === null) delete (cards.meta as any)[e.key]; else (cards.meta as any)[e.key] = e.old; }
    else if (e.where === "kasb") { const i = cards.kasb.findIndex((k) => k.n === e.key); if (e.old === null) { if (i >= 0) cards.kasb.splice(i, 1); } else if (i >= 0) cards.kasb[i] = e.old as any; else cards.kasb.push(e.old as any); }
    else { const arr = (cards as any)[e.where] as any[]; const i = arr.findIndex((c) => c.file && fileKey(c.file) === e.key); if (i >= 0 && e.old !== null) arr[i] = e.old; }
  }
  return cards;
}

/** Qulaylik: CSV matni → qo'llash. */
export function applyImportCsv(base: Cards, csv: string, opts: { importId: string; kasbCsv?: string }): ImportResult {
  return applyImport(base, parseCatalogCsv(csv), { importId: opts.importId, kasb: opts.kasbCsv ? parseKasbSupplement(opts.kasbCsv) : undefined });
}
export { CatalogCard };
