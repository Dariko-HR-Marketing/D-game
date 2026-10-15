import { OtpService, type SmsSender, normalizePhone, verifyToken, parseToken, issueSession, userIdOfSub, Revocations } from "./auth";
import type { OidcVerifier } from "./oidc";
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { ContentRegistry } from "./registry";
import { ProfileService } from "./profiles";
import { AnalysisService, presentable } from "./analysis";
import { Metrics } from "./metrics";
import { WriteQueue } from "./persist";
import { parseMessage } from "./protocol";
import { Bucket, KeyedLimiter, ipKey } from "./ratelimit";
import { AdminState, AdminAuth, envAdminAuth, registerAdmin } from "./admin";
import { MemoryStore, Store } from "./store";
import { RoomManager } from "./rooms";
import { Commerce, DevProvider, type PaymentProvider } from "./commerce";
import { ParentConsents } from "./parents";
import { PhoneLinks } from "./phones";
import { registerShop } from "./shop-routes";
import { AdminAccounts } from "./adminAccounts";
import { Ops } from "./ops";
import { registerAdminAuth, registerAdminCore } from "./admin-core";
import { registerAdminGames } from "./admin-games";
import { Edu } from "./edu";
import { Tournaments } from "./tournaments";
import { registerBiz, registerBizAdmin } from "./biz-routes";
import type { DocStore } from "./docs";
import { randomBytes } from "node:crypto";

/** Kirish xizmati (SMS/Google/Apple) keyin ulanadi: hozir `token` = userId (faqat dev/test). */
export type Authenticate = (token: string | undefined) => string | null;
export const devAuth: Authenticate = (t) => (t && /^[\w-]{1,64}$/.test(t) ? t : null);

/** Tasdiqlash so'zi: apostrof variantlari (’ ʻ ʼ ‘ `) va registr farqi hisobga olinmaydi (telefon klaviaturalari) */
export const normalizeWord = (v: unknown) => String(v ?? "").normalize("NFKC").replace(/[’ʻʼ‘`´]/g, "'").trim().toUpperCase();

export function buildApp(opts: { store?: Store; auth?: Authenticate; adminAuth?: AdminAuth; registry?: ContentRegistry; adminState?: AdminState; profiles?: ProfileService; analysis?: AnalysisService; logger?: boolean | { level?: string; stream?: { write(s: string): void } }; metricsToken?: string; otp?: OtpService; authSecret?: string; oidc?: Partial<Record<"google" | "apple", OidcVerifier>>; docs?: DocStore; sms?: SmsSender; providers?: PaymentProvider[]; publicUrl?: string; webhookSecret?: string; phones?: PhoneLinks; consents?: ParentConsents; commerce?: Commerce; edu?: Edu; tournaments?: Tournaments; ops?: Ops; accounts?: AdminAccounts } = {}) {
  // Ishlab chiqarishda sinov autentifikatsiyasi taqiqlanadi: haqiqiy `auth` (SMS/Google/Apple) berilishi shart.
  if (process.env.NODE_ENV === "production" && !opts.auth && !opts.authSecret) throw new Error("production: haqiqiy autentifikatsiya (opts.auth) kerak; devAuth o'chirilgan");
  // Tuzilgan JSON jurnal (§11). Maxfiylik: token va so'rov parametrlari (?token=…) jurnalga yozilmaydi, IP saqlanmaydi.
  const serializers = { req: (r: any) => ({ method: r.method, path: String(r.url).split("?")[0], id: r.id }), res: (r: any) => ({ status: r.statusCode }) };
  const logger = opts.logger ? { level: "info", ...(opts.logger === true ? {} : opts.logger), serializers } : false;
  const app = Fastify({ bodyLimit: 64 * 1024, logger, trustProxy: process.env.TRUST_PROXY === "1" ? "loopback,linklocal,uniquelocal" : false }); // Caddy ortida TRUST_PROXY=1: aks holda hamma mijoz bitta IP bo'lib qoladi
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
  // Haqiqiy rejim: imzolangan sessiya tokeni (authSecret). Aks holda (faqat ishlab chiqish/staging) sinov tokeni = foydalanuvchi ID.
  const revocations = new Revocations();
  const auth: Authenticate = opts.auth ?? (opts.authSecret ? (t) => verifyToken(opts.authSecret!, t, Date.now(), revocations) : devAuth);
  const registry = opts.registry ?? new ContentRegistry();
  const adminState = opts.adminState ?? new AdminState();
  const profiles = opts.profiles ?? new ProfileService();
  // Tijorat: telefon tasdig'i, ota-ona roziligi, do'kon/Plus. Production'da to'lov provayderi berilmasa xaridlar yopiq (`payments_unavailable`).
  const secret = opts.authSecret ?? randomBytes(24).toString("hex"); const dev = !opts.otp && !opts.authSecret && !opts.oidc && process.env.NODE_ENV !== "production";
  const phones = opts.phones ?? new PhoneLinks(secret, opts.docs);
  const consents = opts.consents ?? new ParentConsents(secret, opts.sms, opts.publicUrl ?? process.env.PUBLIC_URL ?? "http://localhost:3000", opts.docs);
  const commerce = opts.commerce ?? new Commerce({ docs: opts.docs, providers: opts.providers ?? (process.env.NODE_ENV === "production" ? [] : [new DevProvider()]), consents,
    phoneOk: (uid) => dev || phones.isVerified(uid), ageOf: (uid) => { const p = profiles.get(uid); return p ? new Date().getFullYear() - p.birthYear : null; },
    achievements: (uid) => profiles.stats(uid).achievements, phoneHashOf: (uid) => phones.hashFor(uid), hashOf: (p) => phones.hashOf(p) });
  const ops = opts.ops ?? new Ops(opts.docs); const accounts = opts.accounts ?? new AdminAccounts(opts.docs);
  const edu = opts.edu ?? new Edu(opts.docs); const tournaments = opts.tournaments ?? new Tournaments(opts.docs);
  const analysis = opts.analysis ?? new AnalysisService(store, registry, new WriteQueue());
  const rooms = new RoomManager(registry, store, undefined, undefined, {
    restricted: (ids) => [...new Set([...profiles.restrictedOf(ids), ...consents.loansBlocked(ids)])], // §2.8: 16 yoshgacha va ota-ona o'chirgan bolalar — qarz/sheriklik yopiq
    profile: (id) => { const p = profiles.get(id); return p ? { ...p, level: profiles.levelCached(id), cos: commerce.cosmetics(id) } : undefined; },
    canJoin: (tag, uid) => (tag.kind === "class" ? edu.canJoinRoom(tag.id, uid) : tournaments.canJoinRoom(tag.id, uid)), // sinf/turnir xonasi — faqat a'zolar
    onStart: () => cGames({ event: "started" }),
    onAbandon: () => cGames({ event: "abandoned" }),
    onError: (where, e) => { cErr({ where }); ops.logError(where, e); app.log.error({ where, err: String((e as Error)?.message ?? e) }, "xona xatosi"); },
    onApply: (type, ok, ms, error) => { cActions({ type, result: ok ? "ok" : "rejected" }); hAction(ms / 1000, { type }); },
    onEnd: (code, r) => { cGames({ event: "finished" }); profiles.recordFromGame(code, r.state!, r.createdAt, r.contentVersion, r.members.filter((m) => m.left).map((m) => m.userId), r.members.filter((m) => m.unreliable).map((m) => m.userId), r.tag); void analysis.recordGame(code).catch((e) => console.error("tahlil xatosi:", e)); },
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
  function eraseUser(uid: string) { profiles.delete(uid); commerce.erase(uid); edu.eraseUser(uid); tournaments.eraseUser(uid); consents.erase(uid); phones.erase(uid); adminState.users.delete(uid); adminState.banUntil.delete(uid); revocations.revoke(uid); }
  const legacyAuth = envAdminAuth();
  registerAdminAuth(app, { accounts, state: adminState, ops, rooms, profiles, commerce, edu, tournaments, consents, phones, eraseUser, legacy: legacyAuth });
  registerAdmin(app, { auth: opts.adminAuth ?? ((t) => accounts.resolve(t) ?? legacyAuth(t)), state: adminState, registry, rooms, store, cards: () => analysis.topCards(), funnel: (n) => profiles.funnel(n), nameOf: (id) => profiles.get(id)?.name, extend: (guard) => { registerAdminGames(guard, app, { ops, registry, rooms, profiles, store, nameOf: (id) => profiles.get(id)?.name }); registerAdminCore(guard, app, { accounts, state: adminState, ops, rooms, profiles, commerce, edu, tournaments, consents, phones, eraseUser }); registerBizAdmin(guard, app, { edu, tournaments, commerce, nameOf: (id) => profiles.get(id)?.name }) } });
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
  const complaintLimit = new KeyedLimiter(1 / 60, 3); // ~1 shikoyat/daqiqa, burst 3
  const reactLimit = new KeyedLimiter(0.7, 3); // ~1 reaksiya / 1.5 s, burst 3
  const wsPingMs = Number(process.env.WS_PING_MS ?? 25_000);
  const httpLimit = new KeyedLimiter(5, 60), adminLimit = new KeyedLimiter(3, 60), wsConnLimit = new KeyedLimiter(Number(process.env.WS_CONNECT_RATE ?? 20), Number(process.env.WS_CONNECT_BURST ?? 300));
  app.addHook("onRequest", async (req, reply) => {
    reply.header("x-content-type-options", "nosniff").header("x-frame-options", "DENY").header("referrer-policy", "no-referrer").header("cache-control", "no-store");
    if (req.method === "OPTIONS" || req.url === "/health") return;
    const lim = req.url.startsWith("/admin") ? adminLimit : req.url.startsWith("/ws") ? wsConnLimit : httpLimit;
    if (!lim.allow(ipKey(req.ip))) { cLimited({ scope: "http" }); return reply.code(429).send({ error: "rate_limited" }); }
  });
  app.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string", bodyLimit: 8 * 1024 }, (_req, body, done) => done(null, Object.fromEntries(new URLSearchParams(body as string)))); // ota-ona sahifasi formasi
  app.register(websocket, { options: { maxPayload: 16 * 1024 } });
  app.get("/health", async () => ({ ok: true }));
  // --- kirish (SMS bir martalik kod) ---
  const authLimit = new KeyedLimiter(10 / 60, 10); // IP bo'yicha ~10 so'rov/daqiqa
  app.get("/auth/config", async () => ({ sms: !!opts.otp, google: !!opts.oidc?.google, apple: !!opts.oidc?.apple, dev: !opts.otp && !opts.authSecret && !opts.oidc }));
  for (const prov of ["google", "apple"] as const) app.post(`/auth/${prov}`, async (req, reply) => {
    const v = opts.oidc?.[prov]; if (!v || !opts.authSecret) return reply.code(404).send({ error: "not_enabled" });
    if (!authLimit.allow(ipKey(req.ip))) { cLimited({ scope: "auth" }); return reply.code(429).send({ error: "rate_limited" }); }
    const r = await v.verify((req.body as any)?.idToken); if (!r) return reply.code(401).send({ error: "bad_token" });
    return issueSession(opts.authSecret, userIdOfSub(opts.authSecret, prov, r.sub));
  });
  app.post("/auth/logout", async (req, reply) => { // sessiyani serverda bekor qiladi (shu vaqtgacha berilgan barcha tokenlar)
    if (!opts.authSecret) return reply.code(404).send({ error: "not_enabled" });
    const t = parseToken(opts.authSecret, (req.headers.authorization ?? "").replace(/^Bearer /, "") || undefined); if (!t) return reply.code(401).send({ error: "unauthorized" });
    revocations.revoke(t.userId); return { ok: true };
  });
  app.post("/auth/sms/request", async (req, reply) => {
    if (!opts.otp) return reply.code(404).send({ error: "not_enabled" });
    if (!authLimit.allow(ipKey(req.ip))) { cLimited({ scope: "auth" }); return reply.code(429).send({ error: "rate_limited" }); }
    const phone = normalizePhone((req.body as any)?.phone); if (!phone) return reply.code(400).send({ error: "bad_phone" });
    const r = await opts.otp.request(phone); if (!r.ok) return reply.code(r.error === "rate_limited" ? 429 : 502).send({ error: r.error });
    return { ok: true };
  });
  app.post("/auth/sms/verify", async (req, reply) => {
    if (!opts.otp) return reply.code(404).send({ error: "not_enabled" });
    if (!authLimit.allow(ipKey(req.ip))) { cLimited({ scope: "auth" }); return reply.code(429).send({ error: "rate_limited" }); }
    const phone = normalizePhone((req.body as any)?.phone); if (!phone) return reply.code(400).send({ error: "bad_phone" });
    const r = opts.otp.verify(phone, (req.body as any)?.code); if (!r.ok) return reply.code(401).send({ error: r.error });
    phones.link(r.userId, phone); // SMS bilan kirgan — telefon tasdiqlangan
    return { token: r.token, userId: r.userId };
  });

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
        if (adminState.isBanned(userId)) return socket.close(4403, "banned"); // ulanganidan keyin bloklangan bo'lsa ham
        const parsed = parseMessage(raw.toString());
        if (!parsed.ok) return reply({ type: "error", error: parsed.error });
        const m = parsed.msg;
        try {
        switch (m.type) {
          case "create": { if (ops.flags().maintenance || ops.flags().roomsPaused) return reply({ type: "error", error: "maintenance" }); if (!commerce.canCreateRoom(userId)) return reply({ type: "error", error: "room_limit" }); const r = rooms.create(userId); if (!r.ok) return reply({ type: "error", error: r.error }); commerce.noteRoomCreated(userId);
            attach(r.code); return reply({ type: "state", room: rooms.view(rooms.rooms.get(r.code)!) }); }
          case "join": { if (ops.flags().maintenance) return reply({ type: "error", error: "maintenance" }); const r = rooms.join(String(m.code), userId); if (!r.ok) return reply({ type: "error", error: r.error });
            const c = String(m.code).toUpperCase(); attach(c); return reply({ type: "state", room: rooms.view(rooms.rooms.get(c)!) }); }
          case "start": { if (!code) return reply({ type: "error", error: "no_room" });
            const seed = (crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0; // tekshiriladigan manba: urug' jurnalga yoziladi
            const r = await rooms.start(code, userId, seed, { events: (m as { events?: boolean }).events }); if (!r.ok) reply({ type: "error", error: r.error }); return; }
          case "act": { if (!code) return reply({ type: "error", error: "no_room" });
            const r = await rooms.act(code, userId, { ...m.action, playerId: userId }, m.seq);
            if (!r.ok) { if (r.error === "stale_seq") { cActions({ type: m.action.type, result: "stale" }); const rm = rooms.rooms.get(code); if (rm) reply({ type: "state", room: rooms.view(rm) }); } reply({ type: "error", error: r.error }); } return; }
          case "react": { if (!code) return reply({ type: "error", error: "no_room" });
            if (!reactLimit.allow(userId)) { cLimited({ scope: "react" }); return reply({ type: "error", error: "rate_limited" }); }
            const r = rooms.react(code, userId, m.emoji); if (!r.ok) reply({ type: "error", error: r.error }); return; }
          case "leave": if (code) { sockets.get(code)?.delete(client); rooms.leave(code, userId); code = null; } return; // avval ulanishni xonadan ajratamiz: chiqayotganga holat qaytib kelmasin
          default: return reply({ type: "error", error: "unknown_type" });
        }
        } catch (e) { cWsErr(); app.log.error({ err: String((e as Error).message), type: m.type }, "ws: ichki xato"); reply({ type: "error", error: "internal" }); } // bitta xato jarayonni qulatmaydi
      });
      socket.on("close", () => { clearInterval(ping); openSockets--; if (code) { sockets.get(code)?.delete(client); if (![...(sockets.get(code) ?? [])].some((c) => c.userId === userId)) rooms.disconnect(code, userId); } }); // yangi ulanish bor bo'lsa, eski soket yopilishi o'yinchini oflayn qilmasin
    });
  });
  // --- profil, tarix, reyting, hisobni boshqarish (§5.9, §7) ---
  const userOf = (req: any) => auth((req.headers.authorization ?? "").replace(/^Bearer /, "") || undefined);
  const secured = (h: (uid: string, req: any, reply: any) => unknown) => async (req: any, reply: any) => {
    const uid = userOf(req); if (!uid) return reply.code(401).send({ error: "unauthorized" });
    if (adminState.isBanned(uid)) return reply.code(403).send({ error: "banned" }); // taqiqlangan hisob o'chirish bilan taqiqdan qutula olmaydi
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
    if (!commerce.analysisAllowed(uid, !profiles.hasResult(code) || profiles.latestRoomOf(uid) === code)) return reply.code(402).send({ error: "plus_required" }); // bepul: faqat oxirgi o'yin tahlili
    return presentable(r.analysis, (id) => profiles.get(id)?.name, uid);
  }));
  app.get("/me/history", secured((uid) => { const lim = commerce.historyLimit(uid); return lim === null ? profiles.history(uid) : profiles.history(uid, lim); })); // bepul tarif: oxirgi N o'yin; Plus: to'liq
  app.get("/me/export", secured((uid) => ({ userId: uid, exportedAt: Date.now(), ...profiles.export(uid) })));
  app.delete("/me", secured((uid, req, reply) => {
    if (normalizeWord((req.body as any)?.confirm) !== normalizeWord("O'CHIRISH")) return reply.code(400).send({ error: "confirm_required" });
    if (rooms.activeRoomOf.has(uid)) return reply.code(409).send({ error: "in_game" });
    eraseUser(uid); // o'chirilgan hisobning eski tokenlari yaroqsiz
    return { ok: true };
  }));
  app.get("/leaderboard", async (req) => profiles.leaderboard(Math.max(1, Math.min(100, Math.floor(Number((req.query as any).limit)) || 20))));

  // Shikoyat: foydalanuvchi tokeni bilan (kirish xizmati ulangach haqiqiy autentifikatsiya)
  app.post("/complaints", async (req, reply) => {
    const uid = auth((req.headers.authorization ?? "").replace(/^Bearer /, "") || undefined);
    if (!uid) return reply.code(401).send({ error: "unauthorized" });
    if (adminState.isBanned(uid)) return reply.code(403).send({ error: "banned" });
    const b = (req.body ?? {}) as { against?: unknown; room?: unknown; text?: unknown };
    const short = (v: unknown) => (v === undefined || v === null ? null : typeof v === "string" && v.length <= 64 ? v : undefined);
    if (typeof b.text !== "string" || !b.text.trim() || b.text.length > 2000) return reply.code(400).send({ error: "bad_text" });
    const against = short(b.against), room = short(b.room);
    if (against === undefined || room === undefined) return reply.code(400).send({ error: "bad_field" });
    if (!complaintLimit.allow(uid)) return reply.code(429).send({ error: "rate_limited" }); // bir hisobdan ko'p yuborilmasin
    return adminState.addComplaint({ from: uid, against, room, text: b.text, at: Date.now() });
  });
  registerShop({ app, commerce, phones, consents, otp: opts.otp, dev, webhookSecret: opts.webhookSecret ?? process.env.PAYMENT_WEBHOOK_SECRET, onTournamentConsent: (id, ok) => tournaments.onConsent(id, ok), salesPaused: () => ops.flags().salesPaused || ops.flags().maintenance, payEvent: (o, a, ok, e) => ops.payEvent(o, a, ok, e), devPay: dev && process.env.NODE_ENV !== "production", secured, ageOf: (uid) => { const p = profiles.get(uid); return p ? new Date().getFullYear() - p.birthYear : null; }, nameOf: (id) => profiles.get(id)?.name, limited: (scope) => cLimited({ scope }) });
  const ageOf = (uid: string) => { const p = profiles.get(uid); return p ? new Date().getFullYear() - p.birthYear : null; };
  registerBiz({ app, edu, tournaments, consents, phones, profiles, rooms, secured, ageOf, nameOf: (id) => profiles.get(id)?.name, hashOf: (p) => phones.hashOf(p), dev, tournamentsPaused: () => ops.flags().tournamentsPaused || ops.flags().maintenance });
  app.addHook("onResponse", async (req, rep) => { if (rep.statusCode >= 500) ops.logError(`${req.method} ${req.routeOptions?.url ?? req.url}`, `HTTP ${rep.statusCode}`); });
  app.get("/status", async () => { const f = ops.flags(); return { maintenance: f.maintenance, text: f.maintenance ? f.maintenanceText : "" }; });
  const ready = Promise.all([phones.load(), consents.load(), commerce.load(), edu.load(), tournaments.load(), accounts.load(), ops.load()]).then(() => {
    for (const b of ops.bans.values()) if (b.until) adminState.banUntil.set(b.id, b.until);
    for (const c of ops.cleared.values()) profiles.cleared.add(c.id);
    accounts.bootstrap(process.env.ADMIN_BOOTSTRAP_LOGIN, process.env.ADMIN_BOOTSTRAP_PASSWORD);
  }); // docs jadvalidan tiklash
  const flush = () => Promise.all([commerce.queue?.flush(), edu.queue.flush(), tournaments.queue.flush(), accounts.queue.flush(), ops.queue.flush()]);
  return { app, rooms, store, registry, adminState, profiles, analysis, commerce, phones, consents, edu, tournaments, accounts, ops, ready, flush };
}
