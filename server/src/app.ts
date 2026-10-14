import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { buildCtx } from "./ctx";
import { MemoryStore, Store } from "./store";
import { RoomManager } from "./rooms";

/** Kirish xizmati (SMS/Google/Apple) keyin ulanadi: hozir `token` = userId (faqat dev/test). */
export type Authenticate = (token: string | undefined) => string | null;
export const devAuth: Authenticate = (t) => (t && /^[\w-]{1,64}$/.test(t) ? t : null);

export function buildApp(opts: { store?: Store; auth?: Authenticate } = {}) {
  const app = Fastify();
  const store = opts.store ?? new MemoryStore();
  const auth = opts.auth ?? devAuth;
  const rooms = new RoomManager(buildCtx(), store);
  const sockets = new Map<string, Set<{ userId: string; send(s: string): void }>>();

  rooms.on((code, ev) => {
    for (const c of sockets.get(code) ?? []) c.send(JSON.stringify(ev));
  });

  app.register(websocket);
  app.get("/health", async () => ({ ok: true }));

  app.register(async (f) => {
    f.get("/ws", { websocket: true }, (socket, req) => {
      const userId = auth(new URL(req.url, "http://x").searchParams.get("token") ?? undefined);
      if (!userId) return socket.close(4401, "unauthorized");
      let code: string | null = null;
      const client = { userId, send: (s: string) => socket.send(s) };
      const reply = (o: unknown) => socket.send(JSON.stringify(o));
      const attach = (c: string) => { code = c; (sockets.get(c) ?? sockets.set(c, new Set()).get(c)!).add(client); };

      socket.on("message", async (raw: Buffer) => {
        let m: any;
        try { m = JSON.parse(raw.toString()); } catch { return reply({ type: "error", error: "bad_json" }); }
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
  return { app, rooms, store };
}
