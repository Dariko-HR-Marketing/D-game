import { describe, it, expect } from "vitest";
import { richLog } from "./model";

const room = { state: { players: [{ id: "u1", name: "Sardor" }, { id: "u2", name: "Madina" }] }, members: [{ userId: "u1", name: "Sardor" }, { userId: "u2", name: "Madina" }] };
describe("voqea qatori: qalin ismlar va holat", () => {
  it("o'yinchi ismi qalin, «qabul qildi» yashil", () => {
    const r = richLog(room, "u1: «Kofexona» — qabul qildi"); expect(r.parts[0].bold).toBe(true); expect(r.parts.some((p) => p.t === "qabul qildi" && p.kind === "good" && p.bold)).toBe(true); expect(r.kind).toBe("good");
  });
  it("«o'tkazdi» ogohlantirish, «rad etdi» qizil, ikkala ism qalin", () => {
    expect(richLog(room, "u1: «X» — o'tkazdi").kind).toBe("warn");
    const r = richLog(room, "u2: u1 ning qarz so'rovini rad etdi"); expect(r.kind).toBe("bad"); expect(r.parts.filter((p) => p.bold && !p.kind)).toHaveLength(2);
  });
  it("katta summa to'liq yoziladi", () => { expect(richLog(room, "u1: bank krediti 9500").parts.map((p) => p.t).join("")).toContain("9 500"); });
});
