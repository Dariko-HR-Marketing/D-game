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
  it("chiqib ketgan qaytariladi: har boshlashda jonli qayta tekshiruv, API yiqilsa tasdiq saqlanadi", async () => {
    let t = 0, status = "member", down = false;
    const g = new SubscriptionGate({ ...cfg, instagram: undefined, youtube: undefined, recheckMin: 5 }, undefined, (async () => down ? { ok: false, json: async () => { throw new Error("x"); } } : json({ ok: true, result: { status } })) as any, () => t);
    const s = g.telegramStart("u")!; g.onTelegramUpdate({ message: { from: { id: 7 }, text: "/start " + s.token } }); await g.checkTelegram("u");
    t = 60_000; status = "left"; expect(await g.ensure("u", 30)).toEqual([]); // 5 daqiqa ichida kesh
    t = 6 * 60_000; expect(await g.ensure("u", 30)).toEqual(["telegram"]); // chiqib ketgan: qayta obuna kerak
    status = "member"; await g.checkTelegram("u"); t += 6 * 60_000; down = true; expect(await g.ensure("u", 30)).toEqual([]); // Telegram ishlamasa to'sib qo'ymaydi
  });
  it("ozod qilingan hisob to'silmaydi; to'silganlar hisoblanadi", async () => {
    const g = new SubscriptionGate(cfg); expect(await g.ensure("u", 30)).toHaveLength(3); expect(g.blocked).toMatchObject({ total: 1, telegram: 1 });
    g.exempt("u", "admin", "QA"); expect(await g.ensure("u", 30)).toEqual([]); g.unexempt("u"); expect(g.missing("u", 30)).toHaveLength(3);
    g.exempt("u", "a", "x"); g.erase("u"); expect(g.exemptions()).toEqual([]);
  });
  it("Instagram tokeni yangilanadi (30 kunda bir marta), Telegram webhook o'zi ulanadi", async () => {
    const calls: string[] = []; let t = 0;
    const g = new SubscriptionGate({ ...cfg, apiUrl: "https://api.x" }, undefined, (async (u: string) => { calls.push(u); return json(u.includes("refresh_access_token") ? { access_token: "NEW", expires_in: 5184000 } : { ok: true }); }) as any, () => t);
    await g.maintain(); expect(g.health.instagramRefresh?.ok).toBe(true); expect(g.health.telegramWebhook?.ok).toBe(true);
    const n = calls.length; t = 10 * 86400_000; await g.refreshInstagram(); expect(calls.length).toBe(n); // 30 kun o'tmagan
    t = 31 * 86400_000; await g.refreshInstagram(); expect(calls.length).toBe(n + 1);
    calls.length = 0; g.onInstagramEvent({ entry: [{ messaging: [{ sender: { id: "5" }, message: { text: g.instagramStart("u")!.code } }] }] }); await g.checkInstagram("u"); expect(calls[0]).toContain("access_token=NEW"); // yangi token ishlatiladi
  });
  it("Telegram guruhi ham talab qilinsa, ikkalasida a'zo bo'lish kerak", async () => {
    const st: Record<string, string> = { "@kanal": "member", "@guruh": "left" };
    const g = new SubscriptionGate({ ...cfg, instagram: undefined, youtube: undefined, telegram: { ...cfg.telegram!, group: "@guruh", groupUrl: "https://t.me/guruh" } }, undefined, (async (u: string) => json({ ok: true, result: { status: st[decodeURIComponent(/chat_id=([^&]+)/.exec(u)![1])] } })) as any);
    const s = g.telegramStart("u")!; g.onTelegramUpdate({ message: { from: { id: 7 }, text: "/start " + s.token } });
    expect(await g.checkTelegram("u")).toBe(false); st["@guruh"] = "member"; expect(await g.checkTelegram("u")).toBe(true);
    expect(g.status("u", 30).platforms[0]).toMatchObject({ ok: true, extraUrl: "https://t.me/guruh" });
  });
  it("bot: /start bog'laydi va yagona panel yuboradi; «Tekshirish» tugmasi qayta tekshiradi va paneli yangilaydi", async () => {
    const calls: { m: string; b: any }[] = []; let status = "left";
    const g = new SubscriptionGate({ ...cfg, instagram: undefined, youtube: undefined, telegram: { ...cfg.telegram!, groupUrl: "https://t.me/guruh" } }, undefined,
      (async (u: string, i?: any) => { if (u.includes("getChatMember")) return json({ ok: true, result: { status } }); calls.push({ m: u.split("/").pop()!, b: JSON.parse(i.body) }); return json({ ok: true }); }) as any);
    const t = g.telegramStart("u")!;
    await g.handleTelegram({ message: { from: { id: 7 }, chat: { id: 7 }, text: "/start " + t.token } });
    expect(calls[0].m).toBe("sendMessage"); expect(calls[0].b.text).toContain("bog'landi"); expect(calls[0].b.text).toContain("⬜ Telegram kanali"); expect(calls[0].b.text).toContain("guruhimiz");
    expect(JSON.stringify(calls[0].b.reply_markup)).toContain("chk"); expect(g.missing("u", 30)).toEqual(["telegram"]);
    status = "member"; await g.handleTelegram({ callback_query: { id: "cb1", from: { id: 7 }, message: { chat: { id: 7 }, message_id: 9 } } });
    expect(calls.map((c) => c.m)).toEqual(["sendMessage", "answerCallbackQuery", "editMessageText"]); expect(calls[2].b.text).toContain("✅ Telegram kanali"); expect(calls[2].b.text).toContain("Tayyor"); expect(g.missing("u", 30)).toEqual([]);
  });
  it("bot: ilovadan bog'lanmagan odamga yo'riqnoma; begona xabarlarga jim", async () => {
    const sent: any[] = []; const g = new SubscriptionGate(cfg, undefined, (async (_u: string, i: any) => { sent.push(JSON.parse(i.body)); return json({ ok: true }); }) as any);
    await g.handleTelegram({ message: { from: { id: 1 }, chat: { id: 1 }, text: "/start" } }); await g.handleTelegram({ message: { from: { id: 1 }, chat: { id: 1 }, text: "salom" } });
    expect(sent).toHaveLength(1); expect(sent[0].text).toContain("ilovadagi");
  });
  it("majburiy: Telegram va Instagram; YouTube ixtiyoriy (o'yinni to'smaydi, faqat yulduzcha beradi)", async () => {
    let items: unknown[] = []; const g = new SubscriptionGate({ ...cfg, required: ["telegram", "instagram"] }, undefined, (async (u: string) => u.includes("googleapis") ? json({ items }) : json({ ok: true, result: { status: "member" }, is_user_follow_business: true })) as any);
    expect(g.missing("u", 30)).toEqual(["telegram", "instagram"]); expect(g.enforced()).toEqual(["telegram", "instagram"]);
    expect(g.socials("u").map((x) => [x.id, x.required, x.ok])).toEqual([["telegram", true, false], ["instagram", true, false], ["youtube", false, false], ["facebook", false, false]]); expect(g.socials("u")[3]).toMatchObject({ configured: false, verifiable: false, self: true });
    items = [{ id: 1 }]; await g.checkYoutube("u", "tok"); expect(g.starsOf("u")).toBe(1); expect(g.missing("u", 30)).toEqual(["telegram", "instagram"]); // YouTube to'smaydi ham, o'tkazmaydi ham
    const s = g.telegramStart("u")!; g.onTelegramUpdate({ message: { from: { id: 7 }, text: "/start " + s.token } }); await g.checkTelegram("u");
    expect(g.starsOf("u")).toBe(2); expect(g.status("u", 30).platforms.map((p) => p.id)).toEqual(["telegram", "instagram"]);
  });
  it("Telegram kanal va guruh birgalikda majburiy: bot paneli ikkalasini ko'rsatadi", async () => {
    const g = new SubscriptionGate({ ...cfg, instagram: undefined, youtube: undefined, telegram: { ...cfg.telegram!, group: "@guruh", groupUrl: "https://t.me/guruh" } }, undefined, (async () => json({ ok: true, result: { status: "member" } })) as any);
    const pn = g.panel("u", 30); expect(pn.text).toContain("Telegram kanali va guruhi"); expect(JSON.stringify(pn.reply_markup)).toContain("Guruhga o'tish"); expect(JSON.stringify(pn.reply_markup)).not.toContain("ixtiyoriy");
    expect(g.socials("u")[0]).toMatchObject({ groupUrl: "https://t.me/guruh", groupRequired: true });
  });
  it("Facebook: o'zi tasdiqlaydi (tekshirib bo'lmaydi), yulduzcha beradi, majburiy emas; uzish o'chiradi", async () => {
    const g = new SubscriptionGate({ ...cfg, telegram: undefined, instagram: undefined, youtube: undefined, facebookUrl: "https://facebook.com/t24" });
    expect(g.starsOf("u")).toBe(0); expect(g.confirmFacebook("u")).toBe(true); expect(g.starsOf("u")).toBe(1); expect(g.socials("u")[3]).toMatchObject({ ok: true, self: true, verifiable: false, required: false });
    g.disconnect("u", "facebook"); expect(g.starsOf("u")).toBe(0); expect(new SubscriptionGate(cfg).confirmFacebook("u")).toBe(false);
  });
  it("Facebook havolasi yulduzcha bermaydi (tasdiqlanmaguncha); uzish tasdiqni va bog'lashni o'chiradi", async () => {
    const g = new SubscriptionGate({ ...cfg, instagram: undefined, youtube: undefined, facebookUrl: "https://facebook.com/tajriba24" }, undefined, (async () => json({ ok: true, result: { status: "member" } })) as any);
    const s = g.telegramStart("u")!; g.onTelegramUpdate({ message: { from: { id: 7 }, text: "/start " + s.token } }); await g.checkTelegram("u");
    expect(g.socials("u").find((x) => x.id === "facebook")).toMatchObject({ url: "https://facebook.com/tajriba24", ok: false, verifiable: false }); expect(g.starsOf("u")).toBe(1);
    g.disconnect("u", "telegram"); expect(g.starsOf("u")).toBe(0); expect(g.missing("u", 30)).toEqual(["telegram"]); expect(g.socials("u")[0].linked).toBe(false);
  });
});
