// Holat yangilanishlarini ketma-ket, kamida `gap` ms oraliq bilan chizishga uzatadi: serverdan xabarlar bir yo'la (uzilishdan keyin, sekin qurilma) kelganda
// React ketma-ket yangilanish chegarasidan («Maximum update depth exceeded») oshib sahifani yiqitmasin. Tartib saqlanadi; navbat `max` dan oshsa eskilari tashlanadi (har bir holat to'liq).
export function paced<T>(apply: (v: T) => void, gap = 40, max = 8, now: () => number = Date.now, timer: (f: () => void, ms: number) => unknown = setTimeout) {
  const q: T[] = []; let last = -Infinity, armed = false;
  const drain = () => {
    armed = false; if (!q.length) return;
    if (q.length > max) q.splice(0, q.length - max);
    last = now(); apply(q.shift() as T);
    if (q.length) { armed = true; timer(drain, gap); }
  };
  return (v: T) => {
    if (!q.length && !armed && now() - last >= gap) { last = now(); apply(v); return; }
    q.push(v); if (!armed) { armed = true; timer(drain, Math.max(0, gap - (now() - last))); }
  };
}
