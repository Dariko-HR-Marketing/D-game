// Ma'lumot qabul qilish vositalari: buyurtmachidan kelgan kasblar (CSV) va karta rasmlari tekshiruvi.
import { Kasb } from "./schema";
import { SAFE_CARD_FILE } from "./cardfile";

export const KASB_HEADER = ["n", "name", "salary", "exp1", "exp2", "exp3", "exp4", "exp5", "exp6", "exp7", "exp8", "exp9", "save", "kv", "car", "child", "flags", "file"] as const;

/** Oddiy CSV (vergul; qo'shtirnoq ichida vergul mumkin). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some((x) => x.trim() !== "")) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell); if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

export type KasbRow = ReturnType<typeof Kasb.parse>;
export interface ImportResult { ok: KasbRow[]; errors: string[] }

/** CSV → kasblar. `total` va `cf` hisoblanadi (qo'lda kiritilmaydi → arifmetik xato bo'lmaydi). Mavjud kasb raqamlari bilan to'qnashuv rad etiladi. */
export function importKasb(csv: string, existing: { n: number; file: string }[]): ImportResult {
  const rows = parseCsv(csv); const errors: string[] = []; const ok: KasbRow[] = [];
  if (!rows.length) return { ok, errors: ["fayl bo'sh"] };
  const head = rows[0].map((x) => x.trim());
  const missing = KASB_HEADER.filter((h) => !head.includes(h)); if (missing.length) return { ok, errors: [`sarlavhada ustun yo'q: ${missing.join(", ")}`] };
  const col = (r: string[], k: string) => (r[head.indexOf(k)] ?? "").trim();
  const nums = new Set(existing.map((e) => e.n)), files = new Set(existing.map((e) => e.file));
  rows.slice(1).forEach((r, idx) => {
    const line = idx + 2; const num = (k: string) => { const v = col(r, k); return v === "" || !/^-?\d+$/.test(v) ? NaN : Number(v); };
    const exp = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => num(`exp${i}`)); const salary = num("salary");
    if ([salary, ...exp, num("n"), num("save"), num("kv"), num("car"), num("child")].some(Number.isNaN)) return void errors.push(`${line}-qator: raqamli maydon bo'sh yoki noto'g'ri`);
    const total = exp.reduce((a, b) => a + b, 0);
    const cand = { n: num("n"), name: col(r, "name"), salary, exp, total, cf: salary - total, save: num("save"), kv: num("kv"), car: num("car"), child: num("child"),
      flags: col(r, "flags") ? col(r, "flags").split(/[;|]/).map((x) => x.trim()).filter(Boolean) : [], file: col(r, "file") };
    const p = Kasb.safeParse(cand); if (!p.success) return void errors.push(`${line}-qator: ${p.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
    if (!SAFE_CARD_FILE.test(p.data.file)) errors.push(`${line}-qator: rasm fayl nomi yaroqsiz (${p.data.file})`);
    if (nums.has(p.data.n)) errors.push(`${line}-qator: kasb №${p.data.n} allaqachon bor`);
    if (files.has(p.data.file)) errors.push(`${line}-qator: fayl nomi allaqachon ishlatilgan (${p.data.file})`);
    nums.add(p.data.n); files.add(p.data.file); ok.push(p.data);
  });
  return { ok, errors };
}

/** Kontentdagi barcha rasm fayl nomlari. */
export function expectedFiles(cards: Record<string, { file?: string }[]>): string[] {
  const s = new Set<string>(); for (const list of Object.values(cards)) for (const c of list) if (c.file) s.add(c.file);
  return [...s].sort();
}
export interface CardFilesReport { expected: number; present: number; missing: string[]; extra: string[]; unsafe: string[]; empty: string[]; caseMismatch: [string, string][] }
/** `files`: papkadagi fayllar {nom: bayt}. */
export function checkCardFiles(expected: string[], files: Record<string, number>): CardFilesReport {
  const names = Object.keys(files); const exp = new Set(expected);
  const lower = new Map(names.map((n) => [n.toLowerCase(), n])); const caseMismatch: [string, string][] = [];
  const missing = expected.filter((f) => { if (files[f] !== undefined) return false; const alt = lower.get(f.toLowerCase()); if (alt) caseMismatch.push([f, alt]); return true; });
  return { expected: expected.length, present: expected.length - missing.length, missing,
    extra: names.filter((n) => !exp.has(n) && !caseMismatch.some(([, a]) => a === n)),
    unsafe: names.filter((n) => !SAFE_CARD_FILE.test(n)), empty: names.filter((n) => files[n] === 0), caseMismatch };
}
