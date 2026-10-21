import { describe, it, expect } from "vitest";
import { tabBadges, badgeLabel, newEvents, type Seen } from "./badges";

const room = (st: Record<string, unknown> = {}) => ({
  state: { players: [{ id: "a", circle: "small", assets: [], handDebts: [] }, { id: "b", circle: "small", assets: [], handDebts: [] }], bots: [], proposals: [], notices: [], round: 3, logN: 10, ...st },
  marketCards: {},
});
const seen = (o: Partial<Seen> = {}): Seen => ({ logN: 10, reactions: [], notices: [], ...o });
const run = (r: any, o: { turn?: boolean; seen?: Seen; reactions?: { id: number; from: string }[] } = {}) =>
  tabBadges({ room: r, userId: "a", myTurnAction: !!o.turn, seen: o.seen ?? seen(), reactions: o.reactions ?? [] });

describe("pastki menyu belgilari", () => {
  it("hech narsa kutmasa — belgi yo'q", () => {
    expect(run(room())).toEqual({ field: null, blank: null, players: null });
  });
  it("Maydon: navbat menda — qizil, vaqtinchalik", () => {
    const b = run(room(), { turn: true }).field!;
    expect(b).toMatchObject({ count: 1, tone: "urgent", temp: true });
    expect(badgeLabel("field", b)).toContain("navbat sizda");
  });
  it("Blank: menga yo'llangan qarz va sheriklik taklifi — qizil, soni bo'yicha", () => {
    const r = room({ proposals: [{ id: 1, kind: "loan", giver: "a", receiver: "b", amount: 100, months: 3 }, { id: 2, kind: "partner", owner: "b", partner: "a", cardId: "x" }, { id: 3, kind: "loan", giver: "b", receiver: "a", amount: 1, months: 1 }] });
    const b = run(r).blank!; expect(b).toMatchObject({ count: 2, tone: "urgent", temp: true, urgent: 2, info: 0 });
    expect(badgeLabel("blank", b)).toBe("2 ta javob kutilmoqda");
  });
  it("Blank: suyunchi — yashil (imkoniyat); qizil bilan birga bo'lsa rang qizil, son jami", () => {
    const sy = { id: 4, kind: "suyunchi", parent: "b", given: [] };
    const g = run(room({ proposals: [sy] })).blank!; expect(g).toMatchObject({ count: 1, tone: "info" });
    const both = run(room({ proposals: [sy, { id: 5, kind: "loan", giver: "a", receiver: "b", amount: 1, months: 1 }] })).blank!;
    expect(both).toMatchObject({ count: 2, tone: "urgent", urgent: 1, info: 1 }); expect(badgeLabel("blank", both)).toBe("1 ta javob kutilmoqda, 1 ta yangilik");
  });
  it("Blank: qarz eslatmasi — qizil, doimiy (ko'rilgach o'chadi); inqiroz xabari — yashil", () => {
    const n = [{ id: 1, to: "a", key: "loan_reminder", round: 3, from: "b" }, { id: 2, to: "all", key: "crisis_start", round: 3 }, { id: 3, to: "b", key: "loan_reminder", round: 3 }, { id: 4, to: "a", key: "loan_reminder", round: 1 }];
    const b = run(room({ notices: n })).blank!; expect(b).toMatchObject({ urgent: 1, info: 1, count: 2, tone: "urgent", temp: false });
    expect(run(room({ notices: n }), { seen: seen({ notices: [1, 2] }) }).blank).toBeNull();
  });
  it("O'yinchilar: yangi voqealar va boshqalarning reaksiyalari (o'zimniki emas); ko'rilgach o'chadi", () => {
    expect(newEvents({ logN: 14 }, seen())).toBe(4);
    const b = run(room({ logN: 14 }), { reactions: [{ id: 1, from: "b" }, { id: 2, from: "a" }] }).players!;
    expect(b).toMatchObject({ count: 5, tone: "info", temp: false }); expect(badgeLabel("players", b)).toBe("5 ta yangilik");
    expect(run(room({ logN: 14 }), { seen: seen({ logN: 14, reactions: [1] }), reactions: [{ id: 1, from: "b" }] }).players).toBeNull();
  });
  it("jurnal hisoblagichi bo'lmagan eski holatda ham xato bermaydi", () => {
    expect(newEvents({}, seen({ logN: 0 }))).toBe(0);
  });
});
