import { describe, it, expect } from "vitest";
import { buildApp } from "./app";

const PW = "Parol-12345"; const H = (t: string) => ({ authorization: `Bearer ${t}` });
async function setup() {
  const x = buildApp({});
  const tokOf = (l: string, r: string) => { x.accounts.create("boot", { login: l, name: "T " + l, role: r, password: PW }); const a = x.accounts.byLogin(l)!; x.accounts.accts.set(a.id, { ...a, mustChange: false }); return (x.accounts.login(l, PW, undefined) as any).token as string; };
  const A = tokOf("admin1", "administrator"), N = tokOf("analyst1", "analyst"), F = tokOf("fin1", "finance");
  const j = (m: any, url: string, tok = A, payload?: unknown) => x.app.inject({ method: m, url, headers: H(tok), payload: payload as any });
  return { x, A, N, F, j };
}
const P = (id: string, extra: object = {}) => ({ id, bot: false, circle: "small", restarts: 0, won: false, ...extra });

describe("chuqur analitika", () => {
  it("ushlab qolish, DAU/WAU/MAU, sifat ko'rsatkichlari, taqsimotlar, turlar bo'yicha; shaxssiz; tahlilchi ko'ra oladi, moliyachi ham (analytics.read)", async () => {
    const s = await setup(); const t = Date.now(), D = 86_400_000;
    s.x.adminState.users.set("old1", { id: "old1", firstSeen: t - 40 * D, lastSeen: t - 2 * D, banned: false }); s.x.adminState.users.set("old2", { id: "old2", firstSeen: t - 40 * D, lastSeen: t - 40 * D + 1000, banned: false }); s.x.adminState.users.set("new1", { id: "new1", firstSeen: t - 3600_000, lastSeen: t, banned: false });
    s.x.profiles.put("old1", { name: "Eski", color: 0, birthYear: 1990 });
    const g = (room: string, rounds: number, players: any[], extra: object = {}) => ({ room, finishedAt: t - 3600_000, durationMs: 25 * 60_000, rounds, winner: players[0].id, contentVersion: 1, players, ...extra }) as any;
    s.x.profiles.results.push(g("A1", 35, [P("old1", { circle: "big", won: true, assets: 4, quitJob: true }), P("b1", { bot: true })]), g("A2", 8, [P("old1", { left: true, unreliable: true, restarts: 2 }), P("new1")], { tag: { kind: "class", id: "k1" } }), g("A3", 70, [P("old1", { circle: "big" }), P("new1", { circle: "big" })], { finishedAt: t - 10 * D }));
    const r = (await s.j("GET", "/admin/analytics/overview?days=30", s.N)).json();
    expect(r.retention.find((x: any) => x.day === 30)).toMatchObject({ base: 2, kept: 1 }); expect(r.retention.find((x: any) => x.day === 1).base).toBe(2);
    expect(r.active).toMatchObject({ dau: 2, wau: 2, mau: 2 }); expect(r.quality.games).toBe(3); expect(r.quality.avgRounds).toBe(38); expect(r.quality.botShare).toBeCloseTo(1 / 6); expect(r.quality.unreliableShare).toBeGreaterThan(0);
    expect(r.rounds.find((x: any) => x.label === "30–39").n).toBe(1); expect(r.rounds.find((x: any) => x.label === "<10").n).toBe(1); expect(r.rounds.find((x: any) => x.label === "60+").n).toBe(1);
    expect(r.tags).toEqual({ normal: 2, class: 1, tournament: 0 }); expect(r.series.days).toHaveLength(30); expect(r.hours.reduce((a: number, b: number) => a + b, 0)).toBe(3); expect(r.ages.find((x: any) => x.label === "25–34") ?? r.ages.find((x: any) => x.label === "35–49")).toBeTruthy();
    expect(JSON.stringify(r)).not.toContain("Eski"); expect(JSON.stringify(r)).not.toContain("old1");
    expect((await s.j("GET", "/admin/analytics/overview", s.F)).statusCode).toBe(200);
    expect((await s.j("GET", "/admin/analytics/overview?days=1000")).json().days).toBe(90); // yuqori chegara
  });
});

describe("tizim salomatligi va audit qidiruvi", () => {
  it("salomatlik: davomiylik, xotira, baza, SMS (maskalangan), xatolar; faqat system.read", async () => {
    const s = await setup(); s.x.ops.logError("test", new Error("sinov xatosi")); await s.x.ops.wrapSms({ send: async () => {} }).send("+998901234567", "kod"); await s.x.ops.wrapSms({ send: async () => { throw new Error("x"); } }).send("+998907654321", "kod").catch(() => {});
    const h = (await s.j("GET", "/admin/system/health")).json(); expect(h.db).toMatchObject({ kind: "memory", ok: true }); expect(h.memory.rss).toBeGreaterThan(0); expect(h.sms.last24h).toEqual({ sent: 1, failed: 1 }); expect(h.errors[0].msg).toBe("sinov xatosi"); expect(h.errors1h).toBe(1);
    expect(JSON.stringify(h.sms)).not.toContain("901234567"); expect(h.sms.recent[0].to).toMatch(/•/); expect(h.flags.maintenance).toBe(false); expect(h.backup.configured).toBe(false);
    expect((await s.j("GET", "/admin/system/health", s.N)).statusCode).toBe(403); expect((await s.j("GET", "/admin/system/health", s.F)).statusCode).toBe(403);
    const dash = (await s.j("GET", "/admin/dashboard")).json(); expect(dash.attention.some((a: any) => a.to === "system")).toBe(true);
  });
  it("5xx javoblar va xona xatolari xatolar halqasiga tushadi", async () => {
    const s = await setup(); s.x.app.get("/boom", async () => { throw new Error("portladi"); }); await s.x.app.inject({ method: "GET", url: "/boom" });
    expect(s.x.ops.errors.some((e) => e.where.includes("/boom"))).toBe(true);
  });
  it("audit qidiruvi: amal, admin, matn, muvaffaqiyatsiz, sahifalash; faqat audit.read", async () => {
    const s = await setup(); await s.j("POST", "/admin/accounts", s.A, { login: "yangi1", name: "Yangi", role: "support", password: PW }); await s.j("POST", "/admin/users/yoq/ban", s.A, { reason: "sinov uchun" });
    const all = (await s.j("GET", "/admin/audit/search")).json(); expect(all.total).toBeGreaterThanOrEqual(2); expect(all.actions).toContain("admin.account.create");
    expect((await s.j("GET", "/admin/audit/search?action=admin.account")).json().total).toBe(1); expect((await s.j("GET", "/admin/audit/search?failed=1")).json().entries[0].action).toBe("user.ban:failed");
    expect((await s.j("GET", "/admin/audit/search?q=sinov")).json().total).toBe(1); expect((await s.j("GET", "/admin/audit/search?limit=1&offset=1")).json().entries).toHaveLength(1);
    expect((await s.j("GET", "/admin/audit/search", s.N)).statusCode).toBe(403);
  });
});
