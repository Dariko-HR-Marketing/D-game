// Ball tizimi — «POYGA o'yin qo'llanmasi» §15.
import { describe, it, expect } from "vitest";
import { gamePoints, POINTS, type ResultPlayer } from "./profiles";
import { buildApp } from "./app";

const base: ResultPlayer = { id: "a", bot: false, circle: "small", restarts: 0, won: false };
describe("o'yin uchun ball", () => {
  it("oxirigacha o'ynash +10; har aktiv +5; ishdan bo'shash +20; katta aylana +40; avtomatik qaror −2", () => {
    expect(gamePoints(base)).toBe(10);
    expect(gamePoints({ ...base, assets: 3 })).toBe(10 + 15);
    expect(gamePoints({ ...base, quitJob: true, circle: "big", autos: 2 })).toBe(10 + 20 + 40 - 4);
  });
  it("g'alaba +100, 2-o'rin +30, 3-o'rin +15, 4-chi — qo'shimcha yo'q", () => {
    expect(gamePoints({ ...base, won: true, place: 1 })).toBe(10 + 100);
    expect(gamePoints({ ...base, place: 2 })).toBe(10 + 30);
    expect(gamePoints({ ...base, place: 3 })).toBe(10 + 15);
    expect(gamePoints({ ...base, place: 4 })).toBe(10);
  });
  it("tashlab ketish −20 (boshqa ball yo'q); ishonchsiz yana −50; bot — 0", () => {
    expect(gamePoints({ ...base, bot: true, left: true, assets: 4, circle: "big" })).toBe(POINTS.abandon);
    expect(gamePoints({ ...base, bot: true, left: true, unreliable: true })).toBe(POINTS.abandon + POINTS.unreliable);
    expect(gamePoints({ ...base, bot: true })).toBe(0);
  });
});

describe("«avtomatik» bayrog'ini mijoz yubora olmaydi", () => {
  it("act: auto bilan kelgan harakat rad etiladi (ball −2 ni faqat server qo'yadi)", async () => {
    const x = buildApp({ now: () => 1_700_000_000_000 } as any) as any;
    const r0 = x.rooms.create("a"); if (!r0.ok) throw 0; x.rooms.join(r0.code, "b"); await x.rooms.start(r0.code, "a", 1, { dreams: false });
    const room = x.rooms.rooms.get(r0.code); const me = room.state.players[room.state.turn % room.state.players.length].id;
    const bad = await x.rooms.act(r0.code, me, { type: "roll", playerId: me, auto: true }, room.seq);
    expect(bad.ok).toBe(false);
    const good = await x.rooms.act(r0.code, me, { type: "roll", playerId: me }, room.seq);
    expect(good.ok).toBe(true);
  });
});


// ───── Platforma tizimi: Ball, XP/daraja, liga (progress.ts) ─────
import { gamePointsV2, pointsOf, xpOf, levelOfXp, xpToNext, rankOfLevel, rateOpenSkill, displayRating, leagueOf, skillsOf, dayKey, seasonOf, SKILL0, BALL } from "./progress";
import type { GameResult } from "./profiles";
const DAYMS = 86_400_000;
const T0 = Date.UTC(2026, 9, 21, 6, 0, 0); // 21-oktabr 11:00 Toshkent
const mkRes = (humans: string[], o: Partial<GameResult> & { bots?: number; places?: Record<string, number>; won?: string; big?: string[] } = {}): GameResult => ({
  room: "R" + Math.random(), finishedAt: T0, durationMs: 1, rounds: 5, winner: o.won ?? null, contentVersion: 1, mode: o.mode, tag: o.tag,
  players: [...humans.map((id) => ({ id, bot: false, circle: (o.big?.includes(id) ? "big" : "small") as "small" | "big", restarts: 0, won: id === o.won, place: o.places?.[id] })),
    ...Array.from({ length: o.bots ?? 0 }, (_, i) => ({ id: `bot-${i}`, bot: true, circle: "small" as const, restarts: 0, won: false }))],
});
describe("ball (platforma jadvali)", () => {
  it("6 kishilik o'yin: oxirigacha 50, chiqish 80, g'alaba 150, 1-o'rin 100 (to'liq), 2-o'rin 60, 3-o'rin 30", () => {
    const six = ["a", "b", "c", "d", "e", "f"]; const r = mkRes(six, { won: "a", big: ["a", "b"], places: { a: 1, b: 2, c: 3 } });
    const g = (id: string) => gamePointsV2(r, r.players.find((p) => p.id === id)!);
    expect(g("a").pos).toBe(50 + 80 + 150 + 100); expect(g("b").pos).toBe(50 + 80 + 60); expect(g("c").pos).toBe(50 + 30); expect(g("d").pos).toBe(50);
  });
  it("o'rin ballari o'yinchilar soniga mutanosib: 3 odamda 1-o'rin 100 × 3/6 = 50", () => {
    const r = mkRes(["a", "b", "c"], { places: { a: 1, b: 2, c: 3 }, won: "a" }); const g = (id: string) => gamePointsV2(r, r.players.find((p) => p.id === id)!).pos;
    expect(g("a")).toBe(50 + 150 + 50); expect(g("b")).toBe(50 + 30); expect(g("c")).toBe(50 + 15);
  });
  it("botlar bilan o'yin 0 ball; 2 odamda oxirigacha o'ynash ball bermaydi (kamida 3), lekin chiqish va g'alaba beradi; tashlab ketish −20; avtomatik −2", () => {
    expect(gamePointsV2(mkRes(["a"], { bots: 3, won: "a", big: ["a"] }), mkRes(["a"], { bots: 3 }).players[0])).toEqual({ pos: 0, neg: 0 });
    const two = mkRes(["a", "b"], { won: "a", big: ["a"], places: { a: 1, b: 2 } }); expect(gamePointsV2(two, two.players[0]).pos).toBe(80 + 150 + Math.round(100 * 2 / 6)); expect(gamePointsV2(two, two.players[1]).pos).toBe(Math.round(60 * 2 / 6)); // 2-o'rin: 60 × 2/6
    const left = mkRes(["a", "b", "c"]); left.players[0] = { ...left.players[0], left: true, bot: true }; expect(gamePointsV2(left, left.players[0])).toEqual({ pos: 0, neg: -20 });
    const au = mkRes(["a", "b", "c"]); au.players[0] = { ...au.players[0], autos: 3 }; expect(gamePointsV2(au, au.players[0]).neg).toBe(-6);
  });
  it("kunlik limit 500 va kunning birinchi o'yini +20; ertasi kuni yana; 12 oydan eski hisobga kirmaydi; jarima limitdan tashqari", () => {
    const six = ["a", "b", "c", "d", "e", "f"]; const big = (t: number) => ({ ...mkRes(six, { won: "a", big: ["a"], places: { a: 1 } }), finishedAt: t });
    // bitta o'yin: 50+80+150+100 + 20 = 400
    expect(pointsOf([big(T0)], "a", T0)).toBe(400);
    // ikkinchi o'yin shu kuni: 400 − 20 yana 380 → jami 780 → limit 500
    expect(pointsOf([big(T0), big(T0 + 1000)], "a", T0 + 5000)).toBe(500);
    // ertasi kuni yana 400
    expect(pointsOf([big(T0), big(T0 + 1000), big(T0 + DAYMS)], "a", T0 + DAYMS + 5000)).toBe(900);
    // 12 oydan eski — hisobga kirmaydi
    expect(pointsOf([big(T0)], "a", T0 + 366 * DAYMS)).toBe(0); expect(pointsOf([big(T0)], "a", T0 + 364 * DAYMS)).toBe(400);
    // jarima limitdan tashqari
    const left = mkRes(six); left.players[0] = { ...left.players[0], left: true, bot: true }; expect(pointsOf([big(T0), big(T0 + 1000), { ...left, finishedAt: T0 + 2000 }], "a", T0 + 9000)).toBe(500 - 20);
  });
  it("o'quv o'yini bir marta +50; turnir ballari umumiy ballga kirmaydi; kun Toshkent vaqti bilan", () => {
    const tut = (t: number) => ({ ...mkRes(["a"], { bots: 2, mode: "tutorial" }), finishedAt: t });
    expect(pointsOf([tut(T0)], "a", T0)).toBe(50); expect(pointsOf([tut(T0), tut(T0 + 2 * DAYMS)], "a", T0 + 3 * DAYMS)).toBe(50);
    expect(pointsOf([{ ...mkRes(["a", "b", "c"], { won: "a" }), tag: { kind: "tournament", id: "T" } as any }], "a", T0)).toBe(0);
    expect(dayKey(Date.UTC(2026, 9, 21, 18, 59))).toBe("2026-10-21"); expect(dayKey(Date.UTC(2026, 9, 21, 19, 1))).toBe("2026-10-22"); // 24:00 Toshkent = 19:00 UTC
    expect(seasonOf(Date.UTC(2026, 9, 21))).toBe("2026-Q4"); expect(seasonOf(Date.UTC(2026, 0, 5))).toBe("2026-Q1");
  });
});

describe("XP va daraja", () => {
  it("keyingi daraja uchun 200 + 50 × joriy daraja; chegarada daraja oshadi; ko'pi bilan 50", () => {
    expect(xpToNext(1)).toBe(250); expect(xpToNext(10)).toBe(700);
    expect(levelOfXp(0)).toEqual({ level: 1, into: 0, need: 250 }); expect(levelOfXp(249)).toMatchObject({ level: 1, into: 249 });
    expect(levelOfXp(250)).toEqual({ level: 2, into: 0, need: 300 }); expect(levelOfXp(250 + 300)).toMatchObject({ level: 3, into: 0 });
    expect(levelOfXp(10_000_000)).toMatchObject({ level: 50, need: 0 });
    expect([1, 10, 11, 25, 26, 40, 41, 50].map(rankOfLevel)).toEqual(["newbie", "newbie", "active", "active", "experienced", "experienced", "veteran", "veteran"]);
  });
  it("XP: odamlar bilan 100, botlar bilan 60, o'quv o'yini (birinchisi) 150; tashlab ketgan 0", () => {
    const human = mkRes(["a", "b", "c"]), bots = mkRes(["a"], { bots: 2 }), tut = mkRes(["a"], { bots: 2, mode: "tutorial" });
    expect(xpOf([human], "a")).toBe(100); expect(xpOf([bots], "a")).toBe(60); expect(xpOf([tut, tut], "a")).toBe(150 + 60);
    const left = mkRes(["a", "b", "c"]); left.players[0] = { ...left.players[0], left: true, bot: true }; expect(xpOf([left], "a")).toBe(0);
  });
});

describe("liga va reyting (OpenSkill)", () => {
  it("liga chegaralari: 1099 Bronza, 1100 Kumush, 1300 Oltin, 1500 Platina, 1700 Olmos", () => {
    expect([0, 1099, 1100, 1299, 1300, 1499, 1500, 1699, 1700, 2500].map(leagueOf)).toEqual(["bronze", "bronze", "silver", "silver", "gold", "gold", "platinum", "platinum", "diamond", "diamond"]);
    expect(displayRating(SKILL0)).toBe(1000);
  });
  it("g'olib reytingi oshadi, oxirgisiniki tushadi, noaniqlik (sigma) kamayadi; teng o'rin teng natija; deterministik", () => {
    const rows = [1, 2, 3, 4].map((rank) => ({ skill: { ...SKILL0 }, rank })); const out = rateOpenSkill(rows);
    expect(out[0].mu).toBeGreaterThan(SKILL0.mu); expect(out[3].mu).toBeLessThan(SKILL0.mu); expect(out[0].mu).toBeGreaterThan(out[1].mu); expect(out[1].mu).toBeGreaterThan(out[2].mu); expect(out[2].mu).toBeGreaterThan(out[3].mu);
    for (const o of out) expect(o.sigma).toBeLessThan(SKILL0.sigma);
    expect(JSON.stringify(rateOpenSkill(rows))).toBe(JSON.stringify(out));
    const tie = rateOpenSkill([{ skill: { ...SKILL0 }, rank: 1 }, { skill: { ...SKILL0 }, rank: 1 }]); expect(tie[0].mu).toBeCloseTo(tie[1].mu, 9);
    expect(displayRating(out[0])).toBeGreaterThan(1000); expect(displayRating(out[3])).toBeLessThan(1000);
    // kuchli o'yinchini yutgan — ko'proq oladi
    const strong = rateOpenSkill([{ skill: { mu: 35, sigma: 3 }, rank: 2 }, { skill: { ...SKILL0 }, rank: 1 }]); expect(strong[1].mu - SKILL0.mu).toBeGreaterThan(rateOpenSkill([{ skill: { ...SKILL0 }, rank: 1 }, { skill: { ...SKILL0 }, rank: 2 }])[0].mu - SKILL0.mu - 5);
  });
  it("faqat reytingli o'yinlar reytingga ta'sir qiladi (tez/standart/sinf/turnir emas); botlar va tashlab ketganlar kirmaydi", () => {
    const rated = (places: Record<string, number>, t = T0) => ({ ...mkRes(Object.keys(places), { mode: "rated", places, won: Object.keys(places).find((k) => places[k] === 1) }), finishedAt: t });
    const { skills, games } = skillsOf([rated({ a: 1, b: 2, c: 3, d: 4 }), { ...mkRes(["a", "b"], { mode: "quick", places: { a: 2, b: 1 } }) }, { ...rated({ a: 1, b: 2 }), tag: { kind: "class", id: "K" } as any }]);
    expect(games.get("a")).toBe(1); expect(skills.get("a")!.mu).toBeGreaterThan(skills.get("b")!.mu); expect(skills.get("d")!.mu).toBeLessThan(SKILL0.mu);
    const withBot = rated({ a: 1, b: 2 }); withBot.players.push({ id: "bot-x", bot: true, circle: "small", restarts: 0, won: false, place: 3 } as any); expect(skillsOf([withBot]).skills.has("bot-x")).toBe(false);
  });
});
