import { describe, it, expect } from "vitest";
import { loadContent, EXPECTED_COUNTS, deriveEffects } from "./index";

const { cards, bigBoard, dreams } = loadContent();
const effects = deriveEffects(cards);

describe("kontent", () => {
  it("kolodalar soni SPEC bilan mos (418)", () => {
    for (const [k, n] of Object.entries(EXPECTED_COUNTS)) expect((cards as any)[k]).toHaveLength(n);
    expect(Object.values(EXPECTED_COUNTS).reduce((a, b) => a + b, 0)).toBe(418);
  });
  it("katta aylana: 53 katak, 14 orzu katagi, START=34", () => {
    expect(bigBoard).toHaveLength(53);
    expect(bigBoard.filter((c) => c.t === "O")).toHaveLength(dreams.length);
    expect(bigBoard[34].name).toBe("Start");
  });
  it("rasm fayl nomlari takrorlanmaydi (deka ichida)", () => {
    for (const [k, deck] of Object.entries(cards)) {
      const f = (deck as any[]).map((x) => x.file);
      expect(new Set(f).size, k).toBe(f.length);
    }
  });
});

describe("kartalar ta'siri (100 %)", () => {
  it("har bir karta uchun ta'sir bor", () => expect(effects).toHaveLength(418));
  it("hal qilinmagan karta yo'q", () => expect(effects.filter((e) => e.effect.kind === "unresolved")).toEqual([]));
  it("xarajat kartasida 'A + B' yozilgan bo'lsa, summa yig'indiga teng", () => {
    for (const x of cards.xar) {
      const m = x.note.match(/«(\d+) \+ (\d+)»/);
      if (m) expect(x.amount, `xar ${x.n}`).toBe(Number(m[1]) + Number(m[2]));
    }
  });
  it("ko'chmas mulk: down + credit = full", () => {
    for (const e of effects) if (e.effect.kind === "buy" && e.effect.credit !== undefined)
      expect((e.effect.down ?? 0) + e.effect.credit, e.id).toBe(e.effect.price);
  });
  it("yangi 6 karta: MO, XAY, IJR, TOSH, SUG, Q", () => {
    expect(cards.new.map((n) => n.code).sort()).toEqual(["IJR", "MO", "Q", "SUG", "TOSH", "XAY"]);
  });
  it("har bir ta'sirda matn bor", () => {
    expect(effects.every((e) => typeof e.text === "string" && e.text.length > 0)).toBe(true);
    expect(effects.find((e) => e.id === "xar-1")!.text).toBe(cards.xar[0].text);
  });
});

import { parseBundle, validateBundle } from "./index";
describe("admin kontentini tekshirish", () => {
  const raw = () => JSON.parse(JSON.stringify({ cards, bigBoard, dreams }));
  it("asl kontent nashrga yaroqli", () => expect(validateBundle(parseBundle(raw()))).toEqual([]));
  it("sxemaga mos kelmasa rad (xarajat summasi manfiy)", () => {
    const r = raw(); r.cards.xar[0].amount = -5;
    expect(() => parseBundle(r)).toThrow();
  });
  it("orzu katagi topilmasa — muammo", () => {
    const r = raw(); r.dreams[0].name = "yo'q orzu";
    expect(validateBundle(parseBundle(r)).join()).toContain("orzu");
  });
  it("kasb jami xarajati noto'g'ri bo'lsa rad", () => {
    const r = raw(); r.cards.kasb[0].total += 1;
    expect(() => parseBundle(r)).toThrow();
  });
});

import { isSafeCardFile, cardFileUrl } from "./index";
describe("karta rasmi fayl nomlari (§2.5)", () => {
  it("hamma 418 kartaning fayl nomi xavfsiz shaklga mos va URL ga aylanadi", () => {
    const files = Object.values(cards).flat().map((x: any) => x.file as string);
    expect(files).toHaveLength(418);
    for (const f of files) { expect(isSafeCardFile(f), f).toBe(true); expect(cardFileUrl("/cards", f), f).toContain("/cards/"); }
  });
  it("apostrofli nom kodlanadi; yo'l o'tishi va begona kengaytma rad etiladi", () => {
    expect(cardFileUrl("/cards", "11_G'AZNACHI.png")).toBe("/cards/11_G'AZNACHI.png");
    for (const f of ["../x.png", "a/b.png", "x.svg", "x.png?a=1", "", "a b.png", "<i>.png"]) expect(cardFileUrl("/cards", f), f).toBeNull();
  });
});
