import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { newGame, applyMandatory, effectOf, hasCar, chooseDream } from "./index";

const mk = () => { let s = newGame(ctx, ["a", "b"], 7, [], [], { dreamPhase: false }); s.players.forEach((p, i) => (s = chooseDream(s, p.id, i))); return s; };

describe("shartli xarajat kartalari (qo'llanma §07: «agar bolangiz/mashinangiz bo'lsa»)", () => {
  it("bolasiz o'yinchi bola xarajatini to'lamaydi, bolali to'laydi", () => {
    const s = mk(), ce = effectOf(ctx, "xar-84"); expect((ce.effect as any).needs).toBe("child"); // «Chaqaloqqa krovat kerak. (agar bolangiz bo'lsa)»
    const p0 = { ...s.players[0], children: 0, cash: 5000 }, p1 = { ...s.players[0], children: 1, cash: 5000 };
    expect(applyMandatory(s, ctx, p0, ce.effect).cash).toBe(5000);
    expect(applyMandatory(s, ctx, p1, ce.effect).cash).toBe(5000 - (ce.effect as any).amount);
  });
  it("avtomobil sharti: kasbda mashina yoki sotib olingan avtomobil", () => {
    const s = mk(), ce = effectOf(ctx, "xar-57"); expect((ce.effect as any).needs).toBe("car");
    const noCar = Object.values(ctx.kasb).find((k) => (k.car ?? 0) === 0), withCar = Object.values(ctx.kasb).find((k) => (k.car ?? 0) > 0)!;
    const base = { ...s.players[0], cash: 5000, assets: [], insuredCar: false };
    if (noCar) expect(applyMandatory(s, ctx, { ...base, profession: noCar.n }, ce.effect).cash).toBe(5000);
    expect(applyMandatory(s, ctx, { ...base, profession: withCar.n }, ce.effect).cash).toBeLessThan(5000);
    const bought = { ...base, profession: noCar?.n ?? withCar.n, assets: [{ kind: "car", code: "X", price: 1, monthlyIncome: 0, creditPayment: 0, credit: 0 }] };
    expect(hasCar(ctx, bought as any)).toBe(true);
  });
  it("shartsiz xarajat hamma to'laydi; 16 ta shartli kartadan 14 tasi bola/avtomobilga bog'liq", () => {
    const s = mk(), ce = effectOf(ctx, "xar-1"); expect((ce.effect as any).needs).toBeUndefined();
    expect(applyMandatory(s, ctx, { ...s.players[0], cash: 5000 }, ce.effect).cash).toBe(5000 - (ce.effect as any).amount);
    const n = Object.values(ctx.effects).filter((e: any) => e.effect.kind === "pay" && e.effect.needs).length; expect(n).toBe(14);
  });
});
