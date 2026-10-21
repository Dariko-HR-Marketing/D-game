import { existsSync, mkdirSync } from "node:fs";
// Hisob varag'idagi joylar (ko'chmas mulk 5 / kichik biznes 6 / katta biznes 7) va ixtiyoriy sotish. `OUT=papka pnpm tsx scripts/slots-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/slots";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844]] as [string, number, number][]) {
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk("sa" + tag), c = await mk("sb" + tag);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
  const room = x.rooms.rooms.get(code)!; const st = room.state!; const me = st.players.find((p: any) => p.id === "sa" + tag)!;
  const effects = Object.values(room.ctx.effects) as any[];
  const card = (asset: string) => effects.find((c) => c.effect?.kind === "buy" && c.effect.asset === asset && c.mode === "optional");
  const apt = card("apartment");
  // 5 ta ko'chmas mulk (yer/dala-hovli/kvartira aralash), 6 ta kichik biznes — joylar to'lgan
  const kinds = ["land", "dacha", "apartment", "land", "dacha"];
  me.assets = [...kinds.map((k, i) => ({ kind: k, code: `T-${k}-${i}`, price: 10_000, monthlyIncome: 100, creditPayment: 0, credit: 0 })),
    ...Array.from({ length: 6 }, (_, i) => ({ kind: "small_business", code: `T-kb-${i}`, price: 5000, monthlyIncome: 50, creditPayment: 0, credit: 0 })), { kind: "shares", code: "T-SH", price: 3000, monthlyIncome: 0, creditPayment: 0, credit: 0, shares: 10 }];
  me.cash = 500_000; st.turn = st.players.indexOf(me); st.pending = { type: "card", playerId: me.id, cardId: apt.id, deck: apt.deck };
  (x.rooms as any).emit(room); await a.waitForTimeout(1000);
  const banner = a.getByText(/Hisob varag'ida ko'chmas mulk uchun joy qolmagan/);
  check(await banner.count() > 0, `${tag} to'lgan hisob varag'i: ogohlantirish chiqdi`);
  await a.screenshot({ path: `${OUT}/${tag}-full.png` });
  // Serverga ham to'g'ridan-to'g'ri urinib ko'ramiz: qabul rad etilishi kerak
  const before = me.assets.length;
  const res: any = await (x.rooms as any).act(code, me.id, { type: "decide", playerId: me.id, accept: true } as any, room.seq).catch((e: any) => ({ ok: false, error: String(e) }));
  check(res && res.ok === false && res.error === "slot_full" && me.assets.length === before, `${tag} server ortiqcha xaridni rad etdi (slot_full)`);
  // Ixtiyoriy sotish: «Moliya amallari» ichida
  const actions = a.getByTestId("actions");
  if (tag === "tel") { await a.getByRole("button", { name: "Blank" }).click(); await a.waitForTimeout(400); }
  if (await a.getByText("Aktivni sotish").count() === 0) { await actions.getByText(/Moliya amallari/).first().click(); await a.waitForTimeout(400); }
  check(await a.getByText("Aktivni sotish").count() > 0, `${tag} «Aktivni sotish» bo'limi ko'rinadi`);
  const sellers = a.getByRole("button", { name: /^Sotish: T-/ });
  check(await sellers.count() === 11, `${tag} faqat ko'chmas mulk va bizneslar sotiladi (aksiya yo'q): ${await sellers.count()} ta`);
  await sellers.first().click(); await a.getByRole("button", { name: "Ha, sotaman" }).click(); await a.waitForTimeout(900);
  const now = room.state!.players.find((p: any) => p.id === me.id)!; // reduce holatni ko'chiradi — yangi ob'ekt
  check(now.assets.length === before - 1 && now.cash === 510_000, `${tag} sotildi: naqd +10 000, aktivlar ${now.assets.length}`);
  check(await a.getByText(/Hisob varag'ida ko'chmas mulk uchun joy qolmagan/).count() === 0, `${tag} joy bo'shagach ogohlantirish yo'qoldi`);
  if (tag === "tel") { await a.getByRole("button", { name: "Maydon" }).click(); await a.waitForTimeout(400); }
  const accept = a.getByRole("button", { name: /sh\.b\. olish/ }).first();
  check(await accept.count() > 0 && await accept.isEnabled(), `${tag} qabul qilish tugmasi yoqildi`);
  await a.screenshot({ path: `${OUT}/${tag}-freed.png` });
  // Qulaylik: «Aktivni sotish» ochiq, naqd 0 va bo'sh suyunchi tanlovi bilan axe buzilishlarsiz bo'lsin
  const other = st.players.find((p: any) => p.id !== me.id)!; room.state!.players.find((p: any) => p.id === me.id)!.cash = 0;
  room.state!.proposals.push({ id: 77, kind: "suyunchi", parent: other.id, given: [] }); (x.rooms as any).emit(room); await a.waitForTimeout(800);
  if (tag === "tel") { await a.getByRole("button", { name: "Blank" }).click(); await a.waitForTimeout(400); }
  if (await a.getByText("Aktivni sotish").count() === 0) { await actions.getByText(/Moliya amallari/).first().click(); await a.waitForTimeout(400); }
  await a.addScriptTag({ content: AXE });
  const ax = await a.evaluate(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } }).then((r) => r.violations.map((v) => v.id + " :: " + v.nodes.map((n) => n.html.slice(0, 120)).join(" | ")))`) as string[];
  check(ax.length === 0, `${tag} axe: buzilish yo'q ${ax.join(", ")}`);
  await a.context().close(); await c.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `XATO: ${failed}` : "hammasi OK"); process.exit(failed ? 1 : 0);
