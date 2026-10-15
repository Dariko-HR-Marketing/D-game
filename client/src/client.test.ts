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
    c.connect(); const w1 = FakeWS.all[0]; w1.onopen(); c.create();
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

import { httpBase, makeHttp, validName, validYear, isUnder16, HttpError, DELETE_WORD } from "./net/http";
describe("profil yordamchilari", () => {
  it("ws→http, tekshiruvlar, 16 yosh", () => {
    expect(httpBase("ws://h:3000")).toBe("http://h:3000"); expect(httpBase("wss://h")).toBe("https://h");
    expect(validName("A")).toBe(false); expect(validName("Ali")).toBe(true); expect(validName("<b>")).toBe(false);
    expect(validYear("1899", 2026)).toBe(false); expect(validYear("2000", 2026)).toBe(true); expect(validYear("2027", 2026)).toBe(false);
    expect(isUnder16("2011", 2026)).toBe(true); expect(isUnder16("2010", 2026)).toBe(false); expect(DELETE_WORD).toBe("O'CHIRISH");
  });
  it("HTTP xatosi kod bilan", async () => {
    const f = (async () => ({ ok: false, status: 400, json: async () => ({ error: "bad_name" }) })) as any;
    await expect(makeHttp("http://s", "t", f).saveProfile({ name: "", color: 0, birthYear: 1 })).rejects.toMatchObject({ status: 400, code: "bad_name" });
    expect(new HttpError(409, "in_game").code).toBe("in_game");
  });
});

import { marketOffers } from "./model";
describe("bozor taklifi (mijoz)", () => {
  it("faqat mos aktivi bor o'yinchiga, kreditdan keyingi sof summa bilan", () => {
    const r: any = room(); r.state.players[0].assets = [{ kind: "apartment", code: "KV1", credit: 5000, price: 30000, monthlyIncome: 0, marketValue: 60000 }];
    r.state.proposals = [{ id: 7, kind: "market", cardId: "x", sold: [] }];
    r.marketCards = { 7: { text: "Xaridor", effect: { kind: "marketSale", targets: ["KV1"], amount: 20000 } } };
    expect(marketOffers(r, "a")).toEqual([{ proposalId: 7, text: "Xaridor", assetCode: "KV1", price: 20000, net: 15000 }]);
    expect(marketOffers(r, "b")).toEqual([]);
    r.state.proposals[0].sold = ["a"]; expect(marketOffers(r, "a")).toEqual([]);
  });
});

import { bars, downsample } from "./analysisView";
describe("tahlil ko'rinishi", () => {
  it("downsample: chegara, oxirgi nuqta saqlanadi, tartib", () => {
    const xs = Array.from({ length: 100 }, (_, i) => i);
    const d = downsample(xs, 10); expect(d).toHaveLength(10); expect(d[0]).toBe(0); expect(d.at(-1)).toBe(99); expect([...d].sort((a, b) => a - b)).toEqual(d);
    expect(downsample([1, 2, 3], 10)).toEqual([1, 2, 3]);
  });
  it("ustunlar: manfiy qizil, nisbiy balandlik ≤ 1, hammasi nol bo'lsa ham xato yo'q", () => {
    expect(bars([50, -100, 0])).toEqual([{ h: 0.5, neg: false }, { h: 1, neg: true }, { h: 0, neg: false }]);
    expect(bars([0, 0]).every((x) => x.h === 0)).toBe(true);
  });
});

describe("eski holat (stale_seq) da avtomatik qayta urinish", () => {
  const state = (seq: number) => JSON.stringify({ type: "state", room: { code: "ABC234", members: [], state: null, seq, deadline: null, pendingCard: null } });
  const mk = () => { FakeWS.all = []; const c = new Connection("ws://x", "t", (u) => new FakeWS(u), () => 0); c.connect(); const w = FakeWS.all[0]; w.onopen(); c.create(); w.onmessage({ data: state(5) }); return { c, w }; };
  it("xato ko'rsatilmaydi; yangi holat kelgach harakat yangi seq bilan bir marta qayta yuboriladi", () => {
    const { c, w } = mk(); c.act({ type: "roll" });
    w.onmessage({ data: JSON.stringify({ type: "error", error: "stale_seq" }) });
    expect(c.state.error).toBeNull(); const before = w.sent.length;
    w.onmessage({ data: state(6) });
    expect(w.sent.length).toBe(before + 1); expect(JSON.parse(w.sent.at(-1)!)).toEqual({ type: "act", seq: 6, action: { type: "roll" } });
  });
  it("ikkinchi stale_seq da qayta urinmaydi (cheksiz tsikl yo'q) va xatoni ko'rsatadi", () => {
    const { c, w } = mk(); c.act({ type: "roll" });
    w.onmessage({ data: JSON.stringify({ type: "error", error: "stale_seq" }) }); w.onmessage({ data: state(6) });
    const n = w.sent.length;
    w.onmessage({ data: JSON.stringify({ type: "error", error: "stale_seq" }) }); expect(c.state.error).toBe("stale_seq");
    w.onmessage({ data: state(7) }); expect(w.sent.length).toBe(n);
  });
  it("boshqa xatolar qayta uringa sabab bo'lmaydi; yangi harakat hisobni yangilaydi", () => {
    const { c, w } = mk(); c.act({ type: "roll" });
    w.onmessage({ data: JSON.stringify({ type: "error", error: "not_your_turn" }) }); expect(c.state.error).toBe("not_your_turn");
    const n = w.sent.length; w.onmessage({ data: state(6) }); expect(w.sent.length).toBe(n);
  });
});

describe("reaksiyalar (mijoz)", () => {
  it("so'nggi 3 tasi saqlanadi, tartibda; chiqishda tozalanadi; react xabari yuboriladi", () => {
    FakeWS.all = []; const c = new Connection("ws://x", "t", (u) => new FakeWS(u), () => 0); c.connect(); const w = FakeWS.all[0]; w.onopen();
    for (const e of ["👍", "👏", "😮", "😂"]) w.onmessage({ data: JSON.stringify({ type: "reaction", from: "u1", emoji: e, at: 1 }) });
    expect(c.state.reactions.map((r) => r.emoji)).toEqual(["👏", "😮", "😂"]);
    c.react("👍"); expect(JSON.parse(w.sent.at(-1)!)).toEqual({ type: "react", emoji: "👍" });
    c.leave(); expect(c.state.reactions).toEqual([]);
  });
});

describe("chiqqandan keyin tasodifiy holat xabari xonani qaytarmaydi", () => {
  it("leave() dan keyin kelgan 'state' e'tiborga olinmaydi; create/join dan keyin qabul qilinadi", () => {
    FakeWS.all = []; const c = new Connection("ws://x", "t", (u) => new FakeWS(u), () => 0); c.connect(); const w = FakeWS.all[0]; w.onopen();
    const st = (seq: number) => ({ data: JSON.stringify({ type: "state", room: { code: "ABC234", members: [], state: null, seq, deadline: null, pendingCard: null } }) });
    c.create(); w.onmessage(st(1)); expect(c.state.room?.code).toBe("ABC234");
    c.leave(); expect(c.state.room).toBeNull(); w.onmessage(st(2)); expect(c.state.room).toBeNull(); // yo'lda qolgan xabar
    c.join("abc234"); w.onmessage(st(3)); expect(c.state.room?.seq).toBe(3);
  });
});

describe("taxta burilishi (§9: telefonda 90°)", () => {
  it("turns=0: START tepada; turns=3: START chapda; to'liq aylanish (4) asl holatga qaytadi", () => {
    const top = ringPosition(0, 48), left = ringPosition(0, 48, 0.44, 3);
    expect(top.x).toBeCloseTo(0.5); expect(top.y).toBeCloseTo(0.06);
    expect(left.x).toBeCloseTo(0.06); expect(left.y).toBeCloseTo(0.5);
    const full = ringPosition(7, 48, 0.44, 4), base = ringPosition(7, 48); expect(full.x).toBeCloseTo(base.x); expect(full.y).toBeCloseTo(base.y);
  });
});

import { cardImageUrl } from "./cardImage";
describe("karta rasmi manzili (§2.5)", () => {
  it("to'g'ri fayl nomi manzilga aylanadi; oxiridagi / olib tashlanadi", () => {
    expect(cardImageUrl("/cards", "KB_001.png")).toBe("/cards/KB_001.png"); expect(cardImageUrl("/cards", "11_G'AZNACHI.png")).toBe("/cards/11_G'AZNACHI.png"); expect(cardImageUrl("https://cdn.example/cards/", "01_BEGONA_FIRMA_DIREKTORI.png")).toBe("https://cdn.example/cards/01_BEGONA_FIRMA_DIREKTORI.png");
  });
  it("yo'l o'tishi, begona kengaytma, bo'sh nom rad etiladi", () => {
    for (const f of ["../secret.png", "a/b.png", "x.png?evil=1", "x.svg", "x.html", "", "a b.png", "<img>.png"]) expect(cardImageUrl("/cards", f), f).toBeNull();
    expect(cardImageUrl("/cards", undefined)).toBeNull(); expect(cardImageUrl("/cards", null)).toBeNull();
  });
});

import { sameWord } from "./net/http";
describe("o'chirish so'zi", () => {
  it("apostrof variantlari va registr farqi qabul qilinadi", () => {
    for (const w of ["O'CHIRISH", "o'chirish", "Oʻchirish", "O’CHIRISH", " O‘CHIRISH "]) expect(sameWord(w)).toBe(true);
    expect(sameWord("OCHIRISH")).toBe(false);
  });
});

import { validPhone, validCode, makeAuth } from "./net/http";
describe("kirish (SMS)", () => {
  it("telefon va kod tekshiruvi", () => {
    for (const p of ["90 123 45 67", "+998901234567", "(90)123-45-67"]) expect(validPhone(p)).toBe(true);
    for (const p of ["", "12", "abc", "+99890"]) expect(validPhone(p)).toBe(false);
    expect(validCode("123456")).toBe(true); expect(validCode("12345")).toBe(false); expect(validCode("12a456")).toBe(false);
  });
  it("makeAuth: so'rov shakli va xato kodi", async () => {
    const calls: any[] = []; const f: any = async (u: string, i?: any) => { calls.push([u, i]); return u.endsWith("/verify") ? { ok: false, status: 401, json: async () => ({ error: "bad_code" }) } : { ok: true, status: 200, json: async () => ({ sms: true, dev: false }) }; };
    const a = makeAuth("http://x", f); expect(await a.config()).toEqual({ sms: true, dev: false });
    await a.request("+998901234567"); expect(JSON.parse(calls[1][1].body)).toEqual({ phone: "+998901234567" });
    await expect(a.verify("+998901234567", "000000")).rejects.toMatchObject({ code: "bad_code", status: 401 });
  });
});

import { readFileSync } from "node:fs";
import { uz as uzText } from "./i18n/uz";
describe("xato kodlari o'zbekcha matnga ega", () => {
  it("dvigatel, xona, ilova va protokoldagi har bir xato kodi uchun matn bor", () => {
    const files = ["../../rules/src/game.ts", "../../server/src/rooms.ts", "../../server/src/app.ts", "../../server/src/protocol.ts"];
    const codes = new Set<string>();
    for (const f of files) for (const m of readFileSync(decodeURIComponent(new URL(f, import.meta.url).pathname), "utf-8").matchAll(/err\("([a-z_0-9]+)"\)|error: "([a-z_0-9]+)"/g)) codes.add(m[1] ?? m[2]);
    const missing = [...codes].filter((c) => !(c in uzText.errors));
    expect(missing).toEqual([]); expect(codes.size).toBeGreaterThan(50);
  });
});
