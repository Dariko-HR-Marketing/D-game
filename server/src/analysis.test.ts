import { describe, it, expect } from "vitest";
import { buildApp } from "./app";
import { analyzeGame, currentPlayer, effectOf } from "@poyga/rules";

const H = (t: string) => ({ authorization: `Bearer ${t}` });
const ADM = JSON.stringify({ AT: { id: "root", role: "administrator" }, NT: { id: "n", role: "analyst" }, ST: { id: "s", role: "support" } });
import { envAdminAuth } from "./admin";

async function playRoom(x: ReturnType<typeof buildApp>, turns: number) {
  for (const id of ["alice", "bob"]) await x.app.inject({ method: "PUT", url: "/me/profile", headers: H(id), payload: { name: id === "alice" ? "Alisa" : "Bobur", color: 0, birthYear: 1990 } });
  const r = x.rooms.create("alice"); if (!r.ok) throw 0; x.rooms.join(r.code, "bob"); await x.rooms.start(r.code, "alice", 31, { dreams: false });
  const room = x.rooms.rooms.get(r.code)!;
  for (let i = 0; i < turns && !room.state!.winner; i++) {
    const me = currentPlayer(room.state!).id;
    if (room.state!.pending) { const e = effectOf(room.ctx, room.state!.pending.cardId).effect; await x.rooms.act(r.code, me, { type: "decide", playerId: me, accept: e.kind === "gain" }, room.seq); }
    else await x.rooms.act(r.code, me, { type: "roll", playerId: me }, room.seq);
  }
  return { code: r.code, room };
}

describe("o'yin tugagach hisobot API (har bir o'yinchi uchun)", () => {
  it("o'ziniki — batafsil, boshqalar — qisqa xulosa; ID lar ismga almashadi; ishtirokchi bo'lmaganga ruxsat yo'q", async () => {
    const x = buildApp({ adminAuth: envAdminAuth(ADM) }); const { code, room } = await playRoom(x, 160);
    room.state!.winner = room.state!.players[0].id; (x.rooms as any).finish(room);
    const res = await x.app.inject({ method: "GET", url: `/me/games/${code}/report`, headers: H("alice") }); expect(res.statusCode).toBe(200); const b = res.json();
    expect(b.me.name).toBe("Alisa"); expect(b.me.id).toBe("me"); expect(b.me.series.length).toBeGreaterThan(1); expect(Array.isArray(b.me.insights)).toBe(true); expect(Array.isArray(b.me.moments)).toBe(true);
    expect(b.others).toHaveLength(1); expect(b.others[0].name).toBe("Bobur"); expect(b.others[0].decisions).toBeDefined(); expect(b.others[0].insights).toBeUndefined(); expect(b.others[0].moments).toBeUndefined(); expect(b.others[0].assets).toEqual(expect.any(Number));
    expect(b.ranking).toHaveLength(2); expect(b.ranking).toContain("me"); expect(b.meta.winner === null || typeof b.meta.winner === "string").toBe(true);
    expect(JSON.stringify(b)).not.toContain("\"bob\""); expect(JSON.stringify(b)).not.toContain("\"alice\"");
    const rb = await x.app.inject({ method: "GET", url: `/me/games/${code}/report`, headers: H("bob") }).then((r) => r.json()); expect(rb.me.name).toBe("Bobur"); expect(rb.others[0].name).toBe("Alisa");
    expect(rb.me.rank + b.me.rank).toBe(3);
    expect((await x.app.inject({ method: "GET", url: `/me/games/${code}/report`, headers: H("eve") })).statusCode).toBe(403);
    expect((await x.app.inject({ method: "GET", url: `/me/games/ZZZZZZ/report`, headers: H("alice") })).statusCode).toBe(404);
    expect((await x.app.inject({ method: "GET", url: `/me/games/${code}/report` })).statusCode).toBe(401);
  });
  it("CSV: bo'limlar (summary, series, assets, moments, insights) va Excel uchun BOM", async () => {
    const x = buildApp({ adminAuth: envAdminAuth(ADM) }); const { code, room } = await playRoom(x, 100);
    room.state!.winner = room.state!.players[0].id; (x.rooms as any).finish(room);
    const res = await x.app.inject({ method: "GET", url: `/me/games/${code}/report?format=csv`, headers: H("alice") }); expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv"); expect(res.headers["content-disposition"]).toContain(`poyga-hisobot-${code}.csv`);
    const t = res.body; expect(t.charCodeAt(0)).toBe(0xfeff); expect(t).toContain("section,a,b"); expect(t).toContain("\r\nseries,0,"); expect(t).toContain("summary,o'yinchi,Alisa");
  });
});

describe("tahlil API", () => {
  it("jurnaldan qayta o'ynab holatni tiklaydi; ID lar ismga almashadi; ishtirokchi bo'lmaganga ruxsat yo'q", async () => {
    const x = buildApp({ adminAuth: envAdminAuth(ADM) }); const { code, room } = await playRoom(x, 80);
    const a = await x.analysis.analyze(code); expect(a!.state).toEqual(room.state);
    const res = await x.app.inject({ method: "GET", url: `/me/games/${code}/analysis`, headers: H("alice") });
    expect(res.statusCode).toBe(200); const body = res.json();
    expect(body.players.map((p: any) => p.id).sort()).toEqual(["Bobur", "Siz"]); expect(body.players.find((p: any) => p.isMe).id).toBe("Siz");
    expect(JSON.stringify(body)).not.toContain("bob\""); expect(body.players[0].series.length).toBeGreaterThan(1);
    expect((await x.app.inject({ method: "GET", url: `/me/games/${code}/analysis`, headers: H("eve") })).statusCode).toBe(403);
    expect((await x.app.inject({ method: "GET", url: `/me/games/ZZZZZZ/analysis`, headers: H("alice") })).statusCode).toBe(404);
    expect((await x.app.inject({ method: "GET", url: `/me/games/${code}/analysis` })).statusCode).toBe(401);
  });
  it("o'yin tugaganda karta statistikasi yig'iladi; admin analitik ko'radi, qo'llab-quvvatlash ko'rmaydi", async () => {
    const x = buildApp({ adminAuth: envAdminAuth(ADM) }); const { code, room } = await playRoom(x, 120);
    room.state!.winner = room.state!.players[0].id; (x.rooms as any).finish(room);
    await x.analysis.recordGame(code); await x.analysis.recordGame(code); // ikki marta chaqirilsa ham bir marta hisoblanadi
    const direct = (await x.analysis.analyze(code))!.analysis.cards;
    const total = Object.values(x.analysis.cardStats).reduce((t, c) => t + c.shown, 0);
    expect(total).toBe(Object.values(direct).reduce((t, c) => t + c.shown, 0));
    const r = await x.app.inject({ method: "GET", url: "/admin/analytics/cards", headers: H("NT") });
    expect(r.statusCode).toBe(200); expect(Array.isArray(r.json())).toBe(true);
    expect((await x.app.inject({ method: "GET", url: "/admin/analytics/cards", headers: H("ST") })).statusCode).toBe(403);
  });
});
