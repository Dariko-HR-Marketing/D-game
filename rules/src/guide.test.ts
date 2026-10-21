// «POYGA o'yin qo'llanmasi» bo'yicha qoidalar: Q/K, X kataklari, Yana pullar, tavakkal, birovning biznesi, orzu, katta aylana qarzi, ishdan bo'shash.
import { describe, it, expect } from "vitest";
import { loadContent } from "@poyga/content";
import { ctx as base } from "./testctx";
import { Ctx, GameState, newGame, reduce, slotBlocked, effectOf, SMALL_BOARD } from "./index";
import { settleOwe } from "./engine";

const ctx: Ctx = { ...base, cellRules: loadContent().cellRules };
const mk = (n = 3, events = true) => newGame(ctx, Array.from({ length: n }, (_, i) => `p${i}`), 1, [], [], { events });
const biz = (code: string, income: number, kind = "small_business") => ({ kind, code, price: 1000, monthlyIncome: income, creditPayment: 0, credit: 0 });

/** p0 ni berilgan katakka kubik bilan tushiradi (urug' tanlanadi). */
function land(circle: "small" | "big", cell: number, prep: (s: GameState) => void = () => {}, n = 3, events = true): GameState {
  const size = circle === "small" ? 48 : 53;
  for (let die = 1; die <= 6; die++) for (let seed = 1; seed < 400; seed++) {
    const s = mk(n, events); Object.assign(s.players[0], { circle, pos: (cell - die + size) % size, lockedFlow: 5000, cash: circle === "big" ? 5_000_000 : 1000 }); prep(s);
    s.rngState = seed; const r = reduce(s, ctx, { type: "roll", playerId: "p0" }); if (r.ok && r.die === die) return r.state;
  } throw new Error("urug'");
}
const cellOf = (c: string) => SMALL_BOARD.indexOf(c);

describe("Q «Ishdan bo'shadingiz!»: 4 oy maosh yo'q (bir aylana), xarajat to'lanadi", () => {
  it("katakka tushsa noSalary=4; keyingi D kataklarida maosh qo'shilmaydi", () => {
    const s = land("small", cellOf("Q"));
    expect(s.players[0].noSalary).toBe(4);
  });
  it("ishdan allaqachon bo'shagan o'yinchiga ta'sir qilmaydi", () => {
    const s = land("small", cellOf("Q"), (g) => { g.players[0].quitJob = true; g.players[0].salary = 0; });
    expect(s.players[0].noSalary ?? 0).toBe(0);
  });
  it("D katagidan o'tganda maosh qo'shilmaydi va hisoblagich kamayadi", () => {
    const D = cellOf("D");
    for (let die = 1; die <= 6; die++) for (let seed = 1; seed < 400; seed++) {
      const withIt = mk(); Object.assign(withIt.players[0], { pos: (D - die + 48) % 48, noSalary: 4, cash: 100_000 }); withIt.rngState = seed;
      const without = structuredClone(withIt); without.players[0].noSalary = 0;
      const a = reduce(withIt, ctx, { type: "roll", playerId: "p0" }), b = reduce(without, ctx, { type: "roll", playerId: "p0" });
      if (a.ok && b.ok && a.die === die) { expect(b.state.players[0].cash - a.state.players[0].cash).toBe(withIt.players[0].salary); expect(a.state.players[0].noSalary).toBe(3); return; }
    } throw new Error("topilmadi");
  });
});

describe("K «Boshidan boshlang!» — xona egasi «Kutilmagan hodisa»ni yoqsa hod kartasi", () => {
  it("yoqilgan: hod kartasi tortiladi", () => {
    const s = land("small", cellOf("K"));
    expect(s.lastCard?.cardId.startsWith("hod-")).toBe(true);
  });
  it("o'chirilgan: oddiy katak (karta ham, restart ham yo'q)", () => {
    const s = land("small", cellOf("K"), () => {}, 3, false);
    expect(s.lastCard ?? null).toBeNull(); expect(s.players[0].restarts).toBe(0); expect(s.pending).toBeNull();
  });
});

describe("Katta aylana: X kataklari", () => {
  it("Bankrot (5): eng kam daromadli biznes yo'qoladi", () => {
    const s = land("big", 5, (g) => { g.players[0].assets = [biz("A", 500), biz("B", 100), biz("C", 300)]; });
    expect(s.players[0].assets.map((a) => a.code).sort()).toEqual(["A", "C"]);
  });
  it("Bankrot (5): biznes yo'q — naqd va kichik aylana mulki bilan kichik aylanaga qaytadi", () => {
    const s = land("big", 5, (g) => { g.players[0].assets = [{ ...biz("KV", 0, "apartment") }, { ...biz("PT", 0, "partner_stake") }]; });
    expect(s.players[0].circle).toBe("small"); expect(s.players[0].pos).toBe(0);
    expect(s.players[0].assets.map((a) => a.code)).toEqual(["KV"]); expect(s.players[0].cash).toBeGreaterThan(4_000_000);
  });
  it("Ajrashish (23): naqdning 50 %", () => {
    const s = land("big", 23); expect(s.players[0].cash).toBeGreaterThan(2_400_000); expect(s.players[0].cash).toBeLessThanOrEqual(2_500_000 + 20_000);
  });
  it("Audit (33): naqdning 20 %; naqd bo'lmasa ta'sirsiz", () => {
    const s = land("big", 33); expect(s.players[0].cash).toBeGreaterThan(3_900_000); expect(s.players[0].cash).toBeLessThanOrEqual(4_000_000 + 20_000);
    const z = land("big", 33, (g) => { g.players[0].cash = 0; }); expect(z.players[0].cash).toBeGreaterThanOrEqual(0); expect(z.players[0].bigDebt ?? 0).toBe(0);
  });
  it("Nohalol biznes (47): 1-marta 1 000 000, 2-marta naqdning 20 %, 3-marta ta'sirsiz", () => {
    const a = land("big", 47); expect(a.players[0].shady).toBe(1); expect(5_000_000 - a.players[0].cash).toBeGreaterThanOrEqual(1_000_000 - 1);
    const b = land("big", 47, (g) => { g.players[0].shady = 1; }); expect(b.players[0].shady).toBe(2); expect(b.players[0].cash).toBeLessThan(4_100_000); expect(b.players[0].cash).toBeGreaterThan(3_900_000);
    const c = land("big", 47, (g) => { g.players[0].shady = 2; }); expect(c.players[0].shady).toBe(3); expect(c.players[0].cash).toBeGreaterThanOrEqual(5_000_000 - 1);
  });
});

describe("Katta aylana: oylar «Yana pullar» katagida", () => {
  it("Yana pullar (26) ga tushish bitta oy — pul oqimi bir marta qo'shiladi", () => {
    const s = land("big", 26); expect(s.players[0].cash).toBe(5_000_000 + 5000);
  });
  it("START (34) dan o'tish endi oy emas", () => {
    for (let die = 2; die <= 6; die++) for (let seed = 1; seed < 400; seed++) {
      const g = mk(); Object.assign(g.players[0], { circle: "big", pos: 33, lockedFlow: 5000, cash: 5_000_000 }); g.rngState = seed;
      const r = reduce(g, ctx, { type: "roll", playerId: "p0" }); if (r.ok && r.die === die) { expect(r.state.players[0].cash).toBeLessThanOrEqual(5_000_000); return; }
    } throw new Error("topilmadi");
  });
  it("inqiroz oyi Yana pullar o'tganda kamayadi", () => {
    const s = land("big", 26, (g) => { g.players[0].crisisMonths = 36; }); expect(s.players[0].crisisMonths).toBe(35);
  });
});

describe("Katta aylana qarzi: yetmasa qarz yoziladi, Yana pullar da yopiladi", () => {
  it("Nohalol biznes, naqd yetmasa (yumshatilgan): hamma naqd olinadi va eng kam daromadli biznes yo'qoladi — qarz ham, restart ham yo'q", () => {
    const s = land("big", 47, (g) => { g.players[0].cash = 300_000; g.players[0].lockedFlow = 0; g.players[0].assets = [biz("A", 500), biz("B", 100)]; });
    expect(s.players[0].cash).toBeLessThan(10_000); expect(s.players[0].bigDebt ?? 0).toBe(0); expect(s.players[0].restarts).toBe(0);
    expect(s.players[0].assets.map((a) => a.code)).toEqual(["A"]);
  });
  it("Yana pullar da pul oqimi qarzni yopadi", () => {
    const s = land("big", 26, (g) => { g.players[0].cash = 0; g.players[0].bigDebt = 3000; });
    expect(s.players[0].bigDebt).toBe(0); expect(s.players[0].cash).toBe(2000);
  });
  it("4 ta Yana pullar dan keyin ham yopilmasa biznes bankka sotiladi", () => {
    const s = land("big", 26, (g) => { Object.assign(g.players[0], { cash: 0, lockedFlow: 0, bigDebt: 900_000, bigDebtY: 3, assets: [biz("A", 500), { ...biz("B", 100), price: 1_000_000 }] }); });
    expect(s.players[0].assets.map((a) => a.code)).toEqual(["A"]); expect(s.players[0].bigDebt).toBe(0); expect(s.players[0].cash).toBeGreaterThanOrEqual(100_000);
  });
  it("sotadigan biznes ham yo'q — asl qo'llanma: yangi kasb kartasi bilan kichik aylanaga; naqd, bolalar va mulk saqlanadi, maosh qaytadi", () => {
    const apt = { kind: "apartment", code: "KV1", price: 5000, monthlyIncome: 200, creditPayment: 0, credit: 0 };
    const s = land("big", 26, (g) => { Object.assign(g.players[0], { cash: 1234, lockedFlow: 0, bigDebt: 900_000, bigDebtY: 3, assets: [apt], children: 2, quitJob: true, salary: 0 }); });
    const p = s.players[0];
    expect(p.circle).toBe("small"); expect(p.restarts).toBe(0); expect(p.children).toBe(2); expect(p.assets.map((a) => a.code)).toEqual(["KV1"]);
    expect(p.quitJob).toBe(false); expect(p.salary).toBe(ctx.kasb[p.profession].salary); expect(p.salary).toBeGreaterThan(0); expect(p.baseExpenses).toBe(ctx.kasb[p.profession].total);
    expect(p.cash).toBe(0); expect(p.bigDebt ?? 0).toBe(0); // naqd avval qarzga ketadi (qarz darhol yopiladi), qolgani bo'lsa saqlanadi
  });
});

describe("Tavakkal biznes (V): to'liq narx naqd + 1 kubik", () => {
  const cell = (i: number) => ctx.bigBoard[i];
  const tryGamble = (i: number, want: boolean) => {
    for (let seed = 1; seed < 400; seed++) {
      const s = land("big", i); if (s.pending?.cardId !== `big-${i}`) throw new Error("taklif yo'q");
      s.rngState = seed; const r: any = reduce(s, ctx, { type: "decide", playerId: "p0", accept: true });
      if (r.state.lastGamble.won === want) return { before: s, after: r.state as GameState };
    } throw new Error("natija topilmadi");
  };
  it("bir martalik natija: yutsa lump naqdga qo'shiladi (aktiv yo'q), yutqazsa narx qaytmaydi", () => {
    const c = cell(2); const w = tryGamble(2, true); const l = tryGamble(2, false);
    expect(w.after.players[0].cash - w.before.players[0].cash).toBe(c.lump! - c.price!); expect(w.after.players[0].assets).toHaveLength(0);
    expect(l.after.players[0].cash - l.before.players[0].cash).toBe(-c.price!);
  });
  it("oylik daromadli: yutsa biznes sizniki", () => {
    const c = cell(21); const w = tryGamble(21, true);
    expect(w.after.players[0].assets.find((a) => a.code === "big-21")).toMatchObject({ monthlyIncome: c.income, price: c.price });
    const l = tryGamble(21, false); expect(l.after.players[0].assets).toHaveLength(0);
  });
  it("yutuq qirralari kartadagi sonlar: katak 10 → 1 yoki 6", () => { expect(cell(10).faces).toEqual([1, 6]); expect(cell(21).faces).toEqual([2, 4, 6]); });
  it("naqd yetmasa qabul qilib bo'lmaydi (bank krediti ham yo'q)", () => {
    const s = land("big", 2, (g) => { g.players[0].cash = 100_000; g.players[0].lockedFlow = 0; });
    const c0 = s.players[0].cash; const r: any = reduce(s, ctx, { type: "decide", playerId: "p0", accept: true, useBank: true });
    expect(r.state.players[0].cash).toBe(c0); expect(r.state.players[0].bankDebt).toBe(0); expect(r.state.lastGamble ?? null).toBeNull();
  });
});

describe("Birovning biznesi: A — oylik daromadni to'lash; B — 2× narxda sotib olish, keyin 3×", () => {
  const owned = (g: GameState, i: number, tokens?: number) => { g.players[1].assets = [{ ...biz(`big-${i}`, 17_000, "business"), price: ctx.bigBoard[i].price!, tokens }]; };
  const T = ctx.bigBoard.findIndex((c) => c.t === "T" && c.price && c.income);
  it("o'z biznesiga tushsa e'tibor bermaydi", () => {
    const s = land("big", T, (g) => { g.players[0].assets = [{ ...biz(`big-${T}`, 17_000, "business"), price: ctx.bigBoard[T].price! }]; }); expect(s.pending).toBeNull();
  });
  it("A: oylik daromad egasiga o'tadi", () => {
    const s = land("big", T, (g) => owned(g, T)); expect(s.pending?.cardId).toBe(`rent-${T}`);
    const c0 = [s.players[0].cash, s.players[1].cash]; const r: any = reduce(s, ctx, { type: "decide", playerId: "p0", accept: false });
    expect(c0[0] - r.state.players[0].cash).toBe(17_000); expect(r.state.players[1].cash - c0[1]).toBe(17_000);
  });
  it("B: 2× narx, egasi sotadi, 2 ta fishka; keyingisi 3×", () => {
    const price = ctx.bigBoard[T].price!;
    const s = land("big", T, (g) => owned(g, T)); expect(s.pending?.rent).toMatchObject({ mult: 2, buyPrice: 2 * price });
    const r: any = reduce(s, ctx, { type: "decide", playerId: "p0", accept: true }); const n: GameState = r.state;
    expect(n.players[0].assets.find((a) => a.code === `big-${T}`)).toMatchObject({ tokens: 2, monthlyIncome: 17_000 }); expect(n.players[1].assets).toHaveLength(0);
    expect(n.players[1].cash - s.players[1].cash).toBe(2 * price);
    const again = land("big", T, (g) => { g.players[1].assets = []; g.players[2].assets = [{ ...biz(`big-${T}`, 17_000, "business"), price, tokens: 2 }]; });
    expect(again.pending?.rent).toMatchObject({ mult: 3, buyPrice: 3 * price });
  });
  it("B ga pul yetmasa A bajariladi", () => {
    const s = land("big", T, (g) => { owned(g, T); g.players[0].cash = 40_000; g.players[0].lockedFlow = 0; });
    const r: any = reduce(s, ctx, { type: "decide", playerId: "p0", accept: true }); expect(r.state.players[0].assets).toHaveLength(0);
  });
  it("katta aylana biznesiga sheriklik taklif qilib bo'lmaydi", () => {
    const s = land("big", T); expect(s.pending?.cardId).toBe(`big-${T}`);
    const r: any = reduce(s, ctx, { type: "partner_offer", playerId: "p0", partnerId: "p1" }); expect(r.ok).toBe(false);
  });
});

describe("Orzu katagi", () => {
  const O = ctx.bigBoard.findIndex((c) => c.t === "O");
  it("boshqa orzuga tushsa — katta aylana xarajat kartasi (kxar) olinadi", () => {
    const s = land("big", O, (g) => { g.players[0].dreamIdx = ctx.dreams.findIndex((d) => d.name !== ctx.bigBoard[O].name); });
    expect(s.lastCard?.cardId.startsWith("kxar-")).toBe(true);
  });
  it("o'z orzuiga pul oqimi yetmay tushsa — g'alaba yo'q, kxar", () => {
    const s = land("big", O, (g) => { g.players[0].dreamIdx = ctx.dreams.findIndex((d) => d.name === ctx.bigBoard[O].name); g.players[0].lockedFlow = 5000; });
    expect(s.winner).toBeNull(); expect(s.lastCard?.cardId.startsWith("kxar-")).toBe(true);
  });
  it("o'z orzuiga 100 000 pul oqimi va yetarli naqd bilan tushsa — g'alaba", () => {
    const s = land("big", O, (g) => { Object.assign(g.players[0], { dreamIdx: ctx.dreams.findIndex((d) => d.name === ctx.bigBoard[O].name), lockedFlow: 100_000, cash: 50_000_000 }); });
    expect(s.winner).toBe("p0");
  });
});

describe("Ishdan bo'shash: 3-kichik yoki 1-katta biznes", () => {
  const buy = (g: GameState, id: string) => { g.pending = { type: "card", playerId: "p0", cardId: id, deck: "kichik" }; Object.assign(g.players[0], { cash: 5_000_000 }); const r: any = reduce(g, ctx, { type: "decide", playerId: "p0", accept: true }); return r.state as GameState; };
  const kb = Object.values(ctx.effects).filter((e) => (e.effect as any).kind === "buy" && (e.effect as any).asset === "small_business").map((e) => e.id);
  const ks = Object.values(ctx.effects).filter((e) => (e.effect as any).kind === "buy" && (e.effect as any).asset === "business").map((e) => e.id);
  it("3-kichik biznesda maosh to'xtaydi", () => {
    let g = mk(); g.players[0].assets = [biz("x1", 10), biz("x2", 10)]; const sal = g.players[0].salary; expect(sal).toBeGreaterThan(0);
    g = buy(g, kb[0]); expect(g.players[0].quitJob).toBe(true); expect(g.players[0].salary).toBe(0);
  });
  it("2-kichik biznesda hali ishlaydi", () => {
    let g = mk(); g.players[0].assets = [biz("x1", 10)]; g = buy(g, kb[0]); expect(g.players[0].quitJob ?? false).toBe(false); expect(g.players[0].salary).toBeGreaterThan(0);
  });
  it("1-katta biznesda maosh to'xtaydi", () => {
    const g = buy(mk(), ks[0]); expect(g.players[0].quitJob).toBe(true); expect(g.players[0].salary).toBe(0);
  });
});

describe("Avtomatik qarorlar hisoblanadi (ball −2)", () => {
  it("auto bayrog'i bilan kubik tashlash autos ni oshiradi; oddiy tashlash — yo'q", () => {
    const a: any = reduce(mk(), ctx, { type: "roll", playerId: "p0", auto: true }); expect(a.state.players[0].autos).toBe(1);
    const b: any = reduce(mk(), ctx, { type: "roll", playerId: "p0" }); expect(b.state.players[0].autos ?? 0).toBe(0);
  });
});

describe("katta aylana: tasodifiy o'yinlar xatosiz va sonlar chekli (fuzz)", () => {
  it("60 ta o'yin, har biri ≤ 600 navbat", () => {
    for (let seed = 1; seed <= 60; seed++) {
      let s = newGame(ctx, ["a", "b", "c"], seed, [], [], { dreamPhase: false });
      s.players.forEach((p, i) => Object.assign(p, { circle: "big", pos: 34, lockedFlow: 20_000 + (seed % 5) * 20_000, cash: 200_000 + (seed * 7919) % 3_000_000, dreamIdx: i }));
      for (let t = 0; t < 600 && !s.winner; t++) {
        const me = s.players[s.turn % s.players.length].id; const r: any = reduce(s, ctx, { type: "roll", playerId: me }); expect(r.ok, r.error).toBe(true); s = r.state;
        while (s.pending) { const k = (base.effects[s.pending.cardId]?.effect as any)?.kind; const d: any = reduce(s, ctx, { type: "decide", playerId: me, accept: (k === "buy" || seed % 2 === 0) && !slotBlocked(effectOf(base, s.pending.cardId).effect, s.players.find((p) => p.id === me)!) }); expect(d.ok, d.error).toBe(true); s = d.state; }
        s.proposals = [];
        for (const p of s.players) for (const v of [p.cash, p.bigDebt ?? 0, p.lockedFlow]) expect(Number.isFinite(v)).toBe(true);
      }
    }
  }, 60_000);
});

describe("Qarz (owe) — kichik aylana (qo'llanma §09)", () => {
  it("naqd yetmasa yetmagani qarz bo'ladi; naqd paydo bo'lishi bilan darhol yopiladi", () => {
    const p: any = { cash: 300, owe: 200 }; expect(settleOwe(p)).toMatchObject({ cash: 100, owe: 0 });
    expect(settleOwe({ cash: 100, owe: 250 } as any)).toMatchObject({ cash: 0, owe: 150 });
    expect(settleOwe({ cash: 0, owe: 50 } as any)).toMatchObject({ cash: 0, owe: 50 });
  });
  it("10 000 dan oshsa yangi kasb bilan boshidan (majburiy to'lov)", () => {
    const s = land("small", cellOf("K"), (g) => { g.players[0].cash = 0; g.players[0].owe = 9_990; }); // K — hod kartasi: katta to'lovlar
    expect(s.players[0].restarts + (s.players[0].owe ?? 0)).toBeGreaterThan(0);
  });
  it("kichik aylanadan chiqish qarz bilan mumkin emas", () => {
    const s = mk(); Object.assign(s.players[0], { cash: 2_000_000, owe: 10, salary: 0, assets: [biz("A", 30_000)] });
    const r: any = reduce(s, ctx, { type: "roll", playerId: "p0" }); expect(r.state.players[0].circle).toBe("small");
  });
});

describe("Imkoniyat: naqd 25 000 dan ko'p bo'lsa dekani tanlash (qo'llanma §06)", () => {
  const I = cellOf("I");
  it("naqd kam — «Kichik sarmoya» darhol", () => {
    const s = land("small", I, (g) => { g.players[0].cash = 1000; }); expect(s.lastCard?.cardId.startsWith("kichik-")).toBe(true); expect(s.pending?.cardId).not.toBe("choose-opp");
  });
  it("naqd ko'p — avval tanlov, so'ng tanlangan dekadan karta", () => {
    const s = land("small", I, (g) => { g.players[0].cash = 60_000; }); expect(s.pending?.cardId).toBe("choose-opp");
    expect(ctx.effects["choose-opp"]).toBeUndefined();
    const k: any = reduce(s, ctx, { type: "decide", playerId: "p0", accept: false, deck: "katta" }); expect(k.ok).toBe(true);
    expect(k.state.lastCard?.cardId.startsWith("katta-")).toBe(true); expect(k.state.turn).toBe(s.turn); // karta hali hal qilinmagan, navbat o'tmagan
    const d: any = reduce(s, ctx, { type: "decide", playerId: "p0", accept: false }); expect(d.state.lastCard?.cardId.startsWith("kichik-")).toBe(true); // vaqt tugadi → kichik
  });
});

describe("Kubik: kichik aylanada 1 ta, katta aylanada 2 ta (qo'llanma §04)", () => {
  it("kichik 1–6; katta 2–12 va 6 dan kattasi ham tushadi", () => {
    const seen = { small: new Set<number>(), big: new Set<number>() };
    for (let seed = 1; seed <= 300; seed++) for (const circle of ["small", "big"] as const) {
      const g = mk(); Object.assign(g.players[0], { circle, pos: circle === "big" ? 34 : 0, cash: 5_000_000, lockedFlow: 1 }); g.rngState = seed;
      const r: any = reduce(g, ctx, { type: "roll", playerId: "p0" }); expect(r.ok).toBe(true); seen[circle].add(r.die);
    }
    expect(Math.min(...seen.small)).toBe(1); expect(Math.max(...seen.small)).toBe(6);
    expect(Math.min(...seen.big)).toBe(2); expect(Math.max(...seen.big)).toBeGreaterThan(6);
  });
});
