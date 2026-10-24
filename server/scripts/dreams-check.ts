import { existsSync, mkdirSync } from "node:fs";
// Orzu tanlash ekrani: 40 ta orzu jadvaldan (nom, narx, yo'nalish, ufq), gorizontal aylanish yo'q, tanlash ishlaydi, band orzu boshqaga yopiladi.
// `OUT=papka WEB=http://localhost:8081 pnpm tsx scripts/dreams-check.ts`
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/dreams";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["tel", 390, 844], ["kmp", 1440, 900]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk("da" + tag), c = await mk("db" + tag);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  const n = await a.getByRole("button", { name: "Tanlash" }).count(); check(n === 40, `${tag}: 40 ta orzu tanlash tugmasi bilan (${n})`);
  const txt = await a.locator("body").innerText();
  check(/O‘z uyingiz va hovli/.test(txt) && /Hozirgi orzu/.test(txt) && /Istiqbol orzusi/.test(txt), `${tag}: orzu nomi, yo'nalish va ufq ko'rinadi`);
  check(!/Golf klubi|yetimxona|Ronaldo|Robbins/i.test(txt), `${tag}: eski orzular yo'q`);
  check(/900 000/.test(txt), `${tag}: narx to'liq yoziladi («900 000»)`);
  const ov = await a.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check(ov <= 1, `${tag}: gorizontal aylanish yo'q (${ov})`);
  await a.screenshot({ path: `${OUT}/${tag}-orzu.png` });
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForTimeout(500);
  await c.waitForTimeout(500); const taken = await c.getByText(/^band · /).count(); check(taken === 1, `${tag}: tanlangan orzu ikkinchi o'yinchida «band» (${taken})`);
  await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd", { timeout: 15000 });
  const room = x.rooms.rooms.get(code)!; const idx = room.state!.players.map((p: any) => p.dreamIdx); check(idx[0] !== null && idx[1] !== null && idx[0] !== idx[1], `${tag}: serverda ikki xil orzu (${idx.join(",")})`);
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `DREAMS: ${failed} ta xato` : "DREAMS: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
