// Profil, o'yin tarixi, reyting va hisobni boshqarish (SPEC §5.9, §7).
import type { GamePlayer } from "@poyga/rules";
import { RULES } from "@poyga/rules";
import { WriteQueue } from "./persist";

export interface Profile { userId: string; name: string; color: number; birthYear: number; updatedAt: number }
export interface ResultPlayer { id: string; bot: boolean; circle: "small" | "big"; restarts: number; won: boolean; unreliable?: boolean }
export interface GameResult { room: string; finishedAt: number; durationMs: number; rounds: number; winner: string | null; contentVersion: number | null; players: ResultPlayer[] }

export interface ProfilePersist {
  loadProfiles(): Promise<Profile[]>; saveProfile(p: Profile): Promise<void>; deleteProfile(userId: string): Promise<void>;
  loadResults(): Promise<GameResult[]>; saveResult(r: GameResult): Promise<void>; anonymizeResults(userId: string): Promise<void>;
}

export const PROFILE_COLORS = 6; // §7: fishka rangi (6 ta)
export const MIN_AGE_RESTRICT = 16; // §2.8: 16 yoshgacha cheklovlar
/** Ball berish qoidalari SPEC'da yo'q (§16): qiymatlar bo'sh, buyurtmachi to'ldiradi. */
export const POINTS: { win: number | null; exitSmallCircle: number | null; unreliable: number } = { win: 100, exitSmallCircle: 50, unreliable: -50 }; // qaror (#63): SPEC raqam bermaydi; 100 ball = 1 daraja

export function validateProfile(i: any, year: number): { ok: true; value: Omit<Profile, "userId" | "updatedAt"> } | { ok: false; error: string } {
  const name = typeof i?.name === "string" ? i.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2 || name.length > 24) return { ok: false, error: "bad_name" };
  if (/[<>]/.test(name)) return { ok: false, error: "bad_name" };
  if (!Number.isInteger(i?.color) || i.color < 0 || i.color >= PROFILE_COLORS) return { ok: false, error: "bad_color" };
  if (!Number.isInteger(i?.birthYear) || i.birthYear < 1900 || i.birthYear > year) return { ok: false, error: "bad_birth_year" };
  return { ok: true, value: { name, color: i.color, birthYear: i.birthYear } };
}
export const ageOf = (p: Pick<Profile, "birthYear">, year: number) => year - p.birthYear;
export const isRestricted = (p: Pick<Profile, "birthYear"> | undefined, year: number) => !!p && ageOf(p, year) < MIN_AGE_RESTRICT;

/** §5.9: 5 yulduz — «Yollanma ishchi → Sarmoyador». Qaror #69: yulduz = daraja (ko'pi bilan 5); oraliq unvon nomlari SPEC'da yo'q, shuning uchun faqat ikki chekka nomlanadi. */
export const starsOf = (level: number) => Math.min(5, Math.max(0, level));
export const titleOf = (stars: number): "employee" | "investor" | null => (stars >= 5 ? "investor" : stars === 0 ? "employee" : null);
export interface Stats { stars: number; title: "employee" | "investor" | null; unreliable: number; games: number; wins: number; reachedBig: number; points: number; level: number }
export const levelOf = (points: number) => Math.floor(Math.max(0, points) / RULES.pointsPerLevel); // §5.9

export class ProfileService {
  profiles = new Map<string, Profile>();
  results: GameResult[] = [];
  readonly writes = new WriteQueue();
  constructor(private persist?: ProfilePersist, private year: () => number = () => new Date().getFullYear(), private now: () => number = Date.now) {}

  static async restore(persist: ProfilePersist, year?: () => number) {
    const s = new ProfileService(persist, year);
    for (const p of await persist.loadProfiles()) s.profiles.set(p.userId, p);
    s.results = await persist.loadResults(); return s;
  }

  get(userId: string) { return this.profiles.get(userId); }
  put(userId: string, input: unknown) {
    const v = validateProfile(input, this.year()); if (!v.ok) return v;
    const p: Profile = { userId, ...v.value, updatedAt: this.now() }; this.profiles.set(userId, p);
    this.writes.push(async () => this.persist?.saveProfile(p)); return { ok: true as const, profile: p };
  }
  restrictedOf(ids: string[]) { return ids.filter((id) => isRestricted(this.profiles.get(id), this.year())); }

  record(r: GameResult) { this.results.push(r); this.writes.push(async () => this.persist?.saveResult(r)); }
  /** `leftIds`: o'yindan ixtiyoriy chiqqanlar — ularning natijasi statistika va reytingga kirmaydi (o'rnini bot o'ynagan). */
  recordFromGame(room: string, st: { players: GamePlayer[]; round: number; winner: string | null; bots: string[] }, startedAt: number, contentVersion: number | null, leftIds: string[] = [], unreliableIds: string[] = []) {
    this.record({ room, finishedAt: this.now(), durationMs: this.now() - startedAt, rounds: st.round, winner: st.winner, contentVersion,
      players: st.players.map((p) => ({ id: p.id, bot: st.bots.includes(p.id) || leftIds.includes(p.id), circle: p.circle, restarts: p.restarts, won: p.won, unreliable: unreliableIds.includes(p.id) || undefined })) });
  }

  stats(userId: string): Stats {
    let games = 0, wins = 0, reachedBig = 0, points = 0, unreliable = 0;
    for (const r of this.results) { const p = r.players.find((x) => x.id === userId); if (p?.unreliable) { unreliable++; points += POINTS.unreliable; } if (!p || p.bot) continue; // bot (yoki chiqib ketgan) hisobga olinmaydi
      games++; if (p.won) { wins++; points += POINTS.win ?? 0; } if (p.circle === "big") { reachedBig++; points += POINTS.exitSmallCircle ?? 0; } }
    const level = levelOf(points); return { stars: starsOf(level), title: titleOf(starsOf(level)), unreliable, games, wins, reachedBig, points, level };
  }
  history(userId: string, limit = 50) {
    return this.results.filter((r) => r.players.some((p) => p.id === userId && !p.bot)).slice(-limit).reverse()
      .map((r) => ({ room: r.room, finishedAt: r.finishedAt, rounds: r.rounds, durationMs: r.durationMs, won: r.winner === userId, reachedBig: r.players.find((p) => p.id === userId)!.circle === "big", players: r.players.filter((p) => !p.bot).length }));
  }
  /** Reyting: g'alabalar, so'ng o'yinlar soni kam bo'lgani yuqori. Faqat ismi bor va 1 tadan ko'p o'ynagan odamlar; botlar yo'q. Ball qoidasi yo'q bo'lgani uchun ball bo'yicha emas. */
  leaderboard(limit = 20) {
    return [...this.profiles.values()].map((p) => ({ userId: p.userId, name: p.name, color: p.color, ...this.stats(p.userId) }))
      .filter((x) => x.games > 0).sort((a, b) => b.wins - a.wins || a.games - b.games || a.name.localeCompare(b.name)).slice(0, limit)
      .map((x, i) => ({ rank: i + 1, name: x.name, color: x.color, games: x.games, wins: x.wins, level: x.level }));
  }
  export(userId: string) { return { profile: this.profiles.get(userId) ?? null, stats: this.stats(userId), history: this.history(userId, 10_000) }; }
  /** Hisobni o'chirish: profil o'chadi, natijalardagi shaxsiy ID anonimlashadi (§7). */
  delete(userId: string) {
    this.profiles.delete(userId);
    for (const r of this.results) { if (r.winner === userId) r.winner = "deleted"; for (const p of r.players) if (p.id === userId) p.id = "deleted"; }
    this.writes.push(async () => { await this.persist?.deleteProfile(userId); await this.persist?.anonymizeResults(userId); });
  }
}
