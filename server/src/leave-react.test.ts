import { describe, it, expect } from "vitest";
import WebSocket from "ws";
import { buildApp } from "./app";
import { MemoryStore } from "./store";
import { ContentRegistry } from "./registry";
import { RoomManager, REACTIONS, Clock } from "./rooms";

class FakeClock implements Clock {
  t = 0; now() { return this.t; } setTimeout(_f: () => void, _ms: number) { return 0; } clearTimeout() {}
}
const setup = async () => {
  const store = new MemoryStore(); const rm = new RoomManager(new ContentRegistry(), store, new FakeClock(), (() => { let k = 0; return () => (k++ * 0.37) % 1; })());
  const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b"); rm.join(r.code, "c"); await rm.start(r.code, "a", 4);
  return { rm, code: r.code, store };
};

describe("ixtiyoriy chiqish qaytarilmaydi (§6.3)", () => {
  it("chiqqan o'yinchi qayta qo'shila olmaydi va qayta ulana olmaydi; o'rnini bot egallaydi; boshqa xonaga o'ta oladi", async () => {
    const { rm, code } = await setup();
    rm.leave(code, "b");
    const m = rm.rooms.get(code)!.members.find((x) => x.userId === "b")!; expect(m).toMatchObject({ bot: true, left: true, online: false });
    expect(rm.join(code, "b")).toEqual({ ok: false, error: "left_game" });
    expect(rm.reconnect(code, "b")).toEqual({ ok: false, error: "left_game" });
    expect(rm.create("b").ok).toBe(true); // hisob bo'shagan
    expect((await rm.act(code, "b", { type: "roll", playerId: "b" }, 0)).ok).toBe(false); // endi bot — odam sifatida harakat qila olmaydi? (a'zo, lekin navbat egasi emas)
  });
  it("oflayn bo'lish (uzilish) chiqish emas: qayta ulanish mumkin", async () => {
    const { rm, code } = await setup(); rm.disconnect(code, "b"); expect(rm.reconnect(code, "b").ok).toBe(true);
  });
  it("chiqish holati saqlanadi va qayta ishga tushganda ham tiklanadi", async () => {
    const { rm, code, store } = await setup(); rm.leave(code, "b");
    await rm.act(code, "a", { type: "roll", playerId: "a" }, rm.rooms.get(code)!.seq).catch(() => {}); // snapshot+meta yangilansin
    const rm2 = new RoomManager(new ContentRegistry(), store, new FakeClock()); expect(await rm2.restore()).toBe(1);
    expect(rm2.rooms.get(code)!.members.find((x) => x.userId === "b")).toMatchObject({ left: true });
    expect(rm2.reconnect(code, "b")).toEqual({ ok: false, error: "left_game" });
  });
});

describe("reaksiyalar (§6.7)", () => {
  it("a'zo ruxsat etilgan reaksiyani hammaga yuboradi; holat o'zgarmaydi", async () => {
    const { rm, code } = await setup(); const got: any[] = []; rm.on((c, ev) => { if (ev.type === "reaction") got.push(ev); });
    const seq = rm.rooms.get(code)!.seq;
    expect(rm.react(code, "a", REACTIONS[0])).toEqual({ ok: true });
    expect(got).toEqual([{ type: "reaction", from: "a", emoji: "👍", at: 0 }]); expect(rm.rooms.get(code)!.seq).toBe(seq);
  });
  it("noma'lum emoji, a'zo bo'lmagan va chiqib ketgan rad etiladi", async () => {
    const { rm, code } = await setup();
    expect(rm.react(code, "a", "💣")).toEqual({ ok: false, error: "bad_reaction" });
    expect(rm.react(code, "<script>", "👍")).toEqual({ ok: false, error: "not_member" });
    expect(rm.react("ZZZZZZ", "a", "👍")).toEqual({ ok: false, error: "not_member" });
    rm.leave(code, "c"); expect(rm.react(code, "c", "👍")).toEqual({ ok: false, error: "not_member" });
  });
  it("WebSocket: xonadagilarga yetib boradi, tezlik cheklanadi, 16 yoshgacha ham ochiq", async () => {
    const x = buildApp(); await x.app.listen({ port: 0 }); const port = (x.app.server.address() as any).port;
    const yr = new Date().getFullYear();
    await x.app.inject({ method: "PUT", url: "/me/profile", headers: { authorization: "Bearer kid" }, payload: { name: "Bola", color: 0, birthYear: yr - 12 } });
    const open = async (id: string) => { const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${id}`); const msgs: any[] = []; ws.on("message", (d) => msgs.push(JSON.parse(d.toString()))); await new Promise((r) => ws.on("open", r)); return { ws, msgs }; };
    const a = await open("kid"), b = await open("u2");
    a.ws.send(JSON.stringify({ type: "create" })); await new Promise((r) => setTimeout(r, 100));
    const code = a.msgs.find((m) => m.type === "state").room.code; b.ws.send(JSON.stringify({ type: "join", code })); await new Promise((r) => setTimeout(r, 100));
    a.ws.send(JSON.stringify({ type: "react", emoji: "👏" })); await new Promise((r) => setTimeout(r, 100));
    expect(b.msgs.find((m) => m.type === "reaction")).toMatchObject({ from: "kid", emoji: "👏" });
    for (let i = 0; i < 8; i++) a.ws.send(JSON.stringify({ type: "react", emoji: "😂" })); await new Promise((r) => setTimeout(r, 150));
    expect(a.msgs.filter((m) => m.error === "rate_limited").length).toBeGreaterThan(0);
    a.ws.send(JSON.stringify({ type: "react", emoji: "x".repeat(20) })); await new Promise((r) => setTimeout(r, 80));
    expect(a.msgs.at(-1).error).toBe("bad_message"); // sxema uzun satrni rad etadi
    a.ws.close(); b.ws.close(); await x.app.close();
  });
});

import { ProfileService } from "./profiles";
describe("chiqqan o'yinchi natijasi statistika va reytingga kirmaydi", () => {
  it("g'alaba ham hisoblanmaydi (o'rnini bot o'ynagan); qolganlariniki hisoblanadi", () => {
    const s = new ProfileService(undefined, () => 2026, () => 1000);
    for (const [id, n] of [["a", "Ali"], ["b", "Bobur"]]) s.put(id, { name: n, color: 0, birthYear: 1990 });
    const st: any = { round: 9, winner: "b", bots: [], players: [{ id: "a", circle: "small", restarts: 0, won: false }, { id: "b", circle: "big", restarts: 0, won: true }] };
    s.recordFromGame("R", st, 0, 1, ["b"]); // b o'yindan chiqqan, lekin uning o'rnida bot yutgan
    expect(s.stats("b")).toMatchObject({ games: 0, wins: 0 }); expect(s.history("b")).toHaveLength(0);
    expect(s.stats("a")).toMatchObject({ games: 1, wins: 0 }); expect(s.leaderboard().map((x) => x.name)).toEqual(["Ali"]);
  });
});
