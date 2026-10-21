// Ball, XP/daraja va liga (platforma fayli: «Ball», «Tajriba darajasi», «Ligalar»). Hammasi o'yin natijalaridan hisoblanadi (alohida holat saqlanmaydi).
// Ballni sotib olib, o'tkazib yoki pulga almashtirib bo'lmaydi. Malaka va Akademiya keyingi bosqich (dars matnlari kerak).
import { POINTS, BALL, XP, LEAGUES } from "@poyga/rules";
import type { GameResult, ResultPlayer } from "./profiles";

export { BALL, XP, LEAGUES };
export type League = (typeof LEAGUES)[number]["key"];
export const DONISHMAND_TOP = 100, DONISHMAND_MIN_GAMES = 5;

const DAY = 86_400_000;
/** Kun chegarasi — Toshkent vaqti (UTC+5). */
export const dayKey = (ts: number) => new Date(ts + 5 * 3_600_000).toISOString().slice(0, 10);
/** Mavsum — 3 oy (kalendar chorak). */
export const seasonOf = (ts: number) => { const d = new Date(ts + 5 * 3_600_000); return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`; };

const humansIn = (r: GameResult) => r.players.filter((p) => !p.bot).length;
const isTutorial = (r: GameResult) => r.mode === "tutorial";

/** Bitta o'yin uchun ball (kunlik limitsiz, «kunning birinchi o'yini» alohida). `pos` — musbat, `neg` — jarima. */
export function gamePointsV2(r: GameResult, p: ResultPlayer, cleared = false): { pos: number; neg: number } {
  let neg = 0;
  if (p.unreliable && !cleared) neg += POINTS.unreliable;
  if (p.left) return { pos: 0, neg: neg + POINTS.abandon };
  if (p.bot) return { pos: 0, neg };
  neg += POINTS.auto * (p.autos ?? 0);
  const humans = humansIn(r);
  if (isTutorial(r) || humans < BALL.minHumans) return { pos: 0, neg }; // botlar bilan o'yin — 0 ball (o'quv o'yini alohida: bir marta)
  let pos = 0;
  if (humans >= BALL.minHumansFinish) pos += BALL.finish;
  if (p.circle === "big") pos += BALL.exit;
  if (p.won) pos += BALL.win;
  if (p.place && p.place <= 3) pos += Math.round(BALL.place[p.place - 1] * Math.min(1, humans / BALL.placeBase)); // o'yinchilar soniga mutanosib (6 kishilikda to'liq)
  return { pos, neg };
}

/** Jami ball: 12 oydan eski natija hisobga kirmaydi; kunlik limit 500 (jarimalar limitdan tashqari); kunning birinchi o'yini +20; o'quv o'yini bir marta +50. Turnir ballari alohida. */
export function pointsOf(results: GameResult[], userId: string, now: number, cleared = false): number {
  const days = new Map<string, { pos: number; neg: number; first?: boolean }>(); let tutorialDone = false;
  for (const r of results) {
    if (r.tag?.kind === "tournament" || now - r.finishedAt > BALL.expireDays * DAY) continue;
    const p = r.players.find((x) => x.id === userId); if (!p) continue;
    const g = gamePointsV2(r, p, cleared); const d = days.get(dayKey(r.finishedAt)) ?? { pos: 0, neg: 0 };
    d.pos += g.pos; d.neg += g.neg;
    const finished = !p.left && !p.bot;
    if (finished && !isTutorial(r) && humansIn(r) >= BALL.minHumans && !d.first) { d.pos += BALL.firstOfDay; d.first = true; }
    if (finished && isTutorial(r) && !tutorialDone) { d.pos += BALL.tutorial; tutorialDone = true; }
    days.set(dayKey(r.finishedAt), d);
  }
  let n = 0; for (const d of days.values()) n += Math.min(BALL.dailyCap, d.pos) + d.neg;
  return n;
}

/** XP: tugatilgan o'yin uchun (tashlab ketgan — 0). Odamlar bilan 100, botlar bilan 60, o'quv o'yini (birinchisi) 150. Muddati o'tmaydi. */
export function xpOf(results: GameResult[], userId: string): number {
  let xp = 0, tutorialDone = false;
  for (const r of results) {
    const p = r.players.find((x) => x.id === userId); if (!p || p.left || p.bot) continue;
    if (isTutorial(r) && !tutorialDone) { xp += XP.tutorial; tutorialDone = true; } else xp += humansIn(r) >= BALL.minHumans ? XP.game : XP.botGame;
    xp += p.xpBonus ?? 0; // o'yin ichidagi XP: homiy kartalari, viktorina (katalog)
  }
  return xp;
}
/** Keyingi darajaga XP = 200 + 50 × joriy daraja (1…50). */
export const xpToNext = (level: number) => XP.base + XP.step * level;
export function levelOfXp(xp: number): { level: number; into: number; need: number } {
  let level = 1, left = Math.max(0, xp);
  while (level < XP.maxLevel && left >= xpToNext(level)) { left -= xpToNext(level); level++; }
  return { level, into: level >= XP.maxLevel ? 0 : left, need: level >= XP.maxLevel ? 0 : xpToNext(level) };
}
/** Unvon: 1–10 Yangi boshlovchi, 11–25 Faol o'yinchi, 26–40 Tajribali, 41–50 Faxriy o'yinchi. */
export const rankOfLevel = (level: number): "newbie" | "active" | "experienced" | "veteran" => (level <= 10 ? "newbie" : level <= 25 ? "active" : level <= 40 ? "experienced" : "veteran");

// ───── Reyting: OpenSkill (Weng–Lin, Plackett–Luce) ─────
export interface Skill { mu: number; sigma: number }
export const SKILL0: Skill = { mu: 25, sigma: 25 / 3 };
const BETA = 25 / 6, KAPPA = 0.0001;
/** O'rinlar bo'yicha yangilash (1 — eng yaxshi). Faqat odamlar; teng o'rin teng hisoblanadi. */
export function rateOpenSkill(rows: { skill: Skill; rank: number }[]): Skill[] {
  const n = rows.length; if (n < 2) return rows.map((r) => r.skill);
  const c = Math.sqrt(rows.reduce((a, r) => a + r.skill.sigma ** 2 + BETA ** 2, 0));
  const sumQ = rows.map((q) => rows.reduce((a, r) => a + (r.rank >= q.rank ? Math.exp(r.skill.mu / c) : 0), 0));
  const same = rows.map((q) => rows.filter((r) => r.rank === q.rank).length);
  return rows.map((i, ii) => {
    let omega = 0, delta = 0; const s2 = i.skill.sigma ** 2;
    rows.forEach((q, qi) => { if (q.rank > i.rank) return; const quot = Math.exp(i.skill.mu / c) / sumQ[qi]; omega += (ii === qi ? 1 - quot : -quot) / same[qi]; delta += (quot * (1 - quot)) / same[qi]; });
    omega *= s2 / c; delta *= (Math.sqrt(s2) / c) * (s2 / (c * c));
    return { mu: i.skill.mu + omega, sigma: i.skill.sigma * Math.sqrt(Math.max(1 - delta, KAPPA)) };
  });
}
/** Ko'rsatiladigan reyting: 1000 dan boshlanadi, mu ning har 1 birligi — 40 ball. */
export const displayRating = (s: Skill) => Math.round(1000 + 40 * (s.mu - SKILL0.mu));
export const leagueOf = (rating: number): League => { let k: League = "bronze"; for (const l of LEAGUES) if (rating >= l.from) k = l.key; return k; };

/** Barcha reytingli o'yinlarni vaqt tartibida o'tib, har bir odamning ko'nikmasini hisoblaydi. */
export function skillsOf(results: GameResult[]): { skills: Map<string, Skill>; games: Map<string, number> } {
  const skills = new Map<string, Skill>(), games = new Map<string, number>();
  for (const r of results) {
    if (r.mode !== "rated" || r.tag) continue;
    const rows = r.players.filter((p) => !p.bot && !p.left && p.place !== undefined && p.id !== "deleted").map((p) => ({ id: p.id, rank: p.place as number, skill: skills.get(p.id) ?? SKILL0 }));
    if (rows.length < 2) continue;
    const out = rateOpenSkill(rows); rows.forEach((x, i) => { skills.set(x.id, out[i]); games.set(x.id, (games.get(x.id) ?? 0) + 1); });
  }
  return { skills, games };
}
