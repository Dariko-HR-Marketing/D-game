// Admin 2-bosqich: kontent (farq, tekshiruv, ko'rib chiqish), o'yinlar ro'yxati, shubhali o'yinlar, qayta o'ynatish, majburan yopish.
import type { FastifyInstance } from "fastify";
import { EXPECTED_COUNTS } from "@poyga/content";
import type { Guard } from "./admin";
import type { Ops } from "./ops";
import type { ProfileService } from "./profiles";
import type { ContentRegistry } from "./registry";
import { replay } from "./replay";
import type { RoomManager } from "./rooms";
import type { Store } from "./store";

const keyOf = (x: any, i: number): string => (x && typeof x === "object" ? String(x.file || x.id || x.code || x.i || x.n || x.name || i) : String(i));
const short = (v: unknown) => { const j = JSON.stringify(v); return j && j.length > 160 ? j.slice(0, 157) + "…" : j; };
export interface DiffItem { key: string; kind: "added" | "removed" | "changed"; fields?: { path: string; before: string; after: string }[] }
export function diffValues(a: any, b: any, label = ""): { added: number; removed: number; changed: number; items: DiffItem[] } {
  const out = { added: 0, removed: 0, changed: 0, items: [] as DiffItem[] };
  const add = (r: typeof out) => { out.added += r.added; out.removed += r.removed; out.changed += r.changed; out.items.push(...r.items); };
  if (Array.isArray(a) && Array.isArray(b)) {
    const ma = new Map(a.map((x, i) => [keyOf(x, i), x])), mb = new Map(b.map((x, i) => [keyOf(x, i), x]));
    for (const [k, x] of mb) { const y = ma.get(k); const key = label ? `${label}/${k}` : k;
      if (y === undefined) { out.added++; out.items.push({ key, kind: "added" }); }
      else if (JSON.stringify(x) !== JSON.stringify(y)) { out.changed++; const f: { path: string; before: string; after: string }[] = []; if (x && typeof x === "object") for (const p of new Set([...Object.keys(x), ...Object.keys(y)])) if (JSON.stringify(x[p]) !== JSON.stringify(y?.[p])) f.push({ path: p, before: short(y?.[p]) ?? "—", after: short(x[p]) ?? "—" }); out.items.push({ key, kind: "changed", fields: f.slice(0, 12) }); } }
    for (const k of ma.keys()) if (!mb.has(k)) { out.removed++; out.items.push({ key: label ? `${label}/${k}` : k, kind: "removed" }); }
  } else if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { if (Array.isArray(a[k]) && Array.isArray(b[k])) add(diffValues(a[k], b[k], label ? `${label}/${k}` : k)); else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) { out.changed++; out.items.push({ key: label ? `${label}/${k}` : k, kind: "changed", fields: [{ path: k, before: short(b[k]) ?? "—", after: short(a[k]) ?? "—" }] }); } }
  }
  out.items = out.items.slice(0, 300); return out;
}
/** Versiya sog'lig'i: sonlar va muvozanat ogohlantirishlari (nashrdan oldin ko'rib chiqish uchun, bloklamaydi). */
export function checkBundle(b: any): { stats: Record<string, unknown>; warnings: string[] } {
  const w: string[] = []; const c = b.cards ?? {}; const stats: Record<string, unknown> = {};
  for (const [deck, n] of Object.entries(EXPECTED_COUNTS)) { const have = (c[deck] ?? []).length; stats[deck] = have; if (have !== n) w.push(`«${deck}» kartalari soni ${have} (asl nusxada ${n})`); }
  const kasb = (c.kasb ?? []) as any[]; const cfs = kasb.map((k) => k.cf); if (kasb.length) { stats.kasbOylik = { min: Math.min(...cfs), max: Math.max(...cfs) }; for (const k of kasb) { if (k.cf <= 0) w.push(`Kasb «${k.name}»: oylik pul oqimi ${k.cf} (≤ 0)`); if (k.save > k.salary * 12) w.push(`Kasb «${k.name}»: jamg'arma maoshdan 12 baravar ko'p`); } }
  const names = kasb.map((k) => k.name); for (const n of new Set(names)) if (names.filter((x) => x === n).length > 1) w.push(`Kasb nomi takrorlangan: «${n}»`);
  stats.katalog = (c.catalog ?? []).length; const files = new Set<string>(); for (const deck of Object.values(c)) if (Array.isArray(deck)) for (const x of deck as any[]) if (x.file) { if (files.has(x.file)) w.push(`Rasm fayli takrorlangan: ${x.file}`); files.add(x.file); }
  for (const deck of ["kichik", "katta", "bozor", "xar", "kxar", "hod", "new"]) for (const x of c[deck] ?? []) if (!String(x.text ?? "").trim()) w.push(`«${deck}» kartasida matn yo'q (${x.file})`);
  const d = (b.dreams ?? []) as { name: string; price: number }[]; if (d.length) { stats.orzu = { soni: d.length, min: Math.min(...d.map((x) => x.price)), max: Math.max(...d.map((x) => x.price)) }; const dn = d.map((x) => x.name); for (const n of new Set(dn)) if (dn.filter((x) => x === n).length > 1) w.push(`Orzu nomi takrorlangan: «${n}»`); }
  const big = (b.bigBoard ?? []) as any[]; const types: Record<string, number> = {}; for (const x of big) types[x.t] = (types[x.t] ?? 0) + 1; stats.katta = { katak: big.length, turlar: types };
  if (big.length !== 53) w.push(`Katta aylana ${big.length} katak (53 kutiladi)`);
  for (const x of big) if (x.t === "T" && (x.income === null || x.price === null)) w.push(`Katta aylana ${x.i}-katak (T): narx yoki daromad yo'q`);
  for (const dn of dreamsMissing(d, big)) w.push(dn);
  return { stats, warnings: w.slice(0, 100) };
}
const dreamsMissing = (d: { name: string }[], big: any[]) => { const o = big.filter((x) => x.t === "O").map((x) => x.name); return d.filter((x) => !o.includes(x.name)).slice(0, 5).map((x) => `Orzu «${x.name}» katta aylanada «O» katagiga bog'lanmagan`); };

export interface GamesDeps { ops: Ops; registry: ContentRegistry; rooms: RoomManager; profiles: ProfileService; store: Store; nameOf: (id: string) => string | undefined }
export function registerAdminGames(guard: Guard, app: FastifyInstance, d: GamesDeps) {
  const { ops, registry, rooms, profiles } = d; const now = Date.now;
  // --- kontent: ko'rib chiqish, farq, tekshiruv ---
  app.get("/admin/content/reviews", guard("content.read", () => ({ reviews: ops.reviews.values() })));
  app.get("/admin/content/versions/:v/diff", guard("content.read", (req) => {
    const v = Number((req.params as any).v), against = Number((req.query as any).against ?? registry.activeVersion); const a = registry.bundle(v), b = registry.bundle(against);
    if (!a || !b) return { error: "not_found" }; return { version: v, against, ...diffValues(b, a) }; // «oldin» = taqqoslanayotgan, «keyin» = shu versiya
  }));
  app.get("/admin/content/versions/:v/check", guard("content.read", (req) => { const b = registry.bundle(Number((req.params as any).v)); return b ? checkBundle(b) : { error: "not_found" }; }));
  app.post("/admin/content/versions/:v/submit", guard("content.write", (req, who) => {
    const v = Number((req.params as any).v); const info = registry.infos.find((i) => i.version === v); if (!info) return { error: "not_found" }; if (info.published) return { error: "already_published" };
    ops.reviews.set(String(v), { version: v, status: "submitted", by: who.id, comment: String((req.body as any)?.comment ?? "").slice(0, 300) || undefined, at: now() }); return { ok: true };
  }, "content.submit"));
  app.post("/admin/content/versions/:v/reject", guard("content.publish", (req, who) => {
    const v = Number((req.params as any).v); if (!registry.infos.find((i) => i.version === v)) return { error: "not_found" };
    ops.reviews.set(String(v), { version: v, status: "rejected", by: who.id, comment: String((req.body as any)?.reason ?? "").slice(0, 300), at: now() }); return { ok: true };
  }, "content.reject", { reason: true }));

  // --- o'yinlar ---
  app.get("/admin/games", guard(["rooms.read", "journal.read"], (req) => {
    const q = req.query as Record<string, string>; const s = (q.q ?? "").toUpperCase(); const off = Math.max(0, Number(q.offset) || 0);
    let rs = [...profiles.results].reverse(); if (q.tag === "class" || q.tag === "tournament") rs = rs.filter((r) => r.tag?.kind === q.tag); if (q.tag === "none") rs = rs.filter((r) => !r.tag);
    if (s) rs = rs.filter((r) => r.room.startsWith(s));
    return { total: rs.length, games: rs.slice(off, off + 50).map((r) => ({ room: r.room, finishedAt: r.finishedAt, durationMs: r.durationMs, rounds: r.rounds, winner: r.winner ? d.nameOf(r.winner) ?? r.winner : null, tag: r.tag ?? null, humans: r.players.filter((p) => !p.bot).length, bots: r.players.filter((p) => p.bot).length, unreliable: r.players.filter((p) => p.unreliable).length })) };
  }));
  /** Ko'rib chiqish uchun belgilar (avtomatik jazo emas): juda qisqa, chiqib ketishlar ko'p, bir juftlikda g'alaba almashinuvi. */
  app.get("/admin/games/suspicious", guard(["rooms.read", "journal.read"], () => {
    const out: { room: string; finishedAt: number; reasons: string[] }[] = []; const t = now();
    const pair = new Map<string, { room: string; winner: string | null; at: number }[]>();
    for (const r of profiles.results) {
      const reasons: string[] = []; const humans = r.players.filter((p) => !p.bot);
      if (r.rounds <= 3 && r.winner) reasons.push(`Juda qisqa o'yin: ${r.rounds} raund, g'olib bor`);
      if (r.durationMs < 60_000 && r.rounds > 0) reasons.push(`1 daqiqadan qisqa (${Math.round(r.durationMs / 1000)} s)`);
      const left = r.players.filter((p) => p.left || p.unreliable).length; if (left >= 2) reasons.push(`${left} o'yinchi chiqib ketgan yoki ishonchsiz`);
      if (reasons.length) out.push({ room: r.room, finishedAt: r.finishedAt, reasons });
      if (humans.length === 2 && !r.tag) { const k = humans.map((p) => p.id).sort().join("|"); (pair.get(k) ?? pair.set(k, []).get(k)!).push({ room: r.room, winner: r.winner, at: r.finishedAt }); }
    }
    for (const [k, g] of pair) { const recent = g.filter((x) => t - x.at < 86_400_000); if (recent.length >= 3) { const wins = new Map<string, number>(); for (const x of recent) if (x.winner) wins.set(x.winner, (wins.get(x.winner) ?? 0) + 1); const [top, n] = [...wins].sort((a, b) => b[1] - a[1])[0] ?? ["", 0]; if (n >= 3) out.push({ room: recent[recent.length - 1].room, finishedAt: recent[recent.length - 1].at, reasons: [`Bir juftlik (${k.split("|").map((i) => d.nameOf(i) ?? i).join(" va ")}) 24 soatda ${recent.length} marta o'ynagan; ${d.nameOf(top) ?? top} ${n} marta yutgan`] }); } }
    return { games: out.sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 100) };
  }));
  app.get("/admin/rooms/:id/replay", guard("journal.read", async (req) => {
    const code = String((req.params as any).id); const room = await d.store.loadRoom(code); if (!room?.state) return { error: "not_found" };
    const ctx = registry.ctxFor(room.meta?.contentVersion ?? registry.activeVersion); if (!ctx) return { error: "no_content" };
    const journal = await d.store.journal(code);
    try { const r = replay(ctx, room.state, journal); return { code, tag: room.meta?.tag ?? null, names: Object.fromEntries(r.players.map((id) => [id, d.nameOf(id) ?? (room.state!.bots.includes(id) ? "Bot" : id.slice(0, 6))])), ...r }; } catch (e) { return { error: "replay_failed", detail: String((e as Error).message).slice(0, 200) }; }
  }, "game.replay"));
  app.post("/admin/rooms/:id/close", guard("rooms.close", async (req) => { const ok = await rooms.forceClose(String((req.params as any).id), String((req.body as any).reason).trim()); return ok ? { ok: true } : { error: "not_found" }; }, "room.close", { reason: true }));
}
