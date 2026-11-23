import { describe, it, expect } from "vitest";
import { Commerce, DEFAULT_CONFIG, PILOT_CONFIG } from "./commerce";
import { MemoryDocs } from "./docs";

const DAYMS = 86_400_000;
// Toshkent 2026-11-23 (dushanba) 10:00 = UTC 05:00
const T0 = Date.UTC(2026, 10, 23, 5, 0, 0);
function mk(now: { t: number }) {
  return new Commerce({ docs: new MemoryDocs(), now: () => now.t, providers: [], phoneOk: () => true, ageOf: () => 30, achievements: () => [], phoneHashOf: () => "h", hashOf: (x: string) => x } as any);
}
describe("paketlar (pilot): chegara va kupon", () => {
  it("kodda narx va chegara yo'q; pilot qiymatlari faqat seed bilan yoziladi", async () => {
    const now = { t: T0 }; const c = await mk(now).load();
    expect(c.config().plusMonthly).toBeNull(); expect(c.config().quotas.start).toEqual({ day: null, week: null, month: null });
    expect(DEFAULT_CONFIG.coupon).toBeNull();
    expect(c.seedPilot()).toBe(true); expect(c.seedPilot()).toBe(false);
    expect(c.config().premiumMonthly).toBe(99_000); expect(c.config().coupon).toBe(9_900); expect(c.config().quotas.plus).toEqual({ day: 3, week: 10, month: 30 });
    expect(PILOT_CONFIG.orgTiers).toHaveLength(4);
  });
  it("Start 1/2/6: kun, hafta va oy chegarasi; yangilanish Toshkent vaqti bilan", async () => {
    const now = { t: T0 }; const c = await mk(now).load(); c.seedPilot();
    expect(c.createCheck("u").ok).toBe(true); c.commitStart("R1", "u");
    const r = c.createCheck("u"); expect(r.ok).toBe(false); if (!r.ok) { expect(r.error).toBe("room_limit"); expect(r.detail.usage.day).toBe(1); expect(r.detail.plan).toBe("start"); }
    now.t = T0 + DAYMS; expect(c.createCheck("u").ok).toBe(true); c.commitStart("R2", "u"); // 2-kun: hafta 2 ga yetdi
    now.t = T0 + 2 * DAYMS; const w = c.createCheck("u"); expect(w.ok).toBe(false); expect(c.usage("u").week).toBe(2);
    now.t = T0 + 7 * DAYMS; expect(c.createCheck("u").ok).toBe(true); // keyingi dushanba: yangi hafta
    c.commitStart("R3", "u"); now.t = T0 + 8 * DAYMS; c.commitStart("R4", "u"); now.t = T0 + 14 * DAYMS; c.commitStart("R5", "u"); now.t = T0 + 15 * DAYMS; c.commitStart("R6", "u");
    expect(c.usage("u").month).toBeGreaterThan(0);
  });
  it("oy chegarasi: 6 tadan keyin yopiladi, kunduzgi chegara yangilangan bo'lsa ham", async () => {
    const now = { t: T0 }; const c = await mk(now).load(); c.seedPilot();
    // bir oyda 6 ta o'yin: har biri alohida hafta/kunda bo'lmasligi uchun chegarani bevosita to'ldiramiz
    c.setConfig({ quotas: { start: { day: null, week: null, month: 6 }, plus: { day: null, week: null, month: null }, premium: { day: null, week: null, month: null } } });
    for (let i = 0; i < 6; i++) { expect(c.createCheck("m").ok).toBe(true); c.commitStart("R" + i, "m"); now.t += 3600_000; }
    expect(c.createCheck("m").ok).toBe(false);
    now.t = Date.UTC(2026, 11, 1, 0, 0, 0); expect(c.createCheck("m").ok).toBe(true); // oy yangilandi
  });
  it("kupon: limit tugaganda bitta o'yin ochadi; o'yin boshlanganda sarflanadi, kutish zalida bekor qilinsa saqlanadi", async () => {
    const now = { t: T0 }; const c = await mk(now).load(); c.seedPilot(); c.commitStart("R1", "u");
    const no = c.createCheck("u", true); expect(no.ok).toBe(false); if (!no.ok) expect(no.error).toBe("no_coupon");
    (c as any).grant({ id: "o", userId: "u", sku: "coupon:1", title: "", amount: 9_900, channel: "web", status: "paid", createdAt: 0 });
    expect(c.catalog("u").pkg.coupons).toBe(1);
    const ok = c.createCheck("u", true); expect(ok.ok).toBe(true); if (ok.ok) c.noteRoomCreated("u", "RK", ok.viaCoupon);
    expect(c.catalog("u").pkg.coupons).toBe(1); // hali boshlanmadi
    c.commitStart("RK", "u"); expect(c.catalog("u").pkg.coupons).toBe(0); expect(c.usage("u").day).toBe(1); // kun hisoblagichi o'zgarmadi
  });
  it("Premium cheklovsiz va hisoblagich yozmaydi; Plus 3/10/30; paket ustuvorligi", async () => {
    const now = { t: T0 }; const c = await mk(now).load(); c.seedPilot();
    (c as any).grant({ id: "p", userId: "v", sku: "premium:monthly", title: "", amount: 99_000, channel: "web", status: "paid", createdAt: 0 });
    expect(c.plan("v")).toBe("premium"); for (let i = 0; i < 50; i++) { expect(c.createCheck("v").ok).toBe(true); c.commitStart("P" + i, "v"); } expect(c.usage("v").day).toBe(0);
    (c as any).grant({ id: "q", userId: "w", sku: "plus:monthly", title: "", amount: 49_000, channel: "web", status: "paid", createdAt: 0 });
    expect(c.plan("w")).toBe("plus"); for (let i = 0; i < 3; i++) c.commitStart("W" + i, "w"); expect(c.createCheck("w").ok).toBe(false);
    expect(c.isPaid("w")).toBe(true); expect(c.historyLimit("w")).toBeNull();
  });
  it("sozlama tekshiruvi: noto'g'ri chegara yoki tashkilot chegirmasi rad etiladi", async () => {
    const c = await mk({ t: T0 }).load();
    expect(c.setConfig({ orgTiers: [{ seats: 10, pct: 95 }] }).ok).toBe(false);
    expect(c.setConfig({ coupon: -5 }).ok).toBe(false);
    expect(c.setConfig({ quotas: { start: { day: -1, week: null, month: null }, plus: { day: null, week: null, month: null }, premium: { day: null, week: null, month: null } } }).ok).toBe(false);
  });
});
