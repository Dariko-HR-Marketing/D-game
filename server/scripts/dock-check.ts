import { existsSync, mkdirSync } from "node:fs";
// Kompyuter (3 ustun): taxta ostidagi «dock»: Mening kartalarim va dekani tanlash. `OUT=papka pnpm tsx scripts/dock-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/dock";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["kmp", 1440, 900], ["fhd", 1920, 1080], ["kmp2", 1366, 768]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk("da" + tag), c = await mk("db" + tag);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  const room = x.rooms.rooms.get(code)!; const me = room.state!.players.find((p: any) => p.id === "da" + tag)!;
  const buys = Object.values(room.ctx.effects).map((e: any) => e.effect).filter((e: any) => e?.kind === "buy" && e.code).slice(0, 5) as any[];
  for (const e of buys) me.assets.push({ kind: "buy", code: e.code, price: e.price, monthlyIncome: e.monthlyIncome ?? 100, creditPayment: e.creditPayment ?? 0, credit: e.credit ?? 0 });
  (x.rooms as any).emit(room); await a.waitForTimeout(900);
  const tri = w >= 1366;
  const dock = a.getByTestId("dock"); check((await dock.count()) === (tri ? 1 : 0), `${tag} dock: ${tri ? "bor" : "yo'q"}`);
  if (tri) {
    check((await dock.getByTestId("portfolio").count()) === 1, `${tag} «Mening kartalarim» taxta ostida`);
    check((await a.locator("[data-testid=finance] >> xpath=ancestor::*[contains(@class,'')][1]").count()) >= 0, `${tag} moliya chap ustunda`);
    await a.screenshot({ path: `${OUT}/${tag}-1-dock.png` });
    // Dekani tanlash: dock'da (qisiq chap ustunda emas)
    const cur = room.state!.players[room.state!.turn % room.state!.players.length].id;
    if (cur === me.id) {
      room.state!.pending = { type: "card", playerId: me.id, cardId: "choose-opp", deck: "choice" } as any; (x.rooms as any).emit(room); await a.waitForTimeout(1200);
      check((await dock.getByText("Qaysi dekadan karta olasiz?").count()) === 1, `${tag} dekani tanlash taxta ostida`);
      check((await a.getByTestId("finance").count()) === 1, `${tag} dekani tanlashda moliya chap ustunda qoladi`);
      await a.screenshot({ path: `${OUT}/${tag}-2-deck.png` });
    }
  }
  const ov = await a.evaluate(() => document.documentElement.scrollHeight - window.innerHeight); check(ov <= 1, `${tag} sahifa aylanmaydi (${ov})`);
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `DOCK: ${failed} ta xato` : "DOCK: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
