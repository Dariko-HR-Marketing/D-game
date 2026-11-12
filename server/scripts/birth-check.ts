import { existsSync, mkdirSync } from "node:fs";
// Farzand tug'ildi: ikki o'yinchining ekranida bayram (konfeti, sharlar) va «kimga tug'ildi» yozuvi; o'yinni to'smaydi, o'zi yo'qoladi.
// `OUT=papka WEB=http://localhost:8081 pnpm tsx scripts/birth-check.ts`
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles, slowTimers } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/birth";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["tel", 390, 844], ["yotiq", 844, 390], ["kmp", 1440, 900]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h } }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const pg = await c.newPage(); await pg.goto(WEB); return pg; };
  const ida = "ba" + tag, idb = "bb" + tag; const a = await mk(ida), c = await mk(idb);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click();
  const room = x.rooms.rooms.get(code)!; slowTimers(x, room); await new Promise((r) => setTimeout(r, 800));
  const s: any = room.state!; s.proposals.push({ id: s.nextProposal++, kind: "suyunchi", parent: ida, given: [] }); (x.rooms as any).emit(room);
  await a.getByTestId("birth-layer").waitFor({ timeout: 8000 }); await c.getByTestId("birth-layer").waitFor({ timeout: 8000 });
  check(true, `${tag}: ikkala o'yinchida bayram chiqdi`);
  await new Promise((r) => setTimeout(r, 1300)); await c.screenshot({ path: `${OUT}/${tag}-raqib.png` }); await a.screenshot({ path: `${OUT}/${tag}-ota.png` });
  check(/Siz farzandli bo'ldingiz/.test(await a.getByTestId("birth-card").innerText()), `${tag}: ota-onaga «Siz farzandli bo'ldingiz!»`);
  check(/farzandli bo'ldi/.test(await c.getByTestId("birth-card").innerText()), `${tag}: boshqalarga «… farzandli bo'ldi» katta yozuvda`);
  for (const [n, pg] of [["ota", a], ["raqib", c]] as const) { const ov = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check(ov <= 1, `${tag}/${n}: gorizontal aylanish yo'q (${ov})`); }
  await a.getByTestId("birth-layer").waitFor({ state: "detached", timeout: 9000 }); check(true, `${tag}: bayram o'zi yo'qoldi, o'yin davom etadi`);
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close();
console.log(failed ? `TUG'ILISH: ${failed} ta xato` : "TUG'ILISH: hammasi joyida"); process.exit(failed ? 1 : 0);
