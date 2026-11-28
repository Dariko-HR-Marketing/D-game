import { existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import { autoProfiles, joinByCode, pickDream } from "./_seed";
import { buildApp } from "../src/app";
import { currentPlayer } from "@tajriba24/rules";
// O'yin ekranlari suratlari (UX ko'rik): xona, orzu, o'yin boshi, moliya amallari, voqealar, karta. `OUT=papka`; oldindan client export:web va `cd client/dist && python3 -m http.server 8081`.
const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/game"; process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] }); autoProfiles(x, b);
const onboard = async (p: any) => { const t = p.getByRole("button", { name: "O'tkazib yuborish" }); if (await t.count()) await t.click(); };
for (const [tag, w, h] of [["m", 390, 844], ["d", 1440, 900]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("tajriba24-dev-user", u); localStorage.setItem("tajriba24-tours-off", "1"); localStorage.setItem("tajriba24-roll-modal", "off"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk("ga" + tag), c = await mk("gb" + tag); const shot = async (p: any, n: string) => { await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${tag}-${n}.png` }); };
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 20000 });
  await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("[data-testid=lobby-code]"); const code = (await a.locator("[aria-label^='Maydon kodi']").textContent())!.trim();
  await joinByCode(c, code); await c.waitForSelector("text=Maydon egasi"); await shot(a, "01-lobby");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang"); await shot(a, "02-dreams");
  await pickDream(a); await c.waitForSelector("text=Orzuingizni tanlang"); await pickDream(c); await a.waitForSelector("text=Naqd", { timeout: 60000 }); await onboard(a); await c.waitForSelector("text=Naqd", { timeout: 60000 }); await onboard(c);
  const room = x.rooms.rooms.get(code)!; await shot(a, "03-start");
  for (let i = 0; i < 6; i++) { const me = currentPlayer(room.state!).id; await x.rooms.act(code, me, { type: "roll", playerId: me }, room.seq); if (room.state!.pending) { const p = currentPlayer(room.state!).id; await x.rooms.act(code, p, { type: "decide", playerId: p, accept: false }, room.seq).catch(() => {}); } }
  await shot(a, "04-after-rolls");
  const tb = a.getByRole("button", { name: "Blank", exact: true }); if (await tb.count()) { await tb.click(); await a.waitForTimeout(500); await shot(a, "05a-blank"); const ac = a.getByRole("button", { name: /Moliya amallari/ }); if (await ac.count()) { await ac.first().click(); await a.waitForTimeout(400); await a.evaluate(() => window.scrollTo(0, 99999)); await shot(a, "05b-blank-finance"); } }
  const acts = a.getByRole("button", { name: /Moliya amallari/ }); if (await acts.count()) { await acts.first().click(); await a.waitForTimeout(400); await a.evaluate(() => window.scrollTo(0, 99999)); await shot(a, "05-finance"); }
  const pl = a.getByRole("button", { name: "O'yinchilar", exact: true }); if (await pl.count()) { await pl.click(); await shot(a, "06-players-events"); }
  await c.close(); await a.close();
}
await b.close(); await x.app.close(); console.log("tayyor:", OUT);
