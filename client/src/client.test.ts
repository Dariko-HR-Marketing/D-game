import { describe, it, expect } from "vitest";
import { money, sh } from "./format";
import { ringPosition } from "./boardLayout";
import { Connection, WS } from "./net/connection";
import { errText, uz } from "./i18n/uz";

describe("pul formati (§2.3)", () => {
  it("to'liq yoziladi", () => { expect(money(1020000)).toBe("1 020 000"); expect(money(950)).toBe("950"); expect(money(0)).toBe("0"); expect(money(-25400)).toBe("−25 400"); expect(sh(10000)).toBe("10 000 sh.b."); });
});
describe("halqa joylashuvi", () => {
  it("48 va 53 katak: takrorlanmas, kvadrat ichida", () => {
    for (const n of [48, 53]) {
      const pts = Array.from({ length: n }, (_, i) => ringPosition(i, n));
      expect(new Set(pts.map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`)).size).toBe(n);
      expect(pts.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1)).toBe(true);
    }
  });
});
describe("matnlar jadvali", () => {
  it("xato kodlari o'zbekcha, noma'lum kod uchun umumiy matn", () => { expect(errText("room_full")).toContain("to'la"); expect(errText("zzz")).toBe(uz.errors.unknown); });
});

class FakeWS implements WS {
  static all: FakeWS[] = []; sent: string[] = [];
  onopen: any = null; onclose: any = null; onmessage: any = null;
  constructor(public url: string) { FakeWS.all.push(this); }
  send(s: string) { this.sent.push(s); } close() { this.onclose?.(); }
}
describe("ulanish", () => {
  it("uzilsa qayta ulanadi va xonaga qaytadan qo'shiladi; harakat seq bilan", () => {
    FakeWS.all = []; const timers: (() => void)[] = [];
    const c = new Connection("ws://x", "tok", (u) => new FakeWS(u), (f) => { timers.push(f); return 0; });
    c.connect(); const w1 = FakeWS.all[0]; w1.onopen();
    expect(w1.url).toBe("ws://x/ws?token=tok");
    w1.onmessage({ data: JSON.stringify({ type: "state", room: { code: "ABC234", members: [], state: null, seq: 5, deadline: null, pendingCard: null } }) });
    c.act({ type: "roll" });
    expect(JSON.parse(w1.sent.at(-1)!)).toEqual({ type: "act", seq: 5, action: { type: "roll" } });
    w1.onclose(); expect(c.state.status).toBe("offline");
    timers.shift()!(); const w2 = FakeWS.all[1]; w2.onopen();
    expect(c.state.status).toBe("online");
    expect(JSON.parse(w2.sent[0])).toEqual({ type: "join", code: "ABC234" });
  });
  it("xato holatga yoziladi", () => {
    FakeWS.all = []; const c = new Connection("ws://x", "t", (u) => new FakeWS(u), () => 0); c.connect();
    FakeWS.all[0].onmessage({ data: JSON.stringify({ type: "error", error: "room_full" }) });
    expect(c.state.error).toBe("room_full");
  });
});
