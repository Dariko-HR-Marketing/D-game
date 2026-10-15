// Admin yordamchi ma'lumotlari: ban muddati, shikoyat ish jarayoni, kontent ko'rib chiqish holati, funksiya bayroqlari, e'lonlar,
// sovrinlar jurnali, sozlama tarixi, to'lov xabarlari va xatolar halqasi. Hammasi `docs` jadvalida (Collection).
import type { SmsSender } from "./auth";
import { Collection, type DocStore } from "./docs";
import { WriteQueue } from "./persist";

export const TZ_OFFSET = 5 * 3600_000; // O'zbekiston (UTC+5): kunlik hisobotlar mahalliy kun bo'yicha
export const dayKey = (t: number) => new Date(t + TZ_OFFSET).toISOString().slice(0, 10);
export const lastDays = (n: number, now: number) => Array.from({ length: n }, (_, i) => dayKey(now - (n - 1 - i) * 86_400_000));

export interface BanMeta { id: string; until?: number; by: string; at: number; reason: string }
export type CStatus = "new" | "in_progress" | "resolved" | "rejected";
export interface CMeta { id: string; status: CStatus; category: "player" | "payment" | "technical" | "other"; assignee?: string; notes: { at: number; by: string; text: string }[]; updatedAt: number }
export interface Review { version: number; status: "draft" | "submitted" | "rejected"; by?: string; comment?: string; at: number }
export interface Flags { maintenance: boolean; maintenanceText: string; roomsPaused: boolean; salesPaused: boolean; tournamentsPaused: boolean }
export const DEFAULT_FLAGS: Flags = { maintenance: false, maintenanceText: "", roomsPaused: false, salesPaused: false, tournamentsPaused: false };
export interface Announcement { id: string; text: string; kind: "info" | "warn"; audience: "all" | "class" | "tournament"; ref?: string; from: number; until: number; active: boolean; by: string; createdAt: number }
export interface Prize { id: string; tournamentId: string; userId: string; prize: string; status: "pending" | "given"; by: string; at: number }
export interface CfgLog { id: string; at: number; admin: string; what: string; before: unknown; after: unknown }
export interface PayEvt { id: string; at: number; orderId: string; amount: number; ok: boolean; error?: string }
export interface SmsRec { at: number; ok: boolean; to: string }

export class Ops {
  readonly queue = new WriteQueue();
  readonly bans: Collection<BanMeta>; readonly cmeta: Collection<CMeta>; readonly reviews: Collection<Review>; readonly flagsC: Collection<Flags>; readonly anns: Collection<Announcement>;
  readonly prizes: Collection<Prize>; readonly cfglog: Collection<CfgLog>; readonly payevt: Collection<PayEvt>; readonly cleared: Collection<{ id: string; by: string; at: number }>;
  errors: { at: number; where: string; msg: string }[] = []; smsLog: SmsRec[] = []; readonly startedAt = Date.now();
  constructor(store?: DocStore, private now: () => number = Date.now) {
    const c = <T>(k: string) => new Collection<T>(k, store, this.queue);
    this.bans = c("ban"); this.cmeta = c("cmeta"); this.reviews = c("review"); this.flagsC = c("flags"); this.anns = c("ann"); this.prizes = c("prize"); this.cfglog = c("cfglog"); this.payevt = c("payevt"); this.cleared = c("uncl");
  }
  async load() { for (const x of [this.bans, this.cmeta, this.reviews, this.flagsC, this.anns, this.prizes, this.cfglog, this.payevt, this.cleared]) await (x as Collection<unknown>).load(); return this; }
  flags(): Flags { return { ...DEFAULT_FLAGS, ...(this.flagsC.get("flags") ?? {}) }; }
  setFlags(p: Partial<Flags>, admin: string): Flags {
    const before = this.flags(), n = { ...before };
    for (const k of ["maintenance", "roomsPaused", "salesPaused", "tournamentsPaused"] as const) if (typeof p[k] === "boolean") n[k] = p[k]!;
    if (typeof p.maintenanceText === "string") n.maintenanceText = p.maintenanceText.replace(/[<>]/g, "").slice(0, 300);
    this.flagsC.set("flags", n); this.log(admin, "flags", before, n); return n;
  }
  log(admin: string, what: string, before: unknown, after: unknown) { const id = `${this.now()}-${Math.random().toString(36).slice(2, 6)}`; this.cfglog.set(id, { id, at: this.now(), admin, what, before, after }); }
  logError(where: string, e: unknown) { this.errors.push({ at: this.now(), where, msg: String((e as Error)?.message ?? e).slice(0, 300) }); if (this.errors.length > 200) this.errors.shift(); }
  payEvent(orderId: string, amount: number, ok: boolean, error?: string) { const id = `${this.now()}-${Math.random().toString(36).slice(2, 6)}`; this.payevt.set(id, { id, at: this.now(), orderId, amount, ok, error }); const all = this.payevt.values(); if (all.length > 1000) for (const x of all.sort((a, b) => a.at - b.at).slice(0, all.length - 1000)) this.payevt.delete(x.id); }
  /** SMS yuboruvchini hisoblovchi o'rama: muvaffaqiyat/xato admin panelda ko'rinadi (raqam maskalanadi). */
  wrapSms(inner: SmsSender): SmsSender {
    return { send: async (phone: string, text: string) => { const to = phone.replace(/\d(?=\d{3})/g, "•"); try { await inner.send(phone, text); this.smsLog.push({ at: this.now(), ok: true, to }); } catch (e) { this.smsLog.push({ at: this.now(), ok: false, to }); throw e; } finally { if (this.smsLog.length > 500) this.smsLog.shift(); } } };
  }
  announcementsFor(ctx: { classIds: string[]; tournamentIds: string[] }): Announcement[] {
    const t = this.now(); return this.anns.values().filter((a) => a.active && a.from <= t && a.until > t && (a.audience === "all" || (a.audience === "class" && !!a.ref && ctx.classIds.includes(a.ref)) || (a.audience === "tournament" && !!a.ref && ctx.tournamentIds.includes(a.ref)))).sort((a, b) => b.createdAt - a.createdAt);
  }
}
