// Haqiqiy autentifikatsiya (§7): SMS bir martalik kod → imzolangan sessiya tokeni.
// SMS yuboruvchi almashtiriladi (`SmsSender`): provayder tanlangach faqat shu interfeys yoziladi. Telefon raqami saqlanmaydi — faqat qaytarib bo'lmaydigan identifikator.
import { createHmac, createHash, randomInt, timingSafeEqual } from "node:crypto";

export interface SmsSender { send(phone: string, text: string): Promise<void> }

/** Dasturlash uchun: kodni jurnalga yozadi. Ishlab chiqarishda (`NODE_ENV=production`) ruxsat etilmaydi. */
export class ConsoleSms implements SmsSender {
  constructor() { if (process.env.NODE_ENV === "production") throw new Error("ConsoleSms production'da taqiqlangan (kodlar jurnalga tushadi)"); }
  async send(phone: string, text: string) { console.log(`[SMS → ${phone.slice(0, 5)}***] ${text}`); } }

/** Faqat sinov (staging): SMS yubormaydi. `SMS_PROVIDER=fixed` bilan doimiy kod (`SMS_FIXED_CODE`) ishlatiladi. Production'da taqiqlangan. */
export class NoopSms implements SmsSender {
  constructor() { if (process.env.NODE_ENV === "production") throw new Error("NoopSms production'da taqiqlangan (doimiy kod xavfsiz emas)"); }
  async send() { /* SMS yuborilmaydi */ } }
export function fixedCode(raw: string | undefined): () => string {
  if (!/^\d{6}$/.test(raw ?? "")) throw new Error("SMS_FIXED_CODE 6 ta raqam bo'lishi kerak");
  return () => raw!;
}

/** Umumiy HTTP-orqali yuboruvchi: istalgan SMS-shlyuz uchun. Shlyuz JSON `{to, text}` qabul qiladigan oraliq xizmat yoki moslashtirilgan adapter bo'lishi kerak. */
export class HttpSms implements SmsSender {
  constructor(private url: string, private token: string, private f: typeof fetch = fetch, private timeoutMs = 8000) { if (!token) throw new Error("SMS_HTTP_TOKEN bo'sh bo'lmasligi kerak"); }
  async send(phone: string, text: string) {
    const r = await this.f(this.url, { signal: AbortSignal.timeout(this.timeoutMs), method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${this.token}` }, body: JSON.stringify({ to: phone, text }) });
    if (!r.ok) throw new Error(`sms_gateway_${r.status}`);
  }
}

/** Eskiz (notify.eskiz.uz) adapteri: login → Bearer token (xotirada), 401 da qayta kirish. Telefon `998...` (plyussiz) ko'rinishida yuboriladi. */
export class EskizSms implements SmsSender {
  private token: string | null = null; private login: Promise<string> | null = null;
  constructor(private email: string, private password: string, private from: string, private base = "https://notify.eskiz.uz/api", private f: typeof fetch = fetch, private timeoutMs = 8000) {
    if (!email || !password) throw new Error("ESKIZ_EMAIL va ESKIZ_PASSWORD bo'sh bo'lmasligi kerak");
    if (!from) throw new Error("ESKIZ_FROM bo'sh bo'lmasligi kerak");
  }
  private async auth(): Promise<string> {
    this.login ??= (async () => {
      try {
        const r = await this.f(`${this.base}/auth/login`, { signal: AbortSignal.timeout(this.timeoutMs), method: "POST", body: new URLSearchParams({ email: this.email, password: this.password }) });
        if (!r.ok) throw new Error(`sms_gateway_login_${r.status}`);
        const t = ((await r.json()) as { data?: { token?: string } })?.data?.token;
        if (!t) throw new Error("sms_gateway_login_no_token");
        return (this.token = t);
      } finally { this.login = null; }
    })();
    return this.login;
  }
  private post(token: string, phone: string, text: string) {
    return this.f(`${this.base}/message/sms/send`, { signal: AbortSignal.timeout(this.timeoutMs), method: "POST", headers: { authorization: `Bearer ${token}` }, body: new URLSearchParams({ mobile_phone: phone.replace(/^\+/, ""), message: text, from: this.from }) });
  }
  /** Tayyorlik (admin): balans, tasdiqlangan jo'natuvchi nomlari, shablon holatlari. Hujjat: GET /auth/user, /nick/me, /user/templates. Hech narsa yuborilmaydi. */
  async info(): Promise<{ from: string; testFrom: boolean; balance: number | null; nicks: string[]; templates: { id: number; text: string; status: string }[]; error?: string }> {
    const base = { from: this.from, testFrom: this.from === "4546", balance: null as number | null, nicks: [] as string[], templates: [] as { id: number; text: string; status: string }[] };
    try {
      let t = this.token ?? (await this.auth());
      const get = async (path: string) => { let r = await this.f(`${this.base}${path}`, { signal: AbortSignal.timeout(this.timeoutMs), headers: { authorization: `Bearer ${t}` } }); if (r.status === 401) { this.token = null; t = await this.auth(); r = await this.f(`${this.base}${path}`, { signal: AbortSignal.timeout(this.timeoutMs), headers: { authorization: `Bearer ${t}` } }); } return r.ok ? r.json() : null; };
      const [u, n, tp] = await Promise.all([get("/auth/user"), get("/nick/me"), get("/user/templates")]) as any[];
      const bal = Number(u?.data?.balance); if (u?.data && Number.isFinite(bal)) base.balance = bal;
      if (Array.isArray(n)) base.nicks = n.map(String); else if (Array.isArray(n?.data)) base.nicks = n.data.map(String);
      const list = Array.isArray(tp?.result) ? tp.result : [];
      base.templates = list.slice(0, 50).map((x: any) => ({ id: Number(x.id), text: String(x.original_text ?? x.template ?? "").slice(0, 200), status: String(x.status ?? "") }));
      return base;
    } catch (e) { return { ...base, error: String((e as Error).message).slice(0, 80) }; }
  }
  async send(phone: string, text: string) {
    let r = await this.post(this.token ?? (await this.auth()), phone, text);
    if (r.status === 401) { this.token = null; r = await this.post(await this.auth(), phone, text); }
    if (!r.ok) throw new Error(`sms_gateway_${r.status}`);
  }
}

/** O'zbekiston MOBIL operator kodlari (998 dan keyingi 2 raqam). Shahar telefonlari (61…79 oralig'idagi) SMS qabul qilmaydi, shuning uchun ro'yxatda yo'q.
 *  Manba: Vikipediya «Telephone numbers in Uzbekistan», ITU, operatorlar sahifalari (Beeline 90/91/20, Ucell 93/94/50, Uzmobile 99/95/77/70, Mobiuz 97/87, Humans 33, Perfectum 98, 88, 55).
 *  Yangi kod ochilsa, kodni o'zgartirmasdan `PHONE_UZ_MOBILE_CODES=20,33,...` bilan yangilanadi. */
export const UZ_MOBILE_CODES: ReadonlySet<string> = new Set((process.env.PHONE_UZ_MOBILE_CODES ?? "20,33,50,55,70,77,87,88,90,91,93,94,95,97,98,99").split(",").map((s) => s.trim()).filter(Boolean));

/** +998901234567 ko'rinishiga keltiradi; noto'g'ri bo'lsa null. +998 raqamlari aniq 12 xonali bo'lishi va operator kodi mobil ro'yxatda bo'lishi shart. */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const d = raw.replace(/[\s()-]/g, "");
  const m = /^\+?(\d{9,15})$/.exec(d); if (!m) return null;
  let n = m[1];
  if (n.length === 9) n = "998" + n; // mahalliy 9 xonali (90 123 45 67)
  if (!/^\d{11,15}$/.test(n)) return null;
  if (n.startsWith("998") && (n.length !== 12 || !UZ_MOBILE_CODES.has(n.slice(3, 5)))) return null; // O'zbekiston raqami: operator kodi tekshiriladi
  return "+" + n;
}
/** Telefon xatosining aniq kodi: `bad_operator` — raqam O'zbekiston formatida, lekin operator kodi mobil ro'yxatda yo'q; `bad_phone` — boshqa shakl xatosi; `null` — yaroqli. */
export function phoneError(raw: unknown): "bad_phone" | "bad_operator" | null {
  if (normalizePhone(raw) !== null) return null;
  if (typeof raw !== "string") return "bad_phone";
  const m = /^\+?(\d{9,15})$/.exec(raw.replace(/[\s()-]/g, "")); if (!m) return "bad_phone";
  const n = m[1].length === 9 ? "998" + m[1] : m[1];
  return n.startsWith("998") && n.length === 12 ? "bad_operator" : "bad_phone";
}

const b64 = (b: Buffer) => b.toString("base64url");
const sig = (secret: string, data: string) => b64(createHmac("sha256", secret).update(data).digest());

export const SESSION_MS = 30 * 86_400_000;
/** `v2.<userId>.<berilgan ms>.<tugash ms>.<imzo>` — berilgan vaqt bekor qilish (chiqish, hisobni o'chirish) uchun kerak. */
export function signToken(secret: string, userId: string, expiresAt: number, issuedAt = Date.now()): string { const p = `v2.${userId}.${issuedAt}.${expiresAt}`; return `${p}.${sig(secret, p)}`; }
/** Bitta joyda sessiya berish (SMS, Google, Apple): muddat bir xil. */
export function issueSession(secret: string, userId: string, now = Date.now(), ttl = SESSION_MS) { return { token: signToken(secret, userId, now + ttl, now), userId }; }
export function parseToken(secret: string, token: string | undefined, now = Date.now()): { userId: string; iat: number } | null {
  if (!token) return null;
  const parts = token.split("."); if (parts.length !== 5 || parts[0] !== "v2") return null;
  const [, userId, iat, exp, s] = parts; const p = `v2.${userId}.${iat}.${exp}`;
  const a = Buffer.from(s), b = Buffer.from(sig(secret, p));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!(Number(exp) > now) || !/^[\w-]{1,64}$/.test(userId)) return null;
  return { userId, iat: Number(iat) };
}
/** Bekor qilingan sessiyalar: foydalanuvchi bo'yicha «shu vaqtdan oldin berilganlar yaroqsiz». Xotirada (qayta ishga tushsa tozalanadi; taqiq esa alohida saqlanadi). */
export class Revocations {
  private m = new Map<string, number>();
  revoke(userId: string, at = Date.now()) { this.m.set(userId, at); }
  isRevoked(userId: string, iat: number) { const r = this.m.get(userId); return r !== undefined && iat <= r; }
}
export function verifyToken(secret: string, token: string | undefined, now = Date.now(), rev?: Revocations): string | null {
  const t = parseToken(secret, token, now); if (!t) return null;
  return rev?.isRevoked(t.userId, t.iat) ? null : t.userId;
}
/** Telefon → barqaror anonim identifikator (HMAC): raqamning o'zi saqlanmaydi. */
export const userIdOf = (secret: string, phone: string) => "p" + createHmac("sha256", secret).update("uid:" + phone).digest("hex").slice(0, 20);
/** Google/Apple `sub` → barqaror anonim ID (provayder bo'yicha alohida). */
export const userIdOfSub = (secret: string, provider: string, sub: string) => provider[0] + createHmac("sha256", secret).update(`uid:${provider}:${sub}`).digest("hex").slice(0, 20);

export interface OtpOpts { secret: string; sms: SmsSender; now?: () => number; ttlMs?: number; maxAttempts?: number; sessionMs?: number; code?: () => string }
type Rec = { hashes: string[]; exp: number };
export class OtpService {
  private recs = new Map<string, Rec>(); private sent = new Map<string, number[]>(); private fails = new Map<string, { n: number; until: number; first: number }>();
  private now: () => number; private ttl: number; private maxFails: number; private session: number; private gen: () => string;
  constructor(private o: OtpOpts) {
    this.now = o.now ?? Date.now; this.ttl = o.ttlMs ?? 5 * 60_000; this.maxFails = o.maxAttempts ?? 5; this.session = o.sessionMs ?? SESSION_MS;
    this.gen = o.code ?? (() => String(randomInt(0, 1_000_000)).padStart(6, "0"));
  }
  private h(phone: string, code: string) { return createHash("sha256").update(`${this.o.secret}:${phone}:${code}`).digest("hex"); }
  /** Bir raqamga: 1 daqiqada 1 ta, 1 soatda 5 ta. Joy SMS yuborishdan OLDIN band qilinadi (parallel so'rovlar chetlab o'tolmasin) va shlyuz xatosida ham hisoblanadi. */
  async request(phone: string): Promise<{ ok: true } | { ok: false; error: "rate_limited" | "sms_failed" }> {
    const t = this.now(); const hist = (this.sent.get(phone) ?? []).filter((x) => t - x < 3_600_000);
    if (hist.length >= 5 || (hist.length && t - hist[hist.length - 1] < 60_000) || this.locked(phone, t)) return { ok: false, error: "rate_limited" };
    hist.push(t); this.sent.set(phone, hist);
    const code = this.gen(); const hash = this.h(phone, code);
    // Oldingi hali amaldagi kod ham yaroqli qoladi (begona so'rov foydalanuvchining olgan kodini bekor qila olmasin); eng ko'pi 2 ta.
    const prev = this.recs.get(phone); const live = prev && prev.exp >= t ? prev.hashes.slice(-1) : [];
    this.recs.set(phone, { hashes: [...live, hash], exp: t + this.ttl });
    try { await this.o.sms.send(phone, `Tajriba24: tasdiqlash kodi ${code}. Hech kimga bermang.`); } catch { return { ok: false, error: "sms_failed" }; }
    return { ok: true };
  }
  private locked(phone: string, t: number) { const f = this.fails.get(phone); return !!f && f.until > t; }
  /** Noto'g'ri urinishlar raqam bo'yicha hisoblanadi va yangi kod so'rash bilan nolga tushmaydi: 5 xatodan keyin 15 daqiqa bloklanadi. */
  verify(phone: string, code: unknown): { ok: true; userId: string; token: string } | { ok: false; error: "bad_code" | "expired" | "locked" } {
    const t = this.now(); if (this.locked(phone, t)) return { ok: false, error: "locked" };
    const r = this.recs.get(phone);
    if (!r || r.exp < t) { this.recs.delete(phone); return { ok: false, error: "expired" }; }
    const given = typeof code === "string" && /^\d{6}$/.test(code) ? this.h(phone, code) : null;
    const ok = given !== null && r.hashes.some((h) => timingSafeEqual(Buffer.from(h), Buffer.from(given)));
    if (!ok) {
      const f = this.fails.get(phone); const cur = f && t - f.first < 3_600_000 ? f : { n: 0, until: 0, first: t };
      cur.n++; if (cur.n >= this.maxFails) { cur.until = t + 15 * 60_000; cur.n = 0; cur.first = t; this.recs.delete(phone); }
      this.fails.set(phone, cur); return { ok: false, error: "bad_code" };
    }
    this.recs.delete(phone); this.fails.delete(phone);
    const userId = userIdOf(this.o.secret, phone);
    return { ok: true, ...issueSession(this.o.secret, userId, t, this.session) };
  }
  sweep() { const t = this.now(); for (const [k, v] of this.recs) if (v.exp < t) this.recs.delete(k); for (const [k, h] of this.sent) { const f = h.filter((x) => t - x < 3_600_000); f.length ? this.sent.set(k, f) : this.sent.delete(k); } for (const [k, f] of this.fails) if (f.until < t && t - f.first > 3_600_000) this.fails.delete(k); }
}
