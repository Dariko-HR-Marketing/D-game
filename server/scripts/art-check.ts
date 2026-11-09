import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
// Yaratilgan karta rasmlari: katalog kartasi ochilganda rasm yuklanadi (`file` → /cards/<id>.webp), matnli zaxira o'rniga rasm ko'rinadi; rasm 960 px.
// Rasmlar `content/art/generated` dan Playwright orqali beriladi (statik server shart emas). `OUT=papka WEB=http://localhost:8081 pnpm tsx scripts/art-check.ts`
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles, slowTimers } from "./_seed";
import { currentPlayer } from "@poyga/rules";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/art"; const ART = new URL("../../content/art/generated/", import.meta.url).pathname;
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const CARDS = [["Y001", "kichik biznes"], ["Y013", "katta biznes"], ["Y031", "bozor"], ["Y037", "xarajat"], ["Y049", "katta aylana xarajati"], ["Y061", "kutilmagan hodisa"], ["Y241", "viktorina"]] as const;
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, "ar" + tag);
  const asked: string[] = []; await c.route("**/cards/*", async (r) => { const f = decodeURIComponent(new URL(r.request().url()).pathname.split("/").pop()!); asked.push(f); const p = join(ART, f); existsSync(p) ? await r.fulfill({ path: p, contentType: "image/webp" }) : await r.fulfill({ status: 404, body: "" }); });
  const a = await c.newPage(); await a.goto(WEB);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  const code = [...x.rooms.rooms.keys()].pop()!, room = x.rooms.rooms.get(code)!; slowTimers(x, room);
  for (const [id, what] of CARDS) {
    const eff = room.ctx.effects[`cat-${id}`]; check(!!eff && eff.file === `${id}.webp`, `${tag} ${what} (${id}): kartada rasm fayli ${eff?.file}`);
    const me = currentPlayer(room.state!).id; room.state!.pending = { type: "card", playerId: me, cardId: `cat-${id}`, deck: eff.deck } as any; (x.rooms as any).emit(room); await a.waitForTimeout(1500);
    const img = a.locator(`img[src*="${id}.webp"]`).first(); const ok = await img.count() ? await img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth === 960) : false;
    check(ok, `${tag} ${what} (${id}): rasm yuklandi (960 px) — matnli zaxira emas`);
    if (id === "Y013" || id === "Y241") await a.screenshot({ path: `${OUT}/${tag}-${id}.png` });
    room.state!.pending = null as any; (x.rooms as any).emit(room); await a.waitForTimeout(300);
  }
  const ov = await a.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check(ov <= 1, `${tag} gorizontal aylanish yo'q (${ov})`);
  await c.close();
}
await b.close(); await x.app.close(); console.log(failed ? `RASM: ${failed} ta xato` : "RASM: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
