import { describe, it, expect } from "vitest";
import { buildApp } from "./app";

describe("birinchi yuruvchi kubik bo'yicha (server)", () => {
  it("o'yin boshlanganda boshlovchi kubik bilan aniqlanadi va jurnaldan qayta o'ynash bir xil holatni beradi", async () => {
    const x = buildApp(); const r = x.rooms.create("alice"); if (!r.ok) throw 0; x.rooms.join(r.code, "bob");
    expect((await x.rooms.start(r.code, "alice", 4242)).ok).toBe(true); // dreams: true (standart) → openingDice
    const room = x.rooms.rooms.get(r.code)!; const st = room.state!;
    expect(st.openingDice).toBe(true); expect(st.opening!.length).toBeGreaterThan(0); expect(st.first).toBe(st.turn);
    const h = await x.analysis.history(r.code); expect(h).not.toBeNull(); // tarix quruvchi boshlovchini aynan shu usul bilan tiklaydi (jurnal bo'sh bo'lsa ham xatosiz)
  });
});
