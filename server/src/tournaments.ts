// Homiy turnirlari (maket D11): admin yaratadi, istalgan hisob ro'yxatdan o'tadi (16 yoshgacha — ota-ona roziligi bilan), turnir xonalari teglanadi.
// Turnir ballari alohida jadvalda; umumiy ball/daraja o'zgarmaydi (profiles.ts). Pul/sovrin shartlari — homiy bilan shartnoma, tizimda faqat matn sifatida ko'rsatiladi.
import { randomBytes } from "node:crypto";
import { Collection, type DocStore } from "./docs";
import { WriteQueue } from "./persist";
import { gamePoints, type GameResult } from "./profiles";
import { MINOR_AGE } from "./edu";

export type TStatus = "draft" | "open" | "running" | "finished";
export interface Tournament { id: string; title: string; sponsor: string; sponsorUrl?: string; rules: string; format: string; prize: string; status: TStatus; startsAt?: number; endsAt?: number; maxPlayers: number | null; createdAt: number; /** Korporativ xona: ro'yxatda ko'rinmaydi, faqat kod bilan, faqat 16+ (OPEN_QUESTIONS 179). */ corporate?: boolean; joinCode?: string; /** Korporativ xona tashkilotchisi (hisob ID): kod, holat va ishtirokchi hisobotini boshqaradi. */ organizerId?: string }
export interface Registration { userId: string; tournamentId: string; at: number; consentId?: string; approved: boolean }
export type TErr = "not_found" | "bad_field" | "bad_name" | "closed" | "full" | "already" | "consent_required" | "not_registered" | "bad_status" | "adults_only" | "bad_code";
const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max) : "");
const STATUSES: TStatus[] = ["draft", "open", "running", "finished"];
const CODE_ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // o'xshash belgilarsiz (0/O, 1/I)
const newCode = () => Array.from(randomBytes(8), (b) => CODE_ABC[b % CODE_ABC.length]).join("");
const normCode = (c: unknown) => (typeof c === "string" ? c.replace(/[\s-]/g, "").toUpperCase() : "");

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
    const corporate = old ? !!old.corporate : b.corporate === true; // turi faqat yaratishda belgilanadi
    let organizerId = old?.organizerId; if (b.organizerId !== undefined) { const v = clean(b.organizerId, 64); if (v && !corporate) return { ok: false, error: "bad_field" }; organizerId = v || undefined; }
    let joinCode = old?.joinCode; if (corporate && !joinCode) { do joinCode = newCode(); while (this.items.values().some((x) => x.joinCode === joinCode)); }
    const t: Tournament = { id: old?.id ?? randomBytes(6).toString("hex"), corporate: corporate || undefined, joinCode: corporate ? joinCode : undefined, organizerId: corporate ? organizerId : undefined, title, sponsor: b.sponsor !== undefined ? clean(b.sponsor, 120) : old?.sponsor ?? "", sponsorUrl: sponsorUrl || undefined,
      rules: b.rules !== undefined ? clean(b.rules, 4000) : old?.rules ?? "", format: b.format !== undefined ? clean(b.format, 300) : old?.format ?? "", prize: b.prize !== undefined ? clean(b.prize, 500) : old?.prize ?? "",
      status, startsAt: startsAt as number | undefined, endsAt: endsAt as number | undefined, maxPlayers: maxPlayers as number | null, createdAt: old?.createdAt ?? this.now() };
    this.items.set(t.id, t); return { ok: true, t };
  }
  remove(id: string) { if (!this.items.get(id)) return false; this.items.delete(id); for (const r of this.regs.values()) if (r.tournamentId === id) this.regs.delete(this.key(id, r.userId)); return true; }
  visible() { return this.items.values().filter((t) => t.status !== "draft" && !t.corporate).sort((a, b) => (a.startsAt ?? a.createdAt) - (b.startsAt ?? b.createdAt)); }
  /** Foydalanuvchi ko'radigan ro'yxat: ommaviy turnirlar + o'zi ro'yxatdan o'tgan korporativ xonalar. */
  visibleTo(uid: string) { return this.items.values().filter((t) => t.status !== "draft" && (!t.corporate || !!this.regOf(t.id, uid))).sort((a, b) => (a.startsAt ?? a.createdAt) - (b.startsAt ?? b.createdAt)); }
  /** Foydalanuvchi tashkilotchi bo'lgan korporativ xonalar. */
  organizedBy(uid: string) { return this.items.values().filter((t) => t.corporate && t.organizerId === uid).sort((a, b) => b.createdAt - a.createdAt); }
  participants(id: string) { return this.regs.values().filter((r) => r.tournamentId === id && r.approved).sort((a, b) => a.at - b.at); }
  /** Tashkilotchi holatni faqat oldinga suradi: qoralama → ro'yxat ochiq → davom etmoqda → yakunlangan. */
  advance(id: string, to: TStatus): { ok: true; t: Tournament } | { ok: false; error: TErr } {
    const t = this.items.get(id); if (!t) return { ok: false, error: "not_found" }; const order = STATUSES; const a = order.indexOf(t.status), b = order.indexOf(to);
    if (b < 0 || b <= a || (to === "draft")) return { ok: false, error: "bad_status" }; const n = { ...t, status: to }; this.items.set(id, n); return { ok: true, t: n };
  }
  byCode(code: unknown) { const c = normCode(code); if (c.length < 6) return undefined; return this.items.values().find((t) => t.corporate && t.joinCode === c && t.status !== "draft"); }
  rotateCode(id: string) { const t = this.items.get(id); if (!t?.corporate) return null; let c: string; do c = newCode(); while (this.items.values().some((x) => x.joinCode === c)); const n = { ...t, joinCode: c }; this.items.set(id, n); return n; }
  count(id: string) { return this.regs.values().filter((r) => r.tournamentId === id && r.approved).length; }
  regOf(id: string, uid: string) { return this.regs.get(this.key(id, uid)); }
  /** Ro'yxatdan o'tish. `needsConsent` — 16 yoshgacha: ariza `approved=false` bilan saqlanadi, ota-ona rozilik bergach tasdiqlanadi. */
  register(id: string, uid: string, age: number | null, consentId?: string): { ok: true; reg: Registration } | { ok: false; error: TErr } {
    const t = this.items.get(id); if (!t || t.status === "draft") return { ok: false, error: "not_found" };
    if (t.status !== "open" && !(t.corporate && t.status === "running")) return { ok: false, error: "closed" }; // korporativ xonaga o'yin boshlangach ham qo'shilish mumkin
    if (t.corporate && (age === null || age < MINOR_AGE)) return { ok: false, error: "adults_only" };
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
  view(t: Tournament, age: number | null) { const minor = age !== null && age < MINOR_AGE; return { ...t, joinCode: undefined, organizerId: undefined, sponsor: minor ? "" : t.sponsor, sponsorUrl: minor ? undefined : t.sponsorUrl }; }
  eraseUser(uid: string) { for (const r of this.regs.values()) if (r.userId === uid) this.regs.delete(this.key(r.tournamentId, uid)); }
}
