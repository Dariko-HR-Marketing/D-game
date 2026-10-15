/** Token bucket: `rate` token/s, sig'imi `burst`. Soat tashqaridan beriladi (testlanadi). */
export class Bucket {
  private tokens: number; private last: number;
  constructor(private rate: number, private burst: number, private now: () => number = Date.now) { this.tokens = burst; this.last = now(); }
  take(n = 1): boolean {
    const t = this.now(); this.tokens = Math.min(this.burst, this.tokens + ((t - this.last) / 1000) * this.rate); this.last = t;
    if (this.tokens < n) return false; this.tokens -= n; return true;
  }
}

/** Kalit (IP) bo'yicha cheklov; eski yozuvlar tozalanadi (xotira cheksiz o'smasin). */
export class KeyedLimiter {
  private m = new Map<string, Bucket>();
  constructor(private rate: number, private burst: number, private now: () => number = Date.now, private max = 10_000) {}
  allow(key: string): boolean {
    let b = this.m.get(key);
    if (b) this.m.delete(key); // LRU: oxirgi ishlatilgan oxirga ko'chadi (eskirgani chiqariladi, faol hujumchining chelagi emas)
    else { if (this.m.size >= this.max) this.m.delete(this.m.keys().next().value!); b = new Bucket(this.rate, this.burst, this.now); }
    this.m.set(key, b);
    return b.take();
  }
}

/** Cheklov kaliti: IPv6 manzillar /64 bo'yicha jamlanadi (bitta mijoz minglab manzil olishi mumkin). */
export function ipKey(ip: string): string {
  if (!ip.includes(":") || ip.startsWith("::ffff:")) return ip.replace(/^::ffff:/, "");
  const [head] = ip.split("%"); const parts = head.split("::"); const left = parts[0] ? parts[0].split(":") : []; const right = parts[1] ? parts[1].split(":") : [];
  const full = [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right];
  return full.slice(0, 4).map((x) => x.toLowerCase().replace(/^0+(?=.)/, "")).join(":") + "::/64";
}
