import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { newGame, reduce, applyEffect } from "./index";

const mk = () => newGame(ctx, ["a", "b", "c"], 1);
describe("qarz eslatmasi", () => {
  it("faqat beruvchi, raundda bir marta; qarzdorga xabarnoma", () => {
    const s = mk(); s.players[1].handDebts = [{ id: 7, to: "a", amount: 500, months: 3 }];
    const bad: any = reduce(s, ctx, { type: "loan_remind", playerId: "c", debtorId: "b", debtId: 7 }); expect(bad.error).toBe("no_debt");
    const r: any = reduce(s, ctx, { type: "loan_remind", playerId: "a", debtorId: "b", debtId: 7 }); expect(r.ok).toBe(true);
    expect(r.state.notices.at(-1)).toMatchObject({ to: "b", key: "loan_reminder", from: "a", amount: 500 });
    const again: any = reduce(r.state, ctx, { type: "loan_remind", playerId: "a", debtorId: "b", debtId: 7 }); expect(again.error).toBe("already_reminded");
    const s2 = structuredClone(r.state); s2.round++;
    expect((reduce(s2, ctx, { type: "loan_remind", playerId: "a", debtorId: "b", debtId: 7 }) as any).ok).toBe(true);
  });
});
describe("avto sug'urta", () => {
  it("mashinasiz o'yinchiga qo'llanmaydi, mashinali to'laydi", () => {
    const p: any = mk().players[0]; p.cash = 10_000;
    expect((applyEffect(p, { kind: "carInsurance", price: 500 } as any) as any).ok).toBe(false);
    p.assets = [{ kind: "car", code: "M", price: 1, monthlyIncome: 0, creditPayment: 0, credit: 0 }];
    const r: any = applyEffect(p, { kind: "carInsurance", price: 500 } as any); expect(r.ok).toBe(true); expect(r.player.insuredCar).toBe(true);
  });
});

import { crisisAdjusted, SMALL_BOARD, monthsPerLap } from "./index";
describe("inqiroz: yaxlitlash va katta aylana", () => {
  it("narx butun songa yaxlitlanadi", () => {
    const e: any = crisisAdjusted({ kind: "buy", asset: "land", code: "L", price: 1001, down: 501 } as any, { crisisMonths: 5 });
    expect(Number.isInteger(e.price) && Number.isInteger(e.down)).toBe(true);
    expect(crisisAdjusted({ kind: "buy", asset: "land", code: "L", price: 1001 } as any, {})).toMatchObject({ price: 1001 });
  });
  it("katta aylanada START dan o'tish inqirozdan 1 aylana (4 oy) kamaytiradi", () => {
    expect(monthsPerLap()).toBe(4);
    const s = newGame(ctx, ["a", "b", "c"], 1); const p: any = s.players[0]; p.circle = "big"; p.crisisMonths = 36;
    // START dan o'tish: pos 33 -> 34 (1) yoki undan o'tish
    for (let d = 1; d <= 6 && p.crisisMonths === 36; d++) { const t: any = structuredClone(s); t.players[0].pos = 34 - d + 53; t.players[0].pos %= 53; t.rngState = 3; const r: any = reduce(t, ctx, { type: "roll", playerId: "a" }); if (r.ok && r.state.players[0].crisisMonths < 36) { expect(r.state.players[0].crisisMonths).toBe(32); return; } }
    throw new Error("START dan o'tish holati topilmadi");
  });
});

import { tickStakes, RULES as R } from "./index";
describe("sheriklik: ulush qaytgach 24 oy dividend, so'ng bepul o'tadi", () => {
  it("davr hisoblanadi va egasiga o'tadi; erta sotib olish saqlanadi", () => {
    const s = newGame(ctx, ["o", "p", "q"], 1);
    s.players[0].assets = [{ kind: "small_business", code: "B", price: 1000, monthlyIncome: 100, creditPayment: 0, credit: 0, partnerId: "p" }];
    s.players[1].assets = [{ kind: "partner_stake", code: "B", price: 1000, monthlyIncome: 100, creditPayment: 0, credit: 0, stakeOf: "o" }];
    for (let m = 0; m < 5; m++) tickStakes(s, "p"); // 500 = ulush narxi (1000/2) qaytdi
    expect(s.players[1].assets[0].dividendLeft).toBe(R.partnerDividendMonths);
    for (let m = 0; m < R.partnerDividendMonths - 1; m++) tickStakes(s, "p");
    expect(s.players[1].assets).toHaveLength(1);
    tickStakes(s, "p");
    expect(s.players[1].assets).toHaveLength(0);
    expect(s.players[0].assets[0]).toMatchObject({ monthlyIncome: 200, partnerId: undefined });
  });
});
