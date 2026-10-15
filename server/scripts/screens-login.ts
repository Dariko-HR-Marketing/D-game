// Kirish ekrani rasmlari (haqiqiy rejim): `OUT=papka pnpm tsx scripts/screens-login.ts`
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { buildApp } from "../src/app";
import { OtpService, type SmsSender } from "../src/auth";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
let total = 0;
const scan = async (p: any, name: string) => { await p.addScriptTag({ content: AXE }); const r = await p.evaluate(async () => (window as any).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } })); total += r.violations.length; console.log(name.padEnd(18), r.violations.length ? r.violations.map((v: any) => `${v.id}(${v.nodes.length}) ${v.nodes[0].html.slice(0, 80)}`).join(" | ") : "OK"); };

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/shots";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
let last = ""; const sms: SmsSender = { async send(_p, t) { last = /(\d{6})/.exec(t)![1]; } };
const x = buildApp({ authSecret: "s".repeat(40), otp: new OtpService({ secret: "s".repeat(40), sms }) }); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
for (const [tag, w, h] of [["n", 390, 844], ["d", 1440, 900]] as [string, number, number][]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); await p.goto(WEB);
  await p.getByLabel("Telefon raqami").waitFor({ timeout: 15000 }); await p.screenshot({ path: `${OUT}/${tag}-login-1.png` }); await scan(p, `kirish ${tag}`);
  await p.getByLabel("Telefon raqami").fill(tag === "n" ? "90 123 45 67" : "91 765 43 21"); await p.getByRole("button", { name: "Kod yuborish" }).click();
  await p.getByLabel("SMS kodi (6 raqam)").waitFor(); await p.getByLabel("SMS kodi (6 raqam)").fill("000000"); await p.getByRole("button", { name: "Tasdiqlash" }).click(); await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/${tag}-login-2-error.png` }); await scan(p, `kod xato ${tag}`);
  await p.getByLabel("SMS kodi (6 raqam)").fill(last); await p.getByRole("button", { name: "Tasdiqlash" }).click(); await p.getByRole("button", { name: "Xona yaratish" }).waitFor();
  await p.screenshot({ path: `${OUT}/${tag}-login-3-home.png` });
}
await b.close(); await x.app.close(); console.log(total === 0 ? "AXE: buzilish yo'q" : `AXE: ${total} ta buzilish`); process.exit(total === 0 ? 0 : 1);
