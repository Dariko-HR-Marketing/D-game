import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { loadContent } from "@poyga/content";
import { MemoryStore } from "./store";
import { RoomManager, DECISION_MS, Clock } from "./rooms";
import { ContentRegistry } from "./registry";
import { AdminState } from "./admin";
import { PgPersist } from "./persist";
import { PgStore } from "./pgstore";
import { ProfileService } from "./profiles";
import { AnalysisService } from "./analysis";
import { WriteQueue } from "./persist";

class FakeClock implements Clock {
  t = 0; q: { at: number; f: () => void; id: number }[] = []; n = 0;
  now() { return this.t; } setTimeout(f: () => void, ms: number) { const id = ++this.n; this.q.push({ at: this.t + ms, f, id }); return id; }
  clearTimeout(h: unknown) { this.q = this.q.filter((x) => x.id !== h); }
  async advance(ms: number) { const end = this.t + ms; for (;;) { this.q.sort((a, b) => a.at - b.at); const nx = this.q[0]; if (!nx || nx.at > end) break; this.q.shift(); this.t = nx.at; nx.f(); await new Promise((r) => setImmediate(r)); } this.t = end; }
}

describe("server qayta ishga tushganda o'yinni tiklash (§6.3)", () => {
  it("holat, a'zolar, seq va kontent versiyasi tiklanadi; o'yin davom etadi", async () => {
    const store = new MemoryStore(); const reg = new ContentRegistry(); const c1 = new FakeClock(); let k = 0;
    const a = new RoomManager(reg, store, c1, () => (k++ * 0.37) % 1);
    const r = a.create("a"); if (!r.ok) throw 0; a.join(r.code, "b"); await a.start(r.code, "a", 11);
    await c1.advance(DECISION_MS * 3);
    const before = a.rooms.get(r.code)!;
    const seq = before.seq, snap = JSON.stringify(before.state);
    expect(seq).toBeGreaterThan(0);

    // "yangi jarayon": bo'sh RoomManager, o'sha saqlagich
    const c2 = new FakeClock(); const b = new RoomManager(reg, store, c2);
    expect(await b.restore()).toBe(1);
    const room = b.rooms.get(r.code)!;
    expect(JSON.stringify(room.state)).toBe(snap); expect(room.seq).toBe(seq); expect(room.contentVersion).toBe(1);
    expect(room.members.every((m) => !m.online)).toBe(true);
    expect(b.activeRoomOf.get("a")).toBe(r.code);
    expect(b.reconnect(r.code, "a").ok).toBe(true);
    await c2.advance(DECISION_MS); // taymer qayta ishga tushgan
    expect(room.seq).toBeGreaterThan(seq);
  });
  it("tugagan o'yin tiklanmaydi; noma'lum kontent versiyasi — tiklanmaydi", async () => {
    const store = new MemoryStore(); const reg = new ContentRegistry(); const c = new FakeClock();
    const a = new RoomManager(reg, store, c); const r = a.create("a"); if (!r.ok) throw 0; a.join(r.code, "b"); await a.start(r.code, "a", 1);
    store.metas.get(r.code)!.contentVersion = 99;
    expect(await new RoomManager(reg, store, new FakeClock()).restore()).toBe(0);
  });
});

const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("PostgreSQL: admin va kontent saqlanadi", () => {
  let pool: Pool, persist: PgPersist, st: PgStore;
  beforeAll(async () => { st = PgStore.connect(url!); await st.migrate(); pool = new Pool({ connectionString: url }); persist = new PgPersist(pool);
    await pool.query("truncate content_versions, settings, app_users, complaints, audit_log restart identity"); });
  afterAll(async () => { await pool.end(); await st.close(); });

  it("kontent versiyalari va faol versiya qayta ishga tushganda saqlanadi", async () => {
    const reg = await ContentRegistry.restore(persist);
    const dreams = JSON.parse(JSON.stringify(loadContent().dreams)); dreams[0].price += 3;
    const v = reg.createVersion("dreams", dreams, "ed", "sinov"); if (!v.ok) throw new Error(v.problems.join());
    reg.publish(v.version); await reg.writes.flush();
    expect(reg.writes.errors).toEqual([]);
    const again = await ContentRegistry.restore(persist);
    expect(again.activeVersion).toBe(v.version); expect(again.infos.map((i) => i.version)).toEqual([1, 2]);
    expect(again.active().ctx.dreams[0].price).toBe(dreams[0].price);
    expect(again.infos[1]).toMatchObject({ author: "ed", note: "sinov", published: true });
  });
  it("foydalanuvchi, blok, shikoyat va audit saqlanadi", async () => {
    const s = new AdminState(persist); s.touch("u1", 1000); s.users.get("u1")!.banned = true; s.users.get("u1")!.banReason = "x"; s.saveUser("u1", 1000);
    const c = s.addComplaint({ from: "u1", against: "u2", room: null, text: "shikoyat", at: 5 });
    c.status = "resolved"; c.resolution = "ok"; c.resolvedBy = "sup"; s.saveComplaint(c);
    s.record({ at: 7, admin: "root", role: "administrator", action: "user.ban", target: "u1", detail: { reason: "x" } });
    await s.writes.flush(); expect(s.writes.errors).toEqual([]);
    const r = await AdminState.restore(persist);
    expect(r.isBanned("u1")).toBe(true); expect(r.users.get("u1")!.banReason).toBe("x");
    expect(r.complaints[0]).toMatchObject({ id: 1, status: "resolved", resolvedBy: "sup" });
    expect(r.audit[0]).toMatchObject({ action: "user.ban", target: "u1", detail: { reason: "x" } });
    expect(r.addComplaint({ from: "u3", against: null, room: null, text: "y", at: 9 }).id).toBe(2); // ketma-ketlik davom etadi
  });
  it("PgStore: o'yin snapshoti + meta bilan tiklanadi", async () => {
    const reg = new ContentRegistry(); const c = new FakeClock(); const a = new RoomManager(reg, st, c); const r = a.create("a"); if (!r.ok) throw 0;
    a.join(r.code, "b"); await a.start(r.code, "a", 5);
    const b = new RoomManager(reg, st, new FakeClock()); expect(await b.restore()).toBeGreaterThanOrEqual(1);
    expect(b.rooms.get(r.code)!.state).toEqual(a.rooms.get(r.code)!.state);
  });
  it("profil, natijalar saqlanadi; o'chirishda anonimlashadi", async () => {
    await pool.query("truncate profiles, game_results restart identity");
    const s = new ProfileService(persist, () => 2026, () => 5000);
    s.put("a", { name: "Ali", color: 2, birthYear: 1990 }); s.put("b", { name: "Bobur", color: 0, birthYear: 2012 });
    s.record({ room: "R1", finishedAt: 9000, durationMs: 4000, rounds: 12, winner: "a", contentVersion: 1,
      players: [{ id: "a", bot: false, circle: "big", restarts: 1, won: true }, { id: "b", bot: false, circle: "small", restarts: 0, won: false }] });
    await s.writes.flush(); expect(s.writes.errors).toEqual([]);
    const r = await ProfileService.restore(persist, () => 2026);
    expect(r.get("b")).toMatchObject({ name: "Bobur", birthYear: 2012 }); expect(r.restrictedOf(["a", "b"])).toEqual(["b"]);
    expect(r.stats("a")).toMatchObject({ games: 1, wins: 1, reachedBig: 1 });
    expect(r.leaderboard()[0]).toMatchObject({ name: "Ali", wins: 1 });
    r.delete("a"); await r.writes.flush(); expect(r.writes.errors).toEqual([]);
    const r2 = await ProfileService.restore(persist, () => 2026);
    expect(r2.get("a")).toBeUndefined(); expect(r2.results[0].winner).toBe("deleted");
    expect(r2.results[0].players.map((p) => p.id)).toEqual(["deleted", "b"]);
  });
  it("tugagan o'yin tahlili PostgreSQL'dan qayta tiklanadi; karta statistikasi saqlanadi", async () => {
    await pool.query("truncate card_stats");
    const reg = new ContentRegistry(); const rm = new RoomManager(reg, st, new FakeClock());
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b"); await rm.start(r.code, "a", 77);
    const room = rm.rooms.get(r.code)!;
    for (let i = 0; i < 40; i++) { const me = room.state!.players[room.state!.turn % 2].id; await rm.act(r.code, me, room.state!.pending ? { type: "decide", playerId: me, accept: false } : { type: "roll", playerId: me }, room.seq); }
    const w = new WriteQueue(); const svc = new AnalysisService(st, reg, w, persist);
    const res = await svc.analyze(r.code); expect(res!.state).toEqual(room.state);
    await svc.recordGame(r.code); await w.flush(); expect(w.errors).toEqual([]);
    const again = await AnalysisService.restore(st, reg, new WriteQueue(), persist);
    expect(again.cardStats).toEqual(svc.cardStats);
  });
});
