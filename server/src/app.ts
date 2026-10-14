import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { ContentRegistry } from "./registry";
import { ProfileService } from "./profiles";
import { AnalysisService, presentable } from "./analysis";
import { WriteQueue } from "./persist";
import { parseMessage } from "./protocol";
import { Bucket, KeyedLimiter } from "./ratelimit";
import { AdminState, AdminAuth, envAdminAuth, registerAdmin } from "./admin";
import { MemoryStore, Store } from "./store";
import { RoomManager } from "./rooms";

/** Kirish xizmati (SMS/Google/Apple) keyin ulanadi: hozir `token` = userId (faqat dev/test). */
export type Authenticate = (token: string | undefined) => string | null;
export const devAuth: Authenticate = (t) => (t && /^[\w-]{1,64}$/.test(t) ? t : null);

export function buildApp(opts: { store?: Store; auth?: Authenticate; adminAuth?: AdminAuth; registry?: ContentRegistry; adminState?: AdminState; profiles?: ProfileService; analysis?: AnalysisService } = {}) {
  // Ishlab chiqarishda sinov autentifikatsiyasi taqiqlanadi: haqiqiy `auth` (SMS/Google/Apple) berilishi shart.
  if (process.env.NODE_ENV === "production" && !opts.auth) throw new Error("production: haqiqiy autentifikatsiya (opts.auth) kerak; devAuth o'chirilgan");
  const app = Fastify({ bodyLimit: 64 * 1024 });
  const store = opts.store ?? new MemoryStore();
  const auth = opts.auth ?? devAuth;
  const registry = opts.registry ?? new ContentRegistry();
  const adminState = opts.adminState ?? new AdminState();
  const profiles = opts.profiles ?? new ProfileService();
  const analysis = opts.analysis ?? new AnalysisService(store, registry, new WriteQueue());
  const rooms = new RoomManager(registry, store, undefined, undefined, {
    restricted: (ids) => profiles.restrictedOf(ids),               // §2.8: 16 yoshgacha — qarz/sheriklik yopiq
    profile: (id) => profiles.get(id),
    onEnd: (code, r) => { profiles.recordFromGame(code, r.state!, r.createdAt, r.contentVersion); void analysis.recordGame(code).catch((e) => console.error("tahlil xatosi:", e)); },
  });
  registerAdmin(app, { auth: opts.adminAuth ?? envAdminAuth(), state: adminState, registry, rooms, store, cards: () => analysis.topCards() });
  const sockets = new Map<string, Set<{ userId: string; send(s: string): void }>>();

  rooms.on((code, ev) => {
    for (const c of sockets.get(code) ?? []) c.send(JSON.stringify(ev));
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
  const httpLimit = new KeyedLimiter(5, 60), adminLimit = new KeyedLimiter(1, 20);
  app.addHook("onRequest", async (req, reply) => {
    reply.header("x-content-type-options", "nosniff").header("x-frame-options", "DENY").header("referrer-policy", "no-referrer").header("cache-control", "no-store");
    if (req.method === "OPTIONS" || req.url === "/health") return;
    const lim = req.url.startsWith("/admin") ? adminLimit : httpLimit;
    if (!lim.allow(req.ip)) return reply.code(429).send({ error: "rate_limited" });
  });
  app.register(websocket, { options: { maxPayload: 16 * 1024 } });
  app.get("/health", async () => ({ ok: true }));

  app.register(async (f) => {
    f.get("/ws", { websocket: true }, (socket, req) => {
      const userId = auth(new URL(req.url, "http://x").searchParams.get("token") ?? undefined);
      if (!userId) return socket.close(4401, "unauthorized");
      if (adminState.isBanned(userId)) return socket.close(4403, "banned");
      adminState.touch(userId, Date.now());
      let code: string | null = null; const bucket = new Bucket(10, 30); let strikes = 0; // 10 xabar/s, burst 30
      const client = { userId, send: (s: string) => socket.send(s) };
      const reply = (o: unknown) => socket.send(JSON.stringify(o));
      const attach = (c: string) => { code = c; (sockets.get(c) ?? sockets.set(c, new Set()).get(c)!).add(client); };

      socket.on("message", async (raw: Buffer) => {
        if (!bucket.take()) { reply({ type: "error", error: "rate_limited" }); if (++strikes > 5) socket.close(4429, "rate_limited"); return; }
        const parsed = parseMessage(raw.toString());
        if (!parsed.ok) return reply({ type: "error", error: parsed.error });
        const m = parsed.msg;
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
            if (!r.ok) reply({ type: "error", error: r.error }); return; }
          case "leave": if (code) { rooms.leave(code, userId); sockets.get(code)?.delete(client); code = null; } return;
          default: return reply({ type: "error", error: "unknown_type" });
        }
      });
      socket.on("close", () => { if (code) { rooms.disconnect(code, userId); sockets.get(code)?.delete(client); } });
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
