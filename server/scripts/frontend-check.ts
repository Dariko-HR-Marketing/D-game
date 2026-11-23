import { existsSync } from "node:fs";
// Yangi frontend (bayroq bilan yoqiladi): ochiq o'yinlar ro'yxati, xona ko'rinishi, Paketlar. `pnpm tsx scripts/frontend-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`). Server `/rooms/open` hali yo'q: brauzerda javob qalbaki beriladi.
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles, axeSource, openRoomsAcc, openOpts } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081";
process.env.CORS_ORIGINS = WEB;
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
const AXE = axeSource();
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
// Haqiqiy server: kutayotgan va o'ynalayotgan xonalar oldindan yaratiladi (jonli ro'yxat WebSocket orqali keladi)
for (const [id, name] of [["sA", "Aziz"], ["sB", "Sinf 9-B"], ["sC", "Jamoa"], ["sD", "Dilnoza"], ["sE", "Eldor"]]) x.profiles.put(id, { name, color: 0, birthYear: 1990 } as any);
const seeded: string[] = [];
const mkRoom = (host: string, o: any, seats: number, fill: number, turn: 60 | 120 = 60) => { const r = x.rooms.create(host, undefined, turn, "auto", seats, "standard", o); if (!r.ok) throw new Error(r.error); for (let i = 0; i < fill; i++) x.rooms.join(r.code, `${host}f${i}`); seeded.push(r.code); return r.code; };
mkRoom("sA", { visibility: "open" }, 6, 2); mkRoom("sB", { kind: "student" }, 8, 4, 120); mkRoom("sC", { visibility: "open" }, 8, 7);
{ const p = mkRoom("sD", { visibility: "open" }, 2, 1); await x.rooms.start(p, "sD", 7); }
const scan = async (p: any, name: string) => { await p.addScriptTag({ content: AXE }); const r = await p.evaluate(async () => (window as any).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } })); check(r.violations.length === 0, `${name}: qulaylik buzilishi yo'q${r.violations.length ? " " + r.violations.map((v: any) => v.id + "(" + v.nodes.length + ")").join(",") : ""}`); };
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  const open = async (uid: string, flags: string | null) => {
    const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
    await c.addInitScript((u: string) => { localStorage.setItem("tajriba24-dev-user", u); localStorage.setItem("tajriba24-tours-off", "1"); }, uid);
    if (flags) await c.addInitScript(() => localStorage.setItem("tajriba24-features", "rooms,billing"));
    const p = await c.newPage(); await p.goto(WEB); await p.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 });
    if (tag === "tel") await openRoomsAcc(p); return p;
  };
  // 1) Bayroqsiz: ochiq o'yinlar yoqiq (server tayyor), Paketlar (to'lov) yopiq
  const off = await open("fcoff" + tag, null); await off.getByTestId("open-rooms").waitFor({ timeout: 8000 }); check(await off.getByTestId("room-options").count() === 0 && await off.getByTestId("home-packs").count() > 0, `${tag} bayroqsiz: ro'yxat bor, xona kirishi tanlovi yo'q, Paketlar bor (pilot: doim yoqiq)`); await off.context().close();
  // 2) Bayroq yoqiq: ro'yxat
  const a = await open("fcon" + tag, "rooms,billing"); await a.getByTestId("open-rooms").waitFor({ timeout: 8000 });
  await a.getByTestId("room-row").first().waitFor({ timeout: 8000 });
  check(await a.getByTestId("room-row").count() === 3, `${tag} ro'yxatda 3 xona`);
  { const rt = (await a.getByTestId("room-row").allInnerTexts()).join(" | "); check(/Aziz[\s\S]*Standart[\s\S]*Odatiy · 1 daqiqa[\s\S]*3\/6/.test(rt), `${tag} qator: egasi, tur, tezlik, o'rinlar (${rt.replace(/\s+/g, " ").slice(0, 120)})`); }
  check(await a.getByRole("button", { name: /^Qulf · kod/ }).count() === 1, `${tag} qulfli xonada «Qulf · kod» tugmasi`);
  check(await a.getByRole("button", { name: /^To'lgan/ }).isDisabled(), `${tag} to'lgan xonaga kirib bo'lmaydi`);
  await a.getByTestId("rooms-filter-student").click(); check(await a.getByTestId("room-row").count() === 1, `${tag} filtr: faqat Student`); await a.getByTestId("rooms-filter-all").click();
  await a.getByRole("button", { name: /^Qulf · kod/ }).click(); const rl = a.getByTestId("open-rooms"); await rl.getByLabel("Maydon kodi").waitFor({ timeout: 4000 }).catch(() => {}); check(await rl.getByLabel("Maydon kodi").count() === 1, `${tag} qulfli xona kod so'raydi`);
  check(await a.getByTestId("room-options").count() === 0 && await a.getByTestId("vis-open").count() === 0 && await a.getByTestId("start-bots").count() === 0, `${tag} xona kirishi va boshlanishi tanlovi yo'q (standart qiymatlar)`);
  check(await a.getByTestId("room-lock").count() === 1 && (await a.getByTestId("room-lock").innerText()).trim() === "", `${tag} qulfli xonada so'zsiz qulfcha ikonkasi`);
  check(/Onlayn/.test(await a.getByTestId("room-row").filter({ hasText: "Aziz" }).first().innerText()), `${tag} ochiq xonada «Onlayn» belgisi`);
  await scan(a, `${tag} ro'yxat va xona ko'rinishi`);
  // 3) Jonli: jami sonlar, o'ynalayotganlar ro'yxati va qayta yuklamasdan yangilanish
  { const tx = await a.getByTestId(tag === "tel" ? "rooms-acc" : "lobby-stats").innerText(); const sn = tx.replace(/\s+/g, " "); check(/3 ta maydon/.test(sn) && !/Kutmoqda|Kutayotgan|O'ynayapti|O'ynalmoqda/.test(sn), `${tag} ro'yxat xulosasi faqat xona soni: «${sn}»`); }
  { const body = await a.locator("body").innerText(); check(!/Kutmoqda|Kutayotgan|O'ynayapti|O'ynalmoqda|Onlayn: \d|Hozir o'ynalayotgan/.test(body) && await a.getByTestId("playing-row").count() === 0 && await a.getByTestId("rooms-status-playing").count() === 0, `${tag} o'ynayotgan o'yinlar va onlayn soni ro'yxatda yo'q`); check(await a.getByTestId("rooms-code-input").count() === 0, `${tag} doimiy kod maydoni yo'q (faqat qulfcha bosilganda)`); }
  const liveCode = mkRoom("sE", { visibility: "open" }, 4, 0); await a.getByText(/^Eldor$/).waitFor({ timeout: 5000 }).catch(() => {}); { const n4 = await a.getByTestId("room-row").count(); check(n4 === 4, `${tag} yangi xona ro'yxatga qayta yuklamasdan qo'shildi (jonli) [${n4}]`); }
  await x.rooms.forceClose(liveCode, "test"); await a.getByText(/^Eldor$/).waitFor({ state: "detached", timeout: 5000 }).catch(() => {}); check(await a.getByTestId("room-row").count() === 3, `${tag} xona yopilgach ro'yxatdan jonli yo'qoldi`);
  // 4) Paketlar
  const pk = a; const packs = pk.getByTestId("home-packs"); if (tag === "tel") await pk.getByRole("button", { name: /^Paketlar/ }).first().click(); else await packs.click();
  await pk.getByTestId("packs").waitFor({ timeout: 6000 });
  check(await pk.getByTestId("pack-plus-tbd").count() === 1 && await pk.getByTestId("pack-premium-tbd").count() === 1 && await pk.getByRole("button", { name: "Sotib olish" }).count() === 0, `${tag} Paketlar: narx «aniqlanadi», «Sotib olish» yo'q`);
  check(await pk.getByTestId("pack-start").count() === 1 && await pk.getByTestId("pack-org").count() === 1 && await pk.getByTestId("pack-coupon").count() === 1, `${tag} Paketlar: Start, Tashkilot va kupon bor`);
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
for (const c of seeded) await x.rooms.forceClose(c, "test"); await new Promise((r) => setTimeout(r, 600));
// 5) Haqiqiy server: Student xonasi Qulfli yaratiladi, ro'yxatda kodsiz ko'rinadi, ikkinchi o'yinchi kod bilan kiradi
{
  const mkp = async (uid: string) => { const c = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }); await c.addInitScript((u: string) => { localStorage.setItem("tajriba24-dev-user", u); localStorage.setItem("tajriba24-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); await p.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); return p; };
  const A = await mkp("fcrealA"); await openOpts(A); await A.getByTestId("mode-student").click();
  check(await A.getByTestId("room-private").getAttribute("aria-checked") === "true", "haqiqiy server: Student tanlansa «Yopiq maydon» galochkasi belgilanadi");
  await A.getByTestId("home-new").click(); await A.waitForSelector("[data-testid=lobby-code]", { timeout: 15000 });
  const room = [...x.rooms.rooms.values()].find((r: any) => r.hostId === "fcrealA") as any;
  check(!!room && room.visibility === "locked" && room.kind === "student" && room.startMode === "host", "haqiqiy server: xona Qulfli, tur Student, boshlash «men»");
  const B = await mkp("fcrealB"); await B.getByTestId("room-row").first().waitFor({ timeout: 10000 });
  check(await B.getByTestId("room-row").count() === 1 && !(await B.locator("body").innerText()).includes(room.code), "haqiqiy server: B ro'yxatda qulfli xonani ko'radi, kod ko'rinmaydi");
  await B.getByRole("button", { name: /^Qulf · kod/ }).click(); const rl = B.getByTestId("open-rooms"); await rl.getByLabel("Maydon kodi").fill(room.code); await rl.getByRole("button", { name: "Kirish" }).click();
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
