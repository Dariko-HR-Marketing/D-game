// Klublar va 16 yoshgacha kod maydoni: Premium klub yaratadi, bepul foydalanuvchi kod bilan qo'shiladi, reyting; bola ro'yxat o'rniga kod maydonini ko'radi.
import { existsSync } from "node:fs";
import { chromium } from "playwright-core";
import { autoProfiles } from "./_seed";
import { buildApp } from "../src/app";
const WEB = process.env.WEB ?? "http://localhost:8081"; process.env.CORS_ORIGINS = WEB;
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK   " : "XATO "} ${msg}`); if (!ok) failed++; };
const x = buildApp(); await x.ready; await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
const ctx = async (u: string, w = 1280, h = 900) => { const c = await b.newContext({ viewport: { width: w, height: h } }); await c.addInitScript((id) => { localStorage.setItem("tajriba24-dev-user", id); localStorage.setItem("tajriba24-tours-off", "1"); localStorage.setItem("tajriba24-tutorial-done", "1"); }, u); return c; };
const openClubs = async (p: any) => { await p.getByTestId("home-clubs").first().waitFor({ timeout: 20000 }); await p.getByTestId("home-clubs").first().click(); await p.getByText("Klub kodi", { exact: true }).first().waitFor({ timeout: 8000 }).catch(() => {}); };
// Premium klub yaratadi
x.commerce.ents.set("clp", { ...x.commerce.ent("clp"), premiumUntil: Date.now() + 86_400_000, premiumPlan: "monthly" });
const a = await (await ctx("clp")).newPage(); await a.goto(WEB); await openClubs(a);
await a.getByTestId("club-name").fill("Do'stlar"); await a.getByRole("button", { name: "Yaratish" }).click(); await a.getByText("Do'stlar", { exact: false }).first().waitFor({ timeout: 8000 });
const club = x.clubs.items.values()[0]; check(!!club && club.name === "Do'stlar", "Premium: klub yaratildi");
await a.getByTestId(`club-${club.id}`).click(); await a.getByTestId("club-share-code").waitFor({ timeout: 5000 }); check((await a.getByTestId("club-share-code").innerText()).trim() === club.code, "klub kodi ko'rinadi (do'stlarga yuborish uchun)");
// bepul foydalanuvchi qo'shiladi; yaratish Premium'ga yopiq
const f = await (await ctx("clf", 390, 844)).newPage(); await f.goto(WEB); await openClubs(f);
check(await f.getByText("Klub yaratish Premium paketda", { exact: false }).count() > 0, "bepul foydalanuvchida «Klub yaratish Premium'da» tushuntirishi");
await f.getByTestId("club-code").fill(club.code); await f.getByRole("button", { name: "Qo'shilish" }).click(); await f.getByText("2 a'zo").first().waitFor({ timeout: 8000 }); check(true, "bepul foydalanuvchi kod bilan qo'shildi (2 a'zo)");
await f.getByTestId(`club-${club.id}`).click(); await f.getByText("(siz)").first().waitFor({ timeout: 6000 }); check(true, "klub reytingida «(siz)» belgisi");
// 16 yoshgacha: ro'yxat yopiq, kod maydoni bor; klubga kira olmaydi
await fetch("http://127.0.0.1:3000/me/profile", { method: "PUT", headers: { authorization: "Bearer clk", "content-type": "application/json" }, body: JSON.stringify({ name: "Bola", color: 2, birthYear: new Date().getFullYear() - 12 }) });
const kc = await b.newContext({ viewport: { width: 390, height: 844 } }); await kc.addInitScript("localStorage.setItem('tajriba24-dev-user','clk'); localStorage.setItem('tajriba24-tours-off','1'); localStorage.setItem('tajriba24-tutorial-done','1');");
const k = await kc.newPage(); await k.goto(WEB); await k.getByRole("button", { name: /^Ochiq o'yinlar/ }).first().waitFor({ timeout: 20000 }); await k.getByRole("button", { name: /^Ochiq o'yinlar/ }).first().click();
await k.screenshot({ path: "/tmp/kid.png" }); check(await k.getByTestId("kid-code").waitFor({ timeout: 8000 }).then(() => true, () => false), "16 yoshgacha: ro'yxat o'rniga kod maydoni");
await b.close(); await x.app.close(); console.log(failed ? `KLUB: ${failed} ta xato` : "KLUB: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
