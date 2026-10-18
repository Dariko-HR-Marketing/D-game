import { existsSync, mkdirSync } from "node:fs";
// Onboarding (sahifa yo'riqnomalari) tekshiruvi — yo'riqnomalar YOQILGAN: `OUT=papka pnpm tsx scripts/tour-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`). Har sahifada bir marta; kichik va katta aylana uchun alohida; qayta ko'rsatish.
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { currentPlayer } from "@poyga/rules";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/tour";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const sizes: [string, number, number][] = [["tel", 390, 844], ["kmp", 1440, 900]];
for (const [tag, w, h] of sizes) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => localStorage.setItem("poyga-dev-user", u), uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk("ta" + tag), c = await mk("tb" + tag);
  const dlg = (p: any) => p.getByRole("dialog");
  const title = async (p: any) => (await dlg(p).getAttribute("aria-label")) ?? "";
  const next = async (p: any) => { const bt = dlg(p).getByRole("button", { name: /^(Keyingisi|Tushunarli)$/ }); await bt.click(); await p.waitForTimeout(150); };
  const shot = (p: any, n: string) => p.screenshot({ path: `${OUT}/${tag}-${n}.png` });
  const fits = async (p: any, n: string) => { const bb = await dlg(p).boundingBox(); check(!!bb && bb.x >= 0 && bb.y >= 0 && bb.x + bb.width <= w + 1 && bb.y + bb.height <= h + 1, `${tag} ${n}: yo'riqnoma oynasi ekran ichida`); };

  // 1) Bosh sahifa: birinchi kirishda ko'rinadi (3 qadam), tugagach qaytmaydi
  await dlg(a).waitFor({ timeout: 15000 }); check((await title(a)).startsWith("POYGA"), `${tag} bosh sahifa: yo'riqnoma birinchi kirishda chiqdi`);
  await shot(a, "01-home-1"); await fits(a, "home 1"); await next(a); await shot(a, "01-home-2"); await fits(a, "home 2"); await next(a); await shot(a, "01-home-3"); await fits(a, "home 3"); await next(a);
  check((await dlg(a).count()) === 0, `${tag} bosh sahifa: yo'riqnoma tugadi`);
  await a.reload(); await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.waitForTimeout(600); check((await dlg(a).count()) === 0, `${tag} bosh sahifa: qayta kirganda chiqmaydi`);
  await a.getByTestId("tour-help").click(); await dlg(a).waitFor(); check((await title(a)).startsWith("POYGA"), `${tag} «?» tugmasi yo'riqnomani qayta ochadi`); await a.keyboard.press("Escape");
  // 2) Xona: yo'riqnoma (kod, hodisa kartalari)
  await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await dlg(a).waitFor(); check((await title(a)) === "Xona kodi", `${tag} xona: yo'riqnoma`); await shot(a, "02-lobby-1"); await fits(a, "lobby 1"); await next(a); await shot(a, "02-lobby-2"); await next(a);
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await dlg(c).waitFor({ timeout: 15000 }); await c.keyboard.press("Escape"); await c.waitForTimeout(150); // yangi foydalanuvchi: o'z bosh sahifa yo'riqnomasini ko'radi, Esc bilan yopadi
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await dlg(c).first().waitFor(); const homeC = await title(c); check(homeC === "Xona kodi" || homeC.length > 0, `${tag} ikkinchi o'yinchi ham sahifa yo'riqnomasini ko'radi: «${homeC}»`); await c.keyboard.press("Escape");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click();
  // 3) Orzu tanlash
  await dlg(a).waitFor({ timeout: 10000 }); check((await title(a)) === "Orzuingizni tanlang", `${tag} orzu: yo'riqnoma`); await shot(a, "03-dreams"); await next(a); await next(a);
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); if (await dlg(c).count()) await c.keyboard.press("Escape");
  await c.getByRole("button", { name: "Tanlash" }).first().click();
  // 4) O'yin: kichik aylana yo'riqnomasi (9 qadam). Yo'riqnoma o'yinchining o'z navbatida kechiktiriladi (qaror oynasini to'smaslik uchun) — navbatni boshqa o'yinchiga o'tkazamiz
  await a.waitForSelector("text=Naqd");
  { const rm = x.rooms.rooms.get(code)!; for (let i = 0; i < 50 && currentPlayer(rm.state!).id === "ta" + tag; i++) { const cur = "ta" + tag; if (rm.state!.pending) await x.rooms.act(code, cur, { type: "decide", accept: false, playerId: cur }, rm.seq).catch(() => {}); else await x.rooms.act(code, cur, { type: "roll", playerId: cur }, rm.seq); } check(currentPlayer(rm.state!).id !== "ta" + tag, `${tag} navbat boshqa o'yinchiga o'tdi (yo'riqnoma kechiktirilmasin)`); } await dlg(a).waitFor(); const small: string[] = [];
  for (let i = 0; i < 9; i++) { await dlg(a).waitFor(); small.push(await title(a)); await shot(a, `04-small-${i + 1}`); await fits(a, `kichik aylana ${i + 1}`); await next(a); }
  check(small[0] === "Kichik aylana" && small.includes("Vaqt oyma-oy hisoblanadi") && small.includes("Qancha davom etadi"), `${tag} kichik aylana: ${small.length} qadam, oyma-oy vaqt tushuntirilgan`);
  check((await dlg(a).count()) === 0, `${tag} kichik aylana yo'riqnomasi tugadi`);
  // 5) Katta aylanaga chiqish: alohida yo'riqnoma
  const room = x.rooms.rooms.get(code)!; const meId = "ta" + tag; const me = room.state!.players.find((p: any) => p.id === meId)!;
  me.circle = "big"; me.pos = 3; (x.rooms as any).emit(room);
  await dlg(a).waitFor({ timeout: 10000 }); const big: string[] = []; for (let i = 0; i < 5; i++) { await dlg(a).waitFor(); big.push(await title(a)); await shot(a, `05-big-${i + 1}`); await fits(a, `katta aylana ${i + 1}`); await next(a); }
  check(big[0] === "Katta aylanaga chiqdingiz!" && big.length === 5, `${tag} katta aylana: alohida yo'riqnoma (${big.length} qadam)`);
  // 6) Natija
  room.state!.winner = meId; (x.rooms as any).finish(room); (x.rooms as any).emit(room);
  await dlg(a).waitFor({ timeout: 10000 }); check((await title(a)) === "O'yin tahlili", `${tag} natija: yo'riqnoma`); await shot(a, "06-result"); await next(a);
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `TOUR: ${failed} ta xato` : "TOUR: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
