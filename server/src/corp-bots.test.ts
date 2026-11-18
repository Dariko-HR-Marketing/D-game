// Korporativ xona: botlar yo'q (faqat xodimlar), kamida 2 odam; oddiy xonada esa o'rinlar botlar bilan to'ladi; «Sekin» tezlik 120 soniya (×4).
import { describe, it, expect } from "vitest";
import { MemoryStore } from "./store";
import { ContentRegistry } from "./registry";
import { RoomManager } from "./rooms";

const clock = { now: () => 0, setTimeout: () => 0 as any, clearTimeout: () => {} };
const mk = () => { const rm = new RoomManager(new ContentRegistry(), new MemoryStore(), clock as any, () => 0.5); (rm as any).hooks.noBots = (t: any) => t.kind === "tournament"; return rm; };

describe("Korporativ xona botsiz", () => {
  it("bitta odam bilan boshlanmaydi, ikkitasi bilan botsiz boshlanadi", async () => {
    const rm = mk(); const r = rm.create("a", { kind: "tournament", id: "t1" } as any, 60, "auto", undefined, "standard"); if (!r.ok) throw new Error(r.error);
    expect((await rm.start(r.code, "a", 1))).toEqual({ ok: false, error: "not_enough_players" });
    rm.join(r.code, "b"); // join tag hook yo'q: canJoin o'rnatilmagan
    expect((await rm.start(r.code, "a", 1)).ok).toBe(true);
    expect(rm.rooms.get(r.code)!.members.filter((m) => m.bot).length).toBe(0);
  });
  it("oddiy xonada o'rinlar botlar bilan to'ladi; Sekin = 120", async () => {
    const rm = mk(); const r = rm.create("a", undefined, 120, "auto", 4, "standard"); if (!r.ok) throw new Error(r.error);
    expect(rm.rooms.get(r.code)!.turnSeconds).toBe(120);
    expect((await rm.start(r.code, "a", 1)).ok).toBe(true);
    expect(rm.rooms.get(r.code)!.members.length).toBe(4);
  });
});
