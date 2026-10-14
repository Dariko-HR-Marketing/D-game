import type { Action, GameState } from "@poyga/rules";

/** O'yin jurnali (§6.6): urug' + harakatlar ketma-ketligi — o'yinni to'liq qayta tiklash mumkin. */
export interface JournalEntry { seq: number; at: number; action: Action | { type: "auto"; reason: string; action: Action } }
export interface RoomMeta { hostId: string; members: { userId: string; bot: boolean }[]; contentVersion: number | null; seq: number; createdAt: number }
export interface ActiveRoom { code: string; state: GameState; meta: RoomMeta }
export interface Store {
  saveSnapshot(roomCode: string, state: GameState, meta?: RoomMeta): Promise<void>;
  /** Tugamagan o'yinlar (server qayta ishga tushganda tiklash uchun). */
  loadActive(): Promise<ActiveRoom[]>;
  append(roomCode: string, e: JournalEntry): Promise<void>;
  journal(roomCode: string): Promise<JournalEntry[]>;
}

/** Ishlab chiqish va test uchun. Ishlab chiqarishda PostgreSQL implementatsiyasi shu interfeysni bajaradi. */
export class MemoryStore implements Store {
  snapshots = new Map<string, GameState>();
  metas = new Map<string, RoomMeta>();
  logs = new Map<string, JournalEntry[]>();
  async saveSnapshot(c: string, s: GameState, m?: RoomMeta) { this.snapshots.set(c, s); if (m) this.metas.set(c, m); }
  async loadActive() { return [...this.snapshots].filter(([c, s]) => !s.winner && this.metas.has(c)).map(([code, state]) => ({ code, state, meta: this.metas.get(code)! })); }
  async append(c: string, e: JournalEntry) { (this.logs.get(c) ?? this.logs.set(c, []).get(c)!).push(e); }
  async journal(c: string) { return this.logs.get(c) ?? []; }
}
