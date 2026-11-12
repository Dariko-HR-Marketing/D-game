// Qarz so'rovi va sheriklik taklifini rad etish: taklif o'chadi, pul/aktiv ko'chmaydi, so'ragan o'yinchiga xabar boradi.
import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { newGame, reduce, currentPlayer, type GameState } from "./index";

const run = (s: GameState, a: any) => reduce(s, ctx, a);
const must = (r: any) => { if (!r.ok) throw new Error(r.error); return r.state as GameState; };
const P = (s: GameState, id: string) => s.players.find((p) => p.id === id)!;

describe("qarz so'rovini rad etish", () => {
  const prep = () => { const s = newGame(ctx, Array.from({ length: 5 }, (_, i) => `p${i}`), 1, []); for (const p of s.players) { p.circle = "small"; p.cash = 100_000; p.salary = 5_000; } P(s, "p0").cash = 1_000; return s; };
  it("beruvchi rad etadi: taklif o'chadi, pul ko'chmaydi, so'ragan o'yinchiga xabar boradi", () => {
    let s = must(run(prep(), { type: "loan_request", playerId: "p0", giverId: "p1", amount: 500, months: 12 }));
    s = must(run(s, { type: "loan_decline", playerId: "p1", proposalId: s.proposals[0].id }));
    expect(s.proposals).toHaveLength(0); expect(P(s, "p0").cash).toBe(1_000); expect(P(s, "p1").cash).toBe(100_000); expect(P(s, "p0").handDebts).toHaveLength(0);
    expect(s.notices!.some((n) => n.to === "p0" && n.key === "loan_declined" && n.from === "p1" && n.amount === 500)).toBe(true);
  });
  it("faqat beruvchi rad eta oladi; taklif yo'q bo'lsa xato", () => {
    const s = must(run(prep(), { type: "loan_request", playerId: "p0", giverId: "p1", amount: 500, months: 12 })); const id = s.proposals[0].id;
    expect(run(s, { type: "loan_decline", playerId: "p2", proposalId: id })).toEqual({ ok: false, error: "not_giver" });
    expect(run(s, { type: "loan_decline", playerId: "p1", proposalId: 999 })).toEqual({ ok: false, error: "no_proposal" });
  });
  it("rad etilgan taklifni keyin qabul qilib bo'lmaydi", () => {
    let s = must(run(prep(), { type: "loan_request", playerId: "p0", giverId: "p1", amount: 500, months: 12 })); const id = s.proposals[0].id;
    s = must(run(s, { type: "loan_decline", playerId: "p1", proposalId: id }));
    expect(run(s, { type: "loan_accept", playerId: "p1", proposalId: id })).toEqual({ ok: false, error: "no_proposal" });
  });
});

describe("sheriklik taklifini rad etish", () => {
  const setup = () => {
    const s = newGame(ctx, ["p0", "p1"], 1, []); const owner = P(s, "p0"), partner = P(s, "p1"); owner.circle = "small"; partner.circle = "small";
    const id = ctx.deckIds.katta.find((i) => { const e = ctx.effects[i].effect; return e.kind === "buy" && e.asset === "business"; })!;
    const e = ctx.effects[id].effect as any;
    s.pending = { type: "card", playerId: "p0", cardId: id, deck: "katta" };
    owner.cash = e.price / 2 + 10; owner.bankDebt = 10_000; partner.cash = e.price;
    return s;
  };
  it("sherik rad etadi: taklif o'chadi, karta egasida qoladi, pul/aktiv ko'chmaydi, xabar boradi", () => {
    let s = must(run(setup(), { type: "partner_offer", playerId: "p0", partnerId: "p1" })); const cash = P(s, "p1").cash;
    s = must(run(s, { type: "partner_decline", playerId: "p1", proposalId: s.proposals[0].id }));
    expect(s.proposals).toHaveLength(0); expect(s.pending?.cardId).toBeTruthy(); expect(P(s, "p1").cash).toBe(cash); expect(P(s, "p1").assets).toHaveLength(0);
    expect(s.notices!.some((n) => n.to === "p0" && n.key === "partner_declined" && n.from === "p1")).toBe(true);
  });
  it("faqat taklif qilingan sherik rad eta oladi", () => {
    const s = must(run(setup(), { type: "partner_offer", playerId: "p0", partnerId: "p1" }));
    expect(run(s, { type: "partner_decline", playerId: "p0", proposalId: s.proposals[0].id })).toEqual({ ok: false, error: "not_partner" });
  });
  it("karta egasi qaror qilgach (karta yopildi), sherikdagi taklif o'chadi; taklifda sherik ulushi bor", () => {
    let s = must(run(setup(), { type: "partner_offer", playerId: "p0", partnerId: "p1" }));
    expect(s.proposals[0]).toMatchObject({ kind: "partner", half: expect.any(Number) });
    s = must(run(s, { type: "decide", playerId: "p0", accept: false }));
    expect(s.proposals.filter((x) => x.kind === "partner")).toHaveLength(0);
  });
});

describe("voqealar yozuvi (so'nggi voqealar)", () => {
  it("so'rov, rad etish va qabul qilish yozuvga tushadi", () => {
    const p = newGame(ctx, Array.from({ length: 5 }, (_, i) => `p${i}`), 1, []); for (const q of p.players) { q.circle = "small"; q.cash = 100_000; q.salary = 5_000; } P(p, "p0").cash = 1_000;
    let s = must(run(p, { type: "loan_request", playerId: "p0", giverId: "p1", amount: 500, months: 12 }));
    expect(s.log.at(-1)).toContain("p0: p1 dan qarz so'radi");
    s = must(run(s, { type: "loan_decline", playerId: "p1", proposalId: s.proposals[0].id })); expect(s.log.at(-1)).toContain("p1: p0 ning qarz so'rovini rad etdi");
    s = must(run(s, { type: "loan_request", playerId: "p0", giverId: "p1", amount: 500, months: 12 }));
    s = must(run(s, { type: "loan_accept", playerId: "p1", proposalId: s.proposals[0].id })); expect(s.log.at(-1)).toContain("p1: p0 ga qarz berdi");
  });
  it("karta chiqdi va qaror (qabul qildi / o'tkazdi) yoziladi", () => {
    let s = newGame(ctx, ["p0", "p1"], 3, []); let seen = false;
    for (let i = 0; i < 80 && !seen; i++) {
      const cur = currentPlayer(s).id; const r = run(s, { type: "roll", playerId: cur }); if (!r.ok) break; s = r.state;
      if (s.pending) { const d = run(s, { type: "decide", playerId: cur, accept: false }); if (d.ok) { s = d.state; seen = s.log.some((l) => l.includes("karta chiqdi")) && s.log.some((l) => l.includes("— o'tkazdi")); } }
    }
    expect(seen).toBe(true);
  });
});
