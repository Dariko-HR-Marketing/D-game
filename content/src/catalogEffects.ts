// Katalog kartasi → dvigatel ta'siri. Matndan o'qilmaydi: tuzilgan maydonlar (effect*_type/target/value) bo'yicha.
// Dvigatel hali qo'llamaydigan karta `held` (ushlab turilgan) bo'ladi: bazaga yoziladi, kolodaga tushmaydi, sababi hisobotda ko'rinadi.
import type { CatalogCardT, CatalogEffectT } from "./catalog";
import type { Effect, Mode } from "./effects";

export interface CatalogDerived { effect: Effect; mode: Mode; held?: string }

/** Karta matni: sarlavha + matn (jadvalda ikkalasi ham bo'lishi mumkin). Matn kichik harf bilan boshlansa (jadval xatosi) — tire bilan ulanadi. */
export function catalogText(c: CatalogCardT): string {
  if (c.title && c.text) return /^\p{Ll}/u.test(c.text) ? `${c.title} — ${c.text}` : `${c.title}. ${c.text}`;
  return c.text ?? c.title ?? c.id;
}

/** Qo'llanma §07: «(agar bolangiz/mashinangiz bo'lsa)» — faqat shunday o'yinchi to'laydi. */
export const needsOf = (t: string): "child" | "car" | undefined => { const m = /\(agar ([^)]*)bo[‘'’]lsa\)/i.exec(t)?.[1] ?? ""; return /mashina/i.test(m) ? "car" : /bola|farzand/i.test(m) ? "child" : undefined; };

const MONEY = new Set(["NAQD_XARAJAT", "NAQD_BONUS", "NAQD_JARIMA"]);
const intOf = (s: string) => (/^-?\d+$/.test(s.trim()) ? Number(s) : NaN);

function buyOf(c: CatalogCardT): CatalogDerived | null {
  const base = { code: c.id, price: c.price!, sector: c.sector, name: c.title ?? undefined } as const;
  const asset = ((): "small_business" | "business" | "apartment" | "dacha" | "land" | "car" | null => {
    switch (c.cardType) {
      case "Kichik biznes": case "Kichik ijara": return "small_business";
      case "Biznes": return "business";
      case "Ko‘chmas mulk (kvartira)": return "apartment";
      case "Dala hovli": return "dacha";
      case "Ko‘chmas mulk (yer)": case "Yer (sotixiga)": return "land";
      case "Avtomobil taklifi": return "car";
      default: return null;
    }
  })();
  if (!asset) return null;
  if (c.price === undefined) return null;
  const tags = c.cardType === "Kichik ijara" || (c.rent ?? 0) > 0 ? ["ijara"] : undefined;
  if (asset === "car") return { mode: "optional", effect: { kind: "buy", asset, ...base, tags } };
  if (c.down !== undefined || c.loan !== undefined) return { mode: "optional", effect: { kind: "buy", asset, ...base, down: c.down, credit: c.loan ?? 0, creditPayment: c.loanPayment ?? 0, monthlyIncome: c.rent ?? c.income ?? 0, marketValue: c.marketPrice ?? null, tags } };
  return { mode: "optional", effect: { kind: "buy", asset, ...base, monthlyIncome: c.income ?? c.rent ?? 0, tags } };
}

export function catalogEffect(c: CatalogCardT): CatalogDerived {
  const un = (held: string): CatalogDerived => ({ mode: "mandatory", effect: { kind: "unresolved", reason: held }, held });
  if (c.pool === "TEACHER_PANEL") return un("o‘qituvchi paneli kartasi (o‘yin kolodasiga kirmaydi)");
  if (c.needsMapping) return un("effekt tuzilgan maydonlarga hali o‘tkazilmagan (jadvalda needs_engine_mapping)");
  if (!c.draw || !c.publish) return un("jadvalda kolodaga tushirish o‘chirilgan");
  const types = c.effects.map((e) => e.type);
  if (c.kind === "ASSET_BUY") { const b = buyOf(c); return b ?? un(`aktiv turi qo‘llanmaydi: ${c.cardType}`); }
  const moneyOnly = c.effects.length === 1 && MONEY.has(c.effects[0].type) && !c.effects[0].condition;
  const amount = (e: CatalogEffectT) => Math.abs(intOf(e.value));
  if (moneyOnly && (c.kind === "EXPENSE" || c.kind === "EVENT")) { const a = amount(c.effects[0]); if (Number.isFinite(a) && a > 0 && c.effects[0].type !== "NAQD_BONUS") return { mode: "mandatory", effect: { kind: "pay", amount: a, to: "bank", ...(needsOf(c.text ?? "") ? { needs: needsOf(c.text ?? "") } : {}) } }; }
  if (moneyOnly && c.kind === "ONE_TIME_INCOME" && c.effects[0].type === "NAQD_BONUS") { const a = amount(c.effects[0]); if (Number.isFinite(a) && a > 0) return { mode: "optional", effect: { kind: "gain", amount: a } }; }
  return un(`dvigatel hali qo‘llamaydi: ${c.kind}${types.length ? ` (${types.join(" + ")})` : ""}`);
}
