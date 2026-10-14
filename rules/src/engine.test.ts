import { describe, it, expect } from "vitest";
import { loadContent, deriveEffects } from "@poyga/content";
import * as E from "./engine";

const { cards } = loadContent();
const effects = deriveEffects(cards);
const k1 = cards.kasb[0];
const P = () => E.newPlayer("p1", k1);

describe("kubik, deka", () => {
  it("urug' bir xil → natija bir xil", () => {
    const a = E.seededRng(42), b = E.seededRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("kubik 1..6, taxminan tekis", () => {
    const r = E.seededRng(1); const c = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 6000; i++) c[E.rollDie(r)]++;
    for (let f = 1; f <= 6; f++) expect(c[f]).toBeGreaterThan(800);
    expect(c[0]).toBe(0);
  });
  it("deka qaytarmasdan tortiladi va tugagach aralashtiriladi", () => {
    const rng = E.seededRng(7); let d = E.newDeck([1, 2, 3], rng); const seen: number[] = [];
    for (let i = 0; i < 3; i++) { const r = E.drawCard(d, rng); seen.push(r.card); d = r.deck; }
    expect(seen.sort()).toEqual([1, 2, 3]);
    expect(d.draw).toHaveLength(0);
    const r = E.drawCard(d, rng); expect([1, 2, 3]).toContain(r.card);
  });
});

describe("kichik aylana maydoni", () => {
  it("48 katak, START=0, 4 ta D yo'q emas", () => {
    expect(E.SMALL_BOARD).toHaveLength(48);
    expect(E.smallCell(0)).toBe("S");
    expect([...E.SMALL_BOARD].filter((c) => c === "D").length).toBeGreaterThan(0);
  });
  it("D katagidan o'tish yoki tushish = 1 oy", () => {
    const d = E.SMALL_BOARD.indexOf("D");
    expect(E.move(d - 2, 2).months).toBe(1);      // tushish
    expect(E.move(d - 2, 4).months).toBe(1);      // o'tish
    expect(E.move(d - 3, 2).months).toBe(0);      // yetmadi
  });
  it("aylanib o'tish: pozitsiya moduli, barcha D lar sanaladi", () => {
    const D = [...E.SMALL_BOARD].filter((c) => c === "D").length;
    const r = E.move(0, 48, 48);
    expect(r.pos).toBe(0); expect(r.months).toBe(D);
  });
});

describe("o'yinchi blank", () => {
  it("boshlang'ich: naqd = jamg'arma, oqim = ish haqi − xarajat", () => {
    const p = P(); expect(p.cash).toBe(k1.save); expect(E.playerCashflow(p)).toBe(k1.cf);
  });
  it("oy o'tishi pul oqimini qo'shadi", () => expect(E.passMonths(P(), 3).cash).toBe(k1.save + 3 * k1.cf));
  it("farzand xarajatni oshiradi", () => expect(E.monthlyExpenses(E.haveChild(P()))).toBe(k1.total + k1.child));
  it("QAR +100", () => {
    const r = E.applyEffect(P(), { kind: "qarOffer", monthlyExpense: 100 });
    expect(r.ok && E.monthlyExpenses(r.player)).toBe(k1.total + 100);
  });
  it("bank krediti: oylik to'lov xarajatga qo'shiladi, limitdan oshsa restart", () => {
    const { player, restart } = E.takeBankLoan(P(), 3600);
    expect(restart).toBe(false); expect(player.cash).toBe(k1.save + 3600);
    expect(E.monthlyExpenses(player)).toBeCloseTo(k1.total + 160);
    expect(E.takeBankLoan(player, 6401).restart).toBe(true);
    expect(E.takeBankLoan(player, 6400).restart).toBe(false);
  });
  it("pul yetmasa shortfall qaytadi", () => {
    const r = E.applyEffect({ ...P(), cash: 50 }, { kind: "pay", amount: 120, to: "bank" });
    expect(r).toEqual({ ok: false, reason: "insufficient_cash", shortfall: 70 });
  });
});

describe("aktivlar", () => {
  it("biznes sotib olish passiv daromad beradi", () => {
    const e = effects.find((x) => x.effect.kind === "buy" && x.effect.asset === "small_business")!.effect;
    const r = E.applyEffect({ ...P(), cash: 1e6 }, e);
    expect(r.ok).toBe(true);
    if (r.ok && e.kind === "buy") expect(E.passiveIncome(r.player)).toBe(e.monthlyIncome);
  });
  it("kreditli ko'chmas mulk: boshlang'ich to'lov naqddan, kredit to'lovi xarajatga", () => {
    const e = effects.find((x) => x.effect.kind === "buy" && (x.effect.credit ?? 0) > 0)!.effect;
    if (e.kind !== "buy") throw 0;
    const r = E.applyEffect({ ...P(), cash: 1e7 }, e);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.player.cash).toBe(1e7 - e.down!); expect(E.totalDebt(r.player)).toBe(e.credit); }
  });
  it("sotganda kredit yopiladi", () => {
    const e = effects.find((x) => x.effect.kind === "buy" && (x.effect.credit ?? 0) > 0)!.effect;
    if (e.kind !== "buy") throw 0;
    const bought = E.applyEffect({ ...P(), cash: 1e7 }, e); if (!bought.ok) throw 0;
    const sold = E.sellAsset(bought.player, e.code, e.price * 2);
    expect(sold.ok && E.totalDebt(sold.player)).toBe(0);
  });
  it("aksiya miqdori [min,max] da", () => {
    const e = effects.find((x) => x.effect.kind === "buyShares")!.effect;
    if (e.kind !== "buyShares") throw 0;
    expect(E.buyShares({ ...P(), cash: 1e7 }, e, e.max + 1).ok).toBe(false);
    expect(E.buyShares({ ...P(), cash: 1e7 }, e, e.min).ok).toBe(true);
  });
  it("suv toshqini: sug'urtasi borlar ozod, mashinasiz — tegishli emas", () => {
    const f = { kind: "floodCarRepair", amount: 2000, exemptWithInsurance: true } as const;
    const car = { kind: "car", code: "AV", price: 2500, monthlyIncome: 0, creditPayment: 0, credit: 0 };
    expect(E.applyEffect(P(), f)).toEqual({ ok: false, reason: "not_applicable" });
    const a = E.applyEffect({ ...P(), assets: [car], cash: 5000 }, f); expect(a.ok && a.player.cash).toBe(3000);
    const b = E.applyEffect({ ...P(), assets: [car], cash: 5000, insuredCar: true }, f); expect(b.ok && b.player.cash).toBe(5000);
  });
});

describe("bank krediti 36 oyda so'nadi (§5.3 formulasi)", () => {
  it("oylik to'lov har oy bir xil, asosiy qarz summa/36 dan kamayadi, 36 oydan keyin qarz yo'q", () => {
    let p = E.takeBankLoan(E.newPlayer("p", { ...k1, salary: 100_000, total: 0 } as any), 3600).player;
    expect(E.monthlyExpenses(p)).toBeCloseTo(160); expect(p.bankDebt).toBe(3600);
    p = E.passMonths(p, 1); expect(p.bankDebt).toBeCloseTo(3500); expect(E.monthlyExpenses(p)).toBeCloseTo(160);
    p = E.passMonths(p, 35); expect(p.bankDebt).toBe(0); expect(p.bankLoans).toHaveLength(0); expect(E.monthlyExpenses(p)).toBe(0);
  });
  it("bir nechta kredit mustaqil muddat bilan", () => {
    let p = E.newPlayer("p", { ...k1, salary: 1e6, total: 0 } as any);
    p = E.takeBankLoan(p, 3600).player; p = E.passMonths(p, 18); p = E.takeBankLoan(p, 3600).player;
    expect(E.monthlyExpenses(p)).toBeCloseTo(320); p = E.passMonths(p, 18); expect(p.bankLoans).toHaveLength(1); expect(p.bankDebt).toBeCloseTo(1800);
  });
});
