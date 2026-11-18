import { tourKV } from "./ui/tourStore";
import { uz } from "./i18n/uz";
import { GAME_MODES, MODES, type GameMode } from "@tajriba24/rules";
/** Xona ochganda tanlanadigan tezlik (30 — odatiy, 60 — sekin ×2, 0 — vaqtsiz «Mehrojiddin»); oxirgi tanlov qurilmada eslab qolinadi. */
export type TurnSeconds = 0 | 60 | 120;
const KEY = "tajriba24-turn-seconds";
export const getTurnPref = (): TurnSeconds => (tourKV.get(KEY) === "120" ? 120 : tourKV.get(KEY) === "0" ? 0 : 60);
export const setTurnPref = (v: TurnSeconds) => tourKV.set(KEY, String(v));
/** Xona tezligi: «Odatiy» — kubik 10, karta 30 soniya; «Sekin» — hammasi ×2 (taymer jadvali: rules RULES). */
export const turnLabel = (s: number) => (s === 0 ? uz.home.turn0Full : s === 120 ? "Sekin · 2 daqiqa" : s === 30 ? "Odatiy · 30 soniya" : "Odatiy · 1 daqiqa");

/** Hisob rejimi: «Avtomatik» (standart) yoki «O'zim hisoblayman» (o'quv rejimi). Buyurtmachi qarori (2026-10-21): qo'lda hisoblash oddiy o'yinchiga foyda bermadi — standart avtomatik, tanlov tugmasi ko'rinmaydi.
 *  O'quv rejimi (sinf/trener) uchun imkoniyat saqlangan: qurilmada `tajriba24-calc-ui=1` bo'lsa tanlov ko'rinadi. */
export type CalcMode = "manual" | "auto";
const CKEY = "tajriba24-calc";
export const getCalcPref = (): CalcMode => (tourKV.get(CKEY) === "manual" && calcUiEnabled() ? "manual" : "auto");
export const calcUiEnabled = () => tourKV.get("tajriba24-calc-ui") === "1";
export const setCalcPref = (v: CalcMode) => tourKV.set(CKEY, v);

/** Xona yaratishda oldindan belgilanadigan o'yinchilar soni (2–8): odam yetmasa botlar to'ldiradi. Oxirgi tanlov qurilmada eslab qolinadi. */
export type Seats = 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const SEATS: readonly Seats[] = [2, 3, 4, 5, 6, 7, 8];
const SKEY = "tajriba24-seats";
export const getSeatsPref = (): Seats => { const n = Number(tourKV.get(SKEY)); return (SEATS as readonly number[]).includes(n) ? (n as Seats) : 4; };
export const setSeatsPref = (v: Seats) => tourKV.set(SKEY, String(v));

/** O'yin turi (rejim): standart, tez, reytingli, o'quv. Oxirgi tanlov qurilmada eslab qolinadi. Chegaralar dvigateldan (MODES). */
export type { GameMode } from "@tajriba24/rules";
const MKEY = "tajriba24-mode";
export const getModePref = (): UiMode => (tourKV.get(MKEY) === "student" ? "student" : "standard");
export const setModePref = (v: UiMode) => tourKV.set(MKEY, v);
/** Tanlangan rejimda ruxsat etilgan o'rinlar (o'quv — qat'iy 3). */
export const seatsFor = (mode: GameMode | UiMode): Seats[] => SEATS.filter((n) => n >= MODES[mode === "student" ? "standard" : mode].seats[0] && n <= MODES[mode === "student" ? "standard" : mode].seats[1]);
export const clampSeats = (mode: GameMode | UiMode, n: Seats): Seats => { const ok = seatsFor(mode); return ok.includes(n) ? n : ok.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a)); };
/** Tanlovda ko'rinadigan turlar (buyurtmachi qarori 2026-11-18): Standart va Student bir xil qoidada; Tez, Reytingli va O'quv tanlovdan olingan. Serverda ikkalasi ham «standard». */
export type UiMode = "standard" | "student";
export const GAME_MODES_UI: readonly UiMode[] = ["standard", "student"];
export const serverMode = (_m: UiMode): GameMode => "standard";

/** Kubik oynasi: o'z navbatingizda «Kubikni tashlash» tugmasi oynaning eng oldida (modal) chiqadi. Standart — yoqilgan; `tajriba24-roll-modal=off` bo'lsa oddiy tugma. */
const RKEY = "tajriba24-roll-modal";
export const getRollModalPref = (): boolean => tourKV.get(RKEY) !== "off";
export const setRollModalPref = (on: boolean) => tourKV.set(RKEY, on ? "on" : "off");
