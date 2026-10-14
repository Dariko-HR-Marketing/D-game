import { describe, it, expect, beforeEach } from "vitest";
import { buildCtx } from "./ctx";
import { MemoryStore } from "./store";
import { Clock, RoomManager, DECISION_MS, publicState } from "./rooms";
import { currentPlayer, newGame, reduce, chooseDream } from "@poyga/rules";

const ctx = buildCtx();

class FakeClock implements Clock {
  t = 0; q: { at: number; f: () => void; id: number }[] = []; n = 0;
  now() { return this.t; }
  setTimeout(f: () => void, ms: number) { const id = ++this.n; this.q.push({ at: this.t + ms, f, id }); return id; }
  clearTimeout(h: unknown) { this.q = this.q.filter((x) => x.id !== h); }
  async advance(ms: number) {
    const end = this.t + ms;
    for (;;) {
      this.q.sort((a, b) => a.at - b.at);
      const nx = this.q[0];
      if (!nx || nx.at > end) break;
      this.q.shift(); this.t = nx.at; nx.f();
      await new Promise((r) => setImmediate(r));
    }
    this.t = end;
  }
}

let clock: FakeClock, store: MemoryStore, rm: RoomManager;
beforeEach(() => { clock = new FakeClock(); store = new MemoryStore(); let k = 0; rm = new RoomManager(ctx, store, clock, () => ((k++ * 0.37) % 1)); });

describe("xonalar (§6.1)", () => {
  it("yaratish va kod bilan qo'shilish, 6/6 da rad", () => {
    const r = rm.create("u0"); if (!r.ok) throw 0;
    expect(r.code).toMatch(/^[A-Z2-9]{6}$/);
    for (let i = 1; i < 6; i++) expect(rm.join(r.code.toLowerCase(), `u${i}`).ok).toBe(true);
    expect(rm.join(r.code, "u6")).toEqual({ ok: false, error: "room_full" });
  });
  it("noma'lum kod", () => expect(rm.join("ZZZZZZ", "x")).toEqual({ ok: false, error: "room_not_found" }));
  it("bir hisob — bitta faol o'yin (§7)", () => {
    const a = rm.create("u0"); if (!a.ok) throw 0;
    expect(rm.create("u0")).toEqual({ ok: false, error: "already_in_game" });
  });
  it("faqat xona egasi boshlaydi; 1 odam bo'lsa bot qo'shiladi", async () => {
    const r = rm.create("u0"); if (!r.ok) throw 0;
    rm.join(r.code, "u1"); rm.leave(r.code, "u1");
    expect(await rm.start(r.code, "u1", 1)).toEqual({ ok: false, error: "not_host" });
    expect((await rm.start(r.code, "u0", 1)).ok).toBe(true);
    const room = rm.rooms.get(r.code)!;
    expect(room.members.map((m) => m.bot)).toEqual([false, true]);
  });
});

describe("harakatlar (§6.2)", () => {
  it("eski/takroriy seq rad etiladi, jurnal ketma-ket", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b");
    await rm.start(r.code, "a", 7);
    expect((await rm.act(r.code, "a", { type: "roll", playerId: "a" }, 0)).ok).toBe(true);
    expect(await rm.act(r.code, "a", { type: "roll", playerId: "a" }, 0)).toEqual({ ok: false, error: "stale_seq" });
    const j = await store.journal(r.code);
    expect(j.map((e) => e.seq)).toEqual([1]);
  });
  it("boshqa o'yinchi nomidan harakat yo'q", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b");
    await rm.start(r.code, "a", 7);
    expect((await rm.act(r.code, "b", { type: "roll", playerId: "a" }, 0)).ok).toBe(false);
  });
  it("jurnal + urug'dan holat to'liq qayta tiklanadi (nizo uchun)", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b");
    await rm.start(r.code, "a", 99);
    await clock.advance(DECISION_MS * 40);
    const room = rm.rooms.get(r.code)!;
    let s = newGame(ctx, ["a", "b"], 99); s.players.forEach((p, i) => (s = chooseDream(s, p.id, i)));
    for (const e of await store.journal(r.code)) {
      const a = "action" in e.action ? e.action.action : e.action;
      const o = reduce(s, ctx, a); if (!o.ok) throw new Error(o.error); s = o.state;
    }
    expect(s).toEqual(room.state);
  });
});

describe("taymer va uzilish (§5.2, §6.3)", () => {
  it("30 s da harakat bo'lmasa avtomatik", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b");
    await rm.start(r.code, "a", 3);
    await clock.advance(DECISION_MS - 1);
    expect(rm.rooms.get(r.code)!.seq).toBe(0);
    await clock.advance(1);
    expect(rm.rooms.get(r.code)!.seq).toBeGreaterThan(0);
  });
  it("vaqt tugasa ixtiyoriy karta o'tkaziladi (qabul qilinmaydi)", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b");
    await rm.start(r.code, "a", 3);
    await clock.advance(DECISION_MS * 60);
    const auto = (await store.journal(r.code)).filter((e) => "reason" in e.action && e.action.action.type === "decide");
    for (const e of auto) if ("reason" in e.action && e.action.action.type === "decide") expect(e.action.action.accept).toBe(false);
  });
  it("uzilish va qayta ulanish: holat saqlanadi, o'yin davom etadi", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b");
    await rm.start(r.code, "a", 3);
    rm.disconnect(r.code, "a");
    await clock.advance(DECISION_MS * 3);
    const before = rm.rooms.get(r.code)!.seq;
    expect(before).toBeGreaterThan(0);
    expect(rm.join(r.code, "a").ok).toBe(true);
    expect(rm.rooms.get(r.code)!.members[0].online).toBe(true);
    expect(rm.view(rm.rooms.get(r.code)!).state).toEqual(publicState(store.snapshots.get(r.code)!));
  });
  it("chiqib ketgan o'yinchi o'rniga bot o'ynaydi", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b");
    await rm.start(r.code, "a", 3);
    rm.leave(r.code, "a");
    await clock.advance(10);
    const room = rm.rooms.get(r.code)!;
    expect(room.members[0].bot).toBe(true);
    expect(currentPlayer(room.state!).id).toBe("b");
    expect(rm.create("a").ok).toBe(true);
  });
});

describe("hamkorlik taymeri", () => {
  it("taklif 30 s da o'chadi va navbatni to'xtatmaydi", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b");
    await rm.start(r.code, "a", 3);
    const room = rm.rooms.get(r.code)!;
    // qo'lda taklif qo'shib, keyingi harakatda taymer o'rnatilishini tekshiramiz
    room.state!.proposals.push({ id: 77, kind: "suyunchi", parent: "a", given: [] });
    const first = room.state!.players[room.state!.turn % 2].id;
    await rm.act(r.code, first, { type: "roll", playerId: first }, room.seq);
    expect(room.state!.proposals.some((p) => p.id === 77)).toBe(true);
    await clock.advance(DECISION_MS);
    expect(room.state!.proposals.some((p) => p.id === 77)).toBe(false);
  });
  it("mijoz 'expire' yubora olmaydi", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b");
    await rm.start(r.code, "a", 3);
    expect((await rm.act(r.code, "a", { type: "expire", playerId: "server", proposalId: 1 } as any, 0)).ok).toBe(false);
  });
});
