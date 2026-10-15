import { describe, it, expect } from "vitest";
import { contrast, readableOn } from "./contrast";
import { color, GREEN_TEXT, MIN_TAP, PLAYER_COLORS } from "./theme";

describe("rang kontrasti (WCAG 2.2 AA)", () => {
  const AA = 4.5;
  it.each([
    ["asosiy matn / fon", color.navy, color.bg], ["asosiy matn / oq panel", color.navy, color.white],
    ["ikkinchi matn / fon", color.text2, color.bg], ["ikkinchi matn / oq panel", color.text2, color.white],
    ["tugma matni (oq) / yashil", color.white, color.green], ["yashil matn / oq", color.green, color.white], ["yashil matn (GREEN_TEXT) / fon", GREEN_TEXT, color.bg], ["GREEN_TEXT / oq", GREEN_TEXT, color.white],
    ["xarajat (qizil) / oq", color.red, color.white], ["xarajat (qizil) / fon", color.red, color.bg],
    ["navy / oltin", color.navy, color.gold],
  ])("%s ≥ 4.5", (_n, a, b) => expect(contrast(a, b)).toBeGreaterThanOrEqual(AA));
  it("o'yinchi rangi o'zi yetarli kontrast bermasa ham, to'q kontur bilan ajraladi (UI ≥ 3, WCAG 1.4.11)", () => {
    for (const c of PLAYER_COLORS) expect(Math.max(contrast(c, color.bg), contrast(color.navy, color.bg)), c).toBeGreaterThanOrEqual(3);
    expect(contrast(color.navy, color.bg)).toBeGreaterThanOrEqual(3); // kontur rangi
  });
  it("readableOn har doim ≥ 4.5 beradigan matn rangini tanlaydi (taxta kataklari uchun)", () => {
    for (const bg of [color.navy, color.green, color.red, color.gold, "#2C6DB5", color.text2, "#7B4FA3"]) expect(contrast(bg, readableOn(bg)), bg).toBeGreaterThanOrEqual(4.5);
  });
  it("tugma balandligi ≥ 44 px", () => expect(MIN_TAP).toBeGreaterThanOrEqual(44));
});

import { animationMs, CARD_OPEN_MS } from "./motionConfig";
describe("harakatni kamaytirish (§10)", () => {
  it("karta ochilishi ≈ 240 ms, sozlama yoqilsa 0", () => { expect(CARD_OPEN_MS).toBe(240); expect(animationMs(false)).toBe(240); expect(animationMs(true)).toBe(0); });
});

import { surface, tone } from "./theme";
describe("ma'no ranglari va yumshoq fonlar (WCAG AA)", () => {
  it.each([
    ["yaxshi / yaxshi fon", tone.good, surface.good], ["yomon / yomon fon", tone.bad, surface.bad], ["diqqat / diqqat fon", tone.warn, surface.warn],
    ["asosiy / ma'lumot fon", color.navy, surface.info], ["yaxshi / oq", tone.good, color.white], ["yomon / oq", tone.bad, color.white], ["diqqat / oq", tone.warn, color.white], ["ikkinchi matn / oq", tone.muted, color.white],
  ])("%s ≥ 4.5", (_n, a, b) => expect(contrast(a, b)).toBeGreaterThanOrEqual(4.5));
});
