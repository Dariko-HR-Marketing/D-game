import { existsSync } from "node:fs";
// Qayta kirish: uzilish (internet/tok/ilovani yopish) o'yinchini chiqarmaydi — xuddi shu hisob bilan kod yoki «Davom etayotgan o'yin» orqali qaytadi (ko'p marta);
// begona o'yinchi boshlangan xonaga kira olmaydi; «O'yindan chiqish»ni o'zi bosgan qayta kira olmaydi. `pnpm tsx scripts/rejoin-check.ts`
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
const open = async (uid: string, w = 390, h = 844) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
const a0 = await open("rja"), b0 = await open("rjb"), c0 = await open("rjc");
await a0.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a0.getByTestId("seats-4").click(); await a0.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a0.waitForSelector("text=O'yinchilar");
const code = (await a0.locator("[aria-label^='Xona kodi']").textContent())!.trim();
for (const p of [b0, c0]) { await p.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await p.getByRole("textbox").fill(code); await p.getByRole("button", { name: "Kirish", exact: true }).click(); await p.waitForSelector("text=Xona egasi", { timeout: 8000 }).catch(async () => { console.log("LOBBY-XATO", (await p.innerText("body")).slice(0, 900), "| seats:", x.rooms.rooms.get(code)?.seats, "members:", x.rooms.rooms.get(code)?.members.map((m: any) => m.userId).join(",")); await p.screenshot({ path: "/tmp/rj.png" }); process.exit(2); }); }
await a0.getByRole("button", { name: "O'yinni boshlash" }).click(); await a0.waitForSelector("text=Orzuingizni tanlang");
for (const p of [a0, b0, c0]) { await p.getByRole("button", { name: "Tanlash" }).first().click(); }
await a0.waitForSelector("text=Naqd"); const room = x.rooms.rooms.get(code)!;
const inGame = async (p: any) => { try { await p.waitForSelector("text=Naqd", { timeout: 12000 }); return true; } catch { return false; } };

// 1) «a» sahifani 5 marta yopib-ochadi (tok/internet o'chishi): navbatlar o'tib ketadi, har safar qaytadi
let a = a0; const ctxOf = (p: any) => p.context();
for (let i = 1; i <= 5; i++) {
  await ctxOf(a).close(); await new Promise((r) => setTimeout(r, 600));
  check(room.members.find((m: any) => m.userId === "rja")!.online === false && !room.members.find((m: any) => m.userId === "rja")!.left, `${i}-uzilish: o'yinchi oflayn, lekin chiqmagan`);
  // boshqalar o'ynashda davom etadi (navbat «a» ga kelsa taymer o'tkazadi)
  for (let k = 0; k < 3; k++) { const cur = room.state!.players[room.state!.turn % room.state!.players.length].id; if (room.state!.pending) await x.rooms.act(code, cur, { type: "decide", accept: false, playerId: cur } as any, room.seq).catch(() => {}); else await x.rooms.act(code, cur, { type: "roll", playerId: cur } as any, room.seq).catch(() => {}); }
  a = await open("rja");
  if (i % 2 === 1) { const r = a.getByTestId("home-resume"); await r.waitFor({ timeout: 15000 }); await r.click(); }
  else { await a.getByRole("button", { name: /^Kod bilan qo'shilish/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await a.getByRole("textbox").fill(code); await a.getByRole("button", { name: "Kirish", exact: true }).click(); }
  check(await inGame(a), `${i}-qaytish (${i % 2 ? "«Davom etayotgan o'yin»" : "kod bilan"}): o'yinga qaytdi`);
  check(room.members.find((m: any) => m.userId === "rja")!.online === true, `${i}-qaytish: serverda onlayn`);
}
// 2) Begona (boshqa qurilma/brauzer) boshlangan xonaga kira olmaydi; sinov rejimida faqat OFLAYN o'yinchining o'rnini qaytarib oladi
const openKeep = async (uid: string) => { const c = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" }); await c.addInitScript((u) => { if (!localStorage.getItem("poyga-dev-user")) localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; }; // yangilashda qaytarib olingan o'rin bosilib ketmasin
const d = await openKeep("rjd"); const enter = async (p: any) => { await p.getByRole("button", { name: /^Kod bilan qo'shilish/ }).waitFor({ timeout: 15000 }); await p.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await p.getByRole("textbox").fill(code); await p.getByRole("button", { name: "Kirish", exact: true }).click(); };
await enter(d); await d.getByText("Qaysi o'yinchi edingiz?").waitFor({ timeout: 8000 }).catch(() => {});
check(await d.getByText("Qaysi o'yinchi edingiz?").count() > 0 && !room.members.some((m: any) => m.userId === "rjd"), "begona qurilma: o'yinga kirmadi, «Qaysi o'yinchi edingiz?» ko'rsatildi");
check(await d.getByTestId("claim-seats").getByRole("button").count() === 0 && await d.getByText(/hamma o'yinchi onlayn/).count() > 0, "hamma onlayn: qaytarib olinadigan o'rin yo'q");
await ctxOf(a).close(); await new Promise((r) => setTimeout(r, 800));
await d.getByRole("button", { name: "Bekor qilish" }).click(); await enter(d); await d.getByText("Qaysi o'yinchi edingiz?").waitFor({ timeout: 8000 });
const claimBtn = d.getByTestId("claim-seats").getByRole("button"); await claimBtn.first().waitFor({ timeout: 8000 });
check(await claimBtn.count() === 1 && /Bu menman/.test(await claimBtn.first().innerText()), "oflayn o'yinchi (a) ro'yxatda: yagona «Bu menman»");
await claimBtn.first().click();
check(await inGame(d), "o'rin qaytarib olindi: boshqa brauzerdan o'yinga qaytdi (sahifa o'zi yangilandi)");
for (let i = 0; i < 80 && room.members.find((m: any) => m.userId === "rja")!.online !== true; i++) await new Promise((r) => setTimeout(r, 100)); // sahifa qayta yuklanib ulanguncha (poyga yuklanish tezligiga bog'liq)
check(room.members.find((m: any) => m.userId === "rja")!.online === true && !room.members.some((m: any) => m.userId === "rjd"), "serverda a o'rni onlayn; yangi a'zo qo'shilmadi");
// 3) O'zi «O'yindan chiqish»ni bosgan qayta kira olmaydi
x.rooms.leave(code, "rjb"); await ctxOf(b0).close(); const b1 = await open("rjb");
await b1.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 });
check(await b1.getByTestId("home-resume").count() === 0, "ixtiyoriy chiqqan: «Davom etayotgan o'yin» chiqmaydi");
await b1.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await b1.getByRole("textbox").fill(code); await b1.getByRole("button", { name: "Kirish", exact: true }).click(); await b1.waitForTimeout(1500);
check(await b1.getByText(/chiqqansiz/).count() > 0, "ixtiyoriy chiqqan kod bilan ham qaytolmaydi (xabar ko'rsatiladi)");
await b.close(); await x.app.close(); console.log(failed ? `REJOIN: ${failed} ta xato` : "REJOIN: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
