import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { newGame, reduce, startAuction, startMarketAuction, cannotBuyAnyWay, nextDefault, botAuctionAction, bankLoanMonthly, bankLoanPayoff, RULES, type GameState, type Asset } from "./index";
import { takeLombard, takeBankLoan, tickLoans, settleOwe } from "./engine";

const biz = (price: number, n = 0, extra: Partial<Asset> = {}): Asset => ({ kind: "small_business", code: `B${n}`, price, monthlyIncome: 500, creditPayment: 0, credit: 0, ...extra });
const P = (s: GameState, id: string) => s.players.find((p) => p.id === id)!;
const act = (s: GameState, a: any) => { const r = reduce(s, ctx, a); if (!r.ok) throw new Error(r.error); return r.state; };
const err = (s: GameState, a: any) => { const r = reduce(s, ctx, a); if (r.ok) throw new Error("kutilgan xato yo'q"); return r.error; };
const base = (opts: { restricted?: string[]; bots?: string[] } = {}) => {
  const s = newGame(ctx, ["a", "b", "c"], 1, opts.bots ?? [], opts.restricted ?? [], { halalFin: true });
  for (const p of s.players) { p.circle = "small"; p.cash = 100_000; p.assets = []; p.bankLoans = []; p.lombards = []; p.owe = 0; p.children = 0; }
  return s;
};

/** a: egasi (lombard garovi 20 000 lik biznes, muddati o'tgan, qarz 10 000), b/c: takliflovchilar (100 000 naqd). */
function lombardCase(opts: { aCash?: number; restricted?: string[]; bots?: string[]; bCash?: number; cCash?: number } = {}) {
  const s = base(opts);
  const a = P(s, "a"); a.assets = [biz(20_000, 0), biz(1000, 9)]; a.cash = 0;
  Object.assign(a, takeLombard(a as any, 0).player); a.cash = 0;
  for (let i = 0; i < RULES.lombardTermMonths; i++) Object.assign(a, tickLoans(a as any));
  a.cash = opts.aCash ?? 0; if (opts.bCash !== undefined) P(s, "b").cash = opts.bCash; if (opts.cCash !== undefined) P(s, "c").cash = opts.cCash;
  startAuction(s);
  return s;
}

describe("majburiy auksion", () => {
  it("avval egasiga taklif; boshlang'ich narx — mulkning o'z narxi; bankka qarz alohida", () => {
    const a = lombardCase({ aCash: 50_000 }).auction!;
    expect(a.format).toBe("majburiy"); expect(a.phase).toBe("owner"); expect(a.start).toBe(20_000); expect(a.due).toBe(10_000); expect(a.lot).toHaveLength(1);
  });
  it("egasida pul bo'lmasa to'g'ridan-to'g'ri hammaga ochiladi; boshqa harakatlar to'xtaydi", () => {
    const s = lombardCase({ aCash: 100 }); expect(s.auction!.phase).toBe("open");
    expect(err(s, { type: "roll", playerId: "a" })).toBe("auction_open");
  });
  it("eski o'yinlarda (halalFin yo'q) ochilmaydi", () => {
    const s = lombardCase({ aCash: 100 }); s.auction = null; s.halalFin = false; startAuction(s); expect(s.auction).toBeNull();
  });
  it("egasi qarzni to'lab mulkini saqlab qoladi", () => {
    const s = act(lombardCase({ aCash: 50_000 }), { type: "auction_buyback", playerId: "a" });
    expect(s.auction).toBeNull(); expect(P(s, "a").cash).toBe(40_000); expect(P(s, "a").assets).toHaveLength(2); expect(P(s, "a").lombards).toHaveLength(0);
    expect(err(lombardCase({ aCash: 50_000 }), { type: "auction_buyback", playerId: "b" })).toBe("not_owner");
  });
  it("takliflar: eng kam — boshlang'ich narx; keyingisi + qadam; o'zini oshira olmaydi; egasi taklif qila olmaydi", () => {
    let s = lombardCase({ aCash: 100 });
    expect(err(s, { type: "auction_bid", playerId: "b", amount: 19_900 })).toBe("bid_low");
    expect(err(s, { type: "auction_bid", playerId: "a", amount: 20_000 })).toBe("owner_cannot_bid");
    s = act(s, { type: "auction_bid", playerId: "b", amount: 20_000 });
    expect(err(s, { type: "auction_bid", playerId: "b", amount: 21_000 })).toBe("already_leader");
    expect(err(s, { type: "auction_bid", playerId: "c", amount: 20_000 })).toBe("bid_low");
    s = act(s, { type: "auction_bid", playerId: "c", amount: 20_000 + RULES.auctionBidStep }); expect(s.auction!.best!.playerId).toBe("c");
  });
  it("vaqt tugasa: g'olib oladi, bank qarzini oladi, ORTIQCHASI egasiga qaytadi", () => {
    let s = lombardCase({ aCash: 100 }); s = act(s, { type: "auction_bid", playerId: "b", amount: 20_000 }); s = act(s, { type: "auction_bid", playerId: "c", amount: 24_000 });
    s = act(s, { type: "auction_close", playerId: "server" });
    expect(s.auction).toBeFalsy(); expect(P(s, "c").cash).toBe(76_000); expect(P(s, "c").assets).toHaveLength(1); expect(P(s, "c").assets[0].price).toBe(24_000);
    expect(P(s, "a").cash).toBe(100 + 14_000); expect(P(s, "a").lombards).toHaveLength(0); expect(P(s, "a").assets).toHaveLength(1);
  });
  it("hech kim olmasa: mulk egasida, qarz yana uning bo'yniga", () => {
    let s = lombardCase({ aCash: 100 }); s = act(s, { type: "auction_pass", playerId: "b" }); s = act(s, { type: "auction_pass", playerId: "c" });
    expect(s.auction).toBeFalsy(); expect(P(s, "a").assets).toHaveLength(2); expect(P(s, "a").assets.every((x) => !x.pledged)).toBe(true); expect(P(s, "a").owe).toBe(10_000);
  });
  it("kamida 2 ta qatnashchi kerak: bittasi bo'lsa, naqdi yetmasa yoki 16 yoshgacha bo'lsa auksion ochilmaydi, qarz egasiga qaytadi", () => {
    const one = lombardCase({ aCash: 100, cCash: 5_000 }); expect(one.auction).toBeFalsy(); expect(P(one, "a").owe).toBe(10_000);
    const kid = lombardCase({ aCash: 100, restricted: ["b"] }); expect(kid.auction).toBeFalsy(); expect(P(kid, "a").owe).toBe(10_000);
  });
  it("boshqa aylanadagi va 16 yoshgacha o'yinchi taklif qila olmaydi", () => {
    const s = lombardCase({ aCash: 100 }); P(s, "c").circle = "big";
    expect(err(s, { type: "auction_bid", playerId: "c", amount: 20_000 })).toBe("not_eligible");
    const r = lombardCase({ aCash: 100 }); r.restricted = ["b"]; expect(err(r, { type: "auction_bid", playerId: "b", amount: 20_000 })).toBe("not_eligible");
  });
  it("faqat server auction_close yubora oladi", () => { expect(err(lombardCase({ aCash: 100 }), { type: "auction_close", playerId: "a" })).toBe("bad_action"); });
  it("aktivning o'z krediti sotuvdan yopiladi", () => {
    const s = base(); const a = P(s, "a"); a.assets = [biz(20_000, 0, { credit: 3_000, creditPayment: 100 })]; a.cash = 0;
    Object.assign(a, takeLombard(a as any, 0).player); a.cash = 0; for (let i = 0; i < RULES.lombardTermMonths; i++) Object.assign(a, tickLoans(a as any)); a.cash = 100; startAuction(s);
    let s2 = act(s, { type: "auction_bid", playerId: "b", amount: 20_000 }); s2 = act(s2, { type: "auction_pass", playerId: "c" });
    expect(s2.auction).toBeFalsy(); expect(P(s2, "a").cash).toBe(100 + (20_000 - 3_000 - 10_000)); expect(P(s2, "b").assets[0].credit).toBe(0);
  });
});

describe("majburiy auksion: bank krediti", () => {
  const caseBank = (prices: number[]) => {
    const s = base(); const a = P(s, "a"); a.assets = prices.map((p, i) => biz(p, i)); a.salary = 100_000; a.cash = 0;
    Object.assign(a, takeBankLoan(a as any, 5_000).player); a.cash = 0; a.salary = 100;
    for (let i = 0; i < RULES.bankTermMonths; i++) { a.cash = -1000; Object.assign(a, tickLoans(a as any)); }
    a.cash = 0; return { s, a };
  };
  it("36-oydan keyin to'lanmagan qoldiq: kredit muddati o'tgan, garov majburiy auksionga chiqadi", () => {
    const { s, a } = caseBank([8_000, 8_000]); const l = a.bankLoans[0];
    expect(l.overdue).toBe(true); expect(l.arrears).toBe(5_004 + 2_500); expect(bankLoanMonthly(l)).toBe(0); expect(bankLoanPayoff(l)).toBe(7_504);
    startAuction(s); expect(s.auction!.kind).toBe("bank"); expect(s.auction!.due).toBe(7_504);
  });
  it("garov bir nechta bo'lsa: eng qimmatidan boshlab, faqat bittasi auksionga chiqadi; qarz qoplansa qolgani garovdan bo'shaydi", () => {
    const { s } = caseBank([4_000, 3_500]); startAuction(s); const au = s.auction!;
    expect(au.phase).toBe("open"); expect(au.lot).toHaveLength(1); expect(au.lot[0].price).toBe(4_000); expect(au.start).toBe(4_000);
    let t = act(s, { type: "auction_bid", playerId: "b", amount: 8_000 }); t = act(t, { type: "auction_pass", playerId: "c" });
    expect(t.auction).toBeFalsy(); expect(P(t, "a").bankLoans).toHaveLength(0); expect(P(t, "a").cash).toBe(8_000 - 7_504); expect(P(t, "a").assets).toHaveLength(1); expect(P(t, "a").assets[0].pledged).toBeUndefined();
  });
  it("narx qarzni qoplamasa: qoldiq keyingi (arzonroq) mulk auksionida yopiladi", () => {
    const { s } = caseBank([4_000, 3_500]); startAuction(s);
    let t = act(s, { type: "auction_bid", playerId: "b", amount: 4_000 }); t = act(t, { type: "auction_pass", playerId: "c" });
    expect(t.auction!.lot[0].price).toBe(3_500); expect(t.auction!.due).toBe(7_504 - 4_000); expect(P(t, "a").cash).toBe(0);
  });
  it("kam-kam to'lab borish: naqd paydo bo'lishi bilan qarz yopiladi; muddati o'tgan kredit to'liq yopilsa garov bo'shaydi", () => {
    const { a } = caseBank([8_000, 8_000]);
    expect(settleOwe({ ...a, cash: 3_000 } as any).bankLoans[0].arrears).toBe(7_504 - 3_000);
    const all = settleOwe({ ...a, cash: 20_000 } as any); expect(all.bankLoans).toHaveLength(0); expect(all.assets.every((x: any) => !x.pledged)).toBe(true);
  });
  it("bir nechta majburiyatdan eng erta olingani birinchi", () => {
    const s = base(); const a = P(s, "a");
    a.lombards = [{ code: "X", price: 10_000, amount: 5_000, left: 0, fee: 0, since: 20, overdue: true }, { code: "Y", price: 10_000, amount: 5_000, left: 0, fee: 0, since: 8, overdue: true }];
    expect(nextDefault(s)).toEqual({ pid: "a", kind: "lombard", loanIdx: 1 });
    a.bankLoans = [{ amount: 2000, left: 0, fee: 1000, since: 3, arrears: 500, overdue: true }]; expect(nextDefault(s)).toEqual({ pid: "a", kind: "bank", loanIdx: 0 });
  });
});

describe("ixtiyoriy auksion", () => {
  const own = () => { const s = base(); P(s, "a").assets = [biz(20_000, 0), biz(6_000, 1)]; return s; };
  it("egasi o'z navbatida erkin mulkini 50–100 % dan qo'yadi; boshlang'ich narx = narx × foiz", () => {
    const s = act(own(), { type: "auction_list", playerId: "a", assetIdx: 0, pct: 50 }); expect(s.auction!.format).toBe("ixtiyoriy"); expect(s.auction!.start).toBe(10_000); expect(s.auction!.phase).toBe("open");
    expect(act(own(), { type: "auction_list", playerId: "a", assetIdx: 0, pct: 70 }).auction!.start).toBe(14_000);
    expect(err(own(), { type: "auction_list", playerId: "a", assetIdx: 0, pct: 40 })).toBe("invalid_amount"); expect(err(own(), { type: "auction_list", playerId: "a", assetIdx: 0, pct: 75 })).toBe("invalid_amount");
  });
  it("faqat o'z navbatida; garovdagi mulk va 16 yoshgacha uchun yopiq; qatnashchi yetmasa rad", () => {
    expect(err(own(), { type: "auction_list", playerId: "b", assetIdx: 0, pct: 50 })).toBe("not_your_turn");
    const g = own(); P(g, "a").assets[0].pledged = "lombard"; expect(err(g, { type: "auction_list", playerId: "a", assetIdx: 0, pct: 50 })).toBe("not_pledgeable");
    const f = own(); P(f, "b").cash = 100; expect(err(f, { type: "auction_list", playerId: "a", assetIdx: 0, pct: 50 })).toBe("few_bidders");
    const r = own(); r.restricted = ["a"]; expect(err(r, { type: "auction_list", playerId: "a", assetIdx: 0, pct: 50 })).toBe("not_eligible");
  });
  it("sotuv: butun summa egasiga (mulkning o'z krediti avval yopiladi); g'olib toza mulk oladi", () => {
    const s0 = own(); P(s0, "a").assets[0].credit = 2_000; P(s0, "a").cash = 0;
    let s = act(s0, { type: "auction_list", playerId: "a", assetIdx: 0, pct: 50 }); s = act(s, { type: "auction_bid", playerId: "b", amount: 12_000 }); s = act(s, { type: "auction_pass", playerId: "c" });
    expect(s.auction).toBeFalsy(); expect(P(s, "a").cash).toBe(10_000); expect(P(s, "a").assets).toHaveLength(1); expect(P(s, "b").cash).toBe(88_000); expect(P(s, "b").assets[0].credit).toBe(0);
  });
  it("sotilmasa mulk egasida qoladi; shu mulkni qayta qo'yish uchun 4 aylana o'tishi kerak", () => {
    let s = act(own(), { type: "auction_list", playerId: "a", assetIdx: 0, pct: 50 }); s = act(s, { type: "auction_pass", playerId: "b" }); s = act(s, { type: "auction_pass", playerId: "c" });
    expect(s.auction).toBeFalsy(); expect(P(s, "a").assets).toHaveLength(2);
    expect(err(s, { type: "auction_list", playerId: "a", assetIdx: 0, pct: 50 })).toBe("relist_wait");
    expect(act(s, { type: "auction_list", playerId: "a", assetIdx: 1, pct: 50 }).auction).toBeTruthy(); // boshqa mulk mumkin
    s.round += RULES.relistLaps; expect(act(s, { type: "auction_list", playerId: "a", assetIdx: 0, pct: 50 }).auction).toBeTruthy();
  });
});

describe("bozor auksioni", () => {
  const card = { code: "KB", asset: "small_business", price: 8_000, monthlyIncome: 400 };
  it("olish yo'li bo'lmasa karta bozor auksioniga chiqadi; g'olib faqat naqd to'laydi, pul bankka ketadi", () => {
    const s = base(); P(s, "a").cash = 100; expect(cannotBuyAnyWay(s, P(s, "a"), { kind: "buy", ...card })).toBe(true);
    expect(startMarketAuction(s, P(s, "a"), "kichik-1", card)).toBe(true); expect(s.auction!.format).toBe("bozor"); expect(s.auction!.start).toBe(8_000);
    expect(err(s, { type: "auction_bid", playerId: "a", amount: 8_000 })).toBe("owner_cannot_bid");
    let t = act(s, { type: "auction_bid", playerId: "b", amount: 8_000 }); t = act(t, { type: "auction_bid", playerId: "c", amount: 8_500 }); t = act(t, { type: "auction_pass", playerId: "b" });
    expect(t.auction).toBeFalsy(); expect(P(t, "c").cash).toBe(91_500); expect(P(t, "c").assets[0]).toMatchObject({ code: "KB", price: 8_500, monthlyIncome: 400, credit: 0 }); expect(P(t, "a").cash).toBe(100);
  });
  it("naqd yoki lombard bilan olish mumkin bo'lsa auksion ochilmaydi", () => {
    const s = base(); expect(cannotBuyAnyWay(s, P(s, "a"), { kind: "buy", ...card })).toBe(false); // naqd yetadi
    P(s, "a").cash = 100; P(s, "a").assets = [biz(20_000, 0)]; expect(cannotBuyAnyWay(s, P(s, "a"), { kind: "buy", ...card })).toBe(false); // lombard 10 000 beradi
  });
  it("kamida 2 ta qatnashchi kerak: bo'lmasa auksion ochilmaydi (karta odatdagidek hal qilinadi)", () => {
    const s = base(); P(s, "a").cash = 100; P(s, "c").cash = 100; expect(startMarketAuction(s, P(s, "a"), "kichik-1", card)).toBe(false); expect(s.auction).toBeFalsy();
  });
  it("hech kim olmasa karta tashlanadi", () => {
    const s = base(); P(s, "a").cash = 100; startMarketAuction(s, P(s, "a"), "kichik-1", card);
    let t = act(s, { type: "auction_pass", playerId: "b" }); t = act(t, { type: "auction_pass", playerId: "c" }); expect(t.auction).toBeFalsy(); expect(P(t, "b").assets).toHaveLength(0);
  });
});

describe("auksion: botlar", () => {
  it("bot narxning 90–110 % igacha taklif qiladi va undan oshmaydi", () => {
    let s = lombardCase({ aCash: 100, bots: ["b", "c"] });
    for (let i = 0; i < 60 && s.auction; i++) { const bot = s.players.find((p) => ["b", "c"].includes(p.id) && botAuctionAction(s, p.id)); if (!bot) break; s = act(s, botAuctionAction(s, bot.id)!); }
    expect(s.auction).toBeFalsy(); const w = ["b", "c"].map((id) => P(s, id).assets[0]).filter(Boolean)[0];
    if (w) { expect(w.price).toBeGreaterThanOrEqual(20_000); expect(w.price).toBeLessThanOrEqual(22_000); }
  });
  it("egasi bot bo'lsa va puli yetsa qarzni to'lab qoladi", () => { expect(botAuctionAction(lombardCase({ aCash: 50_000, bots: ["a"] }), "a")).toEqual({ type: "auction_buyback", playerId: "a" }); });
});
