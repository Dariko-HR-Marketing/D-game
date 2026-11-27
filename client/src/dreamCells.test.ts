import { describe, it, expect } from "vitest";
import { dreamCells } from "./dreamCells";

const O = [2, 5, 9, 12, 15, 18, 21, 25, 28, 31, 35, 38, 42, 47]; // 14 ta «O» katak
const dreams = Array.from({ length: 40 }, (_, i) => ({ name: `Orzu ${i}`, price: 800_000 + i * 1000 }));
const players = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, dreamIdx: i * 3 }));

describe("orzular «O» kataklarida", () => {
  it("8 o'yinchi: 8 ta orzu 8 ta turli katakda, nom va summa katalogdan, kim tanlagani ma'lum", () => {
    const m = dreamCells("ABC123", O, players(8), dreams);
    expect(m.size).toBe(8); expect(new Set(m.keys()).size).toBe(8); for (const c of m.keys()) expect(O).toContain(c);
    const got = [...m.values()].map((d) => d.name).sort(); expect(got).toEqual(players(8).map((p) => dreams[p.dreamIdx].name).sort());
    for (const d of m.values()) expect(d.price).toBe(dreams.find((x) => x.name === d.name)!.price);
    expect(new Set([...m.values()].map((d) => d.by)).size).toBe(8);
  });
  it("bir xil xona kodi — bir xil joylashuv (hamma ko'radi); boshqa kod — boshqacha; bo'sh kataklarga orzu to'qilmaydi", () => {
    const a = dreamCells("ABC123", O, players(3), dreams), b = dreamCells("ABC123", O, players(3), dreams), c = dreamCells("ZZZ999", O, players(3), dreams);
    expect([...a]).toEqual([...b]); expect(a.size).toBe(3); expect(O.filter((x) => !a.has(x))).toHaveLength(11);
    expect([...a.keys()]).not.toEqual([...c.keys()]);
  });
  it("orzu tanlanmagan yoki yashirin (null) bo'lsa — joylashmaydi", () => {
    expect(dreamCells("X", O, [{ id: "a", dreamIdx: null }, { id: "b" }, { id: "c", dreamIdx: 1 }], dreams.map((d, i) => (i === 1 ? null : d))).size).toBe(0);
    expect(dreamCells("X", O, players(2), undefined).size).toBe(0);
  });
});
