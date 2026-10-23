import { describe, it, expect } from "vitest";
import { detectMoments, snapRoom } from "./moments";

const player = (id: string, x: any = {}) => ({ id, cash: 5_000, salary: 2_000, baseExpenses: 1_000, childCost: 200, children: 0, bankDebt: 0, bankLoans: [], qar: false, insuredCar: false, handLoans: 0, handDebts: [], assets: [], circle: "small", noSalary: 0, quitJob: false, restarts: 0, monthsPlayed: 0, lockedFlow: 0, ...x });
const room = (me: any = {}, extra: any = {}, st: any = {}) => ({ state: { players: [player("me", me), player("bob")], bots: [], proposals: [], lastCard: null, turn: 0, round: 1, ...st }, names: { bob: { name: "Bobur" } }, members: [{ userId: "me" }, { userId: "bob" }], marketCards: {}, assetCards: {}, pendingCard: null, lastCard: null, ...extra });
const kinds = (ms: any[]) => ms.map((m) => m.kind);
const step = (before: any, after: any) => detectMoments(snapRoom(before, "me"), after, "me");

describe("lahzalar: holat farqidan his-tuyg'uli ishoralar", () => {
  it("sahifa ochilganda (oldingi holat yo'q) hech narsa chiqmaydi; o'zgarish bo'lmasa ham", () => {
    expect(detectMoments(null, room(), "me")).toEqual([]); expect(step(room(), room())).toEqual([]);
  });
  it("farzand tug'ildi: o'zimga ovoz va tushuntirish, boshqaga ovozsiz", () => {
    const mine = step(room(), room({ children: 1 })); expect(kinds(mine)).toEqual(["child"]); expect(mine[0]).toMatchObject({ mine: true, sfx: "child", tone: "good" }); expect(mine[0].note).toContain("xarajat");
    const other = detectMoments(snapRoom(room(), "me"), { ...room(), state: { ...room().state, players: [player("me"), player("bob", { children: 1 })] } }, "me");
    expect(other[0]).toMatchObject({ kind: "child", mine: false }); expect(other[0].sfx).toBeUndefined(); expect(other[0].title).toContain("Bobur");
  });
  it("ishdan bo'shash: maosh yo'q (yomon) va biznesdan yashash (ozodlik) — turli ovoz", () => {
    expect(step(room(), room({ noSalary: 3 }))[0]).toMatchObject({ kind: "jobLoss", sfx: "jobloss", tone: "bad", strong: true });
    expect(step(room(), room({ quitJob: true, salary: 0 }))[0]).toMatchObject({ kind: "quitJob", sfx: "freedom", tone: "special" });
  });
  it("xarid: sarlavha, narx, daromad; sotish: tushum", () => {
    const asset = { kind: "buy", code: "KB1", price: 1_500, monthlyIncome: 100, creditPayment: 0, credit: 0 };
    const after = room({ assets: [asset], cash: 3_500 }, { assetCards: { KB1: { text: "Mahallangizda elchixona ochilmoqda.", file: "", asset: "small_business" } } });
    const b = step(room(), after)[0]; expect(b).toMatchObject({ kind: "buy", sfx: "buy" }); expect(b.text).toContain("elchixona"); expect(b.note).toContain("1 500"); expect(b.note).toContain("100");
    const sold = step(after, room({ assets: [], cash: 6_000 }))[0]; expect(sold).toMatchObject({ kind: "sell", sfx: "sell" }); expect(sold.text).toContain("2 500");
  });
  it("kutilmagan hodisa, xarajat, bozor: karta turiga qarab", () => {
    const base = room(); const card = (id: string, text: string, effect: any = {}) => room({}, { lastCard: { text, effect, mode: "mandatory", file: "" } }, { lastCard: { playerId: "me", cardId: id, n: 1 } });
    expect(step(base, card("hod-3", "Tovarni berdingiz. Bankka to'lang."))[0]).toMatchObject({ kind: "unexpected", sfx: "unexpected", strong: true, title: "KUTILMAGAN HODISA!" });
    const ex = step(base, card("xar-7", "Atir sindi.", { kind: "pay", amount: 120 }))[0]; expect(ex.kind).toBe("expense"); expect(ex.sfx).toBeUndefined(); // pul ovozi allaqachon bor — ikkilanmaydi
    expect(step(base, card("bozor-5", "Aksiya narxi tushdi."))[0]).toMatchObject({ kind: "market", sfx: "market" });
    const other = detectMoments(snapRoom(base, "me"), room({}, { lastCard: { text: "x", effect: {}, mode: "mandatory", file: "" } }, { lastCard: { playerId: "bob", cardId: "xar-7", n: 1 } }), "me"); expect(other).toEqual([]); // boshqaning oddiy xarajati — shovqin emas
  });
  it("deka tanlash ochilishi va yopilishi: tushuntirish bilan, faqat o'tish paytida", () => {
    const up = step(room({ cash: 20_000 }), room({ cash: 30_000 }))[0]; expect(up).toMatchObject({ kind: "unlock", sfx: "unlock", strong: true }); expect(up.note).toContain("kichik yoki katta");
    expect(step(room({ cash: 30_000 }), room({ cash: 31_000 }))).toEqual([]); // qaytarilmaydi
    const down = step(room({ cash: 30_000 }), room({ cash: 10_000 }))[0]; expect(down).toMatchObject({ kind: "lock" }); expect(down.note).toContain("Kichik sarmoyalar");
  });
  it("chiqish shartlari: har biri bajarilganda hisob (1/4…), hammasi bajarilsa «tayyorsiz»", () => {
    const c1 = step(room({ cash: 900_000 }), room({ cash: 1_000_000 })); expect(c1.find((m) => m.kind === "condition")).toMatchObject({ sfx: "milestone" }); expect(c1.find((m) => m.kind === "condition")!.title).toContain("/4");
    const biz = { kind: "business", code: "B", price: 1, monthlyIncome: 25_000, creditPayment: 0, credit: 0 };
    const ready = step(room({ cash: 1_000_000, assets: [{ ...biz, monthlyIncome: 24_999 }] }), room({ cash: 1_000_000, assets: [biz] })); expect(ready.some((m) => m.kind === "ready")).toBe(true);
  });
  it("bir vaqtda bir nechta shart bajarilsa «Chiqishga tayyorsiz!» faqat bitta chiqadi", () => {
    const biz = { kind: "business", code: "B", price: 1, monthlyIncome: 25_000, creditPayment: 0, credit: 0 };
    const both = step(room({ cash: 900_000, assets: [{ ...biz, monthlyIncome: 24_999 }] }), room({ cash: 1_000_000, assets: [biz] }));
    expect(both.filter((m) => m.kind === "ready")).toHaveLength(1); expect(both.filter((m) => m.kind === "condition")).toHaveLength(0);
  });
  it("katta aylanaga chiqish: topshirilgan bizneslar va yozilgan pul oqimi tushuntiriladi", () => {
    const biz = { kind: "small_business", code: "S", price: 1, monthlyIncome: 100, creditPayment: 0, credit: 0 };
    const m = step(room({ assets: [biz, biz] }), room({ circle: "big", assets: [], lockedFlow: 25_400 }))[0];
    expect(m).toMatchObject({ kind: "exit", sfx: "levelup", strong: true }); expect(m.note).toContain("2 ta biznes bankka topshirildi"); expect(m.note).toContain("25 400");
  });
  it("oy o'tdi: pul oqimi bilan; bir martalik ko'pi bilan 4 ta lahza", () => {
    expect(step(room(), room({ monthsPlayed: 1 }))[0]).toMatchObject({ kind: "payday" });
    expect(step(room(), room({ children: 1, noSalary: 2, monthsPlayed: 3, cash: 40_000, quitJob: true })).length).toBeLessThanOrEqual(4);
  });
  it("yangi kasb (qarz limiti): kuchli, tushuntirish bilan", () => {
    expect(step(room(), room({ restarts: 1 }))[0]).toMatchObject({ kind: "newJob", sfx: "lose", strong: true });
  });
});
