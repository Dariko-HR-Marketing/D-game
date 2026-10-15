// Yangi kasblarni CSV dan qo'shish. Ishlatish:
//   pnpm --filter @poyga/content import:kasb templates/kasb.csv          (tekshiradi, hech narsani o'zgartirmaydi)
//   pnpm --filter @poyga/content import:kasb templates/kasb.csv --write  (data/cards.json ga qo'shadi)
import { readFileSync, writeFileSync } from "node:fs";
import { importKasb } from "../src/tools";

const [file, flag] = process.argv.slice(2);
if (!file) { console.error("Ishlatish: import:kasb <fayl.csv> [--write]"); process.exit(2); }
const path = new URL("../data/cards.json", import.meta.url);
const cards = JSON.parse(readFileSync(path, "utf-8"));
const r = importKasb(readFileSync(file, "utf-8"), cards.kasb);
for (const e of r.errors) console.error("✗", e);
console.log(`yaroqli kasblar: ${r.ok.length}${r.ok.length ? " → " + r.ok.map((k) => `№${k.n} ${k.name}`).join(", ") : ""}`);
if (r.errors.length) process.exit(1);
if (flag === "--write") { cards.kasb.push(...r.ok); writeFileSync(path, JSON.stringify(cards, null, 1) + "\n"); console.log("data/cards.json yangilandi. Endi: pnpm test"); }
else console.log("(yozilmadi: --write bering)");
