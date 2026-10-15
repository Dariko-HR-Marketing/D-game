import { describe, it, expect } from "vitest";
import { ctx as base } from "./testctx";
import { Ctx, GameState, newGame, reduce, SMALL_BOARD, currentPlayer } from "./index";
import { CellRules } from "@poyga/content/cellrules";

const idOf = (pred: (id: string, e: any) => boolean) => Object.entries(base.effects).find(([id, c]) => pred(id, c.effect))![0];
/** Tegishli katakka tushiradigan urug' topib, belgilangan kartani deka tepasiga qo'yib bitta yurish qiladi. */
function landWith(ctx: Ctx, deck: "kichik" | "bozor" | "xar" | "hod", cardId: string, cellChar: string, prep: (s: GameState) => void, n = 3) {
  const target = SMALL_BOARD.indexOf(cellChar);
  for (let die = 1; die <= 6; die++) for (let seed = 1; seed < 300; seed++) {
    const s = newGame(ctx, Array.from({ length: n }, (_, i) => `p${i}`), 1); prep(s);
    s.decks[deck].draw = [cardId, ...s.decks[deck].draw.filter((x) => x !== cardId)]; s.players[0].pos = (target - die + 48) % 48; s.rngState = seed;
    const r = reduce(s, ctx, { type: "roll", playerId: "p0" }); if (r.ok && r.die === die) return r.state;
  }
  throw new Error("urug' topilmadi");
}
const car = { kind: "car", code: "AV", price: 1, monthlyIncome: 0, creditPayment: 0, credit: 0 };
const flat = { kind: "apartment", code: "KV1", price: 40_000, monthlyIncome: 500, creditPayment: 0, credit: 0 };

describe("§5.10: 6 yangi karta o'z dekalarida (aks holda hech qachon chiqmaydi)", () => {
  it("MO, XAY — kichik; IJR, Q — bozor; SUG — xar; TOSH — hod", () => {
    const where = (id: string) => Object.entries(base.deckIds).filter(([, v]) => v.includes(id)).map(([k]) => k);
    expect(where("new-MO")).toEqual(["kichik"]); expect(where("new-XAY")).toEqual(["kichik"]); expect(where("new-IJR")).toEqual(["bozor"]);
    expect(where("new-Q")).toEqual(["bozor"]); expect(where("new-SUG")).toEqual(["xar"]); expect(where("new-TOSH")).toEqual(["hod"]);
    expect(base.deckIds.kichik).toHaveLength(84); expect(base.deckIds.bozor).toHaveLength(100); expect(base.deckIds.xar).toHaveLength(86); expect(base.deckIds.hod).toHaveLength(10);
  });
});

describe("«Barcha o'yinchilarga» / «egasiga» tegishli kartalar hammasiga ta'sir qiladi", () => {
  it("qarov: xarajat oshadi — qarovi bor HAR BIR o'yinchiga, boshqalarga yo'q", () => {
    const id = idOf((_i, e) => e.kind === "qarEvent" && e.monthlyExpenseIncrease);
    const s = landWith(base, "bozor", id, "B", (g) => { g.players[1].qar = true; g.players[2].qar = false; g.players[0].qar = false; });
    const inc = (base.effects[id].effect as any).monthlyExpenseIncrease;
    const g0 = newGame(base, ["p0", "p1", "p2"], 1);
    expect(s.players[1].baseExpenses - g0.players[1].baseExpenses).toBe(inc); // p1 (qarov egasi, tortmagan) ham ta'sirlandi
    expect(s.players[2].baseExpenses).toBe(g0.players[2].baseExpenses); expect(s.players[0].baseExpenses).toBe(g0.players[0].baseExpenses);
  });
  it("qarov: majburiy to'lov — faqat egalari to'laydi", () => {
    const id = idOf((_i, e) => e.kind === "qarEvent" && e.payNow && e.scope === "holders");
    const s = landWith(base, "bozor", id, "B", (g) => { for (const p of g.players) p.cash = 10_000; g.players[2].qar = true; });
    const pay = (base.effects[id].effect as any).payNow;
    expect(s.players[2].cash).toBe(10_000 - pay); expect(s.players[1].cash).toBe(10_000); expect(s.players[0].cash).toBe(10_000);
  });
  it("qarov: «faqat kartani olgan» (kasal bo'ldi) — faqat tortgan va faqat qarovi bo'lsa to'laydi", () => {
    const id = idOf((_i, e) => e.kind === "qarEvent" && e.payNow && e.scope === "drawer");
    const holder = landWith(base, "bozor", id, "B", (g) => { for (const p of g.players) p.cash = 10_000; g.players[0].qar = true; g.players[1].qar = true; });
    const pay = (base.effects[id].effect as any).payNow;
    expect(holder.players[0].cash).toBe(10_000 - pay); expect(holder.players[1].cash).toBe(10_000); // p1 ham qarovli, lekin kartani tortmagan
    const none = landWith(base, "bozor", id, "B", (g) => { for (const p of g.players) p.cash = 10_000; });
    expect(none.players[0].cash).toBe(10_000); // qarovi yo'q — qariya yo'q, to'lov yo'q
  });
  it("jahon inqirozi (hod #8): HAMMA o'yinchiga 36 oy (9 aylana × 4 oy) inqiroz boshlanadi", () => {
    const ctx: Ctx = { ...base, cellRules: CellRules.parse({ small: { K: { kind: "drawDeck", deck: "hod" } } }) };
    const s = landWith(ctx, "hod", idOf((_i, e) => e.kind === "marketCrash"), "K", (g) => { for (const p of g.players) p.assets = [{ ...flat }]; });
    for (const p of s.players) expect(p.crisisMonths).toBe(36);
    expect(s.notices.filter((n) => n.key === "crisis_start").map((n) => n.to).sort()).toEqual(["p0", "p1", "p2"]);
  });
});

describe("«Do'stingiz qarzga so'rayapti» → «Qarz qaytdi»", () => {
  const lendId = idOf((_i, e) => e.kind === "lendRequest");
  it("qarz berasiz (naqd kamayadi), keyin qaytish kartasi qarz bergan HAR BIR o'yinchiga 600 beradi, bermaganga yo'q", () => {
    let s = landWith(base, "kichik", lendId, "I", (g) => { g.players[0].cash = 1000; });
    // p0 'I' katagida: kichik yoki katta karta chiqishi naqdga bog'liq (1000 → kichik). Qaror: qabul qilaman
    expect(s.pending?.cardId).toBe(lendId);
    const c0 = s.players[0].cash; let r: any = reduce(s, base, { type: "decide", playerId: "p0", accept: true }); expect(r.ok).toBe(true); s = r.state;
    expect(s.players[0].cash).toBe(c0 - 300); expect(s.players[0].handLoans).toBe(1);
    // endi p1 ham qarz bergan; p2 bermagan; «qarz qaytdi» tortiladi
    s.players[1].handLoans = 1; const before = s.players.map((p) => p.cash);
    const back = landWith(base, "bozor", "new-Q", "B", (g) => { g.players[0].handLoans = 1; g.players[1].handLoans = 1; g.players[2].handLoans = 0; });
    const g0 = newGame(base, ["p0", "p1", "p2"], 1); void before;
    expect(back.players[0].cash - g0.players[0].cash).toBe(600); expect(back.players[1].cash - g0.players[1].cash).toBe(600); expect(back.players[2].cash).toBe(g0.players[2].cash);
    expect(back.players[0].handLoans).toBe(0);
  });
});

describe("Xayriya: daromadning 10 % i, keyingi 3 navbatda 2 kubik", () => {
  const xay = "new-XAY";
  it("to'lov to'g'ri, 3 navbat ikki kubik (2..12), keyin odatdagi bitta kubik", () => {
    let s = landWith(base, "kichik", xay, "I", (g) => { g.players[0].cash = 1000; g.players[0].assets = [{ kind: "business", code: "B", price: 1, monthlyIncome: 100, creditPayment: 0, credit: 0 }]; });
    expect(s.pending?.cardId).toBe(xay);
    const p = s.players[0]; const c0 = p.cash; const expectPay = Math.round(0.1 * (p.salary + 100));
    let r: any = reduce(s, base, { type: "decide", playerId: "p0", accept: true }); s = r.state;
    expect(s.players[0].cash).toBe(c0 - expectPay); expect(s.players[0].twoDice).toBe(3);
    const dice: number[] = [];
    for (let guard = 0; guard < 60 && dice.length < 5; guard++) {
      const me = currentPlayer(s).id; r = reduce(s, base, { type: "roll", playerId: me }); s = r.state;
      if (me === "p0") dice.push(r.die);
      if (s.pending) { r = reduce(s, base, { type: "decide", playerId: me, accept: false }); s = r.state; }
    }
    expect(s.players[0].twoDice).toBe(0); expect(dice.slice(0, 3).every((d) => d >= 2 && d <= 12)).toBe(true); expect(dice.slice(3).every((d) => d >= 1 && d <= 6)).toBe(true);
  });
  it("naqd yetmasa — bank kreditidan (avtomatik emas: useBank bilan)", () => {
    // Xayriya sotib olish emas — bank krediti faqat aktiv sotib olish uchun (qo'llanma §08): kredit olinmaydi, karta ta'sir qilmaydi
    const s = landWith(base, "kichik", xay, "I", (g) => { g.players[0].cash = 10; g.players[0].assets = [{ kind: "apartment", code: "K", price: 90_000, monthlyIncome: 0, creditPayment: 0, credit: 0 }]; });
    const r: any = reduce(s, base, { type: "decide", playerId: "p0", accept: true, useBank: true }); expect(r.ok).toBe(true);
    expect(r.state.players[0].bankDebt).toBe(0); expect(r.state.players[0].twoDice ?? 0).toBe(0);
  });
});
