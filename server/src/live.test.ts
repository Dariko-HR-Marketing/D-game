import { describe, it, expect } from "vitest";
import { buildApp } from "./app";
import { currentPlayer, effectOf } from "@tajriba24/rules";
import { envAdminAuth } from "./admin";

const H = (t: string) => ({ authorization: `Bearer ${t}` });
const ADM = JSON.stringify({ AT: { id: "root", role: "administrator" }, NT: { id: "n", role: "analyst" }, ST: { id: "s", role: "support" } });

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

describe("jonli tahlil API (o'yin davomida)", () => {
  it("davom etayotgan o'yinda ham hammaning tahlili ko'rinadi; ismlar ID o'rniga; begona va kirmaganlarga ruxsat yo'q", async () => {
    const x = buildApp({ adminAuth: envAdminAuth(ADM) }); const { code } = await playRoom(x, 120);
    const res = await x.app.inject({ method: "GET", url: `/me/games/${code}/live`, headers: H("alice") }); expect(res.statusCode).toBe(200); const b = res.json();
    expect(b.players).toHaveLength(2); expect(b.players.map((p: any) => p.name).sort()).toEqual(["Alisa", "Bobur"]); expect(b.players.find((p: any) => p.isMe).name).toBe("Alisa");
    for (const p of b.players) { expect(p.series.length).toBeGreaterThan(0); expect(p.dupont).toBeDefined(); expect(p.level).toBeGreaterThanOrEqual(0); expect(Array.isArray(p.swot)).toBe(true); }
    expect(b.group.volume.length).toBeGreaterThan(0); expect(JSON.stringify(b)).not.toContain('"bob"'); expect(JSON.stringify(b)).not.toContain('"alice"');
    const rb = await x.app.inject({ method: "GET", url: `/me/games/${code}/live`, headers: H("bob") }).then((r) => r.json()); expect(rb.players.find((p: any) => p.isMe).name).toBe("Bobur");
    expect((await x.app.inject({ method: "GET", url: `/me/games/${code}/live`, headers: H("eve") })).statusCode).toBe(403);
    expect((await x.app.inject({ method: "GET", url: `/me/games/ZZZZZZ/live`, headers: H("alice") })).statusCode).toBe(404);
    expect((await x.app.inject({ method: "GET", url: `/me/games/${code}/live` })).statusCode).toBe(401);
  });
  it("jurnal o'zgarmaguncha xotiradan beriladi; yangi harakatdan keyin yangilanadi", async () => {
    const x = buildApp({ adminAuth: envAdminAuth(ADM) }); const { code, room } = await playRoom(x, 40);
    const a = await x.app.inject({ method: "GET", url: `/me/games/${code}/live`, headers: H("alice") }).then((r) => r.json()); const a2 = await x.app.inject({ method: "GET", url: `/me/games/${code}/live`, headers: H("alice") }).then((r) => r.json());
    expect(a2).toEqual(a);
    const me = currentPlayer(room.state!).id; if (!room.state!.pending) await x.rooms.act(code, me, { type: "roll", playerId: me }, room.seq);
    const b = await x.app.inject({ method: "GET", url: `/me/games/${code}/live`, headers: H("alice") }).then((r) => r.json()); expect(b.meta.turns).toBeGreaterThanOrEqual(a.meta.turns);
  });
});
