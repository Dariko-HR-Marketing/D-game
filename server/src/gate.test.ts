import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SubscriptionGate, type GateConfig } from "./gate";

const cfg: GateConfig = { minAge: 16, ttlDays: 30,
  telegram: { botToken: "T", channel: "@kanal", botUsername: "bot", channelUrl: "https://t.me/kanal", webhookSecret: "s" },
  instagram: { accessToken: "A", appSecret: "sec", verifyToken: "v", handle: "tajriba24" },
  youtube: { channelId: "UC1", channelUrl: "https://youtube.com/c" } };
const json = (o: unknown) => ({ ok: true, json: async () => o }) as Response;

describe("obuna darvozasi", () => {
  it("sozlama bo'sh bo'lsa o'chiq", () => { const g = new SubscriptionGate({ minAge: 16, ttlDays: 30 }); expect(g.enabled()).toBe(false); expect(g.missing("u", 30)).toEqual([]); });
  it("16 yoshgacha qo'llanmaydi", () => { const g = new SubscriptionGate(cfg); expect(g.missing("u", 15)).toEqual([]); expect(g.missing("u", 16)).toEqual(["telegram", "instagram", "youtube"]); });
  it("Telegram: bog'lash + a'zolik", async () => {
    let status = "left"; const g = new SubscriptionGate(cfg, undefined, (async () => json({ ok: true, result: { status } })) as any);
    expect(await g.checkTelegram("u")).toBe("not_linked");
    const s = g.telegramStart("u")!; expect(g.onTelegramUpdate({ message: { from: { id: 77 }, text: "/start " + s.token } })).toBe(true);
    expect(g.onTelegramUpdate({ message: { from: { id: 78 }, text: "/start " + s.token } })).toBe(false); // bir martalik
    expect(await g.checkTelegram("u")).toBe(false); status = "member"; expect(await g.checkTelegram("u")).toBe(true);
    expect(g.missing("u", 30)).toEqual(["instagram", "youtube"]);
  });
  it("Instagram: imzo, kod va obuna", async () => {
    const g = new SubscriptionGate(cfg, undefined, (async () => json({ is_user_follow_business: true })) as any);
    const raw = Buffer.from("{}"); const sig = "sha256=" + createHmac("sha256", "sec").update(raw).digest("hex");
    expect(g.verifyInstagramSignature(raw, sig)).toBe(true); expect(g.verifyInstagramSignature(raw, "sha256=00")).toBe(false); expect(g.verifyInstagramSignature(raw, undefined)).toBe(false);
    const { code } = g.instagramStart("u")!; expect(await g.checkInstagram("u")).toBe("not_linked");
    expect(g.onInstagramEvent({ entry: [{ messaging: [{ sender: { id: "99" }, message: { text: "salom " + code.toLowerCase() } }] }] })).toBe(1);
    expect(await g.checkInstagram("u")).toBe(true);
  });
  it("YouTube: obuna bor/yo'q, xato", async () => {
    let items: unknown[] = []; let fail = false; const g = new SubscriptionGate(cfg, undefined, (async () => fail ? ({ ok: false }) : json({ items })) as any);
    expect(await g.checkYoutube("u", "tok")).toBe(false); items = [{ id: 1 }]; expect(await g.checkYoutube("u", "tok")).toBe(true); fail = true; expect(await g.checkYoutube("u", "tok")).toBe("unavailable");
  });
  it("muddat o'tsa qayta talab qilinadi va o'chirishda tozalanadi", async () => {
    let t = 0; const g = new SubscriptionGate({ ...cfg, telegram: undefined, instagram: undefined }, undefined, (async () => json({ items: [1] })) as any, () => t);
    await g.checkYoutube("u", "tok"); expect(g.missing("u", 30)).toEqual([]); t = 31 * 86400_000; expect(g.missing("u", 30)).toEqual(["youtube"]);
    await g.checkYoutube("u", "tok"); g.erase("u"); expect(g.missing("u", 30)).toEqual(["youtube"]);
  });
});
