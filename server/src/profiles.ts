// Profil, o'yin tarixi, reyting va hisobni boshqarish (SPEC §5.9, §7).
import type { GamePlayer } from "@poyga/rules";
import { RULES, POINTS } from "@poyga/rules";
import { WriteQueue } from "./persist";

export interface Profile { userId: string; name: string; color: number; birthYear: number; /** Ixtiyoriy: faqat standart avatar ko'rinishi uchun */ gender?: "m" | "f"; updatedAt: number }
export interface ResultPlayer {
  id: string; bot: boolean; circle: "small" | "big"; restarts: number; won: boolean; unreliable?: boolean;
  left?: boolean; assets?: number; quitJob?: boolean; autos?: number; place?: number; // ball uchun (qo'llanma §15); eski natijalarda yo'q = 0
}
export interface GameResult { tag?: { kind: "class" | "tournament"; id: string }; room: string; finishedAt: number; durationMs: number; rounds: number; winner: string | null; contentVersion: number | null; players: ResultPlayer[] }

export interface ProfilePersist {
  loadProfiles(): Promise<Profile[]>; saveProfile(p: Profile): Promise<void>; deleteProfile(userId: string): Promise<void>;
  loadPhotoVersions?(): Promise<[string, number][]>; loadPhoto?(userId: string): Promise<Buffer | null>; savePhoto?(userId: string, jpeg: Buffer, at: number): Promise<void>; deletePhoto?(userId: string): Promise<void>;
  loadResults(): Promise<GameResult[]>; saveResult(r: GameResult): Promise<void>; anonymizeResults(userId: string): Promise<void>;
}

export const PROFILE_COLORS = 6; // §7: fishka rangi (6 ta)
export const MIN_AGE_RESTRICT = 16; // §2.8: 16 yoshgacha cheklovlar
/** Ball berish qoidalari SPEC'da yo'q (§16): qiymatlar bo'sh, buyurtmachi to'ldiradi. */
/** Ball qoidalari — «POYGA o'yin qo'llanmasi» §15 (o'yinchilar o'rtasida). 100 ball = 1 daraja (§5.9). */
export { POINTS };
/** Bitta o'yin uchun ball. Tashlab ketgan — faqat −20 (+ ishonchsizlik −50); oxirigacha o'ynagan — qolgan hamma bandlar. */
export function gamePoints(p: ResultPlayer): number {
  let n = p.unreliable ? POINTS.unreliable : 0;
  if (p.left) return n + POINTS.abandon;
  if (p.bot) return n;
  n += POINTS.finish + POINTS.asset * (p.assets ?? 0) + (p.quitJob ? POINTS.quitJob : 0) + (p.circle === "big" ? POINTS.exitSmallCircle : 0) + POINTS.auto * (p.autos ?? 0);
  if (p.won) n += POINTS.win; else if (p.place === 2) n += POINTS.second; else if (p.place === 3) n += POINTS.third;
  return n;
}

export function validateProfile(i: any, year: number): { ok: true; value: Omit<Profile, "userId" | "updatedAt"> } | { ok: false; error: string } {
  const name = typeof i?.name === "string" ? i.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2 || name.length > 24) return { ok: false, error: "bad_name" };
  if (/[<>]/.test(name)) return { ok: false, error: "bad_name" };
  if (!Number.isInteger(i?.color) || i.color < 0 || i.color >= PROFILE_COLORS) return { ok: false, error: "bad_color" };
  if (!Number.isInteger(i?.birthYear) || i.birthYear < 1900 || i.birthYear > year) return { ok: false, error: "bad_birth_year" };
  if (i?.gender !== undefined && i.gender !== null && i.gender !== "m" && i.gender !== "f") return { ok: false, error: "bad_gender" };
  return { ok: true, value: { name, color: i.color, birthYear: i.birthYear, ...(i?.gender === "m" || i?.gender === "f" ? { gender: i.gender as "m" | "f" } : {}) } };
}
/** Avatar rasmi: faqat JPEG (mijoz 256 px gacha kichraytirib yuboradi), ko'pi bilan 80 KB. */
export const MAX_PHOTO_BYTES = 80 * 1024;
export function validatePhoto(b: Buffer): { ok: true } | { ok: false; error: string } {
  if (!Buffer.isBuffer(b) || b.length < 200) return { ok: false, error: "bad_photo" };
  if (b.length > MAX_PHOTO_BYTES) return { ok: false, error: "photo_too_big" };
  if (!(b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)) return { ok: false, error: "bad_photo" };
  return { ok: true };
}
export const ageOf = (p: Pick<Profile, "birthYear">, year: number) => year - p.birthYear;
export const isRestricted = (p: Pick<Profile, "birthYear"> | undefined, year: number) => !!p && ageOf(p, year) < MIN_AGE_RESTRICT;

/** §5.9: 5 yulduz — «Yollanma ishchi → Sarmoyador». Qaror #69: yulduz = daraja (ko'pi bilan 5); oraliq unvon nomlari SPEC'da yo'q, shuning uchun faqat ikki chekka nomlanadi. */
export const starsOf = (level: number) => Math.min(5, Math.max(0, level));
export const titleOf = (stars: number): "employee" | "investor" | null => (stars >= 5 ? "investor" : stars === 0 ? "employee" : null);
/** Yutuqlar (§5.9): faqat o'yin natijalaridan hisoblanadi (alohida holat saqlanmaydi). Chegaralar — qaror (OPEN_QUESTIONS #76), SPEC raqam bermaydi. */
export const ACHIEVEMENTS = ["first_game", "first_win", "first_big", "no_restart_win", "comeback_win", "full_table", "games_10", "wins_5"] as const;
export type Achievement = (typeof ACHIEVEMENTS)[number];
export function achievementsOf(results: GameResult[], userId: string): Achievement[] {
  const mine = results.map((r) => ({ r, p: r.players.find((x) => x.id === userId) })).filter((x): x is { r: GameResult; p: ResultPlayer } => !!x.p && !x.p.bot);
  const wins = mine.filter((x) => x.p.won);
  const got = new Set<Achievement>();
  if (mine.length >= 1) got.add("first_game");
  if (wins.length >= 1) got.add("first_win");
  if (mine.some((x) => x.p.circle === "big")) got.add("first_big");
  if (wins.some((x) => x.p.restarts === 0)) got.add("no_restart_win");        // yangi kasbga o'tmasdan g'alaba
  if (wins.some((x) => x.p.restarts > 0)) got.add("comeback_win");           // qayta boshlab ham g'alaba
  if (mine.some((x) => x.r.players.length >= 6)) got.add("full_table");      // 6 kishilik stol
  if (mine.length >= 10) got.add("games_10");
  if (wins.length >= 5) got.add("wins_5");
  return ACHIEVEMENTS.filter((a) => got.has(a));
}
/** O'rin (faqat g'olibli o'yinda, faqat odamlar orasida): g'olib 1; qolganlar katta aylana → passiv daromad → naqd bo'yicha (taxmin, hujjat OPEN_QUESTIONS). */
function placeOf(st: { players: GamePlayer[]; winner: string | null; bots: string[] }, id: string, leftIds: string[]): number | undefined {
  if (!st.winner) return undefined;
  const humans = st.players.filter((p) => !st.bots.includes(p.id) && !leftIds.includes(p.id));
  const key = (p: GamePlayer) => [p.won ? 1 : 0, p.circle === "big" ? 1 : 0, (p.assets ?? []).reduce((s, a) => s + a.monthlyIncome, 0), p.cash];
  const sorted = [...humans].sort((a, b) => { const x = key(a), y = key(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return y[i] - x[i]; return 0; });
  const i = sorted.findIndex((p) => p.id === id); return i < 0 ? undefined : i + 1;
}
export interface Stats { achievements: Achievement[]; stars: number; title: "employee" | "investor" | null; unreliable: number; games: number; wins: number; reachedBig: number; points: number; level: number }
export const levelOf = (points: number) => Math.floor(Math.max(0, points) / RULES.pointsPerLevel); // §5.9

export class ProfileService {
  profiles = new Map<string, Profile>();
  results: GameResult[] = [];
  /** Admin «ishonchsiz» belgisini olib tashlagan o'yinchilar (ballga ham, hisobga ham ta'sir qilmaydi). */
  cleared = new Set<string>();
  readonly writes = new WriteQueue();
  constructor(private persist?: ProfilePersist, private year: () => number = () => new Date().getFullYear(), private now: () => number = Date.now) {}

  static async restore(persist: ProfilePersist, year?: () => number) {
    const s = new ProfileService(persist, year);
    for (const p of await persist.loadProfiles()) s.profiles.set(p.userId, p);
    for (const [id, at] of (await persist.loadPhotoVersions?.()) ?? []) s.photoAt.set(id, at);
    s.results = await persist.loadResults(); return s;
  }

  get(userId: string) { return this.profiles.get(userId); }

  /** Foydalanuvchi rasmi (JPEG): versiya (`photoAt`) xotirada, baytlar — kichik keshda, qolgani bazadan so'raladi. */
  private photoAt = new Map<string, number>(); private photoCache = new Map<string, Buffer>();
  photoVersion(userId: string) { return this.photoAt.get(userId); }
  private cachePhoto(userId: string, jpeg: Buffer) { this.photoCache.delete(userId); this.photoCache.set(userId, jpeg); if (this.photoCache.size > 300) this.photoCache.delete(this.photoCache.keys().next().value as string); }
  setPhoto(userId: string, jpeg: Buffer) {
    if (!this.profiles.has(userId)) return { ok: false as const, error: "profile_required" };
    const v = validatePhoto(jpeg); if (!v.ok) return v;
    const at = this.now(); this.photoAt.set(userId, at); this.cachePhoto(userId, jpeg);
    this.writes.push(async () => this.persist?.savePhoto?.(userId, jpeg, at)); return { ok: true as const, version: at };
  }
  async photo(userId: string): Promise<Buffer | null> {
    if (!this.photoAt.has(userId)) return null;
    const c = this.photoCache.get(userId); if (c) return c;
    const b = (await this.persist?.loadPhoto?.(userId)) ?? null; if (b) this.cachePhoto(userId, b); return b;
  }
  removePhoto(userId: string) { if (!this.photoAt.delete(userId)) return; this.photoCache.delete(userId); this.writes.push(async () => this.persist?.deletePhoto?.(userId)); }
  invalidate() { this.lvl.clear(); }
  allProfiles() { return [...this.profiles.entries()]; }
  put(userId: string, input: unknown) {
    const v = validateProfile(input, this.year()); if (!v.ok) return v;
    const p: Profile = { userId, ...v.value, updatedAt: this.now() }; this.profiles.set(userId, p);
    this.writes.push(async () => this.persist?.saveProfile(p)); return { ok: true as const, profile: p };
  }
  restrictedOf(ids: string[]) { return ids.filter((id) => isRestricted(this.profiles.get(id), this.year())); }

  private lvl = new Map<string, number>(); /** Daraja keshi (har xona yangilanishida natijalarni qayta sanamaslik uchun); yangi natijada tozalanadi. */
  levelCached(userId: string) { let v = this.lvl.get(userId); if (v === undefined) { v = this.stats(userId).level; this.lvl.set(userId, v); } return v; }
  record(r: GameResult) { this.lvl.clear(); this.results.push(r); this.writes.push(async () => this.persist?.saveResult(r)); }
  /** `leftIds`: o'yindan ixtiyoriy chiqqanlar — ularning natijasi statistika va reytingga kirmaydi (o'rnini bot o'ynagan). */
  recordFromGame(room: string, st: { players: GamePlayer[]; round: number; winner: string | null; bots: string[] }, startedAt: number, contentVersion: number | null, leftIds: string[] = [], unreliableIds: string[] = [], tag?: { kind: "class" | "tournament"; id: string }) {
    this.record({ tag, room, finishedAt: this.now(), durationMs: this.now() - startedAt, rounds: st.round, winner: st.winner, contentVersion,
      players: st.players.map((p) => ({ id: p.id, bot: st.bots.includes(p.id) || leftIds.includes(p.id), circle: p.circle, restarts: p.restarts, won: p.won, unreliable: unreliableIds.includes(p.id) || undefined,
        left: leftIds.includes(p.id) || undefined, assets: p.assets?.length ?? 0, quitJob: p.quitJob || undefined, autos: p.autos || undefined, place: placeOf(st, p.id, leftIds) })) });
  }

  stats(userId: string): Stats {
    let games = 0, wins = 0, reachedBig = 0, points = 0, unreliable = 0;
    for (const r of this.results) { const p = r.players.find((x) => x.id === userId); if (p && r.tag?.kind !== "tournament") points += gamePoints(this.cleared.has(userId) ? { ...p, unreliable: false } : p); /* turnir ballari alohida: umumiy ball o'zgarmaydi */ if (p?.unreliable && !this.cleared.has(userId)) unreliable++; if (!p || p.bot) continue; // bot (yoki chiqib ketgan) statistikaga kirmaydi
      games++; if (p.won) wins++; if (p.circle === "big") reachedBig++; }
    const level = levelOf(points); return { achievements: achievementsOf(this.results, userId), stars: starsOf(level), title: titleOf(starsOf(level)), unreliable, games, wins, reachedBig, points, level };
  }
  /** Shaxssiz voronka (§12): ro'yxatdan o'tish → profil → birinchi o'yin → qaytib kelish → g'alaba. */
  funnel(registered: number) {
    const games = new Map<string, { n: number; w: number }>();
    for (const r of this.results) for (const p of r.players) if (!p.bot) { const g = games.get(p.id) ?? { n: 0, w: 0 }; g.n++; if (p.won) g.w++; games.set(p.id, g); }
    const v = [...games.values()];
    const finished = this.results.length, withWinner = this.results.filter((r) => r.winner).length;
    return { registered, withProfile: this.profiles.size, playedFirstGame: v.length, playedThreeOrMore: v.filter((g) => g.n >= 3).length, wonAtLeastOnce: v.filter((g) => g.w > 0).length,
      gamesFinished: finished, gamesWithWinner: withWinner, winShare: finished ? withWinner / finished : 0 };
  }
  hasResult(room: string) { return this.results.some((r) => r.room === room); }
  /** Foydalanuvchining eng oxirgi tugagan o'yini (bepul tarifda faqat shuning tahlili ochiq). */
  latestRoomOf(userId: string): string | null { for (let i = this.results.length - 1; i >= 0; i--) if (this.results[i].players.some((p) => p.id === userId && !p.bot)) return this.results[i].room; return null; }
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
    this.lvl.clear();
    this.profiles.delete(userId); this.removePhoto(userId);
    for (const r of this.results) { if (r.winner === userId) r.winner = "deleted"; for (const p of r.players) if (p.id === userId) p.id = "deleted"; }
    this.writes.push(async () => { await this.persist?.deleteProfile(userId); await this.persist?.anonymizeResults(userId); });
  }
}
