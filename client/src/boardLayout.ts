/** Halqa katagi markazi, [0..1] kvadrat ichida; 0 = tepada, soat yo'nalishida. */
export function ringPosition(i: number, n: number, radius = 0.44, turns = 0): { x: number; y: number } {
  // turns: chorak burilish soni (1 = 90° soat yo'nalishida). Telefonda taxta 90° burilgan ko'rinadi (§9): START chapda.
  const a = (i / n) * 2 * Math.PI - Math.PI / 2 + (turns * Math.PI) / 2;
  return { x: 0.5 + radius * Math.cos(a), y: 0.5 + radius * Math.sin(a) };
}

export interface Tile { x: number; y: number; w: number; h: number; corner: boolean }
/** Kvadrat halqa («maydon»): soat yo'nalishida yuqori-chap burchakdan: yuqori qator → o'ng ustun → pastki qator (o'ngdan chapga) → chap ustun (pastdan yuqoriga).
 *  `n` katak: yuqori/pastki qatorda `cols` tadan; yon ustunlarda qolgani (o'ng ustunda bittaga ko'p bo'lishi mumkin — toq `n` uchun).
 *  `c` — burchak/qator qalinligi (kvadrat). Natija: har bir yo'l indeksi uchun to'rtburchak. */
export function squareRing(n: number, cols: number, W: number, H: number, c: number): Tile[] {
  const side = n - 2 * cols; const left = Math.floor(side / 2), right = side - left; // yon kataklar soni
  const tw = (W - 2 * c) / (cols - 2), out: Tile[] = [];
  for (let i = 0; i < cols; i++) { const corner = i === 0 || i === cols - 1; out.push({ x: corner ? (i === 0 ? 0 : W - c) : c + (i - 1) * tw, y: 0, w: corner ? c : tw, h: c, corner }); }
  const rh = (H - 2 * c) / right; for (let j = 0; j < right; j++) out.push({ x: W - c, y: c + j * rh, w: c, h: rh, corner: false });
  for (let i = cols - 1; i >= 0; i--) { const corner = i === 0 || i === cols - 1; out.push({ x: corner ? (i === 0 ? 0 : W - c) : c + (i - 1) * tw, y: H - c, w: corner ? c : tw, h: c, corner }); }
  const lh = (H - 2 * c) / left; for (let j = left - 1; j >= 0; j--) out.push({ x: 0, y: c + j * lh, w: c, h: lh, corner: false });
  return out;
}
/** Katak indeksi → yo'l indeksi. `offset`: 0-katak (START) yo'lning qaysi o'rnida turishi. */
export const pathIndex = (cell: number, n: number, offset: number) => (((cell + offset) % n) + n) % n;
