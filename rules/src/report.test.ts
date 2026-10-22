import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { Action, GameState, buildReport, insightsOf, chooseDream, currentPlayer, effectOf, newGame, reduce, slotBlocked, MODES, type PlayerReport } from "./index";

function play(seed: number, n: number, turns: number, bots: string[] = []) {
  const ids = Array.from({ length: n }, (_, i) => `p${i}`);
  let s: GameState = newGame(ctx, ids, seed, bots); s.players.forEach((p, i) => (s = chooseDream(s, p.id, i)));
  const acts: Action[] = [];
  for (let t = 0; t < turns && !s.winner; t++) {
    const me = currentPlayer(s).id;
    const roll: Action = { type: "roll", playerId: me }; const r = reduce(s, ctx, roll); if (!r.ok) throw new Error(r.error); s = r.state; acts.push(roll);
    while (s.pending) { const e = effectOf(ctx, s.pending.cardId).effect; const d: Action = { type: "decide", playerId: me, accept: e.kind !== "lendRequest" && t % 3 !== 0 && !slotBlocked(e, s.players.find((p) => p.id === me)!), useBank: true };
      const r2 = reduce(s, ctx, d); if (!r2.ok) throw new Error(r2.error); s = r2.state; acts.push(d); }
  }
  return { ids, s, acts };
}
const init = (ids: string[], seed: number, bots: string[] = []) => ({ playerIds: ids, seed, bots, restricted: [] as string[] });

describe("o'yin tugagach hisobot (har bir o'yinchi uchun)", () => {
  const { ids, s, acts } = play(31, 4, 500);
  const rep = buildReport(ctx, init(ids, 31), acts);

  it("har bir o'yinchi uchun hisobot; umumiy raqamlar holatga mos", () => {
    expect(rep.players.map((p) => p.id)).toEqual(ids); expect(rep.rounds).toBe(s.round); expect(rep.winner).toBe(s.winner);
    expect(rep.turns).toBe(acts.filter((a) => a.type === "roll").length);
    expect(rep.players.reduce((n, p) => n + p.turns, 0)).toBe(rep.turns);
    expect(rep.months).toBe(Math.max(...s.players.map((p) => p.monthsPlayed ?? 0)));
  });
  it("yakuniy raqamlar dvigatel holati bilan bir xil, dinamika oylar bo'yicha o'sib boradi", () => {
    for (const p of rep.players) {
      const g = s.players.find((x) => x.id === p.id)!;
      expect(p.final.cash).toBe(Math.round(g.cash)); expect(p.circle).toBe(g.circle); expect(p.months).toBe(g.monthsPlayed ?? 0);
      expect(p.series[0].month).toBe(0); expect(p.series[p.series.length - 1].month).toBe(p.months);
      expect(p.series.every((x, i) => i === 0 || x.month >= p.series[i - 1].month)).toBe(true);
      expect(p.series[p.series.length - 1].cash).toBe(p.final.cash); expect(p.series[p.series.length - 1].netWorth).toBe(p.final.netWorth);
      expect(p.peaks.cash.value).toBeGreaterThanOrEqual(p.final.cash); expect(p.peaks.lowCash.value).toBeLessThanOrEqual(p.final.cash);
      expect(p.peaks.cash.value).toBe(Math.max(...p.series.map((x) => x.cash)));
    }
  });
  it("qarorlar: qabul + o'tkazilgan = ko'rsatilgan; guruhlar yig'indisi umumiyga teng", () => {
    for (const p of rep.players) {
      const d = p.decisions; expect(d.accepted + d.skipped).toBe(d.shown);
      const sum = Object.values(d.byGroup).reduce((t, g) => ({ s: t.s + g.shown, a: t.a + g.accepted, f: t.f + g.forced }), { s: 0, a: 0, f: 0 }); expect(sum).toEqual({ s: d.shown, a: d.accepted, f: d.forced });
    }
  });
  it("aktivlar: sotib olinganlar soni va yakuniy holat izchil (qo'lda qolganlar = oxirgi aktivlar)", () => {
    for (const p of rep.players) {
      const g = s.players.find((x) => x.id === p.id)!; expect(p.spending.purchases).toBe(p.assets.length);
      expect(p.assets.filter((a) => a.status === "held")).toHaveLength(g.assets.length);
      for (const a of p.assets) { expect(a.paid).toBeLessThanOrEqual(a.price); if (a.paybackMonths !== null) expect(a.paybackMonths).toBeGreaterThan(0); }
      expect(p.spending.purchaseTotal).toBe(p.assets.reduce((t, a) => t + a.paid, 0));
    }
  });
  it("reyting: 1…N, takrorsiz; g'olib birinchi", () => {
    expect([...rep.players.map((p) => p.rank)].sort((a, b) => a - b)).toEqual(ids.map((_, i) => i + 1));
    expect(rep.ranking).toHaveLength(ids.length); if (rep.winner) expect(rep.ranking[0]).toBe(rep.winner);
    for (const p of rep.players) expect(rep.ranking.indexOf(p.id) + 1).toBe(p.rank);
  });
  it("bir xil jurnal — bir xil hisobot (aniq, tasodifsiz)", () => { expect(buildReport(ctx, init(ids, 31), acts)).toEqual(rep); });
  it("buzilgan jurnal aniq xato beradi", () => { expect(() => buildReport(ctx, init(ids, 31), [{ type: "roll", playerId: "p3" }, ...acts])).toThrow(/jurnal buzilgan/); });
  it("chiqish progressi: kichik aylanadagilar uchun rejim chegaralari, katta aylanadagilar uchun g'alaba progressi", () => {
    const need = MODES.standard;
    for (const p of rep.players) { if (p.circle === "small") { expect(p.exit.progress).toMatchObject({ cash: { need: need.exitCash }, passive: { need: need.exitPassive } }); expect(p.big).toBeNull(); } else { expect(p.exit.progress).toBeNull(); expect(p.big).not.toBeNull(); } }
  });
});

describe("tavsiyalar (insights): faqat raqamlar va qoida chegaralariga tayanadi", () => {
  const base = (over: Partial<PlayerReport> = {}): PlayerReport => ({
    id: "a", bot: false, rank: 1, outcome: "small", circle: "small", months: 40, turns: 30,
    final: { cash: 10_000, salary: 1000, passive: 0, expenses: 800, cashflow: 200, debt: 0, netWorth: 12_000 },
    series: [{ month: 0, cash: 1, cashflow: 1, passive: 0, expenses: 0, debt: 0, netWorth: 1 }, { month: 40, cash: 10_000, cashflow: 200, passive: 0, expenses: 800, debt: 0, netWorth: 12_000 }],
    peaks: { cash: { value: 10_000, month: 40 }, cashflow: { value: 200, month: 40 }, passive: { value: 0, month: 0 }, netWorth: { value: 12_000, month: 40 }, lowCash: { value: 1, month: 0 } },
    exit: { month: null, progress: { cash: { value: 10_000, need: 1_000_000 }, passive: { value: 0, need: 25_000 }, debt: { value: 0 }, partnerships: { value: 0 } } }, big: null,
    decisions: { shown: 12, accepted: 2, skipped: 10, auto: 0, forced: 3, byGroup: { invest: { shown: 8, accepted: 1, skipped: 7, forced: 0 }, market: { shown: 2, accepted: 0, skipped: 2, forced: 1 }, expense: { shown: 1, accepted: 1, skipped: 0, forced: 2 }, event: { shown: 1, accepted: 0, skipped: 1, forced: 0 }, other: { shown: 0, accepted: 0, skipped: 0, forced: 0 } } },
    spending: { expenseCards: 1, expenseTotal: 900, biggest: { amount: 900, month: 12 }, purchases: 1, purchaseTotal: 500, sales: 0, bankLoans: 0 },
    quiz: { answered: 0, correct: 0 }, risks: { restarts: 0, crisisMonths: 0, unemployedMonths: 0 }, assets: [], moments: [], insights: [], ...over,
  });
  const keys = (r: PlayerReport, left = false, end: "win" | "time" | null = null) => insightsOf(r, "standard", left, end).map((i) => i.key);
  it("chiqmagan o'yinchi: qaysi shart yetishmaydi (aniq qiymat bilan), passiv daromad yo'q, ko'p o'tkazilgan", () => {
    const k = keys(base()); expect(k).toEqual(expect.arrayContaining(["exit_blocked_cash", "exit_blocked_passive", "no_passive", "many_skipped", "big_expense"]));
    const i = insightsOf(base(), "standard", false, null).find((x) => x.key === "exit_blocked_cash")!; expect(i.params).toEqual({ value: 10_000, need: 1_000_000 });
  });
  it("qarz, avtopilot, qayta boshlash, manfiy pul oqimi — ogohlantirish", () => {
    const r = base({ final: { ...base().final, debt: 4000, cashflow: -300 }, decisions: { ...base().decisions, auto: 3 }, risks: { restarts: 1, crisisMonths: 0, unemployedMonths: 0 } });
    const w = insightsOf(r, "standard", false, null).filter((i) => i.level === "warn").map((i) => i.key); expect(w).toEqual(expect.arrayContaining(["debt_end", "autopilot", "restarts", "negative_flow"]));
  });
  it("g'olib va vaqt tugashi", () => { expect(keys(base({ outcome: "won" }))).toContain("won"); expect(keys(base(), false, "time")).toContain("time_up"); expect(keys(base(), true)).toContain("left_game"); });
  it("viktorina: ko'p to'g'ri — yaxshi, kam — ma'lumot", () => {
    expect(keys(base({ quiz: { answered: 5, correct: 4 } }))).toContain("quiz_good"); expect(keys(base({ quiz: { answered: 5, correct: 1 } }))).toContain("quiz_low"); expect(keys(base({ quiz: { answered: 2, correct: 2 } }))).not.toContain("quiz_good");
  });
});
