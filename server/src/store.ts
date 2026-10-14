import type { Action, GameState } from "@poyga/rules";

/** O'yin jurnali (§6.6): urug' + harakatlar ketma-ketligi — o'yinni to'liq qayta tiklash mumkin. */
export interface JournalEntry { seq: number; at: number; action: Action | { type: "auto"; reason: string; action: Action } }
export interface Store {
  saveSnapshot(roomCode: string, state: GameState): Promise<void>;
  append(roomCode: string, e: JournalEntry): Promise<void>;
  journal(roomCode: string): Promise<JournalEntry[]>;
}

/** Ishlab chiqish va test uchun. Ishlab chiqarishda PostgreSQL implementatsiyasi shu interfeysni bajaradi. */
export class MemoryStore implements Store {
  snapshots = new Map<string, GameState>();
  logs = new Map<string, JournalEntry[]>();
  async saveSnapshot(c: string, s: GameState) { this.snapshots.set(c, s); }
  async append(c: string, e: JournalEntry) { (this.logs.get(c) ?? this.logs.set(c, []).get(c)!).push(e); }
  async journal(c: string) { return this.logs.get(c) ?? []; }
}
