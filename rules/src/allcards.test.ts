// SPEC §13: «418 kartaning har biri to'g'ri ta'sir qiladi (tanlab emas, 100 %)». Har kartani o'yin dvigateli orqali qo'llab, natijani
// kartaning o'z maydonlaridan mustaqil hisoblangan kutilma bilan solishtiradi.
import { describe, it, expect } from "vitest";
import { ctx, cards } from "./testctx";
import { newGame, reduce, forceCard, crisisMonths, passiveIncome, type GameState, type GamePlayer } from "./index";

const ids = Object.keys(ctx.effects);
const mk = (): GameState => {
  const s = newGame(ctx, ["p0", "p1", "p2"], 7); s.players.forEach((p, i) => (s.players[i] = { ...p, dreamIdx: i, cash: 100_000_000 }));
  s.decks.kichik.draw = []; return s;
};
const run = <T,>(id: string, prep: (p: GamePlayer, s: GameState) => void = () => {}, act: Record<string, unknown> = { accept: true }) => {
  const s = mk(); prep(s.players[0], s); const before = structuredClone(s.players);
  const ce = ctx.effects[id];
  if (ce.mode === "mandatory") forceCard(s, ctx, s.players[0], id);
  else { s.pending = { type: "card", playerId: "p0", cardId: id, deck: ce.deck as any }; const r: any = reduce(s, ctx, { type: "decide", playerId: "p0", ...act } as any); expect(r.ok, `${id}: decide rad etildi`).toBe(true); return { s: r.state as GameState, before }; }
  return { s, before };
};
const car = { kind: "car", code: "AV", price: 5000, monthlyIncome: 0, creditPayment: 0, credit: 0 };
const biz = { kind: "small_business", code: "T1", price: 5000, monthlyIncome: 100, creditPayment: 0, credit: 0 };

describe("418 karta: har biri o'z qoidasi bo'yicha ishlaydi", () => {
  it("kartalar soni 418 va hammasi o'z dekasida", () => {
    expect(ids).toHaveLength(418);
    const inDeck = new Set(Object.values(ctx.deckIds).flat()); const own = ids.filter((i) => ctx.effects[i].deck !== "kasb" && !inDeck.has(i));
    expect(own, "dekada yo'q kartalar").toEqual([]);
  });

  const by = (k: string) => ids.filter((i) => ctx.effects[i].effect.kind === k);

  it.each(by("profession"))("%s: kasb — maosh, jamg'arma, bola xarajati kartadagidek", (id) => {
    const e = ctx.effects[id].effect as any; const k = ctx.kasb[e.n]; const raw = cards.kasb.find((x) => x.n === e.n)!;
    expect(k).toBeDefined(); expect(raw.salary - raw.total).toBe(raw.cf);
    const s = mk(); s.players[0].profession = e.n; expect(ctx.kasb[s.players[0].profession].salary).toBe(raw.salary);
  });

  it.each(by("buy"))("%s: sotib olish — aktiv, boshlang'ich to'lov, kredit, daromad kartadagidek", (id) => {
    const e = ctx.effects[id].effect as any; const { s, before } = run(id, (p) => { p.handDebts.push({ id: 1, to: "p1", amount: 1, months: 1 } as any); }); // ochiq qarz: o'yinchi kichik aylanadan chiqib bizneslarni topshirmasin
    const p = s.players[0], b = before[0]; const a = p.assets.find((x) => x.code === e.code)!;
    expect(a, "aktiv qo'shilmadi").toBeDefined(); expect(a.kind).toBe(e.asset);
    expect(b.cash - p.cash).toBe(e.down ?? e.price); expect(a.price).toBe(e.price);
    expect(a.credit).toBe(e.credit ?? 0); expect(a.monthlyIncome).toBe(e.monthlyIncome ?? 0);
    expect(a.creditPayment).toBe(-(e.creditPayment ?? 0)); // kartada foiz minus bilan yoziladi → xarajat musbat
    if (e.credit !== undefined) expect(e.price - e.down).toBe(e.credit);
  });
  it.each(by("buy"))("%s: pul yetmasa sotib olinmaydi", (id) => {
    const e = ctx.effects[id].effect as any; const { s } = run(id, (p) => (p.cash = (e.down ?? e.price) - 1));
    expect(s.players[0].assets.find((x) => x.code === e.code)).toBeUndefined();
  });

  it.each(by("buyShares"))("%s: aksiya — minimal miqdor, narx, maksimaldan ortig'i rad", (id) => {
    const e = ctx.effects[id].effect as any; const { s, before } = run(id, () => {}, { accept: true, qty: e.min });
    const a = s.players[0].assets.find((x) => x.code === e.code)!; expect(a.shares).toBe(e.min); expect(before[0].cash - s.players[0].cash).toBe(e.min * e.pricePerShare);
    const t = mk(); t.pending = { type: "card", playerId: "p0", cardId: id, deck: ctx.effects[id].deck as any };
    const bad: any = reduce(t, ctx, { type: "decide", playerId: "p0", accept: true, qty: e.max + 1 }); expect(bad.state.players[0].assets.find((x: any) => x.code === e.code)).toBeUndefined();
  });

  it.each(by("gain"))("%s: daromad — naqd kartadagicha oshadi", (id) => {
    const e = ctx.effects[id].effect as any; const { s, before } = run(id); expect(s.players[0].cash - before[0].cash).toBe(e.amount);
  });
  it.each([...by("pay")])("%s: majburiy to'lov — naqd kartadagicha kamayadi", (id) => {
    const e = ctx.effects[id].effect as any;
    const { s, before } = run(id, (p) => { if (e.needs === "child") p.children = 1; if (e.needs === "car") p.assets.push(car as any); }); // shartli xarajat: sharti bajarilgan o'yinchi to'laydi
    expect(before[0].cash - s.players[0].cash).toBe(e.amount);
  });
  it.each(by("pay").filter((id) => (ctx.effects[id].effect as any).needs))("%s: shartli xarajat — sharti yo'q o'yinchi to'lamaydi", (id) => {
    const e = ctx.effects[id].effect as any;
    const { s, before } = run(id, (p) => { p.children = 0; p.assets = []; p.insuredCar = false; p.profession = Number(Object.values(ctx.kasb).find((k: any) => !(k.car > 0))?.n ?? 0); });
    expect(s.players[0].cash).toBe(before[0].cash); expect(e.needs === "child" || e.needs === "car").toBe(true);
  });
  it.each(by("lendRequest"))("%s: qarz so'rovi — beriladi va «qarz» hisoblanadi", (id) => {
    const e = ctx.effects[id].effect as any; const { s, before } = run(id); expect(before[0].cash - s.players[0].cash).toBe(e.amount); expect(s.players[0].handLoans).toBe(1);
  });
  it.each(by("qarOffer"))("%s: qarov taklifi — qabul qilinsa qarov yoqiladi (oylik +100)", (id) => {
    const { s, before } = run(id); expect(s.players[0].qar).toBe(true); expect(before[0].qar).toBe(false);
  });
  it.each(by("courseSalaryPlus"))("%s: malaka oshirish — pul ketadi, ish haqi oshadi", (id) => {
    const e = ctx.effects[id].effect as any; const { s, before } = run(id);
    expect(before[0].cash - s.players[0].cash).toBe(e.price); expect(s.players[0].salary - before[0].salary).toBe(e.salaryPlus);
  });
  it.each(by("charity"))("%s: xayriya — daromadning 10 %% i, 3 navbat 2 kubik", (id) => {
    const { s, before } = run(id, (p) => { p.salary = 1000; p.assets = [{ ...biz, monthlyIncome: 500 } as any]; });
    expect(before[0].cash - s.players[0].cash).toBe(Math.round(0.1 * (1000 + 500))); expect(s.players[0].twoDice).toBe(3);
  });

  it.each(by("carInsurance"))("%s: sug'urta — faqat mashinali o'yinchiga", (id) => {
    const e = ctx.effects[id].effect as any;
    const w = run(id, (p) => (p.assets = [car as any])); expect(w.s.players[0].insuredCar).toBe(true); expect(w.before[0].cash - w.s.players[0].cash).toBe(e.price);
    const wo = run(id); expect(wo.s.players[0].insuredCar).toBe(false); expect(wo.s.players[0].cash).toBe(wo.before[0].cash);
  });
  it.each(by("floodCarRepair"))("%s: toshqin — sug'urtasiz mashinadan to'lov, sug'urtali yoki mashinasiz o'yinchidan yo'q", (id) => {
    const e = ctx.effects[id].effect as any;
    const a = run(id, (p) => (p.assets = [car as any])); expect(a.before[0].cash - a.s.players[0].cash).toBe(e.amount);
    const b = run(id, (p) => { p.assets = [car as any]; p.insuredCar = true; }); expect(b.s.players[0].cash).toBe(b.before[0].cash);
    const c = run(id); expect(c.s.players[0].cash).toBe(c.before[0].cash);
  });
  it.each(by("tenantLeft"))("%s: ijarachi ketdi — ijara daromadi yo'qoladi (bir oylik)", (id) => {
    const r = run(id, (p) => (p.assets = [{ kind: "apartment", code: "KV1", price: 1, monthlyIncome: 300, creditPayment: 0, credit: 0 } as any]));
    expect(r.before[0].cash - r.s.players[0].cash).toBe(300);
    const none = run(id); expect(none.s.players[0].cash).toBe(none.before[0].cash);
  });
  it.each(by("businessIncomeIncrease"))("%s: biznes daromadi oshadi (biznesi borda)", (id) => {
    const e = ctx.effects[id].effect as any;
    const r = run(id, (p) => (p.assets = [biz as any])); expect(r.s.players[0].assets[0].monthlyIncome - 100).toBe(e.amount);
    const none = run(id); expect(passiveIncome(none.s.players[0])).toBe(passiveIncome(none.before[0]));
  });
  it.each(by("qarEvent"))("%s: qarov hodisasi — kimga tegishliligi (tortgan / qarov egalari)", (id) => {
    const e = ctx.effects[id].effect as any;
    const r = run(id, (p, s) => { p.qar = true; if (e.scope === "holders") { s.players[1].qar = true; } });
    const d = (i: number) => ({ cash: r.before[i].cash - r.s.players[i].cash, exp: r.s.players[i].baseExpenses - r.before[i].baseExpenses });
    const eff = { cash: (e.payNow ?? 0) - (e.gainNow ?? 0), exp: e.monthlyExpenseIncrease ?? 0 }; // gainNow: meros kvartira sotuvi (qarov egalari naqd oladi)
    expect(d(0)).toEqual(eff);
    expect(d(1)).toEqual(e.scope === "holders" ? eff : { cash: 0, exp: 0 });
    expect(d(2)).toEqual({ cash: 0, exp: 0 });           // qarovsiz o'yinchiga ta'sir qilmaydi
  });
  it.each(by("debtRepaid"))("%s: qarz qaytdi — faqat qarz bergan o'yinchilarga", (id) => {
    const e = ctx.effects[id].effect as any; const r = run(id, (p, s) => { s.players[1].handLoans = 1; });
    expect(r.s.players[1].cash - r.before[1].cash).toBe(e.amount); expect(r.s.players[1].handLoans).toBe(0); expect(r.s.players[0].cash).toBe(r.before[0].cash);
  });
  it.each(by("marketCrash"))("%s: jahon inqirozi — hamma o'yinchida 36 oy", (id) => {
    const r = run(id); for (const p of r.s.players) expect(p.crisisMonths).toBe(crisisMonths()); expect(crisisMonths()).toBe(36);
  });
  it.each(by("payOrLoseBusiness"))("%s: tanlov — to'lash yoki eng kam daromadli biznesni yo'qotish", (id) => {
    const e = ctx.effects[id].effect as any;
    const pay = run(id, (p) => (p.assets = [biz as any]), { accept: true }); expect(pay.before[0].cash - pay.s.players[0].cash).toBe(e.amount); expect(pay.s.players[0].assets).toHaveLength(1);
    const lose = run(id, (p) => (p.assets = [{ ...biz, code: "A", monthlyIncome: 50 } as any, { ...biz, code: "B", monthlyIncome: 500 } as any]), { accept: false });
    expect(lose.s.players[0].cash).toBe(lose.before[0].cash); expect(lose.s.players[0].assets.map((a) => a.code)).toEqual(["B"]);
    const none = run(id, () => {}, { accept: false }); expect(none.before[0].cash - none.s.players[0].cash).toBe(e.amount); // biznes yo'q — to'lov majburiy
  });

  // Bozor: sotish imkoniyati — har bir nishon uchun narx kartadagi qoida bo'yicha
  const sales = by("marketSale");
  it.each(sales)("%s: bozor — mos aktiv kartadagi narxda sotiladi, mos kelmagani sotilmaydi", (id) => {
    const e = ctx.effects[id].effect as any;
    for (const t of e.targets as string[]) {
      const code = t === "KV*" ? "KV1" : t, kind = /^KV/i.test(code) ? "apartment" : /^E$|^Ye$/i.test(code) ? "land" : /^D/i.test(code) ? "land" : "business";
      const asset = { kind, code, price: 1000, monthlyIncome: 0, creditPayment: 0, credit: 0, marketValue: 1000 } as any;
      const s = mk(); s.players[0].assets = [asset]; s.proposals.push({ id: 1, kind: "market", cardId: id, sold: [] });
      const r: any = reduce(s, ctx, { type: "market_sell", playerId: "p0", proposalId: 1 });
      expect(r.ok, `${id} nishon ${t}`).toBe(true);
      let want: number;
      if (typeof e.amount === "number") want = e.amount;
      else if ("multiply" in e.amount) want = 1000 * e.amount.multiply;
      else if ("percent" in e.amount) want = 1000 * (1 + e.amount.percent / 100);
      else if ("addByType" in e.amount) want = 1000 + e.amount.addByType[code.slice(0, 3)];
      else want = e.amount[t];
      expect(r.state.players[0].cash - 100_000_000, `${id} nishon ${t}`).toBe(Math.round(want)); expect(r.state.players[0].assets).toHaveLength(0);
    }
    const s = mk(); s.players[0].assets = [{ kind: "car", code: "ZZZ", price: 1, monthlyIncome: 0, creditPayment: 0, credit: 0 } as any]; s.proposals.push({ id: 1, kind: "market", cardId: id, sold: [] });
    expect((reduce(s, ctx, { type: "market_sell", playerId: "p0", proposalId: 1 }) as any).error).toBe("nothing_to_sell");
  });
});
