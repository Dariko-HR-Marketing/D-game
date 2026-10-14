// Yuklama sinovi: ko'p xona × o'yinchi sun'iy WebSocket mijozlari. Server alohida jarayonda ishlaydi (`npx tsx src/main.ts`).
// Ishga tushirish: `pnpm loadtest -- --rooms 200 --players 4 --seconds 30 --think 150 [--url ws://127.0.0.1:3000] [--metrics-token tok]`
import WebSocket from "ws";

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const ROOMS = Number(arg("rooms", "50")), PLAYERS = Number(arg("players", "4")), SECONDS = Number(arg("seconds", "20")), THINK = Number(arg("think", "150"));
const URL = arg("url", "ws://127.0.0.1:3000"), TOKEN = arg("metrics-token", process.env.METRICS_TOKEN ?? "");
const HTTP = URL.replace(/^ws/, "http");

const lat: number[] = []; let actions = 0, errors: Record<string, number> = {}, bytes = 0, states = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const q = (a: number[], f: number) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };

class Client {
  ws!: WebSocket; room: any = null; sent = new Map<number, number>(); stopped = false; busy = false;
  constructor(public id: string) {}
  open() { return new Promise<void>((res, rej) => { this.ws = new WebSocket(`${URL}/ws?token=${this.id}`); this.ws.on("open", () => res()); this.ws.on("error", rej);
    this.ws.on("message", (d) => this.onMsg(d.toString())); }); }
  send(o: unknown) { this.ws.send(JSON.stringify(o)); }
  onMsg(raw: string) {
    bytes += raw.length; const m = JSON.parse(raw);
    if (m.type === "error") { errors[m.error] = (errors[m.error] ?? 0) + 1; this.busy = false; return; }
    states++; this.room = m.room;
    const t = this.sent.get(m.room.seq); // o'z harakatimizga javob (seq oshdi)
    for (const [s, t0] of this.sent) if (m.room.seq > s) { lat.push(performance.now() - t0); this.sent.delete(s); this.busy = false; }
    void t; this.maybeAct();
  }
  async maybeAct() {
    const st = this.room?.state; if (!st || st.winner || this.busy) return;
    if (st.players[st.turn % st.players.length].id !== this.id) return;
    this.busy = true; await sleep(THINK * (0.5 + Math.random())); if (this.stopped) return;
    const seq = this.room.seq; this.sent.set(seq, performance.now()); actions++;
    this.send({ type: "act", seq, action: this.room.pendingCard ? { type: "decide", accept: this.room.pendingCard.effect?.kind === "gain" } : { type: "roll" } });
  }
}

async function metrics() {
  if (!TOKEN) return null;
  const r = await fetch(`${HTTP}/metrics`, { headers: { authorization: `Bearer ${TOKEN}` } }); const t = await r.text();
  const g = (n: string) => Number(new RegExp(`^${n} (\\S+)`, "m").exec(t)?.[1] ?? NaN);
  return { rss: g("poyga_process_resident_bytes"), rooms: g("poyga_rooms_active"), sockets: g("poyga_ws_sockets"), p: t };
}

const t0 = performance.now(); const m0 = await metrics();
const groups: Client[][] = [];
for (let r = 0; r < ROOMS; r++) {
  const cs = Array.from({ length: PLAYERS }, (_, i) => new Client(`lt${process.pid}r${r}p${i}`)); groups.push(cs);
  await Promise.all(cs.map((c) => c.open()));
  cs[0].send({ type: "create" }); await new Promise<void>((res) => { const h = setInterval(() => { if (cs[0].room?.code) { clearInterval(h); res(); } }, 5); });
  for (const c of cs.slice(1)) c.send({ type: "join", code: cs[0].room.code });
  await new Promise<void>((res) => { const h = setInterval(() => { if (cs[0].room?.members.length === PLAYERS) { clearInterval(h); res(); } }, 5); });
  cs[0].send({ type: "start" });
}
const setup = (performance.now() - t0) / 1000;
await new Promise((r) => setTimeout(r, 500));
const startedActions = actions, startedAt = performance.now(); lat.length = 0; bytes = 0; states = 0;
await sleep(SECONDS * 1000);
const dur = (performance.now() - startedAt) / 1000; const m1 = await metrics();
for (const g of groups) for (const c of g) { c.stopped = true; c.ws.close(); }
const n = actions - startedActions;
console.log(JSON.stringify({
  rooms: ROOMS, playersPerRoom: PLAYERS, sockets: ROOMS * PLAYERS, setupSeconds: +setup.toFixed(1), measuredSeconds: +dur.toFixed(1), think: THINK,
  actionsPerSecond: +(n / dur).toFixed(1), roundTripMs: { p50: +q(lat, 0.5).toFixed(1), p95: +q(lat, 0.95).toFixed(1), p99: +q(lat, 0.99).toFixed(1), max: +Math.max(...lat).toFixed(1) },
  errors, outboundMBperSec: +(bytes / dur / 1e6).toFixed(2), stateMessages: states, avgStateKB: +(bytes / Math.max(1, states) / 1024).toFixed(1),
  serverRssMB: m1 ? { before: Math.round(m0!.rss / 1e6), after: Math.round(m1.rss / 1e6) } : "METRICS_TOKEN yo'q", activeRooms: m1?.rooms,
}, null, 1));
process.exit(0);
