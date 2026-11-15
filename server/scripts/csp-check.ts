import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
// Content-Security-Policy tekshiruvi (3-band): Caddyfile dagi APP siyosati MAJBURIY rejimda haqiqiy brauzerda sinaladi.
// Mijoz (client/dist) shu siyosat bilan beriladi, API alohida origin'da (3000): yangi o'yin ochiladi, o'yin boshlanadi, orzu tanlash ekrani chiqadi.
// Birorta `securitypolicyviolation` hodisasi yoki CSP haqidagi konsol xatosi bo'lsa — XATO. `pnpm --filter @tajriba24/client export:web` dan keyin ishlaydi.
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const ROOT = new URL("../../", import.meta.url).pathname, DIST = join(ROOT, "client/dist");
const caddy = readFileSync(join(ROOT, "deploy/vps/Caddyfile"), "utf8");
const m = /header \{\$CSP_HEADER:Content-Security-Policy\} "([^"]+)"/.exec(caddy); if (!m) { console.log("XATO  Caddyfile da APP CSP topilmadi"); process.exit(1); }
const POLICY = m[1].replaceAll("https://{$API_DOMAIN}", "http://localhost:3000 http://127.0.0.1:3000").replaceAll("wss://{$API_DOMAIN}", "ws://localhost:3000 ws://127.0.0.1:3000");
if (POLICY.includes("{$")) { console.log("XATO  CSP da hal qilinmagan o'zgaruvchi qoldi:", POLICY); process.exit(1); }
const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".woff2": "font/woff2" };
const web = createServer((req, res) => {
  const p = join(DIST, decodeURIComponent((req.url ?? "/").split("?")[0])); const f = existsSync(p) && statSync(p).isFile() ? p : join(DIST, "index.html");
  res.writeHead(200, { "content-type": MIME[extname(f)] ?? "application/octet-stream", "content-security-policy": POLICY, "x-content-type-options": "nosniff", "x-frame-options": "DENY" }); res.end(readFileSync(f));
});
await new Promise<void>((r) => web.listen(0, "127.0.0.1", r)); // bo'sh port (CI da boshqa portlar band bo'lishi mumkin)
const WEB = `http://localhost:${(web.address() as { port: number }).port}`;
process.env.CORS_ORIGINS = WEB;
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const violations: string[] = [];
const c = await b.newContext({ viewport: { width: 1024, height: 768 }, reducedMotion: "reduce" });
await c.addInitScript((u) => { localStorage.setItem("tajriba24-dev-user", u); localStorage.setItem("tajriba24-tours-off", "1"); (window as any).__csp = []; document.addEventListener("securitypolicyviolation", (e) => (window as any).__csp.push(`${e.violatedDirective} ${e.blockedURI}`)); }, "csp-a");
const pg = await c.newPage();
pg.on("console", (msg) => { if (/Content Security Policy|violates the following/i.test(msg.text())) violations.push(msg.text().slice(0, 200)); });
await pg.goto(WEB);
await pg.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 20000 }); check(true, "bosh sahifa CSP bilan ochildi (skript, uslub, shrift)");
await pg.getByRole("button", { name: /^Yangi o'yin/ }).click(); await pg.waitForSelector("text=O'yinchilar", { timeout: 15000 }); check(true, "xona yaratildi (API fetch + WebSocket ruxsat etilgan)");
await pg.getByRole("button", { name: "O'yinni boshlash" }).click(); await pg.waitForSelector("text=Orzuingizni tanlang", { timeout: 20000 }); check(true, "o'yin boshlandi, orzu tanlash ekrani chiqdi (WS holati)");
await pg.waitForTimeout(500);
const dom = await pg.evaluate(() => (window as any).__csp as string[]);
check(dom.length === 0, `CSP buzilishi yo'q (${dom.slice(0, 3).join("; ")})`); check(violations.length === 0, `konsolda CSP xatosi yo'q (${violations.slice(0, 2).join("; ")})`);
// majburiylik haqiqatan ishlayotganini isbotlaymiz: ruxsat etilmagan tashqi skript bloklanadi
const blocked = await pg.evaluate(() => new Promise<string>((res) => { const s = document.createElement("script"); s.src = "https://example.com/x.js"; s.onerror = () => res("blocked"); s.onload = () => res("loaded"); document.head.appendChild(s); setTimeout(() => res("timeout"), 3000); }));
check(blocked === "blocked", `siyosat majburiy: tashqi skript bloklandi (${blocked})`);
await b.close(); await x.app.close(); web.close();
if (failed) { console.log(`XATO: ${failed}`); process.exit(1); } console.log("CSP: hammasi to'g'ri");
