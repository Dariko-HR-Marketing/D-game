// Tajriba24 katalog kartalari dvigatelda (TZ §9.7–9.9): sotish taklifi, daromad foizi, alomat (kechiktirilgan), nol/ko'paytirish, oylik ta'sirlar,
// ish haqi, narx o'zgarishlari; mos aktiv bo'lmasa karta o'tkaziladi; reytingli havza va 16+ kartalar.
import { describe, it, expect } from "vitest";
import { ctx, cards } from "./testctx";
import { newGame, reduce, forceCard, crisisAdjusted, type GameState, type GamePlayer, type Ctx } from "./index";
import { passiveIncome, playerCashflow, salaryOf, monthlyExpenses, saleBase, offerPrice, type Asset } from "./engine";

const mk = (n = 3, seed = 11, c: Ctx = ctx): GameState => {
  const s = newGame(c, Array.from({ length: n }, (_, i) => `p${i}`), seed); s.players.forEach((p, i) => (s.players[i] = { ...p, dreamIdx: i, cash: 1_000_000 })); return s;
};
const asset = (o: Partial<Asset> & { code: string }): Asset => ({ kind: "small_business", price: 3000, monthlyIncome: 500, creditPayment: 0, credit: 0, since: 0, ...o });
const P = (s: GameState, i = 0) => s.players[i] as GamePlayer;
/** Dvigatel bo'yicha oylar o'tkazish: «D» katagidan o'tishlar o'rniga to'g'ridan-to'g'ri oy hisobi (tick + oylik pul oqimi). */
const monthsLater = (s: GameState, pid: string, n: number) => {
  const { tickMods, tickLoans } = require_engine(); const i = s.players.findIndex((p) => p.id === pid); let q = s.players[i];
  for (let k = 0; k < n; k++) q = tickMods(tickLoans({ ...q, cash: q.cash + playerCashflow(q) }));
  s.players[i] = q;
};
import * as engine from "./engine"; const require_engine = () => engine;
const eff = (id: string) => ctx.effects[`cat-${id}`];
const force = (s: GameState, id: string, pi = 0) => forceCard(s, ctx, P(s, pi), `cat-${id}`);
const sold = (s: GameState, pid: string, proposalId: number, code?: string) => reduce(s, ctx, { type: "market_sell", playerId: pid, proposalId, assetCode: code } as any);

describe("katalog: ta'sirlar jonli va dvigatelda ishlaydi", () => {
  it("jonli katalog kartalari: xarid, to'lov, tuzilgan ta'sir (ops), sotish taklifi; ushlab turilganlar kolodada yo'q", () => {
    const live = Object.values(ctx.effects).filter((e) => e.info?.catalog && !e.info.held); const kinds = new Set(live.map((e) => e.effect.kind));
    expect([...kinds].sort()).toEqual(["buy", "gain", "ops", "pay", "sellOffer"]); expect(live.length).toBeGreaterThan(300);
  });

  it("SOTISH_FOIZ (BZ001, +25 %, ≥ 1 aylana ushlab turilgan): yangi aktiv sotilmaydi; 4 oydan keyin sotib olingan narx × 1,25 − kredit", () => {
    const s = mk(); const e = eff("BZ001"); expect(e.effect).toMatchObject({ kind: "sellOffer", mode: "pct", value: 25, first: false, holdMonths: 4 });
    P(s).assets = [asset({ code: "A1", sector: "Savdo va chakana", price: 4000, since: 0, credit: 1000 })]; P(s).monthsPlayed = 2;
    force(s, "BZ001"); const pr = s.proposals[0]; expect(pr).toMatchObject({ kind: "offer", first: false });
    expect(sold(s, "p0", pr.id)).toMatchObject({ ok: false, error: "nothing_to_sell" }); // 2 oy — hali erta
    const cash0 = 1_000_000; P(s).monthsPlayed = 4; const r: any = sold(s, "p0", pr.id); expect(r.ok).toBe(true);
    expect(r.state.players[0].cash).toBe(cash0 + 5000 - 1000); expect(r.state.players[0].assets).toHaveLength(0);
    expect(sold(r.state, "p0", pr.id)).toMatchObject({ ok: false }); // bir marta
  });
  it("SOTISH_FOIZ: boshqa sohadagi, garovdagi yoki sheriklikdagi aktiv mos emas", () => {
    const s = mk(); P(s).assets = [asset({ code: "X", sector: "Energiya" }), asset({ code: "Y", sector: "Savdo va chakana", pledged: "bank" }), asset({ code: "Z", sector: "Savdo va chakana", partnerId: "p1" })]; P(s).monthsPlayed = 10;
    force(s, "BZ001"); expect(sold(s, "p0", s.proposals[0].id)).toMatchObject({ ok: false, error: "nothing_to_sell" });
  });
  it("SOTISH_FOIZ_BIRINCHI (BZ002, +40 %): faqat birinchi rozi bo'lgan sotadi, taklif yopiladi", () => {
    const s = mk(); for (const i of [0, 1]) { P(s, i).assets = [asset({ code: `B${i}`, sector: "Savdo va chakana", price: 5000 })]; P(s, i).monthsPlayed = 8; }
    force(s, "BZ002"); const pr = s.proposals[0]; expect(pr).toMatchObject({ kind: "offer", first: true });
    const a: any = sold(s, "p1", pr.id); expect(a.ok).toBe(true); expect(a.state.players[1].cash).toBe(1_000_000 + 7000); expect(a.state.proposals).toHaveLength(0);
    expect(sold(a.state, "p0", pr.id)).toMatchObject({ ok: false, error: "no_proposal" });
  });
  it("SOTISH_NARX (Y025, qat'iy narx): ushlab turish sharti yo'q, mos nomli aktiv 3 500 ga sotiladi", () => {
    const s = mk(); P(s).assets = [asset({ code: "NK", name: "Onlayn do‘kon", price: 2000, sector: "IT va raqamli" })]; force(s, "Y025");
    const r: any = sold(s, "p0", s.proposals[0].id); expect(r.ok).toBe(true); expect(r.state.players[0].cash).toBe(1_003_500);
  });
  it("offerPrice: sotish bazasi NARX_FOIZ («bir marta») va faol sotish ta'sirlariga bog'liq (TZ §4.2)", () => {
    const a = asset({ code: "A", sector: "Savdo va chakana", price: 1000, adj: 0.8 }); const e: any = eff("BZ001").effect;
    const p: any = { monthsPlayed: 9, mods: [{ id: 1, t: "price", sel: { any: [{ sector: "Savdo va chakana" }] }, pct: 10, side: "sell", months: 4 }] };
    expect(saleBase(p, a)).toBe(Math.round(1000 * 0.8 * 1.1)); expect(offerPrice(e, p, a)).toBe(Math.round(880 * 1.25));
  });

  it("DAROMAD_FOIZ 2 aylana (Y319, savdo +5 %): barcha egalarning daromadi 8 oy oshadi, so'ng tugaydi (TZ §9.7)", () => {
    const s = mk(); for (const i of [0, 1]) P(s, i).assets = [asset({ code: `S${i}`, sector: "Savdo va chakana", monthlyIncome: 1000 })]; P(s, 2).assets = [asset({ code: "E", sector: "Energiya", monthlyIncome: 1000 })];
    const before = passiveIncome(P(s)); force(s, "Y319"); expect(passiveIncome(P(s))).toBe(1050); expect(passiveIncome(P(s, 1))).toBe(1050); expect(passiveIncome(P(s, 2))).toBe(1000); expect(before).toBe(1000);
    monthsLater(s, "p0", 7); expect(passiveIncome(P(s))).toBe(1050); monthsLater(s, "p0", 1); expect(passiveIncome(P(s))).toBe(1000); expect(P(s).mods).toEqual([]);
  });
  it("KECHIKTIRILGAN_NARX_FOIZ (alomat BZ005, +10 %): shu aylana o'zgarmaydi; START dan o'tgach 1 aylana sotish bazasi +10 % (TZ §6.3)", () => {
    const s = mk(); P(s).assets = [asset({ code: "A", sector: "Savdo va chakana", price: 5000 })]; P(s).monthsPlayed = 8;
    force(s, "BZ005"); expect(P(s).mods!.every((m) => m.wait)).toBe(true); expect(saleBase(P(s), P(s).assets[0])).toBe(5000);
    P(s).mods = engine.startLap(P(s)).mods; expect(saleBase(P(s), P(s).assets[0])).toBe(5500); monthsLater(s, "p0", 4); expect(saleBase(P(s), P(s).assets[0])).toBe(5000);
  });
  it("alomat qo'yilgan o'yinchi START dan o'tganda (haqiqiy yurish): ta'sir boshlanadi; kichik aylanada START — 0-katak", () => {
    const s = mk(2, 3); P(s).assets = [asset({ code: "A", sector: "Savdo va chakana", price: 5000 })]; force(s, "BZ005"); s.turn = 0;
    P(s).pos = 46; // 2+ qadam: 0-katakdan o'tadi
    for (let seed = 1; seed < 300; seed++) { const g = structuredClone(s); g.rngState = seed; const r: any = reduce(g, ctx, { type: "roll", playerId: "p0" }); if (r.ok && r.die >= 2) { expect(r.state.players[0].mods.every((m: any) => !m.wait)).toBe(true); return; } }
    throw new Error("topilmadi");
  });
  it("KECHIKTIRILGAN_DAROMAD_FOIZ (NBZ-15, ijara +10 %): aylana boshidan keyin 4 oy", () => {
    const s = mk(); P(s).assets = [asset({ code: "R", kind: "apartment", tags: ["ijara"], monthlyIncome: 1000 })]; force(s, "NBZ-15"); expect(passiveIncome(P(s))).toBe(1000);
    P(s).mods = engine.startLap(P(s)).mods; expect(passiveIncome(P(s))).toBe(1100); monthsLater(s, "p0", 4); expect(passiveIncome(P(s))).toBe(1000);
  });
  it("DAROMAD_NOL (hodisa NHD-04): ijara aktivi 1 aylana daromad bermaydi; ijara aktivi bo'lmasa karta o'tkaziladi", () => {
    const s = mk(); P(s).assets = [asset({ code: "R", kind: "apartment", tags: ["ijara"], monthlyIncome: 800 })]; force(s, "NHD-04"); expect(passiveIncome(P(s))).toBe(0);
    monthsLater(s, "p0", 4); expect(passiveIncome(P(s))).toBe(800);
    P(s, 1).assets = []; const log = s.log.length; force(s, "NHD-04", 1); expect(P(s, 1).mods ?? []).toEqual([]); expect(s.log.length).toBeGreaterThan(log);
  });
  it("DAROMAD_KOPAYTIRISH (NHD-05): egasi tanlaydi — eng daromadli kichik biznes ×2, 1 aylana", () => {
    const s = mk(); P(s).assets = [asset({ code: "K1", monthlyIncome: 100 }), asset({ code: "K2", monthlyIncome: 700 })]; force(s, "NHD-05");
    expect(passiveIncome(P(s))).toBe(100 + 1400); monthsLater(s, "p0", 4); expect(passiveIncome(P(s))).toBe(800);
  });
  it("OYLIK_XARAJAT / DOIMIY_XARAJAT / OYLIK_DAROMAD: pul oqimi muddat davomida o'zgaradi", () => {
    const s = mk(); const cf = playerCashflow(P(s)); force(s, "Y272"); expect(playerCashflow(P(s))).toBe(cf - 200); expect(monthlyExpenses(P(s))).toBe(monthlyExpenses({ ...P(s), mods: [] } as any) + 200);
    monthsLater(s, "p0", 8); const after = P(s); expect(after.mods).toEqual([]);
    const s2 = mk(); force(s2, "Y038"); expect(playerCashflow(P(s2))).toBe(cf - 40); monthsLater(s2, "p0", 200); expect(P(s2).mods).toHaveLength(1); // doimiy
    const s3 = mk(); force(s3, "Y197"); expect(playerCashflow(P(s3))).toBe(cf + 200);
  });
  it("KREDIT_TOLOV_FOIZ (Y121, +10 %) hamma o'yinchiga: kredit to'lovlari oshadi; XARAJAT_FOIZ (Y302, −5 %): oylik xarajat", () => {
    const s = mk(); for (const i of [0, 1, 2]) P(s, i).assets = [asset({ code: "KR", kind: "apartment", creditPayment: 1000, credit: 20000 })];
    const e0 = [0, 1, 2].map((i) => monthlyExpenses(P(s, i))); force(s, "Y121"); for (const i of [0, 1, 2]) expect(monthlyExpenses(P(s, i))).toBe(e0[i] + 100);
    const s2 = mk(); const base = [0, 1, 2].map((i) => monthlyExpenses(P(s2, i))); force(s2, "Y302"); for (const i of [0, 1, 2]) expect(monthlyExpenses(P(s2, i))).toBe(Math.round(P(s2, i).baseExpenses * 0.95) + (base[i] - P(s2, i).baseExpenses));
  });
  it("ISH_HAQI: ixtiyoriy kurs (Y011): 600 to'lanadi, ish haqi +80 doimiy; pul yetmasa ta'sir yo'q", () => {
    const s = mk(); const sal = P(s).salary; s.pending = { type: "card", playerId: "p0", cardId: "cat-Y011", deck: "kichik" };
    const r: any = reduce(s, ctx, { type: "decide", playerId: "p0", accept: true }); expect(r.ok).toBe(true); expect(r.state.players[0].salary).toBe(sal + 80); expect(r.state.players[0].cash).toBe(1_000_000 - 600);
    const poor = mk(); P(poor).cash = 100; poor.pending = { type: "card", playerId: "p0", cardId: "cat-Y011", deck: "kichik" };
    const q: any = reduce(poor, ctx, { type: "decide", playerId: "p0", accept: true }); expect(q.state.players[0].salary).toBe(sal); expect(q.state.players[0].cash).toBe(100);
  });
  it("salaryOf: foiz va nol (ish haqi yo'q) hisobda; mods bo'lmasa o'zgarishsiz", () => {
    const p: any = { salary: 1000, mods: [{ id: 1, t: "salary", pct: 15, months: null }] }; expect(salaryOf(p)).toBe(1150);
    expect(salaryOf({ ...p, mods: [...p.mods, { id: 2, t: "salaryZero", months: 8 }] })).toBe(0); expect(salaryOf({ salary: 700 } as any)).toBe(700);
  });
  it("NARX_FOIZ «bir marta» (BZ004: sotish bazasi −20 %): doimiy; daromad −10 % 2 aylana (ikkinchi ta'sir)", () => {
    const s = mk(); P(s).assets = [asset({ code: "A", sector: "Savdo va chakana", price: 5000, monthlyIncome: 1000 })]; force(s, "BZ004");
    expect(P(s).assets[0].adj).toBe(0.8); expect(saleBase(P(s), P(s).assets[0])).toBe(4000); expect(passiveIncome(P(s))).toBe(900); monthsLater(s, "p0", 8); expect(passiveIncome(P(s))).toBe(1000); expect(P(s).assets[0].adj).toBe(0.8);
  });
  it("xarid narxi ta'siri (Y131: ko'chmas mulk xarid +5 %, 1 aylana): crisisAdjusted narx va boshlang'ich to'lovni oshiradi; muddat o'tgach yo'q", () => {
    const s = mk(); force(s, "Y131"); const buy: any = Object.values(ctx.effects).map((c) => c.effect).find((e: any) => e.kind === "buy" && e.asset === "apartment" && e.credit > 0);
    const adj: any = crisisAdjusted(buy, P(s)); expect(adj.price).toBe(Math.round(buy.price * 1.05)); expect(adj.down).toBe(Math.round(buy.down * 1.05)); expect(adj.credit).toBe(adj.price - adj.down);
    monthsLater(s, "p0", 4); expect(crisisAdjusted(buy, P(s))).toEqual(buy);
  });
  it("«Barcha o'yinchilar» kartalari hamma o'yinchiga, «O'yinchi» — faqat tortgan o'yinchiga", () => {
    const s = mk(); force(s, "Y302"); expect(s.players.every((p) => (p.mods ?? []).length === 1)).toBe(true);
    const s2 = mk(); force(s2, "Y272"); expect((P(s2, 0).mods ?? []).length).toBe(1); expect((P(s2, 1).mods ?? []).length).toBe(0);
  });
});

describe("katalog: har bir jonli karta xatosiz va chekli qiymatlar bilan ishlaydi", () => {
  const live = Object.values(ctx.effects).filter((e) => e.info?.catalog && !e.info.held).map((e) => e.id);
  it.each(live)("%s", (id) => {
    for (const setup of [0, 1, 2]) {
      const s = mk(3, 5 + setup); const ce = ctx.effects[id];
      P(s).assets = setup === 0 ? [] : [asset({ code: "K", sector: "Savdo va chakana", monthlyIncome: 500 }), asset({ code: "R", kind: "apartment", tags: ["ijara"], sector: "Kvartira", monthlyIncome: 300, creditPayment: 200, credit: 9000 }), asset({ code: "E", kind: "small_business", name: "Onlayn do‘kon", sector: "IT va raqamli" })];
      P(s).monthsPlayed = setup === 2 ? 20 : 0; P(s).cash = setup === 1 ? 50 : 1_000_000;
      if (ce.mode === "mandatory" || ce.effect.kind === "sellOffer") forceCard(s, ctx, P(s), id);
      else { s.pending = { type: "card", playerId: "p0", cardId: id, deck: ce.deck as any }; const r: any = reduce(s, ctx, { type: "decide", playerId: "p0", accept: true }); expect(r.ok, "decide").toBe(true); s.players = r.state.players; }
      for (const p of s.players) { expect(Number.isFinite(p.cash), "cash").toBe(true); expect(Number.isFinite(playerCashflow(p)), "cashflow").toBe(true); expect(Number.isFinite(passiveIncome(p)), "passive").toBe(true); }
    }
  });
});

describe("havzalar: reytingli va yosh", () => {
  it("reytingli o'yinda EXTENDED (yangi) kartalar kolodada yo'q; standartda bor (TZ §9.8)", () => {
    const rated = newGame(ctx, ["a", "b", "c", "d"], 1, [], [], { mode: "rated" }); const std = newGame(ctx, ["a", "b", "c"], 1);
    const ids = (g: GameState) => Object.values(g.decks).flatMap((d) => d.draw);
    expect(ids(rated).some((i) => ctx.extended!.includes(i))).toBe(false); expect(ids(std).some((i) => ctx.extended!.includes(i))).toBe(true);
    expect(ids(rated).filter((i) => i.startsWith("cat-"))).toEqual([]);
  });
  it("16 yoshgacha (restricted) o'yinchiga 16+ karta tushmaydi (chetga qo'yilib keyingisi olinadi); kattaga tushadi (TZ §9.9)", () => {
    expect(ctx.adult!.length).toBeGreaterThan(20); const adultId = ctx.deckIds.kichik.find((id) => ctx.adult!.includes(id))!; expect(adultId).toBeTruthy();
    const I = "SIHIHIBIHBIDBIHBHIHBDHBIHIOBIBIQBHIDBHIBHIBIDBKB".indexOf("I");
    const landOnI = (restricted: string[]) => { for (let die = 1; die <= 6; die++) for (let seed = 1; seed < 400; seed++) {
      const g = newGame(ctx, ["a", "b"], seed, [], restricted); g.players.forEach((q, k) => (g.players[k] = { ...q, dreamIdx: k })); g.decks.kichik.draw = [adultId, ...g.decks.kichik.draw.filter((x) => x !== adultId)]; Object.assign(g.players[0], { pos: (I - die + 48) % 48, cash: 1000 }); g.turn = 0; g.rngState = seed;
      const r: any = reduce(g, ctx, { type: "roll", playerId: "a" }); if (r.ok && r.die === die && r.state.players[0].pos === I) return r.state as GameState; } throw new Error("topilmadi"); };
    expect(landOnI([]).lastCard!.cardId).toBe(adultId); const kid = landOnI(["a"]); expect(ctx.adult).not.toContain(kid.lastCard!.cardId); expect(ctx.effects[kid.lastCard!.cardId].deck).toBe("kichik");
  });
});
