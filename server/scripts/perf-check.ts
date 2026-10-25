import { existsSync } from "node:fs";
// Unumdorlik: taymer yurib turganda (o'yinchi navbati) sahifa bekorga qayta chizilmasligi. CPU 4× sekinlashtirilgan (o'rta telefon);
// 8 soniyalik bo'sh turishda skript+maket+uslub vaqti (ms/soniya) va chiziqlar soni o'lchanadi.  `MAX_MS_PER_SEC` dan oshsa xato.
// `WEB=http://localhost:8081 pnpm tsx scripts/perf-check.ts`
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", LIMIT: Record<string, number> = { telefon: Number(process.env.MAX_PHONE ?? 70), kompyuter: Number(process.env.MAX_DESKTOP ?? 110) }; // eski (har soniyada butun oyna qayta chizilgan) holat: 87 / 138
process.env.CORS_ORIGINS = WEB; process.env.ROLLMODAL = "1";
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0;
for (const [tag, w, h] of [["telefon", 390, 844], ["kompyuter", 1440, 900]] as [string, number, number][]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, "pf-" + tag);
  const p = await c.newPage(); const cdp = await c.newCDPSession(p); await cdp.send("Performance.enable"); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await p.goto(WEB); await p.getByRole("button", { name: "Yangi o'yin" }).click(); await p.getByRole("button", { name: "O'yinni boshlash" }).click();
  await p.getByRole("button", { name: "Tanlash" }).first().click(); await p.waitForSelector("text=Naqd");
  const skip = p.getByRole("button", { name: "O'tkazib yuborish" }); if (await skip.count()) await skip.click();
  await p.waitForSelector("[role=timer]", { timeout: 15000 }); await p.waitForTimeout(1500); // taymer yurmoqda: navbat odamniki (kubik oynasi ochiq)
  const m = async () => Object.fromEntries(((await cdp.send("Performance.getMetrics")) as any).metrics.map((e: any) => [e.name, e.value])) as Record<string, number>;
  let best = Infinity, line = ""; // ikki oyna, eng yaxshisi: boshqa jarayon xalaqit bergan bo'lsa adashmaslik uchun
  for (let k = 0; k < 2; k++) {
    const a = await m(); await p.waitForTimeout(6000); const z = await m();
    const ms = (n: string) => Math.round(((z[n] ?? 0) - (a[n] ?? 0)) * 1000 / 6), busy = ms("ScriptDuration") + ms("LayoutDuration") + ms("RecalcStyleDuration");
    if (busy < best) { best = busy; line = `skript ${ms("ScriptDuration")} + maket ${ms("LayoutDuration")} + uslub ${ms("RecalcStyleDuration")} = ${busy} ms/soniya · DOM ${await p.evaluate(() => document.getElementsByTagName("*").length)}`; }
  }
  console.log(`${tag}: ${line} (chegara ${LIMIT[tag]})`);
  if (best > LIMIT[tag]) { failed++; console.log(`XATO ${tag}: bo'sh turganda ${best} ms/soniya > ${LIMIT[tag]}`); }
  await c.close();
}
await b.close(); await x.app.close(); console.log(failed ? `PERF: ${failed} ta xato` : "PERF: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
