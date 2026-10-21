import { existsSync, mkdirSync, readFileSync } from "node:fs";
// Pastki menyu belgilari (telefon): navbat (qizil), taklif (qizil), yangi voqealar (yashil); bo'lim ochilganda tozalanadi. `OUT=papka pnpm tsx scripts/badges-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/badges";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: 390, height: 844 } }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
const a = await mk("bga"), c = await mk("bgb");
await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
const room = x.rooms.rooms.get(code)!; const st = room.state!;
const me = st.players.find((p: any) => p.id === "bga")!, other = st.players.find((p: any) => p.id === "bgb")!;
const turnOf = (p: any) => { st.turn = st.players.indexOf(p); };
const sync = async () => { (x.rooms as any).emit(room); await a.waitForTimeout(700); };
const nav = a.getByTestId("game-nav").or(a.locator("[role=navigation][aria-label='O\\'yin bo\\'limlari']"));
const badge = (tab: string) => nav.getByRole("button", { name: new RegExp(`^${tab}`) });
const dots = (tab: string, tone: string) => badge(tab).getByTestId(`nav-badge-${tone}`);
const txt = async (tab: string, tone: string) => (await dots(tab, tone).count()) ? (await dots(tab, tone).first().innerText()).trim() : null;

// 1) Boshqa bo'limdan navbat menda bo'lganda Maydon belgisi qizil
turnOf(other); await sync(); await a.getByRole("button", { name: /^Blank/ }).click(); await a.waitForTimeout(300);
check(await txt("Maydon", "urgent") === null, "navbat menda emas: Maydon belgisi yo'q");
turnOf(me); await sync();
check(await txt("Maydon", "urgent") === "1", "navbat menda: Maydon ustida qizil «1»");
check(/navbat sizda/.test(await badge("Maydon").getAttribute("aria-label") ?? ""), "ekran o'qish matni: «navbat sizda…»");

// 2) Taklif (qizil) va suyunchi (yashil) — Blank belgisi
await a.getByRole("button", { name: /^Maydon/ }).click(); turnOf(other);
st.proposals.push({ id: 91, kind: "loan", giver: me.id, receiver: other.id, amount: 100, months: 3 }); await sync();
check(await txt("Blank", "urgent") === "1", "menga qarz taklifi: Blank ustida qizil «1»");
st.proposals.push({ id: 92, kind: "suyunchi", parent: other.id, given: [] }); await sync();
check(await txt("Blank", "urgent") === "2", "taklif + suyunchi: son jami («2»), rang qizil");
check(/1 ta javob kutilmoqda, 1 ta yangilik/.test(await badge("Blank").getAttribute("aria-label") ?? ""), "ekran o'qish matni: javob va yangilik alohida");
await a.screenshot({ path: `${OUT}/blank-badge.png` });

// 3) Yangi voqealar — O'yinchilar belgisi (yashil)
st.logN = (st.logN ?? 0) + 3; st.log.push("x: bir", "x: ikki", "x: uch"); await sync();
check(await txt("O'yinchilar", "info") === "3", "3 ta yangi voqea: O'yinchilar ustida yashil «3»");
await a.screenshot({ path: `${OUT}/players-badge.png` });
await a.addScriptTag({ content: AXE });
const ax = await a.evaluate(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } }).then((r) => r.violations.map((v) => v.id + " :: " + v.nodes.map((n) => n.html.slice(0, 140)).join(" | ")))`) as string[];
check(ax.length === 0, `axe: buzilish yo'q ${ax.join(", ")}`);
await badge("O'yinchilar").click(); await a.waitForTimeout(500);
check(await a.getByText("So'nggi voqealar").count() > 0, "«So'nggi voqealar» endi O'yinchilar bo'limida");
check(await dots("O'yinchilar", "info").count() === 0, "bo'lim ochilgach O'yinchilar belgisi tozalandi");
await a.getByRole("button", { name: /^Maydon/ }).click(); await a.waitForTimeout(400);
check(await txt("O'yinchilar", "info") === null, "qaytib chiqqanda ham ko'rilgan voqealar qayta sanalmaydi");
// 4) Blank ochilganda doimiy bo'lmagan xabar tozalanadi; taklif esa javob berilguncha qoladi
await a.getByRole("button", { name: /^Blank/ }).click(); await a.waitForTimeout(300); await a.getByRole("button", { name: /^Maydon/ }).click(); await a.waitForTimeout(300);
check(await txt("Blank", "urgent") === "2", "taklif javob berilmaguncha belgi saqlanadi (ko'rish yetarli emas)");
st.proposals = []; await sync();
check(await txt("Blank", "urgent") === null && await txt("Blank", "info") === null, "taklif muddati tugagach belgi yo'qoladi");
await b.close(); await x.app.close(); console.log(failed ? `BADGES: ${failed} ta xato` : "BADGES: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
