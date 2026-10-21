import { describe, it, expect } from "vitest";
import { buildApp } from "./app";
import { checkBundle, diffValues } from "./admin-games";
import { currentPlayer, effectOf } from "@poyga/rules";
import { loadContent } from "@poyga/content";

const PW = "Parol-12345";
const H = (t: string) => ({ authorization: `Bearer ${t}` });
async function admin(role = "administrator", login = "root") {
  const x = buildApp({}); x.accounts.create("boot", { login, name: "Test " + login, role, password: PW });
  const tokOf = async (l: string, r: string) => { if (l !== login) x.accounts.create("boot", { login: l, name: "Test " + l, role: r, password: PW }); const a = x.accounts.byLogin(l)!; x.accounts.accts.set(a.id, { ...a, mustChange: false }); return (x.accounts.login(l, PW, undefined) as any).token as string; };
  const T = await tokOf(login, role);
  const j = (m: any, url: string, tok = T, payload?: unknown) => x.app.inject({ method: m, url, headers: H(tok), payload: payload as any });
  return { x, T, j, tokOf };
}
async function play(x: ReturnType<typeof buildApp>, turns: number) {
  for (const id of ["alice", "bob"]) await x.app.inject({ method: "PUT", url: "/me/profile", headers: H(id), payload: { name: id === "alice" ? "Alisa" : "Bobur", color: 0, birthYear: 1990 } });
  const r = x.rooms.create("alice"); if (!r.ok) throw 0; x.rooms.join(r.code, "bob"); await x.rooms.start(r.code, "alice", 31, { dreams: false });
  const room = x.rooms.rooms.get(r.code)!;
  for (let i = 0; i < turns && !room.state!.winner; i++) { const me = currentPlayer(room.state!).id;
    if (room.state!.pending) { const e = effectOf(room.ctx, room.state!.pending.cardId).effect; await x.rooms.act(r.code, me, { type: "decide", playerId: me, accept: e.kind === "gain" }, room.seq); } else await x.rooms.act(r.code, me, { type: "roll", playerId: me }, room.seq); }
  return { code: r.code, room };
}

describe("kontent farqi va tekshiruvi", () => {
  it("diffValues: qo'shilgan, o'chirilgan, o'zgargan elementlar maydon bilan", () => {
    const a = { kasb: [{ n: 1, name: "A", salary: 5 }, { n: 2, name: "B", salary: 7 }, { n: 4, name: "D", salary: 1 }] }, b = { kasb: [{ n: 1, name: "A", salary: 5 }, { n: 2, name: "B", salary: 9 }, { n: 3, name: "C", salary: 1 }] };
    const d = diffValues(a, b); expect(d).toMatchObject({ added: 1, removed: 1, changed: 1 }); expect(d.items.find((i) => i.kind === "changed")!.fields![0]).toMatchObject({ path: "salary", before: "7", after: "9" });
  });
  it("checkBundle: asl kontent ogohlantirishsiz (yoki faqat ma'lum), buzilgan versiya ogohlantiradi", () => {
    const b = loadContent() as any; const ok = checkBundle(b); expect(ok.stats.kasb).toBe(32);
    const bad = JSON.parse(JSON.stringify(b)); bad.cards.kasb[0].cf = -5; bad.cards.kasb[1].name = bad.cards.kasb[0].name; bad.bigBoard.pop();
    const w = checkBundle(bad).warnings.join("|"); expect(w).toContain("≤ 0"); expect(w).toContain("takrorlangan"); expect(w).toContain("katak");
  });
  it("API: farq va tekshiruv; muharrir tayyorlaydi → topshiradi; muharrir nashr qila olmaydi; administrator rad etadi/nashr qiladi", async () => {
    const s = await admin(); const ed = await s.tokOf("editor1", "content_editor");
    const dreams = (s.x.registry.bundle() as any).dreams.map((d: any, i: number) => (i === 0 ? { ...d, price: d.price + 1000 } : d));
    const v = (await s.j("POST", "/admin/content/dreams/versions", ed, { data: dreams, note: "narx" })).json().version; expect(v).toBeGreaterThan(1);
    const diff = (await s.j("GET", `/admin/content/versions/${v}/diff`)).json(); expect(diff.changed).toBe(1); expect(diff.items[0].fields![0].after).toBe(String(dreams[0].price)); // boshqa qismlar (katak qoidalari) yo'qolmagan
    expect((await s.j("GET", `/admin/content/versions/${v}/check`)).json().stats.kasb).toBe(32);
    expect((await s.j("POST", `/admin/content/versions/${v}/submit`, ed, { comment: "ko'rib chiqing" })).json().ok).toBe(true);
    expect((await s.j("GET", "/admin/content/reviews")).json().reviews[0]).toMatchObject({ version: v, status: "submitted" });
    expect((await s.j("POST", `/admin/content/versions/${v}/publish`, ed)).statusCode).toBe(403);
    expect((await s.j("POST", `/admin/content/versions/${v}/reject`, s.T, {})).json().error).toBe("reason_required");
    expect((await s.j("POST", `/admin/content/versions/${v}/reject`, s.T, { reason: "narx noto'g'ri" })).json().ok).toBe(true);
    expect((await s.j("POST", `/admin/content/versions/${v}/publish`)).json().ok).toBe(true); expect(s.x.registry.activeVersion).toBe(v);
    expect((await s.j("POST", `/admin/content/versions/1/publish`)).json().ok).toBe(true); expect(s.x.registry.activeVersion).toBe(1); // qaytarish
  });
});

describe("o'yinlar: ro'yxat, shubhali, qayta o'ynatish, yopish", () => {
  it("qayta o'ynatish jurnaldan har qadamda holatni beradi; yakuniy holat o'yin bilan mos", async () => {
    const s = await admin(); const { code, room } = await play(s.x, 60);
    const r = (await s.j("GET", `/admin/rooms/${code}/replay`)).json(); expect(r.steps.length).toBeGreaterThan(10); expect(r.steps.every((x: any) => x.ok)).toBe(true);
    const last = r.steps[r.steps.length - 1]; const alice = room.state!.players.find((p: any) => p.id === "alice")!; expect(last.players.find((p: any) => p.id === "alice").cash).toBe(Math.round(alice.cash));
    expect(r.names.alice).toBe("Alisa"); expect((await s.j("GET", "/admin/rooms/ZZZZZZ/replay")).json().error).toBe("not_found");
    const sup = await s.tokOf("analyst1", "analyst"); expect((await s.j("GET", `/admin/rooms/${code}/replay`, sup)).statusCode).toBe(403);
  });
  it("majburan yopish: sabab majburiy, a'zolar bo'shaydi, xona yopilgan ko'rinadi; moderator mumkin, qo'llab-quvvatlash yo'q", async () => {
    const s = await admin(); const { code } = await play(s.x, 4); const sup = await s.tokOf("support1", "support"), mod = await s.tokOf("moder1", "moderator");
    expect((await s.j("POST", `/admin/rooms/${code}/close`, sup, { reason: "spam" })).statusCode).toBe(403);
    expect((await s.j("POST", `/admin/rooms/${code}/close`, mod, {})).json().error).toBe("reason_required");
    expect((await s.j("POST", `/admin/rooms/${code}/close`, mod, { reason: "qoidabuzarlik" })).json().ok).toBe(true);
    const room = s.x.rooms.rooms.get(code)!; expect(room.endedAt).not.toBeNull(); expect(s.x.rooms.view(room).closed).toBe("qoidabuzarlik");
    expect((await s.j("POST", `/admin/rooms/${code}/close`, mod, { reason: "yana" })).json().error).toBe("not_found"); // allaqachon yopilgan
    expect(s.x.rooms.create("alice").ok).toBe(true); // a'zo bo'shatildi
  });
  it("o'yinlar ro'yxati va shubhali belgilar", async () => {
    const s = await admin(); const mk = (room: string, rounds: number, winner: string | null, extra: object = {}) => ({ room, finishedAt: Date.now(), durationMs: 600_000, rounds, winner, contentVersion: 1, players: [{ id: "a", bot: false, circle: "small", restarts: 0, won: winner === "a" }, { id: "b", bot: false, circle: "small", restarts: 0, won: winner === "b" }], ...extra });
    s.x.profiles.results.push(mk("R1", 2, "a") as any, mk("R2", 40, "a") as any, mk("R3", 40, "a") as any, mk("R4", 40, "a") as any, mk("R5", 30, "b", { tag: { kind: "class", id: "k" } }) as any);
    const list = (await s.j("GET", "/admin/games")).json(); expect(list.total).toBe(5); expect((await s.j("GET", "/admin/games?tag=class")).json().total).toBe(1); expect((await s.j("GET", "/admin/games?q=r2")).json().total).toBe(1);
    const sus = (await s.j("GET", "/admin/games/suspicious")).json().games; const txt = JSON.stringify(sus); expect(txt).toContain("Juda qisqa"); expect(txt).toContain("marta yutgan");
  });
});
