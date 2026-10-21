import { describe, it, expect } from "vitest";
import { layoutOf } from "./layout";

describe("ekran turi (layoutOf)", () => {
  const k = (w: number, h: number) => layoutOf(w, h).kind;
  it("tik telefonlar", () => { for (const [w, h] of [[320, 568], [360, 640], [375, 667], [390, 844], [412, 915], [430, 932]]) expect(k(w, h), `${w}x${h}`).toBe("phone"); });
  it("yotiq telefonlar — ixcham", () => { for (const [w, h] of [[568, 320], [667, 375], [844, 390], [932, 430]]) expect(k(w, h), `${w}x${h}`).toBe("compact"); });
  it("tik planshetlar (kompyuter tartibi emas)", () => { for (const [w, h] of [[600, 960], [768, 1024], [820, 1180], [1024, 1366]]) expect(k(w, h), `${w}x${h}`).toBe("tablet"); });
  it("yotiq planshet va kompyuter", () => { for (const [w, h] of [[1024, 768], [1180, 820], [1366, 1024], [1280, 720], [1440, 900], [1920, 1080], [2560, 1440]]) expect(k(w, h), `${w}x${h}`).toBe("wide"); });
  it("ixcham ham kompyuter tartibining bir turi (wide=true), phone/tablet emas", () => { expect(layoutOf(844, 390).wide).toBe(true); expect(layoutOf(390, 844).wide).toBe(false); expect(layoutOf(768, 1024).tablet).toBe(true); });
});
