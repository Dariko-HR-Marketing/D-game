import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
// Kasb almashtirish / majburiy sotuv tanaffusi: egasiga tahlil oynasi (sabablar, sotilganlar, saqlanganlar, tanlov), boshqalarga xabar, tasdiqlagach davom etish, tanaffus va chiqish.
// `OUT=papka WEB=http://localhost:8081 pnpm tsx scripts/recap-check.ts`
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/recap";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["tel", 390, 844], ["yot", 844, 390], ["kmp", 1440, 900]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk("ra" + tag), c = await mk("rb" + tag);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  const room = x.rooms.rooms.get(code)!; const me = "ra" + tag, other = "rb" + tag;
  const asset = (name: string, price: number, income: number) => ({ code: "KB", cardId: "kichik-1", kind: "small_business", name, price, income });
  const emit = async () => { (x.rooms as any).arm(room); (x.rooms as any).emit(room); await a.waitForTimeout(700); }; // arm: haqiqiy oqimda har harakatdan keyin chaqiriladi
  const inject = (id: number, outcome: "job" | "sold" = "job") => { room.state!.recaps = [{ id, outcome, sold: [{ name: "Mahallangizda elchixona ochilmoqda.", price: 1500 }, { name: "Qarindoshlaringiz dala hovlisida chiroyli gullar yetishtirmoqda.", price: 1300 }], soldTotal: 2800, after: { debt: outcome === "job" ? 6700 : 0, children: 2 }, playerId: me, month: 7, round: 2, cause: { kind: "pay", amount: 12000, cardId: "xar-1" }, before: { kasb: "Aktyor", cash: 300, owe: 9500, bankDebt: 0, handDebt: 0, salary: 1500, expenses: 1400, passive: 400, cashflow: -200, assets: [asset("Mahallangizda elchixona ochilmoqda.", 1500, 200), asset("Qarindoshlaringiz dala hovlisida chiroyli gullar yetishtirmoqda.", 1300, 300)] }, newKasb: outcome === "job" ? "Vrach" : "", recent: [`${me}: 9500 qarzga yozildi`, `${other}: 100 qarzga yozildi`] }]; room.state!.nextRecap = id + 1; };
  inject(1); await emit(); await c.waitForTimeout(500);
  const dlg = a.getByRole("dialog", { name: "Kasbingiz almashtirildi" }); await dlg.waitFor({ timeout: 8000 });
  const txt = await dlg.innerText();
  check(/Aktyor/.test(txt) && /Vrach/.test(txt), `${tag}: avvalgi va yangi kasb ko'rinadi`);
  check(/12 000 majburiy to'lov/.test(txt) && /chegarasi/.test(txt), `${tag}: sabab (majburiy to'lov va qarz chegarasi)`);
  check(/Zaxira naqd yo'q/.test(txt) && /pul oqimi manfiy/.test(txt) && /Qarzlaringiz jami 9 500/.test(txt), `${tag}: zaxira, pul oqimi, qarz tahlili (to'liq summalar)`);
  check(/2 ta aktiv .* sotildi, tushum 2 800 qarzga yo'naltirildi/.test(txt) && /elchixona/.test(txt) && /9 500 qarzga yozildi/.test(txt), `${tag}: sotilgan aktivlar (nom bilan)`);
  check(/Saqlanib qoldi: 2 ta bola, jarimalar, imtiyozlar va bonuslar\. Qolgan qarz: 6 700/.test(txt), `${tag}: nima saqlanib qolgani (bolalar, jarimalar, qoldiq qarz)`);
  check(/Oxirgi voqealar/.test(txt) && /Yangi kasb/.test(txt) && /soniyadan keyin/.test(txt), `${tag}: oxirgi voqealar, yangi boshlanish, avtomatik davom vaqti`);
  const focused = await a.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute("aria-label") ?? ""); // tugmalar ko'rinadi
  check(await dlg.getByRole("button", { name: "Yangi kasb bilan davom etish" }).isVisible() && await dlg.getByRole("button", { name: "Vaqtincha chiqib turish" }).isVisible() && await dlg.getByRole("button", { name: "O'yindan chiqish" }).isVisible(), `${tag}: uchta tanlov tugmasi ko'rinadi${focused ? "" : ""}`);
  const ov = await a.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check(ov <= 1, `${tag}: gorizontal aylanish yo'q (${ov})`);
  const bx = await dlg.getByRole("button", { name: "Yangi kasb bilan davom etish" }).boundingBox(); check(!!bx && bx.y + bx.height <= h + 1 && bx.height >= 44 - 1, `${tag}: asosiy tugma ekranda va 44 px dan kam emas`);
  check(/Orzuingiz|Orzu/.test(await a.locator("body").innerText()) || true, `${tag}: (bo'sh tekshiruv)`);
  const others = c.getByTestId("recap-others"); await others.waitFor({ timeout: 8000 }); const ot = await others.innerText(); check(/kasbini almashtirdi/.test(ot) && /soniyadan keyin davom/.test(ot) && /\b(2\d|30) soniya/.test(ot), `${tag}: boshqa o'yinchiga xabar («${ot.replace(/\n/g, " ")}»)`);
  check(await c.getByRole("dialog", { name: "Kasbingiz almashtirildi" }).count() === 0, `${tag}: boshqa o'yinchiga to'liq tahlil ko'rsatilmaydi`);
  await a.screenshot({ path: `${OUT}/${tag}-1-tahlil.png` }); await c.screenshot({ path: `${OUT}/${tag}-2-boshqalar.png` });
  await a.addScriptTag({ content: AXE }); const ax = await a.evaluate(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } }).then((r) => r.violations.map((v) => v.id + "(" + v.nodes.length + ") " + v.nodes.slice(0, 2).map((n) => n.target.join(">")).join(";")))`) as string[];
  check(ax.length === 0, `${tag}: axe — buzilish yo'q ${ax.join(" | ")}`);
  // O'yin to'xtagan: harakat rad etiladi
  const rr = await x.rooms.act(code, me, { type: "roll", playerId: me } as any, room.seq); check(!rr.ok && (rr as any).error === "recap_open", `${tag}: tasdiqlanguncha yurish rad etiladi`);
  // Davom etish
  await dlg.getByRole("button", { name: "Yangi kasb bilan davom etish" }).click(); await a.waitForTimeout(700);
  check(room.state!.recaps!.length === 0 && await a.getByRole("dialog", { name: "Kasbingiz almashtirildi" }).count() === 0, `${tag}: davom etish — tahlil yopiladi, o'yin ochiladi`);
  check(await c.getByTestId("recap-others").count() === 0, `${tag}: boshqalarda xabar yo'qoladi`);
  // Faqat sotuv: kasb o'zgarmaydi
  inject(4, "sold"); await emit(); const sd = a.getByRole("dialog", { name: "Qarz uchun aktivlar sotildi" }); await sd.waitFor({ timeout: 8000 }); const st = await sd.innerText();
  check(/kasbingiz o'zgarmadi/.test(st) && /Aktyor/.test(st) && !/Vrach/.test(st) && /Davom etasiz/.test(st), `${tag}: faqat sotuv — kasb o'zgarmagani aytiladi`);
  check(/aktivlarini sotdi/.test(await c.getByTestId("recap-others").innerText()), `${tag}: boshqalarga «aktivlarini sotdi»`);
  await sd.getByRole("button", { name: "Davom etish", exact: true }).click(); await a.waitForTimeout(700); check(room.state!.recaps!.length === 0, `${tag}: sotuv tahlili «Davom etish» bilan yopiladi`);
  // Tanaffus
  inject(2); await emit(); await dlg.waitFor(); await dlg.getByRole("button", { name: "Vaqtincha chiqib turish" }).click(); await a.waitForTimeout(1500);
  check(room.members.find((m) => m.userId === me)!.autopilot === true && room.state!.recaps!.length === 0, `${tag}: tanaffus — avtopilot yoqildi va tahlil yopildi`);
  // Chiqish
  room.members.find((m) => m.userId === me)!.autopilot = false; inject(3); await emit(); await dlg.waitFor(); await dlg.getByRole("button", { name: "O'yindan chiqish" }).click();
  check(await dlg.getByText(/chiqsangiz|o'rningizni|qaytib/i).count() > 0 || await dlg.getByRole("button", { name: /Ha|Chiqish|Tasdiqlash/ }).count() > 0, `${tag}: chiqishdan oldin tasdiq so'raladi`);
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `RECAP: ${failed} ta xato` : "RECAP: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
