// Admin panel rasmlari: `OUT=papka pnpm tsx scripts/screens-admin.ts` (oldindan: admin build va `cd admin/dist && python3 -m http.server 8082`).
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { buildApp } from "../src/app";
import { envAdminAuth } from "../src/admin";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
let total = 0;
const scan = async (p: any, name: string) => { await p.addScriptTag({ content: AXE }); const r = await p.evaluate(async () => (window as any).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } })); total += r.violations.length; console.log(name.padEnd(24), r.violations.length ? r.violations.map((v: any) => `${v.id}(${v.nodes.length}) ${v.nodes[0].html.slice(0, 90)}`).join(" | ") : "OK"); };

const WEB = process.env.ADMIN ?? "http://localhost:8082", OUT = process.env.OUT ?? "/tmp/shots-admin";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const x = buildApp({ adminAuth: envAdminAuth(JSON.stringify({ TOKENTOKENTOKEN: { id: "root", role: "administrator" } })) });
// ma'lumot
for (const u of ["ali", "bobur", "sara", "dilya"]) x.adminState.touch(u, Date.now() - 1000 * 60 * Math.random() * 600);
x.profiles.put("ali", { name: "Ali", color: 0, birthYear: 1990 }); x.profiles.put("bobur", { name: "Bobur", color: 1, birthYear: 1995 });
x.profiles.record({ room: "ABC234", finishedAt: Date.now(), durationMs: 3_600_000, rounds: 40, winner: "ali", contentVersion: 1, players: [{ id: "ali", bot: false, circle: "big", restarts: 0, won: true }, { id: "bobur", bot: false, circle: "small", restarts: 1, won: false }] });
x.adminState.addComplaint({ from: "bobur", against: "ali", room: "ABC234", text: "O'yin vaqtida haqorat qildi", at: Date.now() });
const r = x.rooms.create("ali"); if (r.ok) { x.rooms.join(r.code, "bobur"); await x.rooms.start(r.code, "ali", 5); }
await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
for (const [tag, w, h] of [["d", 1440, 900], ["n", 390, 844]] as [string, number, number][]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); await p.goto(WEB);
  await p.getByLabel("Kirish tokeni").waitFor({ timeout: 15000 }); await p.screenshot({ path: `${OUT}/${tag}-0-login.png` }); await scan(p, `login ${tag}`);
  await p.getByLabel("Kirish tokeni").fill("TOKENTOKENTOKEN"); await p.getByRole("button", { name: "Kirish", exact: true }).click(); await p.waitForTimeout(800);
  for (const [i, name] of ["Kontent", "Xonalar", "Foydalanuvchilar", "Shikoyatlar", "Analitika", "Audit"].entries()) {
    await p.getByRole("button", { name, exact: true }).click(); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${tag}-${i + 1}-${name}.png`, fullPage: true }); await scan(p, `${name} ${tag}`);
  }
  await p.getByRole("button", { name: "Foydalanuvchilar", exact: true }).click(); await p.waitForTimeout(400); await p.getByRole("button", { name: "Bloklash" }).first().click(); await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/${tag}-7-dialog.png` }); await scan(p, `dialog ${tag}`);
}
await b.close(); await x.app.close(); console.log(total === 0 ? "AXE: buzilish yo'q" : `AXE: ${total} ta buzilish`); process.exit(total === 0 ? 0 : 1);
