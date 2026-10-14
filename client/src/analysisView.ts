/** Seriyani ko'rsatish uchun nuqtalar soniga kamaytirish (oxirgi nuqta saqlanadi). */
export function downsample<T>(xs: T[], max: number): T[] {
  if (xs.length <= max) return xs;
  const out: T[] = []; for (let i = 0; i < max - 1; i++) out.push(xs[Math.floor((i * (xs.length - 1)) / (max - 1))]);
  out.push(xs[xs.length - 1]); return out;
}
/** Ustun balandliklari: manfiy qiymat ham ko'rinadi (nol chiziq bilan). Qaytadi: [0..1] nisbiy, `neg` bayrog'i. */
export function bars(values: number[]): { h: number; neg: boolean }[] {
  const m = Math.max(1, ...values.map((v) => Math.abs(v)));
  return values.map((v) => ({ h: Math.abs(v) / m, neg: v < 0 }));
}
