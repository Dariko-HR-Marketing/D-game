// Sotib olingan aktiv qaysi kartadan ekani saqlanadi (`code` 35 ta kichik biznes kartasida bir xil «KB» — portfelda hammasi birinchi karta nomi bilan chiqardi).
import { describe, it, expect } from "vitest";
import { ctx } from "./testctx";
import { newGame, reduce } from "./index";

const buyCard = (s: any, cardId: string) => {
  s.turn = 0; s.pending = { type: "card", playerId: "p0", cardId, deck: "kichik" }; Object.assign(s.players[0], { cash: 50_000 });
  const r: any = reduce(s, ctx, { type: "decide", playerId: "p0", accept: true }); expect(r.ok, cardId + " " + JSON.stringify(r.error ?? r.reason)).toBe(true); return r.state;
};

describe("aktiv karta ID si", () => {
  it("bir xil kodli ikki xil kichik biznes kartasi — aktivlarda har biri o'z karta ID si bilan", () => {
    const kb = Object.values(ctx.effects).filter((e: any) => e.effect.kind === "buy" && e.effect.asset === "small_business" && e.effect.code === "KB" && e.deck === "kichik").slice(0, 2).map((e: any) => e.id);
    expect(kb).toHaveLength(2); expect(ctx.effects[kb[0]].text).not.toBe(ctx.effects[kb[1]].text);
    let s: any = newGame(ctx, ["p0", "p1"], 1, [], [], { events: false });
    s = buyCard(s, kb[0]); s = buyCard(s, kb[1]);
    const a = s.players[0].assets.filter((x: any) => x.code === "KB"); expect(a.map((x: any) => x.cardId)).toEqual(kb);
  });
});
