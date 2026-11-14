import { existsSync, mkdirSync } from "node:fs";
// Garov auksioni (halol moliya): brauzerda ikki o'yinchi. Egasi (a) lombardi muddati o'tgan; b — takliflovchi.
// Tekshiriladi: egasiga taklif, so'ng ochiq auksion, taklif va yetakchi, muddat soati, o'yin to'xtashi, yopilgach ortiqcha summa egasiga qaytishi; telefon/yotiq/kompyuterda sig'ish.
// `OUT=papka WEB=http://localhost:8081 pnpm tsx scripts/auction-check.ts`
import { chromium } from "playwright-core";
import { RULES, startAuction, takeLombard, tickLoans } from "@tajriba24/rules";
import { buildApp } from "../src/app";
import { autoProfiles, slowTimers } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/auction";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844], ["yot", 844, 390]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("tajriba24-dev-user", u); localStorage.setItem("tajriba24-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const ida = "aa" + tag, idb = "ab" + tag, idc = "ac" + tag, three = true; /* majburiy auksion uchun kamida 2 ta taklif qiluvchi kerak */ const a = await mk(ida), c = await mk(idb), d = three ? await mk(idc) : null;
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  if (three) x.rooms.rooms.get(code)!.seats = 3; // uchinchi o'yinchi uchun joy
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  if (d) { await d.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await d.getByRole("textbox").fill(code); await d.getByRole("button", { name: "Kirish", exact: true }).click(); await d.waitForSelector("text=Xona egasi"); }
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); if (d) { await d.waitForSelector("text=Orzuingizni tanlang"); await d.getByRole("button", { name: "Tanlash" }).first().click(); } await a.waitForSelector("text=Naqd");
  const room = x.rooms.rooms.get(code)!; slowTimers(x, room);
  // Holat: a — lombardi muddati o'tgan (garov 20 000 lik biznes), b da pul bor
  const s: any = room.state!; s.halalFin = true;
  for (const p of s.players) { p.circle = "small"; p.cash = 100_000; p.assets = []; p.bankLoans = []; p.lombards = []; p.owe = 0; }
  const pa = s.players.find((p: any) => p.id === ida), pb = s.players.find((p: any) => p.id === idb);
  pa.assets = [{ kind: "small_business", code: "KB", price: 20_000, monthlyIncome: 500, creditPayment: 0, credit: 0 }];
  pa.cash = 0; Object.assign(pa, takeLombard(pa, 0).player); pa.cash = 0; for (let i = 0; i < RULES.lombardTermMonths; i++) Object.assign(pa, tickLoans(pa)); pa.cash = 50_000;
  startAuction(s); room.armKey = null; (x.rooms as any).arm(room); (x.rooms as any).emit(room);
  await a.waitForSelector("[data-testid=auction]", { timeout: 8000 }); await c.waitForSelector("[data-testid=auction]", { timeout: 8000 });
  // 1) egasi bosqichi
  check((await a.getByRole("button", { name: /Qarzni to'lab, mulkni saqlab qolish/ }).count()) === 1, `${tag}: egasiga «qarzni to'lab saqlab qolish» tugmasi chiqdi`);
  check((await c.getByTestId("auction-wait").count()) === 1, `${tag}: boshqalarga «egasi to'lashi mumkin, kuting» yozuvi chiqdi`);
  check((await a.getByTestId("auction-start").innerText()).replace(/\s/g, "").includes("20000"), `${tag}: boshlang'ich narx = mulkning o'z narxi (20 000)`);
  check(/\d+ soniya/.test(await a.getByTestId("auction-timer").innerText()), `${tag}: muddat soati ko'rinadi`);
  await a.screenshot({ path: `${OUT}/${tag}-egasi.png` });
  // 2) egasi rad etadi → ochiq auksion
  await a.getByRole("button", { name: /To'lamayman, auksionga qo'yilsin/ }).click(); await c.getByTestId("auction-input").waitFor({ timeout: 8000 });
  check((await c.getByTestId("auction-input").inputValue()) === "20000", `${tag}: taklif maydoni eng kam taklif bilan to'ldirilgan`);
  check((await a.getByTestId("auction-owner-wait").count()) === 1, `${tag}: egasiga «mulkingiz auksionda» yozuvi`);
  check(room.state!.turn === s.turn, `${tag}: auksion paytida navbat o'tmadi`);
  // 3) taklif
  await c.getByTestId("auction-input").fill("22000"); await c.getByRole("button", { name: /^Taklif qilish/ }).click();
  if (d) { // uchinchi o'yinchi bor: raqib turganda auksion ochiq qoladi
    await a.waitForFunction(() => (document.querySelector("[data-testid=auction-best]")?.textContent ?? "").replace(/\s/g, "").includes("22000"), null, { timeout: 8000 });
    await c.getByTestId("auction-leader").waitFor({ timeout: 8000 });
    await d.waitForFunction(() => (document.querySelector("[data-testid=auction-input]") as HTMLInputElement | null)?.value === "22100", null, { timeout: 8000 }).catch(() => {});
    check((await c.getByTestId("auction-leader").count()) === 1, `${tag}: takliflovchiga «siz eng yuqori taklif egasisiz»`);
    check((await d.getByTestId("auction-input").inputValue()) === "22100", `${tag}: raqibga eng kam taklif = yetakchi + qadam (22 100)`);
    await d.screenshot({ path: `${OUT}/${tag}-raqib.png` });
    for (const [n, pg] of [["a", a], ["b", c], ["c", d]] as const) { const ov = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check(ov <= 1, `${tag}/${n}: gorizontal aylanish yo'q (${ov})`); }
    await d.getByRole("button", { name: /^O'tkazaman/ }).click(); // raqib o'tkazdi → auksion yopiladi
  }
  // 4) yopilish: g'olib mulkni oladi, ortiqcha summa egasiga qaytadi
  const before = pa.cash;
  await a.waitForFunction(() => !document.querySelector("[data-testid=auction]"), null, { timeout: 8000 }); await c.waitForFunction(() => !document.querySelector("[data-testid=auction]"), null, { timeout: 8000 });
  const fa: any = room.state!.players.find((p: any) => p.id === ida), fb: any = room.state!.players.find((p: any) => p.id === idb);
  check(fb.assets.length === 1 && fb.cash === 100_000 - 22_000, `${tag}: g'olib mulkni oldi va 22 000 to'ladi`);
  check(fa.assets.length === 0 && fa.lombards.length === 0 && fa.cash === before + 12_000, `${tag}: ortiqcha 12 000 (22 000 − qarz 10 000) egasiga qaytdi, lombard yopildi`);
  await a.screenshot({ path: `${OUT}/${tag}-tugadi.png` });
  void pb; await a.context().close(); await c.context().close(); if (d) await d.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `AUKSION: ${failed} ta xato` : "AUKSION: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
