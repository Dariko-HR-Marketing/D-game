import { describe, it, expect } from "vitest";
import { buildApp } from "./app";

const H = (t: string) => ({ authorization: `Bearer ${t}` });

describe("faol o'yin", () => {
  it("/me/active: xonada bo'lsa kod, chiqsa yoki xonasiz bo'lsa null; tokensiz 401", async () => {
    const x = buildApp();
    expect((await x.app.inject({ method: "GET", url: "/me/active", headers: H("alice") })).json()).toEqual({ active: null });
    const r = x.rooms.create("alice"); if (!r.ok) throw 0;
    const a = (await x.app.inject({ method: "GET", url: "/me/active", headers: H("alice") })).json().active;
    expect(a).toEqual({ code: r.code, started: false, round: 0, players: 1 });
    x.rooms.leave(r.code, "alice");
    expect((await x.app.inject({ method: "GET", url: "/me/active", headers: H("alice") })).json()).toEqual({ active: null });
    expect((await x.app.inject({ method: "GET", url: "/me/active" })).statusCode).toBe(401);
  });
});
