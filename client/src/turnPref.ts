import { tourKV } from "./ui/tourStore";
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
