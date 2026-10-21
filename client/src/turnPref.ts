import { tourKV } from "./ui/tourStore";
/** Xona ochganda tanlanadigan qaror vaqti (30 yoki 60 soniya); oxirgi tanlov qurilmada eslab qolinadi. */
export type TurnSeconds = 30 | 60;
const KEY = "poyga-turn-seconds";
export const getTurnPref = (): TurnSeconds => (tourKV.get(KEY) === "60" ? 60 : 30);
export const setTurnPref = (v: TurnSeconds) => tourKV.set(KEY, String(v));
export const turnLabel = (s: number) => (s === 60 ? "1 daqiqa" : `${s} soniya`);

/** Hisob rejimi: «Avtomatik» (standart) yoki «O'zim hisoblayman» (o'quv rejimi). Buyurtmachi qarori (2026-10-21): qo'lda hisoblash oddiy o'yinchiga foyda bermadi — standart avtomatik, tanlov tugmasi ko'rinmaydi.
 *  O'quv rejimi (sinf/trener) uchun imkoniyat saqlangan: qurilmada `poyga-calc-ui=1` bo'lsa tanlov ko'rinadi. */
export type CalcMode = "manual" | "auto";
const CKEY = "poyga-calc";
export const getCalcPref = (): CalcMode => (tourKV.get(CKEY) === "manual" && calcUiEnabled() ? "manual" : "auto");
export const calcUiEnabled = () => tourKV.get("poyga-calc-ui") === "1";
export const setCalcPref = (v: CalcMode) => tourKV.set(CKEY, v);

/** Xona yaratishda oldindan belgilanadigan o'yinchilar soni (2–6): odam yetmasa botlar to'ldiradi. Oxirgi tanlov qurilmada eslab qolinadi. */
export type Seats = 2 | 3 | 4 | 5 | 6;
export const SEATS: readonly Seats[] = [2, 3, 4, 5, 6];
const SKEY = "poyga-seats";
export const getSeatsPref = (): Seats => { const n = Number(tourKV.get(SKEY)); return (SEATS as readonly number[]).includes(n) ? (n as Seats) : 4; };
export const setSeatsPref = (v: Seats) => tourKV.set(SKEY, String(v));
