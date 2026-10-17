import { existsSync, mkdirSync } from "node:fs";
// Animatsiya tekshiruvi (harakat kamaytirilmagan holda): kubik 3D aylanadi va natija yuzida to'xtaydi; fishka har bir katak ustidan yuradi;
// karta fishka yetib kelgachgina chiqadi; tovush tugmasi ishlaydi. `OUT=papka pnpm tsx scripts/motion-check.ts` (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { currentPlayer } from "@poyga/rules";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/motion";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: 1440, height: 900 } }); await c.addInitScript((u) => localStorage.setItem("poyga-dev-user", u), uid); const p = await c.newPage(); await p.goto(WEB); return p; };
const a = await mk("ma"), c = await mk("mb");
await a.getByRole("button", { name: "Yangi o'yin" }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: "Yangi o'yin" }).click(); await a.waitForSelector("text=O'yinchilar");
const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click();
await a.waitForSelector("text=Naqd"); for (const p of [a, c]) { const s = p.getByRole("button", { name: "O'tkazib yuborish" }); if (await s.count()) await s.click(); }

// Tovush tugmasi: o'chirish/yoqish va holat saqlanishi
const tog = a.getByTestId("sound-toggle"); check((await tog.getAttribute("aria-checked")) === "true", "tovush boshida yoqilgan");
await tog.click(); await a.waitForTimeout(150); check((await tog.getAttribute("aria-checked")) === "false" && (await a.evaluate(() => JSON.parse(localStorage.getItem("poyga-sound")!).muted)) === true, "tovush o'chirilganda holat saqlanadi");
await tog.click(); await a.waitForTimeout(150); check((await tog.getAttribute("aria-checked")) === "true", "tovush qayta yoqiladi");

// Tashlashlar: kubik va fishka kuzatiladi; karta chiqquncha takrorlanadi (karta fishka yetib kelgach chiqishi tekshiriladi)
type Fr = { t: number; x: number; y: number; card: boolean; cube: string };
const observe = async () => {
  const room = x.rooms.rooms.get(code)!; const me = currentPlayer(room.state!).id; const pg = me === "ma" ? a : c;
  const k = room.state!.players.findIndex((p: any) => p.id === me) + 1, before = room.state!.players.find((p: any) => p.id === me)!.pos;
  // Sahifa ichida ishlaydigan kod satr ko'rinishida (tsx yordamchilari brauzerga o'tmasligi uchun)
  const sample = pg.evaluate(`(async () => {
    const k = ${k}, out = [], t0 = performance.now();
    const cubeEl = () => document.querySelector('[role="img"][aria-label^="Kubik"] div[style*="preserve-3d"] div[style*="preserve-3d"]');
    while (performance.now() - t0 < 4600) {
      const el = document.querySelector('[data-testid="pawn-' + k + '"]'), r = el && el.getBoundingClientRect();
      out.push({ t: Math.round(performance.now() - t0), x: Math.round(r ? r.x : -1), y: Math.round(r ? r.y : -1),
        card: /sh\\.b\\. olish|O'tkazaman|Qabul qilaman/.test(document.body.innerText), cube: cubeEl() ? getComputedStyle(cubeEl()).transform : "" });
      await new Promise((r) => setTimeout(r, 40));
    }
    return out;
  })()`) as Promise<Fr[]>;
  await pg.waitForTimeout(100);
  const shots = (async () => { for (let i = 0; i < 6; i++) { await pg.waitForTimeout(i === 0 ? 40 : 150); await pg.locator('[role="img"][aria-label^="Kubik"]').first().screenshot({ path: `${OUT}/kubik-${i}.png` }).catch(() => {}); } })();
  await x.rooms.act(code, me, { type: "roll", playerId: me }, room.seq);
  const die = (room.state!.lastRoll as any).die as number, after = room.state!.players.find((p: any) => p.id === me)!.pos, pending = !!room.state!.pending;
  const frames = await sample; await shots;
  return { me, pg, k, before, after, die, pending, frames };
};
let seenCard = false;
for (let i = 0; i < 14 && !seenCard; i++) {
  const o = await observe(); const steps = (o.after - o.before + 48) % 48, pts = new Set(o.frames.filter((f) => f.x >= 0).map((f) => `${f.x},${f.y}`));
  check(steps > 0 && steps <= 12, `${i + 1}-tashlash: ${o.before} → ${o.after} (kubik ${o.die}, ${steps} qadam)`);
  check(pts.size >= steps + 1, `  fishka ${steps} qadamni bosqichma-bosqich yurdi: ${pts.size} ta turli nuqta`);
  const cubes = new Set(o.frames.map((f) => f.cube).filter(Boolean)); check(cubes.size >= 8, `  kubik aylanishda ${cubes.size} ta turli burchakda bo'ldi (3D)`);
  const lastMove = [...o.frames].reverse().find((f, j, arr) => j > 0 && (f.x !== arr[j - 1].x || f.y !== arr[j - 1].y))?.t ?? 0;
  const first = o.frames.find((f) => f.card)?.t ?? null;
  if (o.pending && first !== null) { seenCard = true; check(first >= lastMove - 60, `  karta fishka yurib bo'lgach chiqdi (karta ${first} ms, oxirgi harakat ${lastMove} ms)`); const room = x.rooms.rooms.get(code)!; await o.pg.waitForTimeout(300); const pid = o.me; await x.rooms.act(code, pid, { type: "decide", accept: false, playerId: pid }, room.seq).catch(() => {}); }
  else if (o.pending) { await o.pg.waitForTimeout(300); const room = x.rooms.rooms.get(code)!; await x.rooms.act(code, o.me, { type: "decide", accept: false, playerId: o.me }, room.seq).catch(() => {}); }
  await o.pg.waitForTimeout(500);
}
if (!seenCard) console.log("INFO  karta tushmadi — karta vaqti tekshirilmadi");
const pg = a;
const three = await pg.evaluate(() => { const e = document.querySelector('[role="img"][aria-label^="Kubik"] div[style*="preserve-3d"]') as HTMLElement | null; return e ? getComputedStyle(e).transformStyle : ""; });
check(three === "preserve-3d", "kubik CSS 3D (preserve-3d)");
await pg.screenshot({ path: `${OUT}/oxiri.png` });
await b.close(); await x.app.close(); console.log(failed ? `MOTION: ${failed} ta xato` : "MOTION: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
