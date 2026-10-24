import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
// «Faol ta'sirlar» ixcham yig'iladigan bo'lim (soni, yangi belgisi, ochilganda ro'yxat) va portfelda har bir kichik biznes o'z kartasi nomi bilan (karta ID si).
// `OUT=papka WEB=http://localhost:8081 pnpm tsx scripts/mods-check.ts`
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/mods";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const first = (t: string) => (t.split(/(?<=[.!?])\s/)[0] ?? t).trim();
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk("ma" + tag), c = await mk("mb" + tag);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  const room = x.rooms.rooms.get(code)!; const me = room.state!.players.find((p: any) => p.id === "ma" + tag)!; const emit = async () => { (x.rooms as any).emit(room); await a.waitForTimeout(700); };
  if (tag === "tel") { await a.getByRole("button", { name: "Blank" }).click(); await a.waitForTimeout(400); }
  // 1) Faol ta'sirlar: 8 ta, yopiq
  const mods: any[] = [{ id: 1, t: "income", sel: { any: [{ sector: "Energiya" }] }, mode: "pct", value: 10, months: null }, { id: 2, t: "salary", pct: 15, months: 4 }, { id: 3, t: "expense", pct: -10, months: 2 }, { id: 4, t: "monthly", amount: 300, months: 6 }, { id: 5, t: "credit", pct: -10, months: 3 }, { id: 6, t: "salary", pct: -10, months: 5 }, { id: 7, t: "expense", pct: 20, months: 7 }, { id: 8, t: "salary", pct: 20, months: 1, wait: true }];
  me.mods = mods.slice(0, 8); await emit();
  const panel = a.getByTestId("mods"); await panel.waitFor({ timeout: 8000 });
  const head = panel.getByRole("button").first(); const lab = (await head.getAttribute("aria-label")) ?? "";
  check(/Faol ta'sirlar: 8/.test(lab) && /8 yangi/.test(lab), `${tag}: sarlavha soni va «yangi» belgisi («${lab}»)`);
  check(await panel.getByRole("listitem").count() === 0, `${tag}: yopiq holatda ro'yxat ko'rinmaydi`);
  const box = await panel.boundingBox(); check(!!box && box.height <= 80, `${tag}: yopiq bo'lim ixcham (balandlik ${Math.round(box?.height ?? 0)} px)`);
  const live = await panel.locator('[role="status"]').innerText(); check(/8 ta yangi faol ta'sir/.test(live), `${tag}: ekran o'qigichga xabar («${live}»)`);
  check(!!box && box.height >= 44 - 1, `${tag}: bosish maydoni kamida 44 px`);
  await panel.screenshot({ path: `${OUT}/${tag}-1-yopiq.png` });
  // 2) Ochish
  await head.click(); await a.waitForTimeout(300);
  const items = await panel.getByRole("listitem").count(); check(items === 8, `${tag}: ochilganda 8 qator (${items})`);
  check((await head.getAttribute("aria-label"))!.indexOf("yangi") < 0, `${tag}: ochilgach «yangi» belgisi o'chadi`);
  await panel.screenshot({ path: `${OUT}/${tag}-2-ochiq.png` });
  // 3) Yopish va yana bitta yangi ta'sir
  await head.click(); await a.waitForTimeout(200); check(await panel.getByRole("listitem").count() === 0, `${tag}: yopilganda ro'yxat yo'q`);
  me.mods = [...me.mods, { id: 9, t: "salary", pct: 25, months: 3 }]; await emit();
  const lab2 = (await head.getAttribute("aria-label")) ?? ""; const live2 = await panel.locator('[role="status"]').innerText();
  check(/Faol ta'sirlar: 9/.test(lab2) && /1 yangi/.test(lab2), `${tag}: yangi ta'sir kelganda soni 9 va «1 yangi» («${lab2}»)`);
  check(/Yangi faol ta'sir: Ish haqi/.test(live2), `${tag}: xabar matni («${live2}»)`);
  await panel.screenshot({ path: `${OUT}/${tag}-3-yangi.png` });
  const ov = await a.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check(ov <= 1, `${tag}: gorizontal aylanish yo'q (${ov})`);
  await a.addScriptTag({ content: AXE }); const ax = await a.evaluate(`axe.run(document.querySelector('[data-testid="mods"]'), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } }).then((r) => r.violations.map((v) => v.id + "(" + v.nodes.length + ")"))`) as string[];
  check(ax.length === 0, `${tag}: axe — buzilish yo'q ${ax.join(", ")}`);
  // 4) Portfel: ikki xil kichik biznes kartasi — har biri o'z nomi bilan
  const kb = Object.values(room.ctx.effects).filter((e: any) => e.effect.kind === "buy" && e.effect.asset === "small_business" && e.effect.code === "KB" && e.deck === "kichik").slice(0, 3) as any[];
  me.assets.push(...kb.map((e: any) => ({ kind: "small_business", code: "KB", cardId: e.id, price: e.effect.price, monthlyIncome: e.effect.monthlyIncome, creditPayment: 0, credit: 0 })));
  await emit(); const pf = a.getByTestId("portfolio"); await pf.scrollIntoViewIfNeeded(); const txt = await pf.innerText();
  const titles = kb.map((e) => first(e.text)); const shown = titles.filter((t) => txt.includes(t.slice(0, 40)));
  check(new Set(titles).size === 3 && shown.length === 3, `${tag}: portfelda 3 ta kichik biznes — har biri o'z nomi bilan (${shown.length}/3)`);
  await pf.screenshot({ path: `${OUT}/${tag}-4-portfel.png` });
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `MODS: ${failed} ta xato` : "MODS: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
