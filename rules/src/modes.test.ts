import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { newGame, reduce, canExitSmallCircle, MODES, modeOf, standings, GameState } from "./index";

const blank = (o: object = {}) => ({ cash: 250_000, salary: 500, passiveIncome: 15_000, expenses: 400, bankDebt: 0, otherDebt: 0, openPartnerships: 0, ...o });

describe("o'yin rejimlari", () => {
  it("chegaralar: standart 2–8, tez 2–6, reytingli 4–6 (120 daq), o'quv 1 odam + 2 bot (15 daq)", () => {
    expect(MODES.standard).toMatchObject({ seats: [2, 8], minutes: null }); expect(MODES.quick).toMatchObject({ seats: [2, 6], minutes: null });
    expect(MODES.rated).toMatchObject({ seats: [4, 6], minutes: 120, rated: true }); expect(MODES.tutorial).toMatchObject({ seats: [3, 3], minutes: 15, maxHumans: 1 });
    expect(modeOf(undefined)).toBe("standard"); expect(modeOf("zzz" as any)).toBe("standard");
  });
  it("tez o'yin: chiqish 15 000 passiv + 250 000 naqd; standartda hali yetmaydi; qarz bo'lsa chiqmaydi", () => {
    expect(canExitSmallCircle(blank(), "quick")).toBe(true); expect(canExitSmallCircle(blank(), "tutorial")).toBe(true);
    expect(canExitSmallCircle(blank())).toBe(false); expect(canExitSmallCircle(blank(), "standard")).toBe(false); expect(canExitSmallCircle(blank(), "rated")).toBe(false);
    expect(canExitSmallCircle(blank({ cash: 249_999 }), "quick")).toBe(false); expect(canExitSmallCircle(blank({ passiveIncome: 14_999 }), "quick")).toBe(false);
    expect(canExitSmallCircle(blank({ bankDebt: 1 }), "quick")).toBe(false);
    expect(canExitSmallCircle(blank({ cash: 1_000_000, passiveIncome: 25_000 }))).toBe(true);
  });
  it("o'yin o'z rejimida chiqish qoidasini qo'llaydi: tez o'yinda kichik aylanadan erta chiqadi", () => {
    const mk = (mode: any) => { const s = newGame(ctx, ["a", "b"], 5, [], [], { mode }); s.players.forEach((p, i) => { p.dreamIdx = i; }); const p = s.players[0]; p.cash = 300_000; p.assets = [{ kind: "business", code: "x", price: 1, monthlyIncome: 16_000, creditPayment: 0, credit: 0 }] as any; return s; };
    const roll = (s: GameState) => { const r: any = reduce(s, ctx, { type: "roll", playerId: s.players[s.turn % 2].id }); return r; };
    const q = mk("quick"), n = mk("standard");
    let a = q, b = n; for (let i = 0; i < 40; i++) { for (const [k, s] of [[0, a], [1, b]] as const) { const cur = s.players[s.turn % 2]; if (cur.id !== "a") { /* b ning navbati: o'tkazamiz */ } const r: any = roll(s); if (r.ok) { let st = r.state; while (st.pending) st = (reduce(st, ctx, { type: "decide", playerId: st.players[st.turn % 2].id, accept: false }) as any).state; if (k === 0) a = st; else b = st; } } }
    expect(a.mode).toBe("quick"); expect(b.mode).toBe("standard");
  });
  it("vaqt tugashi (time_up): faqat vaqtli rejimda; o'rin — katta aylana → passiv daromad → naqd; g'olib yoziladi", () => {
    const s = newGame(ctx, ["a", "b", "c", "d"], 5, [], [], { mode: "rated" }); s.players.forEach((p, i) => { p.dreamIdx = i; });
    s.players[0].cash = 100; s.players[1].circle = "big"; s.players[1].cash = 50; s.players[2].assets = [{ kind: "business", code: "x", price: 1, monthlyIncome: 500, creditPayment: 0, credit: 0 }] as any; s.players[2].cash = 10; s.players[3].cash = 900;
    expect(standings(s)).toEqual(["b", "c", "d", "a"]);
    const r: any = reduce(s, ctx, { type: "time_up", playerId: "server" }); expect(r.ok).toBe(true);
    expect(r.state.winner).toBe("b"); expect(r.state.endReason).toBe("time"); expect(r.state.pending).toBeNull();
    expect(reduce(r.state, ctx, { type: "roll", playerId: "a" } as any)).toEqual({ ok: false, error: "game_over" });
    const std: any = reduce(newGame(ctx, ["a", "b"], 5), ctx, { type: "time_up", playerId: "server" }); expect(std).toEqual({ ok: false, error: "not_timed" });
    expect(reduce(s, ctx, { type: "time_up", playerId: "a" } as any)).toMatchObject({ ok: false }); // o'yinchi bu harakatni yubora olmaydi
  });
});
