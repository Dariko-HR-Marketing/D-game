// Admin 1-bosqich: kirish (login + parol + TOTP), hisoblar va sessiyalar, boshqaruv paneli, foydalanuvchi kartasi va amallari, shikoyat ish jarayoni.
import type { FastifyInstance } from "fastify";
import { can, PERMS, type AdminState, type Guard, type Role } from "./admin";
import type { AdminAccounts, AuthWho } from "./adminAccounts";
import type { Commerce } from "./commerce";
import type { Edu } from "./edu";
import { dayKey, lastDays, type CStatus, type Ops } from "./ops";
import type { ParentConsents } from "./parents";
import type { PhoneLinks } from "./phones";
import type { ProfileService } from "./profiles";
import { KeyedLimiter } from "./ratelimit";
import type { RoomManager } from "./rooms";
import type { Tournaments } from "./tournaments";

export interface CoreDeps {
  accounts: AdminAccounts; state: AdminState; ops: Ops; rooms: RoomManager; profiles: ProfileService; commerce: Commerce; edu: Edu; tournaments: Tournaments; consents: ParentConsents; phones: PhoneLinks;
  eraseUser: (uid: string) => void; now?: () => number; legacy?: (token: string | undefined) => AuthWho | null;
}
const ERR_STATUS: Record<string, number> = { bad_credentials: 401, locked: 429, disabled: 403, totp_required: 401, bad_totp: 401, not_found: 404, login_taken: 409, last_admin: 409, self_change: 409 };

/** Ochiq (tokensiz/o'z tokeni) marshrutlar: kirish, chiqish, o'z profili, parol va 2FA. */
export function registerAdminAuth(app: FastifyInstance, d: CoreDeps) {
  const { accounts, state } = d; const now = d.now ?? Date.now; const loginLimit = new KeyedLimiter(1 / 3, 20);
  const who = (req: any) => { const tok = (req.headers.authorization ?? "").replace(/^Bearer /, "") || undefined; return accounts.resolve(tok) ?? d.legacy?.(tok) ?? null; };
  const me = (id: string, role: Role) => { const a = accounts.accts.get(id); return a ? accounts.pub(a) : { id, login: id, name: id, role, legacy: true }; };
  app.post("/admin/login", async (req, reply) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!loginLimit.allow(req.ip)) return reply.code(429).send({ error: "rate_limited" });
    const r = accounts.login(b.login, b.password, b.totp, { ip: req.ip, ua: String(req.headers["user-agent"] ?? "") });
    const acct = typeof b.login === "string" ? accounts.byLogin(b.login) : undefined;
    state.record({ at: now(), ip: req.ip, admin: acct?.id ?? "unknown", role: acct?.role ?? "support", action: r.ok ? "admin.login" : "admin.login:failed", detail: r.ok ? undefined : { reason: r.error, login: String(b.login ?? "").slice(0, 40) } });
    if (!r.ok) return reply.code(ERR_STATUS[r.error] ?? 400).send({ error: r.error });
    return { token: r.token, account: accounts.pub(r.account), require2fa: accounts.require2fa };
  });
  app.post("/admin/logout", async (req) => { const w = who(req); if (w?.sid) accounts.logout(w.sid); return { ok: true }; });
  app.get("/admin/me", async (req, reply) => { const w = who(req); if (!w) return reply.code(401).send({ error: "unauthorized" }); return { account: me(w.id, w.role), restricted: w.restricted ?? null, require2fa: accounts.require2fa, perms: PERMS[w.role] }; });
  app.post("/admin/me/password", async (req, reply) => {
    const w = who(req); if (!w) return reply.code(401).send({ error: "unauthorized" }); const b = (req.body ?? {}) as any;
    const r = accounts.changePassword(w.id, b.current, b.next); if (!r.ok) return reply.code(r.error === "bad_credentials" ? 401 : 400).send({ error: r.error });
    accounts.revokeAll(w.id, w.sid); state.record({ at: now(), ip: req.ip, admin: w.id, role: w.role, action: "admin.password" }); return { ok: true };
  });
  app.post("/admin/me/totp/setup", async (req, reply) => { const w = who(req); if (!w) return reply.code(401).send({ error: "unauthorized" }); if (accounts.accts.get(w.id)?.totpEnabled) return reply.code(409).send({ error: "already_enabled" }); return accounts.totpSetup(w.id); });
  app.post("/admin/me/totp/enable", async (req, reply) => {
    const w = who(req); if (!w) return reply.code(401).send({ error: "unauthorized" });
    if (!accounts.totpEnable(w.id, (req.body as any)?.code)) return reply.code(400).send({ error: "bad_totp" });
    state.record({ at: now(), ip: req.ip, admin: w.id, role: w.role, action: "admin.2fa.enable" }); return { ok: true };
  });
  app.post("/admin/me/totp/disable", async (req, reply) => {
    const w = who(req); if (!w) return reply.code(401).send({ error: "unauthorized" }); const a = accounts.accts.get(w.id); if (!a?.totpEnabled) return reply.code(409).send({ error: "not_enabled" });
    if (accounts.require2fa) return reply.code(403).send({ error: "2fa_required" });
    const b = (req.body ?? {}) as any; if (!accounts.verifyPassword(w.id, b.password)) return reply.code(401).send({ error: "bad_credentials" });
    if (accounts.checkTotp(a, String(b.code ?? "")) === null) return reply.code(401).send({ error: "bad_totp" });
    accounts.accts.set(a.id, { ...a, totpEnabled: false, totpSecret: undefined }); state.record({ at: now(), ip: req.ip, admin: w.id, role: w.role, action: "admin.2fa.disable" }); return { ok: true };
  });
  app.get("/admin/me/sessions", async (req, reply) => { const w = who(req); if (!w) return reply.code(401).send({ error: "unauthorized" }); return { sessions: accounts.sessionsOf(w.id).map((s) => ({ id: s.id.slice(0, 12), full: s.id, current: s.id === w.sid, createdAt: s.createdAt, lastSeen: s.lastSeen, ip: s.ip, ua: s.ua })) }; });
  app.delete("/admin/me/sessions/:id", async (req, reply) => { const w = who(req); if (!w) return reply.code(401).send({ error: "unauthorized" }); const s = accounts.sess.get(String((req.params as any).id)); if (!s || s.adminId !== w.id) return reply.code(404).send({ error: "not_found" }); accounts.logout(s.id); return { ok: true }; });
}

export function registerAdminCore(guard: Guard, app: FastifyInstance, d: CoreDeps) {
  const { accounts, state, ops, profiles, commerce, rooms } = d; const now = d.now ?? Date.now;
  const nameOf = (id: string) => profiles.get(id)?.name ?? null; const year = () => new Date(now()).getFullYear();
  const ageOf = (id: string) => { const p = profiles.get(id); return p ? year() - p.birthYear : null; };

  // --- admin hisoblari ---
  app.get("/admin/accounts", guard("accounts.manage", () => ({ accounts: accounts.accts.values().map((a) => accounts.pub(a)).sort((x, y) => x.createdAt - y.createdAt), roles: Object.keys(PERMS), sessions: accounts.sessionsOf().length })));
  app.post("/admin/accounts", guard("accounts.manage", (req, who) => { const r = accounts.create(who.id, (req.body ?? {}) as any); return r.ok ? { account: accounts.pub(r.account) } : { error: r.error }; }, "admin.account.create"));
  app.post("/admin/accounts/:id", guard("accounts.manage", (req, who) => { const r = accounts.update(String((req.params as any).id), (req.body ?? {}) as any, who.id); return r.ok ? { account: accounts.pub(r.account) } : { error: r.error }; }, "admin.account.update"));
  app.post("/admin/accounts/:id/password", guard("accounts.manage", (req) => { const r = accounts.resetPassword(String((req.params as any).id), (req.body as any)?.password); return r.ok ? { ok: true } : { error: r.error }; }, "admin.account.reset_password"));
  app.post("/admin/accounts/:id/totp-reset", guard("accounts.manage", (req) => (accounts.resetTotp(String((req.params as any).id)) ? { ok: true } : { error: "not_found" }), "admin.account.reset_2fa"));
  app.delete("/admin/accounts/:id", guard("accounts.manage", (req, who) => { const r = accounts.remove(String((req.params as any).id), who.id); return r.ok ? { ok: true } : { error: r.error }; }, "admin.account.delete"));
  app.get("/admin/sessions", guard("accounts.manage", () => ({ sessions: accounts.sessionsOf().map((s) => ({ id: s.id, admin: accounts.accts.get(s.adminId)?.login ?? s.adminId, createdAt: s.createdAt, lastSeen: s.lastSeen, ip: s.ip, ua: s.ua })) })));
  app.delete("/admin/sessions/:id", guard("accounts.manage", (req) => { const id = String((req.params as any).id); if (!accounts.sess.get(id)) return { error: "not_found" }; accounts.logout(id); return { ok: true }; }, "admin.session.revoke"));

  // --- boshqaruv paneli ---
  app.get("/admin/dashboard", guard(["rooms.read", "analytics.read", "commerce.read", "complaints.manage", "edu.manage", "tournaments.manage", "system.read"], (_req, who) => {
    const t = now(), today = dayKey(t), days = lastDays(14, t); const R = (p: Parameters<typeof can>[1]) => can(who.role, p);
    const out: Record<string, unknown> = { at: t, role: who.role };
    if (R("rooms.read") || R("analytics.read")) {
      const rs = [...rooms.rooms.values()];
      out.live = { online: rs.reduce((n, r) => n + r.members.filter((m) => !m.bot && m.online).length, 0), active: rs.filter((r) => r.state && !r.endedAt).length, lobby: rs.filter((r) => !r.state).length, classRooms: rs.filter((r) => r.tag?.kind === "class" && !r.endedAt).length, tournamentRooms: rs.filter((r) => r.tag?.kind === "tournament" && !r.endedAt).length };
    }
    if (R("analytics.read")) {
      const users = [...state.users.values()], res = profiles.results;
      const reg = Object.fromEntries(days.map((k) => [k, 0])), fin = { ...reg }; for (const u of users) { const k = dayKey(u.firstSeen); if (k in reg) reg[k]++; } for (const r of res) { const k = dayKey(r.finishedAt); if (k in fin) fin[k]++; }
      out.today = { registered: reg[today], gamesFinished: fin[today], users: users.length, games: res.length };
      out.series = { days, registered: days.map((k) => reg[k]), gamesFinished: days.map((k) => fin[k]) };
    }
    if (R("commerce.read")) {
      const paid = commerce.orders.values().filter((o) => o.status === "paid" && o.amount > 0); const rev = Object.fromEntries(days.map((k) => [k, 0]));
      for (const o of paid) { const k = dayKey(o.paidAt ?? o.createdAt); if (k in rev) rev[k] += o.amount; }
      out.money = { days, today: rev[today], series: days.map((k) => rev[k]), plusActive: [...new Set(commerce.ents.values().filter((e) => e.plusUntil && e.plusUntil > t).map((e) => e.userId))].length };
    }
    const attn: { kind: string; text: string; count: number; to: string }[] = [];
    if (R("complaints.manage")) { const n = state.complaints.filter((c) => (ops.cmeta.get(String(c.id))?.status ?? (c.status === "open" ? "new" : "resolved")) === "new").length; if (n) attn.push({ kind: "warn", text: "Yangi shikoyatlar", count: n, to: "complaints" }); }
    if (R("commerce.read")) {
      const stuck = commerce.orders.values().filter((o) => o.status === "pending_payment" && t - o.createdAt > 3600_000).length; if (stuck) attn.push({ kind: "warn", text: "1 soatdan ortiq to'lanmagan buyurtmalar", count: stuck, to: "shop" });
      const par = commerce.orders.values().filter((o) => o.status === "pending_parent").length; if (par) attn.push({ kind: "info", text: "Ota-ona roziligini kutayotgan buyurtmalar", count: par, to: "shop" });
    }
    if (R("edu.manage")) { const soon = d.edu.orgs.values().filter((o) => o.active && o.licenseUntil > t && o.licenseUntil - t < 30 * 86_400_000).length, gone = d.edu.orgs.values().filter((o) => o.active && o.licenseUntil <= t).length; if (soon) attn.push({ kind: "warn", text: "30 kun ichida tugaydigan litsenziyalar", count: soon, to: "edu" }); if (gone) attn.push({ kind: "bad", text: "Muddati tugagan litsenziyalar", count: gone, to: "edu" }); }
    if (R("system.read")) { const e = ops.errors.filter((x) => t - x.at < 3600_000).length; if (e) attn.push({ kind: "bad", text: "So'nggi soatdagi tizim xatolari", count: e, to: "system" }); const f = ops.smsLog.filter((x) => !x.ok && t - x.at < 3600_000).length; if (f) attn.push({ kind: "bad", text: "Yuborilmagan SMS (1 soat)", count: f, to: "system" }); }
    out.attention = attn; return out;
  }));

  // --- foydalanuvchilar ---
  const row = (u: { id: string; firstSeen: number; lastSeen: number; banned: boolean; banReason?: string }) => {
    const p = profiles.get(u.id), age = ageOf(u.id), st = p ? profiles.stats(u.id) : null;
    return { id: u.id, name: p?.name ?? null, age, firstSeen: u.firstSeen, lastSeen: u.lastSeen, banned: state.isBanned(u.id), banReason: u.banReason, banUntil: state.banUntil.get(u.id) ?? null, plus: commerce.isPlus(u.id), level: st?.level ?? null, games: st?.games ?? 0, unreliable: st?.unreliable ?? 0, minor: age !== null && age < 16 };
  };
  app.get("/admin/users", guard("users.read", (req) => {
    const q = req.query as Record<string, string>; const s = (q.q ?? "").toLowerCase();
    let rows = [...state.users.values()].map(row);
    if (s) rows = rows.filter((u) => u.id.toLowerCase().includes(s) || (u.name ?? "").toLowerCase().includes(s));
    if (q.banned === "1") rows = rows.filter((u) => u.banned); if (q.plus === "1") rows = rows.filter((u) => u.plus); if (q.minor === "1") rows = rows.filter((u) => u.minor); if (q.unreliable === "1") rows = rows.filter((u) => u.unreliable > 0);
    rows.sort((a, b) => b.lastSeen - a.lastSeen); const off = Math.max(0, Number(q.offset) || 0);
    return { total: rows.length, users: rows.slice(off, off + 50) };
  }));
  app.get("/admin/users/:id", guard("users.read", (req, who) => {
    const id = String((req.params as any).id); const u = state.users.get(id); if (!u) return { error: "no_user" };
    const p = profiles.get(id), st = p ? profiles.stats(id) : null, ctl = d.consents.controlsOf(id);
    const orders = commerce.ordersOf(id).slice(0, 30).map((o) => ({ id: o.id, title: o.title, amount: o.amount, status: o.status, createdAt: o.createdAt, ref: o.ref }));
    const complaints = state.complaints.filter((c) => c.from === id || c.against === id).map((c) => ({ id: c.id, role: c.from === id ? "from" : "against", text: c.text.slice(0, 200), at: c.at, status: ops.cmeta.get(String(c.id))?.status ?? (c.status === "open" ? "new" : "resolved") }));
    const cls = d.edu.classes.values().filter((k) => k.students.some((s) => s.userId === id) || k.teacherId === id).map((k) => ({ id: k.id, name: k.name, role: k.teacherId === id ? "teacher" : "student" }));
    const tr = d.tournaments.regs.values().filter((r) => r.userId === id).map((r) => ({ id: r.tournamentId, title: d.tournaments.items.get(r.tournamentId)?.title ?? "—", approved: r.approved }));
    return { id, firstSeen: u.firstSeen, lastSeen: u.lastSeen, banned: state.isBanned(id), banReason: u.banReason, ban: ops.bans.get(id) ?? null,
      profile: p ? { name: p.name, color: p.color, birthYear: p.birthYear, age: ageOf(id) } : null, stats: st ? { level: st.level, points: st.points, games: st.games, wins: st.wins, reachedBig: st.reachedBig, unreliable: st.unreliable, achievements: st.achievements.length } : null,
      phoneVerified: d.phones.isVerified(id), plus: { active: commerce.isPlus(id), until: commerce.ents.get(id)?.plusUntil ?? null }, parentControls: ctl ?? null, orders, complaints, classes: cls, tournaments: tr,
      history: profiles.history(id, 10).map((h: any) => ({ room: h.room ?? h.code, finishedAt: h.finishedAt, won: h.won, place: h.place })), canManage: can(who.role, "users.manage") };
  }));
  app.post("/admin/users/:id/ban", guard("users.ban", (req, who) => {
    const id = String((req.params as any).id); const u = state.users.get(id); if (!u) return { error: "no_user" }; const b = req.body as any;
    const days = b.days === undefined || b.days === null || b.days === "" ? null : Number(b.days); if (days !== null && !(Number.isFinite(days) && days > 0 && days <= 3650)) return { error: "bad_days" };
    const until = days === null ? undefined : now() + days * 86_400_000;
    u.banned = true; u.banReason = String(b.reason).trim(); if (until) state.banUntil.set(id, until); else state.banUntil.delete(id); state.saveUser(id);
    ops.bans.set(id, { id, until, by: who.id, at: now(), reason: u.banReason });
    for (const [code, r] of rooms.rooms) if (r.members.some((m) => m.userId === id && !m.bot)) rooms.leave(code, id); // o'yindan chiqariladi, o'rniga bot
    return { ok: true, until: until ?? null };
  }, "user.ban", { reason: true }));
  app.post("/admin/users/:id/unban", guard("users.ban", (req) => { const id = String((req.params as any).id); const u = state.users.get(id); if (!u) return { error: "no_user" }; u.banned = false; u.banReason = undefined; state.banUntil.delete(id); ops.bans.delete(id); state.saveUser(id); return { ok: true }; }, "user.unban", { reason: true }));
  app.post("/admin/users/:id/plus", guard("users.manage", (req, who) => {
    const id = String((req.params as any).id); if (!state.users.get(id)) return { error: "no_user" }; const b = req.body as any;
    if (b.action === "revoke") return { ok: true, revoked: commerce.revokePlus(id, String(b.reason)) };
    if (b.plan !== "monthly" && b.plan !== "yearly") return { error: "bad_plan" };
    commerce.grantManual(id, b.plan, who.id, String(b.reason)); return { ok: true };
  }, "user.plus", { reason: true }));
  app.post("/admin/users/:id/clear-unreliable", guard("users.manage", (req, who) => { const id = String((req.params as any).id); profiles.cleared.add(id); ops.cleared.set(id, { id, by: who.id, at: now() }); profiles.invalidate(); return { ok: true }; }, "user.clear_unreliable", { reason: true }));
  app.post("/admin/users/:id/unlink-phone", guard("users.manage", (req) => { d.phones.erase(String((req.params as any).id)); return { ok: true }; }, "user.unlink_phone", { reason: true }));
  app.get("/admin/users/:id/export", guard("users.manage", (req) => { const id = String((req.params as any).id); return { user: state.users.get(id) ?? null, ...profiles.export(id), orders: commerce.ordersOf(id) }; }, "user.export"));
  app.delete("/admin/users/:id", guard("users.manage", (req) => { const id = String((req.params as any).id); if (!state.users.get(id)) return { error: "no_user" }; for (const [code, r] of rooms.rooms) if (r.members.some((m) => m.userId === id && !m.bot)) rooms.leave(code, id); d.eraseUser(id); return { ok: true }; }, "user.delete", { reason: true }));

  // --- shikoyatlar: yangi → ko'rib chiqilmoqda → hal qilindi / rad etildi ---
  const metaOf = (c: { id: number; status: string }) => ops.cmeta.get(String(c.id)) ?? { id: String(c.id), status: (c.status === "open" ? "new" : "resolved") as CStatus, category: "player" as const, notes: [], updatedAt: 0 };
  app.get("/admin/complaints", guard("complaints.manage", (req, who) => {
    const q = req.query as Record<string, string>; const against = new Map<string, number>(); for (const c of state.complaints) if (c.against) against.set(c.against, (against.get(c.against) ?? 0) + 1);
    let rows = state.complaints.map((c) => { const m = metaOf(c); return { ...c, status: m.status, category: m.category, assignee: m.assignee ?? null, assigneeName: m.assignee ? accounts.accts.get(m.assignee)?.name ?? m.assignee : null, notes: m.notes, fromName: nameOf(c.from), againstName: c.against ? nameOf(c.against) : null, againstCount: c.against ? against.get(c.against) ?? 0 : 0 }; });
    if (q.status) rows = rows.filter((r) => r.status === q.status); if (q.mine === "1") rows = rows.filter((r) => r.assignee === who.id);
    return rows.sort((a, b) => b.at - a.at);
  }));
  const setMeta = (id: number, f: (m: ReturnType<typeof metaOf>) => ReturnType<typeof metaOf>) => { const c = state.complaints.find((x) => x.id === id); if (!c) return null; const m = f(metaOf(c)); m.updatedAt = now(); ops.cmeta.set(String(id), m); return { c, m }; };
  app.post("/admin/complaints/:id/status", guard("complaints.manage", (req, who) => {
    const b = req.body as any; if (!["new", "in_progress", "resolved", "rejected"].includes(b.status)) return { error: "bad_status" };
    if (b.assignee !== undefined && b.assignee !== null && !accounts.accts.get(String(b.assignee))) return { error: "bad_assignee" };
    const r = setMeta(Number((req.params as any).id), (m) => ({ ...m, status: b.status, assignee: b.assignee === undefined ? (m.assignee ?? (b.status === "in_progress" ? who.id : undefined)) : b.assignee ?? undefined, category: ["player", "payment", "technical", "other"].includes(b.category) ? b.category : m.category }));
    if (!r) return { error: "no_complaint" };
    if (b.status === "resolved" || b.status === "rejected") { r.c.status = "resolved"; r.c.resolution = typeof b.resolution === "string" ? b.resolution.slice(0, 500) : r.c.resolution; r.c.resolvedBy = who.id; state.saveComplaint(r.c); } else if (r.c.status === "resolved") { r.c.status = "open"; state.saveComplaint(r.c); }
    return { ok: true };
  }, "complaint.status"));
  app.post("/admin/complaints/:id/note", guard("complaints.manage", (req, who) => { const text = String((req.body as any)?.text ?? "").trim().slice(0, 1000); if (text.length < 2) return { error: "bad_text" }; const r = setMeta(Number((req.params as any).id), (m) => ({ ...m, notes: [...m.notes, { at: now(), by: who.id, text }].slice(-50) })); return r ? { ok: true } : { error: "no_complaint" }; }, "complaint.note"));
  app.post("/admin/complaints/:id/resolve", guard("complaints.manage", (req, who) => {
    const r = setMeta(Number((req.params as any).id), (m) => ({ ...m, status: "resolved" })); if (!r) return { error: "no_complaint" };
    r.c.status = "resolved"; r.c.resolution = String((req.body as any)?.resolution ?? ""); r.c.resolvedBy = who.id; state.saveComplaint(r.c); return { ok: true };
  }, "complaint.resolve"));
  // Ism moderatsiyasi: haqoratli ismni majburan almashtirish
  app.post("/admin/users/:id/rename", guard("users.ban", (req) => {
    const id = String((req.params as any).id); const p = profiles.get(id); if (!p) return { error: "no_user" };
    const r = profiles.put(id, { name: `O'yinchi ${id.slice(-4)}`, color: p.color, birthYear: p.birthYear }); return r.ok ? { ok: true } : { error: "bad_name" };
  }, "user.rename", { reason: true }));
  void ERR_STATUS;
}
export type { Role };
