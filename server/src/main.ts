import { buildApp } from "./app";
import { PgStore } from "./pgstore";
import { MemoryStore } from "./store";

const url = process.env.DATABASE_URL;
const store = url ? PgStore.connect(url) : new MemoryStore();
if (store instanceof PgStore) await store.migrate();
else console.warn("DATABASE_URL yo'q: xotira saqlagichi (faqat ishlab chiqish uchun)");
const { app } = buildApp({ store });
const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
console.log(`POYGA server :${port}`);
