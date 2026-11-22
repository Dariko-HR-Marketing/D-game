import { describe, expect, it } from "vitest";
import { SMALL_BOARD } from "@tajriba24/rules";
import { BIG_CELLS } from "./bigBoard";
import { ringCorners, ringShape, ringTiles, pathIndex } from "./boardLayout";

/** Qoida (buyurtmachi, 2026-11-22): to'rtta daromad katagi hamma taxta shaklida burchaklarda: kichik aylana «D», katta aylana «Yana pullar» (Y). */
describe("taxta: daromad kataklari to'rt burchakda", () => {
  const smallD = [...SMALL_BOARD].map((c, i) => (c === "D" ? i : -1)).filter((i) => i >= 0);
  const bigY = BIG_CELLS.map((c, i) => (c.t === "Y" ? i : -1)).filter((i) => i >= 0);
  for (const [name, n, wide, cells] of [["kichik · telefon", 48, false, smallD], ["kichik · kompyuter", 48, true, smallD], ["katta · telefon", 53, false, bigY], ["katta · kompyuter", 53, true, bigY]] as const) {
    it(name, () => {
      const s = ringShape(n, wide); expect(s.t + s.b + s.l + s.r).toBe(n); expect(cells.length).toBe(4);
      const corners = ringCorners(s).sort((a, b) => a - b); const at = cells.map((cell) => pathIndex(cell, n, s.offset)).sort((a, b) => a - b);
      expect(at).toEqual(corners);
      const tiles = ringTiles(s, 800, 600, 50); expect(tiles.length).toBe(n); for (const p of corners) expect(tiles[p].corner).toBe(true);
    });
  }
});
