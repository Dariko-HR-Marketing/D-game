/** WCAG 2.x kontrast nisbati (AA: oddiy matn ≥ 4.5, katta matn va UI ≥ 3). */
const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16); return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05);
}
/** Fon ustida o'qiladigan matn rangi: kontrasti yuqori bo'lgani. */
export const readableOn = (bg: string, light = "#FFFFFF", dark = "#082238") => (contrast(bg, light) >= contrast(bg, dark) ? light : dark);
