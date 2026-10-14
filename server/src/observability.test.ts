import { describe, it, expect } from "vitest";
import WebSocket from "ws";
import { buildApp } from "./app";
import { MemoryStore } from "./store";
import { Metrics } from "./metrics";

describe("Metrics (Prometheus matni)", () => {
  it("hisoblagich, o'lchagich, gistogramma to'g'ri render qilinadi; yorliq qiymatlari tozalanadi", () => {
    const m = new Metrics(); const c = m.counter("t_total", "test"); c({ a: "x" }); c({ a: "x" }, 2); c({ a: 'q"\n' });
    m.gauge("t_gauge", "g", () => 7); const h = m.histogram("t_sec", "h", [0.1, 1]); h(0.05); h(0.5); h(5);
    const t = m.render();
    expect(t).toContain('t_total{a="x"} 3'); expect(t).toContain('t_total{a="q__"} 1'); expect(t).toContain("t_gauge 7");
    expect(t).toContain('t_sec_bucket{le="0.1"} 1'); expect(t).toContain('t_sec_bucket{le="1"} 2'); expect(t).toContain('t_sec_bucket{le="+Inf"} 3'); expect(t).toContain("t_sec_count 3");
  });
});

describe("/ready, /metrics", () => {
  it("/ready: saqlagich ishlasa 200, ishlamasa 503", async () => {
    const good = buildApp(); expect((await good.app.inject({ url: "/ready" })).statusCode).toBe(200);
    const bad = new MemoryStore(); bad.ping = async () => { throw new Error("db down"); };
    expect((await buildApp({ store: bad }).app.inject({ url: "/ready" })).statusCode).toBe(503);
  });
  it("/metrics: token sozlanmasa yo'q (404), noto'g'ri token 401, to'g'ri bo'lsa ko'rsatkichlar", async () => {
    expect((await buildApp().app.inject({ url: "/metrics" })).statusCode).toBe(404);
    const x = buildApp({ metricsToken: "S3CRET" });
    expect((await x.app.inject({ url: "/metrics", headers: { authorization: "Bearer nope" } })).statusCode).toBe(401);
    const r = x.rooms.create("a"); if (!r.ok) throw 0; x.rooms.join(r.code, "b"); await x.rooms.start(r.code, "a", 5, { dreams: false });
    const first = x.rooms.rooms.get(r.code)!.state!.players[0].id;
    await x.rooms.act(r.code, first, { type: "roll", playerId: first }, 0);
    await x.app.inject({ url: "/leaderboard" });
    const res = await x.app.inject({ url: "/metrics", headers: { authorization: "Bearer S3CRET" } });
    expect(res.statusCode).toBe(200); expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.body).toContain('poyga_actions_total{result="ok",type="roll"} 1'); expect(res.body).toContain('poyga_games_total{event="started"} 1');
    expect(res.body).toContain("poyga_rooms_active 1"); expect(res.body).toContain('poyga_http_requests_total{status="2xx"}'); expect(res.body).toContain("poyga_action_seconds_count");
  });
});

describe("jurnal maxfiyligi va chidamlilik", () => {
  const start = async (o: any) => { const x = buildApp(o); await x.app.listen({ port: 0 }); return { x, port: (x.app.server.address() as any).port as number }; };
  it("token va so'rov parametrlari jurnalga yozilmaydi", async () => {
    const lines: string[] = []; const { x, port } = await start({ logger: { stream: { write: (s: string) => lines.push(s) } } });
    await x.app.inject({ url: "/leaderboard?limit=5&token=SUPERSECRET123", headers: { authorization: "Bearer SUPERSECRET123" } });
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=SUPERSECRET123`); await new Promise((r) => ws.on("open", r)); ws.close();
    await new Promise((r) => setTimeout(r, 200)); await x.app.close();
    const log = lines.join("\n"); expect(log).toContain("/leaderboard"); expect(log).not.toContain("SUPERSECRET123"); expect(log).not.toContain("authorization");
    for (const l of lines) JSON.parse(l); // tuzilgan JSON
  });
  it("saqlagich yiqilsa o'yin to'xtamaydi: harakat qabul qilinadi, xato ko'rsatkichga tushadi, taymer davom etadi", async () => {
    const st = new MemoryStore(); const { x, port } = await start({ store: st, metricsToken: "T", logger: { stream: { write() {} } } });
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=u1`); const got: any[] = []; ws.on("message", (d) => got.push(JSON.parse(d.toString()))); await new Promise((r) => ws.on("open", r));
    ws.send(JSON.stringify({ type: "create" })); await new Promise((r) => setTimeout(r, 100)); ws.send(JSON.stringify({ type: "start" })); await new Promise((r) => setTimeout(r, 100));
    st.append = async () => { throw new Error("disk full"); }; st.saveSnapshot = async () => { throw new Error("disk full"); };
    const room = x.rooms.rooms.values().next().value!; const seq0 = room.seq;
    const free = [0, 1, 2, 3, 4, 5].find((i) => !room.state!.players.some((p) => p.dreamIdx === i))!;
    ws.send(JSON.stringify({ type: "act", seq: seq0, action: { type: "choose_dream", dreamIdx: free } })); await new Promise((r) => setTimeout(r, 200));
    expect(room.seq).toBeGreaterThan(seq0); expect(got.some((g) => g.error)).toBe(false); expect(room.timer).not.toBeNull(); // o'yin yuribdi va taymer o'rnatilgan
    const met = await x.app.inject({ url: "/metrics", headers: { authorization: "Bearer T" } }); expect(met.body).toContain('poyga_room_errors_total{where="persist"}');
    ws.close(); await x.app.close();
  });
  it("kutilmagan ichki xato jarayonni qulatmaydi: 'internal' xabari, ulanish ishlashda qoladi", async () => {
    const { x, port } = await start({ logger: { stream: { write() {} } } });
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=u1`); const got: any[] = []; ws.on("message", (d) => got.push(JSON.parse(d.toString()))); await new Promise((r) => ws.on("open", r));
    x.rooms.create = () => { throw new Error("boom"); };
    ws.send(JSON.stringify({ type: "create" })); await new Promise((r) => setTimeout(r, 150)); expect(got.some((g) => g.error === "internal")).toBe(true);
    ws.send("garbage"); await new Promise((r) => setTimeout(r, 100)); expect(got.at(-1).error).toBe("bad_json"); // ulanish tirik
    ws.close(); await x.app.close();
  });
});

describe("WebSocket ping (proxy uzib qo'ymasligi uchun)", () => {
  it("server davriy ping yuboradi; javob bermagan ulanish uziladi", async () => {
    process.env.WS_PING_MS = "60"; // buildApp o'qiydi
    try {
      const x = buildApp(); await x.app.listen({ port: 0 }); const port = (x.app.server.address() as any).port;
      const alive = new WebSocket(`ws://127.0.0.1:${port}/ws?token=a1`); let pings = 0; alive.on("ping", () => pings++); await new Promise((r) => alive.on("open", r));
      const dead = new WebSocket(`ws://127.0.0.1:${port}/ws?token=a2`); await new Promise((r) => dead.on("open", r));
      (dead as any)._receiver.removeAllListeners("ping"); dead.pong = () => {}; // pong yubormaydi
      (dead as any)._socket.removeAllListeners("data"); // hech narsani o'qimaydi → ping'ga javob yo'q
      const closed = new Promise<number>((r) => dead.on("close", (c) => r(c)));
      await new Promise((r) => setTimeout(r, 400));
      expect(pings).toBeGreaterThanOrEqual(3); expect(alive.readyState).toBe(WebSocket.OPEN);
      await Promise.race([closed, new Promise((r) => setTimeout(r, 600))]); expect(dead.readyState).not.toBe(WebSocket.OPEN);
      alive.close(); await x.app.close();
    } finally { delete process.env.WS_PING_MS; }
  });
});
