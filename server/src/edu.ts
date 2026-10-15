// Ta'lim muassasalari (maket D10; qo'llanma/spetsifikatsiya: B. Ta'lim litsenziyasi): tashkilot va litsenziya (shartnoma asosida admin beradi),
// o'qituvchi (taklif kodi bilan ulanadi), sinflar, sinf xonalari, o'quvchi hisobotlari va topshiriqlar. O'quvchi to'lamaydi.
// Maxfiylik: o'qituvchi faqat sinf xonalarida o'ynalgan o'yinlar bo'yicha statistikani ko'radi; 16 yoshgacha o'quvchi — rozilik belgilanmaguncha hisobotda yo'q.
import { randomBytes } from "node:crypto";
import { Collection, type DocStore } from "./docs";
import { WriteQueue } from "./persist";
import type { GameResult } from "./profiles";

export interface Org { id: string; name: string; contact?: string; licenseUntil: number; seats: number | null; active: boolean; createdAt: number }
export interface Teacher { userId: string; orgId: string; addedAt: number }
export interface Invite { code: string; orgId: string; expiresAt: number; usedBy?: string }
export interface Student { userId: string; consent: boolean; joinedAt: number }
export interface Klass { id: string; orgId: string; teacherId: string; name: string; joinCode: string; students: Student[]; createdAt: number; archived?: boolean }
export type AssignKind = "games" | "wins" | "big";
export interface Assignment { id: string; classId: string; title: string; kind: AssignKind; target: number; due?: number; createdAt: number }
export const MINOR_AGE = 16;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code = (n: number) => Array.from(randomBytes(n), (b) => ALPHABET[b % ALPHABET.length]).join("");
const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max) : "");

export type EduErr = "not_found" | "no_license" | "bad_name" | "bad_code" | "expired" | "used" | "already_teacher" | "forbidden" | "bad_field" | "seats_full" | "already_member" | "not_member" | "limit" | "teacher_cannot_join";

export class Edu {
  readonly orgs: Collection<Org>; readonly teachers: Collection<Teacher>; readonly invites: Collection<Invite>; readonly classes: Collection<Klass>; readonly assigns: Collection<Assignment>;
  readonly queue = new WriteQueue();
  constructor(store?: DocStore, private now: () => number = Date.now) {
    this.orgs = new Collection("org", store, this.queue); this.teachers = new Collection("teacher", store, this.queue); this.invites = new Collection("invite", store, this.queue);
    this.classes = new Collection("class", store, this.queue); this.assigns = new Collection("assign", store, this.queue);
  }
  async load() { for (const c of [this.orgs, this.teachers, this.invites, this.classes, this.assigns]) await c.load(); return this; }

  // --- admin: tashkilotlar va litsenziya ---
  createOrg(name: unknown, licenseUntil: unknown, seats: unknown, contact?: unknown): { ok: true; org: Org } | { ok: false; error: EduErr } {
    const n = clean(name, 120); if (n.length < 2) return { ok: false, error: "bad_name" };
    if (!Number.isFinite(licenseUntil) || (licenseUntil as number) < 0) return { ok: false, error: "bad_field" };
    if (seats !== null && seats !== undefined && !(Number.isInteger(seats) && (seats as number) > 0 && (seats as number) <= 100_000)) return { ok: false, error: "bad_field" };
    const org: Org = { id: randomBytes(6).toString("hex"), name: n, contact: clean(contact, 200) || undefined, licenseUntil: licenseUntil as number, seats: (seats ?? null) as number | null, active: true, createdAt: this.now() };
    this.orgs.set(org.id, org); return { ok: true, org };
  }
  updateOrg(id: string, p: { licenseUntil?: unknown; seats?: unknown; active?: unknown; name?: unknown }): { ok: true; org: Org } | { ok: false; error: EduErr } {
    const o = this.orgs.get(id); if (!o) return { ok: false, error: "not_found" }; const n = { ...o };
    if (p.licenseUntil !== undefined) { if (!Number.isFinite(p.licenseUntil)) return { ok: false, error: "bad_field" }; n.licenseUntil = p.licenseUntil as number; }
    if (p.seats !== undefined) { if (p.seats !== null && !(Number.isInteger(p.seats) && (p.seats as number) > 0)) return { ok: false, error: "bad_field" }; n.seats = p.seats as number | null; }
    if (p.active !== undefined) n.active = !!p.active; if (p.name !== undefined) { const s = clean(p.name, 120); if (s.length < 2) return { ok: false, error: "bad_name" }; n.name = s; }
    this.orgs.set(id, n); return { ok: true, org: n };
  }
  licenseActive(o: Org | undefined) { return !!o && o.active && o.licenseUntil > this.now(); }
  /** O'qituvchi taklif kodi (bir marta, 14 kun). */
  invite(orgId: string): { ok: true; invite: Invite } | { ok: false; error: EduErr } {
    if (!this.orgs.get(orgId)) return { ok: false, error: "not_found" };
    const i: Invite = { code: code(8), orgId, expiresAt: this.now() + 14 * 86_400_000 }; this.invites.set(i.code, i); return { ok: true, invite: i };
  }
  redeem(userId: string, c: unknown): { ok: true; org: Org } | { ok: false; error: EduErr } {
    const i = typeof c === "string" ? this.invites.get(c.trim().toUpperCase()) : undefined; if (!i) return { ok: false, error: "bad_code" };
    if (i.usedBy) return { ok: false, error: "used" }; if (i.expiresAt < this.now()) return { ok: false, error: "expired" };
    if (this.teachers.get(userId)) return { ok: false, error: "already_teacher" };
    const org = this.orgs.get(i.orgId); if (!org) return { ok: false, error: "not_found" };
    this.invites.set(i.code, { ...i, usedBy: userId }); this.teachers.set(userId, { userId, orgId: org.id, addedAt: this.now() }); return { ok: true, org };
  }
  removeTeacher(userId: string) { this.teachers.delete(userId); }
  teacherCtx(userId: string): { teacher: Teacher; org: Org; active: boolean } | null { const t = this.teachers.get(userId); const o = t && this.orgs.get(t.orgId); return t && o ? { teacher: t, org: o, active: this.licenseActive(o) } : null; }

  // --- sinflar ---
  private seatsUsed(orgId: string) { return new Set(this.classes.values().filter((k) => k.orgId === orgId && !k.archived).flatMap((k) => k.students.map((s) => s.userId))).size; }
  createClass(teacherId: string, name: unknown): { ok: true; klass: Klass } | { ok: false; error: EduErr } {
    const c = this.teacherCtx(teacherId); if (!c || !c.active) return { ok: false, error: "no_license" };
    const n = clean(name, 60); if (n.length < 2) return { ok: false, error: "bad_name" };
    if (this.classes.values().filter((k) => k.teacherId === teacherId && !k.archived).length >= 30) return { ok: false, error: "limit" };
    const k: Klass = { id: randomBytes(6).toString("hex"), orgId: c.org.id, teacherId, name: n, joinCode: this.uniqueJoin(), students: [], createdAt: this.now() };
    this.classes.set(k.id, k); return { ok: true, klass: k };
  }
  private uniqueJoin() { for (;;) { const c = code(6); if (!this.classes.values().some((k) => k.joinCode === c)) return c; } }
  classOf(teacherId: string, id: string): Klass | undefined { const k = this.classes.get(id); return k && k.teacherId === teacherId && !k.archived ? k : undefined; }
  classesOf(teacherId: string) { return this.classes.values().filter((k) => k.teacherId === teacherId && !k.archived).sort((a, b) => a.createdAt - b.createdAt); }
  rotateCode(teacherId: string, id: string) { const k = this.classOf(teacherId, id); if (!k) return undefined; return this.classes.set(id, { ...k, joinCode: this.uniqueJoin() }); }
  archive(teacherId: string, id: string) { const k = this.classOf(teacherId, id); if (!k) return false; this.classes.set(id, { ...k, archived: true }); return true; }
  /** O'quvchi kod bilan qo'shiladi. O'qituvchi litsenziyasi faol bo'lishi va o'rin yetishi shart. 16 yoshgacha — rozilik teacher tomonidan belgilanguncha `consent=false`. */
  join(userId: string, joinCode: unknown): { ok: true; klass: Klass; org: Org } | { ok: false; error: EduErr } {
    const k = typeof joinCode === "string" ? this.classes.values().find((x) => x.joinCode === joinCode.trim().toUpperCase() && !x.archived) : undefined; if (!k) return { ok: false, error: "bad_code" };
    const org = this.orgs.get(k.orgId); if (!org || !this.licenseActive(org)) return { ok: false, error: "no_license" };
    if (k.teacherId === userId) return { ok: false, error: "teacher_cannot_join" };
    if (k.students.some((s) => s.userId === userId)) return { ok: false, error: "already_member" };
    const inOrg = this.classes.values().some((x) => x.orgId === k.orgId && !x.archived && x.students.some((s) => s.userId === userId));
    if (org.seats !== null && !inOrg && this.seatsUsed(org.id) >= org.seats) return { ok: false, error: "seats_full" };
    const n = this.classes.set(k.id, { ...k, students: [...k.students, { userId, consent: false, joinedAt: this.now() }] }); return { ok: true, klass: n, org };
  }
  leave(userId: string, classId: string) { const k = this.classes.get(classId); if (!k || !k.students.some((s) => s.userId === userId)) return false; this.classes.set(classId, { ...k, students: k.students.filter((s) => s.userId !== userId) }); return true; }
  setConsent(teacherId: string, classId: string, userId: string, consent: boolean) { const k = this.classOf(teacherId, classId); if (!k || !k.students.some((s) => s.userId === userId)) return false; this.classes.set(k.id, { ...k, students: k.students.map((s) => (s.userId === userId ? { ...s, consent } : s)) }); return true; }
  removeStudent(teacherId: string, classId: string, userId: string) { const k = this.classOf(teacherId, classId); if (!k) return false; this.classes.set(k.id, { ...k, students: k.students.filter((s) => s.userId !== userId) }); return true; }
  classesAsStudent(userId: string) { return this.classes.values().filter((k) => !k.archived && k.students.some((s) => s.userId === userId)); }
  /** Sinf xonasiga kirish: o'qituvchi yoki sinf o'quvchisi. */
  canJoinRoom(classId: string, userId: string) { const k = this.classes.get(classId); return !!k && !k.archived && (k.teacherId === userId || k.students.some((s) => s.userId === userId)); }
  isTeacherActive(userId: string) { return !!this.teacherCtx(userId)?.active; }

  // --- topshiriqlar ---
  addAssignment(teacherId: string, classId: string, b: { title?: unknown; kind?: unknown; target?: unknown; due?: unknown }): { ok: true; a: Assignment } | { ok: false; error: EduErr } {
    const k = this.classOf(teacherId, classId); if (!k) return { ok: false, error: "not_found" };
    const title = clean(b.title, 120); if (title.length < 2) return { ok: false, error: "bad_name" };
    if (b.kind !== "games" && b.kind !== "wins" && b.kind !== "big") return { ok: false, error: "bad_field" };
    if (!(Number.isInteger(b.target) && (b.target as number) >= 1 && (b.target as number) <= 100)) return { ok: false, error: "bad_field" };
    if (b.due !== undefined && b.due !== null && !Number.isFinite(b.due)) return { ok: false, error: "bad_field" };
    if (this.assigns.values().filter((a) => a.classId === classId).length >= 50) return { ok: false, error: "limit" };
    const a: Assignment = { id: randomBytes(6).toString("hex"), classId, title, kind: b.kind, target: b.target as number, due: (b.due ?? undefined) as number | undefined, createdAt: this.now() }; this.assigns.set(a.id, a); return { ok: true, a };
  }
  removeAssignment(teacherId: string, classId: string, id: string) { if (!this.classOf(teacherId, classId)) return false; const a = this.assigns.get(id); if (!a || a.classId !== classId) return false; this.assigns.delete(id); return true; }
  assignmentsOf(classId: string) { return this.assigns.values().filter((a) => a.classId === classId).sort((a, b) => a.createdAt - b.createdAt); }

  /** Hisobot: faqat shu sinfning xonalarida o'ynalgan o'yinlar; rozilik berilmagan 16 yoshgacha o'quvchilar yashirin. */
  report(k: Klass, results: GameResult[], info: { nameOf: (id: string) => string | undefined; levelOf: (id: string) => number; ageOf: (id: string) => number | null }) {
    const mine = results.filter((r) => r.tag?.kind === "class" && r.tag.id === k.id);
    const rows = k.students.map((s) => {
      const age = info.ageOf(s.userId); const hidden = age !== null && age < MINOR_AGE && !s.consent;
      if (hidden) return { userId: s.userId, name: info.nameOf(s.userId) ?? "O'quvchi", hidden: true as const, consent: s.consent };
      const ps = mine.map((r) => r.players.find((p) => p.id === s.userId)).filter((p): p is NonNullable<typeof p> => !!p && !p.bot);
      const places = ps.map((p) => p.place).filter((x): x is number => typeof x === "number");
      return { userId: s.userId, name: info.nameOf(s.userId) ?? "O'quvchi", hidden: false as const, consent: s.consent, games: ps.length, wins: ps.filter((p) => p.won).length, big: ps.filter((p) => p.circle === "big").length,
        avgPlace: places.length ? Math.round((places.reduce((a, b) => a + b, 0) / places.length) * 10) / 10 : null, level: info.levelOf(s.userId), restarts: ps.reduce((a, p) => a + p.restarts, 0) };
    });
    const progress = this.assignmentsOf(k.id).map((a) => ({ ...a, done: rows.filter((r) => !r.hidden && (r as any)[a.kind === "games" ? "games" : a.kind === "wins" ? "wins" : "big"] >= a.target).length, total: rows.filter((r) => !r.hidden).length,
      students: rows.filter((r) => !r.hidden).map((r) => ({ userId: r.userId, value: (r as any)[a.kind === "games" ? "games" : a.kind === "wins" ? "wins" : "big"] as number })) }));
    return { students: rows, assignments: progress };
  }
  eraseUser(userId: string) {
    this.teachers.delete(userId);
    for (const k of this.classes.values()) if (k.students.some((s) => s.userId === userId)) this.classes.set(k.id, { ...k, students: k.students.filter((s) => s.userId !== userId) });
  }
}

/** CSV: formula (`=`, `+`, `-`, `@`) bilan boshlanadigan katak boshiga `'` qo'yiladi — jadval dasturida kod bajarilmasin. */
export const csvCell = (v: unknown) => { let s = v === null || v === undefined ? "" : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function reportCsv(rows: ReturnType<Edu["report"]>["students"]) {
  const head = ["O'quvchi", "O'yinlar", "G'alabalar", "Katta aylanaga chiqish", "O'rtacha o'rin", "Daraja", "Qayta boshlash"];
  return "﻿" + [head, ...rows.map((r) => (r.hidden ? [r.name, "rozilik kutilmoqda", "", "", "", "", ""] : [r.name, r.games, r.wins, r.big, r.avgPlace ?? "", r.level, r.restarts]))].map((l) => l.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
