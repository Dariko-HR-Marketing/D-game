// Ball tizimi — «POYGA o'yin qo'llanmasi» §15.
import { describe, it, expect } from "vitest";
import { gamePoints, POINTS, type ResultPlayer } from "./profiles";
import { buildApp } from "./app";

const base: ResultPlayer = { id: "a", bot: false, circle: "small", restarts: 0, won: false };
describe("o'yin uchun ball", () => {
  it("oxirigacha o'ynash +10; har aktiv +5; ishdan bo'shash +20; katta aylana +40; avtomatik qaror −2", () => {
    expect(gamePoints(base)).toBe(10);
    expect(gamePoints({ ...base, assets: 3 })).toBe(10 + 15);
    expect(gamePoints({ ...base, quitJob: true, circle: "big", autos: 2 })).toBe(10 + 20 + 40 - 4);
  });
  it("g'alaba +100, 2-o'rin +30, 3-o'rin +15, 4-chi — qo'shimcha yo'q", () => {
    expect(gamePoints({ ...base, won: true, place: 1 })).toBe(10 + 100);
    expect(gamePoints({ ...base, place: 2 })).toBe(10 + 30);
    expect(gamePoints({ ...base, place: 3 })).toBe(10 + 15);
    expect(gamePoints({ ...base, place: 4 })).toBe(10);
  });
  it("tashlab ketish −20 (boshqa ball yo'q); ishonchsiz yana −50; bot — 0", () => {
    expect(gamePoints({ ...base, bot: true, left: true, assets: 4, circle: "big" })).toBe(POINTS.abandon);
    expect(gamePoints({ ...base, bot: true, left: true, unreliable: true })).toBe(POINTS.abandon + POINTS.unreliable);
    expect(gamePoints({ ...base, bot: true })).toBe(0);
  });
});

describe("«avtomatik» bayrog'ini mijoz yubora olmaydi", () => {
  it("act: auto bilan kelgan harakat rad etiladi (ball −2 ni faqat server qo'yadi)", async () => {
    const x = buildApp({ now: () => 1_700_000_000_000 } as any) as any;
    const r0 = x.rooms.create("a"); if (!r0.ok) throw 0; x.rooms.join(r0.code, "b"); await x.rooms.start(r0.code, "a", 1, { dreams: false });
    const room = x.rooms.rooms.get(r0.code); const me = room.state.players[room.state.turn % room.state.players.length].id;
    const bad = await x.rooms.act(r0.code, me, { type: "roll", playerId: me, auto: true }, room.seq);
    expect(bad.ok).toBe(false);
    const good = await x.rooms.act(r0.code, me, { type: "roll", playerId: me }, room.seq);
    expect(good.ok).toBe(true);
  });
});
