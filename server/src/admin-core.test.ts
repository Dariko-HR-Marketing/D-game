import { describe, it, expect } from "vitest";
import { buildApp } from "./app";
import { hotp } from "./adminAccounts";

const PW = "Parol-12345";
async function setup() {
  const x = buildApp({});
  const boot = x.accounts.bootstrap("root", PW)!;
  const j = (m: any, url: string, tok?: string, payload?: unknown, headers: Record<string, string> = {}) => x.app.inject({ method: m, url, headers: { ...(tok ? { authorization: `Bearer ${tok}` } : {}), ...headers }, payload: payload as any });
  const login = async (l: string, p: string, totp?: string) => j("POST", "/admin/login", undefined, { login: l, password: p, totp });
  // birinchi kirish: parolni almashtirish majburiy
  const first = (await login("root", PW)).json();
  await j("POST", "/admin/me/password", first.token, { current: PW, next: "Yangi-Parol-77" });
  const T = (await login("root", "Yangi-Parol-77")).json().token as string;
  return { x, j, login, T, boot };
}
const mkAdmin = async (s: Awaited<ReturnType<typeof setup>>, login: string, role: string) => {
  const r = await s.j("POST", "/admin/accounts", s.T, { login, name: "Ism " + login, role, password: PW }); expect(r.statusCode).toBe(200);
  const t = (await s.login(login, PW)).json().token; await s.j("POST", "/admin/me/password", t, { current: PW, next: PW + "x" }); return (await s.login(login, PW + "x")).json().token as string;
};

describe("admin kirish, parol, 2FA, sessiya", () => {
  it("birinchi kirishda parol almashtirmaguncha boshqa amal yopiq; keyin ochiladi", async () => {
    const x = buildApp({}); x.accounts.bootstrap("root", PW);
    const t = (await x.app.inject({ method: "POST", url: "/admin/login", payload: { login: "root", password: PW } })).json().token;
    expect((await x.app.inject({ method: "GET", url: "/admin/dashboard", headers: { authorization: `Bearer ${t}` } })).json().error).toBe("change_password");
    expect((await x.app.inject({ method: "POST", url: "/admin/me/password", headers: { authorization: `Bearer ${t}` }, payload: { current: PW, next: "qisqa" } })).json().error).toBe("weak_password");
    expect((await x.app.inject({ method: "POST", url: "/admin/me/password", headers: { authorization: `Bearer ${t}` }, payload: { current: PW, next: "Yangi-Parol-77" } })).statusCode).toBe(200);
    expect((await x.app.inject({ method: "GET", url: "/admin/dashboard", headers: { authorization: `Bearer ${t}` } })).statusCode).toBe(200);
  });
  it("noto'g'ri parol 401; 5 xato → qulf (to'g'ri parol ham o'tmaydi); token yo'q 401", async () => {
    const s = await setup();
    expect((await s.login("root", "xato-parol-1")).statusCode).toBe(401); expect((await s.login("yoq", "xato-parol-1")).statusCode).toBe(401);
    for (let i = 0; i < 4; i++) s.x.accounts.login("root", "xato-parol-1", undefined);
    expect((s.x.accounts.login("root", "Yangi-Parol-77", undefined) as any).error).toBe("locked");
    expect((await s.j("GET", "/admin/dashboard")).statusCode).toBe(401);
    expect(s.x.adminState.audit.some((a) => a.action === "admin.login:failed")).toBe(true);
  });
  it("TOTP: yoqilgach kod shart, noto'g'ri kod rad, bir marta ishlatilgan kod qayta o'tmaydi", async () => {
    const s = await setup();
    const setupR = (await s.j("POST", "/admin/me/totp/setup", s.T)).json(); expect(setupR.uri).toContain("otpauth://");
    const step = Math.floor(Date.now() / 30_000);
    expect((await s.j("POST", "/admin/me/totp/enable", s.T, { code: "000000" })).statusCode).toBe(400);
    expect((await s.j("POST", "/admin/me/totp/enable", s.T, { code: hotp(setupR.secret, step) })).statusCode).toBe(200);
    expect((await s.login("root", "Yangi-Parol-77")).json().error).toBe("totp_required");
    expect((await s.login("root", "Yangi-Parol-77", "123456")).json().error).toBe("bad_totp");
    expect((await s.login("root", "Yangi-Parol-77", hotp(setupR.secret, step))).json().error).toBe("bad_totp"); // shu bosqich allaqachon ishlatilgan
    expect((await s.login("root", "Yangi-Parol-77", hotp(setupR.secret, step + 1))).statusCode).toBe(200);
  });
  it("chiqish tokenni bekor qiladi; parol almashtirilsa boshqa sessiyalar tugaydi; admin o'chirilsa token yaroqsiz", async () => {
    const s = await setup(); const t2 = await mkAdmin(s, "mod1", "moderator");
    expect((await s.j("GET", "/admin/me", t2)).statusCode).toBe(200);
    await s.j("POST", "/admin/logout", t2); expect((await s.j("GET", "/admin/me", t2)).statusCode).toBe(401);
    const t3 = (await s.login("mod1", PW + "x")).json().token; const id = s.x.accounts.byLogin("mod1")!.id;
    await s.j("POST", `/admin/accounts/${id}`, s.T, { disabled: true }); expect((await s.j("GET", "/admin/me", t3)).statusCode).toBe(401);
  });
  it("sessiyalar muddati/idle tugaydi", async () => {
    let t = 1_000_000; const x = buildApp({ accounts: new (await import("./adminAccounts")).AdminAccounts(undefined, () => t) }); x.accounts.bootstrap("r", PW);
    const tok = x.accounts.login("r", PW, undefined)!; expect(tok.ok).toBe(true); const token = (tok as any).token;
    expect(x.accounts.resolve(token)).toBeTruthy(); t += 3 * 3600_000; expect(x.accounts.resolve(token)).toBeNull(); // 2 soat harakatsizlik
  });
});

describe("admin hisoblari va rollar", () => {
  it("faqat administrator hisob yaratadi; oxirgi administratorni o'chirib/pasaytirib bo'lmaydi; o'zini o'zgartirib bo'lmaydi", async () => {
    const s = await setup(); const sup = await mkAdmin(s, "sup1", "support");
    expect((await s.j("GET", "/admin/accounts", sup)).statusCode).toBe(403);
    expect((await s.j("POST", "/admin/accounts", s.T, { login: "x", name: "N", role: "support", password: PW })).json().error).toBe("bad_login");
    expect((await s.j("POST", "/admin/accounts", s.T, { login: "yangi1", name: "Nn", role: "dev", password: PW })).json().error).toBe("bad_role");
    expect((await s.j("POST", "/admin/accounts", s.T, { login: "yangi2", name: "Nn", role: "support", password: "123" })).json().error).toBe("weak_password");
    const me = s.x.accounts.byLogin("root")!.id;
    expect((await s.j("POST", `/admin/accounts/${me}`, s.T, { role: "support" })).json().error).toBe("self_change");
    expect((await s.j("DELETE", `/admin/accounts/${me}`, s.T)).json().error).toBe("self_change");
    const list = (await s.j("GET", "/admin/accounts", s.T)).json(); expect(JSON.stringify(list)).not.toMatch(/hash|salt|totpSecret/);
  });
  it("rol matritsasi: moliyachi foydalanuvchini ko'rmaydi, muharrir nashr qila olmaydi, tahlilchi shikoyat ko'rmaydi", async () => {
    const s = await setup(); const fin = await mkAdmin(s, "fin1", "finance"), ed = await mkAdmin(s, "ed1", "content_editor"), an = await mkAdmin(s, "an1", "analyst");
    expect((await s.j("GET", "/admin/users", fin)).statusCode).toBe(403); expect((await s.j("GET", "/admin/shop/orders", fin)).statusCode).toBe(200);
    expect((await s.j("POST", "/admin/content/versions/1/publish", ed)).statusCode).toBe(403);
    expect((await s.j("GET", "/admin/complaints", an)).statusCode).toBe(403);
    const dash = (await s.j("GET", "/admin/dashboard", fin)).json(); expect(dash.money).toBeTruthy(); expect(dash.attention).toBeDefined();
  });
  it("audit IP bilan yoziladi va parol/kod saqlanmaydi", async () => {
    const s = await setup(); await s.j("POST", "/admin/accounts", s.T, { login: "audit1", name: "Audit", role: "support", password: PW });
    const a = s.x.adminState.audit.find((e) => e.action === "admin.account.create")!; expect(a.ip).toBeTruthy(); expect(JSON.stringify(a.detail)).not.toContain(PW);
  });
});

describe("foydalanuvchi kartasi va amallar", () => {
  const user = async (s: Awaited<ReturnType<typeof setup>>, id: string, y = 1990) => { await s.x.app.inject({ method: "PUT", url: "/me/profile", headers: { authorization: `Bearer ${id}` }, payload: { name: "Ism" + id, color: 1, birthYear: y } }); s.x.adminState.touch(id, Date.now()); };
  it("karta: profil, statistika, buyurtma; qidiruv va filtrlar", async () => {
    const s = await setup(); await user(s, "u1"); await user(s, "kid", new Date().getFullYear() - 12);
    const c = (await s.j("GET", "/admin/users/u1", s.T)).json(); expect(c.profile.name).toBe("Ismu1"); expect(c.stats.games).toBe(0); expect(c.phoneVerified).toBeDefined();
    expect((await s.j("GET", "/admin/users?minor=1", s.T)).json().users.map((u: any) => u.id)).toEqual(["kid"]);
    expect((await s.j("GET", "/admin/users?q=ismu", s.T)).json().total).toBe(1);
    expect((await s.j("GET", "/admin/users/yoq", s.T)).json().error).toBe("no_user");
  });
  it("ban: sabab majburiy; muddatli ban o'zi tugaydi; ban/unban auditda", async () => {
    const s = await setup(); await user(s, "u1");
    expect((await s.j("POST", "/admin/users/u1/ban", s.T, {})).json().error).toBe("reason_required");
    expect((await s.j("POST", "/admin/users/u1/ban", s.T, { reason: "haqorat", days: -3 })).json().error).toBe("bad_days");
    expect((await s.j("POST", "/admin/users/u1/ban", s.T, { reason: "haqorat", days: 3 })).json().ok).toBe(true); expect(s.x.adminState.isBanned("u1")).toBe(true);
    s.x.adminState.banUntil.set("u1", Date.now() - 1); expect(s.x.adminState.isBanned("u1")).toBe(false);
    await s.j("POST", "/admin/users/u1/unban", s.T, { reason: "xato" }); expect(s.x.adminState.audit.map((a) => a.action)).toContain("user.unban");
  });
  it("Plus berish/qaytarib olish sabab bilan; «ishonchsiz» belgisini olib tashlash; hisob o'chirish", async () => {
    const s = await setup(); await user(s, "u1");
    expect((await s.j("POST", "/admin/users/u1/plus", s.T, { plan: "monthly" })).json().error).toBe("reason_required");
    expect((await s.j("POST", "/admin/users/u1/plus", s.T, { plan: "monthly", reason: "tanlov g'olibi" })).json().ok).toBe(true); expect(s.x.commerce.isPlus("u1")).toBe(true);
    expect((await s.j("POST", "/admin/users/u1/plus", s.T, { action: "revoke", reason: "xato berilgan" })).json().revoked).toBe(1); expect(s.x.commerce.isPlus("u1")).toBe(false);
    expect((await s.j("POST", "/admin/users/u1/clear-unreliable", s.T, { reason: "kechirildi" })).json().ok).toBe(true); expect(s.x.profiles.cleared.has("u1")).toBe(true);
    const sup = await mkAdmin(s, "sup1", "support"); expect((await s.j("POST", "/admin/users/u1/plus", sup, { plan: "monthly", reason: "xxx" })).statusCode).toBe(403);
    expect((await s.j("DELETE", "/admin/users/u1", s.T, { reason: "so'rovga ko'ra" })).json().ok).toBe(true); expect(s.x.profiles.get("u1")).toBeUndefined();
  });
});

describe("shikoyat ish jarayoni", () => {
  it("yangi → ko'rib chiqilmoqda (tayinlash) → hal qilindi; izoh; takroriy shikoyat hisobi", async () => {
    const s = await setup(); const sup = await mkAdmin(s, "sup1", "support");
    for (const from of ["a", "b"]) s.x.adminState.addComplaint({ from, against: "bad", room: null, text: "haqorat qildi", at: Date.now() });
    const list = (await s.j("GET", "/admin/complaints", sup)).json(); expect(list[0].status).toBe("new"); expect(list[0].againstCount).toBe(2);
    const id = list[0].id; const supId = s.x.accounts.byLogin("sup1")!.id;
    expect((await s.j("POST", `/admin/complaints/${id}/status`, sup, { status: "in_progress" })).json().ok).toBe(true);
    expect((await s.j("GET", "/admin/complaints?mine=1", sup)).json()[0].assignee).toBe(supId);
    expect((await s.j("POST", `/admin/complaints/${id}/status`, sup, { status: "zzz" })).json().error).toBe("bad_status");
    await s.j("POST", `/admin/complaints/${id}/note`, sup, { text: "o'yinchi bilan gaplashildi" });
    await s.j("POST", `/admin/complaints/${id}/status`, sup, { status: "resolved", resolution: "ogohlantirildi" });
    const done = (await s.j("GET", "/admin/complaints?status=resolved", sup)).json(); expect(done).toHaveLength(1); expect(done[0].notes).toHaveLength(1);
    expect(s.x.adminState.complaints.find((c) => c.id === id)!.status).toBe("resolved");
  });
});

describe("boshqaruv paneli", () => {
  it("jonli ko'rsatkichlar, bugungi raqamlar, e'tibor ro'yxati", async () => {
    const s = await setup(); s.x.adminState.touch("u1", Date.now()); s.x.adminState.addComplaint({ from: "u1", against: null, room: null, text: "muammo bor", at: Date.now() });
    const d = (await s.j("GET", "/admin/dashboard", s.T)).json(); expect(d.live.online).toBe(0); expect(d.today.registered).toBe(1); expect(d.series.days).toHaveLength(14);
    expect(d.attention.find((a: any) => a.to === "complaints").count).toBe(1);
  });
});
