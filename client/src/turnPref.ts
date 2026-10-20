import { tourKV } from "./ui/tourStore";
/** Xona ochganda tanlanadigan qaror vaqti (30 yoki 60 soniya); oxirgi tanlov qurilmada eslab qolinadi. */
export type TurnSeconds = 30 | 60;
const KEY = "poyga-turn-seconds";
export const getTurnPref = (): TurnSeconds => (tourKV.get(KEY) === "60" ? 60 : 30);
export const setTurnPref = (v: TurnSeconds) => tourKV.set(KEY, String(v));
export const turnLabel = (s: number) => (s === 60 ? "1 daqiqa" : `${s} soniya`);
