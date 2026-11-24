import { describe, it, expect } from "vitest";
import { buildApp } from "./app";
import { Clubs, CLUB_LIMITS } from "./clubs";
import { MemoryDocs } from "./docs";

const H = (u: string) => ({ authorization: `Bearer ${u}` });
const Y = new Date().getFullYear();
describe("Klublar: Premium yaratadi, hamma bepul qo'shiladi", () => {
  it("modul: nom, chegara, egalik o'tishi, o'chirish", async () => {
    const c = await new Clubs(new MemoryDocs()).load();
    expect(c.create("a", "Klub", false, false)).toEqual({ ok: false, error: "premium_required" }); expect(c.create("a", "K", true, false)).toEqual({ ok: false, error: "bad_name" }); expect(c.create("a", "Klub", true, true)).toEqual({ ok: false, error: "restricted" });
    const r = c.create("a", "Do'stlar <b>", true, false); expect(r.ok).toBe(true); if (!r.ok) return; expect(r.club.name).toBe("Do'stlar b"); expect(r.club.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(c.join("b", r.club.code.toLowerCase(), false).ok).toBe(true); expect(c.join("b", r.club.code, false)).toEqual({ ok: false, error: "already_member" }); expect(c.join("c", "XXXXXX", false)).toEqual({ ok: false, error: "bad_code" }); expect(c.join("c", r.club.code, true)).toEqual({ ok: false, error: "restricted" });
    c.leave("a", r.club.id); expect(c.items.get(r.club.id)!.ownerId).toBe("b"); expect(c.leave("a", r.club.id)).toEqual({ ok: false, error: "not_member" });
    expect(c.remove("a", r.club.id)).toEqual({ ok: false, error: "not_member" }); expect(c.remove("b", r.club.id)).toEqual({ ok: true }); expect(c.mine("b")).toHaveLength(0);
    for (let i = 0; i < CLUB_LIMITS.ownedPerUser; i++) expect(c.create("o", "Klub" + i, true, false).ok).toBe(true); expect(c.create("o", "Yana", true, false)).toEqual({ ok: false, error: "limit_owned" });
  });
  it("API: Premium yaratadi, bepul foydalanuvchi qo'shiladi, reyting faqat a'zolarga, hisobni o'chirishda chiqadi", async () => {
    const x = buildApp(); const put = async (u: string, birthYear: number) => (await x.app.inject({ method: "PUT", url: "/me/profile", headers: H(u), payload: { name: "Ali" + u, color: 1, birthYear } })).statusCode;
    for (const u of ["p", "f"]) expect(await put(u, 1990)).toBe(200); expect(await put("kid", Y - 12)).toBe(200);
    const bad = await x.app.inject({ method: "POST", url: "/clubs", headers: H("f"), payload: { name: "Klub" } }); expect(bad.statusCode).toBe(402); expect(bad.json().error).toBe("premium_required");
    x.commerce.ents.set("p", { ...x.commerce.ent("p"), premiumUntil: Date.now() + 86_400_000, premiumPlan: "monthly" });
    const mk = await x.app.inject({ method: "POST", url: "/clubs", headers: H("p"), payload: { name: "Do'stlar" } }); expect(mk.statusCode).toBe(200); const club = mk.json().club; expect(club.owner).toBe(true); expect(club.code).toHaveLength(6);
    const jn = await x.app.inject({ method: "POST", url: "/clubs/join", headers: H("f"), payload: { code: club.code } }); expect(jn.statusCode).toBe(200); expect(jn.json().club.owner).toBe(false);
    expect((await x.app.inject({ method: "POST", url: "/clubs/join", headers: H("kid"), payload: { code: club.code } })).statusCode).toBe(403); // 16 yoshgacha
    const b = (await x.app.inject({ method: "GET", url: `/clubs/${club.id}/board`, headers: H("f") })).json(); expect(b.board).toHaveLength(2); expect(b.board.filter((r: any) => r.me)).toHaveLength(1); expect(JSON.stringify(b)).not.toContain("\"userId\"");
    expect((await x.app.inject({ method: "GET", url: `/clubs/${club.id}/board`, headers: H("kid") })).statusCode).toBe(403);
    const l = (await x.app.inject({ method: "GET", url: "/clubs", headers: H("f") })).json(); expect(l.clubs).toHaveLength(1); expect(l.premium).toBe(false);
    expect((await x.app.inject({ method: "DELETE", url: "/me", headers: H("f"), payload: { confirm: "O'CHIRISH" } })).statusCode).toBe(200); expect(x.clubs.mine("f")).toHaveLength(0);
  });
  it("Premium e'lonlari («erta kirish»): faqat Premium ko'radi", async () => {
    const x = buildApp(); x.ops.anns.set("e1", { id: "e1", text: "Yangi rejim sinovi", kind: "info", audience: "premium", from: 0, until: Date.now() + 1e9, active: true, by: "a", createdAt: 1 } as any); x.ops.anns.set("e2", { id: "e2", text: "Hammaga", kind: "info", audience: "all", from: 0, until: Date.now() + 1e9, active: true, by: "a", createdAt: 2 } as any);
    for (const u of ["p2", "f2"]) await x.app.inject({ method: "PUT", url: "/me/profile", headers: H(u), payload: { name: "A" + u, color: 1, birthYear: 1990 } });
    x.commerce.ents.set("p2", { ...x.commerce.ent("p2"), premiumUntil: Date.now() + 86_400_000, premiumPlan: "monthly" });
    const pa = (await x.app.inject({ method: "GET", url: "/me/announcements", headers: H("p2") })).json().announcements, fa = (await x.app.inject({ method: "GET", url: "/me/announcements", headers: H("f2") })).json().announcements;
    expect(pa.map((a: any) => a.id).sort()).toEqual(["e1", "e2"]); expect(pa.find((a: any) => a.id === "e1").early).toBe(true); expect(fa.map((a: any) => a.id)).toEqual(["e2"]);
  });
});
