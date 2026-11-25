import { describe, it, expect } from "vitest";
import { buildApp } from "./app";

const PW = "Parol-12345"; const H = (t: string) => ({ authorization: `Bearer ${t}` });
async function setup() {
  const x = buildApp({ webhookSecret: "wh" });
  x.accounts.create("boot", { login: "adm", name: "Admin Test", role: "administrator", password: PW }); const a = x.accounts.byLogin("adm")!; x.accounts.accts.set(a.id, { ...a, mustChange: false });
  const A = (x.accounts.login("adm", PW, undefined, { ip: "1.1.1.1", ua: "t" }) as any).token;
  return { x, j: (url: string) => x.app.inject({ method: "GET", url, headers: H(A) }).then((r) => r.json()) };
}
describe("admin: kontent analitikasi, kohortalar, ota-ona nazorati, panel", () => {
  it("kontent analitikasi: to'plamlar va sifat; kohortlar 8 hafta; ota-ona ro'yxati; foydalanuvchi hisoblagichlari; panel KPI", async () => {
    const s = await setup(); s.x.adminState.touch("u1", Date.now() - 20 * 86_400_000); s.x.adminState.touch("u1", Date.now()); s.x.adminState.touch("u2", Date.now());
    const c = await s.j("/admin/analytics/content"); expect(c.decks.length).toBe(7); expect(c.quality.total).toBe(630); expect(c.quality.published).toBeGreaterThan(0); expect(c.effects.length).toBeGreaterThan(0); expect(c.events.games).toBe(0);
    s.x.analysis.cardStats["Y206"] = { shown: 10, accepted: 3, skipped: 7 }; const c2 = await s.j("/admin/analytics/content"); expect(c2.mostShown[0]).toMatchObject({ id: "Y206", acceptRate: 30 }); expect(c2.leastAccepted[0].id).toBe("Y206");
    s.x.analysis.gameStats!.add({ moves: [{ player: "a", round: 12, fromCircle: "small", toCircle: "big", to: 3, cellType: "D" }, { player: "a", round: 13, fromCircle: "big", toCircle: "big", to: 7, cellType: "T" }], restarts: [{ player: "b", card: "Y206" }],
      players: [{ id: "a", bot: false, job: "Santexnik", restarts: 0, won: true, exited: true }, { id: "b", bot: false, job: "Kranchi", restarts: 1, won: false, exited: false }] });
    const e = (await s.j("/admin/analytics/content")).events; expect(e.games).toBe(1); expect(e.exit).toMatchObject({ n: 1, notExited: 1 }); expect(e.exit.byRound[0]).toEqual({ k: "10–14", n: 1 }); expect(e.bankrupt.byCard[0]).toMatchObject({ id: "Y206", n: 1 }); expect(e.cellsBig[0].cell).toBe(4); expect(e.jobs).toEqual([]);
    const k = await s.j("/admin/analytics/cohorts"); expect(k.cohorts.length).toBe(8); expect(k.cohorts.reduce((n: number, r: any) => n + r.size, 0)).toBe(2);
    const p = await s.j("/admin/parental"); expect(p.counts).toMatchObject({ pending: 0, approved: 0 }); expect(Array.isArray(p.rows)).toBe(true);
    const u = await s.j("/admin/users"); expect(u.counts).toMatchObject({ all: 2, online: 2, banned: 0 });
    const d = await s.j("/admin/dashboard"); expect(d.kpi).toMatchObject({ gamesToday: 0, ongoing: 0 }); expect(d.online24.values.length).toBe(24); expect(d.content.catalog).toBe(630); expect(Array.isArray(d.topCards)).toBe(true);
  });
});
