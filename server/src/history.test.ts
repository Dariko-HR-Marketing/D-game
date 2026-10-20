import { describe, it, expect } from "vitest";
import { buildApp } from "./app";
import { currentPlayer, effectOf } from "@poyga/rules";

const H = (t: string) => ({ authorization: `Bearer ${t}` });

describe("o'yin tarixi", () => {
  it("har bir amal: katakdan-katakka, karta, qaror, pul o'zgarishi; ID lar ismga almashadi; faqat ishtirokchi", async () => {
    const x = buildApp();
    for (const id of ["alice", "bob"]) await x.app.inject({ method: "PUT", url: "/me/profile", headers: H(id), payload: { name: id === "alice" ? "Alisa" : "Bobur", color: 0, birthYear: 1990 } });
    const r = x.rooms.create("alice"); if (!r.ok) throw 0; x.rooms.join(r.code, "bob"); await x.rooms.start(r.code, "alice", 31, { dreams: false });
    const room = x.rooms.rooms.get(r.code)!;
    for (let i = 0; i < 60 && !room.state!.winner; i++) {
      const me = currentPlayer(room.state!).id;
      if (room.state!.pending) { const e = effectOf(room.ctx, room.state!.pending.cardId).effect; await x.rooms.act(r.code, me, { type: "decide", playerId: me, accept: e.kind === "gain" }, room.seq); }
      else await x.rooms.act(r.code, me, { type: "roll", playerId: me }, room.seq);
    }
    const res = await x.app.inject({ method: "GET", url: `/me/games/${r.code}/log`, headers: H("alice") });
    expect(res.statusCode).toBe(200); const h = res.json();
    expect(h.events.length).toBeGreaterThan(10);
    const rolls = h.events.filter((e: any) => e.type === "roll" && e.ok);
    expect(rolls.length).toBeGreaterThan(3);
    for (const e of rolls) { expect(e.move.die).toBeGreaterThanOrEqual(1); expect(e.move.cell.t).toBeTruthy(); expect(typeof e.move.from).toBe("number"); }
    expect(h.events.some((e: any) => e.card)).toBe(true);
    expect(h.events.every((e: any) => ["Siz", "Bobur"].includes(e.by))).toBe(true);
    expect(JSON.stringify(h)).not.toMatch(/\balice\b|\bbob\b/);
    for (const e of h.events) if (e.ok) expect(e.delta.cash).toBe(e.after.cash - e.before.cash);
    const csv = await x.app.inject({ method: "GET", url: `/me/games/${r.code}/log?format=csv`, headers: H("alice") });
    expect(csv.headers["content-type"]).toContain("text/csv"); expect(csv.body.split("\n").length).toBe(h.events.length + 1);
    expect((await x.app.inject({ method: "GET", url: `/me/games/${r.code}/log`, headers: H("eve") })).statusCode).toBe(403);
    expect((await x.app.inject({ method: "GET", url: `/me/games/ZZZZZZ/log`, headers: H("alice") })).statusCode).toBe(404);
  });
});
