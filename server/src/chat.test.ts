import { describe, it, expect } from "vitest";
import WebSocket from "ws";
import { buildApp } from "./app";
import { MemoryStore } from "./store";
import { ContentRegistry } from "./registry";
import { RoomManager } from "./rooms";
import { cleanText, CHAT_MAX, PHRASES } from "./chat";
import { parseMessage } from "./protocol";

describe("chat matnini tozalash", () => {
  it("bo'shliqlar bittaga, boshqaruv va ko'rinmas yo'nalish belgilari olib tashlanadi", () => {
    expect(cleanText("  Salom\u0000  \n  dunyo‮ ")).toBe("Salom dunyo");
    expect(cleanText("a​b")).toBe("a b");
  });
  it("bo'sh, faqat bo'shliq, juda uzun yoki matn bo'lmasa — rad", () => {
    expect(cleanText("")).toBeNull(); expect(cleanText("   \n ")).toBeNull(); expect(cleanText("x".repeat(CHAT_MAX + 1))).toBeNull(); expect(cleanText(5 as any)).toBeNull();
    expect(cleanText("x".repeat(CHAT_MAX))).toHaveLength(CHAT_MAX);
  });
});

describe("protokol: chat xabari", () => {
  it("faqat matn yoki faqat ibora; ortiqcha kalit rad", () => {
    expect(parseMessage(JSON.stringify({ type: "chat", text: "salom" })).ok).toBe(true);
    expect(parseMessage(JSON.stringify({ type: "chat", phrase: 3 })).ok).toBe(true);
    expect(parseMessage(JSON.stringify({ type: "chat", text: "a", extra: 1 })).ok).toBe(false);
    expect(parseMessage(JSON.stringify({ type: "chat", text: "a".repeat(1001) })).ok).toBe(false);
  });
});

const mgr = (restricted: string[] = []) => {
  const rm = new RoomManager(new ContentRegistry(), new MemoryStore(), undefined, undefined, { chatRestricted: (ids) => ids.filter((i) => restricted.includes(i)) });
  const r = rm.create("a"); if (!r.ok) throw 0; rm.join(r.code, "b"); rm.join(r.code, "kid"); const events: any[] = []; rm.on((c, ev) => { if (ev.type === "chat") events.push(ev.msg); });
  return { rm, code: r.code, events };
};

describe("xona chati", () => {
  it("a'zo yuboradi — hammaga tarqaladi, tartib raqami o'sadi, tarix saqlanadi", () => {
    const { rm, code, events } = mgr();
    const x = rm.chat(code, "a", { text: "  Salom! " }); expect(x).toMatchObject({ ok: true, msg: { from: "a", text: "Salom!", id: 1 } });
    expect(rm.chat(code, "b", { phrase: 2 })).toMatchObject({ ok: true, msg: { phrase: 2, id: 2 } });
    expect(events.map((m) => m.id)).toEqual([1, 2]); expect(rm.chatLog(code)).toHaveLength(2);
  });
  it("a'zo bo'lmagan, chiqib ketgan va bot yubora olmaydi", () => {
    const { rm, code } = mgr(); expect(rm.chat(code, "zzz", { text: "hi" })).toMatchObject({ ok: false, error: "not_member" });
    expect(rm.chat("NOPE12", "a", { text: "hi" })).toMatchObject({ ok: false, error: "not_member" });
  });
  it("erkin matn yopiq (16 yoshgacha/ota-ona o'chirgan) — faqat tayyor ibora o'tadi", () => {
    const { rm, code } = mgr(["kid"]); expect(rm.chat(code, "kid", { text: "salom" })).toMatchObject({ ok: false, error: "chat_restricted" });
    expect(rm.chat(code, "kid", { phrase: 0 }).ok).toBe(true); expect(rm.chat(code, "a", { text: "salom" }).ok).toBe(true);
  });
  it("noto'g'ri ibora, bo'sh matn va ikkalasi birga — rad; bir xil matn qayta yuborilmaydi", () => {
    const { rm, code } = mgr();
    expect(rm.chat(code, "a", { phrase: PHRASES })).toMatchObject({ ok: false, error: "bad_chat" }); expect(rm.chat(code, "a", { phrase: -1 })).toMatchObject({ ok: false, error: "bad_chat" });
    expect(rm.chat(code, "a", { text: "  " })).toMatchObject({ ok: false, error: "bad_chat" }); expect(rm.chat(code, "a", { text: "x", phrase: 1 })).toMatchObject({ ok: false, error: "bad_chat" });
    expect(rm.chat(code, "a", { text: "qaytar" }).ok).toBe(true); expect(rm.chat(code, "a", { text: "qaytar" })).toMatchObject({ ok: false, error: "duplicate" }); expect(rm.chat(code, "b", { text: "qaytar" }).ok).toBe(true);
  });
  it("tarix chegaralangan (so'nggi 100 ta)", () => {
    const { rm, code } = mgr(); for (let i = 0; i < 130; i++) rm.chat(code, "a", { text: `xabar ${i}` }); const log = rm.chatLog(code);
    expect(log).toHaveLength(100); expect(log[0].text).toBe("xabar 30"); expect(log[99].text).toBe("xabar 129");
  });
  it("xona ko'rinishida erkin chat yopiq o'yinchilar ro'yxati", () => {
    const { rm, code } = mgr(["kid"]); expect(rm.view(rm.rooms.get(code)!).chatRestricted).toEqual(["kid"]);
  });
});

function client(port: number, token: string) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${token}`); const msgs: any[] = [];
  ws.on("message", (d) => msgs.push(JSON.parse(d.toString()))); const open = new Promise((r) => ws.on("open", r));
  const until = async (f: (m: any) => boolean) => { for (let i = 0; i < 200; i++) { const m = msgs.find(f); if (m) return m; await new Promise((r) => setTimeout(r, 10)); } throw new Error("timeout"); };
  return { ws, open, msgs, until, send: (o: unknown) => ws.send(JSON.stringify(o)) };
}
describe("WebSocket: chat", () => {
  it("xabar xonadagi hammaga boradi; yangi kirgan so'nggi xabarlarni oladi; tezlik chegarasi ishlaydi", async () => {
    const { app } = buildApp(); await app.listen({ port: 0 }); const port = (app.server.address() as any).port;
    const a = client(port, "alice"), b = client(port, "bob"); await Promise.all([a.open, b.open]);
    a.send({ type: "create" }); const code = (await a.until((m) => m.type === "state")).room.code; b.send({ type: "join", code }); await b.until((m) => m.type === "chat_log");
    a.send({ type: "chat", text: "Salom, Bobur!" }); const got = await b.until((m) => m.type === "chat" && m.msg.text === "Salom, Bobur!"); expect(got.msg.from).toBe("alice");
    const c = client(port, "carol"); await c.open; c.send({ type: "join", code }); const log = await c.until((m) => m.type === "chat_log"); expect(log.msgs.map((x: any) => x.text)).toContain("Salom, Bobur!");
    for (let i = 0; i < 8; i++) a.send({ type: "chat", text: `spam ${i}` }); await a.until((m) => m.type === "error" && m.error === "rate_limited");
    await app.close();
  });
});
