import { Pool } from "pg";
import { readFileSync } from "node:fs";
import type { GameState } from "@poyga/rules";
import type { ActiveRoom, JournalEntry, RoomMeta, Store } from "./store";

export class PgStore implements Store {
  constructor(private pool: Pool) {}
  static connect(url: string) { return new PgStore(new Pool({ connectionString: url })); }

  async migrate() {
    for (const f of ["001_init.sql", "002_admin_content.sql", "003_profiles.sql"])
      await this.pool.query(readFileSync(new URL(`../migrations/${f}`, import.meta.url), "utf-8"));
  }
  async saveSnapshot(code: string, s: GameState, meta?: RoomMeta) {
    await this.pool.query("insert into rooms(code) values($1) on conflict do nothing", [code]);
    await this.pool.query(
      "insert into snapshots(room_code,state,meta) values($1,$2,$3) on conflict (room_code) do update set state=excluded.state, meta=coalesce(excluded.meta, snapshots.meta), updated_at=now()",
      [code, JSON.stringify(s), meta ? JSON.stringify(meta) : null]);
    if (s.winner) await this.pool.query("update rooms set ended_at=now() where code=$1 and ended_at is null", [code]);
  }
  async append(code: string, e: JournalEntry) {
    await this.pool.query("insert into rooms(code) values($1) on conflict do nothing", [code]);
    await this.pool.query("insert into journal(room_code,seq,at,entry) values($1,$2,to_timestamp($3/1000.0),$4)",
      [code, e.seq, e.at, JSON.stringify(e)]);
  }
  async journal(code: string): Promise<JournalEntry[]> {
    const r = await this.pool.query("select entry from journal where room_code=$1 order by seq", [code]);
    return r.rows.map((x) => x.entry as JournalEntry);
  }
  async loadActive(): Promise<ActiveRoom[]> {
    const r = await this.pool.query("select s.room_code, s.state, s.meta from snapshots s join rooms r on r.code=s.room_code where r.ended_at is null and s.meta is not null");
    return r.rows.map((x) => ({ code: x.room_code, state: x.state, meta: x.meta }));
  }
  async loadSnapshot(code: string): Promise<GameState | null> {
    const r = await this.pool.query("select state from snapshots where room_code=$1", [code]);
    return r.rows[0]?.state ?? null;
  }
  close() { return this.pool.end(); }
}
