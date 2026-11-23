import { existsSync, mkdirSync } from "node:fs";
// Javob kutayotgan so'rovlar: oyna (request-modal), sarlavhadagi qo'ng'iroqcha raqami va profil menyusidagi «O'yindan chiqish».
// Tekshiriladi: qarz so'ralganda beruvchiga aniq savol oynasi chiqadi; «Keyinroq» yopadi, qo'ng'iroqchada raqam qoladi va bosilsa oyna qaytadi;
// «Yo'q, rad etaman» taklifni o'chiradi; pastda «O'yindan chiqish» yo'q, u profil menyusida va tasdiq so'raydi; gorizontal aylanish yo'q.
// `OUT=papka WEB=http://localhost:8081 pnpm tsx scripts/requests-check.ts`
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles, slowTimers, joinByCode, pickDream, clickMenuItem, menuLabel } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/requests";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const SIZES: [string, number, number][] = [["tel-tik", 390, 844], ["tel-yotiq", 844, 390], ["kichik-yotiq", 667, 375], ["plan-tik", 768, 1024], ["plan-yotiq", 1024, 768], ["kmp", 1440, 900]];
for (const [tag, w, h] of SIZES) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("tajriba24-dev-user", u); localStorage.setItem("tajriba24-tours-off", "1"); }, uid); const pg = await c.newPage(); await pg.goto(WEB); return pg; };
  const ida = "da" + tag, idb = "db" + tag; const a = await mk(ida), c = await mk(idb);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("[data-testid=lobby-code]");
  const code = (await a.locator("[aria-label^='Maydon kodi']").textContent())!.trim();
  await joinByCode(c, code); await c.waitForSelector("text=Maydon egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await pickDream(a); await c.waitForSelector("text=Orzuingizni tanlang"); await pickDream(c);
  const room = x.rooms.rooms.get(code)!; slowTimers(x, room);
  const s: any = room.state!; for (const p of s.players) { p.circle = "small"; p.cash = 100_000; }
  // a so'radi (beruvchi b), b ga sheriklik taklif qilindi: b ikkala so'rovni ko'radi
  s.proposals.push({ id: s.nextProposal++, kind: "loan", giver: idb, receiver: ida, amount: 500, months: 12 });
  (x.rooms as any).emit(room);
  const dlg = c.getByTestId("request-modal"); await dlg.waitFor({ timeout: 30000 }).catch(async (e: any) => { await c.screenshot({ path: `${OUT}/${tag}-yoq.png` }); throw e; });
  check(/qarz berasizmi/i.test(await dlg.innerText()), `${tag}: beruvchiga aniq savol oynasi chiqdi`);
  check((await dlg.getByRole("button", { name: "Ha, qarz beraman" }).count()) === 1 && (await dlg.getByRole("button", { name: "Yo'q, rad etaman" }).count()) === 1, `${tag}: «Ha» va «Yo'q» tugmalari bor`);
  await dlg.getByRole("button", { name: "Keyinroq" }).click(); await c.waitForTimeout(300);
  check((await c.getByTestId("request-modal").count()) === 0, `${tag}: «Keyinroq» oynani yopdi`);
  check(/1/.test((await menuLabel(c, "requests-open")) ?? ""), `${tag}: profil menyusida so'rovlar bandi va raqam qoldi`);
  await clickMenuItem(c, "requests-open"); await c.getByTestId("request-modal").waitFor({ timeout: 4000 }); check(true, `${tag}: qo'ng'iroqcha oynani qaytardi`);
  await c.screenshot({ path: `${OUT}/${tag}-oyna.png` });
  await c.getByTestId("request-modal").getByRole("button", { name: "Yo'q, rad etaman" }).click(); await new Promise((r) => setTimeout(r, 600));
  check(!(room.state!.proposals as any[]).some((p) => p.kind === "loan"), `${tag}: «Yo'q» taklifni o'chirdi`);
  check((await c.getByTestId("request-modal").count()) === 0 && (await menuLabel(c, "requests-open")) === null, `${tag}: javobdan keyin oyna va so'rovlar bandi yo'qoldi`);
  check((await c.getByRole("button", { name: "O'yindan chiqish" }).count()) === 0, `${tag}: pastda «O'yindan chiqish» tugmasi yo'q`);
  await c.getByTestId("profile-menu-open").click(); await c.getByTestId("profile-menu").waitFor();
  const lv = c.getByRole("menuitem", { name: "O'yindan chiqish" }); check((await lv.count()) === 1, `${tag}: profil menyusida «O'yindan chiqish» bor`);
  await lv.click(); check((await c.getByRole("button", { name: "Ha, chiqaman" }).count()) === 1, `${tag}: chiqishdan oldin tasdiq so'raladi`);
  await c.screenshot({ path: `${OUT}/${tag}-menyu.png` });
  await c.getByRole("button", { name: "Yo'q, qolaman" }).click(); await c.waitForTimeout(200);
  check((await c.getByTestId("profile-menu").count()) === 0, `${tag}: «Yo'q, qolaman» menyuni yopdi`);
  const ov = await c.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check(ov <= 1, `${tag}: gorizontal aylanish yo'q (${ov})`);
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close();
console.log(failed ? `SO'ROVLAR: ${failed} ta xato` : "SO'ROVLAR: hammasi joyida"); process.exit(failed ? 1 : 0);
