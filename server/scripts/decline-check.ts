import { existsSync, mkdirSync } from "node:fs";
// Qarz so'rovi va sheriklik taklifini rad etish: brauzerda ikki o'yinchi; telefon/planshet/kompyuter, tik va yotiq holatda.
// Tekshiriladi: ikkala tugma ko'rinadi va ekran ichida, bosish maydoni ≥ 40 px, gorizontal aylanish yo'q, rad etilsa taklif o'chadi va so'ragan o'yinchiga xabar chiqadi.
// `OUT=papka WEB=http://localhost:8081 pnpm tsx scripts/decline-check.ts`
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles, slowTimers } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/decline";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const SIZES: [string, number, number][] = [["tel-tik", 390, 844], ["tel-yotiq", 844, 390], ["kichik-yotiq", 667, 375], ["plan-tik", 768, 1024], ["plan-yotiq", 1024, 768], ["kmp", 1440, 900]];
for (const [tag, w, h] of SIZES) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const pg = await c.newPage(); await pg.goto(WEB); return pg; };
  const ida = "da" + tag, idb = "db" + tag; const a = await mk(ida), c = await mk(idb);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click();
  const room = x.rooms.rooms.get(code)!; slowTimers(x, room);
  const s: any = room.state!; for (const p of s.players) { p.circle = "small"; p.cash = 100_000; }
  // a so'radi (beruvchi b), b ga sheriklik taklif qilindi: b ikkala so'rovni ko'radi
  s.proposals.push({ id: s.nextProposal++, kind: "loan", giver: idb, receiver: ida, amount: 500, months: 12 });
  s.proposals.push({ id: s.nextProposal++, kind: "partner", owner: ida, partner: idb, cardId: "x" });
  (x.rooms as any).emit(room);
  await c.waitForTimeout(600); if (!(await c.getByRole("button", { name: "Rad etish" }).count())) { const tab = c.getByRole("tab", { name: /Blank/ }).or(c.getByRole("button", { name: /^Blank/ })); if (await tab.count()) await tab.first().click(); }
  await c.waitForSelector("text=Rad etish", { timeout: 8000 }).catch(async (e) => { await c.screenshot({ path: `${OUT}/${tag}-yoq.png` }); throw e; });
  const decl = c.getByRole("button", { name: "Rad etish" }), acc = c.getByRole("button", { name: "Qabul qilish" });
  check((await decl.count()) === 2 && (await acc.count()) === 2, `${tag}: har bir so'rovda «Qabul qilish» va «Rad etish» bor`);
  for (const [i, bt] of [[0, decl.nth(0)], [1, decl.nth(1)], [2, acc.nth(0)], [3, acc.nth(1)]] as const) {
    await bt.scrollIntoViewIfNeeded(); const r = (await bt.boundingBox())!;
    check(r.x >= -1 && r.x + r.width <= w + 1 && r.height >= 40, `${tag}: tugma ${i} ekran ichida va ≥ 40 px (${Math.round(r.width)}×${Math.round(r.height)})`);
  }
  const ov = await c.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check(ov <= 1, `${tag}: gorizontal aylanish yo'q (${ov})`);
  await c.screenshot({ path: `${OUT}/${tag}.png` });
  await decl.nth(0).click(); await c.waitForFunction(() => document.querySelectorAll("[role=button]").length >= 0);
  await new Promise((r) => setTimeout(r, 400));
  check(!(room.state!.proposals as any[]).some((p) => p.kind === "loan"), `${tag}: qarz so'rovi rad etilgach o'chdi`);
  check(((room.state!.notices ?? []) as any[]).some((n) => n.to === ida && n.key === "loan_declined"), `${tag}: so'ragan o'yinchiga xabar yozildi`);
  await c.getByRole("button", { name: "Rad etish" }).first().click(); await new Promise((r) => setTimeout(r, 400));
  check(!(room.state!.proposals as any[]).some((p) => p.kind === "partner"), `${tag}: sheriklik taklifi rad etilgach o'chdi`);
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close();
console.log(failed ? `RAD ETISH: ${failed} ta xato` : "RAD ETISH: hammasi joyida"); process.exit(failed ? 1 : 0);
