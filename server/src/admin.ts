// Admin: rollar (§12), har harakat jurnalga yoziladi, kontent versiyalari, foydalanuvchi/xona qidirish, shikoyat, bloklash.
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { RoomManager } from "./rooms";
import type { Store } from "./store";
import type { ContentRegistry, Part } from "./registry";
import { WriteQueue, type Persist } from "./persist";

export type Role = "administrator" | "content_editor" | "support" | "analyst" | "moderator" | "finance" | "edu_manager" | "tournament_manager";
export type Perm = "content.read" | "content.write" | "content.publish" | "users.read" | "users.ban" | "users.manage" | "rooms.read" | "rooms.close" | "journal.read" | "complaints.manage" | "analytics.read" | "audit.read"
  | "commerce.read" | "commerce.manage" | "commerce.refund" | "accounts.manage" | "flags.manage" | "announce.manage" | "system.read" | "edu.manage" | "tournaments.manage";

export const PERMS: Record<Role, readonly Perm[]> = {
  administrator: ["content.read", "content.write", "content.publish", "users.read", "users.ban", "users.manage", "rooms.read", "rooms.close", "journal.read", "complaints.manage", "analytics.read", "audit.read",
    "commerce.read", "commerce.manage", "commerce.refund", "accounts.manage", "flags.manage", "announce.manage", "system.read", "edu.manage", "tournaments.manage"],
  content_editor: ["content.read", "content.write"], // tayyorlaydi; nashr — faqat administrator (to'rt ko'z printsipi)
  support: ["users.read", "users.ban", "rooms.read", "journal.read", "complaints.manage"],
  moderator: ["users.read", "users.ban", "rooms.read", "rooms.close", "journal.read", "complaints.manage"],
  analyst: ["analytics.read", "rooms.read"], // shaxssiz ma'lumot
  finance: ["commerce.read", "commerce.manage", "analytics.read"],
  edu_manager: ["edu.manage", "rooms.read", "announce.manage"],
  tournament_manager: ["tournaments.manage", "rooms.read", "announce.manage"],
};
export const can = (role: Role, p: Perm) => PERMS[role].includes(p);

export interface AuditEntry { at: number; ip?: string; admin: string; role: Role; action: string; target?: string; detail?: unknown }
export interface Complaint { id: number; from: string; against: string | null; room: string | null; text: string; at: number; status: "open" | "resolved"; resolution?: string; resolvedBy?: string }

/** Admin ma'lumotlari. Ishlab chiqarishda PostgreSQL implementatsiyasi shu interfeysni bajaradi. */
export class AdminState {
  users = new Map<string, { id: string; firstSeen: number; lastSeen: number; banned: boolean; banReason?: string }>();
  audit: AuditEntry[] = [];
  complaints: Complaint[] = [];
  private cid = 1;
  readonly writes = new WriteQueue();
  constructor(private persist?: Persist) {}
  static async restore(persist: Persist) {
    const s = new AdminState(persist);
    for (const u of await persist.loadUsers()) s.users.set(u.id, u);
    s.complaints = await persist.loadComplaints(); s.audit = await persist.loadAudit();
    s.cid = Math.max(0, ...s.complaints.map((c) => c.id)) + 1;
    return s;
  }
  private lastSaved = new Map<string, number>();
  touch(id: string, at: number) {
    const u = this.users.get(id);
    if (u) u.lastSeen = at; else this.users.set(id, { id, firstSeen: at, lastSeen: at, banned: false });
    // bazaga: yangi foydalanuvchi darhol, qolganda kamida 1 daqiqada bir marta
    if (!this.lastSaved.has(id) || at - this.lastSaved.get(id)! > 60_000) this.saveUser(id, at);
  }
  saveUser(id: string, at = Date.now()) { const u = this.users.get(id); if (!u) return; this.lastSaved.set(id, at); const c = { ...u }; this.writes.push(async () => this.persist?.saveUser(c)); }
  saveComplaint(c: Complaint) { const x = { ...c }; this.writes.push(async () => this.persist?.saveComplaint(x)); }
  record(a: AuditEntry) { this.audit.push(a); this.writes.push(async () => this.persist?.appendAudit(a)); }
  /** Muddatli ban (`banUntil`) o'tgach o'zi tugaydi. */
  banUntil = new Map<string, number>();
  isBanned(id: string) { const u = this.users.get(id); if (!u?.banned) return false; const t = this.banUntil.get(id); return !(t && t <= Date.now()); }
  addComplaint(c: Omit<Complaint, "id" | "status">) { const x: Complaint = { ...c, id: this.cid++, status: "open" }; this.complaints.push(x); this.saveComplaint(x); return x; }
}

export type AdminAuth = (token: string | undefined) => { id: string; role: Role; sid?: string; restricted?: "change_password" | "setup_2fa" } | null;
/** ADMIN_TOKENS='{"tok1":{"id":"a","role":"administrator"}}' — vaqtinchalik; keyin SSO/2FA ulanadi. */
export const envAdminAuth = (raw = process.env.ADMIN_TOKENS): AdminAuth => {
  const m: Record<string, { id: string; role: Role }> = raw ? JSON.parse(raw) : {};
  for (const [, v] of Object.entries(m)) if (!(v?.role in PERMS)) throw new Error(`ADMIN_TOKENS: noma'lum rol "${v?.role}"`); // xato sozlama ishga tushishda ma'lum bo'lsin, har so'rovda 500 emas
  return (t) => (t && Object.hasOwn(m, t) ? m[t] : null);
};

export type Guard = (perm: Perm | Perm[], h: (req: any, who: { id: string; role: Role; sid?: string }) => unknown, auditAction?: string, o?: { reason?: boolean }) => any;
export function registerAdmin(app: FastifyInstance, d: { auth: AdminAuth; state: AdminState; registry: ContentRegistry; rooms: RoomManager; store: Store; cards?: () => unknown; nameOf?: (id: string) => string | undefined; funnel?: (registered: number) => unknown; now?: () => number; extend?: (guard: Guard) => void }) {
  const now = d.now ?? Date.now;
  const guard: Guard = (perm, h, auditAction, o) =>
    async (req: FastifyRequest, reply: any) => {
      const tok = (req.headers.authorization ?? "").replace(/^Bearer /, "");
      const who = d.auth(tok || undefined);
      if (!who) return reply.code(401).send({ error: "unauthorized" });
      if (who.restricted) return reply.code(403).send({ error: who.restricted }); // parolni almashtirmaguncha / 2FA yoqmaguncha boshqa amal yo'q
      if (!(Array.isArray(perm) ? perm : [perm]).some((x) => can(who.role, x))) return reply.code(403).send({ error: "forbidden" });
      if (o?.reason) { const r = (req.body as any)?.reason; if (typeof r !== "string" || r.trim().length < 3 || r.length > 300) return reply.code(400).send({ error: "reason_required" }); } // xavfli amal: sabab majburiy
      // Audit: muvaffaqiyatsiz urinish ham yoziladi (":failed"); tafsilot qisqartiriladi (kontent matni jurnalni shishirmasin); parol/kodlar yozilmaydi
      const detail = (() => { const body = req.body && typeof req.body === "object" ? Object.fromEntries(Object.entries(req.body as object).filter(([k]) => !/pass|token|secret|code$/i.test(k))) : req.body ?? null; const j = JSON.stringify(body); return j && j.length > 2000 ? { truncated: true, size: j.length } : body; })();
      const rec = (suffix: string) => auditAction && d.state.record({ at: now(), ip: req.ip, admin: who.id, role: who.role, action: auditAction + suffix, target: (req.params as any)?.id ?? (req.params as any)?.v, detail });
      let out: unknown;
      try { out = await h(req, who); } catch (e) { rec(":failed"); throw e; }
      rec((out as { error?: unknown } | null)?.error ? ":failed" : "");
      return out;
    };

  d.extend?.(guard);

  // --- kontent ---
  app.get("/admin/content/versions", guard("content.read", () => ({ active: d.registry.activeVersion, versions: d.registry.infos })));
  app.get("/admin/content/:part", guard("content.read", (req) => {
    const b = d.registry.bundle(); const part = (req.params as any).part as Part;
    return b && part in b ? { version: d.registry.activeVersion, data: (b as any)[part === "cards" ? "cards" : part] } : { error: "no_part" };
  }));
  app.post("/admin/content/:part/versions", guard("content.write", (req, who) => {
    const part = (req.params as any).part as Part; const body = (req.body ?? {}) as { data?: unknown; note?: string };
    if (!["cards", "bigBoard", "dreams", "cellRules"].includes(part)) return { error: "no_part" };
    return d.registry.createVersion(part, body.data, who.id, body.note ?? "");
  }, "content.create_version"));
  app.post("/admin/content/versions/:v/publish", guard("content.publish", (req) => ({ ok: d.registry.publish(Number((req.params as any).v)) }), "content.publish"));

  // --- xonalar va jurnal ---
  app.get("/admin/rooms", guard("rooms.read", (req, who) => {
    const q = String((req.query as any).q ?? "").toUpperCase();
    return [...d.rooms.rooms.values()].filter((r) => !q || r.code.startsWith(q) || r.members.some((m) => m.userId.toUpperCase().includes(q)))
      .slice(0, 100).map((r) => ({ code: r.code, started: !!r.state, ended: r.endedAt !== null, contentVersion: r.contentVersion, round: r.state?.round ?? null,
        // analitik rol shaxsiy ma'lumotni ko'rmaydi
        members: who.role === "analyst" ? r.members.length : r.members.map((m) => ({ userId: m.userId, name: d.nameOf?.(m.userId), bot: m.bot, online: m.online })) }));
  }));
  app.get("/admin/rooms/:id/journal", guard("journal.read", async (req) => d.store.journal((req.params as any).id), "journal.read"));

  // Foydalanuvchilar va shikoyatlar: admin-core.ts

  // --- analitika (shaxssiz, §12) ---
  app.get("/admin/analytics", guard("analytics.read", () => {
    const rs = [...d.rooms.rooms.values()];
    const started = rs.filter((r) => r.state), ended = rs.filter((r) => r.endedAt);
    const decisions = { accepted: 0, skipped: 0 };
    return { rooms: rs.length, started: started.length, finished: ended.length, finishedShare: started.length ? ended.length / started.length : 0, // tugatilgan / boshlangan (g'alaba ulushi — /analytics/funnel)
      avgDurationSec: ended.length ? ended.reduce((s, r) => s + (r.endedAt! - r.createdAt), 0) / ended.length / 1000 : 0,
      avgRounds: started.length ? started.reduce((s, r) => s + r.state!.round, 0) / started.length : 0,
      users: d.state.users.size, ...decisions };
  }));
  app.get("/admin/analytics/funnel", guard("analytics.read", () => d.funnel?.(d.state.users.size) ?? {})); // ro'yxatdan o'tish → birinchi o'yin → g'alaba (§12), shaxssiz
  app.get("/admin/analytics/cards", guard("analytics.read", () => d.cards?.() ?? [])); // karta bo'yicha qabul/o'tkazish (§12), shaxssiz
  app.get("/admin/audit", guard("audit.read", () => d.state.audit.slice(-500)));
}
