import { existsSync, mkdirSync } from "node:fs";
// Aralash o'yin (kimdir kichik, kimdir katta aylanada): har bir o'yinchi O'Z aylanasining taxtasi va sarlavhasini ko'radi.
// Katta aylanaga o'tgan o'yinchi kichik aylana taxtasida qolib ketmasligi kerak. `OUT=papka pnpm tsx scripts/circles-check.ts` (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles, slowTimers } from "./_seed";
import { currentPlayer } from "@poyga/rules";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/circles";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844], ["yot", 844, 390], ["pln", 768, 1024]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const ida = "ca" + tag, idc = "cb" + tag; const a = await mk(ida), c = await mk(idc);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  const room = x.rooms.rooms.get(code)!; slowTimers(x, room);
  const pa: any = room.state!.players.find((p: any) => p.id === ida); pa.circle = "big"; pa.pos = 3; pa.cash = 500000; // «a» kichik aylanadan chiqdi; «c» hali kichik aylanada
  const board = (p: any) => p.getByTestId("board").getAttribute("data-circle");
  const head = async (p: any) => ((await p.locator('[role="heading"][aria-level="1"]').first().textContent()) ?? "").trim();
  const settle = async () => { (x.rooms as any).emit(room); await a.waitForTimeout(900); };
  for (const turnOf of [ida, idc]) {
    for (let i = 0; i < 6 && currentPlayer(room.state!).id !== turnOf; i++) { const cur = currentPlayer(room.state!).id; if (room.state!.pending) await x.rooms.act(code, cur, { type: "decide", accept: false, playerId: cur } as any, room.seq).catch(() => {}); else await x.rooms.act(code, cur, { type: "roll", playerId: cur } as any, room.seq); const q: any = room.state!.players.find((p: any) => p.id === ida); if (q.circle !== "big") { q.circle = "big"; q.pos = 3; } }
    await settle(); const who = turnOf === ida ? "katta o'yinchining navbati" : "kichik o'yinchining navbati";
    await a.screenshot({ path: `${OUT}/${tag}-A-big-viewer-${turnOf === ida ? "own-turn" : "other-turn"}.png` }); await c.screenshot({ path: `${OUT}/${tag}-B-small-viewer-${turnOf === ida ? "other-turn" : "own-turn"}.png` });
    check(await board(a) === "big", `${tag} (${who}) katta aylanadagi o'yinchi KATTA aylana taxtasini ko'radi`);
    check(await board(c) === "small", `${tag} (${who}) kichik aylanadagi o'yinchi KICHIK aylana taxtasini ko'radi`);
    check((await head(a)) === "Katta aylana", `${tag} (${who}) katta o'yinchida sarlavha «Katta aylana» (hozir: «${await head(a)}»)`);
    check((await head(c)) === "Kichik aylana", `${tag} (${who}) kichik o'yinchida sarlavha «Kichik aylana» (hozir: «${await head(c)}»)`);
  }
  // Toza ko'rinish (rasm uchun): vaqtinchalik oynalar va xabarlarni yopib, katta aylanadagi o'yinchi ekranini suratga olamiz
  for (const p of [a, c]) { await p.keyboard.press("Escape").catch(() => {}); for (let k = 0; k < 6; k++) { const cl = p.getByRole("button", { name: "Yopish" }); if (!(await cl.count())) break; await cl.first().click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(150); } }
  await a.waitForTimeout(600); await a.screenshot({ path: `${OUT}/${tag}-A-big-viewer-clean.png` }); await c.screenshot({ path: `${OUT}/${tag}-B-small-viewer-clean.png` });
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `CIRCLES: ${failed} ta xato` : "CIRCLES: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
