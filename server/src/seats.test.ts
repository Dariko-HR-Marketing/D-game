import { describe, it, expect } from "vitest";
import { buildApp } from "./app";
import { parseMessage } from "./protocol";

describe("oldindan belgilangan o'yinchilar soni (xona egasi tanlaydi)", () => {
  it("2–8 tanlanadi; to'lgach qo'shilib bo'lmaydi; noto'g'ri son rad etiladi", () => {
    const x = buildApp();
    for (const bad of [1, 9, 2.5, 0]) { expect(x.rooms.create("h" + bad, undefined, 30, "auto", bad)).toEqual({ ok: false, error: "bad_seats" }); }
    const r = x.rooms.create("host", undefined, 30, "auto", 3); if (!r.ok) throw 0;
    expect(x.rooms.view(x.rooms.rooms.get(r.code)!).seats).toBe(3);
    expect(x.rooms.join(r.code, "a")).toEqual({ ok: true }); expect(x.rooms.join(r.code, "b")).toEqual({ ok: true });
    expect(x.rooms.join(r.code, "c")).toEqual({ ok: false, error: "room_full" });
  });
  it("odam yetmasa boshlanganda qolgan o'rinlarni botlar egallaydi (host yolg'iz ham boshlay oladi)", async () => {
    for (const seats of [2, 3, 4, 5, 6]) {
      const x = buildApp(); const r = x.rooms.create("host", undefined, 30, "auto", seats); if (!r.ok) throw 0;
      expect((await x.rooms.start(r.code, "host", 7, { dreams: false })).ok).toBe(true);
      const room = x.rooms.rooms.get(r.code)!; expect(room.state!.players).toHaveLength(seats);
      expect(room.members.filter((m) => m.bot)).toHaveLength(seats - 1); expect(room.members.filter((m) => !m.bot)).toHaveLength(1);
    }
  });
  it("odamlar ko'p bo'lsa kamroq bot: 4 kishilik xonada 2 odam + 2 bot", async () => {
    const x = buildApp(); const r = x.rooms.create("host", undefined, 30, "auto", 4); if (!r.ok) throw 0; x.rooms.join(r.code, "bob");
    await x.rooms.start(r.code, "host", 9, { dreams: false });
    const m = x.rooms.rooms.get(r.code)!.members; expect(m.filter((q) => q.bot)).toHaveLength(2); expect(m).toHaveLength(4);
  });
  it("o'rinlar soni belgilanmasa avvalgidek (6 gacha qo'shilish, 2 tagacha bot)", async () => {
    const x = buildApp(); const r = x.rooms.create("host"); if (!r.ok) throw 0;
    await x.rooms.start(r.code, "host", 3, { dreams: false }); expect(x.rooms.rooms.get(r.code)!.state!.players).toHaveLength(2);
  });
  it("protokol: players 2–8 qabul qilinadi", () => {
    expect(parseMessage(JSON.stringify({ type: "create", players: 4 })).ok).toBe(true);
    expect(parseMessage(JSON.stringify({ type: "create", players: 1 })).ok).toBe(false); expect(parseMessage(JSON.stringify({ type: "create", players: 9 })).ok).toBe(false);
  });
});
