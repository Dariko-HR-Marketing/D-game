/** Funksiya bayroqlari. `rooms` (ochiq o'yinlar) server tomoni tayyor bo'lgani uchun DOIM yoqiq (o'chirish: `-rooms`). `billing` (Paketlar) — to'lov ulanmaguncha yopiq.
 *  Yoqish: `EXPO_PUBLIC_FEATURES=rooms,billing` (yig'ishda) yoki brauzerda `localStorage["tajriba24-features"]="rooms,billing"` (sinov uchun). */
export type Feature = "rooms" | "billing";
const parse = (v: string | null | undefined) => new Set((v ?? "").split(",").map((x) => x.trim()).filter(Boolean));
export function featureOn(f: Feature, env: string | undefined = process.env.EXPO_PUBLIC_FEATURES, ls?: string | null): boolean {
  let stored = ls; if (stored === undefined) { try { stored = (globalThis as any).localStorage?.getItem("tajriba24-features") ?? null; } catch { stored = null; } }
  const on = parse(env), st = parse(stored);
  if (f === "rooms") return !(on.has("-rooms") || st.has("-rooms"));
  return on.has(f) || st.has(f);
}
