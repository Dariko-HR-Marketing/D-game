import { existsSync, mkdirSync } from "node:fs";
// Telefon (tik va yotiq): qaror varag'i ochiq bo'lganda ham blank va maydonni ko'rish mumkin: varaq yig'iladi («Yig'ish»), blankda «Moliya amallari» ko'rinadi va bosiladi, so'ng varaq qaytadan ochiladi.
// `OUT=papka pnpm tsx scripts/decision-min-check.ts` (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles, slowTimers } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/dmin";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["tik", 390, 844], ["yotiq", 844, 390]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce", hasTouch: true }); await c.addInitScript((u) => { localStorage.setItem("tajriba24-dev-user", u); localStorage.setItem("tajriba24-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk("ma" + tag), c = await mk("mb" + tag);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("[data-testid=lobby-code]");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  const room = x.rooms.rooms.get(code)!; slowTimers(x, room); const s: any = room.state!; const idx = s.players.findIndex((p: any) => p.id === "ma" + tag); s.turn = idx; s.players[idx].circle = "small"; s.players[idx].cash = 500;
  const buy = Object.values(room.ctx.effects).find((c2: any) => c2.effect.kind === "buy" && c2.mode === "optional") as any; s.pending = { type: "card", playerId: "ma" + tag, cardId: buy.id, deck: buy.deck }; room.armKey = null; (x.rooms as any).emit(room);
  await a.waitForTimeout(1500);
  await a.screenshot({ path: `${OUT}/${tag}-0.png` });
  check((await a.getByTestId("decision-minimize").count()) === 1, `${tag}: qaror varag'i ochiq, «Yig'ish» tugmasi bor`); await a.screenshot({ path: `${OUT}/${tag}-1-varaq.png` });
  await a.getByTestId("decision-minimize").click(); await a.waitForTimeout(400);
  check((await a.getByTestId("decision-mini").count()) === 1 && (await a.getByTestId("decision-minimize").count()) === 0, `${tag}: varaq yig'ildi, qisqa chiziq ko'rinadi`);
  if (w < 800) { await a.getByRole("button", { name: /^Blank/ }).last().click().catch(async () => { await a.getByText("Blank", { exact: true }).last().click(); }); } await a.waitForTimeout(500); // yotiq telefonda ekran keng: blank chap ustunda
  const hdr = a.getByTestId("actions").getByText(/Moliya amallari/).first(); check((await hdr.count()) > 0, `${tag}: blankda «Moliya amallari» ko'rinadi`);
  if (await hdr.count()) { const bb = (await hdr.boundingBox())!; const mini = (await a.getByTestId("decision-mini").boundingBox())!; check(w >= 800 ? bb.y >= mini.y + mini.height - 1 : bb.y + bb.height <= mini.y + 1, `${tag}: «Moliya amallari» chiziq bilan to'qnashmaydi`); await hdr.scrollIntoViewIfNeeded(); const hh = (await hdr.innerText()); if (hh.startsWith("▸")) await hdr.click(); }
  await a.screenshot({ path: `${OUT}/${tag}-2-blank.png` });
  await a.getByTestId("decision-mini").click(); await a.waitForTimeout(400);
  check((await a.getByTestId("decision-minimize").count()) === 1, `${tag}: varaq qaytadan ochildi`);
  const ov = await a.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check(ov <= 1, `${tag}: gorizontal aylanish yo'q (${ov})`);
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close();
console.log(failed ? `QAROR VARAG'I: ${failed} ta xato` : "QAROR VARAG'I: hammasi joyida"); process.exit(failed ? 1 : 0);
