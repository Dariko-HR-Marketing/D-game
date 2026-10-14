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
let store: MemoryStore | PgStore, registry: ContentRegistry | undefined, adminState: AdminState | undefined, profiles: ProfileService | undefined, analysis: AnalysisService | undefined;
if (url) {
  const pg = PgStore.connect(url); await pg.migrate(); store = pg;
  const persist = new PgPersist(new Pool({ connectionString: url }));
  registry = await ContentRegistry.restore(persist);
  adminState = await AdminState.restore(persist);
  profiles = await ProfileService.restore(persist);
  analysis = await AnalysisService.restore(store, registry, new WriteQueue(), persist);
} else { console.warn("DATABASE_URL yo'q: xotira saqlagichi (faqat ishlab chiqish uchun)"); store = new MemoryStore(); }
const { app, rooms } = buildApp({ store, registry, adminState, profiles, analysis });
console.log(`tiklangan o'yinlar: ${await rooms.restore()}`);
const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
console.log(`POYGA server :${port}`);
