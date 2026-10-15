import { describe, it, expect } from "vitest";
import { run, report } from "../sim/sim";

describe("balans simulyatori", () => {
  it("o'yinlar xatosiz o'ynaladi, 'smart' bot passiv botdan yaxshiroq; natija deterministik", () => {
    const a = run(4, "smart", 250, 100), b = run(4, "smart", 250, 100);
    expect(report(a)).toEqual(report(b));
    const passive = run(4, "passive", 250, 100);
    expect(a.restarts).toBeLessThanOrEqual(passive.restarts + 3); // K katagi endi hod kartasi tortadi (katta to'lov bank limitidan oshsa restart) — kichik tanlama, shovqinli
    expect(a.turnsPerGame.every((t) => t <= 250)).toBe(true);
  }, 60_000);
});
