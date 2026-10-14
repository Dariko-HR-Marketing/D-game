import { describe, it, expect } from "vitest";
import { buildApp } from "./app";
import { ProfileService, validateProfile, isRestricted, levelOf, POINTS } from "./profiles";

const Y = 2026;
describe("profil tekshiruvi (§7)", () => {
  const ok = { name: "Ali", color: 3, birthYear: 2000 };
  it("to'g'ri profil", () => expect(validateProfile(ok, Y)).toEqual({ ok: true, value: ok }));
  it.each([
    [{ ...ok, name: "A" }, "bad_name"], [{ ...ok, name: "x".repeat(25) }, "bad_name"], [{ ...ok, name: "<b>hi" }, "bad_name"],
    [{ ...ok, color: 6 }, "bad_color"], [{ ...ok, color: -1 }, "bad_color"], [{ ...ok, color: 1.5 }, "bad_color"],
    [{ ...ok, birthYear: 1899 }, "bad_birth_year"], [{ ...ok, birthYear: Y + 1 }, "bad_birth_year"], [{ ...ok, birthYear: "2000" }, "bad_birth_year"],
  ])("rad: %j", (input, error) => expect(validateProfile(input, Y)).toEqual({ ok: false, error }));
  it("ism bo'shliqlari tozalanadi", () => expect((validateProfile({ ...ok, name: "  Ali   Vali " }, Y) as any).value.name).toBe("Ali Vali"));
  it("16 yoshgacha cheklov chegarasi", () => {
    expect(isRestricted({ birthYear: 2011 }, Y)).toBe(true);  // 15
    expect(isRestricted({ birthYear: 2010 }, Y)).toBe(false); // 16
    expect(isRestricted(undefined, Y)).toBe(false);
  });
  it("daraja: har 100 ball (§5.9); ball qoidasi bo'sh", () => { expect(levelOf(99)).toBe(0); expect(levelOf(250)).toBe(2); expect(POINTS.win).toBeNull(); });
});

describe("tarix va reyting", () => {
  const mk = () => { const s = new ProfileService(undefined, () => Y, () => 1000); for (const [id, n] of [["a", "Ali"], ["b", "Bobur"], ["c", "Sara"]]) s.put(id, { name: n, color: 0, birthYear: 1990 }); return s; };
  const res = (winner: string | null, players: ([string, boolean] | [string, boolean, "small" | "big"])[]) => ({ room: "R", finishedAt: 5, durationMs: 100, rounds: 7, winner, contentVersion: 1,
    players: players.map(([id, bot, circle]) => ({ id, bot, circle: circle ?? "small", restarts: 0, won: id === winner })) });
  it("statistika va reyting: g'alaba ko'p yuqorida, botlar reytingda yo'q", () => {
    const s = mk();
    s.record(res("a", [["a", false, "big"], ["b", false], ["bot-1", true]])); s.record(res("a", [["a", false, "big"], ["c", false]])); s.record(res("b", [["b", false, "big"], ["c", false]]));
    expect(s.stats("a")).toMatchObject({ games: 2, wins: 2, reachedBig: 2, points: 0, level: 0 });
    const lb = s.leaderboard();
    expect(lb.map((x) => [x.rank, x.name, x.wins])).toEqual([[1, "Ali", 2], [2, "Bobur", 1], [3, "Sara", 0]]);
    expect(JSON.stringify(lb)).not.toContain("userId"); // shaxsiy ID chiqmaydi
    expect(s.history("c")).toHaveLength(2); expect(s.history("a")[0].won).toBe(true);
  });
  it("hisobni o'chirish: profil yo'q, natijalar anonim", () => {
    const s = mk(); s.record(res("a", [["a", false], ["b", false]])); s.delete("a");
    expect(s.get("a")).toBeUndefined(); expect(s.results[0].winner).toBe("deleted"); expect(s.results[0].players.map((p) => p.id)).toEqual(["deleted", "b"]);
  });
});

describe("HTTP: profil, eksport, o'chirish, reyting", () => {
  const H = (t: string) => ({ authorization: `Bearer ${t}` });
  it("profil saqlash/o'qish, cheklov bayrog'i, noto'g'ri ma'lumot 400", async () => {
    const x = buildApp();
    expect((await x.app.inject({ method: "GET", url: "/me/profile" })).statusCode).toBe(401);
    const bad = await x.app.inject({ method: "PUT", url: "/me/profile", headers: H("kid"), payload: { name: "", color: 0, birthYear: 2000 } });
    expect(bad.statusCode).toBe(400);
    const put = await x.app.inject({ method: "PUT", url: "/me/profile", headers: H("kid"), payload: { name: "Kichik", color: 2, birthYear: new Date().getFullYear() - 12 } });
    expect(put.json().restricted).toBe(true);
    expect((await x.app.inject({ method: "GET", url: "/me/profile", headers: H("kid") })).json().profile.name).toBe("Kichik");
  });
  it("16 yoshgacha o'yinchida o'zaro qarz yopiq (xona darajasida)", async () => {
    const x = buildApp(); const yr = new Date().getFullYear();
    for (const [id, by] of [["kid", yr - 12], ["p1", 1990], ["p2", 1990], ["p3", 1990], ["p4", 1990]] as [string, number][]) await x.app.inject({ method: "PUT", url: "/me/profile", headers: H(id), payload: { name: id + id, color: 0, birthYear: by } });
    const r = x.rooms.create("kid"); if (!r.ok) throw 0; for (const id of ["p1", "p2", "p3", "p4"]) x.rooms.join(r.code, id);
    await x.rooms.start(r.code, "kid", 1, { dreams: false });
    expect(x.rooms.rooms.get(r.code)!.state!.restricted).toEqual(["kid"]);
    expect(x.rooms.view(x.rooms.rooms.get(r.code)!).names.kid.name).toBe("kidkid");
  });
  it("o'yin tugaganda natija yoziladi va reytingda ko'rinadi", async () => {
    const x = buildApp();
    for (const id of ["a", "b"]) await x.app.inject({ method: "PUT", url: "/me/profile", headers: H(id), payload: { name: id.toUpperCase() + "x", color: 1, birthYear: 1990 } });
    const r = x.rooms.create("a"); if (!r.ok) throw 0; x.rooms.join(r.code, "b"); await x.rooms.start(r.code, "a", 1, { dreams: false });
    const room = x.rooms.rooms.get(r.code)!; room.state!.winner = "a"; room.state!.players[0].won = true; room.state!.players[0].circle = "big";
    (x.rooms as any).finish(room);
    const lb = (await x.app.inject({ method: "GET", url: "/leaderboard" })).json();
    expect(lb[0]).toMatchObject({ rank: 1, name: "Ax", wins: 1, games: 1 });
    expect((await x.app.inject({ method: "GET", url: "/me/history", headers: H("a") })).json()[0]).toMatchObject({ won: true, reachedBig: true });
    expect((await x.app.inject({ method: "GET", url: "/me/export", headers: H("b") })).json().stats.games).toBe(1);
  });
  it("hisobni o'chirish: 'O'CHIRISH' tasdig'i shart; o'yinda bo'lsa rad", async () => {
    const x = buildApp();
    await x.app.inject({ method: "PUT", url: "/me/profile", headers: H("u"), payload: { name: "Uu", color: 0, birthYear: 1990 } });
    expect((await x.app.inject({ method: "DELETE", url: "/me", headers: H("u"), payload: { confirm: "yes" } })).statusCode).toBe(400);
    const r = x.rooms.create("u"); if (!r.ok) throw 0;
    expect((await x.app.inject({ method: "DELETE", url: "/me", headers: H("u"), payload: { confirm: "O'CHIRISH" } })).statusCode).toBe(409);
    x.rooms.leave(r.code, "u");
    expect((await x.app.inject({ method: "DELETE", url: "/me", headers: H("u"), payload: { confirm: "O'CHIRISH" } })).json().ok).toBe(true);
    expect((await x.app.inject({ method: "GET", url: "/me/profile", headers: H("u") })).json().profile).toBeNull();
  });
});
