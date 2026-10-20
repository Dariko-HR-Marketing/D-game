import { describe, it, expect, beforeEach } from "vitest";
import { buildCtx } from "./ctx";
import { MemoryStore } from "./store";
import { Clock, RoomManager, DECISION_MS, publicState } from "./rooms";
import { currentPlayer, newGame, reduce, chooseDream, RULES } from "@poyga/rules";

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
    expect(await rm.start(r.code, "u1", 1, { dreams: false })).toEqual({ ok: false, error: "not_host" });
    expect((await rm.start(r.code, "u0", 1, { dreams: false })).ok).toBe(true);
    const room = rm.rooms.get(r.code)!;
    expect(room.members.map((m) => m.bot)).toEqual([false, true]);
  });
});

describe("harakatlar (§6.2)", () => {
  it("eski/takroriy seq rad etiladi, jurnal ketma-ket", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b");
    await rm.start(r.code, "a", 7, { dreams: false });
    expect((await rm.act(r.code, "a", { type: "roll", playerId: "a" }, 0)).ok).toBe(true);
    expect(await rm.act(r.code, "a", { type: "roll", playerId: "a" }, 0)).toEqual({ ok: false, error: "stale_seq" });
    const j = await store.journal(r.code);
    expect(j.map((e) => e.seq)).toEqual([1]);
  });
  it("boshqa o'yinchi nomidan harakat yo'q", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b");
    await rm.start(r.code, "a", 7, { dreams: false });
    expect((await rm.act(r.code, "b", { type: "roll", playerId: "a" }, 0)).ok).toBe(false);
  });
  it("jurnal + urug'dan holat to'liq qayta tiklanadi (nizo uchun)", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b");
    await rm.start(r.code, "a", 99, { dreams: false });
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
    await rm.start(r.code, "a", 3, { dreams: false });
    await clock.advance(DECISION_MS - 1);
    expect(rm.rooms.get(r.code)!.seq).toBe(0);
    await clock.advance(1);
    expect(rm.rooms.get(r.code)!.seq).toBeGreaterThan(0);
  });
  it("xona egasi 60 s tanlasa — navbat 60 s dan keyin avtomatik, ko'rinishda turnSeconds", async () => {
    const r = rm.create("a", undefined, 60); if (!r.ok) throw 0; rm.join(r.code, "b");
    await rm.start(r.code, "a", 3, { dreams: false });
    expect(rm.view(rm.rooms.get(r.code)!).turnSeconds).toBe(60);
    await clock.advance(DECISION_MS + 5_000);
    expect(rm.rooms.get(r.code)!.seq).toBe(0); // 30 s o'tdi, lekin 60 s kutiladi
    await clock.advance(60_000 - DECISION_MS - 5_000);
    expect(rm.rooms.get(r.code)!.seq).toBeGreaterThan(0);
  });
  it("ko'rinishda aktiv kodi bo'yicha asl karta (matn, tur) beriladi — «Mening kartalarim» uchun", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b"); await rm.start(r.code, "a", 3, { dreams: false });
    const room = rm.rooms.get(r.code)!; const buy = Object.values(room.ctx.effects).map((c) => c.effect as any).find((e) => e.kind === "buy" && e.code)!;
    expect(rm.view(room).assetCards).toEqual({});
    room.state!.players[0].assets.push({ kind: "buy", code: buy.code, price: buy.price, monthlyIncome: 100, creditPayment: 0, credit: 0 });
    const v = rm.view(room).assetCards!; expect(v[buy.code].text.length).toBeGreaterThan(5); expect(v[buy.code].asset).toBe(buy.asset);
  });
  it("standart qaror vaqti 30 s va saqlangan xona tiklanganda tanlangan vaqt saqlanadi", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0;
    expect(rm.rooms.get(r.code)!.turnSeconds).toBe(30);
    const r2 = rm.create("c", undefined, 60); if (!r2.ok) throw 0; rm.join(r2.code, "d");
    await rm.start(r2.code, "c", 3, { dreams: false });
    const rm2 = new RoomManager(ctx, store, clock, () => 0.5); await rm2.restore();
    expect(rm2.rooms.get(r2.code)!.turnSeconds).toBe(60);
  });
  it("vaqt tugasa ixtiyoriy karta o'tkaziladi (qabul qilinmaydi)", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b");
    await rm.start(r.code, "a", 3, { dreams: false });
    await clock.advance(DECISION_MS * 60);
    const auto = (await store.journal(r.code)).filter((e) => "reason" in e.action && e.action.action.type === "decide");
    for (const e of auto) if ("reason" in e.action && e.action.action.type === "decide") expect(e.action.action.accept).toBe(false);
  });
  it("uzilish va qayta ulanish: holat saqlanadi, o'yin davom etadi", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b");
    await rm.start(r.code, "a", 3, { dreams: false });
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
    await rm.start(r.code, "a", 3, { dreams: false });
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
    await rm.start(r.code, "a", 3, { dreams: false });
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
    await rm.start(r.code, "a", 3, { dreams: false });
    expect((await rm.act(r.code, "a", { type: "expire", playerId: "server", proposalId: 1 } as any, 0)).ok).toBe(false);
  });
});

describe("orzu tanlash bosqichi (§6.4)", () => {
  it("tanlangunicha o'yin yo'q; orzu takrorlanmaydi; hammasi tanlansa o'yin boshlanadi", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b");
    await rm.start(r.code, "a", 3);
    const room = rm.rooms.get(r.code)!;
    expect(room.state!.phase).toBe("dreams");
    expect(await rm.act(r.code, "a", { type: "roll", playerId: "a" }, 0)).toEqual({ ok: false, error: "dreams_phase" });
    expect((await rm.act(r.code, "a", { type: "choose_dream", playerId: "a", dreamIdx: 2 }, 0)).ok).toBe(true);
    expect(await rm.act(r.code, "b", { type: "choose_dream", playerId: "b", dreamIdx: 2 }, 1)).toEqual({ ok: false, error: "dream_taken" });
    expect(await rm.act(r.code, "b", { type: "choose_dream", playerId: "b", dreamIdx: 999 }, 1)).toEqual({ ok: false, error: "bad_dream" });
    expect((await rm.act(r.code, "b", { type: "choose_dream", playerId: "b", dreamIdx: 3 }, 1)).ok).toBe(true);
    expect(room.state!.phase).toBe("play");
    expect(room.state!.players.map((p) => p.dreamIdx)).toEqual([2, 3]);
  });
  it("vaqt tugasa tanlamaganlarga bo'sh orzular avtomatik beriladi (takrorlanmaydi); jurnaldan qayta o'ynaladi", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b"); rm.join(r.code, "c");
    await rm.start(r.code, "a", 5);
    const room = rm.rooms.get(r.code)!;
    await rm.act(r.code, "a", { type: "choose_dream", playerId: "a", dreamIdx: 0 }, 0);
    await clock.advance(RULES.dreamSeconds * 1000 - 1);
    expect(room.state!.phase).toBe("dreams");
    await clock.advance(1);
    expect(room.state!.phase).toBe("play");
    const d = room.state!.players.map((p) => p.dreamIdx);
    expect(d.every((x) => x !== null)).toBe(true); expect(new Set(d).size).toBe(3); expect(d[0]).toBe(0);
    const j = await store.journal(r.code);
    expect(j.some((e) => "reason" in e.action && e.action.reason === "dream_timeout")).toBe(true);
  });
  it("botlar orzuni o'zi tanlaydi; faqat bot qolsa darrov o'yin", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0;
    await rm.start(r.code, "a", 9); // 1 odam + bot
    const room = rm.rooms.get(r.code)!;
    expect(room.state!.players.find((p) => p.id === "bot-1")!.dreamIdx).not.toBeNull();
    expect(room.state!.phase).toBe("dreams");
    await rm.act(r.code, "a", { type: "choose_dream", playerId: "a", dreamIdx: room.state!.players.find((p) => p.id === "bot-1")!.dreamIdx === 0 ? 1 : 0 }, 0);
    expect(room.state!.phase).toBe("play");
  });
});

describe("orzu bosqichi: chekka holatlar", () => {
  it("muddat harakat bilan uzaymaydi", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b"); rm.join(r.code, "c");
    await rm.start(r.code, "a", 5); const room = rm.rooms.get(r.code)!;
    await clock.advance(50_000);
    await rm.act(r.code, "a", { type: "choose_dream", playerId: "a", dreamIdx: 0 }, 0);
    await rm.act(r.code, "a", { type: "choose_dream", playerId: "a", dreamIdx: 1 }, 1);
    await clock.advance(10_000);
    expect(room.state!.phase).toBe("play");
  });
  it("orzu bosqichida chiqqan o'yinchiga orzu darrov beriladi; takroriy chiqish va chiqqanning harakati rad", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b"); rm.join(r.code, "c");
    await rm.start(r.code, "a", 5); const room = rm.rooms.get(r.code)!;
    rm.leave(r.code, "c"); await clock.advance(0); await new Promise((x) => setImmediate(x));
    expect(room.state!.players.find((p) => p.id === "c")!.dreamIdx).not.toBeNull();
    expect(room.state!.phase).toBe("dreams");
    room.members.find((m) => m.userId === "c")!.unreliable = true; rm.leave(r.code, "c");
    expect(room.members.find((m) => m.userId === "c")!.unreliable).toBe(true); // qayta chaqiruv bayroqni o'zgartirmaydi
    expect(await rm.act(r.code, "c", { type: "choose_dream", playerId: "c", dreamIdx: 5 }, room.seq)).toEqual({ ok: false, error: "not_member" });
  });
});

describe("xona egasi chiqsa", () => {
  it("keyingi odam egasi bo'ladi va o'yinni boshlay oladi; view da hostId bor", async () => {
    const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b"); rm.join(r.code, "c");
    expect(rm.view(rm.rooms.get(r.code)!).hostId).toBe("a");
    rm.leave(r.code, "a");
    expect(rm.view(rm.rooms.get(r.code)!).hostId).toBe("b");
    expect(await rm.start(r.code, "c", 1)).toEqual({ ok: false, error: "not_host" });
    expect((await rm.start(r.code, "b", 1, { dreams: false })).ok).toBe(true);
  });
});

describe("Hisob daftari (o'quv rejimi)", () => {
  const mk = async (mode: "auto" | "manual") => {
    const r = rm.create("a", undefined, 30, mode); if (!r.ok) throw 0; rm.join(r.code, "b"); await rm.start(r.code, "a", 3, { dreams: false });
    const room: any = rm.rooms.get(r.code)!; return { code: r.code, room, cur: (): string => currentPlayer(room.state).id };
  };
  const roll = (g: { code: string; room: any }, id: string) => rm.act(g.code, id, { type: "roll", playerId: id } as any, g.room.seq);
  it("boshida hisob to'g'ri: kubik tashlash mumkin; ko'rinishda rejim va «kutilayotganlar» ro'yxati bor", async () => {
    const g = await mk("manual"); expect(rm.view(g.room).calc).toMatchObject({ mode: "manual", due: [] });
    expect((await roll(g, g.cur())).ok).toBe(true);
  });
  it("pul o'zgardi — o'yinchi hisobini kiritmaguncha kubik tashlay olmaydi; noto'g'ri javob 3 martadan keyin yechimni ko'rsatadi", async () => {
    const g = await mk("manual"); const id = g.cur(), p = g.room.state.players.find((x: any) => x.id === id);
    p.cash += 500; expect(rm.view(g.room).calc!.due).toEqual([id]);
    expect(await roll(g, id)).toMatchObject({ ok: false, error: "calc_due" });
    const act = (calc: any) => rm.act(g.code, id, { type: "confirm_calc", calc, playerId: id } as any, g.room.seq);
    const bad = await act({ cash: 1, passive: 0, flow: 0 }); expect(bad).toMatchObject({ ok: false, error: "calc_wrong" }); expect((bad as any).detail.fields.cash).toBe(false); expect((bad as any).detail.solution).toBeUndefined();
    await act({ cash: 2, passive: 0, flow: 0 }); const third: any = await act({ cash: 3, passive: 0, flow: 0 }); expect(third.detail.tries).toBe(3); expect(third.detail.solution.cash).toBe(p.cash);
    expect((await act(third.detail.solution)).ok).toBe(true); expect(rm.view(g.room).calc!.due).toEqual([]);
    expect((await roll(g, id)).ok).toBe(true); expect(g.room.calcStats[id]).toEqual({ firstTry: 0, retried: 1 });
  });
  it("to'g'ri javob birinchi urinishda hisoblanadi (aniqlik statistikasi)", async () => {
    const g = await mk("manual"); const id = g.cur(), p = g.room.state.players.find((x: any) => x.id === id); p.cash -= 20;
    const ok = await rm.act(g.code, id, { type: "confirm_calc", calc: { cash: p.cash, passive: 0, flow: p.salary - 0 - p.baseExpenses }, playerId: id } as any, g.room.seq);
    if (!ok.ok) { const sol = (ok as any).detail; throw new Error("kutilmagan: " + JSON.stringify(sol)); }
    expect(g.room.calcStats[id]).toEqual({ firstTry: 1, retried: 0 });
  });
  it("karta qarori: pul o'zgarsa hisob shart; o'tkazish (rad) uchun shart emas; to'g'ri hisob bilan qabul qilinadi", async () => {
    const g = await mk("manual"); let id = g.cur(); const P = (i: string) => g.room.state.players.find((x: any) => x.id === i);
    for (let i = 0; i < 600; i++) {
      id = g.cur();
      if (g.room.state.pending) { const e = g.room.ctx.effects[g.room.state.pending.cardId]?.effect as any; if (e?.kind === "buy" && P(id).cash >= (e.down ?? e.price)) break; await rm.act(g.code, id, { type: "decide", accept: false, playerId: id } as any, g.room.seq); }
      else { P(id).cash += 100_000; g.room.ledger[id] = { ...g.room.ledger[id], cash: P(id).cash }; await roll(g, id); }
    }
    expect(g.room.state.pending).toBeTruthy(); id = g.cur(); const me = g.room.state.players.find((x: any) => x.id === id);
    g.room.ledger[id] = { cash: me.cash, passive: g.room.ledger[id].passive, flow: g.room.ledger[id].flow };
    const dec = (calc?: any) => rm.act(g.code, id, { type: "decide", accept: true, ...(calc ? { calc } : {}), playerId: id } as any, g.room.seq);
    expect(await dec()).toMatchObject({ ok: false, error: "calc_required" });
    let last: any; for (let i = 0; i < 3; i++) last = await dec({ cash: 7, passive: 7, flow: 7 }); expect(last.detail.solution).toBeTruthy();
    expect((await dec(last.detail.solution)).ok).toBe(true); expect(g.room.ledger[id].cash).toBe(g.room.state.players.find((x: any) => x.id === id).cash);
  });
  it("avto rejimda hisob so'ralmaydi", async () => {
    const g = await mk("auto"); const id = g.cur(); g.room.state.players.find((x: any) => x.id === id).cash += 500;
    expect(rm.view(g.room).calc!.due).toEqual([]); expect((await roll(g, id)).ok).toBe(true);
  });
  it("vaqt tugab avtomatik harakat bajarilsa — daftar o'zi yangilanadi (o'yin to'xtab qolmaydi)", async () => {
    const g = await mk("manual"); const id = g.cur(); g.room.state.players.find((x: any) => x.id === id).cash += 500;
    await clock.advance(DECISION_MS + 10); expect(rm.view(g.room).calc!.due).not.toContain(id);
  });
});
