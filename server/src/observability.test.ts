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
    const r = x.rooms.create("a"); if (!r.ok) throw 0; x.rooms.join(r.code, "b"); await x.rooms.start(r.code, "a", 5);
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
  it("ichki xato (saqlagich yiqildi) jarayonni qulatmaydi: 'internal' xabari, ulanish ishlashda qoladi", async () => {
    const st = new MemoryStore(); const { x, port } = await start({ store: st, metricsToken: "T" });
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=u1`); const got: any[] = []; ws.on("message", (d) => got.push(JSON.parse(d.toString()))); await new Promise((r) => ws.on("open", r));
    ws.send(JSON.stringify({ type: "create" })); await new Promise((r) => setTimeout(r, 100)); ws.send(JSON.stringify({ type: "start" })); await new Promise((r) => setTimeout(r, 100));
    st.append = async () => { throw new Error("disk full"); };
    const room = x.rooms.rooms.values().next().value!;
    expect(room.state!.players[0].id).toBe("u1"); // xona egasi birinchi yuradi
    ws.send(JSON.stringify({ type: "act", seq: 0, action: { type: "roll" } })); await new Promise((r) => setTimeout(r, 150));
    expect(got.some((g) => g.error === "internal")).toBe(true);
    ws.send(JSON.stringify({ type: "leave" })); ws.send("garbage"); await new Promise((r) => setTimeout(r, 100));
    expect(got.at(-1).error).toBe("bad_json"); // ulanish tirik
    const met = await x.app.inject({ url: "/metrics", headers: { authorization: "Bearer T" } }); expect(met.statusCode).toBe(200);
    ws.close(); await x.app.close();
  });
});
