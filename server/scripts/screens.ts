import { existsSync } from "node:fs";
// Ekran rasmlari (UX/UI ko'rik uchun): `OUT=papka pnpm screens` (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { buildApp } from "../src/app";
import { currentPlayer } from "@poyga/rules";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/shots";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const onboard = async (p: any) => { const b = p.getByRole("button", { name: "O'tkazib yuborish" }); if (await b.count()) await b.click(); };
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
const sizes: [string, number, number][] = [["n", 390, 844], ["t", 1024, 768], ["d", 1440, 900]];
for (const [tag, w, h] of sizes.filter(([t]) => !process.env.ONLY || process.env.ONLY.includes(t))) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk("ua" + tag), c = await mk("ub" + tag);
  const shot = async (p: any, n: string) => { await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/${tag}-${n}.png`, fullPage: false }); };
  await a.getByRole("button", { name: "Yangi o'yin" }).waitFor({ timeout: 15000 }); await shot(a, "01-home");
  await a.getByRole("button", { name: "Qoidalar", exact: true }).first().click(); await a.waitForSelector("text=O'yin qoidalari"); await shot(a, "02-rules"); await a.getByRole("button", { name: "Orqaga" }).click();
  await a.getByRole("button", { name: "Profil", exact: true }).first().click(); await a.getByLabel("Ism", { exact: true }).waitFor(); await shot(a, "03-profile"); await a.getByRole("button", { name: "Orqaga" }).click();
  await a.getByRole("button", { name: "Reyting", exact: true }).first().click(); await a.waitForSelector("text=Reyting"); await shot(a, "04-board"); await a.getByRole("button", { name: "Orqaga" }).click();
  await a.getByRole("button", { name: "Yangi o'yin" }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await shot(a, "05-lobby");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang"); await shot(a, "06-dreams");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd"); await shot(a, "06b-onboarding"); await onboard(a); await c.waitForSelector("text=Naqd"); await onboard(c);
  const room = x.rooms.rooms.get(code)!;
  await shot(a, "07-game-start");
  const tabBlank = a.getByRole("button", { name: "Blank", exact: true }); if (await tabBlank.count()) { await tabBlank.click(); await a.waitForTimeout(300); await shot(a, "07c-blank"); }
  const acts = a.getByRole("button", { name: /Moliya amallari/ }); await acts.click(); await a.waitForTimeout(300); await a.evaluate(() => window.scrollTo(0, 99999)); await shot(a, "07b-actions");
  const tabP = a.getByRole("button", { name: "O'yinchilar", exact: true }); if (await tabP.count()) { await tabP.click(); await a.waitForTimeout(300); await shot(a, "07d-players"); }
  const tabF = a.getByRole("button", { name: "Maydon", exact: true }); if (await tabF.count()) await tabF.click();
  for (let i = 0; i < 400 && !room.state!.pending; i++) { const me = currentPlayer(room.state!).id; await x.rooms.act(code, me, { type: "roll", playerId: me }, room.seq); }
  if (room.state!.pending) { const me = currentPlayer(room.state!).id; const pg = me === "ua" + tag ? a : c; await pg.waitForTimeout(700); await shot(pg, "08-card"); }
  room.state!.winner = room.state!.players[0].id; (x.rooms as any).finish(room); (x.rooms as any).emit(room);
  await a.waitForSelector("text=O'yin natijasi"); await a.waitForTimeout(1500); await shot(a, "09-result");
}
await b.close(); await x.app.close(); console.log("tayyor:", OUT);
