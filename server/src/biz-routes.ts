// Ta'lim (o'qituvchi paneli, sinf) va homiy turnirlari marshrutlari + ularning admin boshqaruvi.
import type { FastifyInstance } from "fastify";
import type { Guard } from "./admin";
import type { Commerce } from "./commerce";
import type { Edu } from "./edu";
import { reportCsv } from "./edu";
import type { ParentConsents } from "./parents";
import type { PhoneLinks } from "./phones";
import type { ProfileService } from "./profiles";
import type { RoomManager } from "./rooms";
import type { Tournaments } from "./tournaments";

export interface BizDeps {
  app: FastifyInstance; edu: Edu; tournaments: Tournaments; consents: ParentConsents; phones: PhoneLinks; profiles: ProfileService; rooms: RoomManager;
  secured: (h: (uid: string, req: any, reply: any) => unknown) => (req: any, reply: any) => unknown;
  ageOf: (uid: string) => number | null; nameOf: (uid: string) => string | undefined; hashOf: (p: string) => string; dev: boolean; tournamentsPaused?: () => boolean;
}
const STATUS: Record<string, number> = { not_found: 404, no_license: 402, forbidden: 403, bad_code: 404, expired: 410, used: 409, already_teacher: 409, seats_full: 409, already_member: 409, limit: 429, paused: 503, closed: 409, full: 409, already: 409, consent_required: 400, not_allowed: 403, not_teacher: 403, phone_required: 403, profile_required: 409 };
const fail = (reply: any, error: string) => reply.code(STATUS[error] ?? 400).send({ error });

export function registerBiz(d: BizDeps) {
  const { app, edu, tournaments: tn, profiles } = d;
  const info = { nameOf: d.nameOf, levelOf: (id: string) => profiles.levelCached(id), ageOf: d.ageOf };
  const teacher = (uid: string, reply: any) => { const c = edu.teacherCtx(uid); if (!c) { fail(reply, "not_teacher"); return null; } return c; };
  const kpub = (k: ReturnType<Edu["classesOf"]>[number]) => ({ id: k.id, name: k.name, joinCode: k.joinCode, students: k.students.length, createdAt: k.createdAt });

  // --- o'qituvchi ---
  app.get("/edu/me", d.secured((uid) => {
    const c = edu.teacherCtx(uid);
    return { teacher: c ? { org: c.org.name, licenseUntil: c.org.licenseUntil, active: c.active, seats: c.org.seats } : null,
      classes: edu.classesAsStudent(uid).map((k) => ({ id: k.id, name: k.name, teacher: d.nameOf(k.teacherId) ?? "O'qituvchi", roomCode: openRoom(k.id)?.code ?? null })) };
  }));
  app.post("/edu/redeem", d.secured((uid, req, reply) => { const r = edu.redeem(uid, (req.body as any)?.code); return r.ok ? { org: r.org.name } : fail(reply, r.error); }));
  app.get("/edu/classes", d.secured((uid, _req, reply) => { if (!teacher(uid, reply)) return; return { classes: edu.classesOf(uid).map(kpub) }; }));
  app.post("/edu/classes", d.secured((uid, req, reply) => { const r = edu.createClass(uid, (req.body as any)?.name); return r.ok ? { class: kpub(r.klass) } : fail(reply, r.error); }));
  app.post("/edu/classes/:id/code", d.secured((uid, req, reply) => { const k = edu.rotateCode(uid, String(req.params.id)); return k ? { class: kpub(k) } : fail(reply, "not_found"); }));
  app.delete("/edu/classes/:id", d.secured((uid, req, reply) => edu.archive(uid, String(req.params.id)) ? { ok: true } : fail(reply, "not_found")));
  app.get("/edu/classes/:id", d.secured((uid, req, reply) => {
    const k = edu.classOf(uid, String(req.params.id)); if (!k) return fail(reply, "not_found");
    const rep = edu.report(k, profiles.results, info); return { class: kpub(k), ...rep, room: openRoom(k.id) };
  }));
  app.get("/edu/classes/:id/report.csv", d.secured((uid, req, reply) => {
    const k = edu.classOf(uid, String(req.params.id)); if (!k) return fail(reply, "not_found");
    return reply.header("content-type", "text/csv; charset=utf-8").header("content-disposition", `attachment; filename="sinf-${k.id}.csv"`).send(reportCsv(edu.report(k, profiles.results, info).students));
  }));
  app.post("/edu/classes/:id/students/:uid/consent", d.secured((uid, req, reply) => edu.setConsent(uid, String(req.params.id), String(req.params.uid), !!(req.body as any)?.consent) ? { ok: true } : fail(reply, "not_found")));
  app.delete("/edu/classes/:id/students/:uid", d.secured((uid, req, reply) => edu.removeStudent(uid, String(req.params.id), String(req.params.uid)) ? { ok: true } : fail(reply, "not_found")));
  app.post("/edu/classes/:id/assignments", d.secured((uid, req, reply) => { const r = edu.addAssignment(uid, String(req.params.id), (req.body ?? {}) as any); return r.ok ? { assignment: r.a } : fail(reply, r.error); }));
  app.delete("/edu/classes/:id/assignments/:aid", d.secured((uid, req, reply) => edu.removeAssignment(uid, String(req.params.id), String(req.params.aid)) ? { ok: true } : fail(reply, "not_found")));
  /** Sinf xonasi: faqat faol litsenziyali o'qituvchi ochadi; xona sinf a'zolariga yopiq. */
  app.post("/edu/classes/:id/room", d.secured((uid, req, reply) => {
    const k = edu.classOf(uid, String(req.params.id)); if (!k) return fail(reply, "not_found"); if (!edu.isTeacherActive(uid)) return fail(reply, "no_license");
    const ex = openRoom(k.id); if (ex) return { code: ex.code };
    const r = d.rooms.create(uid, { kind: "class", id: k.id }); return r.ok ? { code: r.code } : fail(reply, r.error);
  }));
  app.post("/edu/join", d.secured((uid, req, reply) => {
    const age = d.ageOf(uid); if (age === null) return fail(reply, "profile_required");
    const r = edu.join(uid, (req.body as any)?.code); return r.ok ? { class: { id: r.klass.id, name: r.klass.name }, org: r.org.name } : fail(reply, r.error);
  }));
  app.post("/edu/classes/:id/leave", d.secured((uid, req, reply) => edu.leave(uid, String(req.params.id)) ? { ok: true } : fail(reply, "not_found")));
  function openRoom(classId: string) {
    for (const r of d.rooms.rooms.values()) if (r.tag?.kind === "class" && r.tag.id === classId && !r.endedAt) return { code: r.code, started: !!r.state, players: r.members.filter((m) => !m.bot && !m.left).map((m) => ({ userId: m.userId, name: d.nameOf(m.userId) ?? "O'yinchi", online: m.online })) };
    return null;
  }

  // --- turnirlar ---
  const tpub = (uid: string, t: ReturnType<Tournaments["visible"]>[number]) => { const reg = tn.regOf(t.id, uid); return { ...tn.view(t, d.ageOf(uid)), players: tn.count(t.id), registered: !!reg, approved: !!reg?.approved, pendingParent: !!reg && !reg.approved, room: tRoom(t.id) }; };
  function tRoom(id: string) { for (const r of d.rooms.rooms.values()) if (r.tag?.kind === "tournament" && r.tag.id === id && !r.endedAt && !r.state) return r.code; return null; }
  app.get("/tournaments", d.secured((uid) => ({ tournaments: tn.visible().map((t) => tpub(uid, t)) })));
  app.get("/tournaments/:id", d.secured((uid, req, reply) => {
    const t = tn.items.get(String(req.params.id)); if (!t || t.status === "draft") return fail(reply, "not_found");
    return { tournament: tpub(uid, t), board: tn.board(t.id, profiles.results, d.nameOf).slice(0, 100) };
  }));
  app.post("/tournaments/:id/register", d.secured(async (uid, req, reply) => {
    if (d.tournamentsPaused?.()) return fail(reply, "paused");
    const id = String(req.params.id); const age = d.ageOf(uid); if (age === null) return fail(reply, "profile_required");
    if (!d.dev && !d.phones.isVerified(uid) && age >= 16) return fail(reply, "phone_required");
    const t = tn.items.get(id); if (!t || t.status !== "open") return fail(reply, t ? "closed" : "not_found");
    let consentId: string | undefined;
    if (age < 16) {
      const c = await d.consents.request(uid, d.phones.hashFor(uid), "tournament", id, `«${t.title}» turniri`, (req.body as any)?.parentPhone, d.hashOf);
      if (!c.ok) return fail(reply, c.error); consentId = c.request.id;
    }
    const r = tn.register(id, uid, age, consentId); if (!r.ok) { if (consentId) d.consents.cancel(consentId, uid); return fail(reply, r.error); }
    return { ok: true, approved: r.reg.approved };
  }));
  app.post("/tournaments/:id/unregister", d.secured((uid, req, reply) => tn.unregister(String(req.params.id), uid) ? { ok: true } : fail(reply, "not_found")));
  app.post("/tournaments/:id/room", d.secured((uid, req, reply) => {
    const id = String(req.params.id); if (!tn.canJoinRoom(id, uid)) return fail(reply, "not_allowed");
    const ex = tRoom(id); if (ex) return { code: ex };
    const r = d.rooms.create(uid, { kind: "tournament", id }); return r.ok ? { code: r.code } : fail(reply, r.error);
  }));
}

/** Admin: ta'lim tashkilotlari va turnirlar (qo'shimcha ruxsat `commerce.manage`). */
export function registerBizAdmin(guard: Guard, app: FastifyInstance, d: { edu: Edu; tournaments: Tournaments; commerce: Commerce; nameOf: (id: string) => string | undefined }) {
  const P = "commerce.manage";
  const bad = (reply: any, error: string) => reply.code(STATUS[error] ?? 400).send({ error });
  app.get("/admin/edu/orgs", guard("edu.manage", () => ({ orgs: d.edu.orgs.values().map((o) => ({ ...o, teachers: d.edu.teachers.values().filter((t) => t.orgId === o.id).length, classes: d.edu.classes.values().filter((k) => k.orgId === o.id && !k.archived).length })) })));
  app.post("/admin/edu/orgs", guard("edu.manage", (req) => { const b = (req.body ?? {}) as any; const r = d.edu.createOrg(b.name, b.licenseUntil, b.seats, b.contact); return r.ok ? { org: r.org } : { error: r.error }; }, "edu.org.create"));
  app.post("/admin/edu/orgs/:id", guard("edu.manage", (req) => { const r = d.edu.updateOrg(String(req.params.id), (req.body ?? {}) as any); return r.ok ? { org: r.org } : { error: r.error }; }, "edu.org.update"));
  app.post("/admin/edu/orgs/:id/invite", guard("edu.manage", (req) => { const r = d.edu.invite(String(req.params.id)); return r.ok ? { invite: r.invite } : { error: r.error }; }, "edu.invite"));
  app.get("/admin/tournaments", guard("tournaments.manage", () => ({ tournaments: d.tournaments.items.values().map((t) => ({ ...t, players: d.tournaments.count(t.id) })) })));
  app.post("/admin/tournaments", guard("tournaments.manage", (req) => { const r = d.tournaments.upsert(null, (req.body ?? {}) as any); return r.ok ? { tournament: r.t } : { error: r.error }; }, "tournament.create"));
  app.post("/admin/tournaments/:id", guard("tournaments.manage", (req) => { const r = d.tournaments.upsert(String(req.params.id), (req.body ?? {}) as any); return r.ok ? { tournament: r.t } : { error: r.error }; }, "tournament.update"));
  app.delete("/admin/tournaments/:id", guard("tournaments.manage", (req) => (d.tournaments.remove(String(req.params.id)) ? { ok: true } : { error: "not_found" }), "tournament.delete"));
  app.get("/admin/shop/config", guard("commerce.read", () => ({ config: d.commerce.config() })));
  app.post("/admin/shop/config", guard(P, (req) => { const r = d.commerce.setConfig((req.body ?? {}) as any); return r.ok ? { config: r.config } : { error: r.error }; }, "shop.config"));
  app.get("/admin/shop/orders", guard("commerce.read", () => ({ orders: d.commerce.orders.values().sort((a, b) => b.createdAt - a.createdAt).slice(0, 200).map((o) => ({ id: o.id, user: d.nameOf(o.userId) ?? "—", sku: o.sku, title: o.title, amount: o.amount, status: o.status, channel: o.channel, createdAt: o.createdAt, paidAt: o.paidAt })) })));
  void bad;
}
