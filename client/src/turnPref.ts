import { tourKV } from "./ui/tourStore";
import { GAME_MODES, MODES, type GameMode } from "@poyga/rules";
/** Xona ochganda tanlanadigan tezlik (30 — odatiy, 60 — sekin ×2); oxirgi tanlov qurilmada eslab qolinadi. */
export type TurnSeconds = 30 | 60;
const KEY = "poyga-turn-seconds";
export const getTurnPref = (): TurnSeconds => (tourKV.get(KEY) === "60" ? 60 : 30);
export const setTurnPref = (v: TurnSeconds) => tourKV.set(KEY, String(v));
/** Xona tezligi: «Odatiy» — kubik 10, karta 30 soniya; «Sekin» — hammasi ×2 (taymer jadvali: rules RULES). */
export const turnLabel = (s: number) => (s === 60 ? "Sekin (×2)" : "Odatiy");

/** Hisob rejimi: «Avtomatik» (standart) yoki «O'zim hisoblayman» (o'quv rejimi). Buyurtmachi qarori (2026-10-21): qo'lda hisoblash oddiy o'yinchiga foyda bermadi — standart avtomatik, tanlov tugmasi ko'rinmaydi.
 *  O'quv rejimi (sinf/trener) uchun imkoniyat saqlangan: qurilmada `poyga-calc-ui=1` bo'lsa tanlov ko'rinadi. */
export type CalcMode = "manual" | "auto";
const CKEY = "poyga-calc";
export const getCalcPref = (): CalcMode => (tourKV.get(CKEY) === "manual" && calcUiEnabled() ? "manual" : "auto");
export const calcUiEnabled = () => tourKV.get("poyga-calc-ui") === "1";
export const setCalcPref = (v: CalcMode) => tourKV.set(CKEY, v);

/** Xona yaratishda oldindan belgilanadigan o'yinchilar soni (2–8): odam yetmasa botlar to'ldiradi. Oxirgi tanlov qurilmada eslab qolinadi. */
export type Seats = 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const SEATS: readonly Seats[] = [2, 3, 4, 5, 6, 7, 8];
const SKEY = "poyga-seats";
export const getSeatsPref = (): Seats => { const n = Number(tourKV.get(SKEY)); return (SEATS as readonly number[]).includes(n) ? (n as Seats) : 4; };
export const setSeatsPref = (v: Seats) => tourKV.set(SKEY, String(v));

/** O'yin turi (rejim): standart, tez, reytingli, o'quv. Oxirgi tanlov qurilmada eslab qolinadi. Chegaralar dvigateldan (MODES). */
export type { GameMode } from "@poyga/rules";
const MKEY = "poyga-mode";
export const getModePref = (): GameMode => { const v = tourKV.get(MKEY); return (GAME_MODES as readonly string[]).includes(v ?? "") ? (v as GameMode) : "standard"; };
export const setModePref = (v: GameMode) => tourKV.set(MKEY, v);
/** Tanlangan rejimda ruxsat etilgan o'rinlar (o'quv — qat'iy 3). */
export const seatsFor = (mode: GameMode): Seats[] => SEATS.filter((n) => n >= MODES[mode].seats[0] && n <= MODES[mode].seats[1]);
export const clampSeats = (mode: GameMode, n: Seats): Seats => { const ok = seatsFor(mode); return ok.includes(n) ? n : ok.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a)); };
export const GAME_MODES_UI = GAME_MODES;

/** Kubik oynasi: o'z navbatingizda «Kubikni tashlash» tugmasi oynaning eng oldida (modal) chiqadi. Standart — yoqilgan; `poyga-roll-modal=off` bo'lsa oddiy tugma. */
const RKEY = "poyga-roll-modal";
export const getRollModalPref = (): boolean => tourKV.get(RKEY) !== "off";
export const setRollModalPref = (on: boolean) => tourKV.set(RKEY, on ? "on" : "off");
