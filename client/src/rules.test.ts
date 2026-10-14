import { describe, it, expect } from "vitest";
import { RULES } from "@poyga/rules";
import { ruleItems } from "./i18n/rulesText";

describe("qoidalar ekrani (§15): manba bilan, dvigatel konstantalaridan", () => {
  const items = ruleItems(RULES);
  it("id lar takrorlanmaydi, har birida sarlavha, matn va SPEC manbasi bor", () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const i of items) { expect(i.title.length).toBeGreaterThan(2); expect(i.text.length).toBeGreaterThan(20); expect(i.source).toMatch(/^SPEC §\d/); }
  });
  it("matndagi raqamlar RULES dan keladi (to'liq yozilgan, qisqartirishsiz)", () => {
    const t = (id: string) => items.find((i) => i.id === id)!.text;
    expect(t("bank")).toContain("10 000"); expect(t("bank")).toContain("/ 36"); expect(t("bank")).toContain("20 %");
    expect(t("exit")).toContain("1 000 000"); expect(t("exit")).toContain("25 000");
    expect(t("win")).toContain("100 000");
    expect(t("suyunchi")).toMatch(/500 sh\.b\./); expect(t("suyunchi")).toContain("10–500");
    expect(t("loan")).toContain("5 o'yinchi"); expect(t("loan")).toContain("20 %"); expect(t("loan")).toContain("50 %");
    expect(t("card")).toContain("30 soniya"); expect(t("qar")).toContain("100"); expect(t("level")).toContain("100 ball");
  });
  it("konstanta o'zgarsa matn ham o'zgaradi (qo'lda yozilgan raqam yo'q)", () => {
    const changed = ruleItems({ ...RULES, bankLimit: 12_345 }).find((i) => i.id === "bank")!.text;
    expect(changed).toContain("12 345"); expect(changed).not.toContain("10 000");
  });
});
