import { describe, it, expect } from "vitest";
import WebSocket from "ws";
import { buildApp } from "./app";
import { MemoryStore } from "./store";
import { ContentRegistry } from "./registry";
import { RoomManager } from "./rooms";
import { DEFAULT_ICE, iceServersFrom } from "./voice";
import { parseMessage } from "./protocol";

describe("ICE sozlamasi", () => {
  it("bo'sh yoki noto'g'ri bo'lsa standart; to'g'ri bo'lsa o'qiladi", () => {
    expect(iceServersFrom(undefined)).toEqual(DEFAULT_ICE); expect(iceServersFrom("")).toEqual(DEFAULT_ICE); expect(iceServersFrom("{xato")).toEqual(DEFAULT_ICE);
    expect(iceServersFrom('[{"urls":"http://evil"}]')).toEqual(DEFAULT_ICE); expect(iceServersFrom("[]")).toEqual(DEFAULT_ICE);
    const t = '[{"urls":["turn:turn.example.uz:3478","turns:turn.example.uz:5349"],"username":"u","credential":"p"},{"urls":"stun:stun.example.uz:3478"}]';
    expect(iceServersFrom(t)).toEqual(JSON.parse(t));
  });
});
describe("protokol: voice", () => {
  it("join/leave/signal; ortiqcha kalit, katta SDP va noto'g'ri tur rad", () => {
    expect(parseMessage(JSON.stringify({ type: "voice", op: "join" })).ok).toBe(true);
    expect(parseMessage(JSON.stringify({ type: "voice", op: "signal", to: "bob", sdp: { type: "offer", sdp: "v=0" } })).ok).toBe(true);
    expect(parseMessage(JSON.stringify({ type: "voice", op: "signal", to: "bob", candidate: { candidate: "candidate:1 1 udp 1 1.2.3.4 5 typ host", sdpMid: "0", sdpMLineIndex: 0 } })).ok).toBe(true);
    expect(parseMessage(JSON.stringify({ type: "voice", op: "nope" })).ok).toBe(false);
    expect(parseMessage(JSON.stringify({ type: "voice", op: "signal", to: "bob", sdp: { type: "offer", sdp: "x".repeat(30_001) } })).ok).toBe(false);
    expect(parseMessage(JSON.stringify({ type: "voice", op: "signal", to: "bob", sdp: { type: "rollback", sdp: "v=0" } })).ok).toBe(false);
  });
});

const mgr = (restricted: string[] = []) => {
  const rm = new RoomManager(new ContentRegistry(), new MemoryStore(), undefined, undefined, { chatRestricted: (ids) => ids.filter((i) => restricted.includes(i)) });
  const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b"); rm.join(r.code, "kid"); const ev: any[] = []; rm.on((c, e) => { if (e.type.startsWith("voice")) ev.push(e); });
  return { rm, code: r.code, ev };
};
describe("ovozli aloqa (xona)", () => {
  it("qo'shilish/chiqish: holat hammaga e'lon qilinadi", () => {
    const { rm, code, ev } = mgr(); expect(rm.voice(code, "a", "join").ok).toBe(true); expect(rm.voice(code, "b", "join").ok).toBe(true); rm.voice(code, "a", "leave");
    expect(ev.map((e) => e.members)).toEqual([["a"], ["a", "b"], ["b"]]);
  });
  it("16 yoshgacha va ota-ona o'chirgan bolaga yopiq; a'zo bo'lmagan qo'shila olmaydi", () => {
    const { rm, code } = mgr(["kid"]); expect(rm.voice(code, "kid", "join")).toMatchObject({ ok: false, error: "voice_restricted" }); expect(rm.voice(code, "zzz", "join")).toMatchObject({ ok: false, error: "not_member" });
  });
  it("signal faqat ikkala tomon ovozda bo'lsa va adresatga uzatiladi", () => {
    const { rm, code, ev } = mgr(); rm.voice(code, "a", "join"); ev.length = 0;
    expect(rm.voiceSignal(code, "a", "b", { sdp: { type: "offer", sdp: "v=0" } })).toMatchObject({ ok: false, error: "not_in_voice" }); // b ovozda emas
    rm.voice(code, "b", "join"); ev.length = 0; expect(rm.voiceSignal(code, "a", "b", { sdp: { type: "offer", sdp: "v=0" } }).ok).toBe(true);
    expect(ev).toEqual([{ type: "voice_signal", from: "a", to: "b", data: { sdp: { type: "offer", sdp: "v=0" } } }]);
    expect(rm.voiceSignal(code, "a", "a", { sdp: {} })).toMatchObject({ ok: false }); // o'ziga emas
  });
  it("uzilish va chiqish ovozdan ham chiqaradi", () => {
    const { rm, code } = mgr(); rm.voice(code, "a", "join"); rm.voice(code, "b", "join"); rm.disconnect(code, "a"); expect(rm.voiceMembers(code)).toEqual(["b"]);
    rm.leave(code, "b"); expect(rm.voiceMembers(code)).toEqual([]);
  });
});

function client(port: number, token: string) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${token}`); const msgs: any[] = [];
  ws.on("message", (d) => msgs.push(JSON.parse(d.toString()))); const open = new Promise((r) => ws.on("open", r));
  const until = async (f: (m: any) => boolean) => { for (let i = 0; i < 200; i++) { const m = msgs.find(f); if (m) return m; await new Promise((r) => setTimeout(r, 10)); } throw new Error("timeout"); };
  return { ws, open, msgs, until, send: (o: unknown) => ws.send(JSON.stringify(o)) };
}
describe("WebSocket: ovozli aloqa", () => {
  it("signal faqat adresatga boradi, uchinchi o'yinchi ko'rmaydi; /voice/config faqat kirganga", async () => {
    const { app } = buildApp(); await app.listen({ port: 0 }); const port = (app.server.address() as any).port;
    const a = client(port, "alice"), b = client(port, "bob"), c = client(port, "carol"); await Promise.all([a.open, b.open, c.open]);
    a.send({ type: "create" }); const code = (await a.until((m) => m.type === "state")).room.code;
    b.send({ type: "join", code }); c.send({ type: "join", code }); await b.until((m) => m.type === "voice_state"); await c.until((m) => m.type === "voice_state");
    for (const x of [a, b, c]) x.send({ type: "voice", op: "join" }); await c.until((m) => m.type === "voice_state" && m.members.length === 3);
    a.send({ type: "voice", op: "signal", to: "bob", sdp: { type: "offer", sdp: "v=0 test" } }); const got = await b.until((m) => m.type === "voice_signal");
    expect(got).toMatchObject({ from: "alice", to: "bob", data: { sdp: { type: "offer" } } }); await new Promise((r) => setTimeout(r, 150)); expect(c.msgs.some((m) => m.type === "voice_signal")).toBe(false);
    a.send({ type: "voice", op: "signal", to: "bob" }); await a.until((m) => m.type === "error" && m.error === "bad_voice");
    b.send({ type: "voice", op: "leave" }); await a.until((m) => m.type === "voice_state" && m.members.length === 2 && !m.members.includes("bob"));
    const ok = await app.inject({ method: "GET", url: "/voice/config", headers: { authorization: "Bearer alice" } }); expect(ok.statusCode).toBe(200); expect(Array.isArray(ok.json().iceServers)).toBe(true);
    expect((await app.inject({ method: "GET", url: "/voice/config" })).statusCode).toBe(401);
    await app.close();
  });
});
