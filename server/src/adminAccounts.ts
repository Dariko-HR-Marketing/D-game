// Admin hisoblari: shaxsiy login + parol (scrypt), ixtiyoriy/majburiy TOTP (RFC 6238), sessiyalar, qulflash.
// Eski ADMIN_TOKENS (statik token) ikkinchi darajali yo'l sifatida saqlanadi — `AdminAccounts.resolve` ikkalasini ham tekshiradi.
import { createHash, randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { Collection, type DocStore } from "./docs";
import { WriteQueue } from "./persist";
import { PERMS, type Role } from "./admin";

export interface AdminAccount { id: string; login: string; name: string; role: Role; salt: string; hash: string; totpSecret?: string; totpEnabled: boolean; totpStep?: number; disabled: boolean; mustChange: boolean; failed: number; lockedUntil?: number; createdAt: number; lastLogin?: number; createdBy?: string }
export interface AdminSession { id: string; adminId: string; createdAt: number; lastSeen: number; expiresAt: number; ip?: string; ua?: string; revoked?: boolean }
export type AuthWho = { id: string; role: Role; sid?: string; restricted?: "change_password" | "setup_2fa"; legacy?: boolean };
export const SESSION_TTL_MS = 12 * 3600_000, IDLE_MS = 2 * 3600_000, LOCK_AFTER = 5, LOCK_MS = 15 * 60_000;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const b32 = (b: Buffer) => { let bits = 0, v = 0, o = ""; for (const x of b) { v = (v << 8) | x; bits += 8; while (bits >= 5) { o += B32[(v >>> (bits - 5)) & 31]; bits -= 5; } } if (bits) o += B32[(v << (5 - bits)) & 31]; return o; };
const unb32 = (s: string) => { let bits = 0, v = 0; const out: number[] = []; for (const c of s.replace(/=+$/, "")) { const i = B32.indexOf(c); if (i < 0) continue; v = (v << 5) | i; bits += 5; if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); };
export const hotp = (secret: string, step: number) => { const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(step)); const h = createHmac("sha1", unb32(secret)).update(c).digest(); const o = h[19] & 15; return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1_000_000).padStart(6, "0"); };
const hashPw = (pw: string, salt: string) => scryptSync(pw, salt, 64).toString("hex");
const eq = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
export const pwProblem = (pw: unknown, login = ""): string | null => typeof pw !== "string" || pw.length < 10 ? "weak_password" : pw.length > 200 ? "weak_password" : pw.toLowerCase() === login.toLowerCase() || !/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw) ? "weak_password" : null;
const DUMMY = { salt: "0".repeat(32), hash: hashPw("dummy-password-1", "0".repeat(32)) };

export class AdminAccounts {
  readonly accts: Collection<AdminAccount>; readonly sess: Collection<AdminSession>; readonly queue = new WriteQueue(); private lastPersist = new Map<string, number>();
  constructor(store?: DocStore, private now: () => number = Date.now, public require2fa = process.env.ADMIN_REQUIRE_2FA === "1") { this.accts = new Collection("admacct", store, this.queue); this.sess = new Collection("admsess", store, this.queue); }
  async load() { await this.accts.load(); await this.sess.load(); return this; }
  byLogin(login: string) { const l = login.trim().toLowerCase(); return this.accts.values().find((a) => a.login === l); }
  private mk(login: string, name: string, role: Role, pw: string, by?: string, mustChange = true): AdminAccount {
    const salt = randomBytes(16).toString("hex"); return { id: randomBytes(6).toString("hex"), login: login.trim().toLowerCase(), name, role, salt, hash: hashPw(pw, salt), totpEnabled: false, disabled: false, mustChange, failed: 0, createdAt: this.now(), createdBy: by };
  }
  /** Birinchi administrator (ADMIN_BOOTSTRAP_LOGIN/PASSWORD): hisob yo'q bo'lsagina yaratiladi. */
  bootstrap(login?: string, pw?: string) { if (!login || !pw || this.accts.values().length) return null; if (pwProblem(pw, login)) throw new Error("ADMIN_BOOTSTRAP_PASSWORD kamida 10 belgi, harf va raqam bo'lishi kerak"); const a = this.mk(login, "Bosh administrator", "administrator", pw, "bootstrap", true); this.accts.set(a.id, a); return a; }
  create(by: string, b: { login?: unknown; name?: unknown; role?: unknown; password?: unknown }): { ok: true; account: AdminAccount } | { ok: false; error: string } {
    const login = typeof b.login === "string" ? b.login.trim().toLowerCase() : ""; if (!/^[a-z0-9._-]{3,40}$/.test(login)) return { ok: false, error: "bad_login" };
    if (this.byLogin(login)) return { ok: false, error: "login_taken" };
    const name = typeof b.name === "string" ? b.name.trim().slice(0, 60) : ""; if (name.length < 2) return { ok: false, error: "bad_name" };
    if (typeof b.role !== "string" || !Object.hasOwn(PERMS, b.role)) return { ok: false, error: "bad_role" };
    const p = pwProblem(b.password, login); if (p) return { ok: false, error: p };
    const a = this.mk(login, name, b.role as Role, b.password as string, by); this.accts.set(a.id, a); return { ok: true, account: a };
  }
  private activeAdmins(excl?: string) { return this.accts.values().filter((a) => a.role === "administrator" && !a.disabled && a.id !== excl).length; }
  update(id: string, p: { role?: unknown; disabled?: unknown; name?: unknown }, by: string): { ok: true; account: AdminAccount } | { ok: false; error: string } {
    const a = this.accts.get(id); if (!a) return { ok: false, error: "not_found" }; const n = { ...a };
    if (p.role !== undefined) { if (typeof p.role !== "string" || !Object.hasOwn(PERMS, p.role)) return { ok: false, error: "bad_role" }; n.role = p.role as Role; }
    if (p.disabled !== undefined) n.disabled = !!p.disabled; if (typeof p.name === "string" && p.name.trim().length >= 2) n.name = p.name.trim().slice(0, 60);
    if (id === by && (n.role !== a.role || n.disabled)) return { ok: false, error: "self_change" };
    if (a.role === "administrator" && !a.disabled && (n.role !== "administrator" || n.disabled) && this.activeAdmins(id) === 0) return { ok: false, error: "last_admin" };
    this.accts.set(id, n); if (n.disabled || n.role !== a.role) this.revokeAll(id); return { ok: true, account: n };
  }
  remove(id: string, by: string) { const a = this.accts.get(id); if (!a) return { ok: false as const, error: "not_found" }; if (id === by) return { ok: false as const, error: "self_change" }; if (a.role === "administrator" && !a.disabled && this.activeAdmins(id) === 0) return { ok: false as const, error: "last_admin" }; this.revokeAll(id); this.accts.delete(id); return { ok: true as const }; }
  resetPassword(id: string, pw: unknown) { const a = this.accts.get(id); if (!a) return { ok: false as const, error: "not_found" }; const p = pwProblem(pw, a.login); if (p) return { ok: false as const, error: p }; const salt = randomBytes(16).toString("hex"); this.accts.set(id, { ...a, salt, hash: hashPw(pw as string, salt), mustChange: true, failed: 0, lockedUntil: undefined }); this.revokeAll(id); return { ok: true as const }; }
  resetTotp(id: string) { const a = this.accts.get(id); if (!a) return false; this.accts.set(id, { ...a, totpEnabled: false, totpSecret: undefined }); this.revokeAll(id); return true; }

  login(loginRaw: unknown, pw: unknown, totp: unknown, meta: { ip?: string; ua?: string } = {}): { ok: true; token: string; account: AdminAccount } | { ok: false; error: "bad_credentials" | "locked" | "totp_required" | "bad_totp" | "disabled" } {
    const a = typeof loginRaw === "string" ? this.byLogin(loginRaw) : undefined; const t = this.now();
    const salt = a?.salt ?? DUMMY.salt, want = a?.hash ?? DUMMY.hash;
    const ok = typeof pw === "string" && pw.length <= 200 && eq(hashPw(pw, salt), want) && !!a;
    if (!a) return { ok: false, error: "bad_credentials" };
    if (a.lockedUntil && a.lockedUntil > t) return { ok: false, error: "locked" };
    if (!ok) { const f = a.failed + 1; this.accts.set(a.id, { ...a, failed: f >= LOCK_AFTER ? 0 : f, lockedUntil: f >= LOCK_AFTER ? t + LOCK_MS : a.lockedUntil }); return { ok: false, error: f >= LOCK_AFTER ? "locked" : "bad_credentials" }; }
    if (a.disabled) return { ok: false, error: "disabled" };
    let step = a.totpStep;
    if (a.totpEnabled) {
      if (typeof totp !== "string" || !totp.trim()) return { ok: false, error: "totp_required" };
      const v = this.checkTotp(a, totp.trim()); if (v === null) { this.accts.set(a.id, { ...a, failed: a.failed + 1 >= LOCK_AFTER ? 0 : a.failed + 1, lockedUntil: a.failed + 1 >= LOCK_AFTER ? t + LOCK_MS : a.lockedUntil }); return { ok: false, error: "bad_totp" }; } step = v;
    }
    const token = randomBytes(32).toString("hex"); const s: AdminSession = { id: sha(token), adminId: a.id, createdAt: t, lastSeen: t, expiresAt: t + SESSION_TTL_MS, ip: meta.ip, ua: (meta.ua ?? "").slice(0, 160) };
    this.sess.set(s.id, s); const n = { ...a, failed: 0, lockedUntil: undefined, lastLogin: t, totpStep: step }; this.accts.set(a.id, n); this.prune();
    return { ok: true, token, account: n };
  }
  /** Kod to'g'ri bo'lsa shu bosqich raqamini qaytaradi (qayta ishlatish taqiqlanadi), aks holda null. */
  checkTotp(a: AdminAccount, code: string): number | null {
    if (!a.totpSecret || !/^\d{6}$/.test(code)) return null; const cur = Math.floor(this.now() / 30_000);
    for (const d of [0, -1, 1]) { const st = cur + d; if (hotp(a.totpSecret, st) === code && (a.totpStep === undefined || st > a.totpStep)) return st; }
    return null;
  }
  totpSetup(id: string) { const a = this.accts.get(id); if (!a) return null; const secret = b32(randomBytes(20)); this.accts.set(id, { ...a, totpSecret: secret, totpEnabled: false }); return { secret, uri: `otpauth://totp/POYGA:${encodeURIComponent(a.login)}?secret=${secret}&issuer=POYGA&digits=6&period=30` }; }
  totpEnable(id: string, code: unknown) { const a = this.accts.get(id); if (!a?.totpSecret || typeof code !== "string") return false; const st = this.checkTotp(a, code.trim()); if (st === null) return false; this.accts.set(id, { ...a, totpEnabled: true, totpStep: st }); return true; }
  verifyPassword(id: string, pw: unknown) { const a = this.accts.get(id); return !!a && typeof pw === "string" && pw.length <= 200 && eq(hashPw(pw, a.salt), a.hash); }
  changePassword(id: string, cur: unknown, next: unknown): { ok: true } | { ok: false; error: string } {
    const a = this.accts.get(id); if (!a) return { ok: false, error: "not_found" }; if (typeof cur !== "string" || !eq(hashPw(cur, a.salt), a.hash)) return { ok: false, error: "bad_credentials" };
    const p = pwProblem(next, a.login); if (p) return { ok: false, error: p }; if (next === cur) return { ok: false, error: "same_password" };
    const salt = randomBytes(16).toString("hex"); this.accts.set(id, { ...a, salt, hash: hashPw(next as string, salt), mustChange: false }); return { ok: true };
  }
  /** Token → kim. Muddati o'tgan/bekor qilingan/o'chirilgan hisob → null. `restricted`: parolni almashtirish yoki 2FA yoqish kerak. */
  resolve(token: string | undefined): AuthWho | null {
    if (!token || token.length !== 64) return null; const s = this.sess.get(sha(token)); const t = this.now();
    if (!s || s.revoked || s.expiresAt < t || t - s.lastSeen > IDLE_MS) return null;
    const a = this.accts.get(s.adminId); if (!a || a.disabled) return null;
    if (t - (this.lastPersist.get(s.id) ?? 0) > 300_000) { this.lastPersist.set(s.id, t); this.sess.set(s.id, { ...s, lastSeen: t }); } else s.lastSeen = t;
    const restricted = a.mustChange ? "change_password" : this.require2fa && !a.totpEnabled ? "setup_2fa" : undefined;
    return { id: a.id, role: a.role, sid: s.id, restricted };
  }
  logout(sid: string) { const s = this.sess.get(sid); if (s) this.sess.set(sid, { ...s, revoked: true }); }
  revokeAll(adminId: string, except?: string) { for (const s of this.sess.values()) if (s.adminId === adminId && s.id !== except && !s.revoked) this.sess.set(s.id, { ...s, revoked: true }); }
  sessionsOf(adminId?: string) { return this.sess.values().filter((s) => !s.revoked && s.expiresAt > this.now() && (!adminId || s.adminId === adminId)).sort((a, b) => b.lastSeen - a.lastSeen); }
  private prune() { const t = this.now(); for (const s of this.sess.values()) if (s.expiresAt < t - 86_400_000) this.sess.delete(s.id); }
  pub(a: AdminAccount) { const { salt, hash, totpSecret, totpStep, ...r } = a; void salt; void hash; void totpSecret; void totpStep; return r; }
}
