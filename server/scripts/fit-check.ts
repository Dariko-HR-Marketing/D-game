import { existsSync, mkdirSync } from "node:fs";
// O'yin ekrani (kompyuter/planshet) bitta ko'rinishga sig'adimi: `OUT=papka pnpm tsx scripts/fit-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`). Sahifa aylanishi (scrollHeight > innerHeight) — xato.
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { currentPlayer } from "@poyga/rules";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/fit";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
const sizes: [number, number][] = [[1024, 768], [1280, 720], [1440, 900], [1593, 890], [1735, 985], [1920, 1080]];
let failed = 0;
for (const [w, h] of sizes) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const tag = `${w}x${h}`, a = await mk("fa" + tag), c = await mk("fb" + tag);
  await a.getByRole("button", { name: "Yangi o'yin" }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: "Yangi o'yin" }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click();
  await a.waitForSelector("text=Naqd"); const skip = a.getByRole("button", { name: "O'tkazib yuborish" }); if (await skip.count()) await skip.click();
  const skipC = c.getByRole("button", { name: "O'tkazib yuborish" }); if (await skipC.count()) await skipC.click();
  const room = x.rooms.rooms.get(code)!;
  const measure = async (p: any, name: string) => {
    await p.waitForTimeout(600);
    const m = await p.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight, sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    // Asosiy boshqaruvlar aylantirmasdan ko'rinishi shart: chiqish tugmasi, kubik/qaror tugmalari
    let hidden = "";
    for (const nm of [/O'yindan chiqish/, /^Kubikni tashlash|^O'tkazaman|sh\.b\. olish$|^Qabul qilaman/]) { const el = p.getByRole("button", { name: nm }).first(); if (await el.count()) { const bb = await el.boundingBox(); if (bb && bb.y + bb.height > m.ih + 1) hidden += ` [${nm} pastda]`; } }
    const ok = m.sh <= m.ih + 1 && m.sw <= m.iw + 1 && !hidden; if (!ok) failed++;
    console.log(`${tag} ${name}: sahifa ${m.sw}x${m.sh} / oyna ${m.iw}x${m.ih} ${ok ? "OK" : "SIG'MAYDI" + hidden}`);
    await p.screenshot({ path: `${OUT}/${tag}-${name}.png` });
  };
  await measure(a, "boshlanish");
  for (let i = 0; i < 400 && !room.state!.pending; i++) { const me = currentPlayer(room.state!).id; await x.rooms.act(code, me, { type: "roll", playerId: me }, room.seq); }
  if (room.state!.pending) { const me = currentPlayer(room.state!).id; await measure(me === "fa" + tag ? a : c, "karta"); }
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `FIT: ${failed} ta o'lchamda sig'madi` : "FIT: hammasi sig'adi"); process.exit(failed ? 1 : 0);
