import { describe, expect, it } from "vitest";
import { bigCellInfo, smallCellInfo } from "./cellInfo";
import { BIG_CELLS } from "./bigBoard";
import { CELL_RULES } from "./cellRules";
import rulesJson from "../../content/data/cell_rules.json";

const names = (id: string) => ({ a: "Ali", b: "Vali" } as Record<string, string>)[id] ?? id;
describe("katak tushuntirishi", () => {
  it("katak qoidalari raqamlari kontent bilan bir xil", () => { expect(JSON.parse(JSON.stringify(CELL_RULES))).toEqual(rulesJson); });
  it("turg'un biznes: nom, narx, daromad va egasi (yoki «egasi yo'q»)", () => {
    const i = BIG_CELLS.findIndex((c) => c.t === "T"); const c = BIG_CELLS[i];
    const free = bigCellInfo(i, [], names); expect(free.title).toBe(c.name); expect(free.kind).toBe("Turg'un biznes");
    expect(free.lines.map((l) => l.k)).toEqual(["Narxi", "Oylik daromad", "Egasi"]); expect(free.lines[2].v).toBe("Hozircha egasi yo'q");
    expect(bigCellInfo(i, [{ id: "a", n: 1, kind: "biz" }], names).lines.find((l) => l.k === "Egasi")!.v).toBe("Ali");
  });
  it("tavakkal biznes: yutuqli qirralar ko'rsatiladi", () => { const i = BIG_CELLS.findIndex((c) => c.t === "V" && c.faces); expect(bigCellInfo(i, [], names).lines.some((l) => l.k === "Yutuqli kubik")).toBe(true); });
  it("orzu katagi: g'alaba sharti va ko'ruvchining shaxsiy ko'rsatkichi (pul oqimi, naqd); yetib kelganlar ro'yxatda", () => {
    const i = BIG_CELLS.findIndex((c) => c.t === "O");
    const d = bigCellInfo(i, [{ id: "a", n: 1, kind: "visit" }, { id: "b", n: 2, kind: "dream" }], names, { cash: 500_000, flow: 40_000, dreamName: "Yaxta", dreamPrice: 1_000_000 });
    expect(d.text.join(" ")).toContain("100 000"); expect(d.text.join(" ")).toContain("Yaxta");
    expect(d.lines).toEqual([{ k: "Sizning pul oqimingiz", v: "40 000 / 100 000" }, { k: "Sizning naqdingiz", v: "500 000 / 1 000 000" }]);
    expect(d.owners.map((o) => o.what)).toEqual(["Orzu katagiga yetdi, shart bajarilmadi", "Orzu amalga oshdi"]);
  });
  it("maxsus kataklar: qoida matnlari katak qoidalaridan (Bankrot, Ajrashish 50 %, Audit 20 %, Nohalol biznes)", () => {
    const t = (name: string) => bigCellInfo(BIG_CELLS.findIndex((c) => c.name.startsWith(name)), [], names).text.join(" ");
    expect(t("Bankrot")).toContain("eng kam daromadli biznesingiz yo'qoladi"); expect(t("Ajrashish")).toContain("50 %"); expect(t("Audit")).toContain("20 %"); expect(t("Siz nohalol")).toContain("1 000 000");
  });
  it("kichik aylana: har bir katak turi tushuntiriladi (Q — 4 oy maosh yo'q)", () => {
    const q = SMALL_Q(); expect(smallCellInfo(q).text.join(" ")).toContain("4 oy maosh yo'q"); expect(smallCellInfo(0).kind).toBe("Start");
  });
});
import { SMALL_BOARD } from "@tajriba24/rules";
const SMALL_Q = () => SMALL_BOARD.indexOf("Q");
