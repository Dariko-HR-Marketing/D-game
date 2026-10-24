import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
// Ovozli aloqa (WebRTC): ikki brauzer o'rtasida haqiqiy P2P audio (soxta mikrofon), kim gapiryapti, mikrofonni o'chirish, faqat tinglash, 16 yoshgacha yopiq, chiqish.
// `OUT=papka WEB=http://localhost:8081 pnpm tsx scripts/voice-check.ts`
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081", OUT = process.env.OUT ?? "/tmp/voice";
process.env.CORS_ORIGINS = WEB; mkdirSync(OUT, { recursive: true });
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const year = new Date().getFullYear(); const until = async (f: () => Promise<boolean>, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 150)); } return false; };
for (const [tag, w, h] of [["kmp", 1440, 900], ["tel", 390, 844], ["yot", 844, 390]] as [string, number, number][]) {
  const A = "va" + tag, B = "vb" + tag, C = "vc" + tag, K = "vk" + tag;
  x.profiles.put(A, { name: "Sardor", color: 0, birthYear: 1990 }); x.profiles.put(B, { name: "Bobur", color: 1, birthYear: 1992 }); x.profiles.put(C, { name: "Dilya", color: 3, birthYear: 1995 }); x.profiles.put(K, { name: "Bolajon", color: 2, birthYear: year - 12 });
  const mk = async (uid: string, deny = false) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce", permissions: ["microphone"] }); await c.addInitScript(([u, d]) => { localStorage.setItem("poyga-dev-user", u as string); localStorage.setItem("poyga-tours-off", "1"); localStorage.removeItem("poyga-voice-muted"); const O = window.RTCPeerConnection; (window as any).__pcs = []; (window as any).RTCPeerConnection = function (...a: any[]) { const pc = new (O as any)(...a); (window as any).__pcs.push(pc); return pc; } as any; (window as any).RTCPeerConnection.prototype = O.prototype; if (d) navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error("denied"), { name: "NotAllowedError" })); }, [uid, deny]); const p = await c.newPage(); await p.goto(WEB); return p; };
  const a = await mk(A), bb = await mk(B), cc = await mk(C, true), k = await mk(K);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 15000 }); await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.waitForSelector("text=O'yinchilar");
  const code = (await a.locator("[aria-label^='Xona kodi']").textContent())!.trim();
  for (const p of [bb, cc, k]) { await p.getByRole("button", { name: /^Kod bilan qo'shilish/ }).click(); await p.getByRole("textbox").fill(code); await p.getByRole("button", { name: "Kirish", exact: true }).click(); await p.waitForSelector("text=Xona egasi"); }
  await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await a.waitForSelector("text=Orzuingizni tanlang");
  for (const p of [a, bb, cc, k]) { await p.waitForSelector("text=Orzuingizni tanlang"); await p.getByRole("button", { name: "Tanlash" }).first().click(); }
  for (const p of [a, bb, cc, k]) await p.waitForSelector("text=Naqd", { timeout: 20000 });
  const room = x.rooms.rooms.get(code)!;
  const people = async (p: any) => { if (!(await p.getByTestId("voice-people").count())) await p.getByTestId("voice-people-toggle").click(); }; // past ekranda ro'yxat yig'iq turadi
  const open = async (p: any) => { if (!(await p.getByRole("dialog", { name: "Chat" }).count())) await p.getByTestId("chat-open").click(); await p.getByRole("dialog", { name: "Chat" }).waitFor(); };
  // 1) Ikki kishi ovozga qo'shiladi
  await open(a); await open(bb); await a.getByRole("button", { name: "Ovozga qo'shilish" }).click(); await bb.getByRole("button", { name: "Ovozga qo'shilish" }).click();
  check(await until(async () => room.voice?.size === 2), `${tag}: server ovozdagilarni biladi (${[...(room.voice ?? [])].join(",")})`);
  await a.getByTestId("voice-people-toggle").waitFor(); await people(a); await people(bb);
  const peerA = a.getByTestId(`voice-peer-${B}`), peerB = bb.getByTestId(`voice-peer-${A}`);
  check(await until(async () => /ulangan|gapiryapti/.test(await peerA.innerText()) && /ulangan|gapiryapti/.test(await peerB.innerText()), 30000), `${tag}: ikki tomon ham P2P ulandi («${await peerA.innerText().catch(() => "")}»)`);
  check(await until(async () => /Ovozda: 2/.test(await a.getByTestId("voice").innerText())), `${tag}: «Ovozda: 2» ko'rinadi`);
  // 2) Ovoz haqiqatan o'tadi: soxta mikrofon signali uzoq tomonda «gapiryapti» deb ko'rinadi
  check(await until(async () => /gapiryapti/.test(await peerA.innerText()), 20000), `${tag}: ${"Bobur"} gapirishi Sardorda ko'rinadi (audio keldi)`);
  // 3) Mikrofonni o'chirish: sarlavhadagi tugma
  await a.getByTestId("chat-close").click(); await a.waitForTimeout(300);
  const hm = a.getByTestId("voice-header-mic"); check(await hm.getAttribute("aria-checked") === "true", `${tag}: sarlavhada mikrofon tugmasi (yoniq)`);
  await hm.click(); await a.waitForTimeout(400); check(await hm.getAttribute("aria-checked") === "false", `${tag}: mikrofon o'chirildi`);
  check(await until(async () => !/gapiryapti/.test(await bb.getByTestId(`voice-peer-${A}`).innerText()), 6000), `${tag}: Sardor jim — Boburda «gapiryapti» yo'q`);
  await hm.click(); await a.waitForTimeout(300);
  // 4) Uchinchi: mikrofonga ruxsatsiz — faqat tinglash, baribir ulanadi
  await open(cc); await cc.getByRole("button", { name: "Ovozga qo'shilish" }).click(); await cc.waitForTimeout(800);
  await people(cc);
  check(/Mikrofonga ruxsat berilmadi/.test(await cc.getByTestId("voice-error").innerText().catch(() => "")), `${tag}: ruxsat berilmasa tushunarli xabar`);
  check(await until(async () => room.voice?.size === 3), `${tag}: ruxsatsiz o'yinchi ham ovozda (tinglovchi)`);
  const dump = async (p: any) => p.evaluate(() => ((window as any).__pcs as RTCPeerConnection[]).map((q) => `${q.signalingState}/${q.connectionState}/${q.iceConnectionState}/${q.iceGatheringState}`).join(" | "));
  if (process.env.DUMP) { await cc.waitForTimeout(8000); console.log("DUMP a", await dump(a), "\nDUMP b", await dump(bb), "\nDUMP c", await dump(cc)); }
  check(await until(async () => /ulangan|gapiryapti/.test(await cc.getByTestId(`voice-peer-${A}`).innerText()) && /ulangan|gapiryapti/.test(await cc.getByTestId(`voice-peer-${B}`).innerText()), 30000), `${tag}: tinglovchi ikkalasiga ulandi`);
  await open(a); await people(a);
  check(await until(async () => (await a.getByTestId(`voice-peer-${C}`).count()) === 1), `${tag}: Sardor tinglovchini ro'yxatda ko'radi`);
  // 5) Jim qilish (qurilmada)
  await open(a); await people(a); await a.getByTestId(`voice-peer-mute-${B}`).click(); await a.waitForTimeout(300); check(/mikrofon o'chiq/.test(await a.getByTestId(`voice-peer-${B}`).innerText()), `${tag}: boshqani jim qilish (qurilmada)`);
  await a.getByTestId(`voice-peer-mute-${B}`).click();
  // 6) 16 yoshgacha yopiq
  await open(k); check(await k.getByTestId("voice-restricted").isVisible() && await k.getByRole("button", { name: "Ovozga qo'shilish" }).count() === 0, `${tag}: bolaga ovoz yopiq (izoh ko'rinadi, tugma yo'q)`);
  const rj = x.rooms.voice(code, K, "join"); check(!rj.ok && (rj as any).error === "voice_restricted", `${tag}: server bolani ovozga qo'shmaydi`);
  // 7) Sig'ish va a11y
  const ov = await a.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check(ov <= 1, `${tag}: gorizontal aylanish yo'q (${ov})`);
  await a.screenshot({ path: `${OUT}/${tag}-1-ovoz.png` }); await k.screenshot({ path: `${OUT}/${tag}-2-bola.png` });
  await a.addScriptTag({ content: AXE }); const ax = await a.evaluate(`axe.run(document.querySelector('[data-testid="chat"]'), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } }).then((r) => r.violations.map((v) => v.id + "(" + v.nodes.length + ") " + v.nodes.slice(0, 2).map((n) => n.target.join(">")).join(";")))`) as string[];
  check(ax.length === 0, `${tag}: axe — buzilish yo'q ${ax.join(" | ")}`);
  // 8) Chiqish va uzilish
  await a.getByTestId("voice-leave").click(); check(await until(async () => !room.voice?.has(A)), `${tag}: ovozdan chiqish serverga yetdi`);
  check(await until(async () => (await bb.getByTestId(`voice-peer-${A}`).count()) === 0), `${tag}: boshqalarda ro'yxatdan o'chdi`);
  await bb.context().close(); check(await until(async () => !room.voice?.has(B), 8000), `${tag}: brauzer yopilsa ovozdan chiqadi`);
  for (const p of [a, cc, k]) await p.context().close();
}
await b.close(); await x.app.close(); console.log(failed ? `VOICE: ${failed} ta xato` : "VOICE: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
