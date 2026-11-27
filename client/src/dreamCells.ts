/** Tanlangan orzularni katta aylanadagi «O» (orzu) kataklariga joylashtirish — faqat ko'rsatish uchun (g'alaba qoidasi o'zgarmaydi: OPEN_QUESTIONS 156).
 *  Joylashuv xona kodidan deterministik hisoblanadi: hamma o'yinchi bir xil ko'radi. Orzular faqat o'yinchilar tanlaganlari (katalogdan, server yuborganlari);
 *  qolgan kataklar bo'sh — orzu to'qilmaydi. */
export interface PlacedDream { name: string; price: number; by: string }

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed: number) => () => { seed = (Math.imul(seed ^ (seed >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return seed / 4294967296; };

export function dreamCells(code: string, oCells: number[], players: { id: string; dreamIdx?: number | null }[], dreams: ({ name: string; price: number } | null)[] | undefined): Map<number, PlacedDream> {
  const out = new Map<number, PlacedDream>(); if (!dreams) return out;
  const chosen: PlacedDream[] = [];
  for (const p of players) { const d = p.dreamIdx !== null && p.dreamIdx !== undefined ? dreams[p.dreamIdx] : null; if (d) chosen.push({ name: d.name, price: d.price, by: p.id }); }
  const cells = [...oCells], r = rng(hash(code));
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  chosen.slice(0, cells.length).forEach((d, i) => out.set(cells[i], d));
  return out;
}
