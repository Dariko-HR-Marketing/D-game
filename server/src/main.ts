import { Pool } from "pg";
import { buildApp } from "./app";
import { PgStore } from "./pgstore";
import { PgPersist } from "./persist";
import { MemoryStore } from "./store";
import { ContentRegistry } from "./registry";
import { AdminState } from "./admin";
import { ProfileService } from "./profiles";
import { AnalysisService } from "./analysis";
import { WriteQueue } from "./persist";
import { ConsoleSms, EskizSms, HttpSms, NoopSms, fixedCode, OtpService, type SmsSender } from "./auth";
import { PgDocs } from "./docs";
import { Ops } from "./ops";
import { APPLE, GOOGLE, OidcVerifier } from "./oidc";

const url = process.env.DATABASE_URL;
const analysisWrites = new WriteQueue();
let docs: PgDocs | undefined; let store: MemoryStore | PgStore, registry: ContentRegistry | undefined, adminState: AdminState | undefined, profiles: ProfileService | undefined, analysis: AnalysisService | undefined;
if (url) {
  const pg = PgStore.connect(url); await pg.migrate(); store = pg;
  const pool = new Pool({ connectionString: url }); pool.on("error", (e) => console.error("pg pool xatosi (ulanish uzildi, qayta ulanadi):", e.message)); // aks holda jarayon qulaydi
  const persist = new PgPersist(pool); docs = new PgDocs(pool);
  registry = await ContentRegistry.restore(persist);
  adminState = await AdminState.restore(persist);
  profiles = await ProfileService.restore(persist);
  analysis = await AnalysisService.restore(store, registry, analysisWrites, persist);
} else { console.warn("DATABASE_URL yo'q: xotira saqlagichi (faqat ishlab chiqish uchun)"); store = new MemoryStore(); }
// Kirish: AUTH_SECRET berilsa — haqiqiy rejim. SMS_HTTP_URL/SMS_HTTP_TOKEN bo'lsa SMS orqali; SMS_PROVIDER=console faqat staging uchun.
const authSecret = process.env.AUTH_SECRET;
if (authSecret && authSecret.length < 32) throw new Error("AUTH_SECRET kamida 32 belgi bo'lishi kerak");
const ops = new Ops(docs);
let otp: OtpService | undefined; let smsSender: SmsSender | undefined;
if (authSecret) {
  const fixed = process.env.SMS_PROVIDER === "fixed"; // sinov: SMS yo'q, doimiy kod (production'da NoopSms yaratilmaydi)
  const sms = fixed ? new NoopSms() : process.env.SMS_PROVIDER === "eskiz" ? new EskizSms(process.env.ESKIZ_EMAIL ?? "", process.env.ESKIZ_PASSWORD ?? "", process.env.ESKIZ_FROM ?? "4546")
    : process.env.SMS_HTTP_URL ? new HttpSms(process.env.SMS_HTTP_URL, process.env.SMS_HTTP_TOKEN ?? "")
    : process.env.SMS_PROVIDER === "console" && process.env.NODE_ENV !== "production" ? new ConsoleSms() : null;
  const anyOidc = [process.env.GOOGLE_CLIENT_IDS, process.env.APPLE_CLIENT_ID].some((v) => (v ?? "").trim());
  if (!sms && !anyOidc) throw new Error("AUTH_SECRET berilgan, lekin kirish usuli yo'q: SMS_HTTP_URL, GOOGLE_CLIENT_IDS yoki APPLE_CLIENT_ID (staging uchun SMS_PROVIDER=console)");
  smsSender = sms ? ops.wrapSms(sms) : undefined; // SMS holati admin panelda ko'rinadi
  if (smsSender) { otp = new OtpService({ secret: authSecret, sms: smsSender, ...(fixed ? { code: fixedCode(process.env.SMS_FIXED_CODE) } : {}) }); setInterval(() => otp!.sweep(), 60_000).unref(); }
}
const ids = (v?: string) => (v ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const oidc: Partial<Record<"google" | "apple", OidcVerifier>> = {};
if (authSecret && ids(process.env.GOOGLE_CLIENT_IDS).length) oidc.google = new OidcVerifier(GOOGLE(ids(process.env.GOOGLE_CLIENT_IDS)));
if (authSecret && ids(process.env.APPLE_CLIENT_ID).length) oidc.apple = new OidcVerifier(APPLE(ids(process.env.APPLE_CLIENT_ID)));
const { app, rooms, ready, flush } = buildApp({ requireProfile: true, docs, ops, sms: smsSender, publicUrl: process.env.PUBLIC_URL, webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET, otp, authSecret, oidc, store, registry, adminState, profiles, analysis, logger: { level: process.env.LOG_LEVEL ?? "info" } });
await ready;
process.on("unhandledRejection", (e) => app.log.error({ err: String((e as Error)?.message ?? e) }, "unhandledRejection"));
process.on("uncaughtException", (e) => { app.log.fatal({ err: e.message }, "uncaughtException"); process.exit(1); });
for (const sig of ["SIGTERM", "SIGINT"] as const) process.on(sig, async () => { app.log.info({ sig }, "to'xtatilmoqda"); await app.close(); await Promise.race([Promise.all([flush(), adminState?.writes.flush(), profiles?.writes.flush(), registry?.writes.flush(), analysisWrites.flush()]), new Promise((r) => setTimeout(r, 8000))]); process.exit(0); }); // navbatdagi yozuvlar (taqiq, audit, natija) yo'qolmasin
console.log(`tiklangan o'yinlar: ${await rooms.restore()}`);
const IDLE_MS = Number(process.env.ROOM_IDLE_MINUTES ?? 30) * 60_000; // taxmin (OPEN_QUESTIONS #49)
setInterval(() => { rooms.sweep(IDLE_MS).then((n) => n && app.log.info({ n }, "tashlab ketilgan xonalar yopildi")).catch((e) => app.log.error({ err: String(e?.message ?? e) }, "sweep xatosi")); }, 60_000).unref();
const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
console.log(`POYGA server :${port}`);
