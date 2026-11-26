// SMS tayyorligi (administrator): provayder turi, Eskiz balansi, jo'natuvchi nomi va shablon holatlari. Hech narsa yuborilmaydi, parol/token ko'rsatilmaydi.
import type { FastifyInstance } from "fastify";
import type { Guard } from "./admin";
import { EskizSms, HttpSms, type SmsSender } from "./auth";

/** Eskiz hujjati: sinov holatida faqat shu matnlar yuboriladi. Haqiqiy matn uchun hisob faollashtirilgan, jo'natuvchi nomi va shablon tasdiqlangan bo'lishi kerak. */
export const ESKIZ_TEST_TEXTS = ["Это тест от Eskiz", "Bu Eskiz dan test", "This is test from Eskiz"];
/** Tizim yuboradigan SMS matnlari: Eskiz'da shablon sifatida tasdiqlatiladi (kod o'rniga raqam turadi). */
export const SMS_TEMPLATES = [
  { key: "otp", title: "Kirish kodi", text: "Tajriba24: tasdiqlash kodi 123456. Hech kimga bermang." },
  { key: "parent", title: "Ota-ona so'rovi", text: "Tajriba24: farzandingiz \"...\" uchun ruxsat so'radi. Ko'rish va javob berish: https://api.tajriba24.uz/parent/..." },
];
export function registerAdminSms(guard: Guard, app: FastifyInstance, sms: SmsSender | undefined) {
  app.get("/admin/sms/status", guard("system.read", async () => {
    const kind = sms instanceof EskizSms ? "eskiz" : sms instanceof HttpSms ? "http" : sms ? "other" : "none";
    const base = { kind, testTexts: ESKIZ_TEST_TEXTS, templates: SMS_TEMPLATES };
    if (!(sms instanceof EskizSms)) return base;
    const i = await sms.info(); const approved = i.templates.filter((t) => t.status === "service" || t.status === "reklama");
    const ready = !i.testFrom && i.nicks.includes(i.from) && approved.length > 0 && (i.balance ?? 0) > 0;
    return { ...base, from: i.from, testFrom: i.testFrom, balance: i.balance, nicks: i.nicks, fromApproved: i.nicks.includes(i.from), eskizTemplates: i.templates, approvedTemplates: approved.length, ready, error: i.error };
  }));
}
