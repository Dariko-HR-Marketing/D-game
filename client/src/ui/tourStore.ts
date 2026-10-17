import type { KV } from "../tours";
/** Brauzer saqlagichi (maxfiy rejimda xatosiz: saqlanmaydi, har safar ko'rsatiladi). Native'da — xotira. */
const mem = new Map<string, string>();
export const tourKV: KV = {
  get: (k) => { try { const v = (globalThis as any).localStorage?.getItem(k); return v === undefined ? (mem.get(k) ?? null) : v; } catch { return mem.get(k) ?? null; } },
  set: (k, v) => { try { const ls = (globalThis as any).localStorage; if (ls) { v === null ? ls.removeItem(k) : ls.setItem(k, v); return; } } catch { /* maxfiy rejim */ } v === null ? mem.delete(k) : mem.set(k, v); },
};
const bus = new Set<() => void>();
/** «?» tugmasi: joriy sahifa yo'riqnomasini qayta ochadi. */
export const replayTour = () => { for (const f of bus) f(); };
export const onReplay = (f: () => void) => { bus.add(f); return () => { bus.delete(f); }; };
