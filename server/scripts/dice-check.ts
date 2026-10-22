import { existsSync, mkdirSync } from "node:fs";
process.env.ROLLMODAL = "1"; // kubik oynasi yoqilgan
// Kubik oynasi (modal): o'z navbatingizda «Kubikni tashlash» tugmasi oynaning eng oldida (ikkala aylanada); «keyinroq» sahifadagi tugmani qoldiradi. Katta aylanada ikkita kubik, kichik aylanada bitta; tashlash paytida kubik(lar) modalda oldinga chiqadi (tashlaganda modal, boshqalarda to'smaydigan ko'rsatma), yig'indi, bosilsa/Esc bilan yopiladi.
// `OUT=papka pnpm tsx scripts/dice-check.ts` (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { autoProfiles, slowTimers } from "./_seed";
import { buildApp } from "../src/app";
import { currentPlayer } from "@poyga/rules";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/dice";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
const axe = async (p: any) => { await p.addScriptTag({ content: AXE }); return (await p.evaluate(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } }).then((r) => r.violations.map((v) => v.id + "(" + v.nodes.length + ")" + (v.id === "scrollable-region-focusable" ? v.nodes.map((n) => " " + n.target.join(">")).join(";") : "")))`)) as string[]; };
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844], ["yot", 844, 390]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "no-preference" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const ida = "da" + tag, idc = "db" + tag; const a = await mk(ida), c = await mk(idc);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  const room = x.rooms.rooms.get(code)!; slowTimers(x, room);
  const turn = () => { const id = currentPlayer(room.state!).id; return { id, page: id === ida ? a : c, other: id === ida ? c : a }; };
  const roll = async (pg: any) => { const btn = pg.getByRole("button", { name: /^Kubik(ni|larni) tashlash/ }).first(); await btn.waitFor({ timeout: 8000 }); await btn.click(); };

  // 1) Kichik aylana: bitta kubik
  { const t = turn(); const p: any = room.state!.players.find((q: any) => q.id === t.id); check(p.circle === "small", `${tag} boshida kichik aylana`);
    const rb = t.page.getByRole("button", { name: /^Kubik(ni|larni) tashlash/ });
    await t.page.getByTestId("roll-modal").waitFor({ timeout: 6000 }).catch(() => {});
    check(await t.page.getByTestId("roll-modal").count() === 1, `${tag} o'z navbatida «Kubikni tashlash» oynasi (modal) oldinga chiqdi`);
    check(await t.page.getByTestId("roll-dice").locator("[role=img]").count() === 1, `${tag} kichik aylana: oynada 1 ta kubik`);
    check(await rb.count() === 1, `${tag} tugma bitta (sahifadagisi modal ochiq paytda yashirin)`);
    check(await t.other.getByTestId("roll-modal").count() === 0, `${tag} boshqa o'yinchida tashlash oynasi yo'q`);
    const top = await t.page.evaluate(() => { const b = document.querySelector('[data-testid="dice-roll"] [role="button"]') as HTMLElement | null; if (!b) return "yo'q"; const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return b.contains(e) ? "oldinda" : "yopilgan"; }); check(top === "oldinda", `${tag} tugma hamma narsaning oldida (${top})`);
    const focused = await t.page.waitForFunction(() => document.activeElement?.closest?.('[data-testid="dice-roll"]') != null, undefined, { timeout: 3000 }).then(() => true, () => false); check(focused, `${tag} tugma fokusda (probel/Enter bilan tashlanadi)`);
    await t.page.screenshot({ path: `${OUT}/${tag}-0-prompt-small.png` }); { const v = await axe(t.page); check(v.length === 0, `${tag} axe (tashlash oynasi): buzilish yo'q ${v.join(", ")}`); }
    await t.page.getByRole("button", { name: "Avval hisobni ko'raman" }).first().click(); await t.page.waitForTimeout(300);
    check(await t.page.getByTestId("roll-modal").count() === 0 && await rb.count() === 1, `${tag} «Avval hisobni ko'raman»: oyna yopildi, sahifadagi tugma qoldi`);
    const before = await t.page.getByTestId("turn-dice").locator("[role=img]").count(); check(before === 1, `${tag} kichik aylana: taxtada tashlashdan oldin 1 ta kubik («?»)`);
    await roll(t.page); await t.page.getByTestId("dice-modal").waitFor({ timeout: 4000 }).catch(() => {});
    check(await t.page.getByTestId("dice-modal").count() === 1, `${tag} tashlagan o'yinchida kubik modali ochildi`);
    check(await t.page.getByTestId("dice-row").locator("[role=img]").count() === 1, `${tag} modalda 1 ta kubik`);
    check(room.state!.lastRoll!.dice!.length === 1, `${tag} serverda dice: 1 ta`);
    await t.page.screenshot({ path: `${OUT}/${tag}-1-small-rolling.png` });
    check(await t.other.getByTestId("dice-observer").count() === 1 && await t.other.getByTestId("dice-modal").count() === 0, `${tag} boshqa o'yinchida to'smaydigan ko'rsatma (modal emas)`);
    await t.page.waitForTimeout(1500); check(/Yig'indi: \d/.test(await t.page.getByTestId("dice-sum").innerText()), `${tag} to'xtagach «Yig'indi: N»`);
    await t.page.screenshot({ path: `${OUT}/${tag}-2-small-done.png` });
    await t.page.getByTestId("dice-backdrop").click({ position: { x: 6, y: 6 } }); await t.page.waitForTimeout(200); check(await t.page.getByTestId("dice-modal").count() === 0, `${tag} fonni bosish modalni yopadi`);
    for (let i = 0; i < 30 && room.state!.pending; i++) { const cur = currentPlayer(room.state!).id; await x.rooms.act(code, cur, { type: "decide", accept: false, playerId: cur } as any, room.seq).catch(() => {}); }
  }
  // 2) Katta aylana: ikkita kubik
  { const t = turn(); const p: any = room.state!.players.find((q: any) => q.id === t.id); p.circle = "big"; p.pos = 3; p.cash = 500000; (x.rooms as any).emit(room); await t.page.waitForTimeout(700);
    await t.page.screenshot({ path: `${OUT}/${tag}-3-big-before.png` });
    await t.page.getByTestId("roll-modal").waitFor({ timeout: 6000 }).catch(() => {});
    check(await t.page.getByTestId("roll-dice").locator("[role=img]").count() === 2, `${tag} katta aylana: tashlash oynasida 2 ta kubik`);
    await t.page.screenshot({ path: `${OUT}/${tag}-3b-prompt-big.png` });
    await roll(t.page); await t.page.getByTestId("dice-modal").waitFor({ timeout: 4000 }).catch(() => {});
    check(await t.page.getByTestId("dice-row").locator("[role=img]").count() === 2, `${tag} katta aylana: modalda 2 ta kubik`);
    const lr: any = room.state!.lastRoll; check(lr.dice.length === 2 && lr.die === lr.dice[0] + lr.dice[1], `${tag} serverda dice: ${JSON.stringify(lr.dice)} yig'indi ${lr.die}`);
    await t.page.screenshot({ path: `${OUT}/${tag}-4-big-rolling.png` }); await t.page.waitForTimeout(1500);
    const sum = await t.page.getByTestId("dice-sum").innerText(); check(sum.includes(`${lr.dice[0]} + ${lr.dice[1]} = ${lr.die}`), `${tag} yig'indi matni: «${sum}»`);
    await t.page.screenshot({ path: `${OUT}/${tag}-5-big-done.png` }); { const v = await axe(t.page); check(v.length === 0, `${tag} axe (kubik natijasi oynasi): buzilish yo'q ${v.join(", ")}`); if (v.length && process.env.DEBUG_AXE) console.log(await t.page.evaluate(() => [...document.querySelectorAll(".r-lltvgl")].map((e) => e.outerHTML.slice(0, 300) + " || parent: " + (e.parentElement?.getAttribute("data-testid") ?? e.parentElement?.getAttribute("aria-label") ?? e.parentElement?.className) + " scrollH " + (e as HTMLElement).scrollHeight + "/" + (e as HTMLElement).clientHeight).join("\n"))); }
    await t.page.keyboard.press("Escape"); await t.page.waitForTimeout(200); check(await t.page.getByTestId("dice-modal").count() === 0, `${tag} Esc modalni yopadi`);
    await t.page.waitForTimeout(2500); check(await t.page.getByTestId("turn-dice").locator("[role=img]").count() === 2, `${tag} tashlagandan keyin taxta markazida 2 ta kubik qoladi`);
  }
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `DICE: ${failed} ta xato` : "DICE: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
