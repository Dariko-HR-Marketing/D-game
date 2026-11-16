import { describe, it, expect } from "vitest";
import { buildApp } from "./app";
import { csvCell } from "./edu";
import type { SmsSender } from "./auth";
import type { GameResult } from "./profiles";

const H = (u: string) => ({ authorization: `Bearer ${u}` });
const A = { authorization: "Bearer adm" }, S = { authorization: "Bearer sup" };
const Y = new Date().getFullYear();
class Cap implements SmsSender { sent: { phone: string; text: string }[] = []; async send(phone: string, text: string) { this.sent.push({ phone, text }); } }
function setup() {
  const sms = new Cap(); const x = buildApp({ sms, adminAuth: (t) => (t === "adm" ? { id: "root", role: "administrator" } : t === "sup" ? { id: "s", role: "support" } : null) });
  const prof = async (u: string, birthYear: number) => x.app.inject({ method: "PUT", url: "/me/profile", headers: H(u), payload: { name: "N" + u, color: 1, birthYear } });
  const req = (m: any, u: string, url: string, payload?: unknown) => x.app.inject({ method: m, url, headers: H(u), payload: payload as any });
  const adm = (url: string, payload: unknown, h = A) => x.app.inject({ method: "POST", url, headers: h, payload: payload as any });
  return { x, sms, prof, req, adm };
}
async function teacherWithClass(s: ReturnType<typeof setup>, licenseUntil = Date.now() + 86_400_000 * 100, seats: number | null = 30) {
  await s.prof("t", 1985);
  const org = (await s.adm("/admin/edu/orgs", { name: "12-maktab", licenseUntil, seats })).json().org;
  const inv = (await s.adm(`/admin/edu/orgs/${org.id}/invite`, {})).json().invite;
  expect((await s.req("POST", "t", "/edu/redeem", { code: inv.code })).statusCode).toBe(200);
  const k = (await s.req("POST", "t", "/edu/classes", { name: "7-A" })).json().class; return { org, inv, k };
}
const result = (room: string, tag: GameResult["tag"], players: any[]): GameResult => ({ tag, room, finishedAt: Date.now(), durationMs: 1, rounds: 5, winner: null, contentVersion: 1, players });

describe("ta'lim: tashkilot, o'qituvchi, sinf", () => {
  it("admin tashkilot va taklif kodi yaratadi; kod bir marta ishlaydi; support huquqi yo'q", async () => {
    const s = setup(); await s.prof("t", 1985); await s.prof("u", 1985);
    expect((await s.adm("/admin/edu/orgs", { name: "X maktab", licenseUntil: 5, seats: null }, S)).statusCode).toBe(403);
    const { inv } = await teacherWithClass(s);
    expect((await s.req("POST", "u", "/edu/redeem", { code: inv.code })).json().error).toBe("used");
    expect((await s.req("POST", "u", "/edu/redeem", { code: "XXXXXXXX" })).json().error).toBe("bad_code");
    expect((await s.req("POST", "u", "/edu/classes", { name: "AA" })).statusCode).toBe(402); // o'qituvchi emas
  });
  it("litsenziya tugagan bo'lsa sinf ochilmaydi va o'quvchi qo'shilmaydi", async () => {
    const s = setup(); const { org, k } = await teacherWithClass(s); await s.prof("o", 2010);
    await s.adm(`/admin/edu/orgs/${org.id}`, { licenseUntil: Date.now() - 1000 });
    expect((await s.req("POST", "t", "/edu/classes", { name: "8-B" })).json().error).toBe("no_license");
    expect((await s.req("POST", "o", "/edu/join", { code: k.joinCode })).json().error).toBe("no_license");
    expect((await s.req("POST", "t", `/edu/classes/${k.id}/room`)).json().error).toBe("no_license");
  });
  it("o'rinlar soni chegaralanadi; qayta qo'shilib bo'lmaydi", async () => {
    const s = setup(); const { k } = await teacherWithClass(s, undefined, 1); await s.prof("o1", 2000); await s.prof("o2", 2000);
    expect((await s.req("POST", "o1", "/edu/join", { code: k.joinCode })).statusCode).toBe(200);
    expect((await s.req("POST", "o1", "/edu/join", { code: k.joinCode })).json().error).toBe("already_member");
    expect((await s.req("POST", "o2", "/edu/join", { code: k.joinCode })).json().error).toBe("seats_full");
  });
  it("sinf xonasi: faqat sinf a'zolari kiradi, tashqaridagi 'not_allowed'", async () => {
    const s = setup(); const { k } = await teacherWithClass(s); await s.prof("o", 2000); await s.prof("z", 2000);
    await s.req("POST", "o", "/edu/join", { code: k.joinCode });
    const code = (await s.req("POST", "t", `/edu/classes/${k.id}/room`)).json().code; expect(code).toBeTruthy();
    expect((await s.req("POST", "t", `/edu/classes/${k.id}/room`)).json().code).toBe(code); // ikkinchi ochilmaydi
    expect(s.x.rooms.join(code, "o").ok).toBe(true);
    const bad = s.x.rooms.join(code, "z"); expect(bad.ok).toBe(false); expect((bad as any).error).toBe("not_allowed");
    expect((await s.req("GET", "o", "/edu/me")).json().classes[0].roomCode).toBe(code);
  });
  it("hisobot: faqat sinf teglangan o'yinlar; 16 yoshgacha o'quvchi rozilikkacha yashirin; boshqa o'qituvchi ko'rmaydi", async () => {
    const s = setup(); const { k } = await teacherWithClass(s); await s.prof("adult", 2000); await s.prof("kid", Y - 12); await s.prof("t2", 1980);
    for (const u of ["adult", "kid"]) await s.req("POST", u, "/edu/join", { code: k.joinCode });
    const P = (id: string, won: boolean) => ({ id, bot: false, circle: "big", restarts: 0, won, place: won ? 1 : 2 });
    s.x.profiles.results.push(result("r1", { kind: "class", id: k.id }, [P("adult", true), P("kid", false)]), result("r2", undefined, [P("adult", true)]), result("r3", { kind: "class", id: "other" }, [P("adult", true)]));
    const rep = (await s.req("GET", "t", `/edu/classes/${k.id}`)).json();
    const adult = rep.students.find((r: any) => r.userId === "adult"), kid = rep.students.find((r: any) => r.userId === "kid");
    expect(adult).toMatchObject({ games: 1, wins: 1, big: 1, hidden: false }); expect(kid.hidden).toBe(true); expect(kid.games).toBeUndefined();
    await s.req("POST", "t", `/edu/classes/${k.id}/students/kid/consent`, { consent: true });
    expect((await s.req("GET", "t", `/edu/classes/${k.id}`)).json().students.find((r: any) => r.userId === "kid")).toMatchObject({ hidden: false, games: 1, wins: 0 });
    expect((await s.req("GET", "t2", `/edu/classes/${k.id}`)).statusCode).toBe(404);
    const csv = (await s.req("GET", "t", `/edu/classes/${k.id}/report.csv`)); expect(csv.headers["content-type"]).toContain("text/csv"); expect(csv.body).toContain("Nadult");
  });
  it("topshiriq bajarilishi hisoblanadi; CSV formula kiritishdan himoyalangan", async () => {
    const s = setup(); const { k } = await teacherWithClass(s); await s.prof("o", 2000); await s.req("POST", "o", "/edu/join", { code: k.joinCode });
    expect((await s.req("POST", "t", `/edu/classes/${k.id}/assignments`, { title: "G'alaba", kind: "wins", target: 1 })).statusCode).toBe(200);
    expect((await s.req("POST", "t", `/edu/classes/${k.id}/assignments`, { title: "xx", kind: "zzz", target: 1 })).json().error).toBe("bad_field");
    s.x.profiles.results.push(result("r1", { kind: "class", id: k.id }, [{ id: "o", bot: false, circle: "small", restarts: 0, won: true, place: 1 }]));
    const a = (await s.req("GET", "t", `/edu/classes/${k.id}`)).json().assignments[0]; expect(a).toMatchObject({ done: 1, total: 1 });
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\""); expect(csvCell("+1")).toBe("'+1"); expect(csvCell("a,b")).toBe("\"a,b\"");
  });
  it("hisob o'chirilsa o'qituvchi/o'quvchi a'zoligi ham o'chadi", async () => {
    const s = setup(); const { k } = await teacherWithClass(s); await s.prof("o", 2000); await s.req("POST", "o", "/edu/join", { code: k.joinCode });
    s.x.edu.eraseUser("o"); expect(s.x.edu.classes.get(k.id)!.students).toHaveLength(0);
  });
});

describe("homiy turnirlari", () => {
  const mk = async (s: ReturnType<typeof setup>, extra: object = {}) => (await s.adm("/admin/tournaments", { title: "Kuz kubogi", sponsor: "Bank X", sponsorUrl: "https://x.uz", rules: "Qoidalar", prize: "Sovg'a", status: "open", ...extra, })).json().tournament;
  it("admin yaratadi; qoralama ko'rinmaydi; noto'g'ri URL/status rad etiladi; support huquqi yo'q", async () => {
    const s = setup(); await s.prof("a", 1990);
    expect((await s.adm("/admin/tournaments", { title: "T" }, S)).statusCode).toBe(403);
    expect((await s.adm("/admin/tournaments", { title: "Kub", sponsorUrl: "javascript:alert(1)" })).json().error).toBe("bad_field");
    const t = await mk(s, { status: "draft" }); expect((await s.req("GET", "a", "/tournaments")).json().tournaments).toHaveLength(0);
    await s.adm(`/admin/tournaments/${t.id}`, { status: "open" }); expect((await s.req("GET", "a", "/tournaments")).json().tournaments).toHaveLength(1);
  });
  it("kattalar ro'yxatdan o'tadi; to'lib qolgan/yopiq/takroriy rad etiladi", async () => {
    const s = setup(); await s.prof("a", 1990); await s.prof("b", 1990); const t = await mk(s, { maxPlayers: 2 }); await s.prof("c", 1990);
    expect((await s.req("POST", "a", `/tournaments/${t.id}/register`)).json()).toMatchObject({ ok: true, approved: true });
    expect((await s.req("POST", "a", `/tournaments/${t.id}/register`)).json().error).toBe("already");
    await s.req("POST", "b", `/tournaments/${t.id}/register`); expect((await s.req("POST", "c", `/tournaments/${t.id}/register`)).json().error).toBe("full");
    await s.adm(`/admin/tournaments/${t.id}`, { status: "running" }); expect((await s.req("POST", "c", `/tournaments/${t.id}/register`)).json().error).toBe("closed");
  });
  it("16 yoshgacha: ota-ona roziligi shart; rozilikkacha xonaga kira olmaydi; homiy brendi yashirin", async () => {
    const s = setup(); await s.prof("kid", Y - 13); const t = await mk(s);
    expect((await s.req("POST", "kid", `/tournaments/${t.id}/register`)).json().error).toBe("bad_phone");
    const r = await s.req("POST", "kid", `/tournaments/${t.id}/register`, { parentPhone: "+998901112233" }); expect(r.json()).toMatchObject({ ok: true, approved: false });
    const view = (await s.req("GET", "kid", `/tournaments/${t.id}`)).json().tournament; expect(view.sponsor).toBe(""); expect(view.sponsorUrl).toBeUndefined(); expect(view.pendingParent).toBe(true);
    await s.adm(`/admin/tournaments/${t.id}`, { status: "running" });
    expect((await s.req("POST", "kid", `/tournaments/${t.id}/room`)).json().error).toBe("not_allowed");
    const tok = /\/parent\/(\S+)/.exec(s.sms.sent.at(-1)!.text)![1];
    expect((await s.x.app.inject({ method: "POST", url: `/parent/${tok}`, payload: { decision: "approve" } })).statusCode).toBe(200);
    expect((await s.req("POST", "kid", `/tournaments/${t.id}/room`)).json().code).toBeTruthy();
  });
  it("turnir xonasi faqat ro'yxatdagilarga; reyting alohida, umumiy ball o'zgarmaydi", async () => {
    const s = setup(); await s.prof("a", 1990); await s.prof("b", 1990); await s.prof("z", 1990); const t = await mk(s);
    await s.req("POST", "a", `/tournaments/${t.id}/register`); await s.req("POST", "b", `/tournaments/${t.id}/register`); await s.adm(`/admin/tournaments/${t.id}`, { status: "running" });
    const code = (await s.req("POST", "a", `/tournaments/${t.id}/room`)).json().code; expect(s.x.rooms.join(code, "b").ok).toBe(true);
    expect((s.x.rooms.join(code, "z") as any).error).toBe("not_allowed"); expect((await s.req("POST", "z", `/tournaments/${t.id}/room`)).json().error).toBe("not_allowed");
    const before = s.x.profiles.stats("a").points;
    s.x.profiles.results.push(result("tr1", { kind: "tournament", id: t.id }, [{ id: "a", bot: false, circle: "big", restarts: 0, won: true, place: 1 }, { id: "b", bot: false, circle: "small", restarts: 0, won: false, place: 2 }, { id: "z", bot: false, circle: "small", restarts: 0, won: false, place: 3 }]));
    const board = (await s.req("GET", "a", `/tournaments/${t.id}`)).json().board; expect(board.map((r: any) => r.userId)).toEqual(["a", "b"]); expect(board[0].points).toBeGreaterThan(board[1].points);
    expect(s.x.profiles.stats("a").points).toBe(before);
  });
  it("korporativ xona: ro'yxatda ko'rinmaydi, kod bilan kiriladi, kod ochiq ko'rinishda chiqmaydi, faqat 16+", async () => {
    const s = setup(); await s.prof("a", 1990); await s.prof("b", 1990); await s.prof("z", 1990); await s.prof("kid", Y - 13);
    const t = await mk(s, { corporate: true, sponsor: "Kompaniya X" }); expect(t.corporate).toBe(true); expect(t.joinCode).toMatch(/^[A-Z2-9]{8}$/);
    expect((await s.req("GET", "a", "/tournaments")).json().tournaments).toHaveLength(0);
    expect((await s.req("GET", "a", `/tournaments/${t.id}`)).json().error).toBe("not_found");
    expect((await s.req("POST", "a", `/tournaments/${t.id}/register`)).json().error).toBe("not_found"); // identifikator bilan emas, faqat kod bilan
    expect((await s.req("POST", "a", "/tournaments/join", { code: "XXXXXXXX" })).json().error).toBe("bad_code");
    expect((await s.req("POST", "kid", "/tournaments/join", { code: t.joinCode })).json().error).toBe("adults_only");
    const code = t.joinCode as string; const pretty = `${code.slice(0, 4)}-${code.slice(4).toLowerCase()}`;
    expect((await s.req("POST", "a", "/tournaments/join", { code: pretty })).json()).toMatchObject({ id: t.id, approved: true });
    expect((await s.req("POST", "a", "/tournaments/join", { code })).json()).toMatchObject({ id: t.id }); // takroriy — xato emas
    const list = (await s.req("GET", "a", "/tournaments")).json().tournaments; expect(list).toHaveLength(1); expect(list[0].joinCode).toBeUndefined();
    expect((await s.req("GET", "a", `/tournaments/${t.id}`)).json().tournament.joinCode).toBeUndefined();
    expect((await s.req("GET", "b", "/tournaments")).json().tournaments).toHaveLength(0);
    await s.req("POST", "b", "/tournaments/join", { code }); await s.adm(`/admin/tournaments/${t.id}`, { status: "running" });
    expect((await s.req("POST", "z", "/tournaments/join", { code })).json()).toMatchObject({ id: t.id }); // o'yin boshlangach ham qo'shiladi
    expect((await s.req("POST", "z", `/tournaments/${t.id}/room`)).json().code).toBeTruthy();
    const old = code; const n = (await s.adm(`/admin/tournaments/${t.id}/code`, {})).json().tournament; expect(n.joinCode).not.toBe(old);
    await s.prof("late", 1990); expect((await s.req("POST", "late", "/tournaments/join", { code: old })).json().error).toBe("bad_code");
    expect((await s.adm(`/admin/tournaments/${(await mk(s)).id}/code`, {})).json().error).toBe("not_found"); // ommaviy turnirda kod yo'q
  });
  it("tashkilotchi: faqat o'z korporativ xonasini boshqaradi (kod, holat, ishtirokchi, hisobot); boshqalar ko'rmaydi", async () => {
    const s = setup(); for (const u of ["org", "a", "b", "x"]) await s.prof(u, 1990);
    expect((await s.adm("/admin/tournaments", { title: "Ommaviy", status: "open", organizerId: "org" })).json().error).toBe("bad_field"); // ommaviy turnirda tashkilotchi yo'q
    const t = await mk(s, { corporate: true, status: "draft", organizerId: "org", sponsor: "Kompaniya X" }); const code = t.joinCode as string;
    expect((await s.req("GET", "org", "/org/rooms")).json().rooms.map((r: any) => r.id)).toEqual([t.id]);
    expect((await s.req("GET", "x", "/org/rooms")).json().rooms).toEqual([]); expect((await s.req("GET", "x", `/org/rooms/${t.id}`)).json().error).toBe("not_found");
    expect((await s.req("GET", "a", `/tournaments/${t.id}`)).json().error).toBe("not_found"); // tashkilotchi ma'lumoti ishtirokchiga ham chiqmaydi
    expect((await s.req("POST", "org", `/org/rooms/${t.id}/status`, { status: "draft" })).json().error).toBe("bad_status"); // orqaga qaytmaydi
    expect((await s.req("POST", "org", `/org/rooms/${t.id}/status`, { status: "open" })).json().room.status).toBe("open");
    await s.req("POST", "a", "/tournaments/join", { code }); await s.req("POST", "b", "/tournaments/join", { code });
    const view = (await s.req("GET", "a", `/tournaments/${t.id}`)).json().tournament; expect(view.organizerId).toBeUndefined(); expect(view.joinCode).toBeUndefined();
    await s.req("POST", "org", `/org/rooms/${t.id}/status`, { status: "running" });
    s.x.profiles.results.push(result("c1", { kind: "tournament", id: t.id }, [{ id: "a", bot: false, circle: "big", restarts: 0, won: true, place: 1 }, { id: "b", bot: false, circle: "small", restarts: 0, won: false, place: 2 }]));
    const det = (await s.req("GET", "org", `/org/rooms/${t.id}`)).json(); expect(det.participants).toHaveLength(2); expect(det.board.map((r: any) => r.userId)).toEqual(["a", "b"]); expect(det.games).toBe(1); expect(det.room.joinCode).toBe(code);
    const csv = await s.req("GET", "org", `/org/rooms/${t.id}/report.csv`); expect(csv.headers["content-type"]).toContain("text/csv"); expect(csv.body).toContain("Ishtirokchi"); expect(csv.body.split("\n")).toHaveLength(3);
    expect((await s.req("GET", "x", `/org/rooms/${t.id}/report.csv`)).statusCode).toBe(404);
    const n = (await s.req("POST", "org", `/org/rooms/${t.id}/code`, {})).json().room.joinCode; expect(n).not.toBe(code);
    expect((await s.req("POST", "org", `/org/rooms/${t.id}/participants/b/remove`, {})).json()).toEqual({ ok: true }); expect((await s.req("GET", "org", `/org/rooms/${t.id}`)).json().participants).toHaveLength(1);
  });
  it("kod taxmin qilish cheklangan: daqiqasiga ~10 urinishdan keyin 429", async () => {
    const s = setup(); await s.prof("a", 1990); await mk(s, { corporate: true });
    for (let i = 0; i < 10; i++) expect((await s.req("POST", "a", "/tournaments/join", { code: "ZZZZZZZZ" })).json().error).toBe("bad_code");
    const r = await s.req("POST", "a", "/tournaments/join", { code: "ZZZZZZZZ" }); expect(r.statusCode).toBe(429); expect(r.json().error).toBe("rate_limited");
  });
});
