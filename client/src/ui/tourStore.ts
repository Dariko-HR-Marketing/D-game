import type { KV } from "../tours";
/** Brauzer saqlagichi (maxfiy rejimda xatosiz: saqlanmaydi, har safar ko'rsatiladi). Native'da — xotira. */
const mem = new Map<string, string>();
export const tourKV: KV = {
  get: (k) => { try { const v = (globalThis as any).localStorage?.getItem(k); if (v !== undefined && v !== null) return v; } catch { /* maxfiy rejim */ } return mem.get(k) ?? null; }, // saqlanmagan bo'lsa — xotira zaxirasi (set() yozolmagan holat)
  set: (k, v) => { v === null ? mem.delete(k) : mem.set(k, v); try { const ls = (globalThis as any).localStorage; if (ls) v === null ? ls.removeItem(k) : ls.setItem(k, v); } catch { /* maxfiy rejim: xotirada qoladi */ } },
};
const bus = new Set<() => void>();
/** «?» tugmasi: joriy sahifa yo'riqnomasini qayta ochadi. */
export const replayTour = () => { for (const f of bus) f(); };
export const onReplay = (f: () => void) => { bus.add(f); return () => { bus.delete(f); }; };
