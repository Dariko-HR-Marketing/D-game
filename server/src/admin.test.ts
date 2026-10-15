import { describe, it, expect } from "vitest";
import { buildApp } from "./app";
import { envAdminAuth, PERMS, can } from "./admin";
import { loadContent } from "@poyga/content";
import { ContentRegistry } from "./registry";

const tokens = JSON.stringify({
  A: { id: "root", role: "administrator" }, E: { id: "ed", role: "content_editor" },
  S: { id: "sup", role: "support" }, N: { id: "ana", role: "analyst" },
});
const mk = () => { const x = buildApp({ adminAuth: envAdminAuth(tokens) }); return x; };
const call = (x: ReturnType<typeof mk>, method: string, url: string, tok?: string, payload?: unknown) =>
  x.app.inject({ method: method as any, url, headers: tok ? { authorization: `Bearer ${tok}` } : {}, payload: payload as any });

describe("RBAC (§12)", () => {
  it("tokensiz 401, noto'g'ri token 401", async () => {
    const x = mk();
    expect((await call(x, "GET", "/admin/audit")).statusCode).toBe(401);
    expect((await call(x, "GET", "/admin/audit", "zzz")).statusCode).toBe(401);
    expect((await call(x, "GET", "/admin/audit", "__proto__")).statusCode).toBe(401);
  });
  it("rol ruxsatlari: muharrir foydalanuvchini ko'ra olmaydi, qo'llab-quvvatlash kontentni o'zgartira olmaydi", async () => {
    const x = mk();
    expect((await call(x, "GET", "/admin/users", "E")).statusCode).toBe(403);
    expect((await call(x, "GET", "/admin/content/versions", "S")).statusCode).toBe(403);
    expect((await call(x, "GET", "/admin/analytics", "S")).statusCode).toBe(403);
    expect((await call(x, "GET", "/admin/audit", "S")).statusCode).toBe(403);
    expect((await call(x, "GET", "/admin/analytics", "N")).statusCode).toBe(200);
    expect((await call(x, "GET", "/admin/audit", "N")).statusCode).toBe(403);
    expect(can("analyst", "users.read")).toBe(false);
    expect(PERMS.administrator.length).toBeGreaterThanOrEqual(PERMS.support.length);
  });
});

describe("kontent versiyalari", () => {
  const bundle = () => JSON.parse(JSON.stringify(loadContent()));
  it("yaroqsiz kontent rad etiladi, yaroqlisi versiya bo'ladi va nashr qilinadi; audit yoziladi", async () => {
    const x = mk(); const dreams = bundle().dreams;
    const bad = await call(x, "POST", "/admin/content/dreams/versions", "E", { data: [{ name: "yo'q", price: 1 }], note: "x" });
    expect(bad.json().ok).toBe(false);
    dreams[0].price += 1;
    const ok = await call(x, "POST", "/admin/content/dreams/versions", "E", { data: dreams, note: "narx" });
    expect(ok.json()).toEqual({ ok: true, version: 2 });
    expect(x.registry.activeVersion).toBe(1); // nashr qilinmaguncha faol emas
    expect((await call(x, "POST", "/admin/content/versions/2/publish", "A")).json().ok).toBe(true);
    expect(x.registry.activeVersion).toBe(2);
    const audit = (await call(x, "GET", "/admin/audit", "A")).json();
    // rad etilgan urinish ham auditga yoziladi
    expect(audit.map((a: any) => a.action)).toEqual(["content.create_version", "content.create_version", "content.publish"]);
    expect(audit[0].admin).toBe("ed");
  });
  it("o'yin boshlanganda versiya qulflanadi: keyingi nashr eski o'yinga tegmaydi (§11)", async () => {
    const x = mk(); const price0 = x.registry.bundle()!.dreams[0].price;
    const r = x.rooms.create("a"); if (!r.ok) throw 0; x.rooms.join(r.code, "b");
    await x.rooms.start(r.code, "a", 1, { dreams: false });
    const dreams = bundle().dreams; dreams[0].price = price0 + 777;
    const v = x.registry.createVersion("dreams", dreams, "ed", "") as any; x.registry.publish(v.version);
    expect(x.rooms.rooms.get(r.code)!.contentVersion).toBe(1);
    expect(x.rooms.rooms.get(r.code)!.ctx.dreams[0].price).toBe(price0);
    const r2 = x.rooms.create("c"); if (!r2.ok) throw 0; x.rooms.join(r2.code, "d"); await x.rooms.start(r2.code, "c", 1, { dreams: false });
    expect(x.rooms.rooms.get(r2.code)!.ctx.dreams[0].price).toBe(price0 + 777);
  });
  it("ContentRegistry: sxema xatosi aniq xabar beradi", () => {
    const reg = new ContentRegistry(); const cards = bundle().cards; cards.xar[0].amount = "x";
    const r = reg.createVersion("cards", cards, "e", "");
    expect(r.ok).toBe(false); if (!r.ok) expect(r.problems.join()).toContain("xar");
  });
});

describe("foydalanuvchi, bloklash, shikoyat, jurnal, analitika", () => {
  it("bloklangan foydalanuvchi o'yindan chiqariladi va qayta ulana olmaydi", async () => {
    const x = mk(); x.adminState.touch("bad", 1);
    const r = x.rooms.create("bad"); if (!r.ok) throw 0; x.rooms.join(r.code, "good"); await x.rooms.start(r.code, "bad", 1, { dreams: false });
    expect((await call(x, "POST", "/admin/users/bad/ban", "S", { reason: "chat" })).json().ok).toBe(true);
    expect(x.rooms.rooms.get(r.code)!.members[0].bot).toBe(true);
    expect(x.adminState.isBanned("bad")).toBe(true);
    expect((await call(x, "GET", "/admin/users?q=ba", "S")).json().users[0].banned).toBe(true);
    expect((await call(x, "POST", "/admin/users/bad/unban", "S", { reason: "kechirildi" })).json().ok).toBe(true);
    expect(x.adminState.isBanned("bad")).toBe(false);
  });
  it("shikoyat: foydalanuvchi yuboradi, qo'llab-quvvatlash hal qiladi", async () => {
    const x = mk();
    expect((await x.app.inject({ method: "POST", url: "/complaints", payload: { text: "x" } })).statusCode).toBe(401);
    const c = await x.app.inject({ method: "POST", url: "/complaints", headers: { authorization: "Bearer u1" }, payload: { against: "u2", text: "haqorat" } });
    expect(c.json().id).toBe(1);
    expect((await x.app.inject({ method: "POST", url: "/complaints", headers: { authorization: "Bearer u1" }, payload: { text: "a".repeat(2001) } })).statusCode).toBe(400);
    expect((await call(x, "POST", "/admin/complaints/1/resolve", "S", { resolution: "ogohlantirildi" })).json().ok).toBe(true);
    expect((await call(x, "GET", "/admin/complaints", "S")).json()[0].status).toBe("resolved");
  });
  it("o'yin jurnali admin uchun ochiq; analitik rol shaxssiz ko'radi", async () => {
    const x = mk();
    const r = x.rooms.create("a"); if (!r.ok) throw 0; x.rooms.join(r.code, "b"); await x.rooms.start(r.code, "a", 3, { dreams: false });
    const first = x.rooms.rooms.get(r.code)!.state!.players[0].id;
    await x.rooms.act(r.code, first, { type: "roll", playerId: first }, 0);
    const j = (await call(x, "GET", `/admin/rooms/${r.code}/journal`, "S")).json(); expect(j).toHaveLength(1);
    expect((await call(x, "GET", `/admin/rooms/${r.code}/journal`, "N")).statusCode).toBe(403);
    const ana = (await call(x, "GET", "/admin/rooms", "N")).json()[0]; expect(ana.members).toBe(2);
    const sup = (await call(x, "GET", "/admin/rooms", "S")).json()[0]; expect(sup.members[0].userId).toBeTruthy();
    const a = (await call(x, "GET", "/admin/analytics", "N")).json(); expect(a.rooms).toBe(1); expect(a.started).toBe(1);
  });
});

describe("katak qoidalari admin orqali (versiyali, qulflanadigan)", () => {
  it("noto'g'ri qoida rad; to'g'risi versiya bo'ladi; yangi o'yin yangi qoidani oladi, eski o'yin eskisini saqlaydi", async () => {
    const x = mk(); const r0 = x.rooms.create("a"); if (!r0.ok) throw 0; x.rooms.join(r0.code, "b"); await x.rooms.start(r0.code, "a", 1, { dreams: false });
    const bad = await call(x, "POST", "/admin/content/cellRules/versions", "E", { data: { small: { K: { kind: "explode" } } }, note: "x" });
    expect(bad.json().ok).toBe(false);
    const ok = await call(x, "POST", "/admin/content/cellRules/versions", "E", { data: { small: { K: { kind: "restart" }, Q: { kind: "skipTurns", turns: 3 } }, big: { byType: {}, byIndex: {} } }, note: "Q = 3 navbat" });
    expect(ok.json()).toEqual({ ok: true, version: 2 });
    await call(x, "POST", "/admin/content/versions/2/publish", "A");
    const r1 = x.rooms.create("c"); if (!r1.ok) throw 0; x.rooms.join(r1.code, "d"); await x.rooms.start(r1.code, "c", 1, { dreams: false });
    expect(x.rooms.rooms.get(r1.code)!.ctx.cellRules?.small.Q).toEqual({ kind: "skipTurns", turns: 3 });
    expect(x.rooms.rooms.get(r0.code)!.ctx.cellRules?.small.Q).toEqual({ kind: "noSalary", months: 4 }); // boshlangan o'yin standart qoidada qulflangan (§11)
  });
});

describe("voronka (§12)", () => {
  it("ro'yxatdan o'tish → profil → o'yin → g'alaba, shaxssiz; faqat analitik roli", async () => {
    const x = mk(); x.profiles.put("a", { name: "Ali", color: 0, birthYear: 1990 });
    x.profiles.record({ room: "R", finishedAt: 1, durationMs: 1, rounds: 1, winner: "a", contentVersion: 1, players: [{ id: "a", bot: false, circle: "big", restarts: 0, won: true }, { id: "bot-1", bot: true, circle: "small", restarts: 0, won: false }] });
    x.adminState.touch("a", 1); x.adminState.touch("b", 1);
    const r = await x.app.inject({ url: "/admin/analytics/funnel", headers: { authorization: "Bearer N" } });
    expect(r.statusCode).toBe(200); expect(r.json()).toMatchObject({ registered: 2, withProfile: 1, playedFirstGame: 1, playedThreeOrMore: 0, wonAtLeastOnce: 1, gamesFinished: 1, winShare: 1 });
    expect(JSON.stringify(r.json())).not.toContain("Ali");
    expect((await x.app.inject({ url: "/admin/analytics/funnel", headers: { authorization: "Bearer E" } })).statusCode).toBe(403);
  });
});
