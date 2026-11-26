import { existsSync } from "node:fs";
// O'yin turlari: tanlov (standart / tez / reytingli / o'quv), o'rinlar chegarasi, chiqish shartlari yozuvi, qolgan vaqt va vaqt tugashi. `pnpm tsx scripts/modes-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles, openRoomsAcc, pickDream } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081";
process.env.CORS_ORIGINS = WEB;
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  const open = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("tajriba24-dev-user", u); localStorage.setItem("tajriba24-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); await p.getByRole("button", { name: /^Yangi o'yin/ }).or(p.getByTestId("home-tutorial")).first().waitFor({ timeout: 15000 }); if (tag === "tel") { const o = p.getByTestId("home-opts"); if (await o.count()) await o.click({ timeout: 3000 }).catch(() => {}); } return p; };
  // 1) Tanlov va o'rinlar chegarasi
  const a = await open("mda" + tag);
  check(await a.getByTestId("mode-quick").count() === 0 && await a.getByTestId("mode-rated").count() === 0 && await a.getByTestId("mode-tutorial").count() === 0, `${tag} tanlovda Tez, Reytingli va O'quv yo'q`);
  check(await a.getByTestId("mode-standard").count() === 1 && await a.getByTestId("mode-student").count() === 1 && await a.getByTestId("mode-corporate").count() === 1, `${tag} tanlovda Standart, Student va Korporativ bor`);
  await a.getByTestId("mode-student").click(); check(await a.getByTestId("seats-2").count() === 1 && await a.getByTestId("seats-8").count() === 1, `${tag} student: o'rinlar 2–8`);
  await a.getByTestId("mode-standard").click(); check(await a.getByTestId("seats-8").count() === 1 && await a.getByTestId("seats-2").count() === 1, `${tag} standart: 2–8`);
  check((await a.getByTestId("turn-60").count()) === 1 && (await a.getByTestId("turn-120").count()) === 1 && (await a.getByTestId("turn-0").count()) === 1 && (await a.getByTestId("turn-30").count()) === 0, `${tag} tezlik: Odatiy (1 daqiqa), Sekin (2 daqiqa), Mehrojiddin`);
  check((await a.getByRole("button", { name: /^Kod bilan qo'shilish/ }).count()) === 0 && (await a.getByTestId("rooms-code-input").count()) === 0, `${tag} bosh sahifada alohida «Kod bilan qo'shilish» yo'q; kod maydoni «Ochiq o'yinlar» ostida`);
  await a.getByTestId("mode-corporate").click(); check((await a.getByRole("button", { name: /^Kod bilan qo'shilish/ }).count()) === 0 && (await a.getByTestId("corp-code").count()) === 1, `${tag} Korporativda faqat tashkilot kodi maydoni`); await a.getByTestId("mode-standard").click();
  // 2) Standart xona va chiqish shartlari
  await a.getByTestId("seats-2").click(); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("[data-testid=lobby-code]");
  const code = (await a.locator("[aria-label^='Maydon kodi']").textContent())!.trim(); const room = x.rooms.rooms.get(code)!;
  check(room.mode === "standard" && room.seats === 2 && room.turnSeconds === 60, `${tag} serverda rejim «standart», o'rin 2, tezlik 1 daqiqa`);
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang"); await pickDream(a); await a.waitForSelector("text=Naqd", { timeout: 60000 });
  if (tag === "tel") await a.getByRole("button", { name: /^Blank/ }).click();
  const txt = await a.locator("body").innerText(); check(txt.includes("Naqd ≥ 1 000 000") && txt.includes("Passiv daromad ≥ 25 000"), `${tag} standart: chiqish shartlari «1 000 000 / 25 000»`);
  check((room.state!.mode ?? "standard") === "standard", `${tag} o'yin holatida rejim «standart»`);
  check(await a.getByTestId("coach").count() === 0, `${tag} standart o'yinda yo'l-yo'riq yo'q`);
  await a.context().close();
  // 2b) Yangi o'yinchi (o'yini yo'q): alohida majburiy onboarding YO'Q — oddiy o'yin va tur tanlovi darrov ochiq
  const nw = await open("newmd" + tag); await nw.getByTestId("home-new").waitFor({ timeout: 6000 }).catch(() => {});
  check(await nw.getByTestId("home-tutorial").count() === 0, `${tag} yangi o'yinchi: «Birinchi tanishuv» taklifi yo'q (alohida onboarding olib tashlangan)`);
  check(await nw.getByTestId("home-new").count() === 1 && await nw.getByTestId("mode-standard").count() === 1, `${tag} yangi o'yinchi: oddiy o'yin va tur tanlovi darrov ochiq`);
  check(await nw.getByText(/Avval qisqa tanishuv/).count() === 0, `${tag} yangi o'yinchi: «Avval qisqa tanishuv» to'sig'i yo'q`);
  await nw.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `MODES: ${failed} ta xato` : "MODES: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
