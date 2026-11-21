import { describe, it, expect, beforeEach } from "vitest";
import { buildCtx } from "./ctx";
import { MemoryStore } from "./store";
import { Clock, RoomManager } from "./rooms";

const ctx = buildCtx();
class FakeClock implements Clock {
  t = 0; q: { at: number; f: () => void; id: number }[] = []; n = 0;
  now() { return this.t; }
  setTimeout(f: () => void, ms: number) { const id = ++this.n; this.q.push({ at: this.t + ms, f, id }); return id; }
  clearTimeout(h: unknown) { this.q = this.q.filter((x) => x.id !== h); }
  async advance(ms: number) { const end = this.t + ms; for (;;) { this.q.sort((a, b) => a.at - b.at); const nx = this.q[0]; if (!nx || nx.at > end) break; this.q.shift(); this.t = nx.at; nx.f(); await new Promise((r) => setImmediate(r)); } this.t = end; }
}
const names: Record<string, string> = { a: "Aziz", b: "Bobur", c: "Charos", d: "Dilnoza" };
let clock: FakeClock, rm: RoomManager;
beforeEach(() => { clock = new FakeClock(); let k = 0; rm = new RoomManager(ctx, new MemoryStore(), clock, () => ((k++ * 0.37) % 1), { profile: (id: string) => (names[id] ? { name: names[id], color: 0 } : undefined) } as any); });
const mk = (host: string, o: any, seats = 4) => { const r = rm.create(host, undefined, 60, "auto", seats, "standard", o); if (!r.ok) throw new Error(r.error); return r.code; };

describe("ochiq o'yinlar ro'yxati (OPEN_QUESTIONS 202)", () => {
  it("eski xona (variantsiz yaratilgan) ro'yxatda yo'q", () => { mk("a", undefined); expect(rm.openRooms()).toEqual([]); });
  it("Ochiq xona kodi bilan, Qulfli xona kodisiz chiqadi; Yashirin chiqmaydi", () => {
    const o = mk("a", { visibility: "open" }), l = mk("b", { visibility: "locked" }), h = mk("c", { visibility: "hidden" });
    const rows = rm.openRooms(); expect(rows.length).toBe(2);
    const open = rows.find((x) => x.host === "Aziz")!, lock = rows.find((x) => x.host === "Bobur")!;
    expect(open.code).toBe(o); expect(open.locked).toBe(false); expect(lock.locked).toBe(true); expect(lock.code).toBeUndefined();
    expect(JSON.stringify(rows)).not.toContain(l); expect(JSON.stringify(rows)).not.toContain(h);
  });
  it("qulfli xonaga kod bilan kirsa bo'ladi (kod — kalit)", () => { const l = mk("b", { visibility: "locked" }); expect(rm.join(l, "d").ok).toBe(true); });
  it("boshlang'ich: variant berilsa Standart — Ochiq, Student — Qulfli, boshlash usuli — «men»", () => {
    mk("a", { kind: "standard" }); mk("b", { kind: "student" }); const rows = rm.openRooms();
    expect(rows.find((x) => x.host === "Aziz")!.locked).toBe(false); expect(rows.find((x) => x.host === "Bobur")!.locked).toBe(true); expect(rows.find((x) => x.host === "Bobur")!.mode).toBe("student");
    expect(rm.rooms.get(mk("c", { visibility: "open" }))!.startMode).toBe("host");
  });
  it("16 yoshgacha egasi: Ochiq so'ralsa ham xona yashirin bo'ladi", () => { mk("a", { visibility: "open", restricted: true }); expect(rm.openRooms()).toEqual([]); });
  it("botlar bilan avtomatik boshlash faqat Yashirin xonada", () => { const r = rm.create("a", undefined, 60, "auto", 4, "standard", { visibility: "open", start: "bots" }); expect(r.ok).toBe(false); expect(mk("b", { visibility: "hidden", start: "bots" })).toBeTruthy(); });
  it("boshlanib ketgan xona ro'yxatdan chiqadi, to'lgan xona oxirida", async () => {
    const a = mk("a", { visibility: "open" }, 2); mk("b", { visibility: "open" }, 4); rm.join(a, "c");
    expect(rm.openRooms().map((x) => x.host)).toEqual(["Bobur", "Aziz"]); // to'lgan xona oxirida
    await rm.start(a, "a", 1); expect(rm.openRooms().map((x) => x.host)).toEqual(["Bobur"]);
  });
  it("ismi yo'q egasi: xona ro'yxatga chiqmaydi", () => { mk("zzz", { visibility: "open" }); expect(rm.openRooms()).toEqual([]); });
});

describe("boshlash usullari", () => {
  it("«men o'zim»: avtoboshlash yo'q, hatto to'lsa ham", async () => { rm.lobbyAutoMs = 60_000; const c = mk("a", { visibility: "open", start: "host" }, 2); rm.join(c, "b"); await clock.advance(120_000); expect(rm.rooms.get(c)!.state).toBeNull(); });
  it("«to'lganda»: to'lsa o'zi boshlanadi, to'lmasa kutadi (avtoboshlash o'chiq bo'lsa ham)", async () => {
    const c = mk("a", { visibility: "open", start: "full" }, 2); await clock.advance(120_000); expect(rm.rooms.get(c)!.state).toBeNull();
    rm.join(c, "b"); await clock.advance(6000); expect(rm.rooms.get(c)!.state).not.toBeNull();
  });
  it("«botlar bilan» (yashirin): lobbyAutoMs o'tgach o'zi boshlanadi; eski xona ham shunday", async () => {
    rm.lobbyAutoMs = 60_000; const c = mk("a", { visibility: "hidden", start: "bots" }, 3), old = mk("b", undefined, 3);
    await clock.advance(61_000); expect(rm.rooms.get(c)!.state).not.toBeNull(); expect(rm.rooms.get(old)!.state).not.toBeNull();
  });
});

describe("ro'yxatdagi zalni yopish", () => {
  it("egasi 5 daqiqa oflayn bo'lsa yopiladi, undan oldin saqlanadi", async () => {
    const c = mk("a", { visibility: "open" }); rm.join(c, "b"); rm.disconnect(c, "a"); rm.rooms.get(c)!; clock.t += 4 * 60_000; await rm.sweep(10 * 60_000); expect(rm.openRooms().length).toBe(1);
    clock.t += 2 * 60_000; await rm.sweep(10 * 60_000); expect(rm.openRooms().length).toBe(0);
  });
  it("faqat egasi 30 daqiqa turib qolsa yopiladi; ikkinchi odam bo'lsa qoladi", async () => {
    const solo = mk("a", { visibility: "open" }), two = mk("b", { visibility: "open" }); rm.join(two, "c");
    clock.t += 31 * 60_000; await rm.sweep(10 * 60_000); const hosts = rm.openRooms().map((x) => x.host); expect(hosts).toEqual(["Bobur"]); expect(rm.rooms.get(solo)!.endedAt).not.toBeNull();
  });
});

describe("saqlash va tiklash", () => {
  it("server qayta ishga tushsa ko'rinish, boshlash usuli va tur saqlanadi", async () => {
    const store = new MemoryStore(); const r1 = new RoomManager(ctx, store, clock, () => 0.5, { profile: (id: string) => (names[id] ? { name: names[id], color: 0 } : undefined) } as any);
    const c = r1.create("a", undefined, 60, "auto", 4, "standard", { kind: "student", start: "full" }); if (!c.ok) throw new Error("create");
    await new Promise((r) => setImmediate(r));
    const r2 = new RoomManager(ctx, store, clock, () => 0.5, { profile: (id: string) => (names[id] ? { name: names[id], color: 0 } : undefined) } as any); await r2.restore();
    const x = r2.rooms.get(c.code)!; expect([x.visibility, x.startMode, x.kind]).toEqual(["locked", "full", "student"]);
    expect(r2.openRooms().map((y) => y.locked)).toEqual([true]);
  });
});
