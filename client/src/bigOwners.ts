/** Katta aylana taxtasi: qaysi katakdagi biznesni kim sotib olgan (aktiv kodi `big-<katak>`: turg'un va tavakkal bizneslar) va kim orzusini amalga oshirgan (`dreamAt`). Faqat holatdan hisoblanadi. */
export interface BigOwner { id: string; n: number; dream: boolean }
export function bigOwners(players: { id: string; assets?: { code: string }[]; dreamAt?: number | null }[]): Map<number, BigOwner> {
  const out = new Map<number, BigOwner>();
  players.forEach((p, k) => {
    for (const a of p.assets ?? []) { const m = /^big-(\d+)$/.exec(a.code); if (m) out.set(Number(m[1]), { id: p.id, n: k + 1, dream: false }); }
    if (typeof p.dreamAt === "number") out.set(p.dreamAt, { id: p.id, n: k + 1, dream: true });
  });
  return out;
}
