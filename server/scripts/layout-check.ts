import { existsSync } from "node:fs";
// Telefon va kompyuter tartibi: bosh sahifa scrollsiz (sozlamalar yig'iq, plitkalar), profil bitta joyda (pastki menyu), qoidalar akkordion (4 bo'lim, bosh sahifaga sig'adi),
// Reyting podium+jadval, o'yin ichida vaqt paneli «Blank» tepasida va profil menyusi (Qoidalar, Tarix, Chat, Chiqish). `pnpm tsx scripts/layout-check.ts`
// (oldindan: client export:web va `cd client/dist && python3 -m http.server 8081`).
import { chromium } from "playwright-core";
import { buildApp } from "../src/app";
import { autoProfiles, openRoomsAcc, joinByCode, pickDream } from "./_seed";

const WEB = process.env.WEB ?? "http://localhost:8081";
process.env.CORS_ORIGINS = WEB;
const x = buildApp(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK    " : "XATO  "}${msg}`); if (!ok) failed++; };
const open = async (uid: string, w: number, h: number) => { const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" }); await c.addInitScript((u) => { localStorage.setItem("tajriba24-dev-user", u); localStorage.setItem("tajriba24-tours-off", "1"); }, uid); const p = await c.newPage(); await p.goto(WEB); return p; };
const overflow = (p: any) => p.evaluate(() => { const e = document.scrollingElement!; const vs = [...document.querySelectorAll("*")].filter((n: any) => n.scrollHeight > n.clientHeight + 4 && ["auto", "scroll"].includes(getComputedStyle(n).overflowY)); return { doc: e.scrollHeight - e.clientHeight, inner: Math.max(0, ...vs.map((n: any) => n.scrollHeight - n.clientHeight)) }; });

for (const [tag, w, h] of [["tel", 390, 844], ["kmp", 1440, 900]] as [string, number, number][]) {
  const a = await open("lay" + tag, w, h);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 20000 });
  if (tag === "tel") {
    // 1) Bosh sahifa: bitta ekranga sig'adi; profil faqat pastki menyuda; alohida «Kod bilan qo'shilish» va Reyting/Qoidalar qatorlari yo'q
    await a.waitForTimeout(500); const ov = await overflow(a); check(ov.doc <= 4 && ov.inner <= 4, `${tag} bosh sahifa scrollsiz (hujjat ${ov.doc}, ichki ${ov.inner})`);
    check(await a.getByTestId("home-opts").getAttribute("aria-expanded") === "false" && await a.getByTestId("rooms-acc").getAttribute("aria-expanded") === "false", `${tag} «Sozlamalar» va «Ochiq o'yinlar» yig'iq akkordion`);
    check(await a.getByRole("button", { name: "Profil", exact: true }).count() === 1, `${tag} «Profil» faqat bir joyda (pastki menyu)`);
    check(await a.getByRole("button", { name: /^Kod bilan qo'shilish/ }).count() === 0 && (await a.getByTestId("rooms-code-input").count()) === 0, `${tag} alohida «Kod bilan qo'shilish» va doimiy kod maydoni yo'q`);
    check(await a.getByTestId("home-tiles").count() === 1 && await a.getByRole("button", { name: /^Turnirlar/ }).count() === 1, `${tag} plitkalar: Turnirlar, Sinf, Do'kon`);
    check(await a.getByTestId("seats-4").count() === 0, `${tag} sozlamalar yig'iq turadi`);
    await a.getByTestId("home-opts").click(); check(await a.getByTestId("seats-4").count() === 1 && await a.getByTestId("turn-60").count() === 1, `${tag} «Sozlamalar» ochilganda hammasi bor`);
    check(await a.getByTestId("rooms-acc").getAttribute("aria-expanded") === "false", `${tag} akkordionlar: «Sozlamalar» ochilganda «Ochiq o'yinlar» yopiq`);
    await a.getByTestId("rooms-acc").click(); check(await a.getByTestId("home-opts").getAttribute("aria-expanded") === "false" && await a.getByTestId("rooms-acc").getAttribute("aria-expanded") === "true", `${tag} akkordionlar: «Ochiq o'yinlar» ochilganda «Sozlamalar» yopiladi`);
    await a.getByTestId("home-opts").click();
    const txt = await a.locator("body").innerText(); for (const w of ["Ko'rinish", "Boshlash usuli", "Tezlik", "Men o'zim boshlayman", "To'lganda boshlansin", "Botlar bilan avtomatik"]) check(!txt.includes(w), `${tag} sozlamalarda «${w}» so'zi yo'q`);
    check(await a.getByTestId("room-options").count() === 0, `${tag} xona kirishi/boshlanishi tanlovi umuman yo'q`);
    check(await a.getByTestId("turn-60").count() === 1 && await a.getByTestId("turn-120").count() === 1 && await a.getByTestId("turn-0").count() === 1, `${tag} navbat vaqti: Odatiy, Sekin, Mehrojiddin kartalari`);
  } else {
    check(await a.getByRole("button", { name: "Profil", exact: true }).count() === 1, `${tag} «Profil» faqat bir joyda (chap menyu pastidagi karta)`);
    check(await a.getByRole("button", { name: /^Kod bilan qo'shilish/ }).count() === 0 && await a.getByTestId("rooms-code-input").count() === 0, `${tag} alohida «Kod bilan qo'shilish» va doimiy kod maydoni yo'q`);
  }
  // 2) Qoidalar: akkordion
  await a.getByRole("button", { name: "Qoidalar", exact: true }).first().click(); await a.waitForSelector("text=O'yin qoidalari");
  check(await a.getByTestId("rules-list").locator("[data-testid^=rules-group-head-]").count() === 4, `${tag} qoidalar 4 bo'limga yig'ilgan`);
  if (tag === "tel") { const ov2 = await overflow(a); check(ov2.doc <= 4, `${tag} qoidalar yig'iq holatda scrollsiz (${ov2.doc})`); }
  await a.getByTestId("rules-group-head-play").click(); await a.getByTestId("rule-head-turn").click();
  check(await a.getByTestId("rule-turn").getByText(/SPEC §5\.1/).count() === 1 && await a.getByTestId("rule-head-card").getAttribute("aria-expanded") === "false", `${tag} qoida ochildi, boshqasi yopiq`);
  await a.getByTestId("rule-head-card").click(); check(await a.getByTestId("rule-head-turn").getAttribute("aria-expanded") === "false", `${tag} ikkinchisi ochilganda birinchisi yopiladi`);
  await a.getByRole("button", { name: "Orqaga" }).click();
  // 3) Reyting
  await a.getByRole("button", { name: "Reyting", exact: true }).first().click(); await a.waitForSelector("text=Reyting");
  check(await a.getByText(/Reyting hali bo'sh/).count() === 1, `${tag} reyting sahifasi ochildi (bo'sh holat)`);
  await a.context().close();
}

// 4) O'yin ichida (telefon): vaqt paneli «Blank» tepasida, «Maydon»da yo'q; profil menyusi
{
  const a = await open("layg", 390, 844);
  await a.getByRole("button", { name: /^Yangi o'yin/ }).click(); await a.getByRole("button", { name: "O'yinni boshlash" }).click(); await pickDream(a); await a.waitForSelector("text=Naqd", { timeout: 60000 });
  check(await a.getByTestId("timebar").count() === 0, "o'yin (tel): «Maydon»da vaqt paneli yo'q");
  await a.getByRole("button", { name: /^Blank/ }).last().click(); await a.getByTestId("timebar").first().waitFor({ timeout: 4000 });
  const tb = (await a.getByTestId("timebar").first().boundingBox())!, st = (await a.getByRole("group", { name: "Moliyaviy holat" }).first().boundingBox())!;
  check(tb.y < st.y, "o'yin (tel): «Blank» yorlig'ida vaqt paneli moliyaviy holatdan yuqorida");
  await a.getByRole("button", { name: /^Maydon/ }).last().click();
  check(await a.getByTestId("portfolio-open").count() === 1 && await a.getByTestId("sheet-open").count() === 1 && await a.getByTestId("live-open").count() === 0 && await a.getByTestId("chat-open").count() === 0 && await a.getByTestId("tour-help").count() === 0, "o'yin sarlavhasida faqat «Mening kartalarim», «Hisob varag'i» va profil; qolganlari menyuda");
  await a.getByTestId("profile-menu-open").click();
  for (const id of ["rules-open", "history-open", "chat-open", "live-open", "sound-toggle", "tour-help", "leave-open"]) check(await a.getByTestId(id).count() === 1, `o'yin (tel): profil menyusida ${id}`);
  await a.context().close();
}

// 6) «Yopiq maydon» galochkasi: belgilansa xona ro'yxatda qulfcha bilan chiqadi, kod ko'rsatilmaydi, kodsiz kirib bo'lmaydi
{
  const A = await open("layA", 390, 844), B = await open("layB", 1440, 900);
  await A.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 20000 });
  const tg = A.getByTestId("room-private"); check(await tg.count() === 1 && await tg.getAttribute("aria-checked") === "false", "yopiq xona galochkasi bor, Standartda belgilanmagan");
  await tg.click(); check(await tg.getAttribute("aria-checked") === "true", "galochka belgilandi");
  await A.getByRole("button", { name: /^Yangi o'yin/ }).click(); await A.waitForSelector("[data-testid=lobby-code]", { timeout: 15000 });
  const code = (await A.locator("[aria-label^='Maydon kodi']").textContent())!.trim(); const room = x.rooms.rooms.get(code)!;
  check(room.visibility === "locked", "serverda xona qulfli (kod bilan)");
  await B.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 20000 }); await B.getByTestId("room-lock").first().waitFor({ timeout: 10000 }).catch(() => {});
  check(await B.getByTestId("room-lock").count() >= 1 && !(await B.locator("body").innerText()).includes(code), "ro'yxatda qulfcha ikonkasi bor, kod ko'rinmaydi");
  await B.getByTestId("room-lock").first().click(); const inp = B.getByLabel("Maydon kodi").first(); await inp.waitFor({ timeout: 4000 });
  check(await B.getByRole("button", { name: "Kirish", exact: true }).isDisabled(), "kodsiz «Kirish» o'chiq: kira olmaydi");
  await inp.fill("ZZZZZZ"); await B.getByRole("button", { name: "Kirish", exact: true }).click(); await B.waitForTimeout(1500);
  check(await B.getByTestId("lobby-code").count() === 0 && room.members.filter((m: any) => !m.bot).length === 1, "noto'g'ri kod bilan kirib bo'lmaydi");
  await joinByCode(B, code); await B.waitForSelector("[data-testid=lobby-code]", { timeout: 15000 });
  check(room.members.filter((m: any) => !m.bot).length === 2, "to'g'ri kod bilan kirildi");
  await A.context().close(); await B.context().close();
}
// 5) Qat'iy qoida: telefon yotiq holatda o'yinni ko'rsatmaydi — «Telefonni tik tuting»; tik holatda — o'yin; planshet va kompyuterda ko'rsatma yo'q
{
  const mk = async (w: number, h: number, mobile: boolean) => { const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, reducedMotion: "reduce" }); await c.addInitScript(() => { localStorage.setItem("tajriba24-dev-user", "layo"); localStorage.setItem("tajriba24-tours-off", "1"); }); const p = await c.newPage(); await p.goto(WEB); return p; };
  const ph = await mk(844, 390, true); await ph.waitForTimeout(1200);
  check(await ph.getByTestId("orient-guard").count() === 1 && /Telefonni tik tuting/.test(await ph.getByTestId("orient-guard").innerText()), "telefon yotiq: «Telefonni tik tuting» ko'rsatmasi, o'yin yotiq ko'rinishga o'tmaydi");
  await ph.setViewportSize({ width: 390, height: 844 }); await ph.waitForTimeout(800);
  check(await ph.getByTestId("orient-guard").count() === 0, "telefon tik holatga qaytdi: ko'rsatma yo'qoldi");
  await ph.context().close();
  const tb = await mk(1024, 768, true); await tb.waitForTimeout(1200); check(await tb.getByTestId("orient-guard").count() === 0, "planshet yotiq: ko'rsatma yo'q (qoida faqat telefon uchun)"); await tb.context().close();
  const dk = await mk(1440, 900, false); await dk.waitForTimeout(800); check(await dk.getByTestId("orient-guard").count() === 0, "kompyuter: ko'rsatma yo'q"); await dk.context().close();
}
await b.close(); await x.app.close();
console.log(failed ? `XATO: ${failed}` : "hammasi o'tdi"); process.exit(failed ? 1 : 0);
