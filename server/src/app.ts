import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { ContentRegistry } from "./registry";
import { ProfileService } from "./profiles";
import { AnalysisService, presentable } from "./analysis";
import { Metrics } from "./metrics";
import { WriteQueue } from "./persist";
import { parseMessage } from "./protocol";
import { Bucket, KeyedLimiter } from "./ratelimit";
import { AdminState, AdminAuth, envAdminAuth, registerAdmin } from "./admin";
import { MemoryStore, Store } from "./store";
import { RoomManager } from "./rooms";

/** Kirish xizmati (SMS/Google/Apple) keyin ulanadi: hozir `token` = userId (faqat dev/test). */
export type Authenticate = (token: string | undefined) => string | null;
export const devAuth: Authenticate = (t) => (t && /^[\w-]{1,64}$/.test(t) ? t : null);

export function buildApp(opts: { store?: Store; auth?: Authenticate; adminAuth?: AdminAuth; registry?: ContentRegistry; adminState?: AdminState; profiles?: ProfileService; analysis?: AnalysisService; logger?: boolean | { level?: string; stream?: { write(s: string): void } }; metricsToken?: string } = {}) {
  // Ishlab chiqarishda sinov autentifikatsiyasi taqiqlanadi: haqiqiy `auth` (SMS/Google/Apple) berilishi shart.
  if (process.env.NODE_ENV === "production" && !opts.auth) throw new Error("production: haqiqiy autentifikatsiya (opts.auth) kerak; devAuth o'chirilgan");
  // Tuzilgan JSON jurnal (§11). Maxfiylik: token va so'rov parametrlari (?token=…) jurnalga yozilmaydi, IP saqlanmaydi.
  const serializers = { req: (r: any) => ({ method: r.method, path: String(r.url).split("?")[0], id: r.id }), res: (r: any) => ({ status: r.statusCode }) };
  const logger = opts.logger ? { level: "info", ...(opts.logger === true ? {} : opts.logger), serializers } : false;
  const app = Fastify({ bodyLimit: 64 * 1024, logger });
  const m = new Metrics();
  const cHttp = m.counter("poyga_http_requests_total", "HTTP so'rovlari (holat kodi bo'yicha)");
  const cLimited = m.counter("poyga_rate_limited_total", "Tezlik cheklovi tufayli rad etilganlar");
  const cWs = m.counter("poyga_ws_connections_total", "WebSocket ulanishlari");
  const cErr = m.counter("poyga_room_errors_total", "Xona ichidagi xatolar (saqlash, taymer) — o'yin davom etadi");
  const cWsErr = m.counter("poyga_ws_errors_total", "Ichki xatolar (WebSocket)");
  const cActions = m.counter("poyga_actions_total", "O'yin harakatlari (tur va natija bo'yicha)");
  const cGames = m.counter("poyga_games_total", "O'yinlar (boshlandi/tugadi)");
  const hAction = m.histogram("poyga_action_seconds", "Harakatni dvigatel bilan hisoblash vaqti", [0.001, 0.005, 0.01, 0.05, 0.1, 0.5]);
  let openSockets = 0;
  const store: Store = opts.store ?? new MemoryStore();
  const auth = opts.auth ?? devAuth;
  const registry = opts.registry ?? new ContentRegistry();
  const adminState = opts.adminState ?? new AdminState();
  const profiles = opts.profiles ?? new ProfileService();
  const analysis = opts.analysis ?? new AnalysisService(store, registry, new WriteQueue());
  const rooms = new RoomManager(registry, store, undefined, undefined, {
    restricted: (ids) => profiles.restrictedOf(ids),               // §2.8: 16 yoshgacha — qarz/sheriklik yopiq
    profile: (id) => profiles.get(id),
    onStart: () => cGames({ event: "started" }),
    onAbandon: () => cGames({ event: "abandoned" }),
    onError: (where, e) => { cErr({ where }); app.log.error({ where, err: String((e as Error)?.message ?? e) }, "xona xatosi"); },
    onApply: (type, ok, ms, error) => { cActions({ type, result: ok ? "ok" : "rejected" }); hAction(ms / 1000, { type }); },
    onEnd: (code, r) => { cGames({ event: "finished" }); profiles.recordFromGame(code, r.state!, r.createdAt, r.contentVersion, r.members.filter((m) => m.left).map((m) => m.userId)); void analysis.recordGame(code).catch((e) => console.error("tahlil xatosi:", e)); },
  });
  m.gauge("poyga_rooms_active", "Faol (tugamagan, boshlangan) xonalar", () => [...rooms.rooms.values()].filter((r) => r.state && !r.endedAt).length);
  m.gauge("poyga_rooms_lobby", "Boshlanmagan xonalar", () => [...rooms.rooms.values()].filter((r) => !r.state).length);
  m.gauge("poyga_players_online", "Ulangan o'yinchilar (bot emas)", () => [...rooms.rooms.values()].reduce((t, r) => t + r.members.filter((x) => !x.bot && x.online).length, 0));
  m.gauge("poyga_ws_sockets", "Ochiq WebSocket ulanishlari", () => openSockets);
  m.gauge("poyga_process_resident_bytes", "Jarayon xotirasi (RSS)", () => process.memoryUsage().rss);
  m.gauge("poyga_uptime_seconds", "Ishlash vaqti", () => Math.round(process.uptime()));
  app.addHook("onResponse", async (req, reply) => { if (req.url !== "/metrics") cHttp({ status: String(Math.floor(reply.statusCode / 100)) + "xx" }); });
  // /health — jarayon tirik; /ready — saqlagich ham javob beradi (yuk balanslagich uchun); /metrics — token bilan (METRICS_TOKEN).
  app.get("/ready", async (_req, reply) => {
    try { await store.ping?.(); return { ready: true }; } catch (e) { app.log.error({ err: String((e as Error).message) }, "ready: saqlagich javob bermadi"); return reply.code(503).send({ ready: false }); }
  });
  const metricsToken = opts.metricsToken ?? process.env.METRICS_TOKEN;
  app.get("/metrics", async (req, reply) => {
    if (!metricsToken || (req.headers.authorization ?? "") !== `Bearer ${metricsToken}`) return reply.code(metricsToken ? 401 : 404).send({ error: "unauthorized" });
    return reply.header("content-type", "text/plain; version=0.0.4").send(m.render());
  });
  registerAdmin(app, { auth: opts.adminAuth ?? envAdminAuth(), state: adminState, registry, rooms, store, cards: () => analysis.topCards() });
  const sockets = new Map<string, Set<{ userId: string; send(s: string): void }>>();

  rooms.on((code, ev) => {
    const set = sockets.get(code); if (!set || set.size === 0) return;
    const msg = JSON.stringify(ev); // bir marta seriyalanadi, hamma ulanishga bir xil satr (4 baravar kam CPU)
    for (const c of set) c.send(msg);
  });

  // Veb mijoz va admin panel boshqa originda ishlaydi: faqat CORS_ORIGINS dagi originlarga ruxsat (standart: yopiq).
  const origins = (process.env.CORS_ORIGINS ?? process.env.ADMIN_ORIGINS ?? "").split(",").filter(Boolean);
  app.addHook("onRequest", async (req, reply) => {
    const o = req.headers.origin;
    if (!o || !origins.includes(o)) return;
    reply.header("access-control-allow-origin", o).header("vary", "origin")
      .header("access-control-allow-headers", "authorization,content-type").header("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return reply.code(204).send();
  });
  // Xavfsizlik sarlavhalari va HTTP tezlik cheklovi (IP bo'yicha; admin kirish urinishlari qattiqroq).
  // WS ulanishi alohida va kengroq: maktab/ofis NAT ortidagi ko'p o'yinchi bir IP dan ulanadi (ta'lim auditoriyasi, §1).
  const reactLimit = new KeyedLimiter(0.7, 3); // ~1 reaksiya / 1.5 s, burst 3
  const wsPingMs = Number(process.env.WS_PING_MS ?? 25_000);
  const httpLimit = new KeyedLimiter(5, 60), adminLimit = new KeyedLimiter(1, 20), wsConnLimit = new KeyedLimiter(Number(process.env.WS_CONNECT_RATE ?? 20), Number(process.env.WS_CONNECT_BURST ?? 300));
  app.addHook("onRequest", async (req, reply) => {
    reply.header("x-content-type-options", "nosniff").header("x-frame-options", "DENY").header("referrer-policy", "no-referrer").header("cache-control", "no-store");
    if (req.method === "OPTIONS" || req.url === "/health") return;
    const lim = req.url.startsWith("/admin") ? adminLimit : req.url.startsWith("/ws") ? wsConnLimit : httpLimit;
    if (!lim.allow(req.ip)) { cLimited({ scope: "http" }); return reply.code(429).send({ error: "rate_limited" }); }
  });
  app.register(websocket, { options: { maxPayload: 16 * 1024 } });
  app.get("/health", async () => ({ ok: true }));

  app.register(async (f) => {
    f.get("/ws", { websocket: true }, (socket, req) => {
      const userId = auth(new URL(req.url, "http://x").searchParams.get("token") ?? undefined);
      if (!userId) return socket.close(4401, "unauthorized");
      if (adminState.isBanned(userId)) return socket.close(4403, "banned");
      cWs(); openSockets++;
      // Proxy (Render va b.) bo'sh WebSocket'ni ~1 daqiqada uzishi mumkin: serverdan davriy ping; ikki marta javob bo'lmasa — uzamiz.
      let missed = 0; const ping = setInterval(() => { if (missed >= 2) { socket.terminate(); return; } missed++; try { socket.ping(); } catch { /* yopilgan */ } }, wsPingMs);
      socket.on("pong", () => { missed = 0; });
      adminState.touch(userId, Date.now());
      let code: string | null = null; const bucket = new Bucket(10, 30); let strikes = 0; // 10 xabar/s, burst 30
      const client = { userId, send: (s: string) => socket.send(s) };
      const reply = (o: unknown) => socket.send(JSON.stringify(o));
      const attach = (c: string) => { code = c; (sockets.get(c) ?? sockets.set(c, new Set()).get(c)!).add(client); };

      socket.on("message", async (raw: Buffer) => {
        if (!bucket.take()) { cLimited({ scope: "ws" }); reply({ type: "error", error: "rate_limited" }); if (++strikes > 5) socket.close(4429, "rate_limited"); return; }
        const parsed = parseMessage(raw.toString());
        if (!parsed.ok) return reply({ type: "error", error: parsed.error });
        const m = parsed.msg;
        try {
        switch (m.type) {
          case "create": { const r = rooms.create(userId); if (!r.ok) return reply({ type: "error", error: r.error });
            attach(r.code); return reply({ type: "state", room: rooms.view(rooms.rooms.get(r.code)!) }); }
          case "join": { const r = rooms.join(String(m.code), userId); if (!r.ok) return reply({ type: "error", error: r.error });
            const c = String(m.code).toUpperCase(); attach(c); return reply({ type: "state", room: rooms.view(rooms.rooms.get(c)!) }); }
          case "start": { if (!code) return reply({ type: "error", error: "no_room" });
            const seed = (crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0; // tekshiriladigan manba: urug' jurnalga yoziladi
            const r = await rooms.start(code, userId, seed); if (!r.ok) reply({ type: "error", error: r.error }); return; }
          case "act": { if (!code) return reply({ type: "error", error: "no_room" });
            const r = await rooms.act(code, userId, { ...m.action, playerId: userId }, m.seq);
            if (!r.ok) { if (r.error === "stale_seq") cActions({ type: m.action.type, result: "stale" }); reply({ type: "error", error: r.error }); } return; }
          case "react": { if (!code) return reply({ type: "error", error: "no_room" });
            if (!reactLimit.allow(userId)) { cLimited({ scope: "react" }); return reply({ type: "error", error: "rate_limited" }); }
            const r = rooms.react(code, userId, m.emoji); if (!r.ok) reply({ type: "error", error: r.error }); return; }
          case "leave": if (code) { sockets.get(code)?.delete(client); rooms.leave(code, userId); code = null; } return; // avval ulanishni xonadan ajratamiz: chiqayotganga holat qaytib kelmasin
          default: return reply({ type: "error", error: "unknown_type" });
        }
        } catch (e) { cWsErr(); app.log.error({ err: String((e as Error).message), type: m.type }, "ws: ichki xato"); reply({ type: "error", error: "internal" }); } // bitta xato jarayonni qulatmaydi
      });
      socket.on("close", () => { clearInterval(ping); openSockets--; if (code) { rooms.disconnect(code, userId); sockets.get(code)?.delete(client); } });
    });
  });
  // --- profil, tarix, reyting, hisobni boshqarish (§5.9, §7) ---
  const userOf = (req: any) => auth((req.headers.authorization ?? "").replace(/^Bearer /, "") || undefined);
  const secured = (h: (uid: string, req: any, reply: any) => unknown) => async (req: any, reply: any) => {
    const uid = userOf(req); if (!uid) return reply.code(401).send({ error: "unauthorized" });
    return h(uid, req, reply);
  };
  const year = () => new Date().getFullYear();
  app.get("/me/profile", secured((uid) => { const p = profiles.get(uid); return { profile: p ?? null, restricted: p ? profiles.restrictedOf([uid]).length > 0 : false, stats: profiles.stats(uid) }; }));
  app.put("/me/profile", secured((uid, req, reply) => {
    const r = profiles.put(uid, req.body); if (!r.ok) return reply.code(400).send({ error: r.error });
    return { profile: r.profile, restricted: profiles.restrictedOf([uid]).length > 0, year: year() };
  }));
  // O'yin tahlili (§5.9): faqat ishtirokchi; boshqa o'yinchilar ismi yoki "O'yinchi N" bilan.
  app.get("/me/games/:code/analysis", secured(async (uid, req, reply) => {
    const code = String((req.params as any).code).toUpperCase();
    const r = await analysis.analyze(code); if (!r) return reply.code(404).send({ error: "no_game" });
    if (!r.state.players.some((p: any) => p.id === uid)) return reply.code(403).send({ error: "not_participant" });
    return presentable(r.analysis, (id) => profiles.get(id)?.name, uid);
  }));
  app.get("/me/history", secured((uid) => profiles.history(uid)));
  app.get("/me/export", secured((uid) => ({ userId: uid, exportedAt: Date.now(), ...profiles.export(uid) })));
  app.delete("/me", secured((uid, req, reply) => {
    if ((req.body as any)?.confirm !== "O'CHIRISH") return reply.code(400).send({ error: "confirm_required" });
    if (rooms.activeRoomOf.has(uid)) return reply.code(409).send({ error: "in_game" });
    profiles.delete(uid); adminState.users.delete(uid);
    return { ok: true };
  }));
  app.get("/leaderboard", async (req) => profiles.leaderboard(Math.min(100, Number((req.query as any).limit) || 20)));

  // Shikoyat: foydalanuvchi tokeni bilan (kirish xizmati ulangach haqiqiy autentifikatsiya)
  app.post("/complaints", async (req, reply) => {
    const uid = auth((req.headers.authorization ?? "").replace(/^Bearer /, "") || undefined);
    if (!uid) return reply.code(401).send({ error: "unauthorized" });
    const b = (req.body ?? {}) as { against?: string; room?: string; text?: string };
    if (!b.text || b.text.length > 2000) return reply.code(400).send({ error: "bad_text" });
    return adminState.addComplaint({ from: uid, against: b.against ?? null, room: b.room ?? null, text: b.text, at: Date.now() });
  });
  return { app, rooms, store, registry, adminState, profiles, analysis };
}
