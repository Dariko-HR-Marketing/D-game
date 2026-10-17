// Plus/do'kon, sinf (o'quvchi + o'qituvchi) va turnir ekranlari uchun axe tekshiruvi + oddiy yurish.
// Oldindan: client web eksport va `cd client/dist && python3 -m http.server 8081`.
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";

const WEB = process.env.WEB ?? "http://localhost:8081"; process.env.CORS_ORIGINS = WEB;
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const H = (u: string) => ({ authorization: `Bearer ${u}` });
const prof = (u: string, y: number) => x.app.inject({ method: "PUT", url: "/me/profile", headers: H(u), payload: { name: "Ism" + u, color: 1, birthYear: y } });
for (const u of ["tch", "stu"]) await prof(u, 1990);
x.commerce.setConfig({ plusMonthly: 29_000, plusYearly: 290_000, items: { "pawn-emerald": 9_000 } });
const org = (x.edu.createOrg("12-maktab", Date.now() + 90 * 86_400_000, 30) as any).org; const inv = (x.edu.invite(org.id) as any).invite; x.edu.redeem("tch", inv.code);
const klass = (x.edu.createClass("tch", "7-A") as any).klass; x.edu.join("stu", klass.joinCode);
const t = (x.tournaments.upsert(null, { title: "Kuz kubogi", sponsor: "Bank X", prize: "Sovg'a", rules: "Qoidalar", format: "Yakkama-yakka", status: "open" }) as any).t;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
let total = 0;
const scan = async (p: any, name: string) => {
  await p.addScriptTag({ content: AXE });
  const r = await p.evaluate(async () => (window as any).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } }));
  total += r.violations.length; console.log(name.padEnd(26), r.violations.length ? r.violations.map((v: any) => `${v.id}(${v.nodes.length}) ${v.nodes[0].html.slice(0, 100)}`).join(" | ") : "OK");
};
const open = async (uid: string, w: number, h: number) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => localStorage.setItem("poyga-dev-user", u), uid); const p = await c.newPage(); p.on("pageerror", (e) => { console.log("PAGEERROR", e.message); total++; }); await p.goto(WEB);
  const sk = p.getByRole("button", { name: "O'tkazib yuborish" }); await p.getByRole("button", { name: "Yangi o'yin" }).waitFor({ timeout: 15000 }).catch(async () => { if (await sk.count()) await sk.click(); }); await p.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); return p; };
const back = async (p: any, name = "Orqaga") => p.getByRole("button", { name }).first().click();
for (const [w, h] of [[390, 844], [1440, 900]] as [number, number][]) {
  const tag = `${w}px`;
  x.tournaments.unregister(t.id, "stu");
  const s = await open("stu", w, h); await scan(s, `bosh sahifa ${tag}`);
  await s.getByRole("button", { name: /^Do'kon va Plus/ }).click(); await s.waitForSelector("text=POYGA Plus"); await s.waitForSelector("text=Kumush"); await scan(s, `do'kon ${tag}`);
  await s.getByRole("tab", { name: "Ramkalar" }).click(); await scan(s, `do'kon ramkalar ${tag}`); await back(s);
  await s.getByRole("button", { name: /^Sinf\./ }).click(); await s.waitForSelector("text=Sinfga qo'shilish"); await s.waitForSelector("text=O'qituvchi: Ismtch"); await scan(s, `sinf o'quvchi ${tag}`); await back(s);
  await s.getByRole("button", { name: /^Turnirlar\./ }).click(); await s.waitForSelector("text=Kuz kubogi"); await scan(s, `turnirlar ${tag}`);
  await s.getByRole("button", { name: /^Kuz kubogi/ }).click(); await s.waitForSelector("text=Ro'yxatdan o'tish"); await scan(s, `turnir ${tag}`);
  await s.getByRole("button", { name: "Ro'yxatdan o'tish" }).click(); await s.waitForSelector("text=Siz ro'yxatdasiz"); await scan(s, `turnir ro'yxatda ${tag}`);
  const q = await open("tch", w, h);
  await q.getByRole("button", { name: /^Sinf\./ }).click(); await q.waitForSelector("text=O'qituvchi paneli"); await scan(q, `o'qituvchi ${tag}`);
  await q.getByRole("button", { name: /^7-A/ }).click(); await q.waitForSelector("text=Sinf xonasi"); await scan(q, `sinf paneli ${tag}`);
  if (w > 600) continue; // xona bir marta ochiladi
  await q.getByRole("button", { name: "Sinf xonasini ochish" }).click(); await q.waitForSelector("text=O'yinchilar"); await scan(q, `sinf xonasi lobi ${tag}`);
}
console.log(total ? `JAMI MUAMMO: ${total}` : "Hammasi toza"); await b.close(); await x.app.close(); process.exit(total ? 1 : 0);
