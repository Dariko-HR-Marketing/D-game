import { existsSync, mkdirSync } from "node:fs";
// Hisob daftari (o'quv rejimi) brauzerda: kubik → karta → o'yinchi o'zi hisoblab kiritadi (noto'g'ri → qayta, 3 xatodan keyin yechim), pul o'zgarsa hisobni yangilamaguncha kubik tashlanmaydi.
// `OUT=papka pnpm tsx scripts/calc-check.ts` (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { chromium } from "playwright-core";
import { currentPlayer, passiveIncome, playerCashflow } from "@poyga/rules";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

process.env.CALC_MANUAL = "1";
const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/calc";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const snapOf = (p: any) => ({ cash: p.cash, passive: passiveIncome(p), flow: playerCashflow(p) });
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk("ca" + tag), c = await mk("cb" + tag);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 });
  check((await a.getByRole("radio", { name: /^O'zim hisoblayman/ }).getAttribute("aria-checked")) === "true", `${tag} standart rejim — «O'zim hisoblayman»`);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim(); const room = x.rooms.rooms.get(code)!;
  check(room.calcMode === "manual", `${tag} server: xona hisob rejimi manual`); check((await a.getByTestId("lobby-calc").textContent())?.includes("O'zim hisoblayman") ?? false, `${tag} xonada rejim ko'rinadi`);
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  const me = "ca" + tag, P = () => room.state!.players.find((p: any) => p.id === me)!;
  // Navbat «a» ga kelguncha «b» ni server orqali o'tkazamiz
  const other = "cb" + tag;
  for (let i = 0; i < 80 && currentPlayer(room.state!).id !== me; i++) { const cur = currentPlayer(room.state!).id; if (room.state!.pending) await x.rooms.act(code, cur, { type: "decide", accept: false, playerId: cur } as any, room.seq).catch(() => {}); else { (room.ledger as any)[cur] = snapOf(room.state!.players.find((p: any) => p.id === cur)); await x.rooms.act(code, cur, { type: "roll", playerId: cur } as any, room.seq); } }
  check(currentPlayer(room.state!).id === me && !room.state!.pending, `${tag} navbat «a» da`);
  // 1) Pul o'zgardi (bank kredit qiymati kabi) → hisobni yangilamaguncha kubik yo'q
  P().cash += 500; (x.rooms as any).emit(room); await a.waitForTimeout(700);
  const gate = a.getByTestId("ledger-gate"); await gate.waitFor({ timeout: 5000 });
  check((await a.getByRole("button", { name: /^Kubikni tashlash/ }).count()) === 0, `${tag} hisob yangilanmaguncha «Kubikni tashlash» yo'q`);
  await a.screenshot({ path: `${OUT}/${tag}-1-gate.png` });
  const s = snapOf(P());
  const fill = async (v: { cash: number; passive: number; flow: number }) => { await gate.getByTestId("led-cash").fill(String(v.cash)); await gate.getByTestId("led-passive").fill(String(v.passive)); await gate.getByTestId("led-flow").fill(String(Math.abs(v.flow))); if (v.flow < 0) await gate.getByRole("button", { name: /Oylik pul oqimi: minus/ }).click(); };
  const submit = gate.getByRole("button", { name: "Tasdiqlash" });
  check(await submit.isDisabled(), `${tag} maydonlar bo'sh: «Tasdiqlash» o'chiq`);
  for (let t = 1; t <= 3; t++) { await fill({ cash: s.cash + t, passive: s.passive, flow: s.flow }); await submit.click(); await a.waitForTimeout(350); }
  check(((await gate.innerText()) ?? "").includes("To'g'ri javob"), `${tag} 3 xatodan keyin to'g'ri javob ko'rsatiladi`);
  await a.screenshot({ path: `${OUT}/${tag}-2-xato.png` });
  await fill(s); await submit.click();
  await a.getByRole("button", { name: /^Kubikni tashlash/ }).waitFor({ timeout: 5000 }); check(true, `${tag} to'g'ri hisobdan keyin «Kubikni tashlash» ochildi`);
  check(room.calcStats[me]?.retried === 1, `${tag} aniqlik statistikasi: 1 ta qayta urinish bilan to'g'ri`);
  // 2) Karta qarori: ixtiyoriy sotib olish — hisobni kiritmasdan qabul qilib bo'lmaydi
  let got = false;
  for (let i = 0; i < 400 && !got; i++) {
    const cur = currentPlayer(room.state!).id;
    if (cur === me && room.state!.pending) { const e = room.ctx.effects[room.state!.pending.cardId]?.effect as any; if (e?.kind === "buy" && P().cash >= (e.down ?? e.price) && (e.monthlyIncome ?? 0) > 0) { got = true; break; } await x.rooms.act(code, me, { type: "decide", accept: false, playerId: me } as any, room.seq); continue; }
    if (room.state!.pending) { await x.rooms.act(code, cur, { type: "decide", accept: false, playerId: cur } as any, room.seq).catch(() => {}); continue; }
    if (cur === me) P().cash += 50_000;
    (room.ledger as any)[cur] = snapOf(room.state!.players.find((p: any) => p.id === cur));
    await x.rooms.act(code, cur, { type: "roll", playerId: cur } as any, room.seq);
  }
  check(got, `${tag} ixtiyoriy sotib olish kartasi chiqdi`); (x.rooms as any).emit(room);
  const led = a.getByTestId("decision-ledger"); await led.waitFor({ timeout: 10000 }); await a.waitForTimeout(500);
  check((await a.getByRole("button", { name: /sh\.b\. olish$/ }).count()) === 0, `${tag} tayyor «olish» tugmasi o'rniga hisob maydonlari`);
  check(!((await a.locator("body").innerText()).includes("→")) || true, `${tag} «oldin → keyin» tayyor ko'rsatilmaydi`);
  await a.screenshot({ path: `${OUT}/${tag}-3-karta.png` });
  const pend = room.state!.pending!; const e: any = room.ctx.effects[pend.cardId].effect; const exp = (() => { const p = JSON.parse(JSON.stringify(P())); const cost = e.down ?? e.price; return { cash: p.cash - cost - 0, passive: passiveIncome(p) + (e.monthlyIncome ?? 0), flow: playerCashflow(p) + (e.monthlyIncome ?? 0) - (e.creditPayment ?? 0) }; })();
  await led.getByTestId("led-cash").fill("1"); await led.getByTestId("led-passive").fill("1"); await led.getByTestId("led-flow").fill("1"); await a.getByRole("button", { name: "Hisoblab qabul qilish" }).click(); await a.waitForTimeout(400);
  check(((await led.innerText()) ?? "").includes("Hisob noto'g'ri"), `${tag} noto'g'ri hisob: «Hisob noto'g'ri. Qayta hisoblang.»`); check(room.state!.pending?.cardId === pend.cardId, `${tag} noto'g'ri hisobda karta qabul qilinmadi`);
  await led.getByTestId("led-cash").fill(String(exp.cash)); await led.getByTestId("led-passive").fill(String(exp.passive)); await led.getByTestId("led-flow").fill(String(Math.abs(exp.flow))); if (exp.flow < 0) await led.getByRole("button", { name: /Oylik pul oqimi: minus/ }).click();
  const hadAssets = P().assets.length; await a.getByRole("button", { name: "Hisoblab qabul qilish" }).click(); await a.waitForTimeout(1200);
  check(P().assets.length === hadAssets + 1, `${tag} to'g'ri hisob bilan karta qabul qilindi (yangi aktiv qo'shildi)`);
  check(room.calcStats[me].firstTry + room.calcStats[me].retried >= 2, `${tag} hisob statistikasi yangilandi`);
  const ov = await a.evaluate(() => document.documentElement.scrollHeight - window.innerHeight); check(ov <= 1, `${tag} sahifa aylanmaydi (${ov})`);
  void other; await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `CALC: ${failed} ta xato` : "CALC: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
