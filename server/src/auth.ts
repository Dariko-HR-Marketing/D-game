// Haqiqiy autentifikatsiya (§7): SMS bir martalik kod → imzolangan sessiya tokeni.
// SMS yuboruvchi almashtiriladi (`SmsSender`): provayder tanlangach faqat shu interfeys yoziladi. Telefon raqami saqlanmaydi — faqat qaytarib bo'lmaydigan identifikator.
import { createHmac, createHash, randomInt, timingSafeEqual } from "node:crypto";

export interface SmsSender { send(phone: string, text: string): Promise<void> }

/** Dasturlash uchun: kodni jurnalga yozadi. Ishlab chiqarishda (`NODE_ENV=production`) ruxsat etilmaydi. */
export class ConsoleSms implements SmsSender { async send(phone: string, text: string) { console.log(`[SMS → ${phone.slice(0, 5)}***] ${text}`); } }

/** Umumiy HTTP-orqali yuboruvchi: istalgan SMS-shlyuz uchun. Shlyuz JSON `{to, text}` qabul qiladigan oraliq xizmat yoki moslashtirilgan adapter bo'lishi kerak. */
export class HttpSms implements SmsSender {
  constructor(private url: string, private token: string, private f: typeof fetch = fetch) {}
  async send(phone: string, text: string) {
    const r = await this.f(this.url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${this.token}` }, body: JSON.stringify({ to: phone, text }) });
    if (!r.ok) throw new Error(`sms_gateway_${r.status}`);
  }
}

/** +998901234567 ko'rinishiga keltiradi; noto'g'ri bo'lsa null. */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const d = raw.replace(/[\s()-]/g, "");
  const m = /^\+?(\d{9,15})$/.exec(d); if (!m) return null;
  let n = m[1];
  if (n.length === 9) n = "998" + n; // mahalliy 9 xonali (90 123 45 67)
  return /^\d{11,15}$/.test(n) ? "+" + n : null;
}

const b64 = (b: Buffer) => b.toString("base64url");
const sig = (secret: string, data: string) => b64(createHmac("sha256", secret).update(data).digest());

/** `v1.<userId>.<tugash ms>.<imzo>` */
export function signToken(secret: string, userId: string, expiresAt: number): string { const p = `v1.${userId}.${expiresAt}`; return `${p}.${sig(secret, p)}`; }
export function verifyToken(secret: string, token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const parts = token.split("."); if (parts.length !== 4 || parts[0] !== "v1") return null;
  const [, userId, exp, s] = parts; const p = `v1.${userId}.${exp}`;
  const a = Buffer.from(s), b = Buffer.from(sig(secret, p));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!(Number(exp) > now) || !/^[\w-]{1,64}$/.test(userId)) return null;
  return userId;
}
/** Telefon → barqaror anonim identifikator (HMAC): raqamning o'zi saqlanmaydi. */
export const userIdOf = (secret: string, phone: string) => "p" + createHmac("sha256", secret).update("uid:" + phone).digest("hex").slice(0, 20);

export interface OtpOpts { secret: string; sms: SmsSender; now?: () => number; ttlMs?: number; maxAttempts?: number; sessionMs?: number; code?: () => string }
type Rec = { hash: string; exp: number; tries: number };
export class OtpService {
  private recs = new Map<string, Rec>(); private sent = new Map<string, number[]>();
  private now: () => number; private ttl: number; private maxTries: number; private session: number; private gen: () => string;
  constructor(private o: OtpOpts) {
    this.now = o.now ?? Date.now; this.ttl = o.ttlMs ?? 5 * 60_000; this.maxTries = o.maxAttempts ?? 5; this.session = o.sessionMs ?? 30 * 86_400_000;
    this.gen = o.code ?? (() => String(randomInt(0, 1_000_000)).padStart(6, "0"));
  }
  private h(phone: string, code: string) { return createHash("sha256").update(`${this.o.secret}:${phone}:${code}`).digest("hex"); }
  /** Bir raqamga: 1 daqiqada 1 ta, 1 soatda 5 ta (SMS narxi va suiiste'mol). */
  async request(phone: string): Promise<{ ok: true } | { ok: false; error: "rate_limited" | "sms_failed" }> {
    const t = this.now(); const hist = (this.sent.get(phone) ?? []).filter((x) => t - x < 3_600_000);
    if (hist.length >= 5 || (hist.length && t - hist[hist.length - 1] < 60_000)) return { ok: false, error: "rate_limited" };
    const code = this.gen();
    try { await this.o.sms.send(phone, `POYGA: tasdiqlash kodi ${code}. Hech kimga bermang.`); } catch { return { ok: false, error: "sms_failed" }; }
    hist.push(t); this.sent.set(phone, hist);
    this.recs.set(phone, { hash: this.h(phone, code), exp: t + this.ttl, tries: 0 });
    return { ok: true };
  }
  verify(phone: string, code: unknown): { ok: true; userId: string; token: string } | { ok: false; error: "bad_code" | "expired" } {
    const r = this.recs.get(phone); const t = this.now();
    if (!r || r.exp < t || r.tries >= this.maxTries) { this.recs.delete(phone); return { ok: false, error: "expired" }; }
    r.tries++;
    const ok = typeof code === "string" && /^\d{6}$/.test(code) && timingSafeEqual(Buffer.from(this.h(phone, code)), Buffer.from(r.hash));
    if (!ok) return { ok: false, error: "bad_code" };
    this.recs.delete(phone);
    const userId = userIdOf(this.o.secret, phone);
    return { ok: true, userId, token: signToken(this.o.secret, userId, t + this.session) };
  }
  /** Eskirgan yozuvlarni tozalash (xotira). */
  sweep() { const t = this.now(); for (const [k, v] of this.recs) if (v.exp < t) this.recs.delete(k); for (const [k, h] of this.sent) { const f = h.filter((x) => t - x < 3_600_000); f.length ? this.sent.set(k, f) : this.sent.delete(k); } }
}
