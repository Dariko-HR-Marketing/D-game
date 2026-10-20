import { existsSync, mkdirSync } from "node:fs";
// Moliya animatsiyasi: naqd/passiv daromad/pul oqimi o'zgarishi va yangi aktiv chiplari (yashil — qo'shildi, qizil — ketdi), raqam sanab o'tadi, chiplar o'zi yo'qoladi.
// `OUT=papka pnpm tsx scripts/fx-check.ts` (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/fx";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const sizes: [string, number, number, "reduce" | "no-preference"][] = [["tel", 390, 844, "no-preference"], ["kmp", 1440, 900, "no-preference"], ["kmp-kam", 1440, 900, "reduce"]];
for (const [tag, w, h, motion] of sizes) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: motion }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk("fxa" + tag), c = await mk("fxb" + tag);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 });
  // Xona vaqti tanlovi: 1 daqiqa
  await a.getByRole("radio", { name: "1 daqiqa" }).click(); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  check((await a.getByTestId("lobby-turn").textContent())?.includes("1 daqiqa") ?? false, `${tag} xona vaqti (1 daqiqa) xonada ko'rinadi`);
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  check((await c.getByTestId("lobby-turn").textContent())?.includes("1 daqiqa") ?? false, `${tag} qo'shilgan o'yinchi ham xona vaqtini ko'radi`);
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click();
  await a.waitForSelector("text=Naqd");
  const room = x.rooms.rooms.get(code)!; const me = room.state!.players.find((p: any) => p.id === "fxa" + tag)!;
  check(room.turnSeconds === 60, `${tag} server xona vaqtini saqladi (60)`);
  const layer = a.getByTestId("fx-layer"); const emit = () => (x.rooms as any).emit(room);
  await a.waitForTimeout(800);
  check((await layer.getByText(/[+−]/).count()) === 0, `${tag} boshida chip yo'q`);
  // 1) Xarajat: naqd −20 (qizil)
  me.cash -= 20; emit(); await a.waitForTimeout(500);
  const red = await layer.textContent() ?? ""; check(red.includes("−20") && red.includes("Naqd"), `${tag} xarajat: «−20 Naqd» chipi chiqdi`); await a.screenshot({ path: `${OUT}/${tag}-1-minus.png` });
  // 2) Aktiv sotib olindi: naqd −400, passiv +100, yangi aktiv
  me.cash -= 400; me.assets.push({ kind: "buy", code: "KB-FX", price: 400, monthlyIncome: 100, creditPayment: 0, credit: 0 }); emit(); await a.waitForTimeout(700);
  const t2 = await layer.textContent() ?? ""; check(t2.includes("−400") && t2.includes("+100") && t2.includes("Sizga qo'shildi"), `${tag} aktiv: naqd −400, passiv +100 va «Sizga qo'shildi»`); await a.screenshot({ path: `${OUT}/${tag}-2-aktiv.png` });
  // 3) Daromad: naqd +500 (yashil)
  me.cash += 500; emit(); await a.waitForTimeout(500);
  const t3 = await layer.textContent() ?? ""; check(t3.includes("+500"), `${tag} daromad: «+500» chipi`); await a.screenshot({ path: `${OUT}/${tag}-3-plus.png` });
  // Raqam yangi qiymatga yetdi
  await a.waitForTimeout(1500);
  const fin = await a.locator("body").innerText(); check(fin.includes(String(me.cash).replace(/\B(?=(\d{3})+(?!\d))/g, " ")), `${tag} ko'rsatilgan naqd yangi qiymatga (${me.cash}) yetdi`);
  // Chiplar o'zi yo'qoladi
  await a.waitForTimeout(4200); check((await layer.getByText(/Sizga qo'shildi|−400|\+500/).count()) === 0, `${tag} chiplar o'zi yo'qoldi`);
  // Ekran sig'imi: sahifa aylanmaydi
  const ov = await a.evaluate(() => document.documentElement.scrollHeight - window.innerHeight); check(ov <= 1, `${tag} sahifa aylanmaydi (${ov})`);
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `FX: ${failed} ta xato` : "FX: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
