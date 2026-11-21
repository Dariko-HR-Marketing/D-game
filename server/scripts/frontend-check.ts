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
  { id: "r1", code: "AAA111", host: "Aziz", mode: "standard", turnSeconds: 60, seats: 6, players: 3, locked: false },
  { id: "r2", host: "Sinf 9-B", mode: "student", turnSeconds: 120, seats: 8, players: 5, locked: true },
  { id: "r3", code: "CCC333", host: "Jamoa", mode: "corporate", turnSeconds: 60, seats: 8, players: 8, locked: false },
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
  // 1) Bayroqsiz: ochiq o'yinlar yoqiq (server tayyor), Paketlar (to'lov) yopiq
  const off = await open("fcoff" + tag, null, ROOMS); await off.getByTestId("open-rooms").waitFor({ timeout: 8000 }); check(await off.getByTestId("room-options").count() === 1 && await off.getByTestId("home-packs").count() === 0, `${tag} bayroqsiz: ro'yxat va ko'rinish tanlovi bor, Paketlar yo'q (to'lov ulanmagan)`); await off.context().close();
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
  // 4b) Narx kiritilsa (serverdagi katalog): faqat Plus sotib olinadi, to'lov oynasi ochiladi; provayder ulanmagan bo'lsa «To'lash» yopiq
  x.commerce.setConfig({ plusMonthly: 29_000, plusYearly: 290_000 });
  if (tag === "tel") await pk.getByRole("button", { name: /^Paketlar/ }).first().click(); else await pk.getByTestId("home-packs").click();
  await pk.getByTestId("packs").waitFor({ timeout: 6000 }); await pk.getByRole("button", { name: "Sotib olish" }).first().waitFor({ timeout: 6000 });
  check(await pk.getByRole("button", { name: "Sotib olish" }).count() === 1, `${tag} narx kiritilgach faqat Plus «Sotib olish» bilan chiqadi`);
  await pk.getByRole("button", { name: "Sotib olish" }).click(); await pk.getByTestId("checkout").waitFor({ timeout: 4000 });
  check(await pk.getByRole("radio", { name: "Yillik" }).count() === 1 && await pk.getByRole("button", { name: "To'lash" }).isDisabled(), `${tag} to'lov oynasi: davr tanlovi bor, provayder ulanmagan — «To'lash» yopiq`);
  await pk.getByRole("button", { name: "Orqaga" }).last().click(); x.commerce.setConfig({ plusMonthly: null, plusYearly: null });
  await pk.getByRole("button", { name: "Orqaga" }).first().click(); await pk.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 6000 });
  await a.context().close();
}
// 5) Haqiqiy server: Student xonasi Qulfli yaratiladi, ro'yxatda kodsiz ko'rinadi, ikkinchi o'yinchi kod bilan kiradi
{
  const mkp = async (uid: string) => { const c = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }); await c.addInitScript((u: string) => { localStorage.setItem("tajriba24-dev-user", u); localStorage.setItem("tajriba24-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); await p.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); return p; };
  const A = await mkp("fcrealA"); await A.getByTestId("mode-student").click();
  check(await A.getByTestId("vis-locked").getAttribute("aria-checked") === "true", "haqiqiy server: Student tanlansa ko'rinish «Qulfli» bo'ladi");
  await A.getByTestId("home-new").click(); await A.waitForSelector("[data-testid=lobby-code]", { timeout: 15000 });
  const room = [...x.rooms.rooms.values()].find((r: any) => r.hostId === "fcrealA") as any;
  check(!!room && room.visibility === "locked" && room.kind === "student" && room.startMode === "host", "haqiqiy server: xona Qulfli, tur Student, boshlash «men»");
  const B = await mkp("fcrealB"); await B.getByTestId("room-row").first().waitFor({ timeout: 10000 });
  check(await B.getByTestId("room-row").count() === 1 && !(await B.locator("body").innerText()).includes(room.code), "haqiqiy server: B ro'yxatda qulfli xonani ko'radi, kod ko'rinmaydi");
  await B.getByRole("button", { name: /^Qulf · kod/ }).click(); const rl = B.getByTestId("open-rooms"); await rl.getByLabel("Xona kodi").fill(room.code); await rl.getByRole("button", { name: "Kirish" }).click();
  await B.waitForSelector("[data-testid=lobby-code]", { timeout: 15000 }); check(room.members.filter((m: any) => !m.bot).length === 2, "haqiqiy server: B kod bilan qulfli xonaga kirdi");
  await A.context().close(); await B.context().close();
}
// 6) «Davom etasizmi?»: faqat egasi uzoq turib qolsa so'raladi; «Ha, kutaman» zalni saqlaydi
{
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }); await c.addInitScript((u: string) => { localStorage.setItem("tajriba24-dev-user", u); localStorage.setItem("tajriba24-tours-off", "1"); }, "fcidle");
  const p = await c.newPage(); await p.goto(WEB); await p.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await p.getByTestId("home-new").click(); await p.waitForSelector("[data-testid=lobby-code]", { timeout: 15000 });
  const room = [...x.rooms.rooms.values()].find((r: any) => r.hostId === "fcidle") as any; const saved = { ...x.rooms.lobbyRules }; x.rooms.lobbyRules.soloMaxMs = 1; await new Promise((r) => setTimeout(r, 20)); await x.rooms.sweep(10 * 60_000);
  await p.getByTestId("idle-ask").waitFor({ timeout: 6000 }); check(!!room.idleAskAt, "«Davom etasizmi?»: egasiga oyna chiqdi");
  await p.getByRole("button", { name: "Ha, kutaman" }).click(); await p.waitForTimeout(600); check(await p.getByTestId("idle-ask").count() === 0 && room.idleAskAt === null && !room.endedAt, "«Ha, kutaman» bosilgach oyna yopildi va zal saqlandi");
  Object.assign(x.rooms.lobbyRules, saved); await c.close();
}
await b.close(); await x.app.close(); console.log(failed ? `FRONTEND: ${failed} ta xato` : "FRONTEND: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
