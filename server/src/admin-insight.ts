// Admin 5-bosqich: chuqur analitika (shaxssiz), tizim salomatligi, audit qidiruvi.
import { statSync } from "node:fs";
import type { FastifyInstance } from "fastify";
import type { AdminState, Guard } from "./admin";
import type { Commerce } from "./commerce";
import { dayKey, TZ_OFFSET, type Ops } from "./ops";
import type { ParentConsents } from "./parents";
import type { ProfileService } from "./profiles";
import type { RoomManager } from "./rooms";
import type { Store } from "./store";

export interface InsightDeps { state: AdminState; ops: Ops; profiles: ProfileService; commerce: Commerce; consents: ParentConsents; rooms: RoomManager; store: Store; sockets: () => number; now?: () => number }
const DAY = 86_400_000;
const hist = (vals: number[], edges: number[], labels: string[]) => { const out = labels.map((l) => ({ label: l, n: 0 })); for (const v of vals) { let i = edges.findIndex((e) => v < e); if (i < 0) i = edges.length; out[i].n++; } return out; };

export function registerAdminInsight(guard: Guard, app: FastifyInstance, d: InsightDeps) {
  const { state, profiles, ops } = d; const now = () => (d.now ?? Date.now)();
  app.get("/admin/analytics/overview", guard("analytics.read", (req) => {
    const t = now(); const days = Math.min(90, Math.max(7, Number((req.query as any).days) || 30)); const since = t - days * DAY;
    const users = [...state.users.values()]; const res = profiles.results.filter((r) => r.finishedAt >= since); const all = profiles.results;
    // ushlab qolish: ro'yxatdan o'tgandan N kun o'tgan foydalanuvchilar ichida oxirgi faolligi firstSeen + N kundan keyin bo'lganlar (taxminiy)
    const ret = [1, 7, 30].map((n) => { const base = users.filter((u) => t - u.firstSeen >= n * DAY); return { day: n, base: base.length, kept: base.filter((u) => u.lastSeen - u.firstSeen >= n * DAY).length }; });
    const humans = (r: (typeof all)[number]) => r.players.filter((p) => !p.bot); const uniq = (rs: typeof all) => new Set(rs.flatMap((r) => humans(r).map((p) => p.id))).size;
    const active = { dau: uniq(all.filter((r) => t - r.finishedAt < DAY)), wau: uniq(all.filter((r) => t - r.finishedAt < 7 * DAY)), mau: uniq(all.filter((r) => t - r.finishedAt < 30 * DAY)) };
    const dayKeys = Array.from({ length: days }, (_, i) => dayKey(t - (days - 1 - i) * DAY)); const reg = Object.fromEntries(dayKeys.map((k) => [k, 0])), played = Object.fromEntries(dayKeys.map((k) => [k, new Set<string>()])), games = Object.fromEntries(dayKeys.map((k) => [k, 0]));
    for (const u of users) { const k = dayKey(u.firstSeen); if (k in reg) reg[k]++; } for (const r of res) { const k = dayKey(r.finishedAt); if (k in games) { games[k]++; for (const p of humans(r)) played[k].add(p.id); } }
    const slots = res.reduce((n, r) => n + r.players.length, 0), botSlots = res.reduce((n, r) => n + r.players.filter((p) => p.bot).length, 0); const hp = res.flatMap(humans);
    const quality = { games: res.length, withWinner: res.filter((r) => r.winner).length, avgDurationSec: res.length ? Math.round(res.reduce((n, r) => n + r.durationMs, 0) / res.length / 1000) : 0, avgRounds: res.length ? Math.round(res.reduce((n, r) => n + r.rounds, 0) / res.length) : 0,
      botShare: slots ? botSlots / slots : 0, reachedBigShare: hp.length ? hp.filter((p) => p.circle === "big").length / hp.length : 0, quitJobShare: hp.length ? hp.filter((p) => p.quitJob).length / hp.length : 0, avgAssets: hp.length ? +(hp.reduce((n, p) => n + (p.assets ?? 0), 0) / hp.length).toFixed(1) : 0,
      avgRestarts: hp.length ? +(hp.reduce((n, p) => n + p.restarts, 0) / hp.length).toFixed(2) : 0, unreliableShare: hp.length ? hp.filter((p) => p.unreliable).length / hp.length : 0, leftShare: hp.length ? hp.filter((p) => p.left).length / hp.length : 0, avgAutos: hp.length ? +(hp.reduce((n, p) => n + (p.autos ?? 0), 0) / hp.length).toFixed(2) : 0 };
    const rounds = hist(res.map((r) => r.rounds), [10, 20, 30, 40, 60], ["<10", "10–19", "20–29", "30–39", "40–59", "60+"]);
    const durations = hist(res.map((r) => r.durationMs / 60_000), [10, 20, 40, 60, 90], ["<10 daq", "10–19", "20–39", "40–59", "60–89", "90+ daq"]);
    const hours = Array.from({ length: 24 }, () => 0); for (const r of res) hours[new Date(r.finishedAt + TZ_OFFSET).getUTCHours()]++;
    const year = new Date(t).getFullYear(); const ages = hist([...profiles.allProfiles()].map(([, p]) => year - p.birthYear), [12, 16, 18, 25, 35, 50], ["<12", "12–15", "16–17", "18–24", "25–34", "35–49", "50+"]);
    const levels = hist([...profiles.allProfiles()].map(([id]) => profiles.levelCached(id)), [2, 5, 11, 26, 41], ["1", "2–4", "5–10", "11–25", "26–40", "41–50"]); // XP darajasi
    const tags = { normal: res.filter((r) => !r.tag).length, class: res.filter((r) => r.tag?.kind === "class").length, tournament: res.filter((r) => r.tag?.kind === "tournament").length };
    const ents = d.commerce.ents.values(); const payers = new Set(d.commerce.orders.values().filter((o) => o.status === "paid" && o.amount > 0).map((o) => o.userId)).size;
    return { days, retention: ret, active, series: { days: dayKeys, registered: dayKeys.map((k) => reg[k]), dau: dayKeys.map((k) => played[k].size), games: dayKeys.map((k) => games[k]) }, quality, rounds, durations, hours, ages, levels, tags,
      commerce: { registered: users.length, payers, conversion: users.length ? payers / users.length : 0, plusActive: ents.filter((e) => e.plusUntil && e.plusUntil > t).length }, note: "Ushlab qolish va faol foydalanuvchilar — o'yin natijalari va oxirgi faollik asosida, taxminiy." };
  }));

  app.get("/admin/system/health", guard("system.read", async () => {
    const t = now(); const rs = [...d.rooms.rooms.values()]; const kind = d.store.constructor.name === "PgStore" ? "postgres" : "memory"; let db: { kind: string; ok: boolean; ms?: number } = { kind, ok: true };
    const ping = (d.store as unknown as { ping?: () => Promise<void> }).ping; if (ping) { const s0 = Date.now(); try { await ping.call(d.store); db = { kind, ok: true, ms: Date.now() - s0 }; } catch { db = { kind, ok: false }; } }
    const sms = ops.smsLog.filter((x) => t - x.at < DAY); const m = process.memoryUsage(); const cons = d.consents.reqs.values();
    let backup: { lastAt: number | null; configured: boolean } = { lastAt: null, configured: false }; const marker = process.env.BACKUP_MARKER; if (marker) { backup.configured = true; try { backup.lastAt = statSync(marker).mtimeMs; } catch { /* fayl yo'q */ } }
    return { at: t, uptimeSec: Math.round((t - ops.startedAt) / 1000), node: process.version, env: process.env.NODE_ENV ?? "development", memory: { rss: m.rss, heapUsed: m.heapUsed }, db, sockets: d.sockets(),
      rooms: { active: rs.filter((r) => r.state && !r.endedAt).length, lobby: rs.filter((r) => !r.state).length, ended: rs.filter((r) => r.endedAt).length }, online: rs.reduce((n, r) => n + r.members.filter((x) => !x.bot && x.online).length, 0),
      sms: { last24h: { sent: sms.filter((x) => x.ok).length, failed: sms.filter((x) => !x.ok).length }, recent: ops.smsLog.slice(-20).reverse() }, consents: { pending: cons.filter((c) => c.status === "pending" && c.expiresAt > t).length, expired: cons.filter((c) => c.status === "pending" && c.expiresAt <= t).length, approved: cons.filter((c) => c.status === "approved").length, rejected: cons.filter((c) => c.status === "rejected").length },
      errors: ops.errors.slice(-50).reverse(), errors1h: ops.errors.filter((e) => t - e.at < 3600_000).length, flags: ops.flags(), backup };
  }));

  /** Audit qidiruvi: admin, amal, matn, sana oralig'i; sahifalash. */
  app.get("/admin/audit/search", guard("audit.read", (req) => {
    const q = req.query as Record<string, string>; let rows = state.audit.slice().reverse(); const s = (q.q ?? "").toLowerCase();
    if (q.admin) rows = rows.filter((a) => a.admin === q.admin); if (q.action) rows = rows.filter((a) => a.action.startsWith(q.action)); if (q.failed === "1") rows = rows.filter((a) => a.action.endsWith(":failed"));
    if (q.from) { const f = Date.parse(q.from + "T00:00:00+05:00"); if (Number.isFinite(f)) rows = rows.filter((a) => a.at >= f); } if (q.to) { const x = Date.parse(q.to + "T23:59:59+05:00"); if (Number.isFinite(x)) rows = rows.filter((a) => a.at <= x); }
    if (s) rows = rows.filter((a) => a.action.toLowerCase().includes(s) || (a.target ?? "").toLowerCase().includes(s) || JSON.stringify(a.detail ?? "").toLowerCase().includes(s));
    const off = Math.max(0, Number(q.offset) || 0), lim = Math.min(1000, Math.max(1, Number(q.limit) || 50));
    return { total: rows.length, entries: rows.slice(off, off + lim), actions: [...new Set(state.audit.map((a) => a.action.replace(/:failed$/, "")))].sort() };
  }));
}
