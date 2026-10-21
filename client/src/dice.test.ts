import { describe, it, expect } from "vitest";
import { diceOf, placeholderCount } from "./dice";

describe("kubiklarni ko'rsatish", () => {
  it("serverdagi dice ishlatiladi", () => { expect(diceOf({ die: 9, dice: [4, 5] })).toEqual([4, 5]); expect(diceOf({ die: 3, dice: [3] })).toEqual([3]); });
  it("eski o'yin: 1 kubik; 7+ yoki 2 kubik bo'lsa yig'indi ikkiga bo'linadi, yig'indi saqlanadi", () => {
    expect(diceOf({ die: 4 })).toEqual([4]);
    for (let d = 2; d <= 12; d++) { const x = diceOf({ die: d }, true)!; expect(x).toHaveLength(2); expect(x[0] + x[1]).toBe(d); expect(x.every((v) => v >= 1 && v <= 6)).toBe(true); }
    for (let d = 7; d <= 12; d++) { const x = diceOf({ die: d })!; expect(x[0] + x[1]).toBe(d); }
  });
  it("noto'g'ri dice e'tiborga olinmaydi", () => { expect(diceOf({ die: 5, dice: [9] })).toEqual([5]); expect(diceOf(null)).toBeNull(); });
  it("tashlashdan oldin: katta aylana yoki xayriya — 2 ta, aks holda 1 ta", () => { expect(placeholderCount("big")).toBe(2); expect(placeholderCount("small")).toBe(1); expect(placeholderCount("small", 2)).toBe(2); });
});
