// Xonalar, navbat, server taymerlari, uzilish/qayta ulanish (SPEC §6). Transportdan mustaqil.
import { Action, Ctx, GameState, chooseDream, currentPlayer, effectOf, newGame, reduce } from "@poyga/rules";
import { RULES } from "@poyga/rules";
import type { RoomMeta, Store } from "./store";
import type { ContentRegistry } from "./registry";

export interface Clock { now(): number; setTimeout(f: () => void, ms: number): unknown; clearTimeout(h: unknown): void }
export const realClock: Clock = { now: () => Date.now(), setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (h) => clearTimeout(h as NodeJS.Timeout) };

export const MAX_PLAYERS = 6, MIN_PLAYERS = 2;
export const DECISION_MS = RULES.cardDecisionSeconds * 1000;

export interface Member { userId: string; bot: boolean; online: boolean }
export interface Room {
  code: string; hostId: string; members: Member[]; state: GameState | null; seq: number;
  timer: unknown; deadline: number | null;
  ctx: Ctx; contentVersion: number | null; // o'yin boshlanganda qulflanadi (§11)
  createdAt: number; endedAt: number | null;
  offlineSince: number | null; // hamma odam oflayn bo'lgan vaqt (tashlab ketilgan xonani yopish uchun)
}
export type RoomEvent = { type: "state"; room: RoomView } | { type: "error"; error: string };
export interface PendingCardView { id: string; text: string; mode: string; effect: unknown; file: string }
export interface RoomView { marketCards: Record<number, { text: string; effect: unknown }>; names: Record<string, { name: string; color: number }>; code: string; members: Member[]; state: GameState | null; seq: number; deadline: number | null; pendingCard: PendingCardView | null }

export type Err =
  | "room_not_found" | "room_full" | "already_in_game" | "not_host" | "not_enough_players" | "already_started"
  | "not_member" | "stale_seq" | "not_started" | string;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // chalkash belgilarsiz (0/O, 1/I)

export class RoomManager {
  rooms = new Map<string, Room>();
  activeRoomOf = new Map<string, string>(); // §7: bir hisob — bitta faol o'yin
  listeners = new Set<(code: string, ev: RoomEvent) => void>();

  constructor(private content: Ctx | ContentRegistry, private store: Store, private clock: Clock = realClock, private rand: () => number = Math.random,
    private hooks: { restricted?: (ids: string[]) => string[]; onEnd?: (code: string, r: Room) => void; profile?: (id: string) => { name: string; color: number } | undefined;
      onStart?: (code: string, r: Room) => void; onAbandon?: (code: string) => void; onApply?: (type: string, ok: boolean, ms: number, error?: string) => void } = {}) {}
  private activeCtx(): { version: number | null; ctx: Ctx } {
    return "active" in this.content ? this.content.active() : { version: null, ctx: this.content };
  }

  on(f: (code: string, ev: RoomEvent) => void) { this.listeners.add(f); return () => this.listeners.delete(f); }
  private emit(r: Room) { const v = this.view(r); for (const l of this.listeners) l(r.code, { type: "state", room: v }); }
  view(r: Room): RoomView {
    const pc = r.state?.pending ? effectOf(r.ctx, r.state.pending.cardId) : null;
    const names: Record<string, { name: string; color: number }> = {};
    for (const m of r.members) { const pf = this.hooks.profile?.(m.userId); if (pf) names[m.userId] = { name: pf.name, color: pf.color }; }
    const marketCards: Record<number, { text: string; effect: unknown }> = {};
    for (const pr of r.state?.proposals ?? []) if (pr.kind === "market") { const ce = effectOf(r.ctx, pr.cardId); marketCards[pr.id] = { text: ce.text ?? "", effect: ce.effect }; }
    return { marketCards, names, code: r.code, members: r.members.map((m) => ({ ...m })), state: r.state, seq: r.seq, deadline: r.deadline,
      pendingCard: pc ? { id: pc.id, text: pc.text ?? "", mode: pc.mode, effect: pc.effect, file: pc.file } : null };
  }

  private meta(r: Room): RoomMeta {
    return { hostId: r.hostId, members: r.members.map((m) => ({ userId: m.userId, bot: m.bot })), contentVersion: r.contentVersion, seq: r.seq, createdAt: r.createdAt };
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
      const r: Room = { code: a.code, hostId: a.meta.hostId, members: a.meta.members.map((m) => ({ ...m, online: false })), state: a.state, seq: a.meta.seq,
        timer: null, deadline: null, ctx, contentVersion: a.meta.contentVersion, createdAt: a.meta.createdAt, endedAt: null, offlineSince: this.clock.now() };
      this.rooms.set(a.code, r);
      for (const m of r.members) if (!m.bot) this.activeRoomOf.set(m.userId, a.code);
      this.armProposals(r); this.arm(r); n++;
    }
    return n;
  }

  private newCode() {
    for (;;) {
      const c = Array.from({ length: 6 }, () => ALPHABET[Math.floor(this.rand() * ALPHABET.length)]).join("");
      if (!this.rooms.has(c)) return c;
    }
  }

  create(hostId: string): { ok: true; code: string } | { ok: false; error: Err } {
    if (this.activeRoomOf.has(hostId)) return { ok: false, error: "already_in_game" };
    const code = this.newCode();
    this.rooms.set(code, { code, hostId, members: [{ userId: hostId, bot: false, online: true }], state: null, seq: 0, timer: null, deadline: null,
      ctx: this.activeCtx().ctx, contentVersion: null, createdAt: this.clock.now(), endedAt: null, offlineSince: null });
    this.activeRoomOf.set(hostId, code);
    return { ok: true, code };
  }

  join(code: string, userId: string): { ok: true } | { ok: false; error: Err } {
    const r = this.rooms.get(code.toUpperCase());
    if (!r) return { ok: false, error: "room_not_found" };
    if (r.members.some((m) => m.userId === userId)) return this.reconnect(r.code, userId);
    if (this.activeRoomOf.has(userId)) return { ok: false, error: "already_in_game" };
    if (r.state) return { ok: false, error: "already_started" };
    if (r.members.length >= MAX_PLAYERS) return { ok: false, error: "room_full" }; // §6.1: mijoz yangi xona taklif qiladi
    r.members.push({ userId, bot: false, online: true });
    this.activeRoomOf.set(userId, r.code);
    this.emit(r);
    return { ok: true };
  }

  /** §6.5: odam yetmasa bot qo'shiladi. */
  async start(code: string, userId: string, seed: number): Promise<{ ok: true } | { ok: false; error: Err }> {
    const r = this.rooms.get(code);
    if (!r) return { ok: false, error: "room_not_found" };
    if (r.hostId !== userId) return { ok: false, error: "not_host" };
    if (r.state) return { ok: false, error: "already_started" };
    let b = 1;
    while (r.members.length < MIN_PLAYERS) r.members.push({ userId: `bot-${b++}`, bot: true, online: true });
    const c = this.activeCtx(); r.ctx = c.ctx; r.contentVersion = c.version; // versiya shu yerda qulflanadi
    let s = newGame(r.ctx, r.members.map((m) => m.userId), seed, r.members.filter((m) => m.bot).map((m) => m.userId), this.hooks.restricted?.(r.members.filter((m) => !m.bot).map((m) => m.userId)) ?? []);
    s.players.forEach((p, i) => (s = chooseDream(s, p.id, i % r.ctx.dreams.length)));
    r.state = s;
    await this.store.saveSnapshot(code, s, this.meta(r));
    this.hooks.onStart?.(code, r);
    this.arm(r);
    this.emit(r);
    return { ok: true };
  }

  /** Mijoz harakati. `seq` — mijoz ko'rgan oxirgi holat raqami: takroriy/eski harakat rad etiladi (§6.2). */
  async act(code: string, userId: string, action: Action, seq: number): Promise<{ ok: true } | { ok: false; error: Err }> {
    const r = this.rooms.get(code);
    if (!r) return { ok: false, error: "room_not_found" };
    if (!r.state) return { ok: false, error: "not_started" };
    if (!r.members.some((m) => m.userId === userId)) return { ok: false, error: "not_member" };
    if (action.playerId !== userId || (action as { type: string }).type === "expire") return { ok: false, error: "not_member" };
    if (seq !== r.seq) return { ok: false, error: "stale_seq" };
    return this.apply(r, action, null);
  }

  private async apply(r: Room, action: Action, auto: string | null): Promise<{ ok: true } | { ok: false; error: Err }> {
    const t0 = performance.now();
    const out = reduce(r.state!, r.ctx, action);
    this.hooks.onApply?.(action.type, out.ok, performance.now() - t0, out.ok ? undefined : out.error);
    if (!out.ok) return out;
    r.state = out.state; r.seq++;
    this.armProposals(r);
    await this.store.append(r.code, { seq: r.seq, at: this.clock.now(), action: auto ? { type: "auto", reason: auto, action } : action });
    await this.store.saveSnapshot(r.code, r.state, this.meta(r));
    if (r.state.winner) this.finish(r); else this.arm(r);
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
    if (r.timer) this.clock.clearTimeout(r.timer);
    const cur = currentPlayer(r.state!);
    const m = r.members.find((x) => x.userId === cur.id)!;
    const delay = m.bot ? 0 : DECISION_MS;
    r.deadline = this.clock.now() + delay;
    r.timer = this.clock.setTimeout(() => void this.autoMove(r), delay);
  }

  private async autoMove(r: Room) {
    r.timer = null;
    if (!r.state || r.state.winner) return;
    const cur = currentPlayer(r.state);
    const bot = r.members.find((x) => x.userId === cur.id)?.bot;
    if (!r.state.pending) return void (await this.apply(r, { type: "roll", playerId: cur.id }, bot ? "bot" : "timeout"));
    // Ixtiyoriy karta vaqt tugasa o'tkaziladi (§5.2). Bot: naqdi yetsa qabul qiladi; qarzda qatnashmaydi (§6.5).
    const e = effectOf(r.ctx, r.state.pending.cardId).effect;
    const affordable = e.kind === "buy" ? cur.cash >= (e.down ?? e.price) : e.kind !== "lendRequest";
    await this.apply(r, { type: "decide", playerId: cur.id, accept: !!bot && affordable }, bot ? "bot" : "timeout");
  }

  disconnect(code: string, userId: string) {
    const r = this.rooms.get(code); const m = r?.members.find((x) => x.userId === userId);
    if (r && m) { m.online = false; this.markOffline(r); this.emit(r); }
  }

  /** §6.3: qayta ulanganda holat to'liq tiklanadi (snapshot + seq). */
  reconnect(code: string, userId: string): { ok: true } | { ok: false; error: Err } {
    const r = this.rooms.get(code); const m = r?.members.find((x) => x.userId === userId);
    if (!r || !m) return { ok: false, error: "not_member" };
    m.online = true; r.offlineSince = null; this.emit(r);
    return { ok: true };
  }

  /** Ixtiyoriy chiqish: mijoz alohida tasdiq so'raydi; o'rinni bot egallaydi (o'yin to'xtamaydi). */
  leave(code: string, userId: string) {
    const r = this.rooms.get(code); const m = r?.members.find((x) => x.userId === userId);
    if (!r || !m) return;
    this.activeRoomOf.delete(userId);
    this.markOffline(r, userId);
    if (!r.state) { r.members = r.members.filter((x) => x !== m); if (!r.members.length) this.rooms.delete(code); }
    else { m.bot = true; m.online = false; if (currentPlayer(r.state).id === userId) this.arm(r); }
    this.emit(r);
  }

  private markOffline(r: Room, leaving?: string) {
    const anyOnline = r.members.some((x) => !x.bot && x.online && x.userId !== leaving);
    if (!anyOnline && r.offlineSince === null) r.offlineSince = this.clock.now(); else if (anyOnline) r.offlineSince = null;
  }

  /** Tashlab ketilgan xonalarni yopadi: hamma odam `idleMs` dan ortiq oflayn. Davriy chaqiriladi (main.ts). Qaytadi: yopilganlar soni. */
  async sweep(idleMs: number): Promise<number> {
    let n = 0; const now = this.clock.now();
    for (const [code, r] of [...this.rooms]) {
      if (r.endedAt || r.offlineSince === null || now - r.offlineSince < idleMs) continue;
      if (r.timer) this.clock.clearTimeout(r.timer);
      for (const [k, h] of this.proposalTimers) if (k.startsWith(`${code}:`)) { this.clock.clearTimeout(h); this.proposalTimers.delete(k); }
      r.timer = null; r.deadline = null; r.endedAt = now;
      for (const m of r.members) this.activeRoomOf.delete(m.userId);
      await this.store.closeRoom(code); this.hooks.onAbandon?.(code); n++;
    }
    return n;
  }

  private finish(r: Room) {
    if (r.timer) this.clock.clearTimeout(r.timer);
    r.timer = null; r.deadline = null; r.endedAt = this.clock.now();
    this.hooks.onEnd?.(r.code, r);
    for (const m of r.members) this.activeRoomOf.delete(m.userId);
  }
}
