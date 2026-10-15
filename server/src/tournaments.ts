// Homiy turnirlari (maket D11): admin yaratadi, istalgan hisob ro'yxatdan o'tadi (16 yoshgacha — ota-ona roziligi bilan), turnir xonalari teglanadi.
// Turnir ballari alohida jadvalda; umumiy ball/daraja o'zgarmaydi (profiles.ts). Pul/sovrin shartlari — homiy bilan shartnoma, tizimda faqat matn sifatida ko'rsatiladi.
import { randomBytes } from "node:crypto";
import { Collection, type DocStore } from "./docs";
import { WriteQueue } from "./persist";
import { gamePoints, type GameResult } from "./profiles";
import { MINOR_AGE } from "./edu";

export type TStatus = "draft" | "open" | "running" | "finished";
export interface Tournament { id: string; title: string; sponsor: string; sponsorUrl?: string; rules: string; format: string; prize: string; status: TStatus; startsAt?: number; endsAt?: number; maxPlayers: number | null; createdAt: number }
export interface Registration { userId: string; tournamentId: string; at: number; consentId?: string; approved: boolean }
export type TErr = "not_found" | "bad_field" | "bad_name" | "closed" | "full" | "already" | "consent_required" | "not_registered" | "bad_status";
const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max) : "");
const STATUSES: TStatus[] = ["draft", "open", "running", "finished"];

export class Tournaments {
  readonly items: Collection<Tournament>; readonly regs: Collection<Registration>; readonly queue = new WriteQueue();
  constructor(store?: DocStore, private now: () => number = Date.now) { this.items = new Collection("tournament", store, this.queue); this.regs = new Collection("treg", store, this.queue); }
  async load() { await this.items.load(); await this.regs.load(); return this; }
  private key = (t: string, u: string) => `${t}:${u}`;

  upsert(id: string | null, b: Record<string, unknown>): { ok: true; t: Tournament } | { ok: false; error: TErr } {
    const old = id ? this.items.get(id) : undefined; if (id && !old) return { ok: false, error: "not_found" };
    const title = b.title !== undefined ? clean(b.title, 120) : old?.title ?? ""; if (title.length < 2) return { ok: false, error: "bad_name" };
    const status = (b.status ?? old?.status ?? "draft") as TStatus; if (!STATUSES.includes(status)) return { ok: false, error: "bad_field" };
    const num = (v: unknown) => (v === undefined || v === null ? undefined : Number.isFinite(v) ? (v as number) : NaN);
    const startsAt = b.startsAt !== undefined ? num(b.startsAt) : old?.startsAt, endsAt = b.endsAt !== undefined ? num(b.endsAt) : old?.endsAt;
    if ((startsAt !== undefined && Number.isNaN(startsAt)) || (endsAt !== undefined && Number.isNaN(endsAt)) || (startsAt && endsAt && endsAt < startsAt)) return { ok: false, error: "bad_field" };
    const maxPlayers = b.maxPlayers !== undefined ? (b.maxPlayers === null ? null : Number.isInteger(b.maxPlayers) && (b.maxPlayers as number) > 1 && (b.maxPlayers as number) <= 100_000 ? (b.maxPlayers as number) : NaN) : old?.maxPlayers ?? null;
    if (Number.isNaN(maxPlayers)) return { ok: false, error: "bad_field" };
    let sponsorUrl = b.sponsorUrl !== undefined ? clean(b.sponsorUrl, 300) : old?.sponsorUrl; if (sponsorUrl && !/^https:\/\//i.test(sponsorUrl)) return { ok: false, error: "bad_field" };
    const t: Tournament = { id: old?.id ?? randomBytes(6).toString("hex"), title, sponsor: b.sponsor !== undefined ? clean(b.sponsor, 120) : old?.sponsor ?? "", sponsorUrl: sponsorUrl || undefined,
      rules: b.rules !== undefined ? clean(b.rules, 4000) : old?.rules ?? "", format: b.format !== undefined ? clean(b.format, 300) : old?.format ?? "", prize: b.prize !== undefined ? clean(b.prize, 500) : old?.prize ?? "",
      status, startsAt: startsAt as number | undefined, endsAt: endsAt as number | undefined, maxPlayers: maxPlayers as number | null, createdAt: old?.createdAt ?? this.now() };
    this.items.set(t.id, t); return { ok: true, t };
  }
  remove(id: string) { if (!this.items.get(id)) return false; this.items.delete(id); for (const r of this.regs.values()) if (r.tournamentId === id) this.regs.delete(this.key(id, r.userId)); return true; }
  visible() { return this.items.values().filter((t) => t.status !== "draft").sort((a, b) => (a.startsAt ?? a.createdAt) - (b.startsAt ?? b.createdAt)); }
  count(id: string) { return this.regs.values().filter((r) => r.tournamentId === id && r.approved).length; }
  regOf(id: string, uid: string) { return this.regs.get(this.key(id, uid)); }
  /** Ro'yxatdan o'tish. `needsConsent` — 16 yoshgacha: ariza `approved=false` bilan saqlanadi, ota-ona rozilik bergach tasdiqlanadi. */
  register(id: string, uid: string, age: number | null, consentId?: string): { ok: true; reg: Registration } | { ok: false; error: TErr } {
    const t = this.items.get(id); if (!t || t.status === "draft") return { ok: false, error: "not_found" };
    if (t.status !== "open") return { ok: false, error: "closed" };
    if (this.regOf(id, uid)) return { ok: false, error: "already" };
    if (t.maxPlayers !== null && this.count(id) >= t.maxPlayers) return { ok: false, error: "full" };
    const minor = age !== null && age < MINOR_AGE; if (minor && !consentId) return { ok: false, error: "consent_required" };
    const reg: Registration = { userId: uid, tournamentId: id, at: this.now(), consentId, approved: !minor }; this.regs.set(this.key(id, uid), reg); return { ok: true, reg };
  }
  onConsent(consentId: string, approved: boolean) { const r = this.regs.values().find((x) => x.consentId === consentId); if (!r) return; if (approved) this.regs.set(this.key(r.tournamentId, r.userId), { ...r, approved: true }); else this.regs.delete(this.key(r.tournamentId, r.userId)); }
  unregister(id: string, uid: string) { const r = this.regOf(id, uid); if (!r) return false; this.regs.delete(this.key(id, uid)); return true; }
  canJoinRoom(id: string, uid: string) { const t = this.items.get(id); const r = this.regOf(id, uid); return !!t && t.status === "running" && !!r?.approved; }
  /** Turnir reytingi: teglangan o'yinlar bo'yicha ballar yig'indisi. */
  board(id: string, results: GameResult[], nameOf: (u: string) => string | undefined) {
    const acc = new Map<string, { points: number; games: number; wins: number }>();
    for (const r of results) if (r.tag?.kind === "tournament" && r.tag.id === id) for (const p of r.players) if (!p.bot && this.regOf(id, p.id)?.approved) { const a = acc.get(p.id) ?? { points: 0, games: 0, wins: 0 }; a.points += gamePoints(p); a.games++; if (p.won) a.wins++; acc.set(p.id, a); }
    return [...acc].sort((a, b) => b[1].points - a[1].points || b[1].wins - a[1].wins).map(([userId, a], i) => ({ rank: i + 1, userId, name: nameOf(userId) ?? "O'yinchi", ...a }));
  }
  /** Tashqi ko'rinish: 16 yoshgacha uchun homiy brendi yashirin (qo'llanma/§ homiy cheklovi). */
  view(t: Tournament, age: number | null) { const minor = age !== null && age < MINOR_AGE; return { ...t, sponsor: minor ? "" : t.sponsor, sponsorUrl: minor ? undefined : t.sponsorUrl }; }
  eraseUser(uid: string) { for (const r of this.regs.values()) if (r.userId === uid) this.regs.delete(this.key(r.tournamentId, uid)); }
}
