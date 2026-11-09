import { describe, it, expect } from "vitest";
import { newPlayer, takeBankLoan, repayBankLoan, takeLombard, repayLombard, tickLoans, monthlyExpenses, passMonths, maxBankLoan, type Asset, type Player } from "./engine";
import { RULES, oneTimeFee, bankLoanMonthly, bankLoanPayoff, lombardMonthly, bankMonthlyPayment } from "./index";

const biz = (price: number, n = 0): Asset => ({ kind: "biz", code: `B${n}`, price, monthlyIncome: 0, creditPayment: 0, credit: 0 });
const mk = (halal: boolean, children = 0, assets: Asset[] = [biz(20_000), biz(20_000, 1)]): Player => ({
  ...newPlayer("p", { n: 1, salary: 20_000, total: 1_000, save: 0, child: 0 }), children, assets, cash: 0, ...(halal ? { halalFin: true } : {}),
});

describe("halol moliya: bir martalik haq (murobaha)", () => {
  it("haq = summa × 50 %; har farzand uchun haqning o'zidan 10 % kamayadi (500 → 450 → 400)", () => {
    expect(oneTimeFee(1000, RULES.bankFeePct, 0)).toBe(500);
    expect(oneTimeFee(1000, RULES.bankFeePct, 1)).toBe(450);
    expect(oneTimeFee(1000, RULES.bankFeePct, 2)).toBe(400);
    expect(oneTimeFee(5000, RULES.bankFeePct, 0)).toBe(2500);
    expect(oneTimeFee(5000, RULES.bankFeePct, 3)).toBe(1750);
    expect(oneTimeFee(5000, RULES.bankFeePct, 10)).toBe(0);
    expect(oneTimeFee(5000, RULES.bankFeePct, 14)).toBe(0); // 0 dan past bo'lmaydi
  });
  it("kredit: haq berilganda belgilanadi; oylik = summa/36 + haq/36; foiz hisobi ishlatilmaydi", () => {
    const r = takeBankLoan(mk(true), 5000); expect(r.ok).toBe(true);
    const l = r.player.bankLoans[0]; expect(l.fee).toBe(2500);
    expect(bankLoanMonthly(l)).toBe(139 + 70); expect(bankLoanMonthly(l)).toBeLessThan(bankMonthlyPayment(5000));
    expect(r.player.cash).toBe(5000); expect(r.player.bankDebt).toBe(5000);
  });
  it("farzandlar soni kredit berilgan paytda haqni kamaytiradi", () => {
    expect(takeBankLoan(mk(true, 1), 5000).player.bankLoans[0].fee).toBe(2250);
    expect(takeBankLoan(mk(true, 2), 5000).player.bankLoans[0].fee).toBe(2000);
  });
  it("36 oy davomida haq yig'indisi = bir martalik haq (ortiqcha ham, kam ham emas)", () => {
    let p = takeBankLoan(mk(true), 5000).player; let fee = 0;
    for (let i = 0; i < 36; i++) { fee += bankLoanMonthly(p.bankLoans[0]) - Math.ceil(5000 / 36); p = tickLoans(p); }
    expect(fee).toBe(2500); expect(p.bankLoans).toHaveLength(0);
  });
  it("muddatidan oldin yopish: qolgan asosiy qarz + haqning to'lanmagan qismi (haq to'liq kuchda)", () => {
    const p = takeBankLoan(mk(true), 5000).player; p.cash = 100_000;
    // darhol yopilsa: 5 000 + to'liq 2 500 haq
    expect(bankLoanPayoff(p.bankLoans[0])).toBe(7500);
    const r = repayBankLoan(p, 0); expect(r.ok).toBe(true); expect(r.cost).toBe(7500); expect(r.player.cash).toBe(92_500);
    // 12 oydan keyin: haqdan 12 × 70 = 840 to'langan, 1 660 qolgan; asosiy qarz 5 000 − 12 × 139
    let q = p; for (let i = 0; i < 12; i++) q = tickLoans(q);
    expect(bankLoanPayoff(q.bankLoans[0])).toBe(5000 - 12 * 139 + (2500 - 12 * 70));
  });
  it("eski o'yin (halalFin yo'q): foizli hisob o'zgarmaydi", () => {
    const r = takeBankLoan(mk(false), 5000); const l = r.player.bankLoans[0];
    expect(l.fee).toBeUndefined(); expect(bankLoanMonthly(l)).toBe(223); expect(bankLoanPayoff(l)).toBe(5000);
  });
  it("to'lov daromaddan oshmasligi tekshiruvi halol oylik to'lov bilan ishlaydi (209 ≤ 215 < 223)", () => {
    const base = mk(true, 0, [biz(20_000), biz(20_000, 1)]);
    expect(maxBankLoan({ ...base, salary: 215 })).toBe(5000);             // halol: 139 + 70 = 209
    expect(maxBankLoan({ ...base, salary: 215, halalFin: undefined })).toBeLessThan(5000); // eski: 223 > 215
    expect(maxBankLoan({ ...base, salary: 200 })).toBeLessThan(5000);
  });
});

describe("halol moliya: lombard (rahn)", () => {
  const withFee = <T>(pct: number, f: () => T): T => { const old = RULES.lombardFeePct; (RULES as any).lombardFeePct = pct; try { return f(); } finally { (RULES as any).lombardFeePct = old; } };
  it("lombard haqi: olingan summaning 50 % i (12 oy), farzand boshiga haqdan 10 % chegirma", () => {
    const l0 = takeLombard(mk(true), 0).player.lombards![0]; expect(l0.amount).toBe(10_000); expect(l0.fee).toBe(5000);
    expect(lombardMonthly(l0)).toBe(Math.ceil(5000 / 12));
    expect(takeLombard(mk(true, 1), 0).player.lombards![0].fee).toBe(4500);
    expect(takeLombard(mk(true, 2), 0).player.lombards![0].fee).toBe(4000);
  });
  it("sozlangan haq: 12 oyga teng bo'linadi, muddatidan oldin yopilsa to'lanmagan qismi to'lanadi", () => withFee(20, () => {
    let p = takeLombard(mk(true), 0).player; const l = p.lombards![0];
    expect(l.amount).toBe(10_000); expect(l.fee).toBe(2000); expect(lombardMonthly(l)).toBe(Math.ceil(2000 / 12));
    p = { ...p, cash: 100_000 }; for (let i = 0; i < 3; i++) p = tickLoans({ ...p, cash: p.cash - lombardMonthly(p.lombards![0]) });
    const r = repayLombard(p, 0); expect(r.ok).toBe(true);
    expect(r.cost).toBe(10_000 + (2000 - 3 * Math.ceil(2000 / 12)));
  }));
  it("eski lombard: oyiga 10 % va yopish narxi = asosiy qarz", () => {
    const p = takeLombard(mk(false), 0).player; expect(lombardMonthly(p.lombards![0])).toBe(1000);
    expect(repayLombard({ ...p, cash: 50_000 }, 0).cost).toBe(10_000);
  });
  it("muddat oxirida to'lanmasa: halol hisobda garov musodara qilinmaydi — «muddati o'tgan» bo'lib auksion kutadi; eskida garov yo'qoladi", () => {
    const run = (halal: boolean) => { let p = takeLombard(mk(halal), 0).player; p = { ...p, cash: 0 }; for (let i = 0; i < RULES.lombardTermMonths; i++) p = tickLoans(p); return p; };
    const h = run(true), o = run(false);
    expect(h.assets).toHaveLength(2); expect(h.lombards).toHaveLength(1); expect(h.lombards![0].overdue).toBe(true); expect(h.lombards![0].left).toBe(0);
    expect(lombardMonthly(h.lombards![0])).toBe(0); // muddati o'tgan lombard oylik xarajat qo'shmaydi
    expect(o.assets).toHaveLength(1); expect(o.lombards).toHaveLength(0);
  });
  it("xarajat: halol kredit va lombard oylik xarajatga kiradi", () => {
    const p = takeBankLoan(mk(true), 5000).player;
    expect(monthlyExpenses(p)).toBe(1_000 + 139 + 70);
    expect(passMonths(p, 1).cash).toBe(5000 + 20_000 - (1_000 + 139 + 70));
  });
});
