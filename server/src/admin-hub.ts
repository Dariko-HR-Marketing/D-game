// Admin 4-bosqich: ta'lim tashkilotlari tafsiloti/hisoboti, turnir ishtirokchilari/sovrinlar/homiy hisoboti, e'lonlar.
import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { can, type Guard } from "./admin";
import type { Edu } from "./edu";
import type { Ops } from "./ops";
import type { ParentConsents } from "./parents";
import type { ProfileService } from "./profiles";
import type { Tournaments } from "./tournaments";

export interface HubDeps { edu: Edu; tournaments: Tournaments; ops: Ops; profiles: ProfileService; consents: ParentConsents; nameOf: (id: string) => string | undefined; ageOf: (id: string) => number | null; now?: () => number }
const DAY = 86_400_000;

export function registerAdminHub(guard: Guard, app: FastifyInstance, d: HubDeps) {
  const { edu, tournaments: tn, ops, profiles } = d; const now = () => (d.now ?? Date.now)();
  const classGames = (id: string) => profiles.results.filter((r) => r.tag?.kind === "class" && r.tag.id === id);

  // --- ta'lim: tafsilot, o'qituvchini olib tashlash, taklifni bekor qilish, jamlama hisobot ---
  app.get("/admin/edu/orgs/:id", guard("edu.manage", (req) => {
    const o = edu.orgs.get(String((req.params as any).id)); if (!o) return { error: "not_found" }; const t = now();
    const teachers = edu.teachers.values().filter((x) => x.orgId === o.id); const classes = edu.classes.values().filter((k) => k.orgId === o.id && !k.archived);
    const seats = new Set(classes.flatMap((k) => k.students.map((s) => s.userId)));
    return { org: { ...o, active: o.active, licenseActive: edu.licenseActive(o) }, seatsUsed: seats.size,
      teachers: teachers.map((x) => ({ userId: x.userId, name: d.nameOf(x.userId) ?? x.userId, addedAt: x.addedAt, classes: classes.filter((k) => k.teacherId === x.userId).length })),
      classes: classes.map((k) => { const g = classGames(k.id); const active = new Set(g.flatMap((r) => r.players.filter((p) => !p.bot).map((p) => p.id))); return { id: k.id, name: k.name, teacher: d.nameOf(k.teacherId) ?? k.teacherId, students: k.students.length, games: g.length, activeStudents: k.students.filter((s) => active.has(s.userId)).length, lastGame: g.length ? Math.max(...g.map((r) => r.finishedAt)) : null }; }),
      invites: edu.invites.values().filter((i) => i.orgId === o.id).sort((a, b) => b.expiresAt - a.expiresAt).map((i) => ({ code: i.code, expiresAt: i.expiresAt, used: !!i.usedBy, usedBy: i.usedBy ? d.nameOf(i.usedBy) ?? i.usedBy : null, expired: !i.usedBy && i.expiresAt < t })) };
  }));
  app.post("/admin/edu/orgs/:id/teachers/:uid/remove", guard("edu.manage", (req) => { const t = edu.teachers.get(String((req.params as any).uid)); if (!t || t.orgId !== String((req.params as any).id)) return { error: "not_found" }; edu.removeTeacher(t.userId); return { ok: true }; }, "edu.teacher.remove", { reason: true }));
  app.delete("/admin/edu/invites/:code", guard("edu.manage", (req) => { const i = edu.invites.get(String((req.params as any).code)); if (!i || i.usedBy) return { error: "not_found" }; edu.invites.delete(i.code); return { ok: true }; }, "edu.invite.revoke"));
  /** Tashkilot jamlama hisoboti: o'quvchi nomlarisiz (shartnoma/pilot natijalari uchun). */
  app.get("/admin/edu/orgs/:id/report", guard("edu.manage", (req) => {
    const o = edu.orgs.get(String((req.params as any).id)); if (!o) return { error: "not_found" }; const t = now();
    const classes = edu.classes.values().filter((k) => k.orgId === o.id && !k.archived);
    const rows = classes.map((k) => { const g = classGames(k.id); const players = new Set(g.flatMap((r) => r.players.filter((p) => !p.bot).map((p) => p.id))); const active30 = new Set(g.filter((r) => t - r.finishedAt < 30 * DAY).flatMap((r) => r.players.filter((p) => !p.bot).map((p) => p.id)));
      return { class: k.name, teacher: d.nameOf(k.teacherId) ?? "—", students: k.students.length, games: g.length, avgRounds: g.length ? Math.round(g.reduce((n, r) => n + r.rounds, 0) / g.length) : 0, reachedBig: g.reduce((n, r) => n + r.players.filter((p) => !p.bot && p.circle === "big").length, 0), participated: k.students.filter((s) => players.has(s.userId)).length, active30: k.students.filter((s) => active30.has(s.userId)).length }; });
    const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((n, r) => n + f(r), 0);
    return { org: o.name, licenseUntil: o.licenseUntil, totals: { classes: rows.length, students: sum((r) => r.students), games: sum((r) => r.games), participated: sum((r) => r.participated), active30: sum((r) => r.active30) }, rows };
  }));

  // --- turnirlar: tafsilot, ishtirokchilar, sovrinlar, homiy hisoboti ---
  app.get("/admin/tournaments/:id", guard("tournaments.manage", (req) => {
    const id = String((req.params as any).id); const x = tn.items.get(id); if (!x) return { error: "not_found" };
    const parts = tn.regs.values().filter((r) => r.tournamentId === id).sort((a, b) => a.at - b.at);
    return { tournament: x, participants: parts.map((r) => { const age = d.ageOf(r.userId); return { userId: r.userId, name: d.nameOf(r.userId) ?? r.userId, minor: age !== null && age < 16, approved: r.approved, at: r.at, consent: r.consentId ? d.consents.get(r.consentId)?.status ?? "expired" : null }; }),
      board: tn.board(id, profiles.results, d.nameOf).slice(0, 50), prizes: ops.prizes.values().filter((p) => p.tournamentId === id).map((p) => ({ ...p, name: d.nameOf(p.userId) ?? p.userId })), games: profiles.results.filter((r) => r.tag?.kind === "tournament" && r.tag.id === id).length };
  }));
  app.post("/admin/tournaments/:id/participants/:uid/remove", guard("tournaments.manage", (req) => (tn.unregister(String((req.params as any).id), String((req.params as any).uid)) ? { ok: true } : { error: "not_found" }), "tournament.participant.remove", { reason: true }));
  app.post("/admin/tournaments/:id/prizes", guard("tournaments.manage", (req, who) => {
    const id = String((req.params as any).id); const b = req.body as any; const x = tn.items.get(id); if (!x) return { error: "not_found" };
    if (!tn.regOf(id, String(b.userId))?.approved) return { error: "not_participant" }; const prize = String(b.prize ?? "").trim().slice(0, 300); if (prize.length < 2) return { error: "bad_prize" };
    const p = { id: randomBytes(5).toString("hex"), tournamentId: id, userId: String(b.userId), prize, status: "pending" as const, by: who.id, at: now() }; ops.prizes.set(p.id, p); return { ok: true, prize: p };
  }, "tournament.prize.add"));
  app.post("/admin/prizes/:id/given", guard("tournaments.manage", (req, who) => { const p = ops.prizes.get(String((req.params as any).id)); if (!p) return { error: "not_found" }; ops.prizes.set(p.id, { ...p, status: "given", by: who.id, at: now() }); return { ok: true }; }, "tournament.prize.given"));
  /** Homiy hisoboti: jamlama, shaxssiz (16 yoshgacha ishtirokchilar alohida ko'rsatilmaydi). */
  app.get("/admin/tournaments/:id/report", guard("tournaments.manage", (req) => {
    const id = String((req.params as any).id); const x = tn.items.get(id); if (!x) return { error: "not_found" };
    const parts = tn.regs.values().filter((r) => r.tournamentId === id && r.approved); const g = profiles.results.filter((r) => r.tag?.kind === "tournament" && r.tag.id === id);
    const played = new Set(g.flatMap((r) => r.players.filter((p) => !p.bot).map((p) => p.id)));
    return { title: x.title, sponsor: x.sponsor, status: x.status, participants: parts.length, played: parts.filter((r) => played.has(r.userId)).length, games: g.length, avgRounds: g.length ? Math.round(g.reduce((n, r) => n + r.rounds, 0) / g.length) : 0, finished: g.filter((r) => r.winner).length, startsAt: x.startsAt ?? null, endsAt: x.endsAt ?? null };
  }));

  // --- e'lonlar ---
  const canAud = (role: Parameters<typeof can>[0], aud: string) => can(role, "users.manage") || (aud === "class" && can(role, "edu.manage")) || (aud === "tournament" && can(role, "tournaments.manage"));
  app.get("/admin/announcements", guard("announce.manage", (_req, who) => ({ announcements: ops.anns.values().filter((a) => canAud(who.role, a.audience)).sort((a, b) => b.createdAt - a.createdAt).slice(0, 100).map((a) => ({ ...a, live: a.active && a.from <= now() && a.until > now(), refName: a.audience === "class" ? edu.classes.get(a.ref ?? "")?.name ?? null : a.audience === "tournament" ? tn.items.get(a.ref ?? "")?.title ?? null : null })), classes: can(who.role, "users.manage") || can(who.role, "edu.manage") ? edu.classes.values().filter((k) => !k.archived).map((k) => ({ id: k.id, name: k.name })) : [], tournaments: can(who.role, "users.manage") || can(who.role, "tournaments.manage") ? tn.items.values().map((x) => ({ id: x.id, name: x.title })) : [] })));
  app.post("/admin/announcements", guard("announce.manage", (req, who) => {
    const b = (req.body ?? {}) as any; const text = typeof b.text === "string" ? b.text.replace(/[\u0000-\u001f<>]/g, "").trim() : ""; if (text.length < 3 || text.length > 300) return { error: "bad_text" };
    const aud = b.audience === "class" || b.audience === "tournament" ? b.audience : "all"; if (!canAud(who.role, aud)) return { error: "forbidden_audience" };
    if (aud === "class" && !edu.classes.get(String(b.ref))) return { error: "bad_ref" }; if (aud === "tournament" && !tn.items.get(String(b.ref))) return { error: "bad_ref" };
    const hours = Number(b.hours ?? 24); if (!(hours >= 1 && hours <= 24 * 30)) return { error: "bad_hours" };
    const a = { id: randomBytes(5).toString("hex"), text, kind: b.kind === "warn" ? "warn" as const : "info" as const, audience: aud as "all" | "class" | "tournament", ref: aud === "all" ? undefined : String(b.ref), from: now(), until: now() + hours * 3600_000, active: true, by: who.id, createdAt: now() };
    ops.anns.set(a.id, a); return { announcement: a };
  }, "announce.create"));
  app.post("/admin/announcements/:id", guard("announce.manage", (req, who) => { const a = ops.anns.get(String((req.params as any).id)); if (!a || !canAud(who.role, a.audience)) return { error: "not_found" }; ops.anns.set(a.id, { ...a, active: !!(req.body as any)?.active }); return { ok: true }; }, "announce.toggle"));
  app.delete("/admin/announcements/:id", guard("announce.manage", (req, who) => { const a = ops.anns.get(String((req.params as any).id)); if (!a || !canAud(who.role, a.audience)) return { error: "not_found" }; ops.anns.delete(a.id); return { ok: true }; }, "announce.delete"));
}
