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

import { suyunchiAmounts, myProposals, canOfferPartner, loanBounds, bankRoom, partnerCandidates } from "./model";
const room = (over: any = {}) => ({
  pendingCard: null,
  state: { turn: 0, bots: [] as string[], proposals: [] as any[], players: [
    { id: "a", circle: "small", cash: 1000, salary: 1000, bankDebt: 0, assets: [], handDebts: [] },
    { id: "b", circle: "small", cash: 5000, salary: 800, bankDebt: 0, assets: [], handDebts: [] },
    { id: "c", circle: "big", cash: 5000, salary: 0, bankDebt: 0, assets: [], handDebts: [] }] , ...over.state }, ...over });
describe("hamkorlik yordamchilari", () => {
  it("suyunchi: 10–500, qadam 10, naqddan oshmaydi", () => {
    expect(suyunchiAmounts(35)).toEqual([10, 20, 30]); expect(suyunchiAmounts(1e6)).toHaveLength(50); expect(suyunchiAmounts(5)).toEqual([]);
  });
  it("takliflar to'g'ri odamga ko'rinadi", () => {
    const r: any = room(); r.state.proposals = [
      { id: 1, kind: "suyunchi", parent: "b", given: [] }, { id: 2, kind: "loan", giver: "a", receiver: "b", amount: 1, months: 1 }, { id: 3, kind: "partner", owner: "b", partner: "a", cardId: "x" }];
    const a = myProposals(r, "a"); expect(a.suyunchi).toHaveLength(1); expect(a.loansToAccept).toHaveLength(1); expect(a.partnerToAccept).toHaveLength(1);
    const b = myProposals(r, "b"); expect(b.suyunchi).toHaveLength(0); expect(b.loansPending).toHaveLength(1); expect(b.partnerPending).toHaveLength(1);
    expect(myProposals(r, "c").suyunchi).toHaveLength(0); // katta aylana — suyunchi yo'q
  });
  it("sheriklik taklifi faqat naqd va bank limiti tugaganda", () => {
    const r: any = room({ pendingCard: { effect: { kind: "buy", asset: "business", price: 50_000 } } });
    expect(canOfferPartner(r, "a")).toBe(true);           // 1000 + 10 000 bank < 50 000
    r.pendingCard.effect.price = 5000; expect(canOfferPartner(r, "a")).toBe(false); // bank yetadi
    r.pendingCard.effect.asset = "apartment"; r.pendingCard.effect.price = 50_000; expect(canOfferPartner(r, "a")).toBe(false); // faqat biznes
    r.pendingCard.effect.asset = "business"; expect(canOfferPartner(r, "b")).toBe(false); // navbati emas
  });
  it("qarz chegaralari: beruvchi 20 %, oluvchi limiti; 5 dan kam odam", () => {
    const r: any = room(); const b = loanBounds(r, "a", "b");
    expect(b.max).toBe(1000); expect(b.enough).toBe(false); // min(20 % × 5000, (1000)×0.5×36=18 000)
    expect(bankRoom({ bankDebt: 3600 })).toBe(6400);
    expect(partnerCandidates(r, "a")).toEqual(["b"]);
  });
});
