import { existsSync, mkdirSync, writeFileSync } from "node:fs";
// Ism majburiy, avatar rasmi, botlar tartib raqami bilan, aloqa uzildi/tiklandi. `OUT=papka pnpm tsx scripts/identity-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`). Bu skript profillarni ATAYLAB oldindan yaratmaydi.
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/identity";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp({ requireProfile: true }); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const mk = async (uid: string, w = 1440, h = 900) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce", acceptDownloads: true }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };

// 1) Ism majburiy
const a = await mk("ida");
await a.getByTestId("gate-name").waitFor({ timeout: 15000 });
check((await a.getByRole("button", { name: /^Yangi o'yin/ }).count()) === 0, "ismsiz: bosh sahifa ko'rinmaydi, ism so'raladi");
const cont = a.getByRole("button", { name: "Davom etish" }); check(await cont.isDisabled(), "ism va yil bo'lmaguncha «Davom etish» o'chiq");
await a.getByTestId("gate-name").fill("A"); check(await cont.isDisabled(), "bitta harfli ism qabul qilinmaydi");
await a.getByTestId("gate-name").fill("Sardor"); await a.getByTestId("gate-year").fill("1995"); check(!(await cont.isDisabled()), "to'g'ri ism va yil: tugma faol");
await a.screenshot({ path: `${OUT}/1-gate.png` }); await cont.click();
await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 10000 }); check(await a.getByText("Salom, Sardor").waitFor({ timeout: 6000 }).then(() => true).catch(() => false), "ism kiritilgach bosh sahifa: «Salom, Sardor»"); // profil yuklanishi bilan salom matni yangilanadi (tugma undan oldin chiqishi mumkin)
// Server ham ismsiz xonaga kirishni rad etadi
const sock = await (await mk("zzz")).evaluate(() => new Promise<string>((res) => { const u = (document.location.origin, "ws://localhost:3000/ws?token=zzz"); const w = new WebSocket(u); w.onopen = () => w.send(JSON.stringify({ type: "create" })); w.onmessage = (e) => res(e.data); }));
check(JSON.parse(sock).error === "profile_required", "server profilsiz xona ochishni rad etadi");

// 2) Avatar rasmi (profil)
await a.getByRole("button", { name: "Profil" }).first().click(); await a.waitForSelector("text=Profilni tahrirlash");
const jpeg = await a.evaluate(() => { const c = document.createElement("canvas"); c.width = 400; c.height = 300; const g = c.getContext("2d")!; g.fillStyle = "#c33"; g.fillRect(0, 0, 400, 300); g.fillStyle = "#fff"; g.fillRect(120, 80, 160, 140); return c.toDataURL("image/jpeg", 0.9); });
const file = `${OUT}/me.jpg`; writeFileSync(file, Buffer.from(jpeg.split(",")[1], "base64"));
const [chooser] = await Promise.all([a.waitForEvent("filechooser"), a.getByRole("button", { name: "Rasm yuklash" }).click()]); await chooser.setFiles(file);
await a.waitForSelector("text=Rasm saqlandi", { timeout: 10000 });
const img = a.getByTestId("photo-picker").locator("img"); await img.first().waitFor({ timeout: 10000 });
check(((await img.first().getAttribute("src")) ?? "").includes("/avatar/ida?v="), "rasm profilda ko'rinadi (imzolangan manzil)");
check(await img.first().evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0), "rasm serverdan yuklandi");
await a.screenshot({ path: `${OUT}/2-profile.png` });

// 3) Xona: ikkinchi o'yinchi ism va rasmni ko'radi; botlar tartib raqami bilan
await a.getByRole("button", { name: "Orqaga" }).first().click().catch(() => {}); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
const c = await mk("zed"); await c.getByTestId("gate-name").fill("Madina"); await c.getByTestId("gate-year").fill("1999"); await c.getByRole("button", { name: "Davom etish" }).click();
await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
const lob = await c.locator("body").innerText(); check(lob.includes("Sardor") && lob.includes("Madina") && !/O'yinchi \d/.test(lob), "xonada ikkala o'yinchi ismi ko'rinadi, «O'yinchi N» yo'q");
check((await c.locator("img[src*='/avatar/ida']").count()) > 0, "ikkinchi o'yinchi birinchisining rasmini ko'radi");
await c.screenshot({ path: `${OUT}/3-lobby.png` });
await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
const game = await a.locator("body").innerText(); check(game.includes("Madina") && !/O'yinchi \d/.test(game), "o'yinda ism ko'rinadi, «O'yinchi N» yo'q");

// 4) Botlar: 1 odam + 2 bot
const d = await mk("bot1"); await d.getByTestId("gate-name").fill("Aziza"); await d.getByTestId("gate-year").fill("1990"); await d.getByRole("button", { name: "Davom etish" }).click();
await d.getByRole("button", { name: /^Yangi o'yin/ }).click(); await d.waitForSelector("text=O'yinchilar");
const code2 = (await d.locator("[aria-label^='Xona kodi']").textContent())!.trim(); const r2 = x.rooms.rooms.get(code2)!; r2.members.push({ userId: "bot-1", bot: true, online: true }, { userId: "bot-2", bot: true, online: true }); await x.rooms.start(code2, "bot1", 3, { dreams: false }); await d.waitForSelector("text=Naqd");
const gb = await d.locator("body").innerText(); check(gb.includes("Bot 1") && gb.includes("Bot 2") && !gb.includes("Bot 3"), "botlar «Bot 1», «Bot 2» deb ko'rinadi");
await d.screenshot({ path: `${OUT}/4-bots.png` });

// 5) Aloqa uzildi → tiklandi (ilovadan chiqib qaytish)
const fire = (p: any, state: "hidden" | "visible") => p.evaluate(`Object.defineProperty(document, "visibilityState", { get: () => "${state}", configurable: true }); document.dispatchEvent(new Event("visibilitychange"));`);
const banner = a.getByTestId("conn-banner"); check((await banner.count()) === 0, "aloqa yaxshi: xabar yo'q");
await fire(a, "hidden"); await a.waitForTimeout(1300); await fire(a, "visible");
await banner.waitFor({ timeout: 3000 }); check(((await banner.textContent()) ?? "").includes("Aloqa uzildi"), "qaytganda «Aloqa uzildi. Qayta ulanmoqda…»");
await a.screenshot({ path: `${OUT}/5-uzildi.png` });
await a.waitForFunction(() => (document.querySelector('[data-testid="conn-banner"]')?.textContent ?? "").includes("Aloqa tiklandi"), null, { timeout: 8000 });
check(true, "holat qaytgach «Aloqa tiklandi»"); await a.screenshot({ path: `${OUT}/6-tiklandi.png` });
await a.waitForTimeout(3200); check((await banner.count()) === 0, "xabar o'zi yo'qoladi");
check((await a.locator("body").innerText()).includes("Naqd"), "o'yin holati saqlangan, ekran joyida");
await b.close(); await x.app.close(); console.log(failed ? `IDENTITY: ${failed} ta xato` : "IDENTITY: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
