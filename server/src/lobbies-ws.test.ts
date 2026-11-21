import { describe, it, expect } from "vitest";
import WebSocket from "ws";
import { buildApp } from "./app";

function client(port: number, token: string) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${token}`); const msgs: any[] = [];
  ws.on("message", (d) => msgs.push(JSON.parse(d.toString())));
  const open = new Promise((r) => ws.on("open", r));
  const until = async (f: (m: any) => boolean, from = 0) => { for (let i = 0; i < 300; i++) { const m = msgs.slice(from).find(f); if (m) return m; await new Promise((r) => setTimeout(r, 10)); } throw new Error("timeout"); };
  return { ws, open, msgs, until, send: (o: unknown) => ws.send(JSON.stringify(o)) };
}
const Y = new Date().getFullYear();

describe("jonli «Ochiq o'yinlar» (WebSocket)", () => {
  it("obuna bo'lganga darrov jami sonlar, yangi ochiq xona esa qisqa kechikishdan keyin avtomatik keladi; obunadan chiqsa kelmaydi", async () => {
    const x = buildApp(); x.rooms.lobbyDebounceMs = 30; await x.app.listen({ port: 0 }); const port = (x.app.server.address() as any).port;
    for (const u of ["alice", "bob"]) x.profiles.put(u, { name: u === "alice" ? "Alisa" : "Bobur", color: 0, birthYear: 1990 } as any);
    const w = client(port, "watcher"), a = client(port, "alice"); await Promise.all([w.open, a.open]);
    w.send({ type: "lobbies", on: true }); const first = await w.until((m) => m.type === "lobbies");
    expect(first.rooms).toEqual([]); expect(first.stats).toEqual({ playing: { rooms: 0, players: 0 }, waiting: { rooms: 0, players: 0 } }); expect(first.online).toBeGreaterThanOrEqual(2);
    const n0 = w.msgs.length; a.send({ type: "create", players: 4, visibility: "open", start: "host" });
    const upd = await w.until((m) => m.type === "lobbies" && m.rooms.length === 1, n0); expect(upd.rooms[0]).toMatchObject({ host: "Alisa", locked: false, players: 1, seats: 4 }); expect(upd.stats.waiting).toEqual({ rooms: 1, players: 1 });
    w.send({ type: "lobbies", on: false }); const n1 = w.msgs.length; const b = client(port, "bob"); await b.open; b.send({ type: "create", visibility: "open", start: "host" });
    await new Promise((r) => setTimeout(r, 250)); expect(w.msgs.slice(n1).filter((m: any) => m.type === "lobbies").length).toBe(0);
    for (const c of [w, a, b]) c.ws.close(); await x.app.close();
  });
  it("16 yoshgacha hisob xonalar ro'yxatini ko'rmaydi (faqat jami sonlar); HTTP /rooms/open ham shunday", async () => {
    const x = buildApp(); x.rooms.lobbyDebounceMs = 30; await x.app.listen({ port: 0 }); const port = (x.app.server.address() as any).port;
    x.profiles.put("alice", { name: "Alisa", color: 0, birthYear: 1990 } as any); x.profiles.put("kid", { name: "Bola", color: 1, birthYear: Y - 12 } as any);
    const a = client(port, "alice"), k = client(port, "kid"); await Promise.all([a.open, k.open]);
    a.send({ type: "create", visibility: "open", start: "host" }); await a.until((m) => m.type === "state");
    k.send({ type: "lobbies", on: true }); const m = await k.until((q) => q.type === "lobbies"); expect(m.rooms).toEqual([]); expect(m.stats.waiting.rooms).toBe(1);
    const http = (u: string) => x.app.inject({ url: "/rooms/open", headers: { authorization: `Bearer ${u}` } }).then((r) => r.json());
    expect((await http("kid")).rooms).toEqual([]); const adult = await http("alice"); expect(adult.rooms.length).toBe(1); expect(adult.stats.waiting.rooms).toBe(1); expect(adult.playing).toEqual([]); expect(adult.online).toBeGreaterThanOrEqual(2);
    for (const c of [a, k]) c.ws.close(); await x.app.close();
  });
});
