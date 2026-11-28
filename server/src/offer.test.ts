import { describe, it, expect } from "vitest";
import WebSocket from "ws";
import { buildApp } from "./app";
import { OfferConsents } from "./offer";

const Y = new Date().getFullYear();
function client(port: number, token: string) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${token}`); const msgs: any[] = []; ws.on("message", (d) => msgs.push(JSON.parse(d.toString())));
  const open = new Promise((r) => ws.on("open", r)); const until = async (f: (m: any) => boolean) => { for (let i = 0; i < 300; i++) { const m = msgs.find(f); if (m) return m; await new Promise((r) => setTimeout(r, 10)); } throw new Error("kutilgan xabar kelmadi"); };
  return { ws, open, until, send: (o: unknown) => ws.send(JSON.stringify(o)) };
}
describe("oferta roziligi", () => {
  it("talab o'chiq bo'lsa hamma o'tadi; versiya berilsa rozilik bo'lmaguncha o'yin ochilmaydi", async () => {
    expect(new OfferConsents(undefined).ok("u")).toBe(true);
    const offer = new OfferConsents("2026-11-26"); const x = buildApp({ offer }); await x.app.listen({ port: 0 }); const port = (x.app.server.address() as any).port;
    x.profiles.put("alice", { name: "Alisa", color: 0, birthYear: 1990 } as any); const a = client(port, "alice"); await a.open;
    const h = { authorization: "Bearer alice" }, call = async (m: "GET" | "POST" | "DELETE", payload?: any) => (await x.app.inject({ method: m, url: "/me/consent", headers: h, payload })).json();
    expect(await call("GET")).toMatchObject({ required: "2026-11-26", accepted: null, ok: false });
    a.send({ type: "create", visibility: "open", start: "host" }); await a.until((m) => m.type === "state"); // qaror 2026-11-27: oferta faqat ro'yxatdan o'tishda; o'yin ochish/qo'shilish rozilikka bog'liq emas
    expect((await x.app.inject({ method: "POST", url: "/me/consent", headers: h, payload: { version: "eski" } })).statusCode).toBe(400);
    expect(await call("POST", { version: "2026-11-26" })).toMatchObject({ ok: true, accepted: "2026-11-26" }); expect(await call("GET")).toMatchObject({ ok: true });
    a.send({ type: "create", visibility: "open", start: "host" }); await a.until((m) => m.type === "state");
    const st = (await x.app.inject({ url: "/admin/consent", headers: { authorization: "Bearer x" } })); expect([401, 403]).toContain(st.statusCode);
    await call("DELETE"); expect(await call("GET")).toMatchObject({ ok: false, accepted: null });
    a.ws.close(); await x.app.close();
  });
  it("yangi versiya chiqsa eski rozilik yaroqsiz; tarix saqlanadi; statistika", () => {
    let t = 1000; const o = new OfferConsents("v1", undefined, () => t); o.accept("u", "v1"); expect(o.ok("u")).toBe(true);
    const o2 = new OfferConsents("v2", undefined, () => t); (o2 as any).recs.set("u", (o as any).recs.get("u")); expect(o2.ok("u")).toBe(false);
    t = 2000; o2.accept("u", "v2"); expect(o2.ok("u")).toBe(true); expect((o2 as any).recs.get("u").history).toEqual([{ version: "v1", at: 1000 }]);
    expect(o2.stats(5)).toMatchObject({ accepted: 1, notAccepted: 4, olderVersion: 0, enabled: true });
  });
});
