import { describe, it, expect } from "vitest";
import { planSteps, cellsOf, MAX_WALK } from "./movement";
import { FACE_VALUE, faceOf, rollAngles, restsOn, type Face } from "./diceFace";
import { SoundEngine, RECIPES, recipeLength, type Ctx, type Sfx } from "./sound";
import { DICE_MS, STEP_MS, stepMs } from "./motionConfig";

describe("fishka harakati rejasi", () => {
  it("har bir katak ustidan oldinga yuradi", () => {
    expect(planSteps({ pos: 3, circle: "small" }, { pos: 7, circle: "small" })).toEqual([4, 5, 6, 7]);
  });
  it("aylana chegarasidan o'tadi (47 → 2)", () => { expect(planSteps({ pos: 46, circle: "small" }, { pos: 2, circle: "small" })).toEqual([47, 0, 1, 2]); });
  it("katta aylana 53 katak", () => { expect(cellsOf("big")).toBe(53); expect(planSteps({ pos: 51, circle: "big" }, { pos: 1, circle: "big" })).toEqual([52, 0, 1]); });
  it("joyida turgan, aylana almashgan, orqaga yoki juda uzoq o'tish — sakrash (null)", () => {
    expect(planSteps({ pos: 5, circle: "small" }, { pos: 5, circle: "small" })).toBeNull();
    expect(planSteps({ pos: 47, circle: "small" }, { pos: 3, circle: "big" })).toBeNull();
    expect(planSteps({ pos: 10, circle: "small" }, { pos: 7, circle: "small" })).toBeNull();
    expect(planSteps({ pos: 0, circle: "small" }, { pos: MAX_WALK + 1, circle: "small" })).toBeNull();
    expect(planSteps({ pos: 0, circle: "small" }, { pos: MAX_WALK, circle: "small" })).toHaveLength(MAX_WALK);
  });
  it("animatsiya vaqti: kamaytirilgan harakatda 0", () => { expect(stepMs(true)).toBe(0); expect(stepMs(false)).toBe(STEP_MS); expect(DICE_MS).toBeGreaterThan(STEP_MS); });
});

describe("3D kubik", () => {
  it("qarama-qarshi yuzlar yig'indisi 7", () => {
    const pairs: [Face, Face][] = [["front", "back"], ["left", "right"], ["top", "bottom"]];
    for (const [a, b] of pairs) expect(FACE_VALUE[a] + FACE_VALUE[b]).toBe(7);
    expect(new Set(Object.values(FACE_VALUE)).size).toBe(6);
  });
  it("har qanday tashlash natija yuzida to'xtaydi va doim oldinga ≥ 2 aylanadi", () => {
    let a = { x: 0, y: 0 };
    for (let n = 1; n <= 60; n++) {
      const v = 1 + (n * 5) % 6, next = rollAngles(a, v, n);
      expect(restsOn(next, v)).toBe(true);
      expect(next.x - a.x).toBeGreaterThanOrEqual(360 * 1); expect(next.y - a.y).toBeGreaterThanOrEqual(360 * 2);
      a = next;
    }
  });
  it("yig'indi (>6) yoki yo'q qiymat — old yuz (raqam) ustida to'xtaydi", () => {
    expect(faceOf(9)).toBe("front"); const r = rollAngles({ x: 0, y: 0 }, 9, 1); expect(r.x % 360).toBe(0); expect(r.y % 360).toBe(0);
    expect(rollAngles({ x: 10, y: 20 }, null, 2).x % 360).toBe(0);
  });
});

/** Soxta AudioContext: nechta tovush tuguni yaratilganini hisoblaydi. */
function fake() {
  const calls = { osc: 0, src: 0, resumed: 0, gains: 0 };
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect: (n: any) => n });
  const ctx: Ctx = {
    state: "suspended", currentTime: 0, sampleRate: 8000, destination: {}, resume() { calls.resumed++; ctx.state = "running"; },
    createGain: () => { calls.gains++; return { ...node(), gain: param() }; },
    createOscillator: () => { calls.osc++; return { ...node(), type: "", frequency: param(), start() {}, stop() {} }; },
    createBuffer: (_c, len) => ({ getChannelData: () => new Float32Array(len) }),
    createBufferSource: () => { calls.src++; return { ...node(), buffer: null, start() {}, stop() {} }; },
    createBiquadFilter: () => ({ ...node(), type: "", frequency: param(), Q: param() }),
  };
  return { ctx, calls };
}
describe("tovush tizimi", () => {
  it("hamma holat uchun retsept bor va qisqa (≤ 1.5 s)", () => {
    const names = Object.keys(RECIPES) as Sfx[];
    expect(names).toEqual(expect.arrayContaining(["roll", "land", "step", "card", "gain", "pay", "turn", "tick", "win", "lose"]));
    for (const n of names) { const L = recipeLength(RECIPES[n]); expect(L).toBeGreaterThan(0); expect(L).toBeLessThanOrEqual(1.5); }
  });
  it("kubik tovushi kubik animatsiyasidan uzun emas", () => { expect(recipeLength(RECIPES.roll)).toBeLessThanOrEqual(DICE_MS / 1000); });
  it("jim rejimda hech narsa chalinmaydi, yoqilganda chalinadi", () => {
    const { ctx, calls } = fake(); const e = new SoundEngine(() => ctx, () => false, { muted: true, volume: 0.6 });
    expect(e.play("step")).toBe(false); expect(calls.osc).toBe(0);
    e.setMuted(false); expect(e.play("step")).toBe(true); expect(calls.osc).toBeGreaterThan(0); expect(calls.resumed).toBe(1);
  });
  it("shovqinli tovush (kubik) bufer manbalarini yaratadi", () => { const { ctx, calls } = fake(); const e = new SoundEngine(() => ctx, () => false, { muted: false, volume: 0.6 }); e.play("roll"); expect(calls.src).toBe(RECIPES.roll.noise!.length); });
  it("yorliq yashirin: faqat ogohlantirishlar (navbat, natija) chalinadi", () => {
    const { ctx } = fake(); const e = new SoundEngine(() => ctx, () => true, { muted: false, volume: 0.6 });
    expect(e.play("step")).toBe(false); expect(e.play("roll")).toBe(false); expect(e.play("turn")).toBe(true); expect(e.play("win")).toBe(true);
  });
  it("AudioContext yo'q (native) — xatosiz jim", () => { const e = new SoundEngine(() => null, () => false, { muted: false, volume: 0.6 }); expect(e.play("card")).toBe(false); e.unlock(); });
  it("ovoz balandligi 0 — jim; obunachilar xabardor qilinadi", () => {
    const { ctx } = fake(); const e = new SoundEngine(() => ctx, () => false, { muted: false, volume: 0.6 }); let n = 0; const off = e.subscribe(() => n++);
    e.setVolume(0); expect(e.play("tick")).toBe(false); e.toggle(); expect(e.muted).toBe(true); expect(n).toBe(2); off(); e.toggle(); expect(n).toBe(2);
  });
});
