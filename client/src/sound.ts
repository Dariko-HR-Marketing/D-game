// Tovush tizimi (Web Audio, tashqi fayllarsiz: hamma tovush sintez qilinadi). Holatlar: kubik, qadam, karta, pul, navbat, hisoblagich, g'alaba.
// Brauzer faqat foydalanuvchi harakatidan keyin ovoz chiqarishga ruxsat beradi — `unlock()` birinchi bosishda chaqiriladi. Native ilovada (AudioContext yo'q) hech narsa qilmaydi.
export type Sfx = "click" | "roll" | "land" | "step" | "card" | "gain" | "pay" | "turn" | "tick" | "win" | "lose" | "error"
  | "child" | "jobloss" | "freedom" | "unexpected" | "market" | "offer" | "opportunity" | "buy" | "sell" | "unlock" | "milestone" | "levelup"; // lahzalar (moments.ts): har biri o'z his-tuyg'usiga ega qisqa motiv
export type Tone = { t: number; f: number; d: number; type?: "sine" | "triangle" | "square" | "sawtooth"; g?: number; f2?: number };
export type Noise = { t: number; d: number; g: number; f: number; q?: number };
export type Recipe = { tones?: Tone[]; noise?: Noise[] };

const rattle = (): Noise[] => { const ts = [0, 0.09, 0.17, 0.26, 0.36, 0.47, 0.6, 0.76]; return ts.map((t, i) => ({ t, d: 0.045, g: 0.35 - i * 0.025, f: 2200 + (i % 3) * 700, q: 1.2 })); };
/** Har bir tovushning "retsepti": tonlar (chastota, vaqt, davomiylik, ovoz balandligi) va shovqin (kubik shitirlashi). */
export const RECIPES: Record<Sfx, Recipe> = {
  click: { tones: [{ t: 0, f: 880, d: 0.04, type: "triangle", g: 0.2 }] },
  roll: { noise: rattle(), tones: [{ t: 0, f: 90, d: 0.7, type: "sine", g: 0.05, f2: 60 }] },
  land: { tones: [{ t: 0, f: 150, d: 0.14, type: "sine", g: 0.5, f2: 55 }], noise: [{ t: 0, d: 0.05, g: 0.4, f: 1500, q: 0.8 }] },
  step: { tones: [{ t: 0, f: 520, d: 0.07, type: "triangle", g: 0.3, f2: 420 }], noise: [{ t: 0, d: 0.02, g: 0.15, f: 3000, q: 1 }] },
  card: { noise: [{ t: 0, d: 0.14, g: 0.18, f: 2500, q: 0.6 }], tones: [{ t: 0.06, f: 660, d: 0.2, type: "sine", g: 0.22 }, { t: 0.14, f: 880, d: 0.26, type: "sine", g: 0.2 }] },
  gain: { tones: [{ t: 0, f: 1320, d: 0.09, type: "triangle", g: 0.26 }, { t: 0.08, f: 1760, d: 0.16, type: "triangle", g: 0.24 }] },
  pay: { tones: [{ t: 0, f: 392, d: 0.12, type: "triangle", g: 0.24 }, { t: 0.1, f: 294, d: 0.2, type: "triangle", g: 0.22 }] },
  turn: { tones: [{ t: 0, f: 784, d: 0.22, type: "sine", g: 0.28 }, { t: 0.16, f: 1047, d: 0.34, type: "sine", g: 0.28 }] },
  tick: { tones: [{ t: 0, f: 1000, d: 0.035, type: "square", g: 0.1 }] },
  win: { tones: [...[523, 659, 784, 1047].map((f, i): Tone => ({ t: i * 0.13, f, d: 0.28, type: "triangle", g: 0.28 })), { t: 0.6, f: 1047, d: 0.7, type: "sine", g: 0.2 }, { t: 0.6, f: 784, d: 0.7, type: "sine", g: 0.16 }, { t: 0.6, f: 659, d: 0.7, type: "sine", g: 0.14 }] },
  lose: { tones: [{ t: 0, f: 392, d: 0.22, type: "triangle", g: 0.24 }, { t: 0.2, f: 330, d: 0.22, type: "triangle", g: 0.22 }, { t: 0.4, f: 262, d: 0.4, type: "triangle", g: 0.2 }] },
  // --- Lahzalar: his-tuyg'u bo'yicha motivlar (qisqa, minimal; hammasi sintez) ---
  child: { tones: [1047, 1319, 1568, 2093].map((f, i): Tone => ({ t: i * 0.12, f, d: 0.34, type: "sine", g: 0.2 })) }, // quvonch: musiqa qutisi
  jobloss: { tones: [{ t: 0, f: 330, d: 0.22, type: "sawtooth", g: 0.12 }, { t: 0.2, f: 262, d: 0.22, type: "sawtooth", g: 0.12 }, { t: 0.4, f: 196, d: 0.5, type: "sawtooth", g: 0.12 }, { t: 0, f: 80, d: 0.5, type: "sine", g: 0.3, f2: 50 }] }, // pastga tushuvchi: umidsizlik
  freedom: { tones: [{ t: 0, f: 523, d: 0.16, type: "triangle", g: 0.26 }, { t: 0.14, f: 784, d: 0.16, type: "triangle", g: 0.26 }, { t: 0.28, f: 1047, d: 0.5, type: "triangle", g: 0.28 }, { t: 0.28, f: 1319, d: 0.5, type: "sine", g: 0.16 }] }, // ozodlik: ko'tarilish
  unexpected: { noise: [{ t: 0, d: 0.18, g: 0.35, f: 900, q: 0.7 }], tones: [{ t: 0, f: 220, d: 0.3, type: "square", g: 0.14 }, { t: 0, f: 311, d: 0.3, type: "square", g: 0.12 }, { t: 0.28, f: 98, d: 0.45, type: "sine", g: 0.35, f2: 55 }] }, // keskin urg'u + pastki zarb
  market: { noise: [{ t: 0, d: 0.03, g: 0.25, f: 3800, q: 2 }, { t: 0.07, d: 0.03, g: 0.25, f: 3800, q: 2 }], tones: [{ t: 0.16, f: 1568, d: 0.16, type: "sine", g: 0.2 }, { t: 0.26, f: 1175, d: 0.26, type: "sine", g: 0.18 }] }, // birja ticker + qo'ng'iroq
  offer: { tones: [{ t: 0, f: 988, d: 0.1, type: "triangle", g: 0.24 }, { t: 0.1, f: 1319, d: 0.1, type: "triangle", g: 0.24 }, { t: 0.2, f: 1760, d: 0.3, type: "sine", g: 0.22 }] },
  opportunity: { tones: [523, 659, 784, 1047].map((f, i): Tone => ({ t: i * 0.07, f, d: 0.2, type: "triangle", g: 0.22 })) }, // yorqin arpedjio
  buy: { noise: [{ t: 0, d: 0.05, g: 0.3, f: 2500, q: 1 }], tones: [{ t: 0.05, f: 988, d: 0.12, type: "triangle", g: 0.26 }, { t: 0.14, f: 1319, d: 0.12, type: "triangle", g: 0.26 }, { t: 0.24, f: 1976, d: 0.45, type: "sine", g: 0.22 }] }, // kassa «kring»
  sell: { noise: [{ t: 0, d: 0.04, g: 0.25, f: 3200, q: 1.5 }, { t: 0.09, d: 0.04, g: 0.2, f: 3600, q: 1.5 }], tones: [{ t: 0, f: 1760, d: 0.1, type: "triangle", g: 0.22 }, { t: 0.08, f: 2093, d: 0.1, type: "triangle", g: 0.22 }, { t: 0.16, f: 2637, d: 0.24, type: "triangle", g: 0.2 }] }, // tangalar
  unlock: { tones: [{ t: 0, f: 659, d: 0.18, type: "sine", g: 0.24 }, { t: 0.14, f: 880, d: 0.18, type: "sine", g: 0.24 }, { t: 0.28, f: 1319, d: 0.6, type: "sine", g: 0.24 }, { t: 0.28, f: 988, d: 0.6, type: "triangle", g: 0.14 }] }, // eshik ochilishi
  milestone: { tones: [{ t: 0, f: 784, d: 0.2, type: "sine", g: 0.24 }, { t: 0.16, f: 1047, d: 0.4, type: "sine", g: 0.24 }] },
  levelup: { tones: [...[523, 659, 784, 1047, 1319].map((f, i): Tone => ({ t: i * 0.09, f, d: 0.3, type: "triangle", g: 0.26 })), { t: 0.5, f: 1047, d: 0.8, type: "sine", g: 0.2 }, { t: 0.5, f: 784, d: 0.8, type: "sine", g: 0.16 }] }, // daraja oshdi
  error: { tones: [{ t: 0, f: 200, d: 0.12, type: "square", g: 0.1 }, { t: 0.14, f: 160, d: 0.16, type: "square", g: 0.1 }] },
};
/** Yorliq yashirin (boshqa tabda) bo'lsa ham chaladigan ogohlantirishlar; qolganlari jim. */
export const ALERTS: ReadonlySet<Sfx> = new Set(["turn", "win", "lose"]);
export const recipeLength = (r: Recipe) => Math.max(0, ...(r.tones ?? []).map((x) => x.t + x.d), ...(r.noise ?? []).map((x) => x.t + x.d));

// --- Minimal AudioContext interfeysi (testda soxtasi beriladi) ---
type Param = { value: number; setValueAtTime(v: number, t: number): void; linearRampToValueAtTime(v: number, t: number): void; exponentialRampToValueAtTime(v: number, t: number): void };
type Node = { connect(n: any): any };
export interface Ctx {
  state: string; currentTime: number; sampleRate: number; destination: any; resume(): Promise<void> | void;
  createGain(): Node & { gain: Param }; createOscillator(): Node & { type: string; frequency: Param; start(t: number): void; stop(t: number): void };
  createBuffer(ch: number, len: number, rate: number): { getChannelData(c: number): Float32Array };
  createBufferSource(): Node & { buffer: any; start(t: number): void; stop(t: number): void };
  createBiquadFilter(): Node & { type: string; frequency: Param; Q: Param };
}
export type Prefs = { muted: boolean; volume: number };
const KEY = "poyga-sound";
const load = (): Prefs => { try { const j = JSON.parse((globalThis as any).localStorage?.getItem(KEY) ?? "null"); if (j && typeof j.muted === "boolean" && typeof j.volume === "number") return { muted: j.muted, volume: Math.min(1, Math.max(0, j.volume)) }; } catch { /* saqlanmagan */ } return { muted: false, volume: 0.6 }; };
const save = (p: Prefs) => { try { (globalThis as any).localStorage?.setItem(KEY, JSON.stringify(p)); } catch { /* maxfiy rejim */ } };

export class SoundEngine {
  private ctx: Ctx | null = null; private master: (Node & { gain: Param }) | null = null; private noise: any = null; private subs = new Set<() => void>();
  prefs: Prefs;
  constructor(private make: () => Ctx | null = defaultCtx, private hidden: () => boolean = () => (globalThis as any).document?.visibilityState === "hidden", prefs?: Prefs) { this.prefs = prefs ?? load(); }
  get muted() { return this.prefs.muted; }
  subscribe(fn: () => void) { this.subs.add(fn); return () => { this.subs.delete(fn); }; }
  private emit() { for (const f of this.subs) f(); }
  setMuted(m: boolean) { this.prefs = { ...this.prefs, muted: m }; save(this.prefs); this.emit(); }
  toggle() { this.setMuted(!this.prefs.muted); }
  setVolume(v: number) { this.prefs = { ...this.prefs, volume: Math.min(1, Math.max(0, v)) }; save(this.prefs); if (this.master) this.master.gain.value = this.prefs.volume; this.emit(); }
  /** Birinchi foydalanuvchi harakatidan keyin chaqiriladi (brauzer siyosati). */
  unlock() { const c = this.ensure(); if (c && c.state === "suspended") void c.resume(); }
  private ensure(): Ctx | null {
    if (this.ctx) return this.ctx;
    const c = this.make(); if (!c) return null;
    this.ctx = c; this.master = c.createGain(); this.master.gain.value = this.prefs.volume; this.master.connect(c.destination); return c;
  }
  /** `rate` — tovush balandligi ko'paytmasi (qadamlar ketma-ketligida o'sib boradi). Jim rejimda yoki yorliq yashirin bo'lsa (ogohlantirishdan tashqari) hech narsa chalinmaydi. */
  play(name: Sfx, rate = 1): boolean {
    if (this.prefs.muted || this.prefs.volume <= 0) return false;
    if (this.hidden() && !ALERTS.has(name)) return false;
    (globalThis as any).__sfxPlayed?.push(name); // sinov uchun (brauzer tekshiruvi): qaysi ovoz so'ralgani
    const c = this.ensure(); if (!c || !this.master) return false;
    if (c.state === "suspended") void c.resume();
    const r = RECIPES[name], t0 = c.currentTime + 0.005;
    for (const t of r.tones ?? []) {
      const o = c.createOscillator(), g = c.createGain(), a = t0 + t.t, end = a + t.d, peak = t.g ?? 0.25;
      o.type = t.type ?? "sine"; o.frequency.setValueAtTime(t.f * rate, a); if (t.f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, t.f2 * rate), end);
      g.gain.setValueAtTime(0.0001, a); g.gain.linearRampToValueAtTime(peak, a + Math.min(0.01, t.d / 3)); g.gain.exponentialRampToValueAtTime(0.0001, end);
      o.connect(g); g.connect(this.master); o.start(a); o.stop(end + 0.02);
    }
    for (const n of r.noise ?? []) {
      if (!this.noise) { const len = Math.floor(c.sampleRate * 0.3), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.noise = buf; }
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), a = t0 + n.t, end = a + n.d;
      s.buffer = this.noise; f.type = "bandpass"; f.frequency.setValueAtTime(n.f, a); f.Q.setValueAtTime(n.q ?? 1, a);
      g.gain.setValueAtTime(0.0001, a); g.gain.linearRampToValueAtTime(n.g, a + Math.min(0.006, n.d / 3)); g.gain.exponentialRampToValueAtTime(0.0001, end);
      s.connect(f); f.connect(g); g.connect(this.master); s.start(a); s.stop(end + 0.02);
    }
    return true;
  }
}
function defaultCtx(): Ctx | null { const C = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext; if (!C) return null; try { return new C() as Ctx; } catch { return null; } }

export const sfx = new SoundEngine();
// Brauzer: birinchi bosish/tugma — ovoz konteksti ochiladi
const doc = (globalThis as any).document;
if (doc?.addEventListener) { const un = () => { sfx.unlock(); doc.removeEventListener("pointerdown", un, true); doc.removeEventListener("keydown", un, true); }; doc.addEventListener("pointerdown", un, true); doc.addEventListener("keydown", un, true); }
