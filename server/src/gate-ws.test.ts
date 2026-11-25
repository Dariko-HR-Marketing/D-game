import { describe, it, expect } from "vitest";
import WebSocket from "ws";
import { buildApp } from "./app";
import { SubscriptionGate } from "./gate";

function client(port: number, token: string) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${token}`); const msgs: any[] = [];
  ws.on("message", (d) => msgs.push(JSON.parse(d.toString())));
  const open = new Promise((r) => ws.on("open", r));
  const until = async (f: (m: any) => boolean) => { for (let i = 0; i < 300; i++) { const m = msgs.find(f); if (m) return m; await new Promise((r) => setTimeout(r, 10)); } throw new Error("kutilgan xabar kelmadi"); };
  return { ws, open, until, send: (o: unknown) => ws.send(JSON.stringify(o)) };
}
const Y = new Date().getFullYear();
const cfg = { minAge: 16, ttlDays: 30, youtube: { channelId: "UC1", channelUrl: "https://youtube.com/c" } };

describe("obuna darvozasi: xona ochish/qo'shilish", () => {
  it("obunasiz kattalar to'siladi, obuna bo'lgach va 16 yoshgacha o'tadi; mavjud a'zo qayta kirishi mumkin", async () => {
    const gate = new SubscriptionGate(cfg, undefined, (async () => ({ ok: true, json: async () => ({ items: [{ id: 1 }] }) })) as any);
    const x = buildApp({ gate }); await x.app.listen({ port: 0 }); const port = (x.app.server.address() as any).port;
    x.profiles.put("alice", { name: "Alisa", color: 0, birthYear: 1990 } as any); x.profiles.put("kid", { name: "Bola", color: 1, birthYear: Y - 12 } as any);
    const a = client(port, "alice"), k = client(port, "kid"); await Promise.all([a.open, k.open]);
    expect((await x.app.inject({ url: "/auth/config" })).json().gate).toBe(true);
    a.send({ type: "create", visibility: "open", start: "host" });
    const e = await a.until((m) => m.type === "error"); expect(e).toMatchObject({ error: "subscription_required", detail: { missing: ["youtube"] } });
    k.send({ type: "create", visibility: "open", start: "host" }); await k.until((m) => m.type === "state"); // 16 yoshgacha o'tadi
    const st = await x.app.inject({ url: "/gate", headers: { authorization: "Bearer alice" } }); expect(st.json()).toMatchObject({ enabled: true, missing: ["youtube"] });
    const r = await x.app.inject({ method: "POST", url: "/gate/youtube/check", headers: { authorization: "Bearer alice" }, payload: { accessToken: "ya29.token-token" } }); expect(r.json()).toMatchObject({ ok: true, status: { missing: [] } });
    a.send({ type: "create", visibility: "open", start: "host" }); await a.until((m) => m.type === "state");
    for (const c of [a, k]) c.ws.close(); await x.app.close();
  });
  it("webhooklar: noto'g'ri sir/imzo rad etiladi", async () => {
    const gate = new SubscriptionGate({ ...cfg, telegram: { botToken: "T", channel: "@k", botUsername: "b", channelUrl: "", webhookSecret: "s" }, instagram: { accessToken: "A", appSecret: "x", verifyToken: "v", handle: "h" } });
    const x = buildApp({ gate }); await x.ready;
    const p = (url: string, headers: any, payload: any) => x.app.inject({ method: "POST", url, headers, payload: JSON.stringify(payload) });
    expect((await p("/gate/telegram/webhook", { "content-type": "application/json" }, {})).statusCode).toBe(403);
    expect((await p("/gate/telegram/webhook", { "content-type": "application/json", "x-telegram-bot-api-secret-token": "s" }, {})).statusCode).toBe(200);
    expect((await p("/gate/instagram/webhook", { "content-type": "application/json", "x-hub-signature-256": "sha256=00" }, {})).statusCode).toBe(403);
    expect((await x.app.inject({ url: "/gate/instagram/webhook?hub.mode=subscribe&hub.verify_token=v&hub.challenge=123" })).body).toBe("123");
    expect((await x.app.inject({ url: "/gate/instagram/webhook?hub.mode=subscribe&hub.verify_token=bad&hub.challenge=123" })).statusCode).toBe(403);
    await x.app.close();
  });
});
