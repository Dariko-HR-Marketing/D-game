import { existsSync, mkdirSync } from "node:fs";
// O'yin vaqti paneli: yil va oylar alohida ko'rinadi (jami bilan), tor va keng maketda siqilmaydi; hisob varag'ida kataklar yillar.
// `OUT=papka WEB=http://localhost:8081 pnpm tsx scripts/time-check.ts`
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/timecheck";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["tel", 390, 844], ["plan", 820, 1180], ["kmp", 1440, 900]] as [string, number, number][]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, "tm" + tag);
  const a = await c.newPage(); await a.goto(WEB);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  const code = [...x.rooms.rooms.keys()].pop()!, room = x.rooms.rooms.get(code)!;
  for (const [months, want] of [[9, /9\s*oy/], [1821, /151\s*yil.*9\s*oy/s]] as [number, RegExp][]) {
    room.state!.players.find((p: any) => p.id === "tm" + tag)!.monthsPlayed = months; (x.rooms as any).emit(room); await a.waitForTimeout(900);
    const bar = a.getByTestId("timebar").first(); const txt = (await bar.innerText()).replace(/\s+/g, " ");
    check(want.test(txt), `${tag}: ${months} oy → «${txt}»`);
    if (months >= 12) check(new RegExp(`jami: ${months} oy`).test(txt), `${tag}: jami oylar ham ko'rinadi`);
    const bb = await bar.boundingBox(); const label = await bar.getByText("O'yin vaqti").first().boundingBox();
    check(!!bb && !!label && label.height < 24 && bb.width >= 200, `${tag}: sarlavha bitta qatorda, panel siqilmagan (${Math.round(bb?.width ?? 0)}×${Math.round(bb?.height ?? 0)})`);
    const ov = await a.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check(ov <= 1, `${tag}: gorizontal aylanish yo'q (${ov})`);
  }
  await a.screenshot({ path: `${OUT}/${tag}-vaqt.png` });
  await c.close();
}
await b.close(); await x.app.close(); console.log(failed ? `VAQT: ${failed} ta xato` : "VAQT: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
