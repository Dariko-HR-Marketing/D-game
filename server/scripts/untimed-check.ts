import { existsSync } from "node:fs";
// «Mehrojiddin» — vaqtsiz xona: Home'da alohida tugma (faqat standart rejimda), xonada taymer halqasi va «N soniya» yozuvlari yo'q,
// kubik oynasida muddat yo'q, 13 soniya (kubik muddatidan uzoq) kutganda navbat o'zi o'tmaydi.
// `WEB=http://localhost:8081 pnpm tsx scripts/untimed-check.ts`
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081"; process.env.CORS_ORIGINS = WEB; process.env.ROLLMODAL = "1";
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); localStorage.removeItem("poyga-turn-seconds"); }, "ut" + tag);
  const a = await c.newPage(); await a.goto(WEB);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor();
  if (tag === "tel") { const o = a.getByTestId("home-opts"); if (await o.count()) await o.click(); }
  const mj = a.getByRole("radio", { name: "Mehrojiddin (vaqtsiz)" });
  check(await mj.count() === 1, `${tag}: «Mehrojiddin» tugmasi standart rejimda bor`);
  const labels = await a.getByTestId("home-turn").getByRole("radio").evaluateAll((es) => es.map((e) => e.getAttribute("aria-label")));
  check(labels.length === 3 && labels[2] === "Mehrojiddin (vaqtsiz)", `${tag}: uch tanlov: ${labels.join(" | ")}`);
  await mj.click(); check(await mj.getAttribute("aria-checked") === "true" && await a.getByTestId("turn0-hint").count() === 1, `${tag}: tanlanadi va izoh chiqadi`);
  // boshqa rejimda tugma yo'q
  const quick = a.getByRole("radio", { name: /^Tez/ }); if (await quick.count()) { await quick.first().click(); check(await a.getByRole("radio", { name: "Mehrojiddin (vaqtsiz)" }).count() === 0, `${tag}: «Tez» rejimida «Mehrojiddin» yo'q`); await a.getByRole("radio", { name: /^Standart/ }).first().click(); await a.getByRole("radio", { name: "Mehrojiddin (vaqtsiz)" }).click(); }
  await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim(); const room = x.rooms.rooms.get(code)!;
  check(room.turnSeconds === 0, `${tag}: serverda xona vaqtsiz (turnSeconds ${room.turnSeconds})`);
  check(await a.getByTestId("lobby-turn").innerText().then((s) => /Mehrojiddin/.test(s)), `${tag}: lobbida «Mehrojiddin» belgisi`);
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  await a.waitForTimeout(1500);
  const cur = room.state!.players[room.state!.turn % room.state!.players.length].id, turn = room.state!.turn;
  check(await a.locator("[role=timer]").count() === 0, `${tag}: taymer halqasi yo'q`);
  const body = await a.locator("body").innerText(); check(!/soniyada kubik tashlanmasa/.test(body) && !/soniya ichida/.test(body), `${tag}: «N soniyada…» yozuvi yo'q`);
  if (cur === "ut" + tag && tag === "tel") check(/vaqt cheklovi yo'q/.test(body), `${tag}: navbat sizda — «vaqt cheklovi yo'q» ko'rsatmasi`);
  await a.waitForTimeout(13000); // kubik muddati 10 s edi
  check(room.state!.turn === turn && room.deadline === null, `${tag}: 13 soniyadan keyin ham navbat o'tmadi, muddat yo'q`);
  await c.close();
}
await b.close(); await x.app.close(); console.log(failed ? `VAQTSIZ: ${failed} ta xato` : "VAQTSIZ: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
