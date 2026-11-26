// Oferta (ommaviy shartnoma) roziligi: foydalanuvchi o'z roziligi bilan shartlarni qabul qiladi, versiya va vaqt yoziladi, istalgan payt qaytarib olinadi.
// `OFFER_VERSION` bo'sh bo'lsa talab o'chiq (hech kim to'silmaydi): yurist matnni tasdiqlagach versiya yoziladi va rozilik o'yin ochish/qo'shilishdan oldin talab qilinadi.
import type { FastifyInstance } from "fastify";
import type { Guard } from "./admin";
import { Collection, type DocStore } from "./docs";
import { WriteQueue } from "./persist";

export interface OfferRec { id: string; version: string; at: number; history: { version: string; at: number }[] }

/** Qaysi ma'lumot, nima uchun, qayerda, qancha saqlanadi: oferta va admin sahifasi uchun yagona manba. Faqat HAQIQATDA yig'iladigan narsalar. */
export const DATA_INVENTORY: { source: string; field: string; purpose: string; basis: string; kept: string }[] = [
  { source: "Telefon (SMS)", field: "Telefon raqamidan qaytarib bo'lmaydigan xesh", purpose: "Kirish va bitta raqam — bitta hisob", basis: "Rozilik va shartnoma", kept: "Hisob o'chirilgunicha" },
  { source: "Profil", field: "Ism, rang, tug'ilgan yil, (ixtiyoriy) jins, rasm", purpose: "O'yinda ko'rsatish; 16 yoshgacha cheklovlar", basis: "Shartnoma", kept: "Hisob o'chirilgunicha" },
  { source: "O'yin", field: "Tarix, natija, ball, XP, harakatlar jurnali", purpose: "Profil, reyting, nizolarni hal qilish", basis: "Shartnoma", kept: "Hisob o'chirilgunicha (jurnal: nizo muddatigacha)" },
  { source: "Telegram", field: "Telegram foydalanuvchi ID, kanal/guruh a'zoligi natijasi (ha/yo'q, sana)", purpose: "Majburiy obuna tekshiruvi va yulduzcha", basis: "Rozilik", kept: "Hisob o'chirilgunicha yoki «Uzish» gacha" },
  { source: "Instagram", field: "Instagram IGSID, obuna natijasi (ha/yo'q, sana)", purpose: "Majburiy obuna tekshiruvi va yulduzcha", basis: "Rozilik", kept: "Hisob o'chirilgunicha yoki «Uzish» gacha" },
  { source: "YouTube (Google)", field: "Faqat natija: obuna bor/yo'q va sana. Google tokeni saqlanmaydi", purpose: "Yulduzcha (ixtiyoriy)", basis: "Rozilik", kept: "Hisob o'chirilgunicha yoki «Uzish» gacha" },
  { source: "Facebook", field: "Foydalanuvchining o'zi bergan tasdiq (sana). Facebook'dan ma'lumot olinmaydi", purpose: "Yulduzcha (ixtiyoriy)", basis: "Rozilik", kept: "Hisob o'chirilgunicha yoki «Uzish» gacha" },
  { source: "Xaridlar", field: "Buyurtma, summa, holat (karta ma'lumoti Payme/Click'da, bizda yo'q)", purpose: "Paket berish va hisob-kitob", basis: "Shartnoma, qonuniy majburiyat", kept: "Soliq qonunchiligi muddati" },
  { source: "Rozilik", field: "Oferta versiyasi va qabul qilingan vaqt", purpose: "Rozilik isboti", basis: "Qonuniy majburiyat", kept: "Hisob o'chirilgunicha" },
];

export class OfferConsents {
  private recs: Collection<OfferRec>; readonly queue = new WriteQueue();
  constructor(readonly version: string | undefined, store?: DocStore, private now: () => number = Date.now) { this.recs = new Collection("offer", store, this.queue); }
  async load() { await this.recs.load(); return this; }
  required() { return this.version || null; }
  accepted(uid: string) { return this.recs.get(uid)?.version ?? null; }
  /** Talab o'chiq bo'lsa yoki joriy versiyaga rozilik berilgan bo'lsa — rost. */
  ok(uid: string) { return !this.version || this.recs.get(uid)?.version === this.version; }
  accept(uid: string, version: string): { ok: true } | { ok: false; error: "bad_version" | "not_enabled" } {
    if (!this.version) return { ok: false, error: "not_enabled" }; if (version !== this.version) return { ok: false, error: "bad_version" };
    const r = this.recs.get(uid); this.recs.set(uid, { id: uid, version, at: this.now(), history: [...(r?.history ?? []), ...(r ? [{ version: r.version, at: r.at }] : [])].slice(-20) }); return { ok: true };
  }
  /** Rozilikni qaytarib olish: yozuv o'chadi; talab yoqilgan bo'lsa, o'ynash uchun yana rozilik kerak. */
  withdraw(uid: string) { this.recs.delete(uid); }
  erase(uid: string) { this.recs.delete(uid); }
  stats(totalUsers: number) {
    const all = this.recs.values(), cur = this.version ? all.filter((r) => r.version === this.version).length : 0;
    const byVersion: Record<string, number> = {}; for (const r of all) byVersion[r.version] = (byVersion[r.version] ?? 0) + 1;
    return { version: this.version ?? null, enabled: !!this.version, accepted: cur, olderVersion: all.length - cur, totalUsers, notAccepted: Math.max(0, totalUsers - cur), byVersion, recent: all.sort((a, b) => b.at - a.at).slice(0, 20).map((r) => ({ id: r.id, version: r.version, at: r.at })) };
  }
}

export function registerOffer(d: { app: FastifyInstance; offer: OfferConsents; secured: (h: (uid: string, req: any, reply: any) => unknown) => (req: any, reply: any) => unknown }) {
  const { app, offer } = d;
  app.get("/me/consent", d.secured((uid) => ({ required: offer.required(), accepted: offer.accepted(uid), ok: offer.ok(uid), links: { offer: "/oferta.html", privacy: "/maxfiylik.html" } })));
  app.post("/me/consent", d.secured((uid, req, reply) => { const r = offer.accept(uid, String((req.body as any)?.version ?? "")); return r.ok ? { ok: true, accepted: offer.accepted(uid) } : reply.code(r.error === "not_enabled" ? 404 : 400).send({ error: r.error }); }));
  app.delete("/me/consent", d.secured((uid) => { offer.withdraw(uid); return { ok: true, required: offer.required(), ok2: offer.ok(uid) }; }));
}
export function registerOfferAdmin(guard: Guard, app: FastifyInstance, offer: OfferConsents, totalUsers: () => number) {
  app.get("/admin/consent", guard("users.read", () => ({ ...offer.stats(totalUsers()), inventory: DATA_INVENTORY })));
}
