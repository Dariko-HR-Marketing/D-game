import { existsSync } from "node:fs";
// Taymer jadvali va avtopilot: kubik 20 s (Odatiy tezlik 1 daqiqa) (maslahat va halqa), avtopilot bannerini ko'rsatish va «Men qaytdim». `pnpm tsx scripts/timers-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles, joinByCode, pickDream } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081";
process.env.CORS_ORIGINS = WEB;
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("tajriba24-dev-user", u); localStorage.setItem("tajriba24-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk("tma" + tag), c = await mk("tmb" + tag);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("[data-testid=lobby-code]");
  const code = (await a.locator("[aria-label^='Maydon kodi']").textContent())!.trim();
  await joinByCode(c, code); await c.waitForSelector("text=Maydon egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await pickDream(a); await c.waitForSelector("text=Orzuingizni tanlang"); await pickDream(c); await a.waitForSelector("text=Naqd", { timeout: 60000 });
  const room = x.rooms.rooms.get(code)!; const st = room.state!; const me = room.members.find((m) => m.userId === "tma" + tag)!, other = st.players.find((p: any) => p.id !== "tma" + tag)!;
  // 1) Kubik uchun taymer 10 s
  check(x.rooms.view(room).timerTotal === 20, `${tag} kubik taymeri serverda 20 soniya (Odatiy = 60 → ×2)`);
  const turnIsMine = st.players[st.turn % st.players.length].id === "tma" + tag;
  if (turnIsMine && tag === "tel") check(await a.getByText(/20 soniyada kubik tashlanmasa/).count() > 0, `${tag} maslahat: «20 soniyada kubik tashlanmasa…»`);
  // 2) Avtopilot: o'zimniki — banner va «Men qaytdim»
  me.autopilot = true; me.autoStreak = 3; (x.rooms as any).emit(room); await a.waitForTimeout(900);
  if (tag === "tel") await a.getByRole("button", { name: /^Maydon/ }).click().catch(() => {});
  check(await a.getByTestId("autopilot-banner").count() === 1, `${tag} avtopilot yoqilgan: banner ko'rinadi`);
  await a.getByRole("button", { name: "Men qaytdim" }).click(); await a.waitForTimeout(900);
  check(!me.autopilot && me.autoStreak === 0 && await a.getByTestId("autopilot-banner").count() === 0, `${tag} «Men qaytdim»: avtopilot o'chdi, banner yo'qoldi`);
  // 3) Boshqa o'yinchi avtopilotda — belgi ko'rinadi
  const om = room.members.find((m) => m.userId === other.id)!; om.autopilot = true; (x.rooms as any).emit(room); await a.waitForTimeout(900);
  if (tag === "tel") { await a.getByRole("button", { name: /^O'yinchilar/ }).click(); await a.waitForTimeout(300); }
  { const dro = a.getByTestId("players-drawer-open"); if (await dro.count()) { await dro.click(); await a.getByTestId("players-drawer").waitFor({ timeout: 4000 }); } } // kompyuter: o'yinchilar yon oynada
  check((await a.locator("body").innerText()).toLowerCase().includes("avtopilot"), `${tag} boshqa o'yinchi avtopilotda: belgi ko'rinadi`);
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `TIMERS: ${failed} ta xato` : "TIMERS: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
