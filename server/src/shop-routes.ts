// Do'kon, Plus, telefon tasdig'i va ota-ona sahifasi marshrutlari.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { normalizePhone, type OtpService } from "./auth";
import type { Commerce } from "./commerce";
import type { ParentConsents } from "./parents";
import { parentPage } from "./parents";
import type { PhoneLinks } from "./phones";
import { KeyedLimiter } from "./ratelimit";

export interface ShopDeps {
  app: FastifyInstance; commerce: Commerce; phones: PhoneLinks; consents: ParentConsents; otp?: OtpService; dev: boolean; webhookSecret?: string; devPay: boolean; onTournamentConsent?: (consentId: string, approved: boolean) => void;
  secured: (h: (uid: string, req: any, reply: any) => unknown) => (req: any, reply: any) => unknown;
  ageOf: (uid: string) => number | null; nameOf: (uid: string) => string | undefined; limited: (scope: string) => void;
}
const STATUS: Record<string, number> = { price_unset: 409, unavailable: 409, already_owned: 409, phone_required: 403, profile_required: 409, parent_phone_required: 400, payments_unavailable: 503, bad_phone: 400, same_phone: 400, rate_limited: 429, sms_failed: 502, sms_unavailable: 503, not_found: 404, not_pending: 409, bad_sku: 400, bad_item: 400, not_owned: 403, not_plus: 403, already_claimed: 409, amount_mismatch: 400, plus_already_long: 409 };
const fail = (reply: any, error: string) => reply.code(STATUS[error] ?? 400).send({ error });

export function registerShop(d: ShopDeps) {
  const { app, commerce, phones, consents } = d;
  const orderLimit = new KeyedLimiter(10 / 60, 6), phoneLimit = new KeyedLimiter(1 / 30, 5);
  const pub = (o: any) => ({ id: o.id, sku: o.sku, title: o.title, amount: o.amount, status: o.status, channel: o.channel, createdAt: o.createdAt, paidAt: o.paidAt, checkout: o.status === "pending_payment" ? o.checkout : undefined });

  app.get("/shop", d.secured((uid) => ({ ...commerce.catalog(uid), currency: "so'm", orders: commerce.ordersOf(uid).slice(0, 20).map(pub) })));
  app.post("/shop/order", d.secured(async (uid, req, reply) => {
    if (!orderLimit.allow(uid)) { d.limited("order"); return fail(reply, "rate_limited"); }
    const b = (req.body ?? {}) as { sku?: unknown; channel?: unknown; parentPhone?: unknown };
    if (typeof b.sku !== "string" || b.sku.length > 64) return fail(reply, "bad_sku");
    const r = await commerce.order(uid, b.sku, b.channel === "store" ? "store" : "web", b.parentPhone);
    return r.ok ? { order: pub(r.order), parentRequired: r.parentRequired } : fail(reply, r.error);
  }));
  app.get("/shop/orders", d.secured((uid) => ({ orders: commerce.ordersOf(uid).map(pub) })));
  app.get("/shop/orders/:id", d.secured((uid, req, reply) => { const o = commerce.orderOf(uid, String(req.params.id)); return o ? { order: pub(o), consent: o.consentId ? { status: consents.get(o.consentId)?.status ?? "expired" } : null } : fail(reply, "not_found"); }));
  app.post("/shop/orders/:id/cancel", d.secured((uid, req, reply) => { const r = commerce.cancel(uid, String(req.params.id)); return r.ok ? { ok: true } : fail(reply, r.error); }));
  app.post("/shop/orders/:id/resend", d.secured(async (uid, req, reply) => {
    const o = commerce.orderOf(uid, String(req.params.id)); if (!o?.consentId || o.status !== "pending_parent") return fail(reply, "not_pending");
    const r = await consents.resend(o.consentId); return r.ok ? { ok: true } : fail(reply, r.error ?? "sms_failed");
  }));
  app.post("/shop/equip", d.secured((uid, req, reply) => {
    const b = (req.body ?? {}) as { itemId?: unknown; kind?: unknown };
    const kind = b.kind === "pawn" || b.kind === "frame" || b.kind === "avatar" ? b.kind : null; if (!kind) return fail(reply, "bad_item");
    const r = commerce.equip(uid, b.itemId === null ? null : typeof b.itemId === "string" ? b.itemId : "", kind); return r.ok ? commerce.catalog(uid) : fail(reply, r.error);
  }));
  app.post("/shop/plus/claim", d.secured((uid, req, reply) => { const r = commerce.claimMonthly(uid, String((req.body as any)?.itemId ?? "")); return r.ok ? commerce.catalog(uid) : fail(reply, r.error); }));
  app.post("/shop/plus/cancel", d.secured((uid) => commerce.cancelPlus(uid)));
  app.post("/shop/restore", d.secured((uid) => commerce.restore(uid)));

  // To'lov provayderi xabari: umumiy imzolangan tasdiq (haqiqiy provayder adapterlari shu orqali yoki o'z marshrutida `commerce.confirmPaid` ni chaqiradi).
  app.post("/pay/confirm", async (req, reply) => {
    if (!d.webhookSecret) return reply.code(404).send({ error: "not_enabled" });
    const raw = JSON.stringify(req.body ?? {}); const given = String(req.headers["x-signature"] ?? "");
    const want = createHmac("sha256", d.webhookSecret).update(raw).digest("hex");
    const a = Buffer.from(given), b = Buffer.from(want); if (a.length !== b.length || !timingSafeEqual(a, b)) return reply.code(401).send({ error: "bad_signature" });
    const x = req.body as { orderId?: unknown; amount?: unknown; ref?: unknown };
    const r = commerce.confirmPaid(String(x.orderId ?? ""), Number(x.amount), typeof x.ref === "string" ? x.ref : undefined); return r.ok ? { ok: true } : fail(reply, r.error);
  });
  if (d.devPay) app.post("/dev/pay/:id", d.secured((uid, req, reply) => { // faqat sinov rejimi
    const o = commerce.orderOf(uid, String(req.params.id)); if (!o) return fail(reply, "not_found");
    const r = commerce.confirmPaid(o.id, o.amount); return r.ok ? { order: pub(r.order) } : fail(reply, r.error);
  }));

  // --- telefon tasdig'i ---
  app.get("/me/account", d.secured((uid) => {
    const age = d.ageOf(uid);
    return { phoneVerified: d.dev || phones.isVerified(uid), smsAvailable: !!d.otp, age, parentRequired: age !== null && age < 18, plus: commerce.isPlus(uid), historyLimit: commerce.historyLimit(uid), parentControls: consents.controlsOf(uid) ?? null };
  }));
  app.post("/me/phone/request", d.secured(async (uid, req, reply) => {
    if (!d.otp) return reply.code(404).send({ error: "not_enabled" });
    if (!phoneLimit.allow(uid)) { d.limited("phone"); return fail(reply, "rate_limited"); }
    const phone = normalizePhone((req.body as any)?.phone); if (!phone) return fail(reply, "bad_phone");
    const r = await d.otp.request(phone); return r.ok ? { ok: true } : reply.code(r.error === "rate_limited" ? 429 : 502).send({ error: r.error });
  }));
  app.post("/me/phone/verify", d.secured((uid, req, reply) => {
    if (!d.otp) return reply.code(404).send({ error: "not_enabled" });
    if (!phoneLimit.allow(uid)) { d.limited("phone"); return fail(reply, "rate_limited"); }
    const phone = normalizePhone((req.body as any)?.phone); if (!phone) return fail(reply, "bad_phone");
    const v = d.otp.verify(phone, (req.body as any)?.code); if (!v.ok) return reply.code(401).send({ error: v.error });
    const l = phones.link(uid, phone); return l.ok ? { ok: true } : reply.code(409).send({ error: l.error });
  }));

  // --- ota-ona sahifasi (SMS havolasi; tokenning o'zi kalit) ---
  const ct = (reply: any) => reply.header("content-type", "text/html; charset=utf-8").header("cache-control", "no-store").header("referrer-policy", "no-referrer").header("x-frame-options", "DENY");
  app.get("/parent/:token", async (req, reply) => { const t = String((req.params as any).token); const r = consents.byToken(t); return ct(reply).send(parentPage(t, r, r ? d.nameOf(r.childId) ?? "O'yinchi" : "")); });
  app.post("/parent/:token", async (req, reply) => {
    const t = String((req.params as any).token); const b = (req.body ?? {}) as Record<string, unknown>;
    const approve = b.decision === "approve";
    const ctl = approve || b.decision === "reject" ? { loans: b.loans !== "off", chat: b.chat !== "off", friendsOnly: b.friendsOnly === "on" } : undefined;
    const r = consents.decide(t, approve, ctl);
    if (!r.ok) { const old = consents.byToken(t); return ct(reply).send(parentPage(t, old, old ? d.nameOf(old.childId) ?? "O'yinchi" : "")); }
    if (r.request.kind === "order") await commerce.onParentDecision(r.request.id, approve);
    else d.onTournamentConsent?.(r.request.id, approve);
    return ct(reply).send(parentPage(t, r.request, d.nameOf(r.request.childId) ?? "O'yinchi", approve ? (r.request.kind === "order" ? "Rahmat! Farzandingiz xaridni davom ettira oladi." : "Rahmat! Farzandingiz turnirda ishtirok eta oladi.") : "Rad etildi. Hech narsa yechilmaydi."));
  });
}
