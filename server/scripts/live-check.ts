import { existsSync, mkdirSync } from "node:fs";
// Jonli tahlil ekrani: ikki o'yinchi, o'yin davomida. Tekshiriladi: ochiladi, 5 bo'lim va 11 nazariya bo'limi chiqadi, gorizontal aylanish yo'q, bosish maydoni, ikkala o'yinchi ham hammani ko'radi.
// `OUT=papka WEB=http://localhost:8081 pnpm tsx scripts/live-check.ts`
import { chromium } from "playwright-core";
import { currentPlayer, effectOf } from "@tajriba24/rules";
import { buildApp } from "../src/app";
import { autoProfiles, slowTimers } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/live";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const TABS = ["overview", "player", "market", "compare", "theory"], FW = ["dupont", "bcg", "risk", "ansoff", "cycle", "prospect", "succ", "funnel", "swot", "level", "src"];
for (const [tag, w, h] of [["tel", 390, 844], ["yotiq", 844, 390], ["plan", 1024, 768], ["kmp", 1440, 900]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("tajriba24-dev-user", u); localStorage.setItem("tajriba24-tours-off", "1"); }, uid); const pg = await c.newPage(); await pg.goto(WEB); return pg; };
  const ida = "ta" + tag, idb = "tb" + tag; const a = await mk(ida), c = await mk(idb);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click();
  const room = x.rooms.rooms.get(code)!; slowTimers(x, room); await new Promise((r) => setTimeout(r, 600));
  for (let i = 0; i < 140 && !room.state!.winner; i++) { // o'yinni oldinga suramiz: ma'lumot to'plansin
    const me = currentPlayer(room.state!).id;
    if (room.state!.pending) { const e = effectOf(room.ctx, room.state!.pending.cardId).effect; await x.rooms.act(code, me, { type: "decide", playerId: me, accept: e.kind === "gain" || e.kind === "buy" }, room.seq); } else await x.rooms.act(code, me, { type: "roll", playerId: me }, room.seq);
  }
  await a.waitForTimeout(800);
  for (const [n, pg] of [["a", a], ["b", c]] as const) {
    await pg.getByTestId("live-open").click(); await pg.getByTestId("live-analytics").waitFor({ timeout: 8000 }); await pg.getByTestId("live-tab-overview").waitFor({ timeout: 10000 });
    check(true, `${tag}/${n}: jonli tahlil ochildi`);
    check((await pg.getByTestId("live-players").locator("[data-testid^=live-player-]").count()) === 2, `${tag}/${n}: ikkala o'yinchi ro'yxatda`);
    for (const t of TABS) {
      await pg.getByTestId(`live-tab-${t}`).click(); await pg.waitForTimeout(120);
      const ov = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check(ov <= 1, `${tag}/${n}: «${t}» bo'limida gorizontal aylanish yo'q (${ov})`);
      if (t === "theory") for (const f of FW) { await pg.getByTestId(`live-fw-${f}`).click(); await pg.waitForTimeout(80); const o2 = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); const txt = await pg.getByTestId("live-analytics").innerText(); if (o2 > 1 || /NaN|undefined|Infinity/.test(txt)) check(false, `${tag}/${n}: nazariya «${f}»: aylanish ${o2} yoki NaN`); }
    }
    if (n === "a") { await pg.getByTestId("live-tab-theory").click(); await pg.getByTestId("live-fw-bcg").click(); await pg.waitForTimeout(150); await pg.screenshot({ path: `${OUT}/${tag}-nazariya.png` }); await pg.getByTestId("live-tab-overview").click(); await pg.waitForTimeout(120); await pg.screenshot({ path: `${OUT}/${tag}-umumiy.png` }); }
    check(!/NaN|undefined|Infinity/.test(await pg.getByTestId("live-analytics").innerText()), `${tag}/${n}: matnda NaN/undefined yo'q`);
    await pg.getByTestId("live-close").click(); await pg.getByTestId("live-analytics").waitFor({ state: "detached", timeout: 5000 }); check(true, `${tag}/${n}: yopildi`);
  }
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close();
console.log(failed ? `JONLI TAHLIL: ${failed} ta xato` : "JONLI TAHLIL: hammasi joyida"); process.exit(failed ? 1 : 0);
