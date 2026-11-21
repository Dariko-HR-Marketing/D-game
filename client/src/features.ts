/** Funksiya bayroqlari: tayyor, lekin server tomoni ulanmagan imkoniyatlar ishlab chiqarishda yopiq turadi.
 *  Yoqish: `EXPO_PUBLIC_FEATURES=rooms,billing` (yig'ishda) yoki brauzerda `localStorage["tajriba24-features"]="rooms,billing"` (sinov uchun). */
export type Feature = "rooms" | "billing";
const parse = (v: string | null | undefined) => new Set((v ?? "").split(",").map((x) => x.trim()).filter(Boolean));
export function featureOn(f: Feature, env: string | undefined = process.env.EXPO_PUBLIC_FEATURES, ls?: string | null): boolean {
  let stored = ls; if (stored === undefined) { try { stored = (globalThis as any).localStorage?.getItem("tajriba24-features") ?? null; } catch { stored = null; } }
  return parse(env).has(f) || parse(stored).has(f);
}
