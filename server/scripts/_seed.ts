// Brauzer skriptlari uchun: dev foydalanuvchi (`addInitScript` ga berilgan uid) uchun profil (ism) oldindan yaratiladi — ism majburiy, profilsiz bosh sahifa o'rniga ism so'raladi.
export function autoProfiles(x: { profiles: { put(id: string, p: unknown): unknown; get(id: string): unknown } }, b: { newContext: (...a: any[]) => Promise<any> }) {
  const orig = b.newContext.bind(b);
  b.newContext = async (...a: any[]) => {
    const c = await orig(...a); const oi = c.addInitScript.bind(c);
    // Mavjud skriptlar hisobni avtomatik rejimda va 2 kishilik xonada sinaydi (o'quv rejimi alohida `calc-check` skriptida): bot kabi tugma bosib o'tadi
    c.addInitScript = (fn: unknown, arg: unknown) => { if (typeof arg === "string" && arg && process.env.CALC_MANUAL !== "1") { oi(() => localStorage.setItem("poyga-calc", "auto")); oi((n: string) => localStorage.setItem("poyga-seats", n), process.env.SEATS ?? "2"); } if (typeof arg === "string" && arg && !x.profiles.get(arg)) x.profiles.put(arg, { name: `Sinov ${arg.slice(-6)}`, color: [...arg].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 6, birthYear: 1990 }); return oi(fn, arg); };
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
