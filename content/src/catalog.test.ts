// Tajriba24 import: qabul mezonlari (TZ §9): tekshiruv, hisob, idempotentlik, qaytarish, xatoda hech narsa yozilmasligi, havzalar.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { loadContent, parseCatalogCsv, validateRows, applyImport, rollbackImport, parseKasbSupplement, deriveEffects, buildPools, catalogSummary, isLive, type LogEntry } from "./index";

const dir = new URL("../imports/tajriba24/", import.meta.url);
const csv = readFileSync(new URL("tajriba24_cards_import.csv", dir), "utf-8");
const kasbCsv = readFileSync(new URL("tajriba24_kasblar.csv", dir), "utf-8");
const log = JSON.parse(readFileSync(new URL("../data/import_log/imp_20261021_tajriba24.json", import.meta.url), "utf-8")) as { entries: LogEntry[] };
const rows = parseCatalogCsv(csv);
const current = loadContent().cards;
const kasb = parseKasbSupplement(kasbCsv);
const before = rollbackImport(current, log.entries); // import oldidan holat (jurnaldan)
const strip = (c: unknown) => JSON.parse(JSON.stringify(c));

describe("jadval tekshiruvi (validate_cards.py ning TS ko'rinishi)", () => {
  it("joriy jadval: 0 xato, 0 ogohlantirish (TZ §9.1)", () => {
    const v = validateRows(rows); expect(v.errors).toEqual([]); expect(v.warnings).toEqual([]);
    expect(rows).toHaveLength(1032);
  });
  const bad = (patch: Record<string, string>, i = 700) => validateRows(rows.map((r, k) => (k === i ? { ...r, ...patch } : r))).errors;
  it("xatolar ushlanadi: noma'lum effekt, kirill harf, takror ID, noto'g'ri koloda, kredit yig'indisi", () => {
    expect(bad({ effect1_type: "YOQ_TUR", effect1_target: "x", effect1_value: "1" }).join()).toContain("effect1_type noma'lum");
    expect(bad({ text: "Salom мир" }).join()).toContain("kirill");
    expect(validateRows([...rows, rows[5]]).errors.join()).toContain("card_id takror");
    expect(bad({ deck_no: "9" }).join()).toContain("deck_no 1..7");
    const i = rows.findIndex((r) => r.down_payment && r.loan && r.operation !== "REMOVE");
    expect(bad({ down_payment: "1" }, i).join()).toContain("down_payment + loan");
    expect(bad({ draw_enabled: "TRUE", needs_engine_mapping: "TRUE" }).join()).toContain("xaritalanmagan");
  });
  it("apostrof va minglik ogohlantirishlari (importni to'xtatmaydi)", () => {
    const w = validateRows(rows.map((r, k) => (k === 700 ? { ...r, text: "Bo'lim 20000 sh.b." } : r)));
    expect(w.errors).toEqual([]); expect(w.warnings.join()).toContain("apostrof"); expect(w.warnings.join()).toContain("mingliklar");
  });
});

describe("import hisobi va qaytarish", () => {
  it("qatorlar: INSERT 614, UPDATE 153, NOCHANGE 246, REMOVE 19 (TZ §9.2)", () => {
    const r = applyImport(before, rows, { importId: "t1", kasb }).report;
    expect(r.counts).toEqual({ INSERT: 614, UPDATE: 153, NOCHANGE: 246, REMOVE: 19 }); expect(r.drawEnabled).toBe(931); expect(r.needsMapping).toBe(62);
    expect(r.art.REDRAW).toHaveLength(108); expect(r.art.NEW_ART).toHaveLength(594);
  });
  it("qo'llangan holat: faol kartalar = eski faol − 19 + 614 (TZ §9.3); eski 418 + 4 vaqtinchalik kasb (№29–32) jadvaldagi kasblar bilan almashtirilgan", () => {
    const res = applyImport(before, rows, { importId: "t1", kasb });
    const retired = Object.values(res.cards.meta).filter((m) => m.retired).length; expect(retired).toBe(19);
    const legacy = (["kasb", "kichik", "katta", "bozor", "xar", "kxar", "hod", "new"] as const).reduce((n, d) => n + res.cards[d].length, 0);
    expect(legacy + res.cards.catalog.length - retired).toBe(418 - 19 + 614);
    expect(strip(res.cards)).toEqual(strip(current)); // bazadagi holat shu import natijasi
  });
  it("ikkinchi import: 0 ta o'zgarish (idempotent, TZ §9.4)", () => {
    const again = applyImport(current, rows, { importId: "t2", kasb });
    expect(again.log).toEqual([]); expect(again.report.inserted + again.report.updated + again.report.retired + again.report.metaUpdated).toBe(0);
    expect(strip(again.cards)).toEqual(strip(current));
  });
  it("qaytarish: jurnal bo'yicha import oldingi holatga teng (TZ §9.5)", () => {
    const res = applyImport(before, rows, { importId: "t3", kasb });
    expect(strip(rollbackImport(res.cards, res.log))).toEqual(strip(before));
  });
  it("xato qator bo'lsa hech narsa yozilmaydi: istisno, kirish o'zgarmaydi (TZ §9.6)", () => {
    const snap = strip(before); const broken = rows.map((r, k) => (k === 800 ? { ...r, effect1_type: "NOMA_LUM", effect1_target: "x", effect1_value: "1" } : r));
    expect(() => applyImport(before, broken, { importId: "bad", kasb })).toThrow(/Tekshiruv xatolari/);
    expect(strip(before)).toEqual(snap);
    const orphan = rows.map((r, k) => (k === 10 && r.operation !== "INSERT" ? { ...r, legacy_file: "YOQ_FAYL.png" } : r)); // eski karta topilmasa — butun import bekor
    expect(() => applyImport(before, orphan, { importId: "bad2", kasb })).toThrow();
  });
  it("yangi kasb uchun jamg'arma/kvartira ma'lumoti bo'lmasa import to'xtaydi", () => { expect(() => applyImport(before, rows, { importId: "x" })).toThrow(/kasb ma'lumoti/); });
});

describe("qo'llangan kontent: havzalar va holatlar", () => {
  const fx = deriveEffects(current); const pools = buildPools(fx); const byId = new Map(fx.map((e) => [e.id, e]));
  it("olib tashlangan 19 karta kolodada yo'q, lekin ID si saqlanadi (saqlangan o'yinlar topa oladi)", () => {
    const retired = fx.filter((e) => e.info?.retired); expect(retired).toHaveLength(19);
    const all = new Set(Object.values(pools.deckIds).flat()); for (const e of retired) { expect(all.has(e.id), e.id).toBe(false); expect(byId.has(e.id)).toBe(true); }
  });
  it("o'qituvchi paneli kartalari (20) o'yin kolodasida yo'q (TZ §9.8)", () => {
    const teacher = current.catalog.filter((c) => c.pool === "TEACHER_PANEL"); expect(teacher).toHaveLength(20);
    const all = new Set(Object.values(pools.deckIds).flat()); for (const c of teacher) expect(all.has(`cat-${c.id}`)).toBe(false);
  });
  it("reytingli havza: yangi (EXTENDED) kartalar alohida ro'yxatda; eski asl kartalar BASE", () => {
    expect(pools.extended.length).toBeGreaterThan(600);
    const asl = fx.filter((e) => !e.info?.catalog && !pools.extended.includes(e.id) && e.deck !== "kasb"); expect(asl.length).toBeGreaterThan(350);
  });
  it("16+ kartalar 16 yoshgacha o'yinchilarga tushmasligi uchun belgilangan (TZ §9.9)", () => {
    expect(pools.adult.length).toBeGreaterThanOrEqual(24); for (const id of pools.adult) { const e = byId.get(id)!; expect(e.info?.age?.startsWith("16+") || e.info?.kind === "SPONSOR_INFO", id).toBe(true); } // 16+ kartalar va homiy (reklama) kartalari
  });
  it("jonli karta ta'siri aniq; ushlab turilganlarning sababi hisobotda", () => {
    const s = catalogSummary(fx); expect(s.active).toBe(1013); expect(s.live + s.held).toBe(1013); expect(s.live).toBeGreaterThan(500);
    for (const e of fx) if (isLive(e)) expect(e.effect.kind).not.toBe("unresolved");
  });
  it("eski kartalar o'zgartirilgan: «Xarajat_033» dagi kirill harfi tuzatilgan; 008_xarajat, Xarajat_034, Xarajat_054 dekasi jadvalga mos", () => {
    const x033 = current.xar.find((x) => x.file.startsWith("Xarajat_033"))!; expect(/[Ѐ-ӿ]/.test(x033.text)).toBe(false);
    expect(byId.get("kxar-8")!.deck).toBe("xar"); expect(pools.deckIds.xar).toContain("kxar-8"); expect(pools.deckIds.kxar).not.toContain("kxar-8");
  });
  it("yangi kasblar: jami xarajat = ish haqi − pul oqimi; xarajat qatori yo'q bo'lsa blankda faqat jami", () => {
    const ks = current.kasb.filter((k) => k.n >= 33); expect(ks).toHaveLength(20);
    for (const k of ks) { expect(k.salary - k.total).toBe(k.cf); expect(k.exp).toBeUndefined(); expect(k.file).toBe(""); }
    expect(current.kasb.find((k) => k.n === 4)!.total).toBe(675); expect(current.kasb.find((k) => k.n === 4)!.exp).toBeUndefined(); // qatorlar qayta taqsimlanmaguncha
  });
});
