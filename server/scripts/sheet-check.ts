import { existsSync, mkdirSync } from "node:fs";
// «Hisob varag'i»: qog'oz blankning raqamli ko'rinishi (kichik va katta aylana), qiymatlar serverdan. `OUT=papka pnpm tsx scripts/sheet-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/sheet";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk("sa" + tag), c = await mk("sb" + tag);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  const room = x.rooms.rooms.get(code)!; const me = room.state!.players.find((p: any) => p.id === "sa" + tag)!;
  const buys = Object.values(room.ctx.effects).map((e: any) => e.effect).filter((e: any) => e?.kind === "buy" && e.code).slice(0, 4) as any[];
  for (const e of buys) me.assets.push({ kind: "buy", code: e.code, price: e.price, monthlyIncome: e.monthlyIncome ?? 100, creditPayment: e.creditPayment ?? 0, credit: e.credit ?? 0 });
  me.bankLoans.push({ amount: 3000, left: 24 }); me.bankDebt += 3000; me.children = 1; me.monthsPlayed = 9; me.qar = true;
  (x.rooms as any).emit(room); await a.waitForTimeout(900);
  await a.getByTestId("sheet-open").click(); const det = a.getByTestId("sheet-detail"); await det.waitFor();
  const t = await det.innerText();
  check(t.includes("POYGA | KICHIK AYLANA") && t.includes("DAROMADLAR") && t.includes("AKSIYALAR") && t.includes("XARAJATLAR"), `${tag} kichik aylana varag'i bo'limlari`);
  check(t.includes("O'yinchi nomi:") && t.includes("Sizning orzuyingiz:") && !/Sizning orzuyingiz: —/.test(t), `${tag} orzu o'yin davomida ko'rinadi`);
  check(["TAPOiCh", "KCH", "ZA", "UTK", "GZ"].every((k) => t.includes(k)), `${tag} aksiya kodlari`);
  check((await a.getByTestId("sheet-months").innerText()) === "9 oy" && t.includes("Har bir katak — 1 yil"), `${tag} bosib o'tilgan vaqt: 9 oy, kataklar yillar`);
  check(t.includes("Ikkinchi aylanaga o'tish uchun 1 000 000 sh.b. naqd pul yig'ish va har oylik pul oqimi 25 000 sh.b.ga ega bo'lish kerak."), `${tag} o'tish sharti matni blankdagidek`);
  await a.screenshot({ path: `${OUT}/${tag}-1-kichik.png` });
  await a.getByTestId("sheet-tab-big").click(); await a.waitForTimeout(300); const t2 = await det.innerText();
  check(t2.includes("POYGA | KATTA AYLANA") && t2.includes("BIZNESLARNING HISOBI") && t2.includes("100 000 sh.b.ga yetishi lozim"), `${tag} katta aylana varag'i`);
  check((await a.getByTestId("sheet-locked").innerText()) === "—", `${tag} kichik aylanada o'tgandagi pul oqimi «—»`);
  await a.screenshot({ path: `${OUT}/${tag}-2-katta.png` });
  await a.addScriptTag({ content: AXE }); const ax = await a.evaluate(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } }).then((r) => r.violations.map((v) => v.id + "(" + v.nodes.length + ")"))`) as string[]; check(ax.length === 0, `${tag} axe: buzilish yo'q ${ax.join(", ")}`);
  await a.keyboard.press("Escape"); await a.waitForTimeout(300); check((await a.getByTestId("sheet-detail").count()) === 0, `${tag} Esc bilan yopiladi`);
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `SHEET: ${failed} ta xato` : "SHEET: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
