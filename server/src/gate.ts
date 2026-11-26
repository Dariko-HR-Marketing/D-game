// Obuna darvozasi: o'yin xonasini ochish/qo'shilishdan oldin Telegram, Instagram va YouTube'ga obuna bo'lish.
// Har platforma o'z yo'li bilan tekshiriladi (taxmin yo'q): Telegram — getChatMember, Instagram — is_user_follow_business (DM-kod orqali bog'lanadi),
// YouTube — foydalanuvchining Google ruxsati bilan subscriptions.list. Sozlama bo'sh bo'lsa darvoza o'chiq (hech kim to'silmaydi).
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { Guard } from "./admin";
import { Collection, type DocStore } from "./docs";
import { WriteQueue } from "./persist";
import { KeyedLimiter } from "./ratelimit";

export type Platform = "telegram" | "instagram" | "youtube";
export const PLATFORMS: Platform[] = ["telegram", "instagram", "youtube"];
export interface GateConfig {
  minAge: number; ttlDays: number; recheckMin?: number; apiUrl?: string; required?: Platform[]; facebookUrl?: string;
  telegram?: { botToken: string; channel: string; botUsername: string; channelUrl: string; webhookSecret: string; group?: string; groupUrl?: string };
  instagram?: { accessToken: string; appSecret: string; verifyToken: string; handle: string };
  youtube?: { channelId: string; channelUrl: string };
}
export interface GateEx { id: string; by: string; at: number; reason: string }
export interface GateTok { id: string; token: string; at: number }
export interface GateRec { id: string; tg?: number; ig?: string; ok: Partial<Record<Platform, number>>; at: number }
type F = typeof fetch;

export function gateConfigFromEnv(e: NodeJS.ProcessEnv): GateConfig {
  const c: GateConfig = { minAge: Number(e.GATE_MIN_AGE || 16), ttlDays: Number(e.GATE_TTL_DAYS || 7), recheckMin: Number(e.GATE_RECHECK_MIN || 5), apiUrl: e.GATE_PUBLIC_API_URL?.replace(/\/$/, ""),
    required: (e.GATE_REQUIRED ?? "telegram,instagram").split(",").map((x) => x.trim()).filter((x): x is Platform => (PLATFORMS as string[]).includes(x)), facebookUrl: e.GATE_FB_URL || undefined };
  if (e.GATE_TG_BOT_TOKEN && e.GATE_TG_CHANNEL && e.GATE_TG_BOT_USERNAME) {
    const ch = e.GATE_TG_CHANNEL; c.telegram = { botToken: e.GATE_TG_BOT_TOKEN, channel: ch, botUsername: e.GATE_TG_BOT_USERNAME.replace(/^@/, ""), channelUrl: e.GATE_TG_CHANNEL_URL || (ch.startsWith("@") ? `https://t.me/${ch.slice(1)}` : ""), webhookSecret: e.GATE_TG_WEBHOOK_SECRET ?? "", group: e.GATE_TG_GROUP || undefined, groupUrl: e.GATE_TG_GROUP_URL || (e.GATE_TG_GROUP?.startsWith("@") ? `https://t.me/${e.GATE_TG_GROUP.slice(1)}` : undefined) };
  }
  if (e.GATE_IG_ACCESS_TOKEN && e.GATE_IG_HANDLE && e.GATE_IG_APP_SECRET) c.instagram = { accessToken: e.GATE_IG_ACCESS_TOKEN, appSecret: e.GATE_IG_APP_SECRET, verifyToken: e.GATE_IG_VERIFY_TOKEN ?? "", handle: e.GATE_IG_HANDLE.replace(/^@/, "") };
  if (e.GATE_YT_CHANNEL_ID) c.youtube = { channelId: e.GATE_YT_CHANNEL_ID, channelUrl: e.GATE_YT_CHANNEL_URL || `https://www.youtube.com/channel/${e.GATE_YT_CHANNEL_ID}` };
  return c;
}

export class SubscriptionGate {
  private recs: Collection<GateRec>; private ex: Collection<GateEx>; private tok: Collection<GateTok>; readonly queue = new WriteQueue();
  /** Har bir tasdiqlangan tarmoq uchun XP (ijtimoiy yulduzcha). SPEC raqam bermagan, shuning uchun standart 0 (o'chiq): SOCIAL_STAR_XP bilan yoqiladi. */
  starXp = 0;
  blocked = { total: 0, telegram: 0, instagram: 0, youtube: 0 }; since = Date.now(); health: { telegramWebhook?: { ok: boolean; at: number; error?: string }; instagramRefresh?: { ok: boolean; at: number; error?: string } } = {};
  private tgTokens = new Map<string, { uid: string; exp: number }>(); private igCodes = new Map<string, { uid: string; exp: number }>();
  constructor(readonly cfg: GateConfig, store?: DocStore, private fetchFn: F = fetch, private now: () => number = Date.now) { this.recs = new Collection("gate", store, this.queue); this.ex = new Collection("gateex", store, this.queue); this.tok = new Collection("gatetok", store, this.queue); }
  async load() { await this.recs.load(); await this.ex.load(); await this.tok.load(); return this; }
  /** Sozlangan (tekshirilishi mumkin) platformalar. */
  platforms(): Platform[] { return PLATFORMS.filter((p) => !!this.cfg[p]); }
  /** Majburiy (o'yin boshlashdan oldin talab qilinadigan) platformalar: sozlangan va `required` ro'yxatida. Qolganlari — ixtiyoriy (yulduzcha uchun). */
  enforced(): Platform[] { return this.platforms().filter((p) => !this.cfg.required || this.cfg.required.includes(p)); }
  enabled() { return this.enforced().length > 0; }
  private rec(uid: string): GateRec { return this.recs.get(uid) ?? { id: uid, ok: {}, at: this.now() }; }
  private valid(r: GateRec, p: Platform) { const t = r.ok[p]; return t !== undefined && this.now() - t < this.cfg.ttlDays * 86400_000; }
  /** O'yinchiga yetishmayotgan platformalar. 16 yoshgacha (yurist xulosasigacha) darvoza qo'llanmaydi. */
  missing(uid: string, age: number | null): Platform[] {
    if (!this.enabled() || (age !== null && age < this.cfg.minAge) || this.ex.get(uid)) return [];
    const r = this.recs.get(uid), m = this.enforced().filter((p) => !r || !this.valid(r, p));
    return m;
  }
  /** Har o'yin boshlashdan oldin: Telegram va Instagram obunasi jonli qayta tekshiriladi (chiqib ketgan qaytariladi); API ishlamasa oldingi tasdiq saqlanadi.
   *  YouTube tokeni saqlanmaydi, shuning uchun u faqat muddat (ttl) tugagach qayta so'raladi. Tez-tez bosilsa API'ni yuklamaslik uchun `recheckMin` daqiqa kesh. */
  async ensure(uid: string, age: number | null): Promise<Platform[]> {
    if (!this.enabled() || (age !== null && age < this.cfg.minAge) || this.ex.get(uid)) return [];
    const r = this.recs.get(uid), win = (this.cfg.recheckMin ?? 5) * 60_000;
    if (r) for (const p of ["telegram", "instagram"] as const) if (this.cfg[p] && this.valid(r, p) && this.now() - (r.ok[p] ?? 0) >= win) await (p === "telegram" ? this.checkTelegram(uid) : this.checkInstagram(uid));
    const m = this.missing(uid, age); if (m.length) { this.blocked.total++; for (const p of m) this.blocked[p]++; }
    return m;
  }
  status(uid: string, age: number | null) {
    const r = this.recs.get(uid), miss = this.missing(uid, age);
    return { enabled: this.enabled(), exempt: age !== null && age < this.cfg.minAge, missing: miss, platforms: this.enforced().map((p) => ({ id: p, ok: !!r && this.valid(r, p), linked: p === "telegram" ? r?.tg !== undefined : p === "instagram" ? r?.ig !== undefined : false, url: this.url(p), ...(p === "telegram" && this.cfg.telegram?.groupUrl ? { extraUrl: this.cfg.telegram.groupUrl } : {}) })) };
  }
  /** Profil uchun: hamma tarmoq (Facebook'dan tashqari tekshiriladi) — holat, majburiymi, havola. Yulduzcha faqat TEKSHIRILGAN obuna uchun. */
  socials(uid: string) {
    const r = this.recs.get(uid), ids: (Platform | "facebook")[] = ["telegram", "instagram", "youtube", "facebook"];
    return ids.map((id) => {
      if (id === "facebook") return { id, configured: false, required: false, ok: false, linked: false, url: this.cfg.facebookUrl, at: null as number | null, verifiable: false };
      const configured = !!this.cfg[id], ok = !!r && this.valid(r, id);
      return { id, configured, required: configured && this.enforced().includes(id), ok, linked: id === "telegram" ? r?.tg !== undefined : id === "instagram" ? r?.ig !== undefined : ok, url: this.url(id), at: r?.ok[id] ?? null, verifiable: true };
    });
  }
  starsOf(uid: string) { return this.socials(uid).filter((x) => x.ok).length; }
  /** Profilda «Uzish»: bog'lash va tasdiq o'chadi; majburiy bo'lsa o'yin boshlashdan oldin qayta so'raladi. */
  disconnect(uid: string, p: Platform) { const r = this.recs.get(uid); if (!r) return; const n: GateRec = { ...r, ok: { ...r.ok } }; delete n.ok[p]; if (p === "telegram") delete n.tg; if (p === "instagram") delete n.ig; this.recs.set(uid, n); }
  url(p: Platform) { return p === "telegram" ? this.cfg.telegram?.channelUrl : p === "instagram" ? `https://instagram.com/${this.cfg.instagram?.handle}` : this.cfg.youtube?.channelUrl; }
  private mark(uid: string, p: Platform, ok: boolean) { const r = { ...this.rec(uid), ok: { ...this.rec(uid).ok } }; if (ok) r.ok[p] = this.now(); else delete r.ok[p]; this.recs.set(uid, r); return ok; }
  erase(uid: string) { this.recs.delete(uid); this.ex.delete(uid); for (const m of [this.tgTokens, this.igCodes]) for (const [k, v] of m) if (v.uid === uid) m.delete(k); }
  /** Sinov/QA hisoblarini darvozadan ozod qilish (admin, sabab bilan). */
  exempt(uid: string, by: string, reason: string) { this.ex.set(uid, { id: uid, by, at: this.now(), reason }); }
  unexempt(uid: string) { this.ex.delete(uid); }
  exemptions() { return this.ex.values().sort((a, b) => b.at - a.at); }
  /** Instagram tokeni 60 kun yashaydi: saqlangan token (yoki muhitdagisi) har 30 kunda yangilanadi. */
  private igToken() { return this.tok.get("ig")?.token ?? this.cfg.instagram?.accessToken ?? ""; }
  async refreshInstagram(force = false) {
    const c = this.cfg.instagram; if (!c) return; const t = this.tok.get("ig");
    if (!force && t && this.now() - t.at < 30 * 86400_000) return;
    try { const j: any = await (await this.fetchFn(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(this.igToken())}`)).json();
      if (typeof j?.access_token !== "string") throw new Error(String(j?.error?.message ?? "no_token").slice(0, 120));
      this.tok.set("ig", { id: "ig", token: j.access_token, at: this.now() }); this.health.instagramRefresh = { ok: true, at: this.now() };
    } catch (e) { this.health.instagramRefresh = { ok: false, at: this.now(), error: (e as Error).message }; }
  }
  /** Telegram webhook'ni o'zi ulaydi (GATE_PUBLIC_API_URL berilsa). */
  async registerTelegramWebhook() {
    const c = this.cfg.telegram; if (!c || !this.cfg.apiUrl || !c.webhookSecret) return;
    try { const j: any = await (await this.fetchFn(`https://api.telegram.org/bot${c.botToken}/setWebhook`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: `${this.cfg.apiUrl}/gate/telegram/webhook`, secret_token: c.webhookSecret, allowed_updates: ["message", "callback_query"] }) })).json();
      this.health.telegramWebhook = { ok: !!j?.ok, at: this.now(), ...(j?.ok ? {} : { error: String(j?.description ?? "xato").slice(0, 120) }) };
    } catch (e) { this.health.telegramWebhook = { ok: false, at: this.now(), error: (e as Error).message }; }
  }
  /** Ishga tushganda va kuniga bir marta chaqiriladi. */
  async maintain() { await this.registerTelegramWebhook(); await this.refreshInstagram(); }
  /** Sozlama holati (admin uchun): qaysi o'zgaruvchilar yetishmaydi — qiymatlarsiz. */
  setup() {
    const e = process.env, miss = (names: string[]) => names.filter((n) => !e[n]);
    return { telegram: { on: !!this.cfg.telegram, missing: miss(["GATE_TG_BOT_TOKEN", "GATE_TG_BOT_USERNAME", "GATE_TG_CHANNEL", "GATE_TG_WEBHOOK_SECRET"]), webhook: this.cfg.apiUrl ? `${this.cfg.apiUrl}/gate/telegram/webhook` : null },
      instagram: { on: !!this.cfg.instagram, missing: miss(["GATE_IG_HANDLE", "GATE_IG_ACCESS_TOKEN", "GATE_IG_APP_SECRET", "GATE_IG_VERIFY_TOKEN"]), webhook: this.cfg.apiUrl ? `${this.cfg.apiUrl}/gate/instagram/webhook` : null },
      youtube: { on: !!this.cfg.youtube, missing: miss(["GATE_YT_CHANNEL_ID"]) }, apiUrlSet: !!this.cfg.apiUrl, minAge: this.cfg.minAge, ttlDays: this.cfg.ttlDays, recheckMin: this.cfg.recheckMin ?? 5 };
  }
  stats() { const v = this.recs.values(); return { enabled: this.enabled(), platforms: this.platforms(), blocked: this.blocked, since: this.since, health: this.health, setup: this.setup(), exemptions: this.exemptions(), linked: { telegram: v.filter((r) => r.tg !== undefined).length, instagram: v.filter((r) => r.ig !== undefined).length }, verified: Object.fromEntries(PLATFORMS.map((p) => [p, v.filter((r) => this.valid(r, p)).length])), all: v.filter((r) => this.platforms().every((p) => this.valid(r, p))).length, total: v.length }; }

  // ---- Telegram: bot /start <token> orqali Telegram identifikatori bog'lanadi, so'ng kanal a'zoligi getChatMember bilan tekshiriladi.
  telegramStart(uid: string) { const c = this.cfg.telegram; if (!c) return null; const t = randomBytes(9).toString("base64url"); this.tgTokens.set(t, { uid, exp: this.now() + 15 * 60_000 }); return { token: t, url: `https://t.me/${c.botUsername}?start=${t}` }; }
  onTelegramUpdate(u: any) { // webhook: {message:{from:{id},text:"/start TOKEN"}}
    const text = String(u?.message?.text ?? ""), from = u?.message?.from?.id, m = /^\/start\s+([A-Za-z0-9_-]{6,40})$/.exec(text);
    if (!m || typeof from !== "number") return false; const p = this.tgTokens.get(m[1]); if (!p || p.exp < this.now()) return false;
    this.tgTokens.delete(m[1]); this.recs.set(p.uid, { ...this.rec(p.uid), tg: from }); return true;
  }
  userByTg(tg: number) { return this.recs.values().find((r) => r.tg === tg)?.id; }
  private igCodeOf(uid: string) { for (const [k, v] of this.igCodes) if (v.uid === uid && v.exp > this.now()) return k; return this.instagramStart(uid)?.code; }
  private async tg(method: string, body: unknown) {
    const c = this.cfg.telegram; if (!c) return null;
    try { return await (await this.fetchFn(`https://api.telegram.org/bot${c.botToken}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json(); } catch { return null; }
  }
  /** Botdagi yagona obuna paneli: matn + tugmalar. Majburiy bo'lmagan guruh «tavsiya» sifatida chiqadi. */
  panel(uid: string, age: number | null) {
    const c = this.cfg.telegram!, r = this.recs.get(uid), ok = (p: Platform) => !!r && this.valid(r, p), miss = this.missing(uid, age);
    const lines: string[] = [], kb: { text: string; url?: string; callback_data?: string }[][] = [];
    const line = (done: boolean, t: string) => lines.push(`${done ? "✅" : "⬜"} ${t}`);
    for (const p of this.platforms()) {
      if (p === "telegram") { line(ok(p), "Telegram kanali"); if (!ok(p) && c.channelUrl) kb.push([{ text: "Kanalga o'tish", url: c.channelUrl }]); }
      if (p === "instagram") { line(ok(p), "Instagram sahifasi"); if (!ok(p)) { kb.push([{ text: "Instagramga o'tish", url: this.url(p)! }]); lines.push(`    Sahifaga obuna bo'ling va unga shu kodni xabar qilib yuboring: ${this.igCodeOf(uid)}`); } }
      if (p === "youtube") { line(ok(p), "YouTube kanali"); if (!ok(p)) { kb.push([{ text: "YouTube'ga o'tish", url: this.url(p)! }]); lines.push("    Obunani tasdiqlash ilovada (veb-versiya) amalga oshadi."); } }
    }
    if (c.groupUrl && !c.group) { lines.push("➕ Tavsiya: muhokama guruhimiz"); kb.push([{ text: "Guruhga o'tish (ixtiyoriy)", url: c.groupUrl }]); }
    if (miss.length) kb.push([{ text: "✅ Tekshirish", callback_data: "chk" }]);
    const head = miss.length ? "O'yinni boshlash uchun quyidagilarga obuna bo'ling, so'ng «Tekshirish»ni bosing:" : "Tayyor! Hammasi tasdiqlandi. Ilovaga qaytib o'yinni boshlashingiz mumkin.";
    return { text: `${head}\n\n${lines.join("\n")}`, reply_markup: { inline_keyboard: kb } };
  }
  /** Telegram webhook yangilanishi: bog'lash (/start), panel va «Tekshirish» tugmasi. Hamma obuna bitta joyda bot orqali. */
  async handleTelegram(u: any, ageOf: (uid: string) => number | null = () => null) {
    const c = this.cfg.telegram; if (!c) return;
    const cq = u?.callback_query, m = u?.message; const from = cq?.from?.id ?? m?.from?.id, chat = cq?.message?.chat?.id ?? m?.chat?.id;
    if (typeof from !== "number" || typeof chat !== "number") return;
    const text = String(m?.text ?? ""); if (!cq && !text.startsWith("/start") && !text.startsWith("/obuna")) return;
    const linked = !cq && this.onTelegramUpdate(u); let uid = this.userByTg(from);
    if (!uid) {
      const msg = "Tajriba24 botiga xush kelibsiz!\n\nBoshlash uchun ilovadagi «Obuna» oynasidan «Telegram orqali obuna bo'lish» tugmasini bosing, shunda hisobingiz shu botga bog'lanadi.";
      if (cq) await this.tg("answerCallbackQuery", { callback_query_id: cq.id, text: "Avval ilovadan botni oching", show_alert: true }); else await this.tg("sendMessage", { chat_id: chat, text: msg });
      return;
    }
    // Telegram obunasini darrov tekshiramiz; Instagram bog'langan bo'lsa u ham.
    await this.checkTelegram(uid); if (this.recs.get(uid)?.ig) await this.checkInstagram(uid);
    const pn = this.panel(uid, ageOf(uid)); const body = { chat_id: chat, text: (linked ? "Hisobingiz botga bog'landi.\n\n" : "") + pn.text, reply_markup: pn.reply_markup, disable_web_page_preview: true };
    if (cq) {
      const done = this.missing(uid, ageOf(uid)).length === 0;
      await this.tg("answerCallbackQuery", { callback_query_id: cq.id, text: done ? "Tayyor!" : "Hali hamma obuna topilmadi" });
      await this.tg("editMessageText", { ...body, message_id: cq.message?.message_id });
    } else await this.tg("sendMessage", body);
  }
  async checkTelegram(uid: string): Promise<boolean | "not_linked" | "unavailable"> {
    const c = this.cfg.telegram, r = this.recs.get(uid); if (!c) return false; if (r?.tg === undefined) return "not_linked";
    try {
      for (const chat of [c.channel, ...(c.group ? [c.group] : [])]) {
        const j: any = await (await this.fetchFn(`https://api.telegram.org/bot${c.botToken}/getChatMember?chat_id=${encodeURIComponent(chat)}&user_id=${r.tg}`)).json();
        if (!j?.ok) return "unavailable";
        if (!(["member", "administrator", "creator"].includes(j.result?.status) || (j.result?.status === "restricted" && j.result?.is_member === true))) return this.mark(uid, "telegram", false);
      }
      return this.mark(uid, "telegram", true);
    } catch { return "unavailable"; }
  }
  // ---- Instagram: o'yinchi bizning professional akkauntga DM orqali kod yuboradi (webhook IGSID beradi), obuna is_user_follow_business bilan tekshiriladi.
  instagramStart(uid: string) { const c = this.cfg.instagram; if (!c) return null; const code = "T24-" + randomBytes(4).toString("hex").slice(0, 6).toUpperCase(); this.igCodes.set(code, { uid, exp: this.now() + 30 * 60_000 }); return { code, url: `https://ig.me/m/${c.handle}` }; }
  verifyInstagramSignature(raw: Buffer, header: string | undefined) {
    const c = this.cfg.instagram; if (!c || !header?.startsWith("sha256=")) return false;
    const a = Buffer.from(createHmac("sha256", c.appSecret).update(raw).digest("hex")), b = Buffer.from(header.slice(7)); return a.length === b.length && timingSafeEqual(a, b);
  }
  onInstagramEvent(body: any) { let n = 0;
    for (const en of body?.entry ?? []) for (const ev of en?.messaging ?? []) {
      const sid = ev?.sender?.id, text = String(ev?.message?.text ?? ""), m = /T24-[A-Z0-9]{6}/i.exec(text); if (!sid || !m) continue;
      const p = this.igCodes.get(m[0].toUpperCase()); if (!p || p.exp < this.now()) continue; this.igCodes.delete(m[0].toUpperCase()); this.recs.set(p.uid, { ...this.rec(p.uid), ig: String(sid) }); n++;
    } return n; }
  async checkInstagram(uid: string): Promise<boolean | "not_linked" | "unavailable"> {
    const c = this.cfg.instagram, r = this.recs.get(uid); if (!c) return false; if (!r?.ig) return "not_linked";
    try { const j: any = await (await this.fetchFn(`https://graph.instagram.com/v21.0/${encodeURIComponent(r.ig)}?fields=is_user_follow_business&access_token=${encodeURIComponent(this.igToken())}`)).json();
      if (typeof j?.is_user_follow_business !== "boolean") return "unavailable"; return this.mark(uid, "instagram", j.is_user_follow_business);
    } catch { return "unavailable"; }
  }
  // ---- YouTube: mijoz Google orqali youtube.readonly ruxsatini oladi; token saqlanmaydi, faqat natija.
  async checkYoutube(uid: string, accessToken: string): Promise<boolean | "unavailable"> {
    const c = this.cfg.youtube; if (!c) return false;
    try { const res = await this.fetchFn(`https://www.googleapis.com/youtube/v3/subscriptions?part=id&mine=true&forChannelId=${encodeURIComponent(c.channelId)}`, { headers: { authorization: `Bearer ${accessToken}` } });
      if (!res.ok) return "unavailable"; const j: any = await res.json(); return this.mark(uid, "youtube", Array.isArray(j?.items) && j.items.length > 0);
    } catch { return "unavailable"; }
  }
}

export interface GateDeps { app: FastifyInstance; gate: SubscriptionGate; secured: (h: (uid: string, req: any, reply: any) => unknown) => (req: any, reply: any) => unknown; ageOf: (uid: string) => number | null }
export function registerGate(d: GateDeps) {
  const { app, gate } = d, lim = new KeyedLimiter(6 / 60, 8);
  const guard = (uid: string, reply: any) => { if (lim.allow(uid)) return true; reply.code(429).send({ error: "rate_limited" }); return false; };
  const res = (r: boolean | string) => ({ ok: r === true, result: r === true ? "ok" : r === false ? "not_subscribed" : r });
  app.get("/gate", d.secured((uid) => gate.status(uid, d.ageOf(uid))));
  app.get("/me/socials", d.secured((uid) => ({ items: gate.socials(uid), stars: gate.starsOf(uid), starXp: gate.starXp, required: gate.enforced() })));
  app.delete("/me/socials/:p", d.secured((uid, req, reply) => { const p = String((req.params as any).p); if (!(PLATFORMS as string[]).includes(p)) return reply.code(400).send({ error: "bad_platform" }); gate.disconnect(uid, p as Platform); return { ok: true, items: gate.socials(uid), stars: gate.starsOf(uid) }; }));
  app.post("/gate/telegram/start", d.secured((uid, _q, reply) => guard(uid, reply) ? (gate.telegramStart(uid) ?? reply.code(404).send({ error: "gate_off" })) : undefined));
  app.post("/gate/telegram/check", d.secured(async (uid, _q, reply) => guard(uid, reply) ? { ...res(await gate.checkTelegram(uid)), status: gate.status(uid, d.ageOf(uid)) } : undefined));
  app.post("/gate/instagram/start", d.secured((uid, _q, reply) => guard(uid, reply) ? (gate.instagramStart(uid) ?? reply.code(404).send({ error: "gate_off" })) : undefined));
  app.post("/gate/instagram/check", d.secured(async (uid, _q, reply) => guard(uid, reply) ? { ...res(await gate.checkInstagram(uid)), status: gate.status(uid, d.ageOf(uid)) } : undefined));
  app.post("/gate/youtube/check", d.secured(async (uid, req, reply) => {
    if (!guard(uid, reply)) return; const t = (req.body as any)?.accessToken; if (typeof t !== "string" || t.length < 10 || t.length > 4096) return reply.code(400).send({ error: "bad_token" });
    return { ...res(await gate.checkYoutube(uid, t)), status: gate.status(uid, d.ageOf(uid)) };
  }));
  // Webhooklar: Telegram maxfiy sarlavha bilan, Instagram imzo bilan (xom tana kerak — alohida kapsulada).
  app.register(async (s) => {
    s.addContentTypeParser("application/json", { parseAs: "buffer" }, (_r, body, done) => { try { done(null, { raw: body, json: JSON.parse((body as Buffer).toString("utf8") || "{}") }); } catch (e) { done(e as Error); } });
    s.post("/gate/telegram/webhook", async (req, reply) => {
      const c = gate.cfg.telegram; if (!c || !c.webhookSecret || req.headers["x-telegram-bot-api-secret-token"] !== c.webhookSecret) return reply.code(403).send({ error: "forbidden" });
      void gate.handleTelegram((req.body as any).json, d.ageOf); return { ok: true };
    });
    s.get("/gate/instagram/webhook", async (req, reply) => {
      const q = req.query as any, c = gate.cfg.instagram; if (!c?.verifyToken || q["hub.mode"] !== "subscribe" || q["hub.verify_token"] !== c.verifyToken) return reply.code(403).send("forbidden");
      return reply.type("text/plain").send(String(q["hub.challenge"] ?? ""));
    });
    s.post("/gate/instagram/webhook", async (req, reply) => {
      const b = req.body as { raw: Buffer; json: unknown }; if (!gate.verifyInstagramSignature(b.raw, req.headers["x-hub-signature-256"] as string | undefined)) return reply.code(403).send({ error: "forbidden" });
      gate.onInstagramEvent(b.json); return { ok: true };
    });
  });
}

export function registerGateAdmin(guard: Guard, app: FastifyInstance, gate: SubscriptionGate, exists: (id: string) => boolean) {
  app.get("/admin/gate", guard("users.read", () => gate.stats()));
  app.post("/admin/gate/exempt", guard("users.manage", (req, who) => {
    const b = (req.body ?? {}) as { userId?: unknown; reason?: unknown }, id = String(b.userId ?? "").trim(), reason = String(b.reason ?? "").trim();
    if (!exists(id)) return { error: "no_user" }; gate.exempt(id, who.id, reason.slice(0, 200)); return { ok: true, exemptions: gate.exemptions() };
  }, "gate.exempt", { reason: true }));
  app.post("/admin/gate/unexempt", guard("users.manage", (req) => { gate.unexempt(String(((req.body ?? {}) as any).userId ?? "")); return { ok: true, exemptions: gate.exemptions() }; }, "gate.unexempt", { reason: true }));
  app.post("/admin/gate/maintain", guard("users.manage", async () => { await gate.registerTelegramWebhook(); await gate.refreshInstagram(true); return { ok: true, health: gate.health }; }, "gate.maintain"));
}
