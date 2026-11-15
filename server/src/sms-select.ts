// SMS-provayderni muhitdan tanlash (main.ts dan ajratilgan: sinash mumkin bo'lishi uchun).
// Qoida (2-band): NODE_ENV=production da FAQAT haqiqiy yuboruvchi (Eskiz yoki HTTP-shlyuz) ishlaydi; doimiy kod (`fixed`) va jurnalga yozuvchi (`console`) rad etiladi.
import { ConsoleSms, EskizSms, HttpSms, NoopSms, type SmsSender } from "./auth";

export interface SmsChoice { sms: SmsSender | null; fixed: boolean; warning?: string }

export function selectSms(env: Record<string, string | undefined>): SmsChoice {
  const prod = env.NODE_ENV === "production", provider = env.SMS_PROVIDER;
  if (prod && (provider === "fixed" || provider === "console")) throw new Error(`SMS_PROVIDER=${provider} production'da taqiqlangan: SMS_PROVIDER=eskiz (ESKIZ_EMAIL, ESKIZ_PASSWORD, ESKIZ_FROM) yoki SMS_HTTP_URL/SMS_HTTP_TOKEN bering`);
  if (provider === "fixed") return { sms: new NoopSms(), fixed: true, warning: "DIQQAT: SMS_PROVIDER=fixed — SMS yuborilmaydi, hamma uchun doimiy kod. Faqat sinov (staging) uchun; kirish xavfsiz emas." };
  if (provider === "eskiz") return { sms: new EskizSms(env.ESKIZ_EMAIL ?? "", env.ESKIZ_PASSWORD ?? "", env.ESKIZ_FROM ?? "4546"), fixed: false, ...(env.ESKIZ_FROM && env.ESKIZ_FROM !== "4546" ? {} : { warning: "DIQQAT: ESKIZ_FROM bo'sh yoki 4546 (Eskiz sinov nomi): haqiqiy kodlar uchun o'z jo'natuvchi nomingizni Eskiz kabinetida tasdiqlating." }) };
  if (env.SMS_HTTP_URL) return { sms: new HttpSms(env.SMS_HTTP_URL, env.SMS_HTTP_TOKEN ?? ""), fixed: false };
  if (provider === "console" && !prod) return { sms: new ConsoleSms(), fixed: false, warning: "DIQQAT: SMS_PROVIDER=console — kodlar jurnalga yoziladi (faqat staging)." };
  return { sms: null, fixed: false };
}
