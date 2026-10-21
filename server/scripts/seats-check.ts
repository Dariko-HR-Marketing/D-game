import { existsSync } from "node:fs";
// Xona egasi oldindan o'yinchilar sonini tanlaydi (2–6); odam yetmasa boshlanganda qolgan o'rinlarni botlar egallaydi. `pnpm tsx scripts/seats-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const OUT = process.env.OUT ?? "/tmp/seats"; import { mkdirSync } from "node:fs"; mkdirSync(OUT, { recursive: true });
const WEB = process.env.WEB ?? "http://localhost:8081";
process.env.CORS_ORIGINS = WEB;
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  for (const seats of [2, 4, 6, 8]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, `sx${tag}${seats}`);
    const a = await c.newPage(); await a.goto(WEB); await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 });
    if (tag === "tel") { const o = a.getByTestId("home-opts"); if (await o.count()) await o.click(); }
    await a.getByTestId(`seats-${seats}`).click(); check((await a.getByTestId(`seats-${seats}`).getAttribute("aria-checked")) === "true", `${tag}/${seats} tanlov belgilandi`);
    await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
    const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim(); const room = x.rooms.rooms.get(code)!;
    check(room.seats === seats, `${tag}/${seats} serverda o'rinlar soni ${room.seats}`);
    const lt = await a.locator("body").innerText(); check(lt.includes(`1/${seats}`), `${tag}/${seats} zalda «1/${seats}» ko'rinadi`);
    check(seats === 2 || (await a.getByTestId("lobby-seats").count()) === 1, `${tag}/${seats} «${seats} kishilik» eslatma ko'rinadi`);
    await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang"); await a.waitForTimeout(500);
    check(room.state!.players.length === seats && room.members.filter((m) => m.bot).length === seats - 1, `${tag}/${seats} boshlanganda ${seats - 1} ta bot o'rin oldi`);
    if (seats === 8) { // 8 kishilik stol: orzular tanlanadi, o'yin ekrani sig'adi, 8 ta fishka va 8 ta o'yinchi
      await a.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd", { timeout: 20000 });
      await a.waitForTimeout(3000); const wide8 = await a.evaluate(() => { const W = window.innerWidth; return [document.documentElement.scrollWidth, ...[...document.querySelectorAll("*")].filter((e) => e.getBoundingClientRect().right > W + 1 && getComputedStyle(e).position !== "fixed").slice(0, 4).map((e) => `${e.tagName}.${String((e as any).className).slice(0, 40)}@${Math.round(e.getBoundingClientRect().right)}`)]; });
      check((wide8[0] as number) <= (w) + 1, `${tag}/8 o'yin ekrani gorizontal aylanmaydi ${JSON.stringify(wide8)}`);
      check(room.state!.players.length === 8 && new Set(room.state!.players.map((p: any) => p.dreamIdx)).size === 8, `${tag}/8 sakkala o'yinchining orzulari har xil`);
      await a.screenshot({ path: `${OUT}/${tag}-8.png` });
    }
    await c.close();
  }
}
await b.close(); await x.app.close(); console.log(failed ? `SEATS: ${failed} ta xato` : "SEATS: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
