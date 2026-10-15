import { describe, it, expect } from "vitest";
import { buildApp } from "./app";

const PW = "Parol-12345"; const H = (t: string) => ({ authorization: `Bearer ${t}` });
async function setup() {
  const x = buildApp({});
  const tokOf = (l: string, r: string) => { x.accounts.create("boot", { login: l, name: "T " + l, role: r, password: PW }); const a = x.accounts.byLogin(l)!; x.accounts.accts.set(a.id, { ...a, mustChange: false }); return (x.accounts.login(l, PW, undefined) as any).token as string; };
  const A = tokOf("admin1", "administrator"), E = tokOf("edum1", "edu_manager"), T = tokOf("tourm1", "tournament_manager"), S = tokOf("supp1", "support");
  const j = (m: any, url: string, tok = A, payload?: unknown) => x.app.inject({ method: m, url, headers: H(tok), payload: payload as any });
  const prof = (u: string, y = 1990) => x.app.inject({ method: "PUT", url: "/me/profile", headers: H(u), payload: { name: "N" + u, color: 1, birthYear: y } });
  return { x, A, E, T, S, j, prof };
}

describe("ta'lim tashkiloti tafsiloti va hisoboti", () => {
  it("tafsilot: o'qituvchi, sinf, taklif holati; o'qituvchini olib tashlash va taklifni bekor qilish; hisobot o'quvchi nomisiz", async () => {
    const s = await setup(); await s.prof("tch"); await s.prof("stu");
    const org = (s.x.edu.createOrg("5-maktab", Date.now() + 90 * 86_400_000, 10) as any).org; const inv = (s.x.edu.invite(org.id) as any).invite; s.x.edu.redeem("tch", inv.code); const inv2 = (s.x.edu.invite(org.id) as any).invite;
    const k = (s.x.edu.createClass("tch", "7-A") as any).klass; s.x.edu.join("stu", k.joinCode);
    s.x.profiles.results.push({ room: "R1", finishedAt: Date.now(), durationMs: 1, rounds: 20, winner: "stu", contentVersion: 1, tag: { kind: "class", id: k.id }, players: [{ id: "stu", bot: false, circle: "big", restarts: 0, won: true }] } as any);
    const d = (await s.j("GET", `/admin/edu/orgs/${org.id}`, s.E)).json(); expect(d.seatsUsed).toBe(1); expect(d.teachers[0]).toMatchObject({ name: "Ntch", classes: 1 }); expect(d.classes[0]).toMatchObject({ students: 1, games: 1, activeStudents: 1 }); expect(d.invites.find((i: any) => i.code === inv.code).used).toBe(true);
    const rep = (await s.j("GET", `/admin/edu/orgs/${org.id}/report`, s.E)).json(); expect(rep.totals).toMatchObject({ classes: 1, students: 1, games: 1, participated: 1 }); expect(JSON.stringify(rep)).not.toContain("Nstu");
    expect((await s.j("DELETE", `/admin/edu/invites/${inv2.code}`, s.E)).json().ok).toBe(true); expect((await s.j("DELETE", `/admin/edu/invites/${inv.code}`, s.E)).json().error).toBe("not_found"); // ishlatilgan
    expect((await s.j("POST", `/admin/edu/orgs/${org.id}/teachers/tch/remove`, s.E, {})).json().error).toBe("reason_required");
    expect((await s.j("POST", `/admin/edu/orgs/${org.id}/teachers/tch/remove`, s.E, { reason: "ishdan ketdi" })).json().ok).toBe(true); expect(s.x.edu.teacherCtx("tch")).toBeNull();
    expect((await s.j("GET", `/admin/edu/orgs/${org.id}`, s.T)).statusCode).toBe(403); expect((await s.j("GET", `/admin/edu/orgs/${org.id}`, s.S)).statusCode).toBe(403);
  });
});

describe("turnir boshqaruvi", () => {
  it("ishtirokchilar (16 yoshgacha belgisi), reyting, sovrin berish jurnali, homiy hisoboti jamlama", async () => {
    const s = await setup(); await s.prof("a"); await s.prof("b"); await s.prof("kid", new Date().getFullYear() - 12);
    const t = (s.x.tournaments.upsert(null, { title: "Kubok", sponsor: "Bank X", status: "open" }) as any).t;
    s.x.tournaments.register(t.id, "a", 30); s.x.tournaments.register(t.id, "b", 30); s.x.tournaments.register(t.id, "kid", 12, "c1");
    s.x.profiles.results.push({ room: "T1", finishedAt: Date.now(), durationMs: 1, rounds: 30, winner: "a", contentVersion: 1, tag: { kind: "tournament", id: t.id }, players: [{ id: "a", bot: false, circle: "big", restarts: 0, won: true, place: 1 }, { id: "b", bot: false, circle: "small", restarts: 0, won: false, place: 2 }] } as any);
    const d = (await s.j("GET", `/admin/tournaments/${t.id}`, s.T)).json(); expect(d.participants).toHaveLength(3); expect(d.participants.find((p: any) => p.userId === "kid")).toMatchObject({ minor: true, approved: false }); expect(d.board[0].userId).toBe("a"); expect(d.games).toBe(1);
    expect((await s.j("POST", `/admin/tournaments/${t.id}/prizes`, s.T, { userId: "kid", prize: "Sovg'a" })).json().error).toBe("not_participant");
    const pr = (await s.j("POST", `/admin/tournaments/${t.id}/prizes`, s.T, { userId: "a", prize: "Planshet" })).json(); expect(pr.ok).toBe(true);
    expect((await s.j("POST", `/admin/prizes/${pr.prize.id}/given`, s.T)).json().ok).toBe(true); expect((await s.j("GET", `/admin/tournaments/${t.id}`, s.T)).json().prizes[0]).toMatchObject({ status: "given", name: "Na" });
    const rep = (await s.j("GET", `/admin/tournaments/${t.id}/report`, s.T)).json(); expect(rep).toMatchObject({ participants: 2, played: 2, games: 1, avgRounds: 30, finished: 1 }); expect(JSON.stringify(rep)).not.toContain("Nkid");
    expect((await s.j("POST", `/admin/tournaments/${t.id}/participants/b/remove`, s.T, { reason: "qoidabuzarlik" })).json().ok).toBe(true); expect(s.x.tournaments.regOf(t.id, "b")).toBeUndefined();
    expect((await s.j("GET", `/admin/tournaments/${t.id}`, s.E)).statusCode).toBe(403);
  });
});

describe("e'lonlar", () => {
  it("yaratish, auditoriyaga mos ko'rinish (hamma / sinf / turnir), muddat, o'chirish, rolga ko'ra cheklov, HTML tozalanadi", async () => {
    const s = await setup(); await s.prof("tch"); await s.prof("stu"); await s.prof("out");
    const org = (s.x.edu.createOrg("5-maktab", Date.now() + 90 * 86_400_000, 10) as any).org; s.x.edu.redeem("tch", (s.x.edu.invite(org.id) as any).invite.code); const k = (s.x.edu.createClass("tch", "7-A") as any).klass; s.x.edu.join("stu", k.joinCode);
    const t = (s.x.tournaments.upsert(null, { title: "Kubok", status: "open" }) as any).t; s.x.tournaments.register(t.id, "out", 30);
    expect((await s.j("POST", "/admin/announcements", s.S, { text: "salom", audience: "all" })).statusCode).toBe(403);
    expect((await s.j("POST", "/admin/announcements", s.E, { text: "Hammaga e'lon", audience: "all" })).json().error).toBe("forbidden_audience");
    expect((await s.j("POST", "/admin/announcements", s.A, { text: "<b>Texnik ishlar</b> 20:00 da", audience: "all", hours: 2 })).json().announcement.text).toBe("bTexnik ishlar/b 20:00 da"); // < > olib tashlanadi
    expect((await s.j("POST", "/admin/announcements", s.E, { text: "Ertaga nazorat o'yini", audience: "class", ref: k.id, hours: 48 })).json().announcement.audience).toBe("class");
    expect((await s.j("POST", "/admin/announcements", s.T, { text: "Turnir boshlandi", audience: "tournament", ref: t.id, kind: "warn" })).json().announcement.kind).toBe("warn");
    expect((await s.j("POST", "/admin/announcements", s.E, { text: "Xato sinf", audience: "class", ref: "yoq" })).json().error).toBe("bad_ref");
    const texts = async (u: string) => ((await s.j("GET", "/me/announcements", u)).json().announcements as any[]).map((a) => a.text);
    const stu = await texts("stu"); expect(stu).toHaveLength(2); expect(stu).toContain("Ertaga nazorat o'yini"); expect(stu.some((x) => x.includes("Texnik ishlar"))).toBe(true); expect(await texts("tch")).toHaveLength(2);
    const out = await texts("out"); expect(out).toHaveLength(2); expect(out).toContain("Turnir boshlandi"); expect(out).not.toContain("Ertaga nazorat o'yini");
    const list = (await s.j("GET", "/admin/announcements", s.E)).json(); expect(list.announcements.every((a: any) => a.audience === "class")).toBe(true); // ta'lim menejeri faqat sinf e'lonlarini ko'radi
    const all = (await s.j("GET", "/admin/announcements", s.A)).json().announcements; const first = all.find((a: any) => a.audience === "all");
    await s.j("POST", `/admin/announcements/${first.id}`, s.A, { active: false }); expect((await texts("stu")).length).toBe(1);
    expect((await s.j("DELETE", `/admin/announcements/${first.id}`, s.E)).json().error).toBe("not_found"); expect((await s.j("DELETE", `/admin/announcements/${first.id}`, s.A)).json().ok).toBe(true);
    let tnow = Date.now(); void tnow; s.x.ops.anns.values().forEach((a) => s.x.ops.anns.set(a.id, { ...a, until: Date.now() - 1 })); expect((await texts("stu")).length).toBe(0); // muddati o'tdi
  });
});
