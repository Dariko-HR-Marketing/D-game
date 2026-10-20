import { existsSync, mkdirSync } from "node:fs";
// «Mening kartalarim»: aktivlar (karta matni bilan), berilgan/olingan qarzlar, faol kartalar, tahlil — ixcham ko'rinish va to'liq jadval. `OUT=papka pnpm tsx scripts/portfolio-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/portfolio";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk("pa" + tag), c = await mk("pb" + tag);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  const room = x.rooms.rooms.get(code)!; const me = room.state!.players.find((p: any) => p.id === "pa" + tag)!, bob = room.state!.players.find((p: any) => p.id === "pb" + tag)!;
  // Haqiqiy karta kodlari (matn serverdan keladi)
  const buys = Object.values(room.ctx.effects).map((e: any) => e.effect).filter((e: any) => e?.kind === "buy" && e.code).slice(0, 4) as any[];
  const shares = Object.values(room.ctx.effects).map((e: any) => e.effect).find((e: any) => e?.kind === "buyShares") as any;
  for (const e of buys) me.assets.push({ kind: "buy", code: e.code, price: e.price, monthlyIncome: e.monthlyIncome ?? 100, creditPayment: e.creditPayment ?? 0, credit: e.credit ?? 0 });
  if (shares) me.assets.push({ kind: "shares", code: shares.code, price: shares.pricePerShare * 20, monthlyIncome: 0, creditPayment: 0, credit: 0, shares: 20 });
  me.assets[0].pledged = "bank"; me.qar = true; me.twoDice = 2; me.bankLoans.push({ amount: 3000, left: 24 }); me.bankDebt += 3000;
  bob.handDebts.push({ id: 91, to: me.id, amount: 400, months: 3 }); me.handDebts.push({ id: 92, to: bob.id, amount: 150, months: 2 });
  (x.rooms as any).emit(room); await a.waitForTimeout(900);
  const ids = a.getByTestId("portfolio");
  // «Blank» sahifasi (telefon): kartalar ixcham ko'rinishda
  if (tag === "tel") { await a.getByRole("button", { name: "Blank" }).click(); await a.waitForTimeout(400); }
  await ids.scrollIntoViewIfNeeded(); const txt = await ids.innerText();
  check(txt.includes("Mening kartalarim") && buys.length > 0 && txt.includes(`${me.assets.length} ta`), `${tag} ixcham ro'yxat: ${me.assets.length} ta aktiv`);
  check(txt.includes("Garovda") && txt.includes("Qarov kartasi") && txt.includes("Xayriya"), `${tag} garov, qarov va xayriya belgilari`);
  check(txt.includes("Men bergan qarzlar") && txt.includes("Men olgan qarzlar") && txt.includes("Bank krediti"), `${tag} berilgan/olingan qarz va bank belgilari`);
  await ids.screenshot({ path: `${OUT}/${tag}-1-ixcham.png` });
  await a.getByRole("button", { name: "Batafsil va tahlil" }).click(); const det = a.getByTestId("portfolio-detail"); await det.waitFor();
  const dt = await det.innerText();
  check(dt.includes("Aktivlar va kartalar") && dt.includes("Tahlil") && dt.includes("Eng daromadli"), `${tag} to'liq ko'rinish: jadval va tahlil`);
  check(dt.includes("Bobur") || dt.includes("Sinov"), `${tag} qarz berilgan/olingan o'yinchi ismi ko'rinadi`);
  if (tag === "kmp") check((await det.getByRole("table").count()) === 1 && (await det.getByRole("row").count()) >= me.assets.length + 1, `${tag} jadval: sarlavha + ${me.assets.length} qator`);
  await a.screenshot({ path: `${OUT}/${tag}-2-batafsil.png` });
  await a.addScriptTag({ content: AXE }); const ax = await a.evaluate(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } }).then((r) => r.violations.map((v) => v.id + "(" + v.nodes.length + ")"))`) as string[]; check(ax.length === 0, `${tag} axe: buzilish yo'q ${ax.join(", ")}`);
  await a.keyboard.press("Escape"); await a.waitForTimeout(300); check((await a.getByTestId("portfolio-detail").count()) === 0, `${tag} Esc bilan yopiladi`);
  await a.getByTestId("portfolio-open").click(); await a.getByTestId("portfolio-detail").waitFor(); await a.getByTestId("portfolio-close").click(); await a.waitForTimeout(300);
  check((await a.getByTestId("portfolio-detail").count()) === 0, `${tag} sarlavhadagi tugma bilan ochiladi va «✕» bilan yopiladi`);
  const ov = await a.evaluate(() => document.documentElement.scrollHeight - window.innerHeight); check(ov <= 1, `${tag} sahifa aylanmaydi (${ov})`);
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `PORTFOLIO: ${failed} ta xato` : "PORTFOLIO: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
