import { existsSync } from "node:fs";
// «Davom etayotgan o'yin»: sahifa yangidan ochilganda faol xonaga bitta bosish bilan qaytiladi. `pnpm tsx scripts/resume-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081";
process.env.CORS_ORIGINS = WEB;
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, "ra" + tag);
  const a = await c.newPage(); await a.goto(WEB);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 });
  check((await a.getByTestId("home-resume").count()) === 0, `${tag} faol o'yin yo'q: «Davom etayotgan o'yin» ko'rinmaydi`);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await a.reload(); const r = a.getByTestId("home-resume"); await r.waitFor({ timeout: 15000 });
  check((await r.innerText()).includes(code), `${tag} yangilangandan keyin «Davom etayotgan o'yin» + kod ${code}`);
  await r.click(); await a.waitForSelector("text=O'yinchilar", { timeout: 10000 });
  check((await a.locator("[aria-label^='Xona kodi']").textContent())!.trim() === code, `${tag} xonaga qaytildi`);
  await c.close();
}
await b.close(); await x.app.close(); console.log(failed ? `RESUME: ${failed} ta xato` : "RESUME: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
