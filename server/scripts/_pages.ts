import { existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import { autoProfiles, passGate } from "./_seed";
import { buildApp } from "../src/app";
// Sahifa suratlari (qayta dizayn ko'rigi): bosh, profil, reyting, do'kon, paketlar, klublar. `OUT=papka WEB=http://localhost:8081`.
const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/pages"; process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] }); autoProfiles(x, b);
for (const [tag, w, h] of [["m", 390, 844], ["d", 1440, 900]] as [string, number, number][]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("tajriba24-dev-user", u); localStorage.setItem("tajriba24-tours-off", "1"); }, "pg" + tag);
  const p = await c.newPage(); await p.goto(WEB); await passGate(p); await p.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 20000 });
  const names = await p.getByRole("button").evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.trim().replace(/\n+/g, " | ")).filter(Boolean)); console.log(tag, JSON.stringify(names));
  await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${tag}-home.png` });
  for (const [label, file] of [["Profil", "profile"], ["Reyting", "board"], ["Do'kon", "shop"], ["Paketlar", "packs"], ["Klublar", "clubs"], ["Qoidalar", "rules"]] as const) {
    const bt = p.getByRole("button", { name: new RegExp(`^${label}`) }).first(); if (!(await bt.count())) { console.log("yo'q:", label); continue; }
    await bt.click(); await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/${tag}-${file}.png` });
    const back = p.getByRole("button", { name: /Orqaga/ }).first(); if (await back.count()) await back.click(); else await p.goto(WEB); await p.waitForTimeout(500);
  }
  await c.close();
}
await b.close(); await x.app.close(); console.log("tayyor");
