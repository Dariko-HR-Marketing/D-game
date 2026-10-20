import { existsSync, mkdirSync } from "node:fs";
// O'yin tarixi: har bir amal (katakdan-katakka, karta, qaror, pul o'zgarishi) ko'rinadi; "Mening/Hammasi" filtri, CSV, Esc va a11y. `OUT=papka pnpm tsx scripts/history-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { currentPlayer, effectOf } from "@poyga/rules";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/history";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce", acceptDownloads: true }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk("ha" + tag), c = await mk("hb" + tag);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  const room = x.rooms.rooms.get(code)!;
  for (let i = 0; i < 24 && !room.state!.winner; i++) { // serverda bir nechta navbat o'ynaladi (jurnalga yoziladi)
    const me = currentPlayer(room.state!).id;
    if (room.state!.pending) { const e = effectOf(room.ctx, room.state!.pending.cardId).effect; await x.rooms.act(code, me, { type: "decide", playerId: me, accept: e.kind === "gain" }, room.seq); }
    else await x.rooms.act(code, me, { type: "roll", playerId: me }, room.seq);
  }
  await a.waitForTimeout(900);
  await a.getByTestId("history-open").click(); const det = a.getByTestId("history-detail"); await det.waitFor(); await a.getByTestId("history-row").first().waitFor({ timeout: 8000 });
  const rows = await a.getByTestId("history-row").count(); const txt = await det.innerText();
  check(rows >= 3, `${tag} tarix qatorlari: ${rows}`);
  check(txt.includes("Yurdi") && /\d+ → \d+/.test(txt) && txt.includes("Kubik"), `${tag} katakdan-katakka va kubik ko'rinadi`);
  check(!/\bha(kmp|tel)\b|\bhb(kmp|tel)\b/.test(txt), `${tag} identifikator emas, ism ko'rinadi`);
  await a.screenshot({ path: `${OUT}/${tag}-1-mening.png` });
  await a.getByTestId("history-all").click(); await a.waitForTimeout(300);
  const all = await a.getByTestId("history-row").count(); check(all >= rows, `${tag} «Hammasi» filtri: ${all} >= ${rows}`);
  const [dl] = await Promise.all([a.waitForEvent("download", { timeout: 8000 }), a.getByTestId("history-csv").click()]);
  check(dl.suggestedFilename() === `poyga-${code}.csv`, `${tag} CSV yuklanadi: ${dl.suggestedFilename()}`);
  await a.addScriptTag({ content: AXE }); const ax = await a.evaluate(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } }).then((r) => r.violations.map((v) => v.id + "(" + v.nodes.length + ")"))`) as string[]; check(ax.length === 0, `${tag} axe: buzilish yo'q ${ax.join(", ")}`);
  await a.keyboard.press("Escape"); await a.waitForTimeout(300); check((await a.getByTestId("history-detail").count()) === 0, `${tag} Esc bilan yopiladi`);
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `HISTORY: ${failed} ta xato` : "HISTORY: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
