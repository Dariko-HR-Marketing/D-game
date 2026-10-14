import { describe, it, expect } from "vitest";
import WebSocket from "ws";
import { buildApp } from "./app";

function client(port: number, token: string) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${token}`);
  const msgs: any[] = [];
  ws.on("message", (d) => msgs.push(JSON.parse(d.toString())));
  const open = new Promise((r) => ws.on("open", r));
  const until = async (f: (m: any) => boolean) => { for (let i = 0; i < 200; i++) { const m = msgs.find(f); if (m) return m; await new Promise((r) => setTimeout(r, 10)); } throw new Error("timeout"); };
  return { ws, open, msgs, until, send: (o: unknown) => ws.send(JSON.stringify(o)) };
}

describe("WebSocket e2e", () => {
  it("xona yaratish → qo'shilish → boshlash → harakat → tarqatish", async () => {
    const { app } = buildApp();
    await app.listen({ port: 0 });
    const port = (app.server.address() as any).port;
    const a = client(port, "alice"), b = client(port, "bob");
    await Promise.all([a.open, b.open]);
    a.send({ type: "create" });
    const created = await a.until((m) => m.type === "state");
    const code = created.room.code;
    b.send({ type: "join", code });
    await b.until((m) => m.type === "state" && m.room.members.length === 2);
    a.send({ type: "start" });
    const started = await b.until((m) => m.type === "state" && m.room.state);
    const first = started.room.state.players[started.room.state.turn % 2].id;
    const mover = first === "alice" ? a : b, other = first === "alice" ? b : a;
    other.send({ type: "act", seq: 0, action: { type: "roll" } });
    await other.until((m) => m.type === "error" && m.error === "not_member" || m.error === "not_your_turn");
    mover.send({ type: "act", seq: 0, action: { type: "roll" } });
    await b.until((m) => m.type === "state" && m.room.seq === 1);
    a.ws.close(); b.ws.close(); await app.close();
  });
  it("tokensiz ulanish rad etiladi", async () => {
    const { app } = buildApp(); await app.listen({ port: 0 });
    const port = (app.server.address() as any).port;
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const code = await new Promise((r) => ws.on("close", (c) => r(c)));
    expect(code).toBe(4401); await app.close();
  });
});
