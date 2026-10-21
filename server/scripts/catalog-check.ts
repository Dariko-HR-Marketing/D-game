import { existsSync, mkdirSync } from "node:fs";
// Tajriba24 katalogi: viktorina (javob serverda, mijozga yuborilmaydi), depozitni muddatidan oldin yechish, faol sug'urta polisi ko'rinishi. `OUT=papka pnpm tsx scripts/catalog-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles, slowTimers } from "./_seed";
import { currentPlayer } from "@poyga/rules";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/catalog";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const ida = "ka" + tag, idc = "kb" + tag; const a = await mk(ida), c = await mk(idc);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  const room = x.rooms.rooms.get(code)!; slowTimers(x, room);
  const turn = () => { const id = currentPlayer(room.state!).id; return { id, page: id === ida ? a : c, p: room.state!.players.find((p: any) => p.id === id)! }; };
  const push = async (pg: any) => { (x.rooms as any).emit(room); await pg.waitForTimeout(700); };

  // 1) Depozit: portfelda ko'rinadi va muddatidan oldin yechiladi (asosiy summa qaytadi)
  { const t = turn(); const cash0 = t.p.cash; (t.p as any).deposits = [{ id: 1, label: "Sinov depoziti", principal: 1000, perLap: 50, lapsLeft: 3, accrued: 0, months: 0 }]; (t.p as any).depSeq = 2; t.p.cash -= 1000; await push(t.page);
    if (tag === "tel") { await t.page.getByRole("button", { name: "Blank" }).click(); await t.page.waitForTimeout(400); }
    const box = t.page.getByTestId("deposits"); await box.scrollIntoViewIfNeeded().catch(() => {}); check(await box.count() === 1 && (await box.innerText()).includes("Sinov depoziti"), `${tag} depozit portfelda ko'rinadi`);
    await t.page.screenshot({ path: `${OUT}/deposit-${tag}.png` });
    await box.getByRole("button").first().click(); await t.page.waitForTimeout(700);
    const me = turn().p as any; check((me.deposits ?? []).length === 0 && me.cash === cash0, `${tag} muddatidan oldin yechildi: asosiy summa qaytdi, foiz yo'q`);
  }
  // 2) Viktorina: javob mijozga yuborilmaydi; to'g'ri javob «To'g'ri javob!» ko'rsatadi
  { const t = turn(); const eff = room.ctx.effects["cat-Y241"]; check(!!eff, `${tag} viktorina kartasi (Y241) kolodada`);
    room.state!.pending = { type: "card", playerId: t.id, cardId: "cat-Y241", deck: eff.deck } as any; await push(t.page);
    const q = t.page.getByTestId("quiz-options"); await q.waitFor({ timeout: 8000 }).catch(() => {}); check(await q.count() === 1, `${tag} viktorina variantlari (A/B/V) chiqdi`);
    const wire = JSON.stringify(x.rooms.view(room)); check(!/"correct"\s*:\s*"[ABV]"/.test(wire), `${tag} to'g'ri javob serverdan mijozga yuborilmaydi`);
    await t.page.screenshot({ path: `${OUT}/quiz-${tag}.png` });
    await q.getByRole("button", { name: /^B\./ }).click(); await t.page.waitForSelector("[data-testid=quiz-result]", { timeout: 8000 }).catch(() => {});
    check(((await t.page.getByTestId("quiz-result").allInnerTexts()).join(" ")).includes("To'g'ri javob!"), `${tag} to'g'ri javob: «To'g'ri javob!» ko'rsatildi`);
    check(!!room.state!.lastQuiz && room.state!.lastQuiz!.correct === true && room.state!.lastQuiz!.answer === "B", `${tag} serverda natija: to'g'ri, javob B`);
    await t.page.screenshot({ path: `${OUT}/quiz-result-${tag}.png` });
  }
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `CATALOG: ${failed} ta xato` : "CATALOG: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
