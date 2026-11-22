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
/** Taxta shakli: yuqori/pastki qatordagi (burchaklar bilan) va yon ustunlardagi kataklar soni; `offset` — 0-katak yo'lning qaysi o'rnida turishi.
 *  Qoida (buyurtmachi, 2026-11-22): to'rtta DAROMAD katagi («D» — kichik, «Yana pullar» — katta aylana) taxtaning to'rt burchagiga tushadi. Yo'l oralig'i: kichik 9/15/9/15, katta 15/11/16/11 — shakllar shunga moslab tanlangan. */
export interface RingShape { t: number; b: number; l: number; r: number; offset: number }
const SHAPES = { s48w: { t: 16, b: 16, l: 8, r: 8, offset: 4 }, s48n: { t: 10, b: 10, l: 14, r: 14, offset: 37 }, s53w: { t: 17, b: 16, l: 10, r: 10, offset: 27 }, s53n: { t: 12, b: 12, l: 14, r: 15, offset: 38 } } as const satisfies Record<string, RingShape>;
export const ringShape = (n: number, wide: boolean): RingShape => (n === 48 ? (wide ? SHAPES.s48w : SHAPES.s48n) : (wide ? SHAPES.s53w : SHAPES.s53n)); // doimiy obyekt: React.useMemo har chizishda qayta hisoblamaydi
/** Yo'ldagi burchak indekslari (soat yo'nalishida: yuqori-chap, yuqori-o'ng, pastki-o'ng, pastki-chap). */
export const ringCorners = (s: RingShape): number[] => [0, s.t - 1, s.t + s.r, s.t + s.r + s.b - 1];
/** `squareRing`ning umumlashmasi: yuqori va pastki qatorlarda kataklar soni har xil bo'lishi mumkin. */
export function ringTiles(s: RingShape, W: number, H: number, c: number): Tile[] {
  const out: Tile[] = [], tw = (W - 2 * c) / (s.t - 2), bw = (W - 2 * c) / (s.b - 2), rh = (H - 2 * c) / s.r, lh = (H - 2 * c) / s.l;
  for (let i = 0; i < s.t; i++) { const corner = i === 0 || i === s.t - 1; out.push({ x: corner ? (i === 0 ? 0 : W - c) : c + (i - 1) * tw, y: 0, w: corner ? c : tw, h: c, corner }); }
  for (let j = 0; j < s.r; j++) out.push({ x: W - c, y: c + j * rh, w: c, h: rh, corner: false });
  for (let i = s.b - 1; i >= 0; i--) { const corner = i === 0 || i === s.b - 1; out.push({ x: corner ? (i === 0 ? 0 : W - c) : c + (i - 1) * bw, y: H - c, w: corner ? c : bw, h: c, corner }); }
  for (let j = s.l - 1; j >= 0; j--) out.push({ x: 0, y: c + j * lh, w: c, h: lh, corner: false });
  return out;
}
/** Katak indeksi → yo'l indeksi. `offset`: 0-katak (START) yo'lning qaysi o'rnida turishi. */
export const pathIndex = (cell: number, n: number, offset: number) => (((cell + offset) % n) + n) % n;

/** Katak yozuvi o'lchami: eng uzun so'z katakka sig'adigan eng katta o'lcham (so'z o'rtasidan bo'linmasin); kompyuterda (kengroq katak) 13 px gacha, telefonda 10 px; ikki qator ikonka bilan katak balandligiga sig'adi. 8 dan kichik bo'lsa yozuv ko'rsatilmaydi (ikonka + rang qoladi). */
export const labelSize = (label: string, w: number, h: number = 999, wide = false) => { const longest = Math.max(...label.split(" ").map((x) => x.length), 4); const fitW = ((w - 8) / (longest * 0.78)), fitH = (h - 26) / 2.4; return Math.floor(Math.min(wide ? 13 : 10, fitW, fitH) * 2) / 2; };
