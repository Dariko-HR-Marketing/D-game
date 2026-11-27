import { existsSync } from "node:fs";
// Kirish ekrani rasmlari (haqiqiy rejim): `OUT=papka pnpm tsx scripts/screens-login.ts`
import { chromium } from "playwright-core";
import { passGate, axeSource } from "./_seed";
import { mkdirSync } from "node:fs";
import { buildApp } from "../src/app";
import { OtpService, type SmsSender } from "../src/auth";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const AXE = axeSource();
let total = 0;
const scan = async (p: any, name: string) => { await p.addScriptTag({ content: AXE }); const r = await p.evaluate(async () => (window as any).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } })); total += r.violations.length; console.log(name.padEnd(18), r.violations.length ? r.violations.map((v: any) => `${v.id}(${v.nodes.length}) ${v.nodes[0].html.slice(0, 80)} ${(v.nodes[0].any?.[0]?.message ?? "").slice(0, 160)}`).join(" | ") : "OK"); };

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/shots";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
let last = ""; const sms: SmsSender = { async send(_p, t) { last = /(\d{6})/.exec(t)![1]; } };
const x = buildApp({ authSecret: "s".repeat(40), otp: new OtpService({ secret: "s".repeat(40), sms }) }); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
for (const [tag, w, h] of [["n", 390, 844], ["d", 1440, 900]] as [string, number, number][]) {
  { // ommaviy bosh sahifa: ko'rinadi, "O'yinni boshlash" kirish ekraniga olib boradi, gorizontal aylanish yo'q, axe
    const c0 = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); const lp = await c0.newPage(); await lp.goto(WEB);
    await lp.getByRole("button", { name: "O'yinni boshlash" }).first().waitFor({ timeout: 15000 }); await lp.screenshot({ path: `${OUT}/${tag}-landing.png`, fullPage: true }); await scan(lp, `bosh sahifa ${tag}`);
    { const sh = await lp.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight })); if (sh.sh > sh.ih + 1) { total++; console.log(`SIG'MAYDI bosh sahifa ${tag}: ${sh.sh} > ${sh.ih} (bitta ekran bo'lishi shart)`); } }
    { const ov = await lp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (ov > 1) { total++; console.log(`GORIZONTAL AYLANISH bosh sahifa ${tag}: ${ov}`); } }
    await lp.getByRole("button", { name: "O'yinni boshlash" }).first().click(); await lp.getByLabel("Telefon yoki Email").waitFor({ timeout: 8000 }); await c0.close();
  }
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await ctx.addInitScript(() => { localStorage.setItem("tajriba24-tours-off", "1"); localStorage.setItem("tajriba24-tutorial-done", "1"); }); const p = await ctx.newPage(); await p.goto(WEB + "/?kirish=1");
  await p.getByLabel("Telefon yoki Email").waitFor({ timeout: 15000 }); await p.screenshot({ path: `${OUT}/${tag}-login-1.png` }); await scan(p, `kirish ${tag}`);
  { const m = await p.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight })); if (m.sh > m.ih + 1) { total++; console.log(`SIG'MAYDI kirish ${tag}: ${m.sh} > ${m.ih}`); } }
  // Google tugmasi (hali ulanmagan: aniq xabar) va ro'yxatdan o'tish tabi
  await p.getByRole("button", { name: "Google hisobi orqali kirish" }).click(); await p.getByText("Google orqali kirish tez orada").waitFor(); await p.screenshot({ path: `${OUT}/${tag}-login-google.png` }); await scan(p, `google ${tag}`);
  await p.getByRole("tab", { name: "Ro'yxatdan o'tish" }).click(); await p.getByLabel("Ismingiz").waitFor(); await p.screenshot({ path: `${OUT}/${tag}-login-register.png` }); await scan(p, `ro'yxat ${tag}`);
  await p.getByRole("tab", { name: "Kirish", exact: true }).click(); await p.getByLabel("Telefon yoki Email").waitFor();
  await p.getByLabel("Telefon yoki Email").fill(tag === "n" ? "90 123 45 67" : "91 765 43 21"); await p.getByRole("button", { name: "Tizimga kirish" }).click();
  await p.getByLabel("SMS kodi (6 raqam)").waitFor(); await p.getByLabel("SMS kodi (6 raqam)").fill("000000"); await p.getByText("Kod noto'g'ri").waitFor({ timeout: 8000 }); await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/${tag}-login-2-error.png` }); await scan(p, `kod xato ${tag}`);
  await p.getByLabel("SMS kodi (6 raqam)").fill(last); /* 6 raqam yozilishi bilan o'zi tasdiqlanadi */ await p.getByTestId("gate-name").waitFor({ timeout: 10000 }); await p.screenshot({ path: `${OUT}/${tag}-login-gate.png` }); await scan(p, `profil ${tag}`); await passGate(p); await p.getByRole("button", { name: "Yangi o'yin" }).waitFor();
  await p.screenshot({ path: `${OUT}/${tag}-login-3-home.png` });
}
{ // ro'yxatdan o'tish: ism, raqam, yil, rozilik → kod → to'g'ridan-to'g'ri bosh sahifa (profil sahifasi chiqmaydi)
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" }); await ctx.addInitScript(() => { localStorage.setItem("tajriba24-tours-off", "1"); localStorage.setItem("tajriba24-tutorial-done", "1"); }); const p = await ctx.newPage(); await p.goto(WEB + "/?kirish=1");
  await p.getByRole("tab", { name: "Ro'yxatdan o'tish" }).click(); await p.getByLabel("Ismingiz").fill("Madina"); await p.getByLabel("Telefon yoki Email").fill("93 456 78 90"); await p.getByLabel("Tug'ilgan yil").fill("1999");
  const cta = p.getByRole("button", { name: "Ro'yxatdan o'tish" }).last(); if (!(await cta.isDisabled())) { total++; console.log("XATO: rozilik bermasdan tugma faol"); }
  await p.getByRole("checkbox", { name: /Ommaviy oferta/ }).click(); await cta.click();
  await p.getByLabel("SMS kodi (6 raqam)").waitFor(); await p.getByLabel("SMS kodi (6 raqam)").fill(last);
  const home = p.getByRole("button", { name: /^Yangi o'yin/ }); const gate = p.getByTestId("gate-name");
  await Promise.race([home.waitFor({ timeout: 15000 }).catch(() => {}), gate.waitFor({ timeout: 15000 }).catch(() => {})]);
  if (await gate.count()) { total++; console.log("XATO: ro'yxatdan o'tgach profil sahifasi chiqdi"); } else console.log("ro'yxat oqimi   OK (qo'shimcha sahifasiz)");
  await ctx.close();
}
await b.close(); await x.app.close(); console.log(total === 0 ? "AXE: buzilish yo'q" : `AXE: ${total} ta buzilish`); process.exit(total === 0 ? 0 : 1);
