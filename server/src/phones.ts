// Telefon tasdig'i (qo'llanma: to'lov, o'zaro qarz va guvohlik uchun majburiy). Raqamning o'zi saqlanmaydi — faqat HMAC. Bitta raqam — bitta hisob.
import { createHmac } from "node:crypto";
import { Collection, type DocStore } from "./docs";
import { WriteQueue } from "./persist";

export interface PhoneRec { userId: string; hash: string; at: number }
export class PhoneLinks {
  private byUser: Collection<PhoneRec>;
  readonly queue = new WriteQueue();
  constructor(private secret: string, store?: DocStore, private now: () => number = Date.now) { this.byUser = new Collection("phone", store, this.queue); }
  async load() { await this.byUser.load(); return this; }
  private h(phone: string) { return createHmac("sha256", this.secret).update("phone:" + phone).digest("hex").slice(0, 40); }
  hashOf(phone: string) { return this.h(phone); }
  isVerified(userId: string) { return this.byUser.get(userId) !== undefined; }
  /** Raqamni hisobga bog'laydi. Boshqa hisobda bo'lsa — `phone_taken`. */
  link(userId: string, phone: string): { ok: true } | { ok: false; error: "phone_taken" } {
    const hash = this.h(phone);
    if (this.byUser.values().some((r) => r.hash === hash && r.userId !== userId)) return { ok: false, error: "phone_taken" };
    this.byUser.set(userId, { userId, hash, at: this.now() }); return { ok: true };
  }
  hashFor(userId: string) { return this.byUser.get(userId)?.hash; }
  erase(userId: string) { this.byUser.delete(userId); }
}
