import { describe, it, expect } from "vitest";
import { loadContent } from "@poyga/content";
import { ContentRegistry } from "./registry";

describe("paketdan sinxronlash (deploy'dan keyin yangi kartalar)", () => {
  const base = () => JSON.parse(JSON.stringify(loadContent())) as ReturnType<typeof loadContent>;
  const restoredFrom = (b: ReturnType<typeof loadContent>, part: "initial" | "cards" = "initial") => ({ rows: [{ info: { version: 1, part, note: "", author: "x", at: 1, published: true }, bundle: b }], active: 1 as number | null });
  it("bir xil paket — o'zgarish yo'q", () => {
    const old = base(); const r = new ContentRegistry(old, () => 1, undefined, restoredFrom(old)); expect(r.syncPackage(base(), "system", false)).toMatchObject({ changed: false, reason: "same" }); expect(r.activeVersion).toBe(1);
  });
  it("bazadagi dastlabki versiya eskirgan — yangi versiya yaratiladi va faollashadi; eski versiya saqlanadi (o'yinlar o'z versiyasida)", () => {
    const old = base(); old.dreams = old.dreams.slice(0, 10); const r = new ContentRegistry(old, () => 1, undefined, restoredFrom(old));
    const x = r.syncPackage(base(), "system", false); expect(x).toMatchObject({ changed: true, version: 2 }); expect(r.activeVersion).toBe(2);
    expect(r.bundle(2)!.dreams.length).toBe(base().dreams.length); expect(r.bundle(1)!.dreams.length).toBe(10); expect(r.ctxFor(1)!.dreams.length).toBe(10); expect(r.infos.find((i) => i.version === 2)!.note).toMatch(/Paket yangilandi/);
    expect(r.syncPackage(base(), "system", false)).toMatchObject({ changed: false, reason: "same" }); // takroran — o'zgarish yo'q
  });
  it("faol versiya admin tahriri bo'lsa avtomatik almashtirilmaydi; majburiy (admin tugmasi) almashtiradi", () => {
    const old = base(); old.dreams = old.dreams.slice(0, 10); const r = new ContentRegistry(old, () => 1, undefined, restoredFrom(old, "cards"));
    expect(r.syncPackage(base(), "system", false)).toMatchObject({ changed: false, reason: "admin_edits" }); expect(r.activeVersion).toBe(1);
    expect(r.syncPackage(base(), "admin1", true)).toMatchObject({ changed: true, version: 2 }); expect(r.activeVersion).toBe(2);
  });
});
