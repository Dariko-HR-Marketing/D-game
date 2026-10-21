// Karta jadvalini import qilish (Tajriba24, TZ §5). Jadval tahrirlanadi → validate → import. Kod o'zgarmaydi.
//   pnpm --filter @poyga/content cards validate  <jadval.csv>
//   pnpm --filter @poyga/content cards import    <jadval.csv> [--kasb kasblar.csv] --dry-run     (hech narsa yozilmaydi, hisobot)
//   pnpm --filter @poyga/content cards import    <jadval.csv> [--kasb kasblar.csv] --apply       (data/cards.json yangilanadi, jurnal va hisobot yoziladi)
//   pnpm --filter @poyga/content cards rollback  --import-id <ID>                                 (oxirgi importni teskari qaytaradi)
// Xato bo'lsa chiqish kodi 1 va hech narsa yozilmaydi. Parollar/kalitlar/server manzillari bu fayllarda bo'lmaydi.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { Cards } from "../src/schema";
import { parseCatalogCsv, validateRows } from "../src/catalog";
import { applyImport, rollbackImport, parseKasbSupplement, type LogEntry } from "../src/import";
import { deriveEffects, catalogSummary } from "../src/effects";

const args = process.argv.slice(2); const cmd = args[0];
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const flag = (k: string) => args.includes(k);
const dataDir = opt("--data") ?? new URL("../data/", import.meta.url).pathname;
const cardsPath = join(dataDir, "cards.json"), logDir = join(dataDir, "import_log");
const load = () => Cards.parse(JSON.parse(readFileSync(cardsPath, "utf-8")));
const save = (c: unknown) => writeFileSync(cardsPath, JSON.stringify(c, null, 1) + "\n");
const die = (m: string): never => { console.error(m); process.exit(1); };

function report(r: ReturnType<typeof applyImport>["report"], extra: string) {
  console.log(`qatorlar: ${r.rows} ${JSON.stringify(r.counts)}`);
  console.log(`qo'shildi/yangilandi (INSERT): ${r.inserted} · yangilandi (UPDATE): ${r.updated} · olib tashlandi: ${r.retired} · o'zgarishsiz: ${r.unchanged} · meta yangilandi: ${r.metaUpdated}`);
  console.log(`kolodaga tushadi (draw_enabled): ${r.drawEnabled} · xaritalash kerak: ${r.needsMapping}`);
  console.log(`rasm holati: ${JSON.stringify(r.imageStatus)} · dizayner uchun: REDRAW ${r.art.REDRAW.length}, NEW_ART ${r.art.NEW_ART.length}`);
  if (r.warnings.length) console.log(`ogohlantirishlar: ${r.warnings.length}\n  ` + r.warnings.slice(0, 10).join("\n  "));
  if (extra) console.log(extra);
}

if (cmd === "validate" || cmd === "import") {
  const csvPath = args[1]; if (!csvPath || csvPath.startsWith("--")) die("Ishlatish: cards import <jadval.csv> [--kasb kasblar.csv] --dry-run|--apply");
  const csv = readFileSync(csvPath, "utf-8"); const rows = parseCatalogCsv(csv); const v = validateRows(rows);
  for (const w of v.warnings.slice(0, 20)) console.log("OGOHLANTIRISH:", w); for (const e of v.errors.slice(0, 50)) console.log("XATO:", e);
  console.log(`NATIJA: ${v.errors.length ? "XATO BOR" : "TOZA"} (xato ${v.errors.length}, ogohlantirish ${v.warnings.length})`);
  if (v.errors.length) process.exit(1);
  if (cmd === "import") {
    if (!flag("--dry-run") && !flag("--apply")) die("--dry-run yoki --apply bering");
    const sha = createHash("sha256").update(csv).digest("hex").slice(0, 8);
    const importId = opt("--id") ?? `imp_${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}_${sha}`;
    const kasbPath = opt("--kasb"); const kasb = kasbPath ? parseKasbSupplement(readFileSync(kasbPath, "utf-8")) : undefined;
    const base = load();
    let res; try { res = applyImport(base, rows, { importId, kasb }); } catch (e) { die(`IMPORT TO'XTATILDI (hech narsa yozilmadi): ${(e as Error).message}`); }
    const r = res!.report; const S = catalogSummary(deriveEffects(res!.cards), res!.cards);
    report(r, `faol kartalar: ${S.active} · o'yinda (dvigatel qo'llaydi): ${S.live} · ushlab turilgan: ${S.held} (${S.heldByReason ? JSON.stringify(S.heldByReason) : ""})`);
    if (flag("--dry-run")) { console.log("(dry-run: bazaga yozilmadi)"); process.exit(0); }
    mkdirSync(logDir, { recursive: true });
    writeFileSync(join(logDir, `${importId}.json`), JSON.stringify({ importId, at: new Date().toISOString(), source: csvPath.split("/").pop(), sha256: sha, entries: res!.log }, null, 1) + "\n");
    writeFileSync(join(logDir, `import_report_${importId}.json`), JSON.stringify({ ...r, summary: S }, null, 1) + "\n");
    save(res!.cards); console.log(`yozildi: ${cardsPath}\nimport ID: ${importId} (qaytarish: cards rollback --import-id ${importId})`);
  }
} else if (cmd === "rollback") {
  const id = opt("--import-id"); if (!id) die("Ishlatish: cards rollback --import-id <ID>");
  const p = join(logDir, `${id}.json`); if (!existsSync(p)) die(`jurnal topilmadi: ${p}. Mavjud: ${existsSync(logDir) ? readdirSync(logDir).filter((x) => !x.startsWith("import_report")).join(", ") : "yo'q"}`);
  const { entries } = JSON.parse(readFileSync(p, "utf-8")) as { entries: LogEntry[] };
  save(rollbackImport(load(), entries)); console.log(`qaytarildi: ${id} (${entries.length} ta yozuv)`);
} else die("Buyruqlar: validate | import | rollback");
