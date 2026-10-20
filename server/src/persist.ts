// Admin ma'lumotlari va kontent versiyalarini saqlash. Yozuvlar ketma-ket (tartibni saqlab) bajariladi.
import type { Pool } from "pg";
import type { Bundle } from "@poyga/content";
import type { AuditEntry, Complaint } from "./admin";
import type { VersionInfo } from "./registry";
import type { GameResult, Profile, ProfilePersist } from "./profiles";
import type { CardStat, StatsPersist } from "./analysis";

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
  /** Vaqtincha xatoda 3 marta (kutish bilan) qayta uriniladi; shundan keyin ham bo'lmasa — jurnalga yoziladi, navbat davom etadi. */
  constructor(private retryMs = [200, 1000, 4000]) {}
  push(f: () => Promise<void>) {
    this.tail = this.tail.then(async () => {
      for (let i = 0; ; i++) {
        try { return await f(); } catch (e) {
          if (i >= this.retryMs.length) { this.errors.push(e); if (this.errors.length > 100) this.errors.shift(); console.error("persist xatosi:", e); return; }
          await new Promise((r) => setTimeout(r, this.retryMs[i]));
        }
      }
    });
  }
  flush() { return this.tail; }
}

export class PgPersist implements Persist, ProfilePersist, StatsPersist {
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
    const r = await this.pool.query("select extract(epoch from at)*1000 as at, admin, role, action, target, detail, ip from audit_log order by id desc limit 500");
    return r.rows.reverse().map((x) => ({ at: Number(x.at), admin: x.admin, role: x.role, action: x.action, target: x.target ?? undefined, detail: x.detail ?? undefined, ip: x.ip ?? undefined }) as AuditEntry);
  }
  async appendAudit(a: AuditEntry) {
    await this.pool.query("insert into audit_log(at,admin,role,action,target,detail,ip) values(to_timestamp($1/1000.0),$2,$3,$4,$5,$6,$7)", [a.at, a.admin, a.role, a.action, a.target ?? null, a.detail === undefined ? null : JSON.stringify(a.detail), a.ip ?? null]);
  }

  async loadProfiles(): Promise<Profile[]> {
    const r = await this.pool.query("select user_id, name, color, birth_year, extract(epoch from updated_at)*1000 as at from profiles");
    return r.rows.map((x) => ({ userId: x.user_id, name: x.name, color: x.color, birthYear: x.birth_year, updatedAt: Number(x.at) }));
  }
  async saveProfile(p: Profile) {
    await this.pool.query("insert into profiles(user_id,name,color,birth_year,updated_at) values($1,$2,$3,$4,to_timestamp($5/1000.0)) on conflict (user_id) do update set name=excluded.name, color=excluded.color, birth_year=excluded.birth_year, updated_at=excluded.updated_at",
      [p.userId, p.name, p.color, p.birthYear, p.updatedAt]);
  }
  async loadPhotoVersions(): Promise<[string, number][]> { const r = await this.pool.query("select user_id, extract(epoch from updated_at)*1000 as at from profile_photos"); return r.rows.map((x) => [x.user_id, Number(x.at)] as [string, number]); }
  async loadPhoto(userId: string): Promise<Buffer | null> { const r = await this.pool.query("select jpeg from profile_photos where user_id=$1", [userId]); return r.rows[0]?.jpeg ?? null; }
  async savePhoto(userId: string, jpeg: Buffer, at: number) { await this.pool.query("insert into profile_photos(user_id,jpeg,updated_at) values($1,$2,to_timestamp($3/1000.0)) on conflict (user_id) do update set jpeg=excluded.jpeg, updated_at=excluded.updated_at", [userId, jpeg, at]); }
  async deletePhoto(userId: string) { await this.pool.query("delete from profile_photos where user_id=$1", [userId]); }
  async deleteProfile(userId: string) { await this.pool.query("delete from profile_photos where user_id=$1", [userId]); await this.pool.query("delete from profiles where user_id=$1", [userId]); await this.pool.query("delete from app_users where id=$1", [userId]); }
  async loadResults(): Promise<GameResult[]> {
    const r = await this.pool.query("select room_code, extract(epoch from finished_at)*1000 as at, duration_ms, rounds, winner, content_version, players from game_results order by id");
    return r.rows.map((x) => ({ room: x.room_code, finishedAt: Number(x.at), durationMs: Number(x.duration_ms), rounds: x.rounds, winner: x.winner, contentVersion: x.content_version, players: x.players }));
  }
  async saveResult(g: GameResult) {
    await this.pool.query("insert into game_results(room_code,finished_at,duration_ms,rounds,winner,content_version,players) values($1,to_timestamp($2/1000.0),$3,$4,$5,$6,$7)",
      [g.room, g.finishedAt, g.durationMs, g.rounds, g.winner, g.contentVersion, JSON.stringify(g.players)]);
  }
  async anonymizeResults(userId: string) {
    await this.pool.query(`update game_results set winner = case when winner=$1 then 'deleted' else winner end,
      players = (select jsonb_agg(case when p->>'id'=$1 then jsonb_set(p,'{id}','"deleted"') else p end) from jsonb_array_elements(players) p)
      where players @> $2::jsonb`, [userId, JSON.stringify([{ id: userId }])]);
  }

  async loadCardStats(): Promise<Record<string, CardStat>> {
    const r = await this.pool.query("select card_id, shown, accepted, skipped from card_stats");
    return Object.fromEntries(r.rows.map((x) => [x.card_id, { shown: x.shown, accepted: x.accepted, skipped: x.skipped }]));
  }
  async addCardStats(delta: Record<string, CardStat>) {
    for (const [id, c] of Object.entries(delta))
      await this.pool.query("insert into card_stats(card_id,shown,accepted,skipped) values($1,$2,$3,$4) on conflict (card_id) do update set shown=card_stats.shown+excluded.shown, accepted=card_stats.accepted+excluded.accepted, skipped=card_stats.skipped+excluded.skipped", [id, c.shown, c.accepted, c.skipped]);
  }
}
