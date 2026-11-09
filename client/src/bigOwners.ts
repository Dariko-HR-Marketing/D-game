/** Katta aylana taxtasi: qaysi katakdagi biznesni kim sotib olgan (aktiv kodi `big-<katak>`), kim orzusini amalga oshirgan (`dreamAt`) va kim orzu katagiga yetib kelgan, lekin shart bajarilmagan (`dreamVisits`). Faqat holatdan hisoblanadi. */
export interface BigOwner { id: string; n: number; kind: "biz" | "dream" | "visit" }
type P = { id: string; assets?: { code: string }[]; dreamAt?: number | null; dreamVisits?: number[] };
/** Katak → egalar ro'yxati (tartib: biznes egasi, orzu amalga oshgan, yetib kelganlar). Bir katakda bir nechta o'yinchi «yetib kelgan» bo'lishi mumkin. */
export function bigOwners(players: P[]): Map<number, BigOwner[]> {
  const out = new Map<number, BigOwner[]>(); const add = (cell: number, o: BigOwner) => { const a = out.get(cell) ?? []; a.push(o); out.set(cell, a); };
  const rank = { biz: 0, dream: 1, visit: 2 } as const;
  players.forEach((p, k) => {
    for (const a of p.assets ?? []) { const m = /^big-(\d+)$/.exec(a.code); if (m) add(Number(m[1]), { id: p.id, n: k + 1, kind: "biz" }); }
    if (typeof p.dreamAt === "number") add(p.dreamAt, { id: p.id, n: k + 1, kind: "dream" });
    for (const v of p.dreamVisits ?? []) if (v !== p.dreamAt) add(v, { id: p.id, n: k + 1, kind: "visit" });
  });
  for (const a of out.values()) a.sort((x, y) => rank[x.kind] - rank[y.kind] || x.n - y.n);
  return out;
}
