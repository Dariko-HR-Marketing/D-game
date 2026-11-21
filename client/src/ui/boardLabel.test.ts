import { describe, it, expect } from "vitest";
import { labelSize } from "../boardLayout";
describe("taxta yozuvi o'lchami", () => {
  it("telefon: 10 px dan oshmaydi", () => { expect(labelSize("START", 60, 999, false)).toBeLessThanOrEqual(10); });
  it("kompyuter: keng katakda 13 px gacha o'sadi, eski 10 px dan katta", () => { expect(labelSize("START", 72, 72, true)).toBeGreaterThan(10); expect(labelSize("START", 72, 72, true)).toBeLessThanOrEqual(13); });
  it("past katakda ikki qator sig'masa kichrayadi", () => { expect(labelSize("Sarmoya", 72, 36, true)).toBeLessThan(labelSize("Sarmoya", 72, 72, true)); });
  it("uzun so'z tor katakka sig'adigan darajada kichrayadi", () => { expect(labelSize("Daromadlar", 48, 72, true)).toBeLessThan(10); });
});
