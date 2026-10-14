// Admin: rollar (§12), har harakat jurnalga yoziladi, kontent versiyalari, foydalanuvchi/xona qidirish, shikoyat, bloklash.
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { RoomManager } from "./rooms";
import type { Store } from "./store";
import type { ContentRegistry, Part } from "./registry";

export type Role = "administrator" | "content_editor" | "support" | "analyst";
export type Perm = "content.read" | "content.write" | "users.read" | "users.ban" | "rooms.read" | "journal.read" | "complaints.manage" | "analytics.read" | "audit.read";

export const PERMS: Record<Role, readonly Perm[]> = {
  administrator: ["content.read", "content.write", "users.read", "users.ban", "rooms.read", "journal.read", "complaints.manage", "analytics.read", "audit.read"],
  content_editor: ["content.read", "content.write"],
  support: ["users.read", "users.ban", "rooms.read", "journal.read", "complaints.manage"],
  analyst: ["analytics.read", "rooms.read"], // shaxssiz ma'lumot
};
export const can = (role: Role, p: Perm) => PERMS[role].includes(p);

export interface AuditEntry { at: number; admin: string; role: Role; action: string; target?: string; detail?: unknown }
export interface Complaint { id: number; from: string; against: string | null; room: string | null; text: string; at: number; status: "open" | "resolved"; resolution?: string; resolvedBy?: string }

/** Admin ma'lumotlari. Ishlab chiqarishda PostgreSQL implementatsiyasi shu interfeysni bajaradi. */
export class AdminState {
  users = new Map<string, { id: string; firstSeen: number; lastSeen: number; banned: boolean; banReason?: string }>();
  audit: AuditEntry[] = [];
  complaints: Complaint[] = [];
  private cid = 1;
  touch(id: string, at: number) {
    const u = this.users.get(id);
    if (u) u.lastSeen = at; else this.users.set(id, { id, firstSeen: at, lastSeen: at, banned: false });
  }
  isBanned(id: string) { return this.users.get(id)?.banned ?? false; }
  addComplaint(c: Omit<Complaint, "id" | "status">) { const x: Complaint = { ...c, id: this.cid++, status: "open" }; this.complaints.push(x); return x; }
}

export type AdminAuth = (token: string | undefined) => { id: string; role: Role } | null;
/** ADMIN_TOKENS='{"tok1":{"id":"a","role":"administrator"}}' — vaqtinchalik; keyin SSO/2FA ulanadi. */
export const envAdminAuth = (raw = process.env.ADMIN_TOKENS): AdminAuth => {
  const m: Record<string, { id: string; role: Role }> = raw ? JSON.parse(raw) : {};
  return (t) => (t && Object.hasOwn(m, t) ? m[t] : null);
};

export function registerAdmin(app: FastifyInstance, d: { auth: AdminAuth; state: AdminState; registry: ContentRegistry; rooms: RoomManager; store: Store; now?: () => number }) {
  const now = d.now ?? Date.now;
  const guard = (perm: Perm, h: (req: FastifyRequest, who: { id: string; role: Role }) => Promise<unknown> | unknown, auditAction?: string) =>
    async (req: FastifyRequest, reply: any) => {
      const tok = (req.headers.authorization ?? "").replace(/^Bearer /, "");
      const who = d.auth(tok || undefined);
      if (!who) return reply.code(401).send({ error: "unauthorized" });
      if (!can(who.role, perm)) return reply.code(403).send({ error: "forbidden" });
      const out = await h(req, who);
      if (auditAction) d.state.audit.push({ at: now(), admin: who.id, role: who.role, action: auditAction, target: (req.params as any)?.id ?? (req.params as any)?.v, detail: req.body });
      return out;
    };

  // --- kontent ---
  app.get("/admin/content/versions", guard("content.read", () => ({ active: d.registry.activeVersion, versions: d.registry.infos })));
  app.get("/admin/content/:part", guard("content.read", (req) => {
    const b = d.registry.bundle(); const part = (req.params as any).part as Part;
    return b && part in b ? { version: d.registry.activeVersion, data: (b as any)[part === "cards" ? "cards" : part] } : { error: "no_part" };
  }));
  app.post("/admin/content/:part/versions", guard("content.write", (req, who) => {
    const part = (req.params as any).part as Part; const body = (req.body ?? {}) as { data?: unknown; note?: string };
    if (!["cards", "bigBoard", "dreams"].includes(part)) return { error: "no_part" };
    return d.registry.createVersion(part, body.data, who.id, body.note ?? "");
  }, "content.create_version"));
  app.post("/admin/content/versions/:v/publish", guard("content.write", (req) => ({ ok: d.registry.publish(Number((req.params as any).v)) }), "content.publish"));

  // --- xonalar va jurnal ---
  app.get("/admin/rooms", guard("rooms.read", (req, who) => {
    const q = String((req.query as any).q ?? "").toUpperCase();
    return [...d.rooms.rooms.values()].filter((r) => !q || r.code.startsWith(q) || r.members.some((m) => m.userId.toUpperCase().includes(q)))
      .slice(0, 100).map((r) => ({ code: r.code, started: !!r.state, ended: r.endedAt !== null, contentVersion: r.contentVersion, round: r.state?.round ?? null,
        // analitik rol shaxsiy ma'lumotni ko'rmaydi
        members: who.role === "analyst" ? r.members.length : r.members.map((m) => ({ userId: m.userId, bot: m.bot, online: m.online })) }));
  }));
  app.get("/admin/rooms/:id/journal", guard("journal.read", async (req) => d.store.journal((req.params as any).id), "journal.read"));

  // --- foydalanuvchilar ---
  app.get("/admin/users", guard("users.read", (req) => {
    const q = String((req.query as any).q ?? "").toLowerCase();
    return [...d.state.users.values()].filter((u) => !q || u.id.toLowerCase().includes(q)).slice(0, 100);
  }));
  app.post("/admin/users/:id/ban", guard("users.ban", (req) => {
    const id = (req.params as any).id as string; const u = d.state.users.get(id);
    if (!u) return { error: "no_user" };
    u.banned = true; u.banReason = String((req.body as any)?.reason ?? "");
    for (const [code, r] of d.rooms.rooms) if (r.members.some((m) => m.userId === id && !m.bot)) d.rooms.leave(code, id); // o'yindan chiqariladi, o'rniga bot
    return { ok: true };
  }, "user.ban"));
  app.post("/admin/users/:id/unban", guard("users.ban", (req) => {
    const u = d.state.users.get((req.params as any).id); if (!u) return { error: "no_user" };
    u.banned = false; u.banReason = undefined; return { ok: true };
  }, "user.unban"));

  // --- shikoyatlar ---
  app.get("/admin/complaints", guard("complaints.manage", () => d.state.complaints));
  app.post("/admin/complaints/:id/resolve", guard("complaints.manage", (req, who) => {
    const c = d.state.complaints.find((x) => x.id === Number((req.params as any).id)); if (!c) return { error: "no_complaint" };
    c.status = "resolved"; c.resolution = String((req.body as any)?.resolution ?? ""); c.resolvedBy = who.id; return { ok: true };
  }, "complaint.resolve"));

  // --- analitika (shaxssiz, §12) ---
  app.get("/admin/analytics", guard("analytics.read", () => {
    const rs = [...d.rooms.rooms.values()];
    const started = rs.filter((r) => r.state), ended = rs.filter((r) => r.endedAt);
    const decisions = { accepted: 0, skipped: 0 };
    return { rooms: rs.length, started: started.length, finished: ended.length, winShare: started.length ? ended.length / started.length : 0,
      avgDurationSec: ended.length ? ended.reduce((s, r) => s + (r.endedAt! - r.createdAt), 0) / ended.length / 1000 : 0,
      avgRounds: started.length ? started.reduce((s, r) => s + r.state!.round, 0) / started.length : 0,
      users: d.state.users.size, ...decisions };
  }));
  app.get("/admin/audit", guard("audit.read", () => d.state.audit.slice(-500)));
}
