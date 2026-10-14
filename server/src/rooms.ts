// Xonalar, navbat, server taymerlari, uzilish/qayta ulanish (SPEC §6). Transportdan mustaqil.
import { Action, Ctx, GameState, chooseDream, currentPlayer, effectOf, newGame, reduce } from "@poyga/rules";
import { RULES } from "@poyga/rules";
import type { Store } from "./store";

export interface Clock { now(): number; setTimeout(f: () => void, ms: number): unknown; clearTimeout(h: unknown): void }
export const realClock: Clock = { now: () => Date.now(), setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (h) => clearTimeout(h as NodeJS.Timeout) };

export const MAX_PLAYERS = 6, MIN_PLAYERS = 2;
export const DECISION_MS = RULES.cardDecisionSeconds * 1000;

export interface Member { userId: string; bot: boolean; online: boolean }
export interface Room {
  code: string; hostId: string; members: Member[]; state: GameState | null; seq: number;
  timer: unknown; deadline: number | null;
}
export type RoomEvent = { type: "state"; room: RoomView } | { type: "error"; error: string };
export interface RoomView { code: string; members: Member[]; state: GameState | null; seq: number; deadline: number | null }

export type Err =
  | "room_not_found" | "room_full" | "already_in_game" | "not_host" | "not_enough_players" | "already_started"
  | "not_member" | "stale_seq" | "not_started" | string;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // chalkash belgilarsiz (0/O, 1/I)

export class RoomManager {
  rooms = new Map<string, Room>();
  activeRoomOf = new Map<string, string>(); // §7: bir hisob — bitta faol o'yin
  listeners = new Set<(code: string, ev: RoomEvent) => void>();

  constructor(private ctx: Ctx, private store: Store, private clock: Clock = realClock, private rand: () => number = Math.random) {}

  on(f: (code: string, ev: RoomEvent) => void) { this.listeners.add(f); return () => this.listeners.delete(f); }
  private emit(r: Room) { const v = this.view(r); for (const l of this.listeners) l(r.code, { type: "state", room: v }); }
  view(r: Room): RoomView { return { code: r.code, members: r.members.map((m) => ({ ...m })), state: r.state, seq: r.seq, deadline: r.deadline }; }

  private newCode() {
    for (;;) {
      const c = Array.from({ length: 6 }, () => ALPHABET[Math.floor(this.rand() * ALPHABET.length)]).join("");
      if (!this.rooms.has(c)) return c;
    }
  }

  create(hostId: string): { ok: true; code: string } | { ok: false; error: Err } {
    if (this.activeRoomOf.has(hostId)) return { ok: false, error: "already_in_game" };
    const code = this.newCode();
    this.rooms.set(code, { code, hostId, members: [{ userId: hostId, bot: false, online: true }], state: null, seq: 0, timer: null, deadline: null });
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
    let s = newGame(this.ctx, r.members.map((m) => m.userId), seed);
    s.players.forEach((p, i) => (s = chooseDream(s, p.id, i % this.ctx.dreams.length)));
    r.state = s;
    await this.store.saveSnapshot(code, s);
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
    if (action.playerId !== userId) return { ok: false, error: "not_member" };
    if (seq !== r.seq) return { ok: false, error: "stale_seq" };
    return this.apply(r, action, null);
  }

  private async apply(r: Room, action: Action, auto: string | null): Promise<{ ok: true } | { ok: false; error: Err }> {
    const out = reduce(r.state!, this.ctx, action);
    if (!out.ok) return out;
    r.state = out.state; r.seq++;
    await this.store.append(r.code, { seq: r.seq, at: this.clock.now(), action: auto ? { type: "auto", reason: auto, action } : action });
    await this.store.saveSnapshot(r.code, r.state);
    if (r.state.winner) this.finish(r); else this.arm(r);
    this.emit(r);
    return { ok: true };
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
    const e = effectOf(this.ctx, r.state.pending.cardId).effect;
    const affordable = e.kind === "buy" ? cur.cash >= (e.down ?? e.price) : e.kind !== "lendRequest";
    await this.apply(r, { type: "decide", playerId: cur.id, accept: !!bot && affordable }, bot ? "bot" : "timeout");
  }

  disconnect(code: string, userId: string) {
    const r = this.rooms.get(code); const m = r?.members.find((x) => x.userId === userId);
    if (r && m) { m.online = false; this.emit(r); }
  }

  /** §6.3: qayta ulanganda holat to'liq tiklanadi (snapshot + seq). */
  reconnect(code: string, userId: string): { ok: true } | { ok: false; error: Err } {
    const r = this.rooms.get(code); const m = r?.members.find((x) => x.userId === userId);
    if (!r || !m) return { ok: false, error: "not_member" };
    m.online = true; this.emit(r);
    return { ok: true };
  }

  /** Ixtiyoriy chiqish: mijoz alohida tasdiq so'raydi; o'rinni bot egallaydi (o'yin to'xtamaydi). */
  leave(code: string, userId: string) {
    const r = this.rooms.get(code); const m = r?.members.find((x) => x.userId === userId);
    if (!r || !m) return;
    this.activeRoomOf.delete(userId);
    if (!r.state) { r.members = r.members.filter((x) => x !== m); if (!r.members.length) this.rooms.delete(code); }
    else { m.bot = true; m.online = false; if (currentPlayer(r.state).id === userId) this.arm(r); }
    this.emit(r);
  }

  private finish(r: Room) {
    if (r.timer) this.clock.clearTimeout(r.timer);
    r.timer = null; r.deadline = null;
    for (const m of r.members) this.activeRoomOf.delete(m.userId);
  }
}
