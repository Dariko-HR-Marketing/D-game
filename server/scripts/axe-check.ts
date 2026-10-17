import { existsSync } from "node:fs";
// WCAG 2.2 AA avtomatik tekshiruvi (axe-core, haqiqiy brauzerda). Telefon va planshet o'lchamida barcha asosiy ekranlar.
// Oldindan: `pnpm --filter @poyga/client export:web` va `cd client/dist && python3 -m http.server 8081`.
// Ishga tushirish: `cd server && pnpm a11y`  (CHROMIUM=/opt/pw-browsers/chromium, WEB=http://localhost:8081)
import { chromium } from "playwright-core";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { buildApp } from "../src/app";
import { currentPlayer, effectOf } from "@poyga/rules";

const WEB = process.env.WEB ?? "http://localhost:8081";
process.env.CORS_ORIGINS = WEB;
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
const onboard = async (p: any) => { const b = p.getByRole("button", { name: "O'tkazib yuborish" }); if (await b.count()) await b.click(); };
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
let total = 0;
const scan = async (p: any, name: string) => {
  await p.addScriptTag({ content: AXE });
  const r = await p.evaluate(async () => (window as any).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } }));
  total += r.violations.length;
  console.log(name.padEnd(22), r.violations.length ? r.violations.map((v: any) => `${v.id}(${v.nodes.length}) ${v.nodes[0].html.slice(0, 80)}`).join(" | ") : "OK");
};
for (const [w, h] of [[390, 844], [1024, 768], [1440, 900]] as [number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk("ua" + w), c = await mk("ub" + w); const tag = `${w}px`;
  await a.getByRole("button", { name: "Yangi o'yin" }).waitFor({ timeout: 15000 }); await scan(a, `bosh sahifa ${tag}`);
  await a.getByRole("button", { name: "Qoidalar", exact: true }).first().click(); await a.waitForSelector("text=O'yin qoidalari"); await scan(a, `qoidalar ${tag}`); await a.getByRole("button", { name: "Orqaga" }).click();
  await a.getByRole("button", { name: "Profil", exact: true }).first().click(); await a.getByLabel("Ism", { exact: true }).waitFor(); await scan(a, `profil ${tag}`); await a.getByRole("button", { name: "Orqaga" }).click();
  await a.getByRole("button", { name: "Reyting", exact: true }).first().click(); await a.waitForSelector("text=Reyting"); await scan(a, `reyting ${tag}`); await a.getByRole("button", { name: "Orqaga" }).click();
  await a.getByRole("button", { name: "Yangi o'yin" }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await scan(a, `xona ${tag}`);
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang"); await scan(a, `orzu tanlash ${tag}`);
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd"); await a.getByTestId("tour-help").click(); await a.getByRole("dialog").waitFor(); await scan(a, `yo'riqnoma ${tag}`);
  { // klaviatura: fokus oynadan chiqmaydi, Esc yopadi
    let out = 0; for (let k = 0; k < 8; k++) { await a.keyboard.press("Tab"); if (!(await a.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')))) out++; }
    await a.keyboard.press("Escape"); await a.waitForTimeout(200); const still = await a.getByRole("dialog").count();
    console.log("yo'riqnoma fokus".padEnd(22), out === 0 && still === 0 ? "OK" : `FOKUS CHIQDI(${out}) yoki Esc ishlamadi(${still})`); if (out || still) total++;
  } await onboard(a); await c.waitForSelector("text=Naqd"); await onboard(c); await scan(a, `o'yin ${tag}`);
  const room = x.rooms.rooms.get(code)!;
  for (let i = 0; i < 300 && !room.state!.pending; i++) { const me = currentPlayer(room.state!).id; await x.rooms.act(code, me, { type: "roll", playerId: me }, room.seq); }
  if (room.state!.pending) { const me = currentPlayer(room.state!).id; const pg = me === "ua" + w ? a : c; await pg.waitForTimeout(600); await scan(pg, `o'yin+karta ${tag}`); }
  room.state!.winner = room.state!.players[0].id; (x.rooms as any).finish(room); (x.rooms as any).emit(room);
  await a.waitForSelector("text=O'yin natijasi"); await a.waitForSelector("text=Kichik aylanadan chiqdi", { timeout: 15000 }); await scan(a, `natija ${tag}`);
}
console.log(total === 0 ? "\nAXE: buzilish yo'q" : `\nAXE: ${total} ta buzilish`);
await b.close(); await x.app.close(); process.exit(total === 0 ? 0 : 1);
