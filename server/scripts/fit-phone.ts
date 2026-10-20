import { existsSync, mkdirSync } from "node:fs";
// Telefon: kirish (telefon/kod) va Bosh sahifa bitta ko'rinishga sig'adimi: `OUT=papka pnpm tsx scripts/fit-phone.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`). Sahifa aylanishi (scrollHeight > innerHeight) — xato.
import { chromium } from "playwright-core";
import { passGate } from "./_seed";
import { buildApp } from "../src/app";
import { OtpService, type SmsSender } from "../src/auth";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/fit-phone";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
let last = ""; const sms: SmsSender = { async send(_p, t) { last = /(\d{6})/.exec(t)![1]; } };
const x = buildApp({ authSecret: "s".repeat(40), otp: new OtpService({ secret: "s".repeat(40), sms, ttlMs: 600_000 }) }); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
const sizes: [number, number][] = [[320, 568], [360, 640], [375, 667], [390, 844], [412, 915], [430, 932], [768, 1024], [1440, 900]];
let failed = 0, n = 0;
for (const [w, h] of sizes) {
  if (n > 0) await new Promise((r) => setTimeout(r, 9000)); // server IP bo'yicha ~10 so'rov/daqiqa (AUTH.md)
  const tag = `${w}x${h}`; const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await ctx.addInitScript(() => localStorage.setItem("poyga-tours-off", "1")); const p = await ctx.newPage(); await p.goto(WEB);
  const measure = async (name: string) => {
    await p.waitForTimeout(400); const m = await p.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight, sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    // ichki aylantirish (ScrollView) ham hisobga olinadi: aylanadigan konteyner kontenti oynadan baland bo'lmasin
    const inner = await p.evaluate(() => { let max = 0; document.querySelectorAll("*").forEach((e) => { const s = getComputedStyle(e); if ((s.overflowY === "auto" || s.overflowY === "scroll") && e.scrollHeight > e.clientHeight + 1) max = Math.max(max, e.scrollHeight - e.clientHeight); }); return max; });
    const ok = m.sh <= m.ih + 1 && m.sw <= m.iw + 1 && inner <= 1; if (!ok) failed++;
    console.log(`${tag} ${name}: sahifa ${m.sw}x${m.sh} / oyna ${m.iw}x${m.ih}, ichki aylanish ${inner}px ${ok ? "OK" : "SIG'MAYDI"}`); await p.screenshot({ path: `${OUT}/${tag}-${name}.png` });
  };
  await p.getByLabel("Telefon raqami").waitFor({ timeout: 15000 }); await measure("kirish-telefon");
  await p.getByLabel("Telefon raqami").fill(`90 ${String(100 + (n++ % 800)).padStart(3, "0")} 45 67`); await p.getByRole("button", { name: "Kod yuborish" }).click();
  await p.getByLabel("SMS kodi (6 raqam)").waitFor(); await measure("kirish-kod");
  await p.getByLabel("SMS kodi (6 raqam)").fill(last); await p.getByRole("button", { name: "Tasdiqlash" }).click(); await p.getByTestId("gate-name").waitFor({ timeout: 15000 }); await measure("ism-kiritish"); await passGate(p); await p.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 });
  await measure("bosh-sahifa"); await ctx.close();
}
await b.close(); await x.app.close(); console.log(failed ? `FIT-PHONE: ${failed} ta holatda sig'madi` : "FIT-PHONE: hammasi sig'adi"); process.exit(failed ? 1 : 0);
