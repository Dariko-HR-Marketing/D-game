import { existsSync, mkdirSync } from "node:fs";
// Qarz guvohlari: brauzerda uch o'yinchi (oluvchi, beruvchi, guvoh); telefon va kompyuter.
// Tekshiriladi: guvoh «Xabardor bo'ldim» tugmasini ko'radi va bosadi; beruvchida «Qabul qilish» hamma guvoh xabardor bo'lmaguncha o'chiq va holat «n / 3» ko'rinadi;
// oluvchi holatni ko'radi; hammasi xabardor bo'lgach tugma yoqiladi; gorizontal aylanish yo'q.
// `OUT=papka WEB=http://localhost:8081 pnpm tsx scripts/witness-check.ts`
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles, slowTimers, dismissReq, joinByCode, openOpts, pickDream, menuLabel } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/witness";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const SIZES: [string, number, number][] = [["tel-tik", 390, 844], ["kmp", 1440, 900]];
for (const [tag, w, h] of SIZES) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("tajriba24-dev-user", u); localStorage.setItem("tajriba24-tours-off", "1"); }, uid); const pg = await c.newPage(); await pg.goto(WEB); return pg; };
  const ida = "wa" + tag, idg = "wg" + tag, idw = "ww" + tag; const a = await mk(ida), g = await mk(idg), wt = await mk(idw);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await openOpts(a); await a.getByTestId("home-seats").getByText("3", { exact: true }).click(); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("[data-testid=lobby-code]");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  for (const p of [g, wt]) { await joinByCode(p, code); await p.waitForSelector("text=Xona "); }
  await a.getByRole("button", { name: "O'yinni boshlash" }).click();
  for (const [i, p] of [a, g, wt].entries()) { await p.waitForSelector("text=Orzuingizni tanlang", { timeout: 10000 }).catch(async (e) => { await p.screenshot({ path: `${OUT}/${tag}-orzu${i}.png` }); console.log(await p.locator("body").innerText()); throw e; }); await pickDream(p); }
  const room = x.rooms.rooms.get(code)!;
  // Poyga: orzu tanlash tugab o'yin boshlanmaguncha (server holatni yangi obyektga almashtiradi) taklifni qo'shsak, u yo'qolib qoladi. Sekin CI'da shu uchun oyna chiqmasdi.
  for (let i = 0; i < 100 && (!room.state || room.state.phase === "dreams"); i++) await new Promise((r) => setTimeout(r, 200));
  for (const p of [a, g, wt]) await p.waitForSelector("text=Naqd", { timeout: 30000 });
  slowTimers(x, room);
  const s: any = room.state!; for (const p of s.players) { p.circle = "small"; p.cash = 100_000; }
  // a (oluvchi) g (beruvchi) dan qarz so'radi; guvohlar: wt va yana ikki o'yinchi (qolgan ikkitasi hali xabardor emas)
  const others = s.players.map((p: any) => p.id).filter((id: string) => id !== ida && id !== idg && id !== idw);
  const wl = [idw, ...others].slice(0, 3); while (wl.length < 3) wl.push(idw + wl.length);
  const prop = { id: s.nextProposal++, kind: "loan", giver: idg, receiver: ida, amount: 500, months: 12, witnesses: wl, confirmed: [] as string[] }; s.proposals.push(prop); const live = (): any => (room.state!.proposals as any[]).find((q) => q.id === prop.id);
  (x.rooms as any).emit(room);
  // «Moliya amallari» paneli taklif kelganda o'zi ochiladi; qo'lda bosish bilan poyga bo'lmasligi uchun: avval kutamiz, matn yo'q bo'lsagina bosamiz va qayta tekshiramiz
  const open = async (p: any, re: RegExp) => {
    for (let i = 0; i < 5; i++) {
      await p.waitForTimeout(400); await dismissReq(p); if (await p.getByText(re).count()) return;
      const hdr = p.getByTestId("actions").getByText(/Moliya amallari/).first();
      if (!(await hdr.count())) { const t = p.getByRole("tab", { name: /Blank/ }).or(p.getByRole("button", { name: /^Blank/ })); if (await t.count()) await t.first().click().catch(() => {}); continue; }
      if ((await hdr.innerText()).startsWith("▸")) await hdr.click();
    }
  };
  await wt.waitForTimeout(600);
  const dlg = wt.getByTestId("request-modal"); await dlg.waitFor({ timeout: 30000 }).catch(async (e: any) => { await wt.screenshot({ path: `${OUT}/${tag}-guvoh-yoq.png` }); throw e; });
  check(/guvoh bo'lasizmi/.test(await dlg.innerText()), `${tag}: guvohga aniq savol oynasi chiqdi («guvoh bo'lasizmi?»)`);
  const yes = dlg.getByRole("button", { name: "Ha, guvoh bo'laman" }); check((await yes.count()) === 1, `${tag}: oynada «Ha, guvoh bo'laman» tugmasi bor`);
  const r = (await yes.boundingBox())!; check(r.x >= -1 && r.x + r.width <= w + 1 && r.height >= 40, `${tag}: guvoh tugmasi ekran ichida va ≥ 40 px (${Math.round(r.width)}×${Math.round(r.height)})`);
  await wt.screenshot({ path: `${OUT}/${tag}-guvoh.png` });
  check((await menuLabel(wt, "requests-open")) !== null, `${tag}: profil menyusida so'rovlar bandi bor`);
  await g.waitForTimeout(400); await open(g, /Qabul qilish/);
  await g.waitForSelector("text=Qabul qilish", { timeout: 8000 });
  check(await g.getByRole("button", { name: "Qabul qilish" }).first().isDisabled(), `${tag}: guvohlar xabardor bo'lmaguncha beruvchida «Qabul qilish» o'chiq`);
  await yes.click(); await new Promise((r2) => setTimeout(r2, 500));
  check((live()?.confirmed ?? []).includes(idw), `${tag}: guvoh xabardor bo'lgani serverda yozildi`);
  await g.waitForSelector("text=1 / 3", { timeout: 8000 }).catch(() => {}); check((await g.getByText("1 / 3").count()) > 0, `${tag}: beruvchi «1 / 3» holatini ko'radi`);
  await a.waitForTimeout(500); await open(a, /1 \/ 3/); await a.waitForTimeout(700); await a.screenshot({ path: `${OUT}/${tag}-oluvchi.png` }); check((await a.getByText("1 / 3").count()) > 0, `${tag}: oluvchi «1 / 3» holatini ko'radi`);
  check(await g.getByRole("button", { name: "Qabul qilish" }).first().isDisabled(), `${tag}: 1 / 3 da hali «Qabul qilish» o'chiq`);
  { const l = live(); l.confirmed = [...wl]; } (x.rooms as any).emit(room); await g.waitForTimeout(600);
  check(await g.getByRole("button", { name: "Qabul qilish" }).first().isEnabled(), `${tag}: 3 / 3 bo'lgach «Qabul qilish» yoqildi`);
  for (const [n, p] of [["oluvchi", a], ["beruvchi", g], ["guvoh", wt]] as const) { const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check(ov <= 1, `${tag}: ${n}: gorizontal aylanish yo'q (${ov})`); }
  await g.screenshot({ path: `${OUT}/${tag}-beruvchi.png` });
  await a.context().close(); await g.context().close(); await wt.context().close();
}
await b.close(); await x.app.close();
console.log(failed ? `GUVOH: ${failed} ta xato` : "GUVOH: hammasi joyida"); process.exit(failed ? 1 : 0);
