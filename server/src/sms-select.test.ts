import { describe, it, expect } from "vitest";
import { selectSms } from "./sms-select";
import { EskizSms, HttpSms, NoopSms, ConsoleSms } from "./auth";

const ESK = { ESKIZ_EMAIL: "a@b.uz", ESKIZ_PASSWORD: "x", ESKIZ_FROM: "MyBrand" };
describe("SMS-provayderni tanlash (production himoyasi)", () => {
  it("production: faqat Eskiz yoki HTTP-shlyuz; doimiy kod va console rad etiladi", () => {
    expect(() => selectSms({ NODE_ENV: "production", SMS_PROVIDER: "fixed", SMS_FIXED_CODE: "123456" })).toThrow(/production'da taqiqlangan/);
    expect(() => selectSms({ NODE_ENV: "production", SMS_PROVIDER: "console" })).toThrow(/production'da taqiqlangan/);
    expect(selectSms({ NODE_ENV: "production", SMS_PROVIDER: "eskiz", ...ESK }).sms).toBeInstanceOf(EskizSms);
    expect(selectSms({ NODE_ENV: "production", SMS_HTTP_URL: "https://gw.example/send", SMS_HTTP_TOKEN: "t" }).sms).toBeInstanceOf(HttpSms);
    expect(selectSms({ NODE_ENV: "production" }).sms).toBeNull(); // hech narsa berilmasa — SMS yo'q (main.ts OIDC yo'q bo'lsa to'xtatadi)
  });
  it("production'da Eskiz hisob ma'lumotlarisiz ishga tushmaydi", () => {
    expect(() => selectSms({ NODE_ENV: "production", SMS_PROVIDER: "eskiz" })).toThrow(/ESKIZ_EMAIL/);
  });
  it("staging/sinov: fixed va console ishlaydi, lekin ogohlantirish bilan", () => {
    const f = selectSms({ NODE_ENV: "staging", SMS_PROVIDER: "fixed" }); expect(f.sms).toBeInstanceOf(NoopSms); expect(f.fixed).toBe(true); expect(f.warning).toMatch(/doimiy kod/);
    const c = selectSms({ NODE_ENV: "staging", SMS_PROVIDER: "console" }); expect(c.sms).toBeInstanceOf(ConsoleSms); expect(c.warning).toMatch(/jurnalga/);
  });
  it("Eskiz sinov nomi (4546) yoki bo'sh nom — ogohlantirish; o'z nomi — ogohlantirishsiz", () => {
    expect(selectSms({ SMS_PROVIDER: "eskiz", ESKIZ_EMAIL: "a@b.uz", ESKIZ_PASSWORD: "x", ESKIZ_FROM: "4546" }).warning).toMatch(/4546/);
    expect(selectSms({ SMS_PROVIDER: "eskiz", ...ESK }).warning).toBeUndefined();
  });
});
