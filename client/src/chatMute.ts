// Chatda o'yinchini jim qilish: faqat shu qurilmada saqlanadi (boshqalarga ta'sir qilmaydi).
const KEY = "poyga-chat-muted";
const ls = () => { try { return (globalThis as any).localStorage as Storage | undefined; } catch { return undefined; } };
export function getMuted(): Set<string> { try { const v = ls()?.getItem(KEY); return new Set(v ? (JSON.parse(v) as string[]) : []); } catch { return new Set(); } }
export function setMuted(id: string, on: boolean): Set<string> {
  const m = getMuted(); on ? m.add(id) : m.delete(id);
  try { ls()?.setItem(KEY, JSON.stringify([...m].slice(-200))); } catch { /* xotira yopiq: shu seans uchun ishlaydi */ }
  return m;
}
