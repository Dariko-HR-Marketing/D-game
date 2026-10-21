import { describe, it, expect } from "vitest";
import { buildApp } from "./app";

const H = (t: string) => ({ authorization: `Bearer ${t}` });
const put = (x: ReturnType<typeof buildApp>, uid: string, payload: object) => x.app.inject({ method: "PUT", url: "/me/profile", headers: H(uid), payload });

describe("ixtiyoriy jins (standart avatar uchun)", () => {
  it("saqlanadi, noto'g'ri qiymat rad etiladi, bo'lmasa maydon yo'q; xona ko'rinishida faqat avatar uchun beriladi", async () => {
    const x = buildApp();
    expect((await put(x, "alice", { name: "Alisa", color: 0, birthYear: 1990, gender: "f" })).statusCode).toBe(200);
    expect((await x.app.inject({ method: "GET", url: "/me/profile", headers: H("alice") })).json().profile.gender).toBe("f");
    expect((await put(x, "bob", { name: "Bobur", color: 1, birthYear: 1990 })).statusCode).toBe(200);
    expect((await x.app.inject({ method: "GET", url: "/me/profile", headers: H("bob") })).json().profile.gender).toBeUndefined();
    const bad = await put(x, "bob", { name: "Bobur", color: 1, birthYear: 1990, gender: "x" }); expect(bad.statusCode).toBe(400); expect(bad.json().error).toBe("bad_gender");
    expect((await put(x, "alice", { name: "Alisa", color: 0, birthYear: 1990, gender: null })).statusCode).toBe(200); // bekor qilish
    expect((await x.app.inject({ method: "GET", url: "/me/profile", headers: H("alice") })).json().profile.gender).toBeUndefined();
    await put(x, "alice", { name: "Alisa", color: 0, birthYear: 1990, gender: "f" });
    const r = x.rooms.create("alice"); if (!r.ok) throw 0; x.rooms.join(r.code, "bob");
    const v = x.rooms.view(x.rooms.rooms.get(r.code)!); expect(v.names.alice.gender).toBe("f"); expect(v.names.bob.gender).toBeUndefined();
  });
});
