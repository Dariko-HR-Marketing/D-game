import { existsSync } from "node:fs";
// Yangi frontend (bayroq bilan yoqiladi): ochiq o'yinlar ro'yxati, xona ko'rinishi, Paketlar. `pnpm tsx scripts/frontend-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`). Server `/rooms/open` hali yo'q: brauzerda javob qalbaki beriladi.
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles, axeSource } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081";
process.env.CORS_ORIGINS = WEB;
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
const AXE = axeSource();
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const ROOMS = { rooms: [
  { code: "AAA111", host: "Aziz", mode: "standard", turnSeconds: 60, seats: 6, players: 3, locked: false },
  { code: "BBB222", host: "Sinf 9-B", mode: "student", turnSeconds: 120, seats: 8, players: 5, locked: true },
  { code: "CCC333", host: "Jamoa", mode: "corporate", turnSeconds: 60, seats: 8, players: 8, locked: false },
] };
const scan = async (p: any, name: string) => { await p.addScriptTag({ content: AXE }); const r = await p.evaluate(async () => (window as any).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } })); check(r.violations.length === 0, `${name}: qulaylik buzilishi yo'q${r.violations.length ? " " + r.violations.map((v: any) => v.id + "(" + v.nodes.length + ")").join(",") : ""}`); };
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  const open = async (uid: string, flags: string | null, rooms: unknown | 404) => {
    const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
    await c.addInitScript((u: string) => { localStorage.setItem("tajriba24-dev-user", u); localStorage.setItem("tajriba24-tours-off", "1"); }, uid);
    if (flags) await c.addInitScript(() => localStorage.setItem("tajriba24-features", "rooms,billing"));
    await c.route("**/rooms/open", (r: any) => (rooms === 404 ? r.fulfill({ status: 404, contentType: "application/json", body: '{"error":"not_found"}' }) : r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(rooms) })));
    const p = await c.newPage(); await p.goto(WEB); await p.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 });
    if (tag === "tel") { const o = p.getByTestId("home-opts"); if (await o.count()) await o.click(); } return p;
  };
  // 1) Bayroq o'chiq: yangi bo'limlar yo'q
  const off = await open("fcoff" + tag, null, ROOMS); check(await off.getByTestId("open-rooms").count() === 0 && await off.getByTestId("room-options").count() === 0 && await off.getByTestId("home-packs").count() === 0, `${tag} bayroq o'chiq: ro'yxat, ko'rinish tanlovi va Paketlar yo'q`); await off.context().close();
  // 2) Bayroq yoqiq: ro'yxat
  const a = await open("fcon" + tag, "rooms,billing", ROOMS); await a.getByTestId("open-rooms").waitFor({ timeout: 8000 });
  await a.getByTestId("room-row").first().waitFor({ timeout: 8000 });
  check(await a.getByTestId("room-row").count() === 3, `${tag} ro'yxatda 3 xona`);
  check(await a.getByText("Aziz · Standart · Odatiy · 1 daqiqa · 3/6").count() === 1, `${tag} qator matni: egasi, tur, tezlik, o'rinlar`);
  check(await a.getByRole("button", { name: /^Qulf · kod/ }).count() === 1, `${tag} qulfli xonada «Qulf · kod» tugmasi`);
  check(await a.getByRole("button", { name: /^To'lgan/ }).isDisabled(), `${tag} to'lgan xonaga kirib bo'lmaydi`);
  await a.getByTestId("rooms-filter-student").click(); check(await a.getByTestId("room-row").count() === 1, `${tag} filtr: faqat Student`); await a.getByTestId("rooms-filter-all").click();
  await a.getByRole("button", { name: /^Qulf · kod/ }).click(); const rl = a.getByTestId("open-rooms"); await rl.getByLabel("Xona kodi").waitFor({ timeout: 4000 }).catch(() => {}); check(await rl.getByLabel("Xona kodi").count() === 1, `${tag} qulfli xona kod so'raydi`);
  check(await a.getByTestId("room-options").count() === 1 && await a.getByTestId("vis-open").getAttribute("aria-checked") === "true", `${tag} xona ko'rinishi: Standart uchun «Ochiq» tanlangan`);
  check(await a.getByTestId("start-bots").count() === 0, `${tag} botlar bilan boshlash faqat Yashirin xonada`);
  await a.getByTestId("vis-hidden").click(); check(await a.getByTestId("start-bots").count() === 1, `${tag} Yashirin tanlansa «Botlar bilan avtomatik» chiqadi`);
  await scan(a, `${tag} ro'yxat va xona ko'rinishi`);
  // 3) Server ro'yxatni bilmasa bo'lim yashirin
  const nf = await open("fcnf" + tag, "rooms,billing", 404); await nf.waitForTimeout(800); check(await nf.getByTestId("open-rooms").count() === 0, `${tag} server /rooms/open yo'q: bo'lim yashirin`); await nf.context().close();
  // 4) Paketlar
  const pk = a; const packs = pk.getByTestId("home-packs"); if (tag === "tel") await pk.getByRole("button", { name: /^Paketlar/ }).first().click(); else await packs.click();
  await pk.getByTestId("packs").waitFor({ timeout: 6000 });
  check(await pk.getByTestId("pack-plus-tbd").count() === 1 && await pk.getByRole("button", { name: "Sotib olish" }).count() === 0, `${tag} Paketlar: narx «aniqlanadi», «Sotib olish» yo'q`);
  check(await pk.getByTestId("pack-free").count() === 1 && await pk.getByTestId("pack-corpTeam").count() === 1, `${tag} Paketlar: bepul va korporativ paketlar bor`);
  await scan(pk, `${tag} Paketlar`);
  await pk.getByRole("button", { name: "Orqaga" }).click(); await pk.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 6000 }); check(true, `${tag} Paketlardan bosh sahifaga qaytish`);
  await a.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `FRONTEND: ${failed} ta xato` : "FRONTEND: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
