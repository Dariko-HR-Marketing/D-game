import { existsSync, mkdirSync } from "node:fs";
// Karta xabari: boshqa o'yinchi tortgan karta (jumladan bozor kartasi) 30 soniya yoki «✕» bosilguncha turadi, o'zi erta yo'qolmaydi.
// `OUT=papka pnpm tsx scripts/toast-check.ts` (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { chromium } from "playwright-core";
import { autoProfiles } from "./_seed";
import { buildApp } from "../src/app";
import { currentPlayer } from "@poyga/rules";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/toast";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
const a = await mk("xa"), c = await mk("xb");
await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click();
await a.waitForSelector("text=Naqd");
const room = x.rooms.rooms.get(code)!; const toast = a.locator('[role="status"][aria-label]').filter({ hasText: "karta tortdi" }); // xabar kartasi: lahza-bannerlari («Bozor xabari») va moliya chiplari emas
// «c» o'yinchisi navbatida karta tortilguncha: «a» ning sahifasida xabar chiqadi
let seenAt = 0;
for (let i = 0; i < 300 && !seenAt; i++) {
  const cur = currentPlayer(room.state!).id;
  if (room.state!.pending) { await x.rooms.act(code, cur, { type: "decide", accept: false, playerId: cur }, room.seq).catch(() => {}); }
  else await x.rooms.act(code, cur, { type: "roll", playerId: cur }, room.seq);
  if (cur === "xb" && room.state!.lastCard && (room.state!.lastCard as any).playerId === "xb") { await a.waitForTimeout(400); if (await toast.count()) seenAt = Date.now(); }
}
check(seenAt > 0, "boshqa o'yinchi tortgan kartaning xabari chiqdi");
if (seenAt) {
  const txt0 = (await toast.first().textContent()) ?? ""; // aynan shu xabar kuzatiladi (server 30 soniyada navbatni o'zi o'tkazib, yangi karta chiqarishi mumkin)
  await a.screenshot({ path: `${OUT}/toast.png` }); const bb = await toast.first().boundingBox(); check(!!bb && bb.y >= 56 && bb.y + bb.height <= 900, "xabar sarlavha ostida va ekran ichida");
  await a.waitForTimeout(12000);
  const dump = async () => `soni=${await toast.count()} [${(await toast.evaluateAll((es) => es.map((e) => (e.getAttribute("aria-label") ?? "") + "|" + (e.textContent ?? "").slice(0, 60)))).join(" ;; ")}]`;
  const ok12 = (await toast.count()) === 1 && (await toast.first().textContent()) === txt0; if (!ok12) console.log("DIAG 12s:", await dump(), "| txt0:", txt0.slice(0, 60));
  check(ok12, "12 soniyadan keyin ham turibdi (avval 9 soniyada yo'qolardi)");
  await a.waitForTimeout(14000); check((await toast.count()) === 1 && (await toast.first().textContent()) === txt0, "26 soniyada ham turibdi");
  await a.waitForTimeout(6500); const same = (await toast.count()) === 1 && (await toast.first().textContent()) === txt0; check(!same, "30 soniyadan keyin o'sha xabar o'zi yopildi");
  // «✕» bilan yopish: keyingi karta xabari
  let again = false; for (let i = 0; i < 300 && !again; i++) { const cur = currentPlayer(room.state!).id; if (room.state!.pending) await x.rooms.act(code, cur, { type: "decide", accept: false, playerId: cur }, room.seq).catch(() => {}); else await x.rooms.act(code, cur, { type: "roll", playerId: cur }, room.seq); if (cur === "xb" && (room.state!.lastCard as any)?.playerId === "xb") { await a.waitForTimeout(400); again = (await toast.count()) > 0; } }
  if (again) { await a.getByRole("button", { name: "Yopish" }).first().click(); await a.waitForTimeout(300); check((await toast.count()) === 0, "«✕» bilan yopiladi"); } else console.log("INFO  ikkinchi xabar chiqmadi");
}
await b.close(); await x.app.close(); console.log(failed ? `TOAST: ${failed} ta xato` : "TOAST: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
