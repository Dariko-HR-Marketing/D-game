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

const url = process.env.DATABASE_URL;
const analysisWrites = new WriteQueue();
let store: MemoryStore | PgStore, registry: ContentRegistry | undefined, adminState: AdminState | undefined, profiles: ProfileService | undefined, analysis: AnalysisService | undefined;
if (url) {
  const pg = PgStore.connect(url); await pg.migrate(); store = pg;
  const pool = new Pool({ connectionString: url }); pool.on("error", (e) => console.error("pg pool xatosi (ulanish uzildi, qayta ulanadi):", e.message)); // aks holda jarayon qulaydi
  const persist = new PgPersist(pool);
  registry = await ContentRegistry.restore(persist);
  adminState = await AdminState.restore(persist);
  profiles = await ProfileService.restore(persist);
  analysis = await AnalysisService.restore(store, registry, analysisWrites, persist);
} else { console.warn("DATABASE_URL yo'q: xotira saqlagichi (faqat ishlab chiqish uchun)"); store = new MemoryStore(); }
const { app, rooms } = buildApp({ store, registry, adminState, profiles, analysis, logger: { level: process.env.LOG_LEVEL ?? "info" } });
process.on("unhandledRejection", (e) => app.log.error({ err: String((e as Error)?.message ?? e) }, "unhandledRejection"));
process.on("uncaughtException", (e) => { app.log.fatal({ err: e.message }, "uncaughtException"); process.exit(1); });
for (const sig of ["SIGTERM", "SIGINT"] as const) process.on(sig, async () => { app.log.info({ sig }, "to'xtatilmoqda"); await app.close(); await Promise.race([Promise.all([adminState?.writes.flush(), profiles?.writes.flush(), registry?.writes.flush(), analysisWrites.flush()]), new Promise((r) => setTimeout(r, 8000))]); process.exit(0); }); // navbatdagi yozuvlar (taqiq, audit, natija) yo'qolmasin
console.log(`tiklangan o'yinlar: ${await rooms.restore()}`);
const IDLE_MS = Number(process.env.ROOM_IDLE_MINUTES ?? 30) * 60_000; // taxmin (OPEN_QUESTIONS #49)
setInterval(() => { rooms.sweep(IDLE_MS).then((n) => n && app.log.info({ n }, "tashlab ketilgan xonalar yopildi")).catch((e) => app.log.error({ err: String(e?.message ?? e) }, "sweep xatosi")); }, 60_000).unref();
const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
console.log(`POYGA server :${port}`);
