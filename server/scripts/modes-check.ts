import { existsSync } from "node:fs";
// O'yin turlari: tanlov (standart / tez / reytingli / o'quv), o'rinlar chegarasi, chiqish shartlari yozuvi, qolgan vaqt va vaqt tugashi. `pnpm tsx scripts/modes-check.ts`
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
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  const open = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); await p.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); if (tag === "tel") { const o = p.getByTestId("home-opts"); if (await o.count()) await o.click(); } return p; };
  // 1) Tanlov va o'rinlar chegarasi
  const a = await open("mda" + tag);
  await a.getByTestId("mode-quick").click(); check(await a.getByTestId("seats-7").count() === 0 && await a.getByTestId("seats-6").count() === 1, `${tag} tez o'yin: o'rinlar 2–6`);
  await a.getByTestId("mode-rated").click(); check(await a.getByTestId("seats-3").count() === 0 && await a.getByTestId("seats-4").count() === 1, `${tag} reytingli: o'rinlar 4–6`);
  await a.getByTestId("mode-tutorial").click(); check(await a.getByTestId("home-seats").count() === 0, `${tag} o'quv: o'rinlar tanlovi yo'q (1 odam + 2 bot)`);
  await a.getByTestId("mode-standard").click(); check(await a.getByTestId("seats-8").count() === 1, `${tag} standart: 8 gacha`);
  // 2) Tez o'yin: xona va chiqish shartlari
  await a.getByTestId("mode-quick").click(); await a.getByTestId("seats-2").click(); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim(); const room = x.rooms.rooms.get(code)!;
  check(room.mode === "quick" && room.seats === 2, `${tag} serverda rejim «tez», o'rin 2`); check(await a.getByTestId("lobby-mode").count() === 1, `${tag} zalda rejim ko'rinadi`);
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang"); await a.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  if (tag === "tel") await a.getByRole("button", { name: /^Blank/ }).click();
  const txt = await a.locator("body").innerText(); check(txt.includes("Naqd ≥ 250 000") && txt.includes("Passiv daromad ≥ 15 000"), `${tag} tez o'yin: chiqish shartlari «250 000 / 15 000»`);
  check(room.state!.mode === "quick", `${tag} o'yin holatida rejim «tez»`);
  check(await a.getByTestId("coach").count() === 0, `${tag} tez o'yinda yo'l-yo'riq yo'q`);
  await a.context().close();
  // 2b) Yangi o'yinchi (o'yini yo'q): bosh sahifada «O'quv o'yini» taklifi
  const nw = await open("mdn" + tag); await nw.getByTestId("home-tutorial").waitFor({ timeout: 6000 }).catch(() => {}); check(await nw.getByTestId("home-tutorial").count() === 1, `${tag} yangi o'yinchi: bosh sahifada O'quv o'yini taklifi`);
  await nw.getByTestId("home-tutorial").click(); await nw.waitForSelector("text=O'yinchilar"); const nc = (await nw.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  check(x.rooms.rooms.get(nc)?.mode === "tutorial", `${tag} taklif bosilsa o'quv xonasi ochiladi`); await nw.context().close();
  // 3) O'quv o'yini: 1 odam + 2 bot, qolgan vaqt va vaqt tugashi
  const t = await open("mdt" + tag); await t.getByTestId("mode-tutorial").click(); await t.getByRole("button", { name: /^Yangi o'yin/ }).click(); await t.waitForSelector("text=O'yinchilar");
  const tc = (await t.locator("[aria-label^='Xona kodi']").textContent())!.trim(); const tr = x.rooms.rooms.get(tc)!;
  await t.getByRole("button", { name: "O'yinni boshlash" }).click(); await t.waitForSelector("text=Orzuingizni tanlang"); await t.getByRole("button", { name: "Tanlash" }).first().click(); await t.waitForSelector("text=Naqd");
  check(tr.state!.players.length === 3 && tr.members.filter((m: any) => m.bot).length === 2, `${tag} o'quv: 1 odam + 2 bot`);
  await t.waitForTimeout(600); check(await t.getByTestId("coach").count() === 1 && /balansingiz/.test(await t.getByTestId("coach").innerText()), `${tag} o'quv: yo'l-yo'riq «Bu sizning balansingiz…» ko'rinadi`);
  await t.getByTestId("coach").getByRole("button", { name: "Tushundim" }).click(); await t.waitForTimeout(300); check(await t.getByTestId("coach").count() === 0, `${tag} «Tushundim» bosilgach shu qadam qayta chiqmaydi`);
  if (tag === "tel") await t.getByRole("button", { name: /^Maydon/ }).click().catch(() => {});
  await t.waitForTimeout(600); const lim = t.getByTestId("limit-left"); check(await lim.count() > 0 && /Qolgan vaqt: (14|15):/.test(await lim.innerText()), `${tag} o'quv: «Qolgan vaqt 15:00» ko'rinadi`);
  (x.rooms as any).limitPause(tr); tr.limitLeftMs = 1200; (x.rooms as any).limitResume(tr);
  await t.waitForSelector("text=O'yin natijasi", { timeout: 15000 }).catch(() => {});
  check(tr.state!.endReason === "time" && !!tr.state!.winner, `${tag} vaqt tugadi: g'olib belgilandi (sabab «vaqt»)`);
  check(await t.getByText(/Vaqt tugadi/).count() > 0, `${tag} natija ekranida «Vaqt tugadi»`);
  await t.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `MODES: ${failed} ta xato` : "MODES: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
