import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
// Brauzer skriptlari uchun: dev foydalanuvchi (`addInitScript` ga berilgan uid) uchun profil (ism) oldindan yaratiladi — ism majburiy, profilsiz bosh sahifa o'rniga ism so'raladi.
export function autoProfiles(x: { profiles: { put(id: string, p: unknown): unknown; get(id: string): unknown } }, b: { newContext: (...a: any[]) => Promise<any> }) {
  const orig = b.newContext.bind(b);
  b.newContext = async (...a: any[]) => {
    const c = await orig(...a); const oi = c.addInitScript.bind(c);
    // Mavjud skriptlar hisobni avtomatik rejimda va 2 kishilik xonada sinaydi (o'quv rejimi alohida `calc-check` skriptida): bot kabi tugma bosib o'tadi
    c.addInitScript = (fn: unknown, arg: unknown) => { if (typeof arg === "string" && arg && process.env.ROLLMODAL !== "1") oi(() => localStorage.setItem("tajriba24-roll-modal", "off")); /* majburiy o'quv to'sig'i: faqat «new…» foydalanuvchilarda yoqiq (onboarding tekshiruvi), qolganlarda o'chiq */ { const uid = typeof arg === "string" ? arg : Array.isArray(arg) && typeof arg[0] === "string" ? arg[0] : ""; if (uid && !uid.startsWith("new")) oi(() => localStorage.setItem("tajriba24-tutorial-done", "1")); } /* kubik oynasi (modal) faqat unga bag'ishlangan tekshiruvlarda yoqiladi (ROLLMODAL=1): boshqa skriptlar sahifadagi tugma bilan ishlaydi */ if (typeof arg === "string" && arg && process.env.CALC_MANUAL !== "1") { oi(() => localStorage.setItem("tajriba24-calc", "auto")); oi((n: string) => localStorage.setItem("tajriba24-seats", n), process.env.SEATS ?? "2"); } if (typeof arg === "string" && arg && !x.profiles.get(arg)) x.profiles.put(arg, { name: `Sinov ${arg.slice(-6)}`, color: [...arg].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 6, birthYear: 1990 }); return oi(fn, arg); };
    return c;
  };
}

/** Profilsiz (mehmon) foydalanuvchi uchun: ism so'ralsa to'ldirib davom etadi. */
export async function passGate(p: any, name = "Sinov", year = "1990") {
  const gate = p.getByTestId("gate-name"), home = p.getByRole("button", { name: /^Yangi o'yin/ });
  await Promise.race([gate.waitFor({ timeout: 15000 }).catch(() => {}), home.waitFor({ timeout: 15000 }).catch(() => {})]);
  if (await gate.count()) { await gate.fill(name); await p.getByTestId("gate-year").fill(year); await p.getByRole("button", { name: "Davom etish" }).click(); }
}

/** Uzoq kutadigan brauzer tekshiruvlari uchun: xona taymerlari ×10 (server o'zi kubik tashlab/karta o'tkazib yubormasin). Faqat test. */
export function slowTimers(x: { rooms: unknown }, room: any) { room.turnSeconds = 300; room.armKey = null; (x.rooms as any).arm(room); }

/** axe-core manbasi + o'rama: tekshiruvdan oldin ishlab turgan animatsiyalar (toast/oyna kirish effekti) tugashini kutadi. Beqarorlik sababi (10-band): animatsiya o'rtasida tugma o'lchami vaqtincha kichik bo'lib, `target-size` qoidasi tasodifan yiqilardi. */
export function axeSource(): string {
  const src = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf-8");
  return src + `;(function(){const run=axe.run.bind(axe);axe.run=async function(...a){for(let i=0;i<50;i++){const an=document.getAnimations?document.getAnimations().filter(function(x){return x.playState==="running"&&x.effect&&x.effect.getTiming().iterations!==Infinity}):[];if(!an.length)break;await new Promise(function(r){setTimeout(r,100)})}await new Promise(function(r){requestAnimationFrame(function(){requestAnimationFrame(r)})});return run.apply(null,a)}})();`;
}

/** Javob kutayotgan so'rovlar oynasi (request-modal) oldinda turib, panel tugmalarini to'sib qo'yadi: «Keyinroq» bilan yopiladi. */
export async function dismissReq(p: any): Promise<void> {
  const b = p.getByTestId("request-modal").getByRole("button", { name: "Keyinroq" });
  if (await b.count()) await b.first().click().catch(() => {}); await p.waitForTimeout(150);
}

/** Do'stining xona kodi bilan qo'shilish: «Ochiq o'yinlar» bo'limi ostidagi kod maydoni (buyurtmachi qarori 2026-11-21: bosh sahifadagi alohida «Kod bilan qo'shilish» olib tashlandi). */
export async function joinByCode(p: any, code: string): Promise<void> {
  await p.getByRole("button", { name: /^Yangi o'yin/ }).waitFor({ timeout: 20000 });
  const input = p.getByTestId("rooms-code-input"); await input.waitFor({ timeout: 15000 });
  await input.fill(code);
  await p.getByTestId("rooms-code-go").click();
}

/** Kompyuter o'yin ekrani: «Qoidalar», «Hisob varag'i» va «Tarix» profil avatari menyusida. Tugma sarlavhada bo'lmasa (kompyuter) menyuni ochib bosadi. */
export async function clickMenuItem(p: any, testId: string): Promise<void> {
  const direct = p.getByTestId(testId);
  if (!(await direct.count())) { await p.getByTestId("profile-menu-open").click(); await p.getByTestId(testId).waitFor({ timeout: 4000 }); }
  await p.getByTestId(testId).click();
}


/** Telefonda xona sozlamalari yig'iq turadi («Xona sozlamalari» qatori): kerak bo'lsa ochadi. */
export async function openOpts(p: any): Promise<void> {
  const o = p.getByTestId("home-opts"); if (await o.count() && (await o.getAttribute("aria-expanded")) !== "true") await o.click();
}
