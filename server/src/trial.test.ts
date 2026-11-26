import { describe, it, expect } from "vitest";
import { Commerce } from "./commerce";
import { MemoryDocs } from "./docs";

const DAYMS = 86_400_000, T0 = Date.UTC(2026, 10, 23, 5, 0, 0);
const mk = (now: { t: number }) => new Commerce({ docs: new MemoryDocs(), now: () => now.t, providers: [], phoneOk: () => true, ageOf: () => 30, achievements: () => [], phoneHashOf: () => "h", hashOf: (x: string) => x } as any);
describe("yangi o'yinchi: 7 kunlik cheklovsiz davr", () => {
  it("7 kun cheklovsiz, keyin Start chegarasi (1/2/6) qaytadi; sinov o'yinlari hisoblanmaydi", async () => {
    const now = { t: T0 }; const c = await mk(now).load(); c.seedPilot();
    expect(c.startTrial("n")).toBe(true); expect(c.startTrial("n")).toBe(false); // faqat bir marta
    for (let i = 0; i < 20; i++) { expect(c.createCheck("n").ok).toBe(true); c.commitStart("R" + i, "n"); }
    expect(c.catalog("n").pkg.trial.active).toBe(true);
    now.t = T0 + 7 * DAYMS + 1000;
    expect(c.inTrial("n")).toBe(false); expect(c.usage("n").day).toBe(0);
    expect(c.createCheck("n").ok).toBe(true); c.commitStart("A", "n");
    const r = c.createCheck("n"); expect(r.ok).toBe(false); if (!r.ok) expect(r.error).toBe("room_limit"); // kuniga 1
  });
  it("sinov faqat yangi o'yinchiga: boshlanmagan hisobda chegara amal qiladi; TRIAL_DAYS=0 o'chiradi", async () => {
    const now = { t: T0 }; const c = await mk(now).load(); c.seedPilot();
    c.commitStart("R1", "old"); expect(c.createCheck("old").ok).toBe(false);
    c.trialDays = 0; expect(c.startTrial("z")).toBe(false);
  });
});
