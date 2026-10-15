// Tijorat (do'kon, Plus), ta'lim va turnir ma'lumotlari uchun umumiy hujjat saqlagichi. Xotirada ishlaydi; PostgreSQL implementatsiyasi shu interfeysni bajaradi.
import type { Pool } from "pg";
import { WriteQueue } from "./persist";

export interface DocStore {
  loadAll(kind: string): Promise<{ id: string; data: any }[]>;
  save(kind: string, id: string, data: unknown): Promise<void>;
  delete(kind: string, id: string): Promise<void>;
}
export class MemoryDocs implements DocStore {
  m = new Map<string, Map<string, string>>();
  async loadAll(kind: string) { return [...(this.m.get(kind) ?? new Map()).entries()].map(([id, d]) => ({ id, data: JSON.parse(d) })); }
  async save(kind: string, id: string, data: unknown) { (this.m.get(kind) ?? this.m.set(kind, new Map()).get(kind)!).set(id, JSON.stringify(data)); }
  async delete(kind: string, id: string) { this.m.get(kind)?.delete(id); }
}
export class PgDocs implements DocStore {
  constructor(private pool: Pool) {}
  async loadAll(kind: string) { const r = await this.pool.query("select id, data from docs where kind=$1", [kind]); return r.rows.map((x) => ({ id: x.id as string, data: x.data })); }
  async save(kind: string, id: string, data: unknown) {
    await this.pool.query("insert into docs(kind,id,data,updated_at) values($1,$2,$3,now()) on conflict (kind,id) do update set data=excluded.data, updated_at=now()", [kind, id, JSON.stringify(data)]);
  }
  async delete(kind: string, id: string) { await this.pool.query("delete from docs where kind=$1 and id=$2", [kind, id]); }
}

/** Xotiradagi to'plam + doimiy saqlash (yozuv navbati orqali, tartib saqlanadi). */
export class Collection<T> {
  readonly map = new Map<string, T>();
  constructor(readonly kind: string, private store: DocStore | undefined, private q: WriteQueue) {}
  async load() { if (this.store) for (const d of await this.store.loadAll(this.kind)) this.map.set(d.id, d.data as T); return this; }
  get(id: string) { return this.map.get(id); }
  values() { return [...this.map.values()]; }
  set(id: string, v: T) { this.map.set(id, v); this.q.push(async () => this.store?.save(this.kind, id, v)); return v; }
  delete(id: string) { this.map.delete(id); this.q.push(async () => this.store?.delete(this.kind, id)); }
}
