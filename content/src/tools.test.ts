import { describe, it, expect } from "vitest";
import { loadContent } from "./index";
import { importKasb, parseCsv, checkCardFiles, expectedFiles, KASB_HEADER } from "./tools";

const H = KASB_HEADER.join(",");
const row = (o: Partial<Record<string, string>> = {}) => { const b: Record<string, string> = { n: "99", name: "Sinov kasbi", salary: "500", exp1: "20", exp2: "150", exp3: "0", exp4: "0", exp5: "20", exp6: "0", exp7: "20", exp8: "20", exp9: "50", save: "300", kv: "0", car: "0", child: "60", flags: "", file: "99_SINOV.png", ...o }; return KASB_HEADER.map((k) => b[k]).join(","); };
const existing = loadContent().cards.kasb;

describe("CSV", () => {
  it("qo'shtirnoq, vergul va qator oxirlari", () => expect(parseCsv('a,"b,c",d\r\n1,"x ""y""",3\n\n')).toEqual([["a", "b,c", "d"], ["1", 'x "y"', "3"]]));
});
describe("kasb importi", () => {
  it("total va cf hisoblanadi; yaroqli qator qabul qilinadi", () => {
    const r = importKasb(`${H}\n${row()}`, existing); expect(r.errors).toEqual([]);
    expect(r.ok[0]).toMatchObject({ n: 99, total: 280, cf: 220, exp: [20, 150, 0, 0, 20, 0, 20, 20, 50] });
  });
  it("xatolar: bo'sh raqam, takroriy raqam/fayl, yomon fayl nomi, salbiy pul oqimi tekshiriladi", () => {
    expect(importKasb(`${H}\n${row({ salary: "" })}`, existing).errors[0]).toContain("2-qator");
    expect(importKasb(`${H}\n${row({ n: "1" })}`, existing).errors.join()).toContain("allaqachon bor");
    expect(importKasb(`${H}\n${row({ file: existing[0].file })}`, existing).errors.join()).toContain("allaqachon ishlatilgan");
    expect(importKasb(`${H}\n${row({ file: "../x.png" })}`, existing).errors.join()).toContain("yaroqsiz");
    expect(importKasb(`${H}\n${row()}\n${row()}`, existing).errors.join()).toContain("allaqachon");
    expect(importKasb("n,name\n1,a", existing).errors[0]).toContain("ustun yo'q");
    expect(importKasb("", existing).errors[0]).toContain("bo'sh");
  });
});
describe("karta rasmlari tekshiruvi", () => {
  it("haqiqiy kontentda ~418 rasm fayli kutiladi (rasmsiz yangi kartalar hisobga kirmaydi)", () => {
    const c = loadContent().cards; const e = expectedFiles(c as any); expect(e.length).toBeGreaterThan(400); expect(new Set(e).size).toBe(e.length);
  });
  it("yetishmaydi / ortiqcha / registr / bo'sh / yaroqsiz", () => {
    const r = checkCardFiles(["a.png", "b.png", "c.png"], { "a.png": 10, "B.PNG": 5, "d.png": 0, "bad name.png": 3 });
    expect(r).toMatchObject({ expected: 3, present: 1, missing: ["b.png", "c.png"], caseMismatch: [["b.png", "B.PNG"]], empty: ["d.png"], unsafe: ["B.PNG".toLowerCase() === "" ? "" : "bad name.png"] });
    expect(r.extra).toEqual(["d.png", "bad name.png"]);
  });
});
