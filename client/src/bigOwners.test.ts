import { describe, expect, it } from "vitest";
import { bigOwners } from "./bigOwners";

describe("katta aylana: katak egalari", () => {
  const players = [
    { id: "a", assets: [{ code: "big-5" }, { code: "KB" }, { code: "big-12" }], dreamVisits: [17] },
    { id: "b", assets: [{ code: "big-7" }, { code: "SH" }], dreamAt: 17 },
    { id: "c", assets: [], dreamVisits: [4, 17] },
  ];
  it("turg'un va tavakkal bizneslar egasi bo'yicha belgilanadi; kichik aylana aktivlari (KB, SH…) hisobga kirmaydi", () => {
    const m = bigOwners(players);
    expect(m.get(5)).toEqual([{ id: "a", n: 1, kind: "biz" }]); expect(m.get(12)).toEqual([{ id: "a", n: 1, kind: "biz" }]); expect(m.get(7)).toEqual([{ id: "b", n: 2, kind: "biz" }]);
    expect(m.has(0)).toBe(false); expect([...m.keys()].sort((x, y) => x - y)).toEqual([4, 5, 7, 12, 17]);
  });
  it("orzu katagi: avval amalga oshirgan, keyin yetib kelganlar (shart bajarilmagan) — hammasi ro'yxatda", () => {
    expect(bigOwners(players).get(17)).toEqual([{ id: "b", n: 2, kind: "dream" }, { id: "a", n: 1, kind: "visit" }, { id: "c", n: 3, kind: "visit" }]);
    expect(bigOwners(players).get(4)).toEqual([{ id: "c", n: 3, kind: "visit" }]);
  });
  it("hech kim sotib olmagan bo'lsa bo'sh", () => { expect(bigOwners([{ id: "a" }, { id: "b", assets: [] }]).size).toBe(0); });
});
