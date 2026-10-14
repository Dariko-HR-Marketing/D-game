// Admin ma'lumotlari va kontent versiyalarini saqlash. Yozuvlar ketma-ket (tartibni saqlab) bajariladi.
import type { Pool } from "pg";
import type { Bundle } from "@poyga/content";
import type { AuditEntry, Complaint } from "./admin";
import type { VersionInfo } from "./registry";

export interface UserRow { id: string; firstSeen: number; lastSeen: number; banned: boolean; banReason?: string }
export interface Persist {
  loadVersions(): Promise<{ info: VersionInfo; bundle: Bundle }[]>;
  loadActive(): Promise<number | null>;
  saveVersion(info: VersionInfo, bundle: Bundle): Promise<void>;
  setActive(v: number): Promise<void>;
  loadUsers(): Promise<UserRow[]>;
  saveUser(u: UserRow): Promise<void>;
  loadComplaints(): Promise<Complaint[]>;
  saveComplaint(c: Complaint): Promise<void>;
  loadAudit(): Promise<AuditEntry[]>;
  appendAudit(a: AuditEntry): Promise<void>;
}

/** Yozuvlar navbati: xato bo'lsa ham keyingilar to'xtamaydi; `flush()` hammasi tugashini kutadi. */
export class WriteQueue {
  private tail: Promise<void> = Promise.resolve();
  errors: unknown[] = [];
  push(f: () => Promise<void>) { this.tail = this.tail.then(f).catch((e) => { this.errors.push(e); console.error("persist xatosi:", e); }); }
  flush() { return this.tail; }
}

export class PgPersist implements Persist {
  constructor(private pool: Pool) {}
  async loadVersions() {
    const r = await this.pool.query("select version, part, note, author, extract(epoch from at)*1000 as at, published, bundle from content_versions order by version");
    return r.rows.map((x) => ({ info: { version: x.version, part: x.part, note: x.note, author: x.author, at: Number(x.at), published: x.published }, bundle: x.bundle as Bundle }));
  }
  async loadActive() { const r = await this.pool.query("select value from settings where key='active_content'"); return r.rows[0] ? Number(r.rows[0].value) : null; }
  async saveVersion(i: VersionInfo, b: Bundle) {
    await this.pool.query("insert into content_versions(version,part,note,author,at,published,bundle) values($1,$2,$3,$4,to_timestamp($5/1000.0),$6,$7) on conflict (version) do update set published=excluded.published",
      [i.version, i.part, i.note, i.author, i.at, i.published, JSON.stringify(b)]);
  }
  async setActive(v: number) {
    await this.pool.query("update content_versions set published=true where version=$1", [v]);
    await this.pool.query("insert into settings(key,value) values('active_content',$1) on conflict (key) do update set value=excluded.value", [JSON.stringify(v)]);
  }
  async loadUsers() {
    const r = await this.pool.query("select id, extract(epoch from first_seen)*1000 as fs, extract(epoch from last_seen)*1000 as ls, banned, ban_reason from app_users");
    return r.rows.map((x) => ({ id: x.id, firstSeen: Number(x.fs), lastSeen: Number(x.ls), banned: x.banned, banReason: x.ban_reason ?? undefined }));
  }
  async saveUser(u: UserRow) {
    await this.pool.query("insert into app_users(id,first_seen,last_seen,banned,ban_reason) values($1,to_timestamp($2/1000.0),to_timestamp($3/1000.0),$4,$5) on conflict (id) do update set last_seen=excluded.last_seen, banned=excluded.banned, ban_reason=excluded.ban_reason",
      [u.id, u.firstSeen, u.lastSeen, u.banned, u.banReason ?? null]);
  }
  async loadComplaints() {
    const r = await this.pool.query("select id, from_user, against, room, text, extract(epoch from at)*1000 as at, status, resolution, resolved_by from complaints order by id");
    return r.rows.map((x) => ({ id: x.id, from: x.from_user, against: x.against, room: x.room, text: x.text, at: Number(x.at), status: x.status, resolution: x.resolution ?? undefined, resolvedBy: x.resolved_by ?? undefined }) as Complaint);
  }
  async saveComplaint(c: Complaint) {
    await this.pool.query("insert into complaints(id,from_user,against,room,text,at,status,resolution,resolved_by) values($1,$2,$3,$4,$5,to_timestamp($6/1000.0),$7,$8,$9) on conflict (id) do update set status=excluded.status, resolution=excluded.resolution, resolved_by=excluded.resolved_by",
      [c.id, c.from, c.against, c.room, c.text, c.at, c.status, c.resolution ?? null, c.resolvedBy ?? null]);
    await this.pool.query("select setval(pg_get_serial_sequence('complaints','id'), greatest((select max(id) from complaints),1))");
  }
  async loadAudit() {
    const r = await this.pool.query("select extract(epoch from at)*1000 as at, admin, role, action, target, detail from audit_log order by id desc limit 500");
    return r.rows.reverse().map((x) => ({ at: Number(x.at), admin: x.admin, role: x.role, action: x.action, target: x.target ?? undefined, detail: x.detail ?? undefined }) as AuditEntry);
  }
  async appendAudit(a: AuditEntry) {
    await this.pool.query("insert into audit_log(at,admin,role,action,target,detail) values(to_timestamp($1/1000.0),$2,$3,$4,$5,$6)", [a.at, a.admin, a.role, a.action, a.target ?? null, a.detail === undefined ? null : JSON.stringify(a.detail)]);
  }
}
