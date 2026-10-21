import type { Action, GameState } from "@poyga/rules";

/** O'yin jurnali (§6.6): urug' + harakatlar ketma-ketligi — o'yinni to'liq qayta tiklash mumkin. */
export interface CalcNote { kind: "decide" | "confirm"; wrong: number; hint: boolean }
export interface JournalEntry { seq: number; at: number; action: Action | { type: "auto"; reason: string; action: Action }; notes?: CalcNote[] }
export type RoomTag = { kind: "class" | "tournament"; id: string }; // sinf xonasi (o'qituvchi) yoki homiy turniri xonasi
export interface RoomMeta { tag?: RoomTag; hostId: string; members: { userId: string; bot: boolean; left?: boolean; unreliable?: boolean }[]; contentVersion: number | null; seq: number; createdAt: number; turnSeconds?: number; calcMode?: "auto" | "manual"; seats?: number; mode?: "standard" | "quick" | "rated" | "tutorial"; limitLeftMs?: number }
export interface ActiveRoom { code: string; state: GameState; meta: RoomMeta }
export interface Store {
  /** Tayyorlik tekshiruvi (/ready): saqlagich javob beradimi. */
  ping?(): Promise<void>;
  saveSnapshot(roomCode: string, state: GameState, meta?: RoomMeta): Promise<void>;
  /** Tashlab ketilgan xonani yopadi (qayta ishga tushganda tiklanmaydi). */
  closeRoom(roomCode: string): Promise<void>;
  /** Istalgan xona (tugagan ham) — tahlil uchun. */
  loadRoom(code: string): Promise<{ state: GameState; meta: RoomMeta | null } | null>;
  /** Tugamagan o'yinlar (server qayta ishga tushganda tiklash uchun). */
  loadActive(): Promise<ActiveRoom[]>;
  /** Zal (boshlanmagan xona): a'zolar o'zgarganda yoziladi, o'yin boshlanganda yoki xona yopilganda o'chadi. */
  saveLobby(roomCode: string, meta: RoomMeta): Promise<void>;
  deleteLobby(roomCode: string): Promise<void>;
  loadLobbies(): Promise<{ code: string; meta: RoomMeta }[]>;
  append(roomCode: string, e: JournalEntry): Promise<void>;
  journal(roomCode: string): Promise<JournalEntry[]>;
}

/** Ishlab chiqish va test uchun. Ishlab chiqarishda PostgreSQL implementatsiyasi shu interfeysni bajaradi. */
export class MemoryStore implements Store {
  snapshots = new Map<string, GameState>();
  metas = new Map<string, RoomMeta>();
  logs = new Map<string, JournalEntry[]>();
  async saveSnapshot(c: string, s: GameState, m?: RoomMeta) { this.snapshots.set(c, s); if (m) this.metas.set(c, m); }
  async ping() {}
  lobbies = new Map<string, RoomMeta>();
  async saveLobby(c: string, m: RoomMeta) { this.lobbies.set(c, JSON.parse(JSON.stringify(m))); }
  async deleteLobby(c: string) { this.lobbies.delete(c); }
  async loadLobbies() { return [...this.lobbies].map(([code, meta]) => ({ code, meta })); }
  async closeRoom(c: string) { this.metas.delete(c); this.lobbies.delete(c); }
  async loadRoom(c: string) { const s = this.snapshots.get(c); return s ? { state: s, meta: this.metas.get(c) ?? null } : null; }
  async loadActive() { return [...this.snapshots].filter(([c, s]) => !s.winner && this.metas.has(c)).map(([code, state]) => ({ code, state, meta: this.metas.get(code)! })); }
  async append(c: string, e: JournalEntry) { (this.logs.get(c) ?? this.logs.set(c, []).get(c)!).push(e); }
  async journal(c: string) { return this.logs.get(c) ?? []; }
}
