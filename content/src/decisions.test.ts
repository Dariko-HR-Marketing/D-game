import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { loadContent, parseBundle, validateBundle } from "./index";

// docs/DECISIONS_NEEDED.md dagi JSON haqiqiy standart qoidalarga teng bo'lishi shart (hujjat eskirib qolmasin).
const md = readFileSync(new URL("../../docs/DECISIONS_NEEDED.md", import.meta.url), "utf-8");
const blocks = [...md.matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => JSON.parse(m[1]));

describe("DECISIONS_NEEDED.md", () => {
  it("cellRules namunasi standart cell_rules.json bilan bir xil va yaroqli", () => {
    const b = loadContent(); expect(blocks[0]).toEqual(b.cellRules);
    expect(validateBundle(parseBundle({ ...b, cellRules: blocks[0] }))).toEqual([]);
  });
  it("hujjatdagi katak raqamlari va faktlar maydon ma'lumotiga mos", () => {
    const { bigBoard } = loadContent();
    for (const [i, name] of [[5, "Bankrot"], [23, "Ajrashish"], [33, "Audit tekshiruvi"], [34, "Start"]] as const) expect(bigBoard[i].name).toBe(name);
    expect(bigBoard[47].price).toBe(1_000_000); expect(bigBoard.filter((c) => c.t === "V")).toHaveLength(9);
  });
});
