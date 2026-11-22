// Email bir martalik kod bilan kirish (SMS kabi himoya: bir manzilga 1 daqiqada 1 ta, soatiga 5 ta, 5 xatodan keyin 15 daqiqa blok, kod faqat xesh ko'rinishida).
// Manzil serverda saqlanmaydi: foydalanuvchi ID manzildan HMAC bilan hosil qilinadi. Yuboruvchi (provayder) hali tanlanmagan: `EMAIL_HTTP_URL` + `EMAIL_HTTP_TOKEN` berilganda yoqiladi.
import { OtpService, type SmsSender } from "./auth";

export interface EmailSender { send(to: string, subject: string, text: string): Promise<void> }
/** Dasturlash uchun: kodni jurnalga yozadi. Ishlab chiqarishda taqiqlangan. */
export class ConsoleEmail implements EmailSender {
  constructor() { if (process.env.NODE_ENV === "production") throw new Error("ConsoleEmail production'da taqiqlangan (kodlar jurnalga tushadi)"); }
  async send(to: string, _s: string, text: string) { console.log(`[EMAIL → ${to.replace(/^(.{2}).*(@.*)$/, "$1***$2")}] ${text}`); }
}
/** Umumiy HTTP-orqali yuboruvchi: JSON `{to, subject, text}` qabul qiladigan oraliq xizmat yoki moslashtirilgan adapter. */
export class HttpEmail implements EmailSender {
  constructor(private url: string, private token: string, private f: typeof fetch = fetch, private timeoutMs = 8000) { if (!token) throw new Error("EMAIL_HTTP_TOKEN bo'sh bo'lmasligi kerak"); }
  async send(to: string, subject: string, text: string) {
    const r = await this.f(this.url, { signal: AbortSignal.timeout(this.timeoutMs), method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${this.token}` }, body: JSON.stringify({ to, subject, text }) });
    if (!r.ok) throw new Error(`email_gateway_${r.status}`);
  }
}
const RE = /^[a-z0-9._%+\-]{1,64}@[a-z0-9\-]+(\.[a-z0-9\-]+)*\.[a-z]{2,24}$/;
/** Manzilni tekshiradi va kichik harfga keltiradi; yaroqsiz bo'lsa `null`. */
export function normalizeEmail(raw: unknown): string | null { if (typeof raw !== "string") return null; const e = raw.trim().toLowerCase(); return e.length <= 254 && RE.test(e) ? e : null; }

/** SMS xizmatining xuddi o'zi (bir xil himoya va sessiya), faqat yuboruvchi email; kalit maydoni «mail:» bilan ajratiladi. */
export function emailOtp(secret: string, sender: EmailSender, extra: { code?: () => string; now?: () => number } = {}) {
  const asSms: SmsSender = { send: (to, text) => sender.send(to.replace(/^mail:/, ""), "Tajriba24: tasdiqlash kodi", text) };
  const otp = new OtpService({ secret, sms: asSms, ...extra });
  return {
    request: (email: string) => otp.request("mail:" + email), verify: (email: string, code: unknown) => otp.verify("mail:" + email, code), sweep: () => otp.sweep(),
  };
}
export type EmailOtp = ReturnType<typeof emailOtp>;
