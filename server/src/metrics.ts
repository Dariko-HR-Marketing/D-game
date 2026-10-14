// Minimal Prometheus-mos ko'rsatkichlar (bog'liqliksiz). Shaxsiy ma'lumot yo'q: faqat sonlar va umumiy yorliqlar.
type Labels = Record<string, string>;
const key = (l: Labels) => Object.entries(l).sort().map(([k, v]) => `${k}="${v.replace(/["\\\n]/g, "_")}"`).join(",");

export class Metrics {
  private counters = new Map<string, Map<string, number>>();
  private hist = new Map<string, { buckets: number[]; data: Map<string, { counts: number[]; sum: number; n: number }> }>();
  private gauges = new Map<string, () => number>();
  private help = new Map<string, string>();

  counter(name: string, help: string) { this.help.set(name, help); return (l: Labels = {}, by = 1) => { const m = this.counters.get(name) ?? this.counters.set(name, new Map()).get(name)!; const k = key(l); m.set(k, (m.get(k) ?? 0) + by); }; }
  gauge(name: string, help: string, f: () => number) { this.help.set(name, help); this.gauges.set(name, f); }
  histogram(name: string, help: string, buckets: number[]) {
    this.help.set(name, help); this.hist.set(name, { buckets, data: new Map() });
    return (v: number, l: Labels = {}) => { const h = this.hist.get(name)!; const k = key(l); const d = h.data.get(k) ?? h.data.set(k, { counts: h.buckets.map(() => 0), sum: 0, n: 0 }).get(k)!;
      h.buckets.forEach((b, i) => { if (v <= b) d.counts[i]++; }); d.sum += v; d.n++; };
  }

  render(): string {
    const out: string[] = [];
    for (const [name, m] of this.counters) { out.push(`# HELP ${name} ${this.help.get(name)}`, `# TYPE ${name} counter`); for (const [k, v] of m) out.push(`${name}${k ? `{${k}}` : ""} ${v}`); }
    for (const [name, f] of this.gauges) out.push(`# HELP ${name} ${this.help.get(name)}`, `# TYPE ${name} gauge`, `${name} ${f()}`);
    for (const [name, h] of this.hist) {
      out.push(`# HELP ${name} ${this.help.get(name)}`, `# TYPE ${name} histogram`);
      for (const [k, d] of h.data) { const sep = k ? "," : ""; h.buckets.forEach((b, i) => out.push(`${name}_bucket{${k}${sep}le="${b}"} ${d.counts[i]}`));
        out.push(`${name}_bucket{${k}${sep}le="+Inf"} ${d.n}`, `${name}_sum${k ? `{${k}}` : ""} ${d.sum}`, `${name}_count${k ? `{${k}}` : ""} ${d.n}`); }
    }
    return out.join("\n") + "\n";
  }
}
