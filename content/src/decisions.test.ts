import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { loadContent, parseBundle, validateBundle } from "./index";

// docs/DECISIONS_NEEDED.md dagi tayyor JSON hujjat bilan kod mos ekanini kafolatlaydi (hujjat eskirib qolmasin).
const md = readFileSync(new URL("../../docs/DECISIONS_NEEDED.md", import.meta.url), "utf-8");
const blocks = [...md.matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => JSON.parse(m[1]));

describe("DECISIONS_NEEDED.md dagi cellRules namunasi", () => {
  it("D2 turns:0 ataylab noto'g'ri — to'ldirilmaguncha nashr qilib bo'lmaydi", () => {
    const b = loadContent(); expect(() => parseBundle({ ...b, cellRules: blocks[0] })).toThrow();
  });
  it("turns to'ldirilsa va hamma katak mavjud bo'lsa, namuna yaroqli", () => {
    const rules = JSON.parse(JSON.stringify(blocks[0])); rules.small.Q.turns = 2;
    const parsed = parseBundle({ ...loadContent(), cellRules: rules }); expect(validateBundle(parsed)).toEqual([]);
  });
  it("hujjatdagi katak raqamlari va faktlar maydon ma'lumotiga mos", () => {
    const { bigBoard } = loadContent();
    for (const [i, name] of [[5, "Bankrot"], [23, "Ajrashish"], [33, "Audit tekshiruvi"], [34, "Start"]] as const) expect(bigBoard[i].name).toBe(name);
    expect(bigBoard[47].price).toBe(1_000_000); expect(bigBoard.filter((c) => c.t === "V")).toHaveLength(9);
    expect(bigBoard.filter((c) => c.t === "Y").map((c) => c.i)).toEqual([0, 15, 26, 42]);
    expect(bigBoard.filter((c) => c.t === "X")).toHaveLength(5);
  });
});
