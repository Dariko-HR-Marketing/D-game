import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { Action, GameState, buildReport, buildLive, levelOf, successClass, chooseDream, currentPlayer, effectOf, newGame, reduce, slotBlocked, type PlayerReport } from "./index";

function play(seed: number, n: number, turns: number) {
  const ids = Array.from({ length: n }, (_, i) => `p${i}`);
  let s: GameState = newGame(ctx, ids, seed, []); s.players.forEach((p, i) => (s = chooseDream(s, p.id, i)));
  const acts: Action[] = [];
  for (let t = 0; t < turns && !s.winner; t++) {
    const me = currentPlayer(s).id; const roll: Action = { type: "roll", playerId: me }; const r = reduce(s, ctx, roll); if (!r.ok) throw new Error(r.error); s = r.state; acts.push(roll);
    while (s.pending) { const e = effectOf(ctx, s.pending.cardId).effect; const d: Action = { type: "decide", playerId: me, accept: e.kind !== "lendRequest" && t % 3 !== 0 && !slotBlocked(e, s.players.find((p) => p.id === me)!) }; const r2 = reduce(s, ctx, d); if (!r2.ok) throw new Error(r2.error); s = r2.state; acts.push(d); }
  }
  return { ids, acts };
}
const live = (seed: number, n = 4, turns = 300) => { const { ids, acts } = play(seed, n, turns); const rep = buildReport(ctx, { playerIds: ids, seed, bots: [], restricted: [] }, acts); return { rep, live: buildLive(rep) }; };

describe("jonli tahlil: savodxonlik darajasi (qoidalardagi chiqish sharti)", () => {
  it("0–4 daraja: oqim manfiy / passiv yo'q / <50% / ≥50% / xarajatni qoplaydi", () => {
    const L = (cashflow: number, passive: number, expenses: number) => levelOf({ cashflow, passive, expenses });
    expect(L(-1, 0, 100)).toBe(0); expect(L(10, 0, 100)).toBe(1); expect(L(10, 49, 100)).toBe(2); expect(L(10, 50, 100)).toBe(3); expect(L(10, 100, 100)).toBe(4);
  });
});
describe("jonli tahlil: o'yin jurnalidan hisoblash", () => {
  const { rep, live: lv } = live(31);
  it("har bir o'yinchi uchun hisob; umumiy raqamlar hisobotga mos; takroriy chaqiruv bir xil natija beradi", () => {
    expect(lv.players.map((p) => p.id)).toEqual(rep.players.map((p) => p.id)); expect(lv.meta.months).toBe(rep.months); expect(buildLive(rep)).toEqual(lv);
  });
  it("DuPont: ko'paytma rentabellikka teng (yaxlitlash xatosigacha); aktivlar = sof boylik + qarz", () => {
    for (const p of lv.players) { const d = p.dupont; expect(d.assets).toBe(p.final.netWorth + p.final.debt);
      if (d.roe !== null && d.netMargin !== null && d.assetTurn !== null && d.leverage !== null) expect(Math.abs(d.netMargin * d.assetTurn * d.leverage - d.roe)).toBeLessThan(0.1 + Math.abs(d.roe) * 0.05); }
  });
  it("kanallar yig'indisi aktivlar soniga teng; davrlar bo'yicha xaridlar yig'indisi sotib olishlarga teng", () => {
    const total = rep.players.reduce((n, p) => n + p.assets.length, 0); expect(Object.values(lv.group.channels).reduce((a, b) => a + b, 0)).toBe(total);
    expect(lv.group.volume.reduce((n, v) => n + v.bought, 0)).toBe(total);
    for (const p of lv.players) { const a = p.ansoff; expect(a.penetration + a.channel + a.product + a.diversification).toBe(p.assets.length); const c = p.cycle; expect(c.before + c.during + c.after).toBe(p.assets.length); }
  });
  it("daraja 0–4; inqiroz ulushi 0–1; bozor, voronka va BCG mantiqiy", () => {
    for (const p of lv.players) { expect(p.level).toBeGreaterThanOrEqual(0); expect(p.level).toBeLessThanOrEqual(4); expect(p.funnel.accepted).toBeLessThanOrEqual(p.funnel.shown); expect(p.funnel.paidBack).toBeLessThanOrEqual(p.funnel.purchased); expect(p.success.drawdown).toBeGreaterThanOrEqual(0); expect(p.success.drawdown).toBeLessThanOrEqual(1);
      expect(p.bcg.reduce((s, b) => s + b.share, 0)).toBeLessThanOrEqual(p.bcg.length ? 1.05 : 0); }
    for (const c of lv.group.crisisShare) { expect(c.share).toBeGreaterThanOrEqual(0); expect(c.share).toBeLessThanOrEqual(1); }
    for (const l of lv.group.levelAvg) { expect(l.avg).toBeGreaterThanOrEqual(0); expect(l.avg).toBeLessThanOrEqual(4); }
  });
  it("muvaffaqiyat sinfi guruh medianasiga nisbatan; ma'lumot bo'lmasa «noma'lum»", () => {
    const g = { medianGrowth: 0.5, medianDrawdown: 0.2 };
    expect(successClass({ growth: 1, drawdown: 0.1 }, g)).toBe("success"); expect(successClass({ growth: 1, drawdown: 0.4 }, g)).toBe("lucky"); expect(successClass({ growth: 0.1, drawdown: 0.1 }, g)).toBe("stable"); expect(successClass({ growth: 0.1, drawdown: 0.4 }, g)).toBe("fail");
    expect(successClass({ growth: null, drawdown: 0 }, g)).toBe("unknown");
  });
  it("hisobot ma'lumotlarini o'zgartirmaydi (sof funksiya)", () => { const copy = JSON.stringify(rep); buildLive(rep); expect(JSON.stringify(rep)).toBe(copy); });
});
describe("jonli tahlil: bo'sh va kichik o'yinlar", () => {
  it("hali harakat bo'lmagan o'yin xatosiz hisoblanadi", () => { const { live: lv } = live(5, 2, 0); expect(lv.players).toHaveLength(2); expect(lv.group.volume.length).toBeGreaterThan(0); for (const p of lv.players) expect(p.style).toBe("balanced"); });
  it("sotilgan aktiv soldRatio va soldMonth bilan yoziladi (agar sotuv bo'lsa)", () => { for (const seed of [1, 2, 3, 4]) { const { rep } = live(seed, 4, 500); for (const p of rep.players as PlayerReport[]) for (const a of p.assets) if (a.status === "sold") { expect(a.soldMonth).toBeGreaterThan(0); expect(a.soldRatio).toBeDefined(); } } });
});
