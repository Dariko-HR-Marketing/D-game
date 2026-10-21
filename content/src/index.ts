import { readFileSync } from "node:fs";
import { z } from "zod";
import { BigCell, Cards, Dream } from "./schema";
import { deriveEffects, isLive } from "./effects";
import { CellRules } from "./cellrules";

export * from "./schema";
export * from "./effects";
export * from "./catalog";
export * from "./import";
export * from "./pools";
export * from "./groups";

const read = (n: string) => JSON.parse(readFileSync(new URL(`../data/${n}.json`, import.meta.url), "utf-8"));

export function loadContent() {
  return {
    cards: Cards.parse(read("cards")),
    bigBoard: z.array(BigCell).length(53).parse(read("board_big")),
    dreams: z.array(Dream).parse(read("dreams")),
    cellRules: CellRules.parse(read("cell_rules")),
  };
}

export type Bundle = ReturnType<typeof loadContent>;

/** Tashqaridan kelgan (admin) kontentni sxema bo'yicha tekshiradi. */
export function parseBundle(raw: unknown): Bundle {
  const r = raw as { cards: unknown; bigBoard: unknown; dreams: unknown; cellRules?: unknown };
  // cellRules ixtiyoriy: eski (saqlangan) versiyalarda yo'q — bo'sh qoidalar deb olinadi
  return { cards: Cards.parse(r.cards), bigBoard: z.array(BigCell).length(53).parse(r.bigBoard), dreams: z.array(Dream).parse(r.dreams), cellRules: CellRules.parse(r.cellRules ?? {}) };
}

const OPTIONAL_FIELDS = new Set(["down", "credit", "creditPayment", "monthlyIncome", "marketValue", "shares", "scope", "optional", "sector", "name", "tags", "needs"]);

/** O'yinni buzadigan mantiqiy xatolar (sxemadan tashqari). Bo'sh ro'yxat = nashr qilish mumkin. */
export function validateBundle(b: Bundle): string[] {
  const problems: string[] = [];
  // Ta'siri aniqlanmagan karta: katalog kartasi `held` (ushlab turilgan) bo'lsa — muammo emas (kolodaga tushmaydi); qolganlari nashrga to'sqinlik qiladi.
  for (const e of deriveEffects(b.cards)) if (e.effect.kind === "unresolved" && !e.info?.held && !e.info?.retired) problems.push(`${e.id}: ta'siri aniqlanmadi (${(e.effect as { reason: string }).reason})`);
  const cells = new Set(b.bigBoard.filter((c) => c.t === "O").map((c) => c.name));
  for (const d of b.dreams) if (!cells.has(d.name)) problems.push(`orzu "${d.name}" katta aylanada katak topilmadi`);
  if (b.bigBoard[34]?.name !== "Start") problems.push("katta aylana START (34) katagi o'zgargan");
  // Sxemadan o'tgan, lekin o'yinni buzadigan ma'lumot: bo'sh deka, narx/daromad yo'q (NaN) kartalar
  for (const d of ["kichik", "katta", "bozor", "xar", "kxar", "hod"] as const) if (!(b.cards as any)[d]?.length) problems.push(`"${d}" dekasi bo'sh`);
  for (const e of deriveEffects(b.cards)) if (isLive(e)) for (const [k, v] of Object.entries(e.effect)) if ((v === null && k !== "marketValue") || (typeof v === "number" && !Number.isFinite(v)) || (v === undefined && !OPTIONAL_FIELDS.has(k))) problems.push(`${e.id}: "${k}" qiymati yo'q yoki noto'g'ri`);
  if (b.dreams.length < 6) problems.push(`orzular ${b.dreams.length} ta — kamida 6 ta kerak (har bir o'yinchiga alohida orzu)`);
  if (b.cards.kasb.length === 0) problems.push("kasblar yo'q");
  // Katak qoidalari: mavjud bo'lmagan katak, bo'sh deka, narxsiz katakka sotib olish taklifi
  const acts: [string, { kind: string; deck?: string }][] = [...Object.entries(b.cellRules.small).map(([k, a]) => [`small.${k}`, a] as [string, any]),
    ...Object.entries(b.cellRules.big.byType).map(([k, a]) => [`big.byType.${k}`, a] as [string, any]), ...Object.entries(b.cellRules.big.byIndex).map(([k, a]) => [`big.byIndex.${k}`, a] as [string, any])];
  for (const [i] of Object.entries(b.cellRules.big.byIndex)) if (Number(i) >= b.bigBoard.length) problems.push(`cellRules.big.byIndex.${i}: bunday katak yo'q (0–${b.bigBoard.length - 1})`);
  const ids = new Set(deriveEffects(b.cards).map((e) => e.id));
  const lap = b.cellRules.big.onLap ? ([["big.onLap", b.cellRules.big.onLap]] as [string, any][]) : [];
  for (const [where, a] of [...acts, ...lap]) if (a?.kind === "drawCard" && !ids.has(a.cardId)) problems.push(`cellRules.${where}: "${a.cardId}" kartasi yo'q`);
  for (const [where, a] of [...acts, ...lap]) if (a?.kind === "drawDeck" && !(b.cards as any)[a.deck!]?.length) problems.push(`cellRules.${where}: "${a.deck}" dekasi bo'sh`);
  // Aylana boshidagi ta'sir tanlov kartasini (pending) qoldirmasligi kerak: katak ta'siri unga qadar bajarilmay qolardi
  const eff = deriveEffects(b.cards);
  if (b.cellRules.big.onLap?.kind === "drawDeck") { const d = b.cellRules.big.onLap.deck; if (eff.some((e) => e.deck === d && e.mode !== "mandatory")) problems.push(`cellRules.big.onLap: "${d}" dekasida ixtiyoriy kartalar bor (faqat majburiy kartali deka mumkin)`); }
  if (b.cellRules.big.onLap?.kind === "drawCard") { const e = eff.find((x) => x.id === (b.cellRules.big.onLap as any).cardId); if (e && e.mode !== "mandatory") problems.push("cellRules.big.onLap: karta majburiy bo'lishi kerak"); }
  for (const [i, a] of Object.entries(b.cellRules.big.byIndex)) if (a.kind === "offerCellAsset" && b.bigBoard[Number(i)]?.price == null) problems.push(`cellRules.big.byIndex.${i}: katakda narx yo'q (offerCellAsset mumkin emas)`);
  // Tavakkal (V) kataklari: narx va yutuqli kubik qirralari shart (qo'llanma §11)
  if (b.cellRules.big.byType.V?.kind === "offerGamble") for (const c of b.bigBoard) if (c.t === "V" && (c.price == null || !c.faces?.length)) problems.push(`katta aylana ${c.i}-katak (V): narx yoki yutuqli kubik qirralari (faces) yo'q`);
  return problems;
}
export * from "./cardfile";
export * from "./cellrules";
