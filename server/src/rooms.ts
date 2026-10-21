// Xonalar, navbat, server taymerlari, uzilish/qayta ulanish (SPEC §6). Transportdan mustaqil.
import { passiveIncome, playerCashflow, Action, Ctx, GameState, chooseDream, openPartnerships, crisisAdjusted, slotBlocked, currentPlayer, effectOf, newGame, reduce } from "@poyga/rules";
import { RULES } from "@poyga/rules";
import type { RoomMeta, RoomTag, Store } from "./store";
import type { ContentRegistry } from "./registry";

export interface Clock { now(): number; setTimeout(f: () => void, ms: number): unknown; clearTimeout(h: unknown): void }
export const realClock: Clock = { now: () => Date.now(), setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (h) => clearTimeout(h as NodeJS.Timeout) };

export const MAX_PLAYERS = 6, MIN_PLAYERS = 2;
export const DECISION_MS = RULES.cardDecisionSeconds * 1000;
/** Xona egasi xona ochganda tanlaydigan qaror vaqti (buyurtmachi qarori): 30 yoki 60 soniya. Hamkorlik takliflari muddati (§5.6) o'zgarmaydi. */
/** Hisob daftari (o'quv rejimi): o'yinchi pul o'zgarishini o'zi hisoblab kiritadi, server tekshiradi. «auto» — hisob avtomatik (SPEC: blank «avtomatik» / «o'zim to'ldiraman»). */
export type CalcMode = "auto" | "manual";
export interface Snap { cash: number; passive: number; flow: number }
const snapOf = (p: any): Snap => ({ cash: p.cash, passive: passiveIncome(p), flow: playerCashflow(p) });
const sameSnap = (a: Snap, b: Snap) => a.cash === b.cash && a.passive === b.passive && a.flow === b.flow;
/** Necha marta xato qilingandan keyin to'g'ri javob ko'rsatiladi (qotib qolmaslik uchun). */
export const CALC_HINT_AFTER = 3;
export const TURN_SECONDS = [30, 60] as const; export type TurnSeconds = (typeof TURN_SECONDS)[number];

export interface Member { userId: string; bot: boolean; online: boolean; left?: boolean; unreliable?: boolean } // left: o'yindan ixtiyoriy chiqqan — qaytib kira olmaydi (§6.3)
export interface Room {
  code: string; hostId: string; members: Member[]; state: GameState | null; seq: number;
  timer: unknown; deadline: number | null; turnSeconds: TurnSeconds;
  /** Xona egasi oldindan belgilagan o'yinchilar soni (2–6); boshlanganda bo'sh o'rinlarni botlar egallaydi. `undefined` — eski xonalar: 6 gacha qo'shilish, 2 tagacha bot. */
  seats?: number;
  calcMode: CalcMode; ledger: Record<string, Snap>; calcTries: Record<string, number>; calcNotes: Record<string, { kind: "decide" | "confirm"; wrong: number; hint: boolean }[]>; calcStats: Record<string, { firstTry: number; retried: number }>;
  ctx: Ctx; contentVersion: number | null; // o'yin boshlanganda qulflanadi (§11)
  createdAt: number; endedAt: number | null;
  offlineSince: number | null; // hamma odam oflayn bo'lgan vaqt (tashlab ketilgan xonani yopish uchun)
  tag?: RoomTag;
  closed?: string; // administrator majburan yopgan (sabab xona a'zolariga ko'rinadi)
}
/** §6.7: reaksiyalar ochiq. Ruxsat etilgan to'plam kichik va neytral (SPEC to'plamni aytmaydi — OPEN_QUESTIONS #52). */
export const REACTIONS = ["👍", "👏", "😮", "😂"] as const;
export type RoomEvent = { type: "state"; room: RoomView } | { type: "error"; error: string } | { type: "reaction"; from: string; emoji: string; at: number };
/** Mijozga ketadigan holat: tasodifiy urug', RNG holati va deka tartibi YASHIRILADI (aks holda kelgusi kubik va kartalarni oldindan hisoblab aldash mumkin). */
export function publicState(st: GameState | null) {
  if (!st) return null;
  const { seed: _s, rngState: _r, decks, ...rest } = st;
  return { ...rest, deckCounts: Object.fromEntries(Object.entries(decks).map(([k, d]) => [k, { draw: d.draw.length, discard: d.discard.length }])) };
}
/** Aktiv kodi → asl karta (matn, rasm, tur): «Mening kartalarim» ro'yxati uchun. Kontekst bo'yicha bir marta quriladi. */
export interface AssetCard { text: string; file: string; asset?: string }
const codeIndex = new WeakMap<Ctx, Map<string, AssetCard>>();
function assetCardOf(ctx: Ctx, code: string): AssetCard | undefined {
  let m = codeIndex.get(ctx);
  if (!m) {
    m = new Map();
    for (const ce of Object.values(ctx.effects)) { const e: any = ce.effect; if ((e?.kind === "buy" || e?.kind === "buyShares" || e?.kind === "gamble") && e.code && !m.has(e.code)) m.set(e.code, { text: ce.text ?? "", file: ce.file, asset: e.asset }); }
    codeIndex.set(ctx, m);
  }
  if (code.startsWith("big-")) { const c = ctx.bigBoard[Number(code.slice(4))]; return c ? { text: c.name, file: "", asset: "business" } : undefined; }
  return m.get(code);
}
export interface PendingCardView { id: string; text: string; mode: string; effect: unknown; file: string }
export interface RoomView { closed?: string; tag?: RoomTag; marketCards: Record<number, { text: string; effect: unknown }>; names: Record<string, { name: string; color: number; level?: number; photo?: string; gender?: "m" | "f"; cos?: { pawn?: string; frame?: string; avatar?: string } }>; code: string; members: Member[]; state: ReturnType<typeof publicState>; seq: number; deadline: number | null; seats?: number; turnSeconds?: number; calc?: { mode: CalcMode; due: string[]; ledger: Record<string, Snap>; stats: Record<string, { firstTry: number; retried: number }> }; assetCards?: Record<string, AssetCard>; pendingCard: PendingCardView | null; dreams?: { name: string; price: number }[]; hostId?: string; professions?: Record<string, string>; professionExp?: Record<string, number[]>; lastCard?: { text: string; effect: unknown; mode: string; file: string } | null }

export type Err =
  | "room_not_found" | "room_full" | "already_in_game" | "not_host" | "not_enough_players" | "already_started"
  | "not_member" | "stale_seq" | "not_started" | string;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // chalkash belgilarsiz (0/O, 1/I)

export class RoomManager {
  rooms = new Map<string, Room>();
  activeRoomOf = new Map<string, string>(); // §7: bir hisob — bitta faol o'yin
  listeners = new Set<(code: string, ev: RoomEvent) => void>();

  constructor(private content: Ctx | ContentRegistry, private store: Store, private clock: Clock = realClock, private rand: () => number = Math.random,
    private hooks: { restricted?: (ids: string[]) => string[]; onEnd?: (code: string, r: Room) => void; profile?: (id: string) => { name: string; color: number; level?: number; photo?: string; gender?: "m" | "f"; cos?: { pawn?: string; frame?: string; avatar?: string } } | undefined;
      canJoin?: (tag: RoomTag, userId: string) => boolean; onStart?: (code: string, r: Room) => void; onAbandon?: (code: string) => void; onError?: (where: string, e: unknown) => void; onApply?: (type: string, ok: boolean, ms: number, error?: string) => void } = {}) {}
  private activeCtx(): { version: number | null; ctx: Ctx } {
    return "active" in this.content ? this.content.active() : { version: null, ctx: this.content };
  }

  on(f: (code: string, ev: RoomEvent) => void) { this.listeners.add(f); return () => this.listeners.delete(f); }
  private emit(r: Room) { const v = this.view(r); for (const l of this.listeners) l(r.code, { type: "state", room: v }); }
  view(r: Room): RoomView {
    const pc = r.state?.pending ? effectOf(r.ctx, r.state.pending.cardId, r.state.pending) : null;
    const names: Record<string, { name: string; color: number; level?: number; photo?: string; gender?: "m" | "f"; cos?: { pawn?: string; frame?: string; avatar?: string } }> = {};
    for (const m of r.members) { const pf = this.hooks.profile?.(m.userId); if (pf) names[m.userId] = { name: pf.name, color: pf.color, level: pf.level, photo: pf.photo, ...(pf.gender ? { gender: pf.gender } : {}), cos: pf.cos }; }
    const marketCards: Record<number, { text: string; effect: unknown }> = {};
    for (const pr of r.state?.proposals ?? []) if (pr.kind === "market") { const ce = effectOf(r.ctx, pr.cardId); marketCards[pr.id] = { text: ce.text ?? "", effect: ce.effect }; }
    return { closed: r.closed, tag: r.tag, hostId: r.hostId, marketCards, names, code: r.code, members: r.members.map((m) => ({ ...m })), state: publicState(r.state), seq: r.seq, deadline: r.deadline, ...(r.seats !== undefined ? { seats: r.seats } : {}), turnSeconds: r.turnSeconds,
      calc: (() => { const due = r.calcMode === "manual" ? this.dueOf(r) : []; return { mode: r.calcMode, due, ledger: Object.fromEntries(due.map((id) => [id, r.ledger[id]])), stats: r.calcStats }; })(),
      assetCards: r.state ? Object.fromEntries([...new Set(r.state.players.flatMap((p) => p.assets.map((a) => a.code)))].flatMap((c) => { const x = assetCardOf(r.ctx, c); return x ? [[c, x]] : []; })) : undefined,
      lastCard: r.state?.lastCard ? (() => { const ce = effectOf(r.ctx, r.state!.lastCard!.cardId); return { text: ce.text ?? "", effect: ce.effect, mode: ce.mode, file: ce.file }; })() : null,
      professionExp: r.state ? Object.fromEntries(r.state.players.flatMap((p) => { const e = r.ctx.kasb[p.profession]?.exp; return e ? [[p.id, e]] : []; })) : undefined, // kasb kartasidagi 9 ta xarajat satri (hisob varag'i)
      professions: r.state ? Object.fromEntries(r.state.players.map((p) => [p.id, r.ctx.kasb[p.profession]?.name ?? ""])) : undefined,
      dreams: r.state ? r.ctx.dreams.map((d) => ({ name: d.name, price: d.price })) : undefined,
      pendingCard: pc ? { id: pc.id, text: pc.text ?? "", mode: pc.mode, effect: pc.effect, file: pc.file } : null };
  }

  private meta(r: Room): RoomMeta {
    return { tag: r.tag, hostId: r.hostId, members: r.members.map((m) => ({ userId: m.userId, bot: m.bot, left: m.left, unreliable: m.unreliable })), contentVersion: r.contentVersion, seq: r.seq, createdAt: r.createdAt, turnSeconds: r.turnSeconds, calcMode: r.calcMode, ...(r.seats !== undefined ? { seats: r.seats } : {}) };
  }

  /** Server qayta ishga tushganda tugamagan o'yinlarni tiklaydi (§6.3). O'yinchilar oflayn deb belgilanadi va qayta ulanganda davom etadi. */
  async restore(): Promise<number> {
    let n = 0;
    for (const a of await this.store.loadActive()) {
      if (this.rooms.has(a.code)) continue;
      let ctx: Ctx | undefined;
      if ("active" in this.content) ctx = a.meta.contentVersion != null ? this.content.ctxFor(a.meta.contentVersion) : undefined;
      else ctx = this.content;
      if (!ctx) continue; // kontent versiyasi topilmadi — xavfsiz tarafda: tiklanmaydi
      const r: Room = { tag: a.meta.tag, code: a.code, hostId: a.meta.hostId, members: a.meta.members.map((m) => ({ userId: m.userId, bot: m.bot, left: m.left, unreliable: m.unreliable, online: false })), state: a.state, seq: a.meta.seq,
        timer: null, deadline: null, turnSeconds: a.meta.turnSeconds === 60 ? 60 : 30, calcMode: a.meta.calcMode === "manual" ? "manual" : "auto", ...(a.meta.seats !== undefined ? { seats: a.meta.seats } : {}), ledger: {}, calcTries: {}, calcNotes: {}, calcStats: {}, ctx, contentVersion: a.meta.contentVersion, createdAt: a.meta.createdAt, endedAt: null, offlineSince: this.clock.now() };
      this.rooms.set(a.code, r);
      for (const m of r.members) if (!m.bot) this.activeRoomOf.set(m.userId, a.code);
      this.ledgerSync(r); this.armProposals(r); this.arm(r); n++;
    }
    return n;
  }

  private newCode() {
    for (;;) {
      const c = Array.from({ length: 6 }, () => ALPHABET[Math.floor(this.rand() * ALPHABET.length)]).join("");
      if (!this.rooms.has(c)) return c;
    }
  }

  create(hostId: string, tag?: RoomTag, turnSeconds: TurnSeconds = 30, calcMode: CalcMode = "auto", seats?: number): { ok: true; code: string } | { ok: false; error: Err } {
    if (this.activeRoomOf.has(hostId)) return { ok: false, error: "already_in_game" };
    if (seats !== undefined && (!Number.isInteger(seats) || seats < MIN_PLAYERS || seats > MAX_PLAYERS)) return { ok: false, error: "bad_seats" };
    const code = this.newCode();
    this.rooms.set(code, { code, hostId, members: [{ userId: hostId, bot: false, online: true }], state: null, seq: 0, timer: null, deadline: null, turnSeconds, calcMode, ...(seats !== undefined ? { seats } : {}), ledger: {}, calcTries: {}, calcNotes: {}, calcStats: {},
      ctx: this.activeCtx().ctx, contentVersion: null, createdAt: this.clock.now(), endedAt: null, offlineSince: null, tag });
    this.activeRoomOf.set(hostId, code);
    return { ok: true, code };
  }

  join(code: string, userId: string): { ok: true } | { ok: false; error: Err } {
    const r = this.rooms.get(code.toUpperCase());
    if (!r) return { ok: false, error: "room_not_found" };
    if (r.members.some((m) => m.userId === userId)) return this.reconnect(r.code, userId); // chiqib ketgan bo'lsa reconnect rad etadi
    if (this.activeRoomOf.has(userId)) return { ok: false, error: "already_in_game" };
    if (r.state) return { ok: false, error: "already_started" };
    if (r.tag && this.hooks.canJoin && !this.hooks.canJoin(r.tag, userId)) return { ok: false, error: "not_allowed" }; // sinf/turnir xonasi: faqat a'zolar
    if (r.members.length >= (r.seats ?? MAX_PLAYERS)) return { ok: false, error: "room_full" }; // §6.1: mijoz yangi xona taklif qiladi
    r.members.push({ userId, bot: false, online: true });
    this.activeRoomOf.set(userId, r.code);
    this.emit(r);
    return { ok: true };
  }

  /** §6.5: odam yetmasa bot qo'shiladi. */
  async start(code: string, userId: string, seed: number, opts: { dreams?: boolean; events?: boolean; opening?: boolean } = {}): Promise<{ ok: true } | { ok: false; error: Err }> {
    const r = this.rooms.get(code);
    if (!r) return { ok: false, error: "room_not_found" };
    if (r.hostId !== userId) return { ok: false, error: "not_host" };
    if (r.state) return { ok: false, error: "already_started" };
    let b = 1;
    while (r.members.length < (r.seats ?? MIN_PLAYERS)) r.members.push({ userId: `bot-${b++}`, bot: true, online: true });
    const c = this.activeCtx(); r.ctx = c.ctx; r.contentVersion = c.version; // versiya shu yerda qulflanadi
    let s = newGame(r.ctx, r.members.map((m) => m.userId), seed, r.members.filter((m) => m.bot).map((m) => m.userId), this.hooks.restricted?.(r.members.filter((m) => !m.bot).map((m) => m.userId)) ?? [], { dreamPhase: opts.dreams !== false, events: opts.events !== false, openingDice: opts.dreams !== false && opts.opening !== false }); // orzularni o'yinchilar tanlaydi (§6.4); muddat tugasa server o'zi tanlaydi
    if (opts.dreams === false) s.players.forEach((p, i) => (s = chooseDream(s, p.id, i % r.ctx.dreams.length))); // testlar uchun: bosqichsiz
    r.state = s; this.ledgerSync(r);
    await this.store.saveSnapshot(code, s, this.meta(r));
    this.hooks.onStart?.(code, r);
    this.arm(r);
    this.emit(r);
    return { ok: true };
  }

  /** Mijoz harakati. `seq` — mijoz ko'rgan oxirgi holat raqami: takroriy/eski harakat rad etiladi (§6.2). */
  async act(code: string, userId: string, action: Action, seq: number): Promise<{ ok: true } | { ok: false; error: Err; detail?: unknown }> {
    const r = this.rooms.get(code);
    if (!r) return { ok: false, error: "room_not_found" };
    if (!r.state) return { ok: false, error: "not_started" };
    if (!r.members.some((m) => m.userId === userId && !m.left)) return { ok: false, error: "not_member" };
    if (action.playerId !== userId || (action as { type: string }).type === "expire" || (action as { type: string }).type === "auto_dreams") return { ok: false, error: "not_member" };
    if (seq !== r.seq) return { ok: false, error: "stale_seq" };
    if ("auto" in action) return { ok: false, error: "not_member" }; // «avtomatik» bayrog'ini faqat server qo'yadi (ball −2)
    const a = action as Action & { calc?: Snap }; const calc = a.calc; if (calc) delete a.calc; // qoidalar dvigateli `calc` ni bilmaydi
    let verified = false;
    if (r.calcMode === "manual") { const g = this.calcGate(r, userId, a, calc); if (g && "done" in g) return g.done; verified = !!g?.verified; }
    const out = await this.apply(r, a, null);
    if (out.ok && verified) { const p = r.state!.players.find((x) => x.id === userId); if (p) r.ledger[userId] = snapOf(p); } // to'g'ri hisoblangan o'zgarish daftarga o'tdi
    return out;
  }

  // ───── Hisob daftari ─────
  private ledgerSync(r: Room, ids?: string[]) {
    if (!r.state) return;
    for (const p of r.state.players) if (!ids || ids.includes(p.id)) r.ledger[p.id] = snapOf(p);
  }
  /** Daftardagi qiymat haqiqiy holatdan farq qilsa — o'yinchi hisobini yangilashi kerak (kubik tashlashdan oldin). Botlar hisoblamaydi. */
  private dueOf(r: Room): string[] {
    if (!r.state) return [];
    return r.state.players.filter((p) => !r.state!.bots.includes(p.id) && r.ledger[p.id] && !sameSnap(r.ledger[p.id], snapOf(p))).map((p) => p.id);
  }
  private calcCheck(r: Room, userId: string, given: Snap | undefined, expected: Snap, kind: "decide" | "confirm"): { ok: false; error: Err; detail?: unknown } | null {
    if (!given) return { ok: false, error: "calc_required", detail: { tries: r.calcTries[userId] ?? 0 } };
    const tries = r.calcTries[userId] ?? 0, st = (r.calcStats[userId] ??= { firstTry: 0, retried: 0 });
    if (sameSnap(given, expected)) { if (tries === 0) st.firstTry++; else st.retried++; r.calcTries[userId] = 0; (r.calcNotes[userId] ??= []).push({ kind, wrong: tries, hint: tries >= CALC_HINT_AFTER }); return null; }
    r.calcTries[userId] = tries + 1;
    return { ok: false, error: "calc_wrong", detail: { fields: { cash: given.cash === expected.cash, passive: given.passive === expected.passive, flow: given.flow === expected.flow }, tries: tries + 1, solution: tries + 1 >= CALC_HINT_AFTER ? expected : undefined } };
  }
  /** `null` — oddiy tarzda davom etadi; aks holda tayyor natija (xato yoki tasdiq). */
  private calcGate(r: Room, userId: string, a: Action & { type: string; accept?: boolean }, calc?: Snap): { done: { ok: true } | { ok: false; error: Err; detail?: unknown } } | { verified: boolean } | null {
    if (!r.state || r.state.bots.includes(userId)) return null;
    const me = r.state.players.find((p) => p.id === userId); if (!me) return null;
    if ((a.type as string) === "confirm_calc") {
      const bad = this.calcCheck(r, userId, calc, snapOf(me), "confirm"); if (bad) return { done: bad };
      r.ledger[userId] = snapOf(me); this.emit(r); return { done: { ok: true } };
    }
    if (a.type === "roll" && this.dueOf(r).includes(userId)) return { done: { ok: false, error: "calc_due" } };
    if (a.type === "decide" && a.accept) {
      const pend = r.state.pending; const eff = pend ? (effectOf(r.ctx, pend.cardId, pend).effect as { kind?: string }) : null;
      if (eff?.kind === "gamble") return null; // natija kubikka bog'liq — oldindan hisoblab bo'lmaydi: keyin «hisobni yangilang» so'raladi
      const out = reduce(r.state, r.ctx, a); if (!out.ok) return null; // xatoni oddiy yo'l qaytaradi
      const np = out.state.players.find((p) => p.id === userId)!; const exp = snapOf(np);
      if (sameSnap(snapOf(me), exp)) return null; // pulga ta'siri yo'q — hisob kerak emas
      const bad = this.calcCheck(r, userId, calc, exp, "decide"); return bad ? { done: bad } : { verified: true };
    }
    return null;
  }

  private async apply(r: Room, action: Action, auto: string | null): Promise<{ ok: true } | { ok: false; error: Err; detail?: unknown }> {
    const t0 = performance.now();
    const out = reduce(r.state!, r.ctx, action);
    this.hooks.onApply?.(action.type, out.ok, performance.now() - t0, out.ok ? undefined : out.error);
    if (!out.ok) return out;
    r.state = out.state; r.seq++;
    if (r.calcMode === "manual" && auto) this.ledgerSync(r, [(action as { playerId: string }).playerId]); // vaqt tugab avtomatik bajarilgan/bot harakati — daftar o'zi yangilanadi (ball −2 allaqachon bor)
    this.armProposals(r);
    // Saqlash xatosi o'yinni to'xtatmaydi (xotirada davom etadi, xato jurnal va ko'rsatkichga tushadi) — aks holda taymer va tarqatish to'xtab qolardi.
    try {
      const who = (action as { playerId: string }).playerId; const notes = r.calcNotes[who]; if (notes?.length) delete r.calcNotes[who]; // hisob daftari izohlari keyingi jurnal yozuviga qo'shiladi
      await this.store.append(r.code, { seq: r.seq, at: this.clock.now(), action: auto ? { type: "auto", reason: auto, action } : action, ...(notes?.length ? { notes } : {}) });
      await this.store.saveSnapshot(r.code, r.state!, this.meta(r));
    } catch (e) { this.hooks.onError?.("persist", e); }
    if (r.state!.winner) this.finish(r); else this.arm(r);
    this.emit(r);
    return { ok: true };
  }

  private proposalTimers = new Map<string, unknown>(); // `${room}:${id}`
  /** Hamkorlik takliflari 30 soniyadan keyin avtomatik o'chadi (§5.6); navbatni to'xtatmaydi. */
  private armProposals(r: Room) {
    const live = new Set(r.state!.proposals.map((p) => p.id));
    for (const [k, h] of this.proposalTimers) if (k.startsWith(`${r.code}:`) && !live.has(Number(k.split(":")[1]))) { this.clock.clearTimeout(h); this.proposalTimers.delete(k); }
    for (const p of r.state!.proposals) {
      const k = `${r.code}:${p.id}`;
      if (this.proposalTimers.has(k)) continue;
      this.proposalTimers.set(k, this.clock.setTimeout(() => {
        this.proposalTimers.delete(k);
        if (r.state?.proposals.some((x) => x.id === p.id)) void this.apply(r, { type: "expire", playerId: "server", proposalId: p.id }, "proposal_timeout");
      }, DECISION_MS));
    }
  }

  /** Navbat taymeri (§5.2, §6.3): 30 s ichida qaror bo'lmasa — avtomatik. Bot va oflayn o'yinchi ham shu yo'ldan. */
  private arm(r: Room) {
    if (!this.humansOnline(r)) { this.pause(r); return; } // hech bir odam onlayn emas: o'yin to'xtab turadi (birinchi qaytgan bilan davom etadi)
    if (r.state!.phase === "dreams") { // orzu bosqichi: bitta mutlaq muddat (har harakatda uzaymaydi), so'ng tanlamaganlarga avtomatik
      if (r.timer && r.deadline) return;
      const ms = RULES.dreamSeconds * 1000;
      r.deadline = this.clock.now() + ms;
      r.timer = this.clock.setTimeout(() => { r.timer = null; r.deadline = null; void this.apply(r, { type: "auto_dreams", playerId: "server" }, "dream_timeout").catch((e) => this.hooks.onError?.("autoMove", e)); }, ms);
      return;
    }
    if (r.timer) this.clock.clearTimeout(r.timer);
    const cur = currentPlayer(r.state!);
    const m = r.members.find((x) => x.userId === cur.id)!;
    const delay = m.bot ? 0 : r.turnSeconds * 1000;
    r.deadline = this.clock.now() + delay;
    r.timer = this.clock.setTimeout(() => { this.autoMove(r).catch((e) => { this.hooks.onError?.("autoMove", e); if (r.state && !r.state.winner && !r.endedAt) this.arm(r); }); }, delay);
  }

  /** Onlayn odam bormi (botlar va ixtiyoriy chiqqanlar hisobga kirmaydi). */
  private humansOnline(r: Room) { return r.members.some((m) => !m.bot && !m.left && m.online); }
  /** Hamma odam uzilgan (tok/internet o'chdi): taymerlar to'xtaydi — oflayn o'yinchining navbatlari «o'tkazib yuborilmaydi», botlar o'ynab ketmaydi. */
  private pause(r: Room) { if (r.timer) this.clock.clearTimeout(r.timer); r.timer = null; r.deadline = null; }

  private async autoMove(r: Room) {
    r.timer = null;
    if (!r.state || r.state.winner) return;
    if (!this.humansOnline(r)) { r.deadline = null; return; }
    if (r.state.phase === "dreams") return;
    const cur = currentPlayer(r.state);
    const bot = r.members.find((x) => x.userId === cur.id)?.bot;
    if (!r.state.pending) return void (await this.apply(r, bot ? { type: "roll", playerId: cur.id } : { type: "roll", playerId: cur.id, auto: true }, bot ? "bot" : "timeout"));
    // Ixtiyoriy karta vaqt tugasa o'tkaziladi (§5.2). Bot: naqdi yetsa qabul qiladi; qarzda qatnashmaydi (§6.5).
    const e = effectOf(r.ctx, r.state.pending.cardId, r.state.pending).effect;
    const ea = crisisAdjusted(e, cur); // decide() bilan bir xil (inqiroz narxi)
    const affordable = ea.kind === "buy" ? cur.cash >= (ea.down ?? ea.price) : e.kind === "gamble" ? cur.cash >= e.price : e.kind === "rentChoice" ? false : e.kind !== "lendRequest";
    await this.apply(r, { type: "decide", playerId: cur.id, accept: e.kind === "payOrLoseBusiness" ? true : !!bot && affordable && !slotBlocked(e, cur), ...(bot ? {} : { auto: true as const }) }, bot ? "bot" : "timeout");
  }

  /** §6.7 Reaksiya: faqat xona a'zosi, ruxsat etilgan to'plamdan; tezlik cheklovi tashqarida (app). Holatga ta'sir qilmaydi, saqlanmaydi. */
  react(code: string, userId: string, emoji: string): { ok: true } | { ok: false; error: Err } {
    const r = this.rooms.get(code); const m = r?.members.find((x) => x.userId === userId);
    if (!r || !m || m.left) return { ok: false, error: "not_member" };
    if (!(REACTIONS as readonly string[]).includes(emoji)) return { ok: false, error: "bad_reaction" };
    for (const l of this.listeners) l(r.code, { type: "reaction", from: userId, emoji, at: this.clock.now() });
    return { ok: true };
  }

  disconnect(code: string, userId: string) {
    const r = this.rooms.get(code); const m = r?.members.find((x) => x.userId === userId);
    if (r && m) { m.online = false; this.markOffline(r); if (r.state && !r.state.winner && !this.humansOnline(r)) this.pause(r); this.emit(r); }
  }

  /** §6.3: qayta ulanganda holat to'liq tiklanadi (snapshot + seq). */
  reconnect(code: string, userId: string): { ok: true } | { ok: false; error: Err } {
    const r = this.rooms.get(code); const m = r?.members.find((x) => x.userId === userId);
    if (!r || !m) return { ok: false, error: "not_member" };
    if (m.left) return { ok: false, error: "left_game" }; // ixtiyoriy chiqish qaytarilmaydi: o'rnini bot egallagan
    m.online = true; r.offlineSince = null;
    if (r.state && !r.state.winner && !r.endedAt && !r.timer) this.arm(r); // to'xtab turgan o'yin davom etadi
    this.emit(r);
    return { ok: true };
  }

  /** Ixtiyoriy chiqish: mijoz alohida tasdiq so'raydi; o'rinni bot egallaydi (o'yin to'xtamaydi). */
  leave(code: string, userId: string) {
    const r = this.rooms.get(code); const m = r?.members.find((x) => x.userId === userId);
    if (!r || !m || m.left) return; // takroriy chiqish hech narsani o'zgartirmaydi
    this.activeRoomOf.delete(userId);
    this.markOffline(r, userId);
    if (!r.state) { r.members = r.members.filter((x) => x !== m); if (!r.members.length) this.rooms.delete(code); else if (r.hostId === userId) r.hostId = r.members.find((x) => !x.bot)?.userId ?? r.members[0].userId; /* xona egasi chiqsa — keyingi odam egasi bo'ladi */ }
    else {
      // «Ishonchsiz» (qaror #66): ochiq qarz yoki sheriklik bilan chiqib ketish
      const gp = r.state.players.find((p) => p.id === userId);
      m.unreliable = !r.endedAt && !!gp && (gp.handDebts.length > 0 || openPartnerships(gp) > 0);
      m.bot = true; m.left = true; m.online = false;
      if (!this.humansOnline(r)) this.pause(r);
      else if (r.state.phase === "dreams") void this.apply(r, { type: "auto_dreams", playerId: "server", only: [userId] }, "left").catch((e) => this.hooks.onError?.("autoMove", e)); // chiqqan odam orzusi darrov beriladi
      else if (currentPlayer(r.state).id === userId) this.arm(r); }
    this.emit(r);
  }

  private markOffline(r: Room, leaving?: string) {
    const anyOnline = r.members.some((x) => !x.bot && x.online && x.userId !== leaving);
    if (!anyOnline && r.offlineSince === null) r.offlineSince = this.clock.now(); else if (anyOnline) r.offlineSince = null;
  }

  /** Tashlab ketilgan xonalarni yopadi: hamma odam `idleMs` dan ortiq oflayn. Davriy chaqiriladi (main.ts). Qaytadi: yopilganlar soni. */
  async sweep(idleMs: number, startedIdleMs: number = idleMs): Promise<number> {
    let n = 0; const now = this.clock.now();
    for (const [code, r] of [...this.rooms]) {
      // Boshlangan o'yin, unda hali chiqmagan odam bor: uzoq kutiladi (tok/internet o'chishi); zal va odamsiz qolgan o'yin — qisqa muddat
      const limit = r.state && r.members.some((m) => !m.bot && !m.left) ? Math.max(idleMs, startedIdleMs) : idleMs;
      if (r.endedAt || r.offlineSince === null || now - r.offlineSince < limit) continue;
      if (r.timer) this.clock.clearTimeout(r.timer);
      for (const [k, h] of this.proposalTimers) if (k.startsWith(`${code}:`)) { this.clock.clearTimeout(h); this.proposalTimers.delete(k); }
      r.timer = null; r.deadline = null; r.endedAt = now;
      for (const m of r.members) this.activeRoomOf.delete(m.userId);
      await this.store.closeRoom(code); this.hooks.onAbandon?.(code); n++;
    }
    return n;
  }

  /** Administrator majburan yopadi: taymerlar to'xtaydi, a'zolar bo'shatiladi, natija yozilmaydi (abandon kabi). */
  async forceClose(code: string, reason: string): Promise<boolean> {
    const r = this.rooms.get(code); if (!r || r.endedAt) return false;
    if (r.timer) this.clock.clearTimeout(r.timer);
    for (const [k, h] of this.proposalTimers) if (k.startsWith(`${code}:`)) { this.clock.clearTimeout(h); this.proposalTimers.delete(k); }
    r.timer = null; r.deadline = null; r.endedAt = this.clock.now(); r.closed = reason.slice(0, 200);
    for (const m of r.members) this.activeRoomOf.delete(m.userId);
    await this.store.closeRoom(code); this.hooks.onAbandon?.(code); this.emit(r); return true;
  }

  private finish(r: Room) {
    if (r.timer) this.clock.clearTimeout(r.timer);
    r.timer = null; r.deadline = null; r.endedAt = this.clock.now();
    this.hooks.onEnd?.(r.code, r);
    for (const m of r.members) this.activeRoomOf.delete(m.userId);
  }
}
