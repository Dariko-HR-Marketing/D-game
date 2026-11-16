// Brend himoyasi: mijoz matnlari va SEO'da boylik va'dasi hamda eski nom bo'lmasin (docs/BRAND.md).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FILES = ["src/i18n/uz.ts", "src/i18n/rulesText.ts", "scripts/seo.mjs", "scripts/patch-html.mjs", "app.json"];
const BANNED = [/boy\s*bo['’‘ʻ`]?l/i, /boyib\s*ket/i, /poyga/i, /tez\s+boyi/i, /kafolatli\s+daromad/i];

describe("brend: taqiqlangan so'z va iboralar", () => {
  for (const f of FILES) it(f, () => { const t = readFileSync(decodeURIComponent(new URL(`../${f}`, import.meta.url).pathname), "utf8"); for (const re of BANNED) expect(t, String(re)).not.toMatch(re); });
});
