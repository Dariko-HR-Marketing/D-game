// Klublar (Premium): do'stlar guruhi va o'z reytingi. Klub YARATISH — Premium; QO'SHILISH — hamma uchun bepul (kod bilan).
// 16 yoshgacha (yoki ota-ona cheklagan) hisoblar klubga kira olmaydi (§2.8: guruh va ijtimoiy imkoniyatlar yopiq). Natijaga ta'sir qilmaydi, faqat ko'rinish.
import { randomBytes } from "node:crypto";
import { Collection, type DocStore } from "./docs";
import { WriteQueue } from "./persist";

export interface Club { id: string; name: string; code: string; ownerId: string; members: string[]; createdAt: number }
/** Chegaralar (taklif, buyurtmachi tasdig'i kutilmoqda: OPEN_QUESTIONS 218): bitta egada 3 klub, klubda 30 a'zo, bitta odam 5 klubda. */
export const CLUB_LIMITS = { ownedPerUser: 3, members: 30, joinedPerUser: 5 } as const;
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const mkCode = () => Array.from(randomBytes(6), (b) => ALPHA[b % ALPHA.length]).join("");

export type ClubErr = "premium_required" | "bad_name" | "limit_owned" | "limit_joined" | "club_full" | "bad_code" | "not_found" | "not_member" | "restricted" | "already_member";
export class Clubs {
  readonly items: Collection<Club>; readonly queue = new WriteQueue();
  constructor(docs: DocStore | undefined, private now: () => number = Date.now) { this.items = new Collection("club", docs, this.queue); }
  async load() { await this.items.load(); return this; }
  mine(uid: string) { return this.items.values().filter((c) => c.members.includes(uid)).sort((a, b) => a.createdAt - b.createdAt); }
  create(uid: string, nameRaw: unknown, premium: boolean, restricted: boolean): { ok: true; club: Club } | { ok: false; error: ClubErr } {
    if (restricted) return { ok: false, error: "restricted" }; if (!premium) return { ok: false, error: "premium_required" };
    const name = typeof nameRaw === "string" ? nameRaw.replace(/[\u0000-\u001f<>]/g, "").trim() : ""; if (name.length < 2 || name.length > 30) return { ok: false, error: "bad_name" };
    if (this.items.values().filter((c) => c.ownerId === uid).length >= CLUB_LIMITS.ownedPerUser) return { ok: false, error: "limit_owned" };
    let code = mkCode(); while (this.items.values().some((c) => c.code === code)) code = mkCode();
    const club: Club = { id: randomBytes(6).toString("hex"), name, code, ownerId: uid, members: [uid], createdAt: this.now() }; this.items.set(club.id, club); return { ok: true, club };
  }
  join(uid: string, codeRaw: unknown, restricted: boolean): { ok: true; club: Club } | { ok: false; error: ClubErr } {
    if (restricted) return { ok: false, error: "restricted" };
    const code = typeof codeRaw === "string" ? codeRaw.trim().toUpperCase() : ""; const c = this.items.values().find((x) => x.code === code); if (!c) return { ok: false, error: "bad_code" };
    if (c.members.includes(uid)) return { ok: false, error: "already_member" };
    if (c.members.length >= CLUB_LIMITS.members) return { ok: false, error: "club_full" };
    if (this.mine(uid).length >= CLUB_LIMITS.joinedPerUser) return { ok: false, error: "limit_joined" };
    const n = { ...c, members: [...c.members, uid] }; this.items.set(c.id, n); return { ok: true, club: n };
  }
  /** Chiqish: egasi chiqsa, egalik keyingi a'zoga o'tadi; a'zo qolmasa klub o'chadi. */
  leave(uid: string, id: string): { ok: true } | { ok: false; error: ClubErr } {
    const c = this.items.get(id); if (!c) return { ok: false, error: "not_found" }; if (!c.members.includes(uid)) return { ok: false, error: "not_member" };
    const members = c.members.filter((m) => m !== uid); if (!members.length) { this.items.delete(id); return { ok: true }; }
    this.items.set(id, { ...c, members, ownerId: c.ownerId === uid ? members[0] : c.ownerId }); return { ok: true };
  }
  remove(uid: string, id: string): { ok: true } | { ok: false; error: ClubErr } { const c = this.items.get(id); if (!c) return { ok: false, error: "not_found" }; if (c.ownerId !== uid) return { ok: false, error: "not_member" }; this.items.delete(id); return { ok: true }; }
  /** Hisobni o'chirish: hamma klubdan chiqadi. */
  erase(uid: string) { for (const c of this.mine(uid)) this.leave(uid, c.id); }
}
