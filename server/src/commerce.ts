// Do'kon va POYGA Plus (maketlar N44–N46, N53; qo'llanma/spetsifikatsiya §7–§9).
// Tamoyillar: asosiy o'yin bepul; Plus va kosmetika o'yin natijasiga ta'sir qilmaydi; tasodifiy sandiq (loot box) yo'q; narx oldindan aniq;
// 18 yoshgacha to'lov ota-ona roziligi bilan; to'lovdan oldin telefon tasdig'i. Narxlar sozlamada (admin) — qiymati berilmaguncha xarid yopiq.
import { randomBytes } from "node:crypto";
import { Collection, type DocStore } from "./docs";
import { WriteQueue } from "./persist";
import type { ParentConsents } from "./parents";

export type ItemKind = "pawn" | "frame" | "avatar" | "bundle";
export interface Item { id: string; kind: ItemKind; name: string; color?: string; source: "default" | "shop" | "plus" | "achievement"; ach?: string; desc: string; available: boolean }
/** Faqat ko'rinish. Kasb va orzu to'plamlari kontent talab qiladi (asosiy deka muvozanatida) — kontent kelguncha yopiq (`available: false`). */
export const ITEMS: Item[] = [
  { id: "pawn-silver", kind: "pawn", name: "Kumush", color: "#AEB8C2", source: "default", desc: "Hamma uchun", available: true },
  { id: "pawn-gold", kind: "pawn", name: "Oltin", color: "#F5B82E", source: "plus", desc: "Plus · har oy tanlash mumkin", available: true },
  { id: "pawn-emerald", kind: "pawn", name: "Zumrad", color: "#11835A", source: "shop", desc: "Sotib olinadi", available: true },
  { id: "pawn-ruby", kind: "pawn", name: "Yoqut", color: "#C8323A", source: "shop", desc: "Sotib olinadi", available: true },
  { id: "pawn-turquoise", kind: "pawn", name: "Feruza", color: "#1C8FB8", source: "achievement", ach: "first_win", desc: "Birinchi g'alaba uchun beriladi", available: true },
  { id: "pawn-night", kind: "pawn", name: "Tun", color: "#203040", source: "shop", desc: "Sotib olinadi", available: true },
  { id: "frame-plain", kind: "frame", name: "Oddiy", color: "#D5DEE4", source: "default", desc: "Hamma uchun", available: true },
  { id: "frame-gold", kind: "frame", name: "Oltin ramka", color: "#F5B82E", source: "plus", desc: "Plus · har oy tanlash mumkin", available: true },
  { id: "frame-emerald", kind: "frame", name: "Zumrad ramka", color: "#11835A", source: "shop", desc: "Sotib olinadi", available: true },
  { id: "frame-champion", kind: "frame", name: "Chempion ramkasi", color: "#7B4FA3", source: "achievement", ach: "wins_5", desc: "5 ta g'alaba uchun beriladi", available: true },
  { id: "avatar-sky", kind: "avatar", name: "Osmon", color: "#E3EEF6", source: "default", desc: "Hamma uchun", available: true },
  { id: "avatar-mint", kind: "avatar", name: "Yalpiz", color: "#DCEEC4", source: "shop", desc: "Sotib olinadi", available: true },
  { id: "avatar-sand", kind: "avatar", name: "Qum", color: "#F5EEDC", source: "shop", desc: "Sotib olinadi", available: true },
  { id: "avatar-rose", kind: "avatar", name: "Atirgul", color: "#F7E6EC", source: "shop", desc: "Sotib olinadi", available: true },
  { id: "bundle-board", kind: "bundle", name: "Mavzuli maydon", source: "shop", desc: "Maydon va karta orqalarining boshqa ko'rinishi", available: false },
  { id: "bundle-kasb", kind: "bundle", name: "Kasblar to'plami", source: "shop", desc: "Qo'shimcha kasb kartalari — asosiy deka bilan bir xil muvozanatda; reytingli o'yinda yoqilmaydi", available: false },
  { id: "bundle-orzu", kind: "bundle", name: "Orzular to'plami", source: "shop", desc: "Qo'shimcha orzu kartalari — narxlar asosiy orzular oralig'ida; reytingli o'yinda yoqilmaydi", available: false },
];
const ITEM = new Map(ITEMS.map((i) => [i.id, i]));
export const itemById = (id: string) => ITEM.get(id);

export interface CatalogConfig { plusMonthly: number | null; plusYearly: number | null; items: Record<string, number | null>; freeRoomsPerDay: number | null; freeHistory: number | null }
/** Narxlar qiymati berilmagan (null). `freeRoomsPerDay`/`freeHistory` — taxminiy standartlar (OPEN_QUESTIONS): bepul tarifdagi chegara. */
export const DEFAULT_CONFIG: CatalogConfig = { plusMonthly: null, plusYearly: null, items: {}, freeRoomsPerDay: 5, freeHistory: 10 };

export interface Ent { userId: string; plusUntil: number | null; plusPlan?: "monthly" | "yearly"; plusCancelled?: boolean; owned: string[]; equipped: { pawn?: string; frame?: string; avatar?: string }; claimedMonth?: string }
export type OrderStatus = "pending_parent" | "pending_payment" | "paid" | "cancelled" | "rejected";
export interface Order { id: string; userId: string; sku: string; title: string; amount: number; channel: "web" | "store"; status: OrderStatus; createdAt: number; paidAt?: number; ref?: string; checkout?: string; consentId?: string }

export interface PaymentProvider { id: string; channels: ("web" | "store")[]; checkout(o: Order): Promise<{ ref: string; url?: string }> }
/** Sinov provayderi (faqat production'dan tashqarida): to'lov oynasiz, `/dev/pay/:id` bilan tasdiqlanadi. */
export class DevProvider implements PaymentProvider {
  id = "dev"; channels: ("web" | "store")[] = ["web", "store"];
  constructor() { if (process.env.NODE_ENV === "production") throw new Error("DevProvider production'da taqiqlangan"); }
  async checkout(o: Order) { return { ref: "dev-" + o.id }; }
}

export const PLUS_DAYS = { monthly: 30, yearly: 365 } as const;
const DAY = 86_400_000, ym = (t: number) => new Date(t).toISOString().slice(0, 7);
const MINOR_PAY_AGE = 18;

export interface CommerceDeps { docs?: DocStore; now?: () => number; providers?: PaymentProvider[]; consents?: ParentConsents; phoneOk: (uid: string) => boolean; ageOf: (uid: string) => number | null; achievements: (uid: string) => string[]; phoneHashOf: (uid: string) => string | undefined; hashOf: (p: string) => string }
export type OrderErr = "bad_sku" | "price_unset" | "unavailable" | "already_owned" | "phone_required" | "profile_required" | "parent_phone_required" | "payments_unavailable" | "bad_phone" | "same_phone" | "rate_limited" | "sms_failed" | "sms_unavailable" | "plus_already_long" | "not_found" | "not_pending" | "bad_item" | "not_owned" | "not_plus" | "already_claimed" | "amount_mismatch";

export class Commerce {
  readonly ents: Collection<Ent>; readonly orders: Collection<Order>; readonly cfg: Collection<CatalogConfig>;
  readonly queue = new WriteQueue();
  private now: () => number;
  private createdToday = new Map<string, { day: string; n: number }>();
  constructor(private d: CommerceDeps) {
    this.now = d.now ?? Date.now; this.ents = new Collection("ent", d.docs, this.queue); this.orders = new Collection("order", d.docs, this.queue); this.cfg = new Collection("catalog", d.docs, this.queue);
  }
  async load() { await this.ents.load(); await this.orders.load(); await this.cfg.load(); return this; }
  config(): CatalogConfig { return { ...DEFAULT_CONFIG, ...(this.cfg.get("config") ?? {}), items: { ...(this.cfg.get("config")?.items ?? {}) } }; }
  setConfig(patch: Partial<CatalogConfig>): { ok: true; config: CatalogConfig } | { ok: false; error: string } {
    const c = { ...this.config(), ...patch };
    const okP = (v: unknown) => v === null || (Number.isInteger(v) && (v as number) > 0 && (v as number) <= 1_000_000_000);
    if (!okP(c.plusMonthly) || !okP(c.plusYearly)) return { ok: false, error: "bad_price" };
    for (const [k, v] of Object.entries(c.items)) if (!ITEM.has(k) || !okP(v)) return { ok: false, error: "bad_price" };
    const lim = (v: unknown) => v === null || (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 10_000);
    if (!lim(c.freeRoomsPerDay) || !lim(c.freeHistory)) return { ok: false, error: "bad_limit" };
    this.cfg.set("config", c); return { ok: true, config: c };
  }

  ent(uid: string): Ent { return this.ents.get(uid) ?? { userId: uid, plusUntil: null, owned: [], equipped: {} }; }
  isPlus(uid: string) { const e = this.ents.get(uid); return !!e?.plusUntil && e.plusUntil > this.now(); }
  /** Egalik: sotib olingan + standart + yutuq uchun berilgan. */
  owns(uid: string, id: string) {
    const it = ITEM.get(id); if (!it) return false;
    if (it.source === "default") return true;
    if (it.source === "achievement") return !!it.ach && this.d.achievements(uid).includes(it.ach);
    return this.ent(uid).owned.includes(id);
  }
  priceOf(sku: string): number | null | undefined {
    const c = this.config();
    if (sku === "plus:monthly") return c.plusMonthly; if (sku === "plus:yearly") return c.plusYearly;
    const m = /^item:(.+)$/.exec(sku); if (!m) return undefined; const it = ITEM.get(m[1]); if (!it || it.source !== "shop") return undefined;
    return c.items[it.id] ?? null;
  }
  catalog(uid: string) {
    const c = this.config(), e = this.ent(uid), plus = this.isPlus(uid);
    return {
      plus: { active: plus, until: plus ? e.plusUntil : null, plan: plus ? e.plusPlan ?? null : null, cancelled: !!e.plusCancelled, monthly: c.plusMonthly, yearly: c.plusYearly, claimedThisMonth: e.claimedMonth === ym(this.now()),
        features: { rooms: plus ? null : c.freeRoomsPerDay, history: plus ? null : c.freeHistory, analysis: plus ? "all" : "last", ads: !plus } },
      items: ITEMS.map((i) => ({ ...i, owned: this.owns(uid, i.id), price: i.source === "shop" ? c.items[i.id] ?? null : null, equipped: e.equipped[i.kind as "pawn" | "frame" | "avatar"] === i.id })),
      equipped: e.equipped, paymentsReady: (this.d.providers ?? []).length > 0,
    };
  }
  /** Boshqa o'yinchilarga ko'rinadigan kosmetika (faqat egasi bo'lgan narsalar). */
  cosmetics(uid: string): { pawn?: string; frame?: string; avatar?: string } {
    const e = this.ents.get(uid); if (!e) return {}; const out: { pawn?: string; frame?: string; avatar?: string } = {};
    for (const k of ["pawn", "frame", "avatar"] as const) { const id = e.equipped[k]; if (id && this.owns(uid, id) && !(ITEM.get(id)!.source === "plus" && !this.isPlus(uid))) out[k] = ITEM.get(id)!.color; }
    return out;
  }

  // --- buyurtma ---
  async order(uid: string, sku: string, channel: "web" | "store", parentPhone?: unknown): Promise<{ ok: true; order: Order; parentRequired: boolean } | { ok: false; error: OrderErr }> {
    const price = this.priceOf(sku); if (price === undefined) return { ok: false, error: "bad_sku" };
    let title = ""; const m = /^item:(.+)$/.exec(sku);
    if (m) { const it = ITEM.get(m[1])!; if (!it.available) return { ok: false, error: "unavailable" }; if (this.owns(uid, it.id)) return { ok: false, error: "already_owned" }; title = it.name; }
    else title = sku === "plus:monthly" ? "POYGA Plus (oylik)" : "POYGA Plus (yillik)";
    if (price === null) return { ok: false, error: "price_unset" };
    if (sku.startsWith("plus:") && this.isPlus(uid) && (this.ent(uid).plusUntil! - this.now()) > 400 * DAY) return { ok: false, error: "plus_already_long" };
    if (!(this.d.providers ?? []).some((p) => p.channels.includes(channel))) return { ok: false, error: "payments_unavailable" };
    if (!this.d.phoneOk(uid)) return { ok: false, error: "phone_required" };
    const age = this.d.ageOf(uid); if (age === null) return { ok: false, error: "profile_required" };
    const o: Order = { id: randomBytes(10).toString("hex"), userId: uid, sku, title, amount: price, channel, status: "pending_payment", createdAt: this.now() };
    if (age < MINOR_PAY_AGE) {
      if (parentPhone === undefined || parentPhone === null || parentPhone === "") return { ok: false, error: "parent_phone_required" };
      if (!this.d.consents) return { ok: false, error: "sms_unavailable" };
      const r = await this.d.consents.request(uid, this.d.phoneHashOf(uid), "order", o.id, title, parentPhone, this.d.hashOf);
      if (!r.ok) return { ok: false, error: r.error };
      this.orders.set(o.id, { ...o, status: "pending_parent", consentId: r.request.id }); return { ok: true, order: this.orders.get(o.id)!, parentRequired: true };
    }
    this.orders.set(o.id, o); return this.startCheckout(o.id);
  }
  private async startCheckout(id: string): Promise<{ ok: true; order: Order; parentRequired: boolean } | { ok: false; error: OrderErr }> {
    const o = this.orders.get(id); if (!o) return { ok: false, error: "not_found" };
    const p = (this.d.providers ?? []).find((x) => x.channels.includes(o.channel)); if (!p) return { ok: false, error: "payments_unavailable" };
    const c = await p.checkout(o); const n = this.orders.set(id, { ...o, status: "pending_payment", ref: c.ref, checkout: c.url });
    return { ok: true, order: n, parentRequired: false };
  }
  /** Ota-ona qaroridan keyin (ota-ona sahifasi chaqiradi). */
  async onParentDecision(consentId: string, approved: boolean) {
    const o = this.orders.values().find((x) => x.consentId === consentId); if (!o || o.status !== "pending_parent") return;
    if (!approved) { this.orders.set(o.id, { ...o, status: "rejected" }); return; }
    await this.startCheckout(o.id);
  }
  orderOf(uid: string, id: string) { const o = this.orders.get(id); return o && o.userId === uid ? o : undefined; }
  ordersOf(uid: string) { return this.orders.values().filter((o) => o.userId === uid).sort((a, b) => b.createdAt - a.createdAt); }
  cancel(uid: string, id: string): { ok: true } | { ok: false; error: OrderErr } {
    const o = this.orderOf(uid, id); if (!o) return { ok: false, error: "not_found" };
    if (o.status !== "pending_parent" && o.status !== "pending_payment") return { ok: false, error: "not_pending" };
    if (o.consentId) this.d.consents?.cancel(o.consentId, uid);
    this.orders.set(id, { ...o, status: "cancelled" }); return { ok: true };
  }
  /** To'lov tasdig'i (provayder webhook'i yoki sinov): bir marta, summa mos kelsa. */
  confirmPaid(id: string, amount: number, ref?: string): { ok: true; order: Order } | { ok: false; error: OrderErr } {
    const o = this.orders.get(id); if (!o) return { ok: false, error: "not_found" };
    if (o.status === "paid") return { ok: true, order: o }; // takror xabar — ta'sirsiz
    if (o.status !== "pending_payment") return { ok: false, error: "not_pending" };
    if (amount !== o.amount) return { ok: false, error: "amount_mismatch" };
    const n = this.orders.set(id, { ...o, status: "paid", paidAt: this.now(), ref: ref ?? o.ref }); this.grant(n); return { ok: true, order: n };
  }
  private grant(o: Order) {
    const e = this.ent(o.userId);
    if (o.sku.startsWith("plus:")) { const plan = o.sku === "plus:yearly" ? "yearly" : "monthly"; const from = Math.max(this.now(), e.plusUntil ?? 0); this.ents.set(o.userId, { ...e, plusUntil: from + PLUS_DAYS[plan] * DAY, plusPlan: plan, plusCancelled: false }); }
    else { const id = o.sku.slice(5); if (!e.owned.includes(id)) this.ents.set(o.userId, { ...e, owned: [...e.owned, id] }); }
  }
  /** Xaridni tiklash: to'langan buyurtmalardan qayta hisoblanadi (obuna muddati ketma-ket uzaytiriladi). */
  restore(uid: string) {
    const paid = this.ordersOf(uid).filter((o) => o.status === "paid").sort((a, b) => (a.paidAt ?? 0) - (b.paidAt ?? 0));
    let until: number | null = null, plan: "monthly" | "yearly" | undefined; const owned = new Set<string>();
    for (const o of paid) { if (o.sku.startsWith("plus:")) { const p = o.sku === "plus:yearly" ? "yearly" : "monthly"; until = Math.max(o.paidAt!, until ?? 0) + PLUS_DAYS[p] * DAY; plan = p; } else owned.add(o.sku.slice(5)); }
    const e = this.ent(uid); this.ents.set(uid, { ...e, plusUntil: until, plusPlan: plan, owned: [...new Set([...e.owned.filter((x) => owned.has(x)), ...owned])] });
    return this.catalog(uid);
  }
  cancelPlus(uid: string) { const e = this.ent(uid); if (this.isPlus(uid)) this.ents.set(uid, { ...e, plusCancelled: true }); return this.catalog(uid); }

  equip(uid: string, id: string | null, kind: "pawn" | "frame" | "avatar"): { ok: true } | { ok: false; error: OrderErr } {
    const e = this.ent(uid);
    if (id === null) { const eq = { ...e.equipped }; delete eq[kind]; this.ents.set(uid, { ...e, equipped: eq }); return { ok: true }; }
    const it = ITEM.get(id); if (!it || it.kind !== kind) return { ok: false, error: "bad_item" };
    if (!this.owns(uid, id) && !(it.source === "plus" && this.isPlus(uid))) return { ok: false, error: "not_owned" };
    this.ents.set(uid, { ...e, equipped: { ...e.equipped, [kind]: id } }); return { ok: true };
  }
  /** Plus: har oy bitta fishka yoki ramka tanlanadi (Plus manbali elementlar). */
  claimMonthly(uid: string, id: string): { ok: true } | { ok: false; error: OrderErr } {
    if (!this.isPlus(uid)) return { ok: false, error: "not_plus" };
    const it = ITEM.get(id); if (!it || it.source !== "plus") return { ok: false, error: "bad_item" };
    const e = this.ent(uid); if (e.claimedMonth === ym(this.now())) return { ok: false, error: "already_claimed" };
    this.ents.set(uid, { ...e, claimedMonth: ym(this.now()), owned: e.owned.includes(id) ? e.owned : [...e.owned, id] }); return { ok: true };
  }

  // --- Plus imkoniyatlari (bepul tarifdagi chegaralar sozlanadi) ---
  canCreateRoom(uid: string): boolean {
    if (this.isPlus(uid)) return true; const lim = this.config().freeRoomsPerDay; if (lim === null) return true;
    const day = new Date(this.now()).toISOString().slice(0, 10); const c = this.createdToday.get(uid);
    return !c || c.day !== day || c.n < lim;
  }
  noteRoomCreated(uid: string) { const day = new Date(this.now()).toISOString().slice(0, 10); const c = this.createdToday.get(uid); this.createdToday.set(uid, c && c.day === day ? { day, n: c.n + 1 } : { day, n: 1 }); }
  historyLimit(uid: string): number | null { return this.isPlus(uid) ? null : this.config().freeHistory; }
  analysisAllowed(uid: string, isLatest: boolean) { return this.isPlus(uid) || isLatest; }
  erase(uid: string) { this.ents.delete(uid); for (const o of this.orders.values()) if (o.userId === uid) this.orders.delete(o.id); }
}
