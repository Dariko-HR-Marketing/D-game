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
