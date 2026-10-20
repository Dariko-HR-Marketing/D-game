import { describe, it, expect } from "vitest";
import WebSocket from "ws";
import { buildApp } from "./app";
import { ProfileService, validatePhoto } from "./profiles";

const jpeg = (n = 1000) => { const b = Buffer.alloc(n, 7); b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff; return b; };
const dataUrl = (b: Buffer) => `data:image/jpeg;base64,${b.toString("base64")}`;
const H = (u: string) => ({ authorization: `Bearer ${u}` });

describe("avatar rasmi (validatsiya)", () => {
  it("JPEG qabul qilinadi", () => expect(validatePhoto(jpeg())).toEqual({ ok: true }));
  it("JPEG emas — rad", () => expect(validatePhoto(Buffer.alloc(1000, 1))).toEqual({ ok: false, error: "bad_photo" }));
  it("juda katta — rad", () => expect(validatePhoto(jpeg(81 * 1024))).toEqual({ ok: false, error: "photo_too_big" }));
  it("profilsiz rasm qo'yib bo'lmaydi; hisob o'chsa rasm ham o'chadi", () => {
    const s = new ProfileService(undefined, () => 2026, () => 1000);
    expect(s.setPhoto("u", jpeg())).toEqual({ ok: false, error: "profile_required" });
    s.put("u", { name: "Ali", color: 0, birthYear: 1990 }); expect(s.setPhoto("u", jpeg()).ok).toBe(true); expect(s.photoVersion("u")).toBe(1000);
    s.delete("u"); expect(s.photoVersion("u")).toBeUndefined();
  });
});

describe("avatar marshrutlari", () => {
  const setup = async () => { const x = buildApp({ requireProfile: true }); await x.app.inject({ method: "PUT", url: "/me/profile", headers: H("ali"), payload: { name: "Ali", color: 1, birthYear: 1990 } }); return x; };
  it("yuklash, imzolangan manzildan olish, o'chirish", async () => {
    const x = await setup(); const b = jpeg(2000);
    const up = await x.app.inject({ method: "PUT", url: "/me/avatar", headers: H("ali"), payload: { image: dataUrl(b) } });
    expect(up.statusCode).toBe(200); const url = up.json().photo as string; expect(url).toMatch(/^\/avatar\/ali\?v=\d+&s=[0-9a-f]{24}$/);
    const got = await x.app.inject({ method: "GET", url }); expect(got.statusCode).toBe(200); expect(got.headers["content-type"]).toBe("image/jpeg"); expect(Buffer.compare(got.rawPayload, b)).toBe(0);
    expect((await x.app.inject({ method: "GET", url: url.replace(/s=[0-9a-f]{24}/, "s=" + "0".repeat(24)) })).statusCode).toBe(404); // imzo noto'g'ri
    expect((await x.app.inject({ method: "GET", url: "/avatar/ali?v=1&s=x" })).statusCode).toBe(404);
    await x.app.inject({ method: "DELETE", url: "/me/avatar", headers: H("ali") });
    expect((await x.app.inject({ method: "GET", url })).statusCode).toBe(404);
  });
  it("noto'g'ri fayl va katta fayl rad etiladi; profilsiz — rad", async () => {
    const x = await setup();
    expect((await x.app.inject({ method: "PUT", url: "/me/avatar", headers: H("ali"), payload: { image: "data:image/png;base64,AAAA" } })).statusCode).toBe(400);
    expect((await x.app.inject({ method: "PUT", url: "/me/avatar", headers: H("ali"), payload: { image: dataUrl(jpeg(90 * 1024)) } })).statusCode).toBe(413);
    expect((await x.app.inject({ method: "PUT", url: "/me/avatar", headers: H("nobody"), payload: { image: dataUrl(jpeg()) } })).statusCode).toBe(400);
  });
  it("rasm xona ko'rinishidagi names orqali (imzolangan manzil) beriladi", async () => {
    const x = await setup(); await x.app.inject({ method: "PUT", url: "/me/avatar", headers: H("ali"), payload: { image: dataUrl(jpeg()) } });
    const r = x.rooms.create("ali"); if (!r.ok) throw 0; const v = x.rooms.view(x.rooms.rooms.get(r.code)!);
    expect(v.names.ali.photo).toMatch(/^\/avatar\/ali\?v=\d+&s=/); expect(v.names.ali.name).toBe("Ali");
  });
});

describe("ism majburiy (requireProfile)", () => {
  const ask = async (port: number, token: string, msg: unknown) => new Promise<any>((res, rej) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${token}`); const t = setTimeout(() => rej(new Error("timeout")), 3000);
    ws.on("open", () => ws.send(JSON.stringify(msg))); ws.on("message", (d) => { clearTimeout(t); ws.close(); res(JSON.parse(d.toString())); });
  });
  it("profilsiz foydalanuvchi xona ocha olmaydi va qo'shila olmaydi; ism kiritgach mumkin", async () => {
    const x = buildApp({ requireProfile: true }); await x.app.listen({ port: 0 }); const port = (x.app.server.address() as any).port;
    expect(await ask(port, "anon", { type: "create" })).toEqual({ type: "error", error: "profile_required" });
    expect(await ask(port, "anon", { type: "join", code: "ABCDEF" })).toEqual({ type: "error", error: "profile_required" });
    await x.app.inject({ method: "PUT", url: "/me/profile", headers: H("anon"), payload: { name: "Sardor", color: 2, birthYear: 1995 } });
    expect((await ask(port, "anon", { type: "create" })).type).toBe("state");
    await x.app.close();
  });
});
