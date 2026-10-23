import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
// O'yin tugagach har bir o'yinchi uchun to'liq tahlil hisoboti: bo'limlar, grafik, taqqoslash, CSV, a11y (axe) va sig'ish (4 o'lcham).
// `OUT=papka pnpm tsx scripts/report-check.ts` (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles, slowTimers } from "./_seed";
import { currentPlayer, effectOf, slotBlocked } from "@poyga/rules";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/report";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; let step = -1; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const SEC = ["Yakuniy ko'rsatkichlar", "Dinamika (oyma-oy)", "Maqsad sari yo'l", "Qarorlaringiz", "Investitsiyalar", "Xarajatlar va xavflar", "Xulosa va tavsiyalar", "Muhim lahzalar", "Boshqa o'yinchilar bilan taqqoslash"];
for (const [tag, w, h] of [["tel", 390, 844], ["yot", 844, 390], ["pln", 768, 1024], ["kmp", 1440, 900]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce", acceptDownloads: true }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); p.on("pageerror", (e) => { console.log("PAGEERROR", String(e.message).slice(0, 300), "@", step); }); p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 300)); }); await p.goto(WEB); return p; };
  const ida = "ra" + tag, idc = "rb" + tag; const a = await mk(ida), c = await mk(idc);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  const room = x.rooms.rooms.get(code)!; slowTimers(x, room);
  // Haqiqiy o'yin: yetarlicha navbat (aktivlar, xarajatlar, qarorlar) — keyin o'yin tugaydi
  for (let i = 0; i < Number(process.env.TURNS ?? 160) && !room.state!.winner; i++) {
    await a.waitForTimeout(Number(process.env.PACE ?? 120)); /* mijoz har holatni chizib ulgursin (haqiqiy o'yinda botlar sekin) */ step = i; const cur = currentPlayer(room.state!).id, p = room.state!.players.find((q: any) => q.id === cur)!;
    if (room.state!.pending) { const e: any = effectOf(room.ctx, room.state!.pending.cardId, room.state!.pending).effect; const need = e.kind === "buy" ? (e.down ?? e.price) : 0; const acc = (e.kind === "buy" && p.cash > need + 300 && (e.monthlyIncome ?? 0) > 0 && !slotBlocked(e, p)) || e.kind === "gain"; await x.rooms.act(code, cur, { type: "decide", accept: acc, useBank: true, playerId: cur } as any, room.seq).catch(() => {}); }
    else await x.rooms.act(code, cur, { type: "roll", playerId: cur } as any, room.seq).catch(() => {});
  }
  room.state!.winner = ida; (x.rooms as any).finish(room); (x.rooms as any).emit(room);
  await a.waitForSelector("text=O'yin natijasi", { timeout: 15000 }).catch(async (e) => { await a.screenshot({ path: `${OUT}/${tag}-debug.png` }); console.log("DEBUG", room.state!.winner, room.endedAt, room.state!.players.map((q: any) => q.circle).join(), (await a.locator("body").innerText()).slice(0, 300).replace(/\n/g, " | ")); throw e; }); await a.getByTestId("report").waitFor({ timeout: 15000 }); await a.waitForTimeout(800);
  check(await a.getByTestId("report").count() === 1, `${tag} hisobot ko'rinadi`);
  for (const t of SEC) check(await a.getByRole("heading", { name: t }).count() > 0 || await a.getByText(t, { exact: true }).count() > 0, `${tag} bo'lim: «${t}»`);
  const name = ((await x.profiles.get(ida))?.name ?? "") as string; check(name !== "" && (await a.getByTestId("report").innerText()).includes(name), `${tag} hisobot o'yinchi ismi bilan («${name}»)`);
  check(await a.locator('[data-testid="report"] svg[role="img"]').count() >= 2, `${tag} grafiklar (dinamika va taqqoslash)`);
  const rows = await a.getByRole("table").last().getByRole("row").count(); check(rows === 3, `${tag} taqqoslash jadvali: sarlavha + 2 o'yinchi (${rows})`);
  const txt = await a.getByTestId("report").innerText(); check(/\d \d{3}/.test(txt) || /\d/.test(txt), `${tag} raqamlar ko'rinadi`);
  check(!/\{[a-z]+\}/i.test(txt), `${tag} matnda to'ldirilmagan {parametr} yo'q`);
  await a.getByRole("button", { name: "Jadval ko'rinishi" }).first().click(); await a.waitForTimeout(200); check(await a.getByRole("table").first().isVisible(), `${tag} grafikning jadval ko'rinishi (ekran o'qigichlar uchun)`);
  const ov = await a.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check(ov <= 1, `${tag} gorizontal aylanish yo'q (${ov})`);
  await a.screenshot({ path: `${OUT}/${tag}-1-top.png` });
  await a.setViewportSize({ width: w, height: 5200 }); await a.waitForTimeout(400); await a.screenshot({ path: `${OUT}/${tag}-2-full.png` }); await a.setViewportSize({ width: w, height: h }); await a.waitForTimeout(200);
  // CSV yuklab olish
  const [dl] = await Promise.all([a.waitForEvent("download", { timeout: 8000 }).catch(() => null), a.getByRole("button", { name: "Hisobotni yuklab olish (CSV)" }).click()]);
  check(!!dl && /^poyga-hisobot-.*\.csv$/.test(dl.suggestedFilename()), `${tag} CSV yuklab olish: ${dl?.suggestedFilename() ?? "yo'q"}`);
  // Axe
  await a.addScriptTag({ content: AXE }); const ax = await a.evaluate(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } }).then((r) => r.violations.map((v) => v.id + "(" + v.nodes.length + ") " + v.nodes.slice(0, 2).map((n) => n.target.join(">")).join(";")))`) as string[]; check(ax.length === 0, `${tag} axe: buzilish yo'q ${ax.join(" | ")}`);
  // Ikkinchi o'yinchi ham o'z hisobotini oladi
  await c.waitForSelector("text=O'yin natijasi", { timeout: 15000 }).catch(() => {}); await c.getByTestId("report").waitFor({ timeout: 15000 }).catch(() => {});
  const cn = ((await x.profiles.get(idc))?.name ?? "") as string; check(cn !== "" && (await c.getByTestId("report").innerText().catch(() => "")).includes(cn), `${tag} ikkinchi o'yinchi o'z hisobotini ko'radi («${cn}»)`);
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `REPORT: ${failed} ta xato` : "REPORT: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
