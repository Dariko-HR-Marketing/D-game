// Admin 3-bosqich: moliya (hisobot, buyurtmalar, qo'lda amallar, refund, katalog, to'lov provayderi), funksiya bayroqlari va sozlama tarixi.
import type { FastifyInstance } from "fastify";
import type { Guard } from "./admin";
import type { Commerce, Order } from "./commerce";
import { ITEMS } from "./commerce";
import { dayKey, lastDays, type Ops } from "./ops";
import type { ParentConsents } from "./parents";

export interface FinDeps { commerce: Commerce; ops: Ops; consents: ParentConsents; nameOf: (id: string) => string | undefined; registered: () => number; now?: () => number }
const DAY = 86_400_000;
const parseDay = (v: unknown, dflt: number, endOfDay = false) => { if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return dflt; const t = Date.parse(v + "T00:00:00+05:00"); return Number.isFinite(t) ? t + (endOfDay ? DAY - 1 : 0) : dflt; };

export function registerAdminFinance(guard: Guard, app: FastifyInstance, d: FinDeps) {
  const { commerce, ops } = d; const now = () => (d.now ?? Date.now)();
  const orderRow = (o: Order) => ({ id: o.id, userId: o.userId, user: d.nameOf(o.userId) ?? "—", sku: o.sku, title: o.title, amount: o.amount, status: o.status, channel: o.channel, createdAt: o.createdAt, paidAt: o.paidAt ?? null, refundedAt: o.refundedAt ?? null, ref: o.ref ?? null, note: o.note ?? null });

  app.get("/admin/finance/summary", guard("commerce.read", (req) => {
    const t = now(); const q = req.query as Record<string, string>; const to = parseDay(q.to, t, true), from = parseDay(q.from, to - 29 * DAY - (to % DAY));
    const all = commerce.orders.values(); const inRange = (x: number) => x >= from && x <= to;
    const paid = all.filter((o) => (o.status === "paid" || o.status === "refunded") && o.amount > 0 && inRange(o.paidAt ?? o.createdAt)), refunded = all.filter((o) => o.status === "refunded" && o.amount > 0 && inRange(o.refundedAt ?? o.createdAt));
    const sum = (a: Order[]) => a.reduce((n, o) => n + o.amount, 0);
    const n = Math.min(366, Math.max(1, Math.round((to - from) / DAY) + 1)); const days = Array.from({ length: n }, (_, i) => dayKey(to - (n - 1 - i) * DAY)); // oxirgi kun — `to` ning mahalliy sanasi
    const rev = Object.fromEntries(days.map((k) => [k, 0])); for (const o of paid) { const k = dayKey(o.paidAt ?? o.createdAt); if (k in rev) rev[k] += o.amount; }
    const by = (key: (o: Order) => string) => { const m = new Map<string, { n: number; sum: number }>(); for (const o of paid) { const k = key(o); const v = m.get(k) ?? { n: 0, sum: 0 }; v.n++; v.sum += o.amount; m.set(k, v); } return [...m].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.sum - a.sum); };
    const status: Record<string, number> = {}; for (const o of all.filter((x) => inRange(x.createdAt))) status[o.status] = (status[o.status] ?? 0) + 1;
    const cfg = commerce.config(); const ents = commerce.ents.values(); const active = ents.filter((e) => e.plusUntil && e.plusUntil > t);
    const mrr = active.reduce((n, e) => n + (e.plusPlan === "yearly" ? (cfg.plusYearly ?? 0) / 12 : (cfg.plusMonthly ?? 0)), 0);
    const expired30 = ents.filter((e) => e.plusUntil && e.plusUntil <= t && t - e.plusUntil < 30 * DAY).length;
    const payers = new Set(paid.map((o) => o.userId)).size; const registered = d.registered();
    return { from: dayKey(from), to: dayKey(to), revenue: sum(paid), orders: paid.length, refunds: { n: refunded.length, sum: sum(refunded) }, net: sum(paid) - sum(refunded), avgOrder: paid.length ? Math.round(sum(paid) / paid.length) : 0, payers, arppu: payers ? Math.round(sum(paid) / payers) : 0,
      conversion: registered ? payers / registered : 0, status, days, series: days.map((k) => rev[k]), bySku: by((o) => o.title.replace(/ — qo'lda$/, "")), byChannel: by((o) => o.channel),
      plus: { active: active.length, yearly: active.filter((e) => e.plusPlan === "yearly").length, cancelledPending: active.filter((e) => e.plusCancelled).length, expired30, mrr: Math.round(mrr), churn30: active.length + expired30 ? expired30 / (active.length + expired30) : 0 }, pricesSet: cfg.plusMonthly !== null && cfg.plusYearly !== null };
  }));
  app.get("/admin/finance/orders", guard("commerce.read", (req) => {
    const q = req.query as Record<string, string>; const s = (q.q ?? "").toLowerCase(); const off = Math.max(0, Number(q.offset) || 0), lim = Math.min(1000, Math.max(1, Number(q.limit) || 50));
    let rows = commerce.orders.values().sort((a, b) => b.createdAt - a.createdAt);
    if (q.status) rows = rows.filter((o) => o.status === q.status); if (q.channel) rows = rows.filter((o) => o.channel === q.channel); if (q.sku) rows = rows.filter((o) => o.sku.startsWith(q.sku));
    if (q.from) rows = rows.filter((o) => o.createdAt >= parseDay(q.from, 0)); if (q.to) rows = rows.filter((o) => o.createdAt <= parseDay(q.to, Infinity, true));
    if (s) rows = rows.filter((o) => o.id.startsWith(s) || o.userId.toLowerCase().includes(s) || (d.nameOf(o.userId) ?? "").toLowerCase().includes(s) || o.title.toLowerCase().includes(s));
    return { total: rows.length, orders: rows.slice(off, off + lim).map(orderRow) };
  }));
  app.get("/admin/finance/orders/:id", guard("commerce.read", (req) => {
    const o = commerce.orders.get(String((req.params as any).id)); if (!o) return { error: "not_found" };
    const c = o.consentId ? d.consents.get(o.consentId) : undefined;
    return { order: orderRow(o), consent: c ? { status: c.status, createdAt: c.createdAt, expiresAt: c.expiresAt } : null, events: ops.payevt.values().filter((e) => e.orderId === o.id).sort((a, b) => b.at - a.at), plusNow: commerce.isPlus(o.userId) };
  }));
  const manual = (act: "confirm" | "cancel" | "refund") => guard(act === "refund" ? "commerce.refund" : "commerce.manage", (req, who) => {
    const id = String((req.params as any).id); const reason = String((req.body as any).reason).trim();
    const r = act === "confirm" ? commerce.adminConfirm(id, who.id) : act === "cancel" ? commerce.adminCancel(id) : commerce.refund(id, reason);
    if (!r.ok) return { error: r.error }; ops.log(who.id, `order.${act}`, { id }, { reason }); return { ok: true };
  }, `order.${act}`, { reason: true });
  app.post("/admin/finance/orders/:id/confirm", manual("confirm")); app.post("/admin/finance/orders/:id/cancel", manual("cancel")); app.post("/admin/finance/orders/:id/refund", manual("refund"));
  app.get("/admin/finance/provider", guard("commerce.read", () => {
    const t = now(); const ev = ops.payevt.values().sort((a, b) => b.at - a.at); const day = ev.filter((e) => t - e.at < DAY);
    return { paymentsReady: commerce.catalog("_").paymentsReady, webhookEnabled: !!(process.env.PAYMENT_WEBHOOK_SECRET), last24h: { total: day.length, failed: day.filter((e) => !e.ok).length }, events: ev.slice(0, 50) };
  }));
  // katalog va narx tarixi
  app.get("/admin/shop/catalog", guard("commerce.read", () => { const c = commerce.config(); return { items: ITEMS.map((i) => ({ id: i.id, kind: i.kind, name: i.name, source: i.source, available: i.available, price: i.source === "shop" ? c.items[i.id] ?? null : null, hidden: (c.hidden ?? []).includes(i.id) })) }; }));
  app.post("/admin/shop/catalog/:id", guard("commerce.manage", (req, who) => {
    const id = String((req.params as any).id); if (!ITEMS.some((i) => i.id === id)) return { error: "not_found" }; const c = commerce.config(); const hidden = new Set(c.hidden ?? []); if ((req.body as any)?.hidden) hidden.add(id); else hidden.delete(id);
    const r = commerce.setConfig({ hidden: [...hidden] }); if (!r.ok) return { error: r.error }; ops.log(who.id, "catalog.hidden", c.hidden ?? [], [...hidden]); return { ok: true };
  }, "shop.catalog"));
  app.get("/admin/shop/config-log", guard(["commerce.read", "system.read"], () => ({ log: ops.cfglog.values().sort((a, b) => b.at - a.at).slice(0, 100).map((l) => ({ ...l, adminName: l.admin })) })));
  // funksiya bayroqlari
  app.get("/admin/flags", guard(["system.read", "flags.manage"], () => ({ flags: ops.flags() })));
  app.post("/admin/flags", guard("flags.manage", (req, who) => ({ flags: ops.setFlags((req.body ?? {}) as any, who.id) }), "flags.set", { reason: true }));
}
void lastDays;
