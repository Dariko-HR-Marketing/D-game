// Tajriba24 karta katalogi (50 ustunli import jadvali): sxema, CSV o'qish va tekshiruv.
// Manba: content/imports/tajriba24/Tajriba24_texnik_topshiriq_kartalar_importi.md (TZ §4, §8). Tekshiruv qoidalari `validate_cards.py` ning TS ko'rinishi.
import { z } from "zod";
import { parseCsv } from "./csv";

export const CATALOG_COLUMNS = [
  "card_id", "operation", "legacy_file", "deck_no", "deck_name", "card_type", "direction", "card_kind", "title", "text", "option_a", "option_b", "option_v",
  "price", "down_payment", "loan", "loan_payment_monthly", "income_monthly", "rent_monthly", "market_price", "salary", "monthly_surplus", "share_pct", "qty_min", "qty_max",
  "duration", "learning_goal", "age_rating", "pool", "ranked_pool", "sector",
  "effect1_type", "effect1_target", "effect1_value", "effect1_duration", "effect1_condition",
  "effect2_type", "effect2_target", "effect2_value", "effect2_duration", "effect2_condition",
  "display_effect", "needs_engine_mapping", "draw_enabled", "source_batch", "review_status", "image_status", "publish", "change_reason", "old_value",
] as const;
export type CatalogColumn = (typeof CATALOG_COLUMNS)[number];
export type RawRow = Record<CatalogColumn, string>;

export const OPERATIONS = ["INSERT", "UPDATE", "NOCHANGE", "REMOVE"] as const;
export type Operation = (typeof OPERATIONS)[number];
export const DECKS: Record<number, string> = { 1: "Kasb", 2: "Kichik sarmoya", 3: "Katta sarmoya", 4: "Bozor", 5: "Xarajat", 6: "Katta aylana xarajati", 7: "Kutilmagan hodisa" };
export const CARD_KINDS = ["ASSET_BUY", "ASSET_SELL_OFFER", "EXPENSE", "EVENT", "MARKET_EVENT", "MARKET_SIGNAL", "INCOME_CHANGE", "CAREER_EVENT", "GOAL", "DREAM", "DEVELOPMENT", "QUIZ",
  "FINANCE_OFFER", "DEPOSIT", "INSURANCE", "SPONSOR_INFO", "ONE_TIME_INCOME", "SOCIAL_DUTY", "PROFESSION", "AUCTION", "TEACHER_CASE"] as const;
export type CardKind = (typeof CARD_KINDS)[number];
export const EFFECT_TYPES = ["SOTISH_FOIZ", "SOTISH_FOIZ_BIRINCHI", "SOTISH_NARX", "NARX_FOIZ", "DAROMAD_FOIZ", "DAROMAD_NOL", "DAROMAD_KOPAYTIRISH", "KECHIKTIRILGAN_NARX_FOIZ", "KECHIKTIRILGAN_DAROMAD_FOIZ",
  "NAQD_XARAJAT", "NAQD_BONUS", "NAQD_JARIMA", "XARAJAT_FOIZ", "KREDIT_TOLOV_FOIZ", "ISH_HAQI_FOIZ", "ISH_HAQI_QOSHISH", "ISH_HAQI_NOL", "OYLIK_XARAJAT", "OYLIK_DAROMAD", "DOIMIY_XARAJAT",
  "DEPOZIT_FOIZ", "SUGURTA_PREMIYA", "SUGURTA_QOPLASH", "XP_BONUS", "MISSIYA_MUKOFOT", "ORZU_SHARTI", "AUKSION_BOSHLANISH", "VIKTORINA_JAVOB"] as const;
export type EffectType = (typeof EFFECT_TYPES)[number];
export const IMAGE_STATUSES = ["OK", "REDRAW", "NEW_ART", "TEXT_ONLY", "NONE"] as const;
const REQUIRED: CatalogColumn[] = ["option_a", "card_id", "operation", "deck_no", "deck_name", "card_type", "direction", "card_kind", "text", "pool", "ranked_pool", "needs_engine_mapping", "draw_enabled", "source_batch", "review_status", "image_status", "publish"];
const INT_COLS: CatalogColumn[] = ["deck_no", "price", "down_payment", "loan", "loan_payment_monthly", "income_monthly", "rent_monthly", "market_price", "salary", "monthly_surplus", "share_pct", "qty_min", "qty_max"];
const BOOL_COLS: CatalogColumn[] = ["publish", "draw_enabled", "needs_engine_mapping"];

/** Bitta tuzilgan effekt (effect1_* yoki effect2_*). `value` matn bo'lib qoladi: son, harf (A/B/V) yoki daraja («oson») bo'lishi mumkin. */
export const CatalogEffect = z.object({ type: z.enum(EFFECT_TYPES), target: z.string(), value: z.string(), duration: z.string().optional(), condition: z.string().optional() });
export type CatalogEffectT = z.infer<typeof CatalogEffect>;

const int = z.number().int();
/** Katalog kartasi (INSERT qatori). Kalit — `id` (card_id). Rasm (`file`) bo'lmasa kartada matnli zaxira shablon ko'rsatiladi. */
export const CatalogCard = z.object({
  id: z.string().min(1), deck: z.number().int().min(1).max(7), deckName: z.string(), cardType: z.string(), direction: z.string(), kind: z.enum(CARD_KINDS),
  title: z.string().optional(), text: z.string().optional(), optionA: z.string().optional(), optionB: z.string().optional(), optionV: z.string().optional(),
  price: int.optional(), down: int.optional(), loan: int.optional(), loanPayment: int.optional(), income: int.optional(), rent: int.optional(), marketPrice: int.optional(),
  salary: int.optional(), surplus: int.optional(), sharePct: int.optional(), qtyMin: int.optional(), qtyMax: int.optional(),
  duration: z.string().optional(), goal: z.string().optional(), age: z.string().optional(), pool: z.enum(["DECK", "TEACHER_PANEL"]), ranked: z.enum(["BASE", "EXTENDED"]), sector: z.string().optional(),
  effects: z.array(CatalogEffect).max(2), display: z.string().optional(),
  needsMapping: z.boolean(), draw: z.boolean(), publish: z.boolean(), batch: z.string(), review: z.string(), image: z.enum(IMAGE_STATUSES), file: z.string().optional(), reason: z.string().optional(),
});
export type CatalogCardT = z.infer<typeof CatalogCard>;

/** Eski (kolodaga bo'lingan) kartalar uchun jadvaldagi qo'shimcha ma'lumot: kalit — `fileKey(file)`. */
export const CardMeta = z.object({
  id: z.string(), ranked: z.enum(["BASE", "EXTENDED"]), age: z.string().optional(), sector: z.string().optional(), goal: z.string().optional(), image: z.enum(IMAGE_STATUSES).optional(),
  kind: z.enum(CARD_KINDS).optional(), retired: z.string().optional(), needsMapping: z.boolean().optional(), draw: z.boolean().optional(),
  /** Jadvaldagi koloda kartaning eski massividan farq qilsa (008_xarajat, Xarajat_034...): karta ID si o'zgarmaydi, tortish dekasi shu qiymat bo'yicha. */
  deck: z.enum(["kichik", "katta", "bozor", "xar", "kxar", "hod"]).optional(),
});
export type CardMetaT = z.infer<typeof CardMeta>;

/** Rasm fayl nomidan kalit: kengaytma va apostroflarsiz, katta harf (CSV `legacy_file` «11_G'AZNACHI.png» ↔ kontent «11_GAZNACHI.webp»). */
export const fileKey = (f: string) => f.replace(/\.(png|webp|jpe?g)$/i, "").replace(/['’‘`ʻʼ]/g, "").toUpperCase();

export interface Issues { errors: string[]; warnings: string[] }

/** CSV matni → xom qatorlar. Ustunlar to'plami aniq 50 ta bo'lishi shart. */
export function parseCatalogCsv(text: string): RawRow[] {
  const rows = parseCsv(text.replace(/^﻿/, "")); if (!rows.length) throw new Error("CSV bo'sh");
  const head = rows[0].map((x) => x.trim()); const missing = CATALOG_COLUMNS.filter((c) => !head.includes(c));
  if (missing.length) throw new Error(`Ustunlar yetishmaydi: ${missing.join(", ")}`);
  const extra = head.filter((c) => !(CATALOG_COLUMNS as readonly string[]).includes(c)); if (extra.length) throw new Error(`Noma'lum ustunlar: ${extra.join(", ")}`);
  return rows.slice(1).map((r) => Object.fromEntries(CATALOG_COLUMNS.map((c) => [c, (r[head.indexOf(c)] ?? "").trim() === "" ? "" : r[head.indexOf(c)]])) as RawRow);
}

/** `validate_cards.py` ning TS ko'rinishi: xato bor bo'lsa import to'xtaydi, ogohlantirish to'xtatmaydi. */
export function validateRows(rows: RawRow[]): Issues {
  const err: string[] = [], warn: string[] = [];
  if (!rows.length) return { errors: ["bo'sh fayl"], warnings: [] };
  const miss = REQUIRED.filter((c) => !(c in rows[0])); if (miss.length) return { errors: [`ustunlar yetishmaydi: ${miss.join(", ")}`], warnings: [] };
  const ids = new Map<string, number>(); for (const r of rows) ids.set(r.card_id, (ids.get(r.card_id) ?? 0) + 1);
  for (const [k, v] of ids) if (v > 1) err.push(`card_id takror: ${k} (${v})`);
  rows.forEach((r, i) => {
    const n = i + 2, cid = r.card_id || `qator ${n}`; const E = (m: string) => err.push(`${cid} (qator ${n}): ${m}`), W = (m: string) => warn.push(`${cid} (qator ${n}): ${m}`);
    if (!r.card_id) E("card_id bo'sh");
    if (!(OPERATIONS as readonly string[]).includes(r.operation)) E("operation noto'g'ri");
    if (["UPDATE", "NOCHANGE", "REMOVE"].includes(r.operation) && !r.legacy_file) E("legacy_file kerak");
    if (r.operation === "INSERT" && r.legacy_file) E("INSERT uchun legacy_file bo'sh bo'lishi kerak");
    for (const c of INT_COLS) if (r[c] !== "" && !/^-?\d+$/.test(r[c])) E(`${c} butun son bo'lishi kerak: ${JSON.stringify(r[c])}`);
    for (const c of BOOL_COLS) if (r[c] !== "TRUE" && r[c] !== "FALSE") E(`${c} TRUE/FALSE bo'lishi kerak`);
    const d = Number(r.deck_no); if (!/^-?\d+$/.test(r.deck_no)) return E("deck_no son emas");
    if (!(d in DECKS)) E("deck_no 1..7"); else if (DECKS[d] !== r.deck_name) E(`deck_name mos emas: ${JSON.stringify(r.deck_name)}`);
    if (r.card_kind !== "" && !(CARD_KINDS as readonly string[]).includes(r.card_kind)) E(`card_kind noto'g'ri: ${r.card_kind}`);
    if (r.operation === "REMOVE") return;
    if (r.card_kind === "QUIZ" && !(r.option_a && r.option_b && r.option_v)) E("viktorina variantlari (option_a/b/v) to‘liq emas");
    if (!r.text && !r.title) E("text bo'sh");
    for (const c of ["title", "text", "learning_goal"] as const) {
      const v = r[c];
      if (/[A-Za-z]['`´ʻʼ][A-Za-z]|[oOgG]['`´ʻʼ’]/.test(v)) W(`${c}: apostrof shakli (o‘ g‘ uchun ‘ ishlating)`);
      if (v.includes("  ")) W(`${c}: ortiqcha bo'shliq`);
      if (/[Ѐ-ӿ]/.test(v)) E(`${c}: kirill harflari aralashgan`);
      if (/\b\d{4,}\b/.test(v) && !/\b(19|20)\d\d\b/.test(v)) W(`${c}: mingliklar bo'shliq bilan yozilishi kerak`);
    }
    for (const i2 of ["1", "2"] as const) {
      const t = r[`effect${i2}_type` as CatalogColumn], val = r[`effect${i2}_value` as CatalogColumn], tg = r[`effect${i2}_target` as CatalogColumn];
      if (t && !(EFFECT_TYPES as readonly string[]).includes(t)) E(`effect${i2}_type noma'lum: ${t}`);
      if (t && val === "" && t !== "DAROMAD_NOL") E(`effect${i2}_value kerak`);
      if (t && !tg) E(`effect${i2}_target kerak`);
    }
    if (r.effect2_type && !r.effect1_type) E("effect2 bor, effect1 yo'q");
    if (r.draw_enabled === "TRUE" && r.needs_engine_mapping === "TRUE") E("draw_enabled=TRUE bo'lishi mumkin emas: effekt xaritalanmagan");
    if (r.pool === "TEACHER_PANEL" && r.draw_enabled === "TRUE") E("o'qituvchi paneli kartasi kolodaga tushmasin");
    const kind = r.card_kind, pr = r.price !== "" ? Number(r.price) : null;
    if (d === 5 && pr !== null && pr > 2000 && kind === "EXPENSE") E(`Xarajat kolodasi chegarasi (≤ 2 000): ${pr}`);
    if (d === 6 && pr !== null && pr < 3000 && kind === "EXPENSE") E(`Katta aylana xarajati chegarasi (≥ 3 000): ${pr}`);
    if (kind === "ASSET_BUY" && r.income_monthly && pr && r.source_batch === "V4_HOZIRGI_MUHIT") {
      const pb = pr / Number(r.income_monthly), [lo, hi] = d === 2 ? [2.5, 9] : [12, 60];
      if (pb < lo || pb > hi) E(`qoplanish ${pb.toFixed(1)} oy oraliqdan tashqari (${lo}-${hi})`);
    }
    if (r.down_payment && r.loan && pr && Number(r.down_payment) + Number(r.loan) !== pr) E("down_payment + loan != price");
    if (r.loan_payment_monthly && Number(r.loan_payment_monthly) > 0) E("loan_payment_monthly manfiy bo'lishi kerak");
    if (r.pool === "DECK" && r.publish === "FALSE") W("publish=FALSE");
    if (!(IMAGE_STATUSES as readonly string[]).includes(r.image_status)) E("image_status noto'g'ri");
  });
  return { errors: err, warnings: warn };
}

const num = (s: string): number | undefined => (s === "" ? undefined : Number(s));
const str = (s: string): string | undefined => (s === "" ? undefined : s);

/** INSERT qatori → katalog kartasi (sxema bo'yicha tekshiriladi). */
export function rowToCard(r: RawRow): CatalogCardT {
  const effects = (["1", "2"] as const).filter((i) => r[`effect${i}_type` as CatalogColumn]).map((i) => ({
    type: r[`effect${i}_type` as CatalogColumn], target: r[`effect${i}_target` as CatalogColumn], value: r[`effect${i}_value` as CatalogColumn],
    duration: str(r[`effect${i}_duration` as CatalogColumn]), condition: str(r[`effect${i}_condition` as CatalogColumn]) }));
  return CatalogCard.parse({
    id: r.card_id, deck: Number(r.deck_no), deckName: r.deck_name, cardType: r.card_type, direction: r.direction, kind: r.card_kind,
    title: str(r.title), text: str(r.text), optionA: str(r.option_a), optionB: str(r.option_b), optionV: str(r.option_v),
    price: num(r.price), down: num(r.down_payment), loan: num(r.loan), loanPayment: num(r.loan_payment_monthly), income: num(r.income_monthly), rent: num(r.rent_monthly), marketPrice: num(r.market_price),
    salary: num(r.salary), surplus: num(r.monthly_surplus), sharePct: num(r.share_pct), qtyMin: num(r.qty_min), qtyMax: num(r.qty_max),
    duration: str(r.duration), goal: str(r.learning_goal), age: str(r.age_rating), pool: r.pool, ranked: r.ranked_pool, sector: str(r.sector), effects, display: str(r.display_effect),
    needsMapping: r.needs_engine_mapping === "TRUE", draw: r.draw_enabled === "TRUE", publish: r.publish === "TRUE", batch: r.source_batch, review: r.review_status, image: r.image_status, reason: str(r.change_reason),
  });
}

/** Eski karta uchun meta (jadvaldagi qo'shimcha maydonlar). */
export function rowToMeta(r: RawRow): CardMetaT {
  return CardMeta.parse({ id: r.card_id, ranked: r.ranked_pool, age: str(r.age_rating), sector: str(r.sector), goal: str(r.learning_goal), image: r.image_status, kind: str(r.card_kind),
    needsMapping: r.needs_engine_mapping === "TRUE" || undefined, draw: r.draw_enabled === "FALSE" ? false : undefined, retired: r.operation === "REMOVE" ? (r.change_reason || r.old_value || "olib tashlangan") : undefined });
}
