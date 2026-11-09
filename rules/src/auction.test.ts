import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { newGame, reduce, startAuction, nextDefault, botAuctionAction, RULES, type GameState, type GamePlayer, type Asset } from "./index";
import { takeLombard, takeBankLoan, tickLoans } from "./engine";

const biz = (price: number, n = 0, extra: Partial<Asset> = {}): Asset => ({ kind: "small_business", code: `B${n}`, price, monthlyIncome: 500, creditPayment: 0, credit: 0, ...extra });
const P = (s: GameState, id: string) => s.players.find((p) => p.id === id)!;
const act = (s: GameState, a: any) => { const r = reduce(s, ctx, a); if (!r.ok) throw new Error(r.error); return r.state; };
const err = (s: GameState, a: any) => { const r = reduce(s, ctx, a); if (r.ok) throw new Error("kutilgan xato yo'q"); return r.error; };

/** a: egasi (lombard garovi 20 000 lik biznes, muddati o'tgan), b/c: takliflovchilar. */
function lombardCase(opts: { aCash?: number; restricted?: string[]; bots?: string[] } = {}) {
  let s = newGame(ctx, ["a", "b", "c"], 1, opts.bots ?? [], opts.restricted ?? [], { halalFin: true });
  for (const p of s.players) { p.circle = "small"; p.cash = 0; p.assets = []; p.bankLoans = []; p.lombards = []; p.owe = 0; p.children = 0; }
  const a = P(s, "a"); a.assets = [biz(20_000, 0), biz(1000, 9)]; a.cash = opts.aCash ?? 0;
  Object.assign(a, takeLombard(a as any, 0).player); a.cash = 0;
  for (let i = 0; i < RULES.lombardTermMonths; i++) Object.assign(a, tickLoans(a as any)); // muddat oxirida naqd yo'q: to'lanmadi
  a.cash = opts.aCash ?? 0;
  P(s, "b").cash = 100_000; P(s, "c").cash = 100_000;
  startAuction(s);
  return s;
}
// takeLombard: amount 10 000, haq 5 000 (50 %), 12 oyda haq to'liq to'langan deb hisoblanadi (cashflow orqali) → qarz = 10 000

describe("garov auksioni: ochilishi", () => {
  it("muddati o'tgan lombard avval egasiga taklif qilinadi; boshlang'ich narx = bank qarzi", () => {
    const s = lombardCase({ aCash: 50_000 });
    expect(s.auction).toBeTruthy(); expect(s.auction!.phase).toBe("owner"); expect(s.auction!.owner).toBe("a");
    expect(s.auction!.due).toBe(10_000); expect(s.auction!.reserve).toBe(10_000); expect(s.auction!.lot).toHaveLength(1);
  });
  it("egasida qarzni to'lashga pul bo'lmasa to'g'ridan-to'g'ri hammaga ochiladi", () => {
    const s = lombardCase({ aCash: 100 }); expect(s.auction!.phase).toBe("open");
  });
  it("auksion ochiq turganda boshqa harakatlar to'xtaydi", () => {
    const s = lombardCase({ aCash: 100 });
    expect(err(s, { type: "roll", playerId: "a" })).toBe("auction_open");
    expect(err(s, { type: "bank_loan", playerId: "a", amount: 2000 })).toBe("auction_open");
  });
  it("eski o'yinlarda (halalFin yo'q) auksion ochilmaydi", () => {
    const s = lombardCase({ aCash: 100 }); s.auction = null; s.halalFin = false; startAuction(s); expect(s.auction).toBeNull();
  });
});

describe("garov auksioni: egasi", () => {
  it("qarzni to'lab, aktivini saqlab qoladi", () => {
    let s = lombardCase({ aCash: 50_000 }); s = act(s, { type: "auction_buyback", playerId: "a" });
    expect(s.auction).toBeNull(); expect(P(s, "a").cash).toBe(40_000); expect(P(s, "a").assets).toHaveLength(2);
    expect(P(s, "a").lombards).toHaveLength(0); expect(P(s, "a").assets.every((x) => !x.pledged)).toBe(true);
  });
  it("faqat egasi, faqat o'z bosqichida", () => {
    const s = lombardCase({ aCash: 50_000 });
    expect(err(s, { type: "auction_buyback", playerId: "b" })).toBe("not_owner");
    expect(err(s, { type: "auction_bid", playerId: "b", amount: 10_000 })).toBe("auction_phase");
  });
  it("rad etsa auksion ochiladi", () => {
    let s = lombardCase({ aCash: 50_000 }); s = act(s, { type: "auction_decline", playerId: "a" }); expect(s.auction!.phase).toBe("open");
  });
});

describe("garov auksioni: takliflar", () => {
  const open = () => lombardCase({ aCash: 100 });
  it("eng kam taklif — boshlang'ich narx; keyingisi kamida qadamga yuqori; o'zini oshira olmaydi", () => {
    let s = open();
    expect(err(s, { type: "auction_bid", playerId: "b", amount: 9_900 })).toBe("bid_low");
    expect(err(s, { type: "auction_bid", playerId: "b", amount: 10_050 })).toBe("invalid_amount");
    s = act(s, { type: "auction_bid", playerId: "b", amount: 10_000 });
    expect(s.auction!.best).toEqual({ playerId: "b", amount: 10_000 });
    expect(err(s, { type: "auction_bid", playerId: "c", amount: 10_000 })).toBe("bid_low");
    expect(err(s, { type: "auction_bid", playerId: "b", amount: 12_000 })).toBe("already_leader");
    s = act(s, { type: "auction_bid", playerId: "c", amount: 10_000 + RULES.auctionBidStep }); expect(s.auction!.best!.playerId).toBe("c");
  });
  it("egasi taklif qila olmaydi; naqdi yetmagan ham", () => {
    const s = open(); P(s, "c").cash = 5_000;
    expect(err(s, { type: "auction_bid", playerId: "a", amount: 10_000 })).toBe("owner_cannot_bid");
    expect(err(s, { type: "auction_bid", playerId: "c", amount: 10_000 })).toBe("insufficient_cash");
  });
  it("16 yoshgacha (cheklangan) o'yinchi va boshqa aylanadagi o'yinchi taklif qila olmaydi", () => {
    const s = lombardCase({ aCash: 100, restricted: ["b"] }); P(s, "c").circle = "big";
    expect(err(s, { type: "auction_bid", playerId: "b", amount: 10_000 })).toBe("not_eligible");
    expect(err(s, { type: "auction_bid", playerId: "c", amount: 10_000 })).toBe("not_eligible");
  });
  it("hamma o'tkazsa va taklif bo'lmasa — bank garovni aktiv narxida oladi, ortiqchasi egasiga qaytadi", () => {
    let s = open(); s = act(s, { type: "auction_pass", playerId: "b" }); s = act(s, { type: "auction_pass", playerId: "c" });
    expect(s.auction).toBeNull(); expect(P(s, "a").assets).toHaveLength(1); expect(P(s, "a").lombards).toHaveLength(0);
    expect(P(s, "a").cash).toBe(100 + (20_000 - 10_000));
  });
  it("vaqt tugasa (server): yetakchi sotib oladi; bank o'z haqini olib, ORTIQCHASINI egasiga qaytaradi", () => {
    let s = open(); s = act(s, { type: "auction_bid", playerId: "b", amount: 10_000 }); s = act(s, { type: "auction_bid", playerId: "c", amount: 16_000 });
    s = act(s, { type: "auction_close", playerId: "server" });
    expect(s.auction).toBeNull();
    expect(P(s, "c").cash).toBe(100_000 - 16_000); expect(P(s, "c").assets).toHaveLength(1); expect(P(s, "c").assets[0].pledged).toBeUndefined();
    expect(P(s, "c").assets[0].price).toBe(16_000); // keyingi sotuvda arbitraj bo'lmasin
    expect(P(s, "b").cash).toBe(100_000);
    expect(P(s, "a").cash).toBe(100 + (16_000 - 10_000)); expect(P(s, "a").lombards).toHaveLength(0); expect(P(s, "a").assets).toHaveLength(1);
  });
  it("aktivning o'z krediti sotuvdan yopiladi (boshlang'ich narxga qo'shiladi)", () => {
    const s = open(); s.auction!.lot[0].credit = 3_000;
    let s2 = lombardCaseWithCredit();
    expect(s2.auction!.reserve).toBe(10_000 + 3_000);
    s2 = act(s2, { type: "auction_bid", playerId: "b", amount: 13_000 }); // boshqa takliflovchining puli yo'q — auksion darhol yopiladi
    expect(s2.auction).toBeFalsy();
    expect(P(s2, "a").cash).toBe(100 + 0); expect(P(s2, "b").assets[0].credit).toBe(0);
    void s;
  });
  it("faqat server auction_close yubora oladi", () => {
    const s = open(); expect(err(s, { type: "auction_close", playerId: "a" })).toBe("bad_action");
  });
});

function lombardCaseWithCredit() {
  let s = newGame(ctx, ["a", "b", "c"], 1, [], [], { halalFin: true });
  for (const p of s.players) { p.circle = "small"; p.cash = 0; p.assets = []; p.bankLoans = []; p.lombards = []; p.owe = 0; }
  const a = P(s, "a"); a.assets = [biz(20_000, 0, { credit: 3_000, creditPayment: 100 })]; a.cash = 100;
  Object.assign(a, takeLombard(a as any, 0).player); a.cash = 0;
  for (let i = 0; i < RULES.lombardTermMonths; i++) Object.assign(a, tickLoans(a as any));
  a.cash = 100; P(s, "b").cash = 100_000; startAuction(s); return s;
}

describe("garov auksioni: bank krediti", () => {
  it("ketma-ket to'lanmagan oylardan keyin kredit garovi auksionga qo'yiladi; lot — kredit garovidagi hamma aktivlar", () => {
    const s = newGame(ctx, ["a", "b"], 1, [], [], { halalFin: true });
    for (const p of s.players) { p.circle = "small"; p.assets = []; p.bankLoans = []; p.lombards = []; p.owe = 0; p.cash = 0; }
    const a = P(s, "a"); a.assets = [biz(8_000, 0), biz(8_000, 1)]; a.salary = 100_000; a.cash = 0;
    Object.assign(a, takeBankLoan(a as any, 5_000).player); a.cash = 0; a.salary = 100;
    P(s, "b").cash = 100_000;
    a.missed = RULES.missedMonthsToSale - 1; startAuction(s); expect(s.auction).toBeFalsy();
    a.missed = RULES.missedMonthsToSale; startAuction(s);
    expect(s.auction!.kind).toBe("bank"); expect(s.auction!.lot.length).toBeGreaterThan(0);
    expect(s.auction!.due).toBe(5_000 + 2_500); // asosiy qarz + haq (hali to'lanmagan)
  });
  it("bir nechta majburiyatdan eng erta olingani birinchi", () => {
    const s = newGame(ctx, ["a", "b"], 1, [], [], { halalFin: true });
    const a = P(s, "a"); a.circle = "small"; a.assets = []; a.owe = 0;
    a.lombards = [{ code: "X", price: 10_000, amount: 5_000, left: 0, fee: 0, since: 20, overdue: true }, { code: "Y", price: 10_000, amount: 5_000, left: 0, fee: 0, since: 8, overdue: true }];
    expect(nextDefault(s)).toEqual({ pid: "a", kind: "lombard", loanIdx: 1 });
    a.bankLoans = [{ amount: 2000, left: 30, fee: 1000, since: 3 }]; a.missed = RULES.missedMonthsToSale;
    expect(nextDefault(s)).toEqual({ pid: "a", kind: "bank", loanIdx: 0 });
  });
});

describe("garov auksioni: botlar", () => {
  it("bot arzon narxda taklif qiladi, qimmatga chiqmaydi (aktiv narxining 90 % idan oshmaydi), keyin o'tkazadi", () => {
    let s = lombardCase({ aCash: 100, bots: ["b", "c"] });
    for (let i = 0; i < 60 && s.auction; i++) {
      const bot = s.players.find((p) => ["b", "c"].includes(p.id) && botAuctionAction(s, p.id))!; if (!bot) break;
      s = act(s, botAuctionAction(s, bot.id)!);
    }
    expect(s.auction).toBeNull();
    const winner = ["b", "c"].find((id) => P(s, id).assets.length === 1)!;
    expect(winner).toBeTruthy(); expect(P(s, winner).assets[0].price).toBeLessThanOrEqual(18_000); expect(P(s, winner).assets[0].price).toBeGreaterThanOrEqual(10_000);
  });
  it("egasi bot bo'lsa va puli yetsa qarzni to'lab qoladi", () => {
    const s = lombardCase({ aCash: 50_000, bots: ["a"] }); expect(botAuctionAction(s, "a")).toEqual({ type: "auction_buyback", playerId: "a" });
  });
});
