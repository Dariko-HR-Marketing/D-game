import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
// Chat: erkin matn va tayyor iboralar, o'qilmagan belgisi, 16 yoshgacha faqat iboralar, jim qilish, shikoyat, a11y (axe), sig'ish.
// `OUT=papka WEB=http://localhost:8081 pnpm tsx scripts/chat-check.ts`
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/chat";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const year = new Date().getFullYear();
for (const [tag, w, h] of [["tel", 390, 844], ["yot", 844, 390], ["kmp", 1440, 900]] as [string, number, number][]) {
  const A = "ca" + tag, K = "cb" + tag; x.profiles.put(A, { name: "Sardor", color: 0, birthYear: 1990 }); x.profiles.put(K, { name: "Bolajon", color: 2, birthYear: year - 12 });
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); localStorage.removeItem("poyga-chat-muted"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk(A), k = await mk(K);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await k.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await k.getByRole("textbox").fill(code); await k.getByRole("button", { name: "Kirish", exact: true }).click(); await k.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await k.waitForSelector("text=Orzuingizni tanlang"); await k.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  await k.waitForSelector("text=Naqd");
  const room = x.rooms.rooms.get(code)!;
  // 1) Katta o'yinchi yozadi
  await a.getByTestId("chat-open").click(); const sheet = a.getByRole("dialog", { name: "Chat" }); await sheet.waitFor();
  check(await sheet.getByTestId("chat-input").isVisible() && await sheet.getByText("Hozircha xabar yo'q").isVisible(), `${tag}: katta o'yinchida yozish maydoni va bo'sh holat`);
  await sheet.getByTestId("chat-input").fill("Salom, Bolajon! Omad tilayman."); await sheet.getByTestId("chat-input").press("Enter"); await a.waitForTimeout(500);
  check(await sheet.getByText("Salom, Bolajon! Omad tilayman.").count() === 1, `${tag}: yuborilgan xabar ro'yxatda`);
  const lab = (await k.getByTestId("chat-open").getAttribute("aria-label")) ?? ""; check(/1 yangi xabar/.test(lab), `${tag}: ikkinchi o'yinchida o'qilmagan belgisi («${lab}»)`);
  const live = await k.locator('[role="status"]').allInnerTexts(); check(live.some((t) => /Sardor: Salom, Bolajon/.test(t)), `${tag}: ekran o'qigichga xabar`);
  // 2) Bola: faqat tayyor iboralar
  await k.getByTestId("chat-open").click(); const ks = k.getByRole("dialog", { name: "Chat" }); await ks.waitFor();
  check(await ks.getByText("Salom, Bolajon! Omad tilayman.").count() >= 1, `${tag}: bola xabarni ko'radi`);
  check(await ks.getByTestId("chat-input").count() === 0 && await ks.getByTestId("chat-restricted").isVisible(), `${tag}: 16 yoshgacha erkin yozish yopiq (izoh ko'rinadi)`);
  await ks.getByTestId("chat-phrase-3").click(); await k.waitForTimeout(600);
  check(await ks.getByText("Rahmat!").count() >= 1, `${tag}: bola tayyor ibora yuboradi («Rahmat!»)`);
  const r = room.chat?.filter((m: any) => m.from === K && m.phrase === 3).length; check(r === 1, `${tag}: serverda ibora saqlangan`);
  const bad = x.rooms.chat(code, K, { text: "erkin matn" }); check(!bad.ok && (bad as any).error === "chat_restricted", `${tag}: server bolaning erkin matnini rad etadi`);
  const lab2 = (await a.getByTestId("chat-open").getAttribute("aria-label")) ?? ""; check(!/yangi/.test(lab2), `${tag}: ochiq chatda o'qilmagan belgisi yo'q`);
  // 3) Jim qilish va shikoyat
  await ks.getByText("Salom, Bolajon! Omad tilayman.").first().click(); await ks.getByTestId("chat-mute").click(); await k.waitForTimeout(300);
  check(await ks.getByText("Siz bu o'yinchining xabarlarini yashirdingiz").count() >= 1 && await ks.getByText("Salom, Bolajon! Omad tilayman.").count() === 0, `${tag}: jim qilingan o'yinchi xabari yashiriladi`);
  await sheet.getByText("Rahmat!").first().click(); await sheet.getByTestId("chat-report").click(); await a.waitForTimeout(800);
  const cs = x.adminState.complaints; check(cs.length === 1 && cs[0].against === K && /Rahmat!/.test(cs[0].text) && cs[0].room === code, `${tag}: shikoyat adminga tushdi`);
  check(await sheet.getByText("Shikoyat yuborildi").count() === 1, `${tag}: «Shikoyat yuborildi» tasdig'i`);
  // 4) Sig'ish va a11y
  const ov = await a.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check(ov <= 1, `${tag}: gorizontal aylanish yo'q (${ov})`);
  const bx = await sheet.getByTestId("chat-send").boundingBox(); check(!!bx && bx.y + bx.height <= h + 1 && bx.x + bx.width <= w + 1, `${tag}: yuborish tugmasi ekranda`);
  await a.screenshot({ path: `${OUT}/${tag}-1-katta.png` }); await k.screenshot({ path: `${OUT}/${tag}-2-bola.png` });
  await a.addScriptTag({ content: AXE }); const ax = await a.evaluate(`axe.run(document.querySelector('[data-testid="chat"]'), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } }).then((r) => r.violations.map((v) => v.id + "(" + v.nodes.length + ") " + v.nodes.slice(0, 2).map((n) => n.target.join(">")).join(";")))`) as string[];
  check(ax.length === 0, `${tag}: axe — buzilish yo'q ${ax.join(" | ")}`);
  await a.keyboard.press("Escape"); await a.waitForTimeout(300); check(await a.getByRole("dialog", { name: "Chat" }).count() === 0, `${tag}: Esc bilan yopiladi`);
  x.adminState.complaints.length = 0;
  await a.context().close(); await k.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `CHAT: ${failed} ta xato` : "CHAT: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
