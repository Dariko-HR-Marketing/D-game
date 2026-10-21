import { existsSync, mkdirSync } from "node:fs";
// Lahzalar: farzand, ishdan bo'shash, xarid, deka ochilishi, kutilmagan hodisa, katta aylanaga chiqish — banner + ovoz so'rovi + tushuntirish. `OUT=papka pnpm tsx scripts/moment-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/moments";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: process.env.MOTION ? "no-preference" : "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); (window as any).__sfxPlayed = []; }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk("ma" + tag), c = await mk("mb" + tag);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  const room = x.rooms.rooms.get(code)!; const me = room.state!.players.find((p: any) => p.id === "ma" + tag)!; const emit = async () => { (x.rooms as any).emit(room); await a.waitForTimeout(700); };
  const sfx = async () => (await a.evaluate(() => (window as any).__sfxPlayed)) as string[];
  const seen = async (kind: string) => (await a.getByTestId(`moment-${kind}`).count()) > 0;
  me.cash = 10_000; await emit(); // boshlang'ich: lahza yo'q
  check(!(await seen("unlock")), `${tag} boshlang'ich holat: lahza chiqmadi`);
  me.children = 1; await emit(); check(await seen("child"), `${tag} farzand tug'ildi: banner`); check((await sfx()).includes("child"), `${tag} farzand tug'ildi: ovoz`);
  check((await a.getByTestId("moment-child").innerText()).includes("xarajat"), `${tag} farzand: tushuntirish (xarajat oshadi)`);
  await a.screenshot({ path: `${OUT}/${tag}-1-child.png` });
  me.noSalary = 3; await emit(); check(await seen("jobLoss"), `${tag} ishdan bo'shadingiz: banner`); check((await sfx()).includes("jobloss"), `${tag} ishdan bo'shash: ovoz`);
  const buyCard = Object.values(room.ctx.effects).map((e: any) => e.effect).find((e: any) => e?.kind === "buy" && e.code) as any;
  me.assets.push({ kind: "buy", code: buyCard.code, price: buyCard.price, monthlyIncome: buyCard.monthlyIncome ?? 100, creditPayment: 0, credit: 0 }); me.cash -= 1; await emit();
  check(await seen("buy"), `${tag} xarid: banner`); check((await sfx()).includes("buy"), `${tag} xarid: ovoz`);
  me.cash = 30_000; await emit(); check(await seen("unlock"), `${tag} deka tanlovi ochildi: banner`); check((await a.getByTestId("moment-unlock").innerText()).includes("kichik yoki katta"), `${tag} deka ochilishi: tushuntirish`); check((await sfx()).includes("unlock"), `${tag} deka ochilishi: ovoz`);
  await a.screenshot({ path: `${OUT}/${tag}-2-unlock.png` });
  room.state!.lastCard = { playerId: me.id, cardId: "hod-2", n: (room.state!.lastCard?.n ?? 0) + 1 } as any; await emit();
  check(await seen("unexpected"), `${tag} kutilmagan hodisa: banner`); check((await a.getByTestId("moment-unexpected").innerText()).includes("KUTILMAGAN HODISA!"), `${tag} sarlavha «KUTILMAGAN HODISA!»`); check((await sfx()).includes("unexpected"), `${tag} kutilmagan hodisa: ovoz`);
  await a.screenshot({ path: `${OUT}/${tag}-3-unexpected.png` });
  await a.addScriptTag({ content: AXE }); const ax = await a.evaluate(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } }).then((r) => r.violations.map((v) => v.id + "(" + v.nodes.length + ")"))`) as string[]; check(ax.length === 0, `${tag} axe (lahzalar ko'rinib turganda): buzilish yo'q ${ax.join(", ")}`);
  Object.assign(me, { circle: "big", lockedFlow: 25_400, assets: [], pos: 34 }); await emit();
  check(await seen("exit"), `${tag} katta aylanaga chiqish: banner`); const et = await a.getByTestId("moment-exit").innerText(); check(et.includes("topshirildi") || et.includes("25 400"), `${tag} chiqish: bizneslar va pul oqimi tushuntiriladi`); check((await sfx()).includes("levelup"), `${tag} chiqish: ovoz`);
  await a.screenshot({ path: `${OUT}/${tag}-4-exit.png` });
  await a.getByTestId("moments").waitFor({ state: "detached", timeout: 20000 }).catch(() => {}); /* sekin CI'da 8 soniya yetmasligi mumkin: yo'qolishini kutamiz */ check((await a.getByTestId("moments").count()) === 0, `${tag} lahzalar o'zi yo'qoladi`);
  const ov = await a.evaluate(() => document.documentElement.scrollHeight - window.innerHeight); check(ov <= 1, `${tag} sahifa aylanmaydi (${ov})`);
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `MOMENTS: ${failed} ta xato` : "MOMENTS: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
