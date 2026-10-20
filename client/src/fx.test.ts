import { describe, it, expect } from "vitest";
import { diffSnap, isGood, sameSnap, type Snap } from "./fx";

const base: Snap = { cash: 1000, flow: 500, passive: 0, debt: 0, assets: [] };
describe("moliya o'zgarishlari (fx)", () => {
  it("o'zgarish yo'q — hodisa yo'q", () => { expect(diffSnap(base, { ...base })).toEqual([]); expect(sameSnap(base, { ...base })).toBe(true); });
  it("xarajat: naqd kamayadi (qizil)", () => {
    const ev = diffSnap(base, { ...base, cash: 980 });
    expect(ev).toEqual([{ kind: "cash", delta: -20 }]); expect(isGood(ev[0])).toBe(false);
  });
  it("daromad: naqd oshadi (yashil)", () => {
    const ev = diffSnap(base, { ...base, cash: 1500 }); expect(ev).toEqual([{ kind: "cash", delta: 500 }]); expect(isGood(ev[0])).toBe(true);
  });
  it("aktiv sotib olindi: naqd −, passiv +, pul oqimi takrorlanmaydi, aktiv qo'shildi", () => {
    const next: Snap = { cash: 600, flow: 600, passive: 100, debt: 0, assets: [{ code: "KB-001", kind: "buy", monthlyIncome: 100 }] };
    const ev = diffSnap(base, next);
    expect(ev.map((e) => e.kind)).toEqual(["cash", "passive", "assetAdd"]);
    expect(ev[0].delta).toBe(-400); expect(ev[1].delta).toBe(100); expect(ev[2]).toMatchObject({ code: "KB-001", income: 100 });
  });
  it("pul oqimi faqat xarajat o'zgarsa alohida ko'rsatiladi", () => {
    const ev = diffSnap(base, { ...base, flow: 450 }); expect(ev).toEqual([{ kind: "flow", delta: -50 }]); expect(isGood(ev[0])).toBe(false);
  });
  it("qarz oshsa — yomon, kamaysa — yaxshi", () => {
    expect(isGood(diffSnap(base, { ...base, debt: 2000 })[0])).toBe(false);
    expect(isGood(diffSnap({ ...base, debt: 2000 }, base)[0])).toBe(true);
  });
  it("aktiv yo'qoldi", () => {
    const a = { code: "X", kind: "buy", monthlyIncome: 50 };
    const ev = diffSnap({ ...base, assets: [a] }, base); expect(ev).toEqual([{ kind: "assetLost", code: "X", assetKind: "buy", income: 50 }]);
  });
  it("ko'p aktiv bir yo'la qo'shilsa — chip soni cheklanadi", () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ code: `C${i}`, kind: "buy", monthlyIncome: 10 }));
    const ev = diffSnap(base, { ...base, assets: many }); expect(ev.filter((e) => e.kind === "assetAdd").length).toBe(4); expect(ev[ev.length - 1]).toMatchObject({ count: 3 });
  });
});
