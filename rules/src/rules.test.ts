import { describe, it, expect } from "vitest";
import * as R from "./index";

const base: R.Blank = { cash: 1_020_000, salary: 0, passiveIncome: 25_400, expenses: 0, bankDebt: 0, otherDebt: 0, openPartnerships: 0 };

describe("§5.1 oy o'tishi", () => {
  it("pul oqimi naqdga qo'shiladi", () => {
    const b = { ...base, cash: 1000, salary: 2500, passiveIncome: 100, expenses: 1950 };
    expect(R.cashflow(b)).toBe(650);
    expect(R.advanceMonth(b).cash).toBe(1650);
  });
  it("manfiy pul oqimi naqdni kamaytiradi", () => {
    expect(R.advanceMonth({ ...base, cash: 100, passiveIncome: 0, expenses: 300 }).cash).toBe(-200);
  });
});

describe("§5.3 bank", () => {
  it("oylik to'lov formulasi", () => {
    expect(R.bankMonthlyPayment(3600)).toBe(100 + 60);
    expect(R.bankMonthlyPayment(5000)).toBe(139 + 84); // qo'llanma §08 kalkulyatori: 223
    expect(R.bankPrincipalDue(5000, 24)).toBe(3332); // «1 yildan keyin qaytariladi»
    expect(R.bankPrincipalDue(5000, 36)).toBe(5000); expect(R.bankPrincipalDue(5000, 0)).toBe(0);
    expect(R.bankMonthlyPayment(10_000)).toBe(278 + 167);
  });
  it("limit 10 000", () => {
    expect(R.bankLoanCheck(0, 10_000).ok).toBe(true);
    expect(R.bankLoanCheck(5_000, 5_001)).toEqual({ ok: false, restart: true });
  });
});

describe("§5.4 chiqish", () => {
  it("namuna holat: naqd 1 020 000, oqim 25 400", () => expect(R.canExitSmallCircle(base)).toBe(true));
  it.each([
    ["naqd yetmaydi", { cash: 999_999 }],
    ["oqim yetmaydi", { passiveIncome: 24_999 }],
    ["bank qarzi bor", { bankDebt: 1 }],
    ["kredit bor", { otherDebt: 1 }],
    ["ochiq sheriklik", { openPartnerships: 1 }],
  ])("%s", (_n, patch) => expect(R.canExitSmallCircle({ ...base, ...patch })).toBe(false));
  it("xarajat chiqish shartiga ta'sir qilmaydi (passiv ≥ 25 000)", () => expect(R.canExitSmallCircle({ ...base, passiveIncome: 25_000, expenses: 9_999 })).toBe(true));
  it("aniq chegara", () => expect(R.canExitSmallCircle({ ...base, cash: 1_000_000, passiveIncome: 25_000 })).toBe(true));
});

describe("§5.5 g'alaba", () => {
  const ok = { cashflow: 100_000, onOwnDreamCell: true, cash: 3_000_000, dreamPrice: 3_000_000 };
  it("uchala shart", () => expect(R.hasWonBigCircle(ok)).toBe(true));
  it("bittasi yetmasa yutmaydi", () => {
    expect(R.hasWonBigCircle({ ...ok, cashflow: 99_999 })).toBe(false);
    expect(R.hasWonBigCircle({ ...ok, onOwnDreamCell: false })).toBe(false);
    expect(R.hasWonBigCircle({ ...ok, cash: 2_999_999 })).toBe(false);
  });
});

describe("§5.6 suyunchi", () => {
  it("10–500, 10 qadam, naqddan oshmaydi", () => {
    expect(R.isValidSuyunchi(10, 1000)).toBe(true);
    expect(R.isValidSuyunchi(500, 1000)).toBe(true);
    expect(R.isValidSuyunchi(5, 1000)).toBe(false);
    expect(R.isValidSuyunchi(15, 1000)).toBe(false);
    expect(R.isValidSuyunchi(510, 1000)).toBe(false);
    expect(R.isValidSuyunchi(100, 90)).toBe(false);
  });
});

describe("§5.6 o'zaro qarz", () => {
  const p = { players: 5, amount: 200, months: 36, giverCash: 1000, receiverSalary: 100, receiverPassive: 100 };
  it("limit (maosh+passiv)×50%×36", () => expect(R.mutualLoanLimit(100, 100)).toBe(3600));
  it("ruxsat", () => expect(R.checkMutualLoan(p).ok).toBe(true));
  it("5 dan kam", () => expect(R.checkMutualLoan({ ...p, players: 4 }).ok).toBe(false));
  it("beruvchi 20 %", () => {
    expect(R.checkMutualLoan({ ...p, amount: 200 }).ok).toBe(true);
    expect(R.checkMutualLoan({ ...p, amount: 201 }).ok).toBe(false);
  });
  it("36 oydan oshmaydi", () => expect(R.checkMutualLoan({ ...p, months: 37 }).ok).toBe(false));
  it("oluvchi limiti", () => expect(R.checkMutualLoan({ ...p, giverCash: 1e9, amount: 3601 }).ok).toBe(false));
});

describe("§5.6 sheriklik", () => {
  it("50/50", () => expect(R.partnershipSplit(100_000, 4000)).toEqual({ partnerPays: 50_000, ownerPays: 50_000, partnerMonthlyProfit: 2000, ownerMonthlyProfit: 2000 }));
  it("sotib olish narxi", () => expect(R.partnerBuyoutPrice(100_000, 4000)).toBe(104_000));
});

describe("§5.8–5.9", () => {
  it("QAR +100", () => expect(R.withQar(1950)).toBe(2050));
  it("daraja", () => { expect(R.levelFromPoints(99)).toBe(0); expect(R.levelFromPoints(250)).toBe(2); });
});
