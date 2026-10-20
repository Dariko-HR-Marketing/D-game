import { existsSync } from "node:fs";
// Sinov: brauzerda haqiqiy o'yin — odam tugmalarni bosib (kubik, karta, bank, qoidalar) bot bilan ko'p navbat o'ynaydi.
// Konsol/sahifa xatosi yoki «qotib qolish» bo'lsa xato bilan chiqadi.  Ishlatish: `pnpm tsx scripts/e2e-play.ts` (oldindan veb eksport 8081 da).
import { chromium } from "playwright-core";
import { autoProfiles } from "./_seed";
import { buildApp } from "../src/app";

const WEB = process.env.WEB ?? "http://localhost:8081"; process.env.CORS_ORIGINS = WEB;
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
// Holat tez o'zgaradi (bot): bosish oldidan element yo'qolishi mumkin — qisqa kutish bilan urinamiz
const tryClick = async (l: any) => { try { await l.first().click({ timeout: 2500 }); return true; } catch { return false; } };
let failed = 0; const fail = (m: string) => { failed++; console.log("✗", m); };
for (const [tag, w, h] of [["telefon", 390, 844], ["kompyuter", 1440, 900]] as [string, number, number][]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, "e2e-" + tag);
  const p = await c.newPage(); const errors: string[] = [];
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console: " + m.text().slice(0, 200)); });
  await p.goto(WEB); await p.getByRole("button", { name: "Yangi o'yin" }).click(); await p.getByRole("button", { name: "O'yinni boshlash" }).click();
  await p.getByRole("button", { name: "Tanlash" }).first().click(); await p.waitForSelector("text=Naqd");
  const skip = p.getByRole("button", { name: "O'tkazib yuborish" }); if (await skip.count()) await skip.click();
  let rolls = 0, accepted = 0, skipped = 0, idle = 0;
  for (let i = 0; i < 400 && rolls < 60; i++) {
    const roll = p.getByRole("button", { name: /^Kubik(ni|larni) tashlash/ }), accept = p.getByRole("button", { name: /sh\.b\. olish$|^Qabul qilaman/ }), no = p.getByRole("button", { name: "O'tkazaman" });
    const deck = p.getByRole("button", { name: /^Kichik sarmoyalar, / }), rentA = p.getByRole("button", { name: /^A · Oylik daromadni/ });
    const pay = p.getByRole("button", { name: /^To'layman|^Pul to'layman/ });
    if (await deck.count()) { if (await tryClick(deck)) idle = 0; }
    else if (await rentA.count()) { if (await tryClick(rentA)) idle = 0; }
    else if (await accept.count()) { if ((rolls + accepted) % 3 === 0 && await accept.first().isEnabled({ timeout: 1000 }).catch(() => false)) { if (await tryClick(accept)) accepted++; } else { if (await tryClick(no)) skipped++; } idle = 0; }
    else if (await pay.count()) { // «Pul to'layman / Biznesdan voz kechaman» (kutilmagan hodisa): navbat bilan to'laymiz yoki biznesdan voz kechamiz
      const lose = p.getByRole("button", { name: /^Biznesdan voz kechaman/ }); if ((rolls + accepted) % 2 === 0 && await pay.first().isEnabled({ timeout: 1000 }).catch(() => false)) { if (await tryClick(pay)) accepted++; } else if (await tryClick(lose)) skipped++; idle = 0; }
    else if (await roll.count()) { if (await tryClick(roll)) rolls++; idle = 0; }
    else { await p.waitForTimeout(150); if (idle === 40) { await p.screenshot({ path: `/tmp/stall-${tag}.png` }); console.log(`${tag}: kutilmoqda, tugmalar:`, await p.getByRole('button').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label')).filter(Boolean).slice(0, 12))); } if (++idle > 120) { fail(`${tag}: o'yin qotib qoldi (rolls=${rolls})`); break; } }
    if (await p.getByText("O'yin natijasi").count()) break;
  }
  // ikkilamchi bo'limlar xatosiz ochilsin
  const fin = p.getByRole("button", { name: /Moliya amallari/ }); if (await fin.count()) { await fin.click(); await p.waitForTimeout(200); }
  const rules = p.getByRole("button", { name: "Qoidalar" }); if (await rules.count()) { await rules.first().click(); await p.waitForSelector("text=O'yin qoidalari"); await p.getByRole("button", { name: "Orqaga" }).click(); }
  console.log(`${tag}: kubik=${rolls} qabul=${accepted} o'tkazildi=${skipped} xatolar=${errors.length}`);
  for (const e of errors.slice(0, 5)) fail(`${tag}: ${e}`);
  if (rolls < 10) fail(`${tag}: kam navbat (${rolls})`);
  await c.close();
}
await b.close(); await x.app.close(); console.log(failed ? `E2E: ${failed} ta xato` : "E2E: muvaffaqiyatli"); process.exit(failed ? 1 : 0);
