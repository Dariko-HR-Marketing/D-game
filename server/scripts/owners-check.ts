import { existsSync, mkdirSync } from "node:fs";
// Katta aylana taxtasi: sotib olingan biznes (turg'un va tavakkal) va amalga oshgan orzu katagida egasi belgisi (o'yinchi rangi va raqami) ko'rinadi.
// `OUT=papka WEB=http://localhost:8081 pnpm tsx scripts/owners-check.ts`
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles, slowTimers } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/owners";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const asset = (code: string) => ({ kind: "business", code, price: 100000, monthlyIncome: 10000, creditPayment: 0, credit: 0 });
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844], ["yot", 844, 390]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const ida = "oa" + tag, idb = "ob" + tag; const a = await mk(ida), c = await mk(idb);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  const room = x.rooms.rooms.get(code)!; slowTimers(x, room);
  const big = (x.rooms as any).ctxOf?.(room)?.bigBoard ?? room.ctx.bigBoard; const T = big.filter((c: any) => c.t === "T").map((c: any) => c.i), V = big.filter((c: any) => c.t === "V").map((c: any) => c.i), O = big.find((c: any) => c.t === "O").i;
  const pa: any = room.state!.players.find((p: any) => p.id === ida), pb: any = room.state!.players.find((p: any) => p.id === idb);
  Object.assign(pa, { circle: "big", pos: 3, cash: 500000, assets: [asset(`big-${T[0]}`), asset(`big-${V[0]}`), asset("KB")] });
  const O2 = big.filter((c: any) => c.t === "O")[1].i;
  Object.assign(pb, { circle: "big", pos: 9, cash: 500000, assets: [asset(`big-${T[1]}`)], dreamAt: O }); Object.assign(pa, { dreamVisits: [O2] });
  (x.rooms as any).emit(room); await a.waitForTimeout(1200);
  const biz = await a.getByTestId("owner-biz").count(), dream = await a.getByTestId("owner-dream").count();
  check(biz === 3, `${tag}: 3 ta biznes belgisi (turg'un 2 + tavakkal 1; kichik aylana aktivi «KB» belgilanmaydi) — ${biz}`);
  check(dream === 1, `${tag}: orzusi amalga oshgan katakda yulduzli belgi — ${dream}`);
  const visit = await a.getByTestId("owner-visit").count(); check(visit === 1, `${tag}: orzu katagiga yetgan (shart bajarilmagan) o'yinchida bo'sh yulduz — ${visit}`);
  // katakni bosganda tushuntirish
  await a.getByTestId(`tile-${T[0]}`).dispatchEvent("click"); const sheet = a.getByTestId("cell-sheet"); await sheet.waitFor({ timeout: 4000 }); const st = await sheet.innerText();
  check(st.includes(big[T[0]].name) && st.includes("Narxi") && st.includes("Oylik daromad") && st.includes("Egasi"), `${tag}: turg'un biznes katagi bosilsa nom, narx, daromad va egasi chiqadi`);
  await a.screenshot({ path: `${OUT}/${tag}-katak.png` }); await a.keyboard.press("Escape"); await a.waitForTimeout(300); check(await sheet.count() === 0, `${tag}: Esc bilan yopiladi`);
  await a.getByTestId(`tile-${O2}`).dispatchEvent("click"); const st2 = await a.getByTestId("cell-sheet").innerText(); check(st2.includes("Orzu katagi") && st2.includes("100 000") && st2.includes("shart bajarilmadi"), `${tag}: orzu katagi — g'alaba sharti va «yetib keldi» yozuvi`);
  await a.getByTestId("cell-close").click(); await a.waitForTimeout(200);
  const label = (await a.locator("[role=group][aria-label^='Taxta']").first().getAttribute("aria-label")) ?? "";
  check(label.includes("Egalari") && label.includes(`${T[0]}-katak`) && label.includes("orzu amalga oshdi") && label.includes("orzu katagiga yetdi"), `${tag}: taxta tavsifida egalari yozilgan (ekran o'qish dasturi uchun)`);
  const ov = await a.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check(ov <= 1, `${tag}: gorizontal aylanish yo'q (${ov})`);
  await a.screenshot({ path: `${OUT}/${tag}-egalar.png` });
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `EGALAR: ${failed} ta xato` : "EGALAR: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
