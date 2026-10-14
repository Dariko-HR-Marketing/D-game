import { Pool } from "pg";
import { readFileSync } from "node:fs";
import type { GameState } from "@poyga/rules";
import type { JournalEntry, Store } from "./store";

export class PgStore implements Store {
  constructor(private pool: Pool) {}
  static connect(url: string) { return new PgStore(new Pool({ connectionString: url })); }

  async migrate() {
    await this.pool.query(readFileSync(new URL("../migrations/001_init.sql", import.meta.url), "utf-8"));
  }
  async saveSnapshot(code: string, s: GameState) {
    await this.pool.query("insert into rooms(code) values($1) on conflict do nothing", [code]);
    await this.pool.query(
      "insert into snapshots(room_code,state) values($1,$2) on conflict (room_code) do update set state=excluded.state, updated_at=now()",
      [code, JSON.stringify(s)]);
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
  async loadSnapshot(code: string): Promise<GameState | null> {
    const r = await this.pool.query("select state from snapshots where room_code=$1", [code]);
    return r.rows[0]?.state ?? null;
  }
  close() { return this.pool.end(); }
}
