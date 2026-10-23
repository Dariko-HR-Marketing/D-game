import { describe, expect, it } from "vitest";
import { paced } from "./paced";

const clock = () => { let t = 1000; const q: { at: number; f: () => void }[] = []; return { now: () => t, timer: (f: () => void, ms: number) => { q.push({ at: t + ms, f }); return 0; }, tick: (ms: number) => { const end = t + ms; for (;;) { q.sort((a, b) => a.at - b.at); const n = q[0]; if (!n || n.at > end) break; q.shift(); t = Math.max(t, n.at); n.f(); } t = end; } }; };

describe("paced", () => {
  it("bo'sh vaqtda darrov uzatadi", () => { const c = clock(), got: number[] = []; const p = paced<number>((v) => got.push(v), 40, 8, c.now, c.timer); p(1); expect(got).toEqual([1]); });
  it("birdaniga kelgan xabarlar tartibda va oraliq bilan uzatiladi", () => {
    const c = clock(), got: [number, number][] = []; const p = paced<number>((v) => got.push([v, c.now()]), 40, 8, c.now, c.timer);
    p(1); p(2); p(3); expect(got.map((g) => g[0])).toEqual([1]);
    c.tick(100); expect(got.map((g) => g[0])).toEqual([1, 2, 3]); expect(got[2][1] - got[1][1]).toBeGreaterThanOrEqual(40);
  });
  it("navbat chegaradan oshsa eskilari tashlanadi, oxirgisi saqlanadi", () => {
    const c = clock(), got: number[] = []; const p = paced<number>((v) => got.push(v), 40, 3, c.now, c.timer);
    for (let i = 1; i <= 20; i++) p(i); c.tick(1000); expect(got[got.length - 1]).toBe(20); expect(got.length).toBeLessThan(8);
  });
  it("tinch turgandan keyin yana darrov uzatadi", () => { const c = clock(), got: number[] = []; const p = paced<number>((v) => got.push(v), 40, 8, c.now, c.timer); p(1); c.tick(500); p(2); expect(got).toEqual([1, 2]); });
});
