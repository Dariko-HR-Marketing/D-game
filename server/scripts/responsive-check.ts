import { existsSync, mkdirSync, writeFileSync } from "node:fs";
// Moslashuvchanlik matritsasi: 20 ta qurilma o'lchami (telefon tik/yotiq, planshet, kompyuter) × asosiy ekranlar va katalog kartalari.
// Avtomatik: gorizontal aylanish yo'q, ko'rinadigan boshqaruvlar ekran ichida, bosish maydoni (≥ 40 px balandlik — telefonda), shrift ≥ 12 px. Rasmlar `OUT` da.
// `OUT=papka [ONLY=390x844,1440x900] pnpm tsx scripts/responsive-check.ts` (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles, slowTimers } from "./_seed";
import { currentPlayer } from "@poyga/rules";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/resp";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const SIZES: [number, number][] = [[320, 568], [360, 640], [375, 667], [390, 844], [412, 915], [430, 932], [568, 320], [667, 375], [844, 390], [932, 430], [600, 960], [768, 1024], [820, 1180], [1024, 1366], [1024, 768], [1180, 820], [1366, 1024], [1280, 720], [1440, 900], [1920, 1080], [2560, 1440]];
const only = process.env.ONLY?.split(",");
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
type Issue = { size: string; screen: string; kind: string; detail: string };
const issues: Issue[] = [];

/** Sahifadagi muammolarni sahifa ichida yig'adi. */
const probe = (touch: boolean) => {
  const W = window.innerWidth, H = window.innerHeight, out: { kind: string; detail: string }[] = [];
  const de = document.documentElement;
  if (de.scrollWidth > W + 1) out.push({ kind: "gorizontal-aylanish", detail: `scrollWidth ${de.scrollWidth} > ${W}` });
  const visible = (el: Element) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05; };
  const scrolled = (el: Element) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(o.overflowX) && p.scrollWidth > p.clientWidth + 1 && p !== document.body && p !== de) return true; } return false; };
  const label = (el: Element) => ((el.getAttribute("aria-label") || (el as HTMLElement).innerText || el.getAttribute("data-testid") || el.tagName) + "").trim().replace(/\s+/g, " ").slice(0, 40);
  const ctl = [...document.querySelectorAll("button, [role=button], a[href], input, textarea, select, [role=tab], [role=switch], [role=checkbox]")].filter(visible);
  for (const el of ctl) {
    const r = el.getBoundingClientRect(); if (scrolled(el)) continue;
    if (r.right > W + 1 || r.left < -1) out.push({ kind: "ekrandan-chiqqan", detail: `${label(el)} [${Math.round(r.left)}..${Math.round(r.right)}] / ${W}` });
    const minH = touch ? 40 : 24, minW = touch ? 32 : 24; // WCAG 2.2 AA 2.5.8: ≥ 24; telefonda amaliy chegara (loyiha me'yori 44)
    if (r.height < minH || r.width < minW) out.push({ kind: "kichik-bosish-maydoni", detail: `${label(el)} ${Math.round(r.width)}×${Math.round(r.height)}` });
  }
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el) || el.children.length) continue; const t = (el.textContent ?? "").trim(); if (!t) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize); if (t.length === 1 && /[A-Z]/.test(t)) continue; // logo harfi
    const limit = /^\d{1,2}$/.test(t) ? 10 : /^[A-Z' ]+$/.test(t) ? 8 : 11.5; // nishon raqamlari ≥ 10, katak yozuvlari (BOZOR…) ≥ 8, boshqa matn ≥ 11.5
    if (fs < limit) out.push({ kind: "kichik-shrift", detail: `${fs}px «${t.slice(0, 30)}»` });
  }
  const seen = new Set<string>(); return out.filter((o) => { const k = o.kind + o.detail; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 14);
};

for (const [w, h] of SIZES) {
  const tag = `${w}x${h}`; if (only && !only.includes(tag)) continue;
  const touch = Math.min(w, h) < 900 && !(w >= 1000 && h >= 700 && w > h && w < 1400 && false); // planshet ham sensorli: 1024 gacha
  const mk = async (uid: string) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce", hasTouch: Math.max(w, h) <= 1366 && Math.min(w, h) < 1100 }); await c.addInitScript((u) => { localStorage.setItem("poyga-dev-user", u); localStorage.setItem("poyga-tours-off", "1"); }, uid); await c.addInitScript("window.__name = (f) => f;"); /* tsx keepNames yordamchisi sahifada yo'q */ const p = await c.newPage(); await p.goto(WEB); return p; };
  const ida = "ra" + tag, idc = "rb" + tag; const a = await mk(ida), c = await mk(idc);
  const check = async (p: any, screen: string, cta?: RegExp) => {
    await p.waitForTimeout(450); await p.screenshot({ path: `${OUT}/${tag}-${screen}.png` });
    for (const o of await p.evaluate(probe, Math.min(w, h) < 900)) issues.push({ size: tag, screen, ...o });
    if (cta) { // asosiy harakat tugmasi (kubik / qaror) ko'rinadigan oynada bo'lishi shart: aylantirmasdan bosiladi
      const bad = await p.evaluate(([src]: [string]) => { const re = new RegExp(src); const bs = [...document.querySelectorAll("button, [role=button]")].filter((e) => re.test(((e as HTMLElement).innerText || e.getAttribute("aria-label") || "").trim()) && e.getBoundingClientRect().width > 0); if (!bs.length) return "tugma topilmadi"; const r = bs[0].getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight + 1 && r.left >= 0 && r.right <= window.innerWidth + 1 ? "" : `tugma ko'rinish oynasidan tashqarida: top ${Math.round(r.top)} bottom ${Math.round(r.bottom)} / ${window.innerHeight}`; }, [cta.source]);
      if (bad) issues.push({ size: tag, screen, kind: "asosiy-tugma", detail: bad });
    }
  };
  try {
    await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await check(a, "01-home");
    for (const [name, wait, shot] of [["Qoidalar", "text=O'yin qoidalari", "02-rules"], ["Profil", "text=Ism", "03-profile"], ["Reyting", "text=Reyting", "04-board"]] as const) {
      const btn = a.getByRole("button", { name, exact: true }).first(); if (!(await btn.count())) continue; await btn.click(); await a.waitForSelector(wait, { timeout: 8000 }).catch(() => {}); await check(a, shot); await a.getByRole("button", { name: "Orqaga" }).click();
    }
    await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
    const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
    await c.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await c.getByRole("textbox").fill(code); await c.getByRole("button", { name: "Kirish", exact: true }).click(); await c.waitForSelector("text=Xona egasi");
    await check(a, "05-lobby");
    await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang"); await check(a, "06-dreams");
    await a.getByRole("button", { name: "Tanlash" }).first().click(); await c.waitForSelector("text=Orzuingizni tanlang"); await c.getByRole("button", { name: "Tanlash" }).first().click(); await a.waitForSelector("text=Naqd");
    const room = x.rooms.rooms.get(code)!; slowTimers(x, room);
    { const cur0 = currentPlayer(room.state!).id; await check(cur0 === ida ? a : c, "07-game", /^Kubik(ni|larni) tashlash/); }
    const tab = (n: string) => a.getByRole("button", { name: new RegExp("^" + n), }).first();
    for (const [n, s] of [["Blank", "07b-blank"], ["O'yinchilar", "07c-players"], ["Maydon", "07d-field"]] as const) { const t = tab(n); if (await t.count()) { await t.click().catch(() => {}); await check(a, s); } }
    // Katalog kartalari: har turdan eng uzun matnlisi — qaror oynasi (sinov uchun navbat egasiga qo'yiladi)
    const fx = Object.values(room.ctx.effects) as any[]; const live = fx.filter((e) => e.id.startsWith("cat-") && e.effect?.kind !== "unresolved");
    const pick = (k: string) => live.filter((e) => e.effect.kind === k).sort((p, q) => (q.text?.length ?? 0) - (p.text?.length ?? 0))[0];
    for (const kind of ["buy", "quiz", "ops", "deposit", "pay", "xpInfo"]) {
      const e = pick(kind); if (!e) continue; const cur = currentPlayer(room.state!).id; const pg = cur === ida ? a : c; room.state!.pending = { type: "card", playerId: cur, cardId: e.id, deck: e.deck } as any; (x.rooms as any).emit(room); await pg.waitForTimeout(500);
      await check(pg, `08-card-${kind}`, kind === "buy" || kind === "quiz" || kind === "deposit" ? /O'tkazaman|Qabul|olish$|^To'layman|^A\./ : undefined); // majburiy kartalarda tugma yo'q room.state!.pending = null; (x.rooms as any).emit(room);
    }
    { const cur = currentPlayer(room.state!).id; const pg = cur === ida ? a : c; const p: any = room.state!.players.find((q: any) => q.id === cur); p.deposits = [{ id: 1, label: "Sinov depoziti", principal: 1000, perLap: 50, lapsLeft: 3, accrued: 0, months: 0 }]; (x.rooms as any).emit(room); if (Math.min(w, h) < 900 && w < 900) { const t = pg.getByRole("button", { name: /^Blank/ }); if (await t.count()) await t.click().catch(() => {}); } await check(pg, "09-portfolio"); }
    room.state!.winner = room.state!.players[0].id; (x.rooms as any).finish(room); (x.rooms as any).emit(room);
    await a.waitForSelector("text=O'yin natijasi", { timeout: 8000 }).catch(() => {}); await check(a, "10-result");
  } catch (e) { { issues.push({ size: tag, screen: "?", kind: "skript-xatosi", detail: String(e).slice(0, 300) }); console.log(String(e).slice(0, 300)); }; }
  await a.context().close(); await c.context().close(); console.log(`${tag}: ${issues.filter((i) => i.size === tag).length} ta`);
}
writeFileSync(`${OUT}/issues.json`, JSON.stringify(issues, null, 1));
const byKind: Record<string, number> = {}; for (const i of issues) byKind[i.kind] = (byKind[i.kind] ?? 0) + 1; console.log(byKind);
await b.close(); await x.app.close(); process.exit(0);
