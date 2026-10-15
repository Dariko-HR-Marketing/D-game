// Karta rasmlari tekshiruvi: nimalar yetishmaydi, ortiqcha, noto'g'ri nomli yoki bo'sh.
//   pnpm --filter @poyga/content check:cards ../deploy/vps/cards [--strict]
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkCardFiles, expectedFiles } from "../src/tools";

const [dir, flag] = process.argv.slice(2);
if (!dir) { console.error("Ishlatish: check:cards <rasmlar papkasi> [--strict]"); process.exit(2); }
const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url), "utf-8"));
const files: Record<string, number> = {};
for (const n of readdirSync(dir)) { const s = statSync(join(dir, n)); if (s.isFile() && !n.startsWith(".")) files[n] = s.size; }
const r = checkCardFiles(expectedFiles(cards), files);
console.log(`kerak: ${r.expected} · bor: ${r.present} · yetishmaydi: ${r.missing.length} · ortiqcha: ${r.extra.length}`);
const show = (t: string, a: unknown[]) => a.length && console.log(`\n${t} (${a.length}):\n  ` + a.slice(0, 40).map((x) => (Array.isArray(x) ? x.join(" ≠ ") : x)).join("\n  ") + (a.length > 40 ? `\n  … yana ${a.length - 40} ta` : ""));
show("YETISHMAYDI", r.missing); show("REGISTR FARQI (nomini to'g'rilang)", r.caseMismatch); show("ORTIQCHA (kontentda yo'q)", r.extra); show("YAROQSIZ NOM", r.unsafe); show("BO'SH FAYL", r.empty);
const bad = r.missing.length + r.unsafe.length + r.empty.length;
if (flag === "--strict" && bad) process.exit(1);
