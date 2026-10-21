import { existsSync } from "node:fs";
// Profil: XP darajasi va unvon, ball, liga + reyting; reyting jadvalida liga. `pnpm tsx scripts/progress-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081";
process.env.CORS_ORIGINS = WEB;
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const ids = ["pgme", "pgb", "pgc", "pgd"]; ids.forEach((id, i) => x.profiles.put(id, { name: ["Sardor", "Bobur", "Sara", "Dilya"][i], color: i, birthYear: 1990 }));
// «pgme» 4 ta reytingli o'yinda g'olib: reyting ko'tariladi (Kumush yoki yuqori), XP 400, ball oshadi
const now = Date.now();
for (let k = 0; k < 4; k++) x.profiles.record({ mode: "rated", room: `RG${k}`, finishedAt: now - 1000 * (10 - k), durationMs: 1, rounds: 20, winner: "pgme", contentVersion: 1,
  players: ids.map((id, i) => ({ id, bot: false, circle: i === 0 ? "big" : "small", restarts: 0, won: i === 0, place: i + 1 })) } as any);
const st = x.profiles.stats("pgme");
check(st.level === 2 && st.xp === 400 && st.xpInto === 150 && st.xpNeed === 300, `server: XP 400 → 2-daraja (150/300): level=${st.level} xp=${st.xp} ${st.xpInto}/${st.xpNeed}`);
check(st.rating !== null && st.rating > 1100 && st.league !== "bronze", `server: reyting ${st.rating}, liga ${st.league}`);
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, "pgme");
  const a = await c.newPage(); await a.goto(WEB); await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 });
  await a.getByRole("button", { name: "Profil", exact: true }).first().click(); await a.waitForSelector("text=Keyingi daraja", { timeout: 8000 }).catch(() => {});
  const t = await a.locator("body").innerText();
  check(/Daraja 2/.test(t) && t.includes("Yangi boshlovchi"), `${tag} profil: «Daraja 2» va unvon «Yangi boshlovchi»`);
  check(t.includes("150 / 300 XP"), `${tag} profil: keyingi darajagacha «150 / 300 XP»`);
  check(new RegExp(`(Kumush|Oltin|Platina|Olmos) · ${st.rating}`).test(t), `${tag} profil: liga va reyting «${st.rating}»`);
  check(/Ball/.test(t) && t.includes(String(st.points)), `${tag} profil: ball ${st.points}`);
  await a.screenshot({ path: `/tmp/progress-${tag}.png` });
  await a.getByRole("button", { name: /^Orqaga/ }).first().click().catch(() => {});
  await a.getByRole("button", { name: /^Reyting/ }).first().click(); await a.waitForSelector("text=Sardor", { timeout: 8000 }).catch(() => {});
  const lb = await a.locator("body").innerText(); check(lb.includes("Sardor") && new RegExp(`(Kumush|Oltin|Platina|Olmos) · ${st.rating}`).test(lb), `${tag} reyting jadvali: «Sardor» ligasi bilan`);
  await c.close();
}
await b.close(); await x.app.close(); console.log(failed ? `PROGRESS: ${failed} ta xato` : "PROGRESS: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
