// Sinov rejimi (administrator): istalgan hisobga paketlarni vaqtincha berish va qaytarib olish. Telefon raqami faqat so'rov ichida ishlatiladi: jurnalga yozilmaydi, saqlanmaydi.
import type { FastifyInstance } from "fastify";
import type { Guard } from "./admin";
import { normalizePhone } from "./auth";
import type { Commerce } from "./commerce";
import type { Edu } from "./edu";
import type { PhoneLinks } from "./phones";

export interface TestDeps { commerce: Commerce; edu: Edu; phones: PhoneLinks; nameOf: (id: string) => string | undefined; exists: (id: string) => boolean; now?: () => number }
const DAY = 86_400_000;
export const testToolsEnabled = () => process.env.ADMIN_TEST_TOOLS !== "0";

export function registerAdminTest(guard: Guard, app: FastifyInstance, d: TestDeps) {
  const now = d.now ?? Date.now; const { commerce, edu } = d;
  const view = (id: string) => {
    const e = commerce.ents.get(id), t = edu.teacherCtx(id);
    return { userId: id, name: d.nameOf(id) ?? null, plan: commerce.plan(id), plusUntil: e?.plusUntil ?? null, premiumUntil: e?.premiumUntil ?? null, coupons: e?.coupons ?? 0,
      org: t ? { id: t.org.id, name: t.org.name, until: t.org.licenseUntil, seats: t.org.seats, active: t.active, test: !!t.org.test } : null, testOrders: commerce.testGrants(id).length };
  };
  const off = () => !testToolsEnabled();
  app.post("/admin/test/lookup", guard("users.manage", (req) => {
    if (off()) return { error: "test_off" }; const b = (req.body ?? {}) as { phone?: unknown; userId?: unknown };
    let id: string | undefined;
    if (typeof b.userId === "string" && b.userId.trim()) id = b.userId.trim(); else { const ph = normalizePhone(b.phone); if (!ph) return { error: "bad_phone" }; id = d.phones.userOf(ph); }
    if (!id || !d.exists(id)) return { error: "no_user" };
    return { ok: true, user: view(id) };
  }, "test.lookup"));
  app.post("/admin/test/grant", guard("users.manage", (req, who) => {
    if (off()) return { error: "test_off" }; const b = (req.body ?? {}) as Record<string, unknown>; const id = String(b.userId ?? "");
    if (!d.exists(id)) return { error: "no_user" }; const days = b.days === 365 || b.days === "365" ? 365 : 30; const reason = String(b.reason).trim();
    const kind = String(b.kind);
    if (kind === "plus" || kind === "premium" || kind === "coupons" || kind === "full") commerce.grantTest(id, kind, days, who.id, reason);
    else if (kind === "org") {
      const seats = Number(b.seats ?? 100); if (!Number.isInteger(seats) || seats < 1 || seats > 10_000) return { error: "bad_seats" };
      const t = edu.teacherCtx(id), until = now() + days * DAY;
      if (t) edu.updateOrg(t.org.id, { licenseUntil: Math.max(t.org.licenseUntil, until), seats, active: true });
      else { const r = edu.createOrg(`TEST · ${d.nameOf(id) ?? id}`, until, seats); if (!r.ok) return { error: r.error }; edu.orgs.set(r.org.id, { ...r.org, test: true }); edu.teachers.set(id, { userId: id, orgId: r.org.id, addedAt: now() }); }
    } else return { error: "bad_kind" };
    if (kind === "full") { const t = edu.teacherCtx(id), until = now() + days * DAY; if (t) edu.updateOrg(t.org.id, { licenseUntil: Math.max(t.org.licenseUntil, until), active: true }); else { const r = edu.createOrg(`TEST · ${d.nameOf(id) ?? id}`, until, 100); if (r.ok) { edu.orgs.set(r.org.id, { ...r.org, test: true }); edu.teachers.set(id, { userId: id, orgId: r.org.id, addedAt: now() }); } } }
    return { ok: true, user: view(id) };
  }, "test.grant", { reason: true }));
  app.post("/admin/test/revoke", guard("users.manage", (req) => {
    if (off()) return { error: "test_off" }; const id = String((req.body as any)?.userId ?? ""); if (!d.exists(id)) return { error: "no_user" };
    const n = commerce.revokeTest(id, `test:qaytarildi`); const t = edu.teacherCtx(id); let org = false;
    if (t?.org.test) { edu.updateOrg(t.org.id, { active: false, licenseUntil: now() }); org = true; }
    return { ok: true, revoked: n, org, user: view(id) };
  }, "test.revoke", { reason: true }));
  app.get("/admin/test/list", guard("users.manage", () => {
    if (off()) return { error: "test_off" };
    const ids = new Set(commerce.testGrants().map((o) => o.userId)); for (const o of edu.orgs.values()) if (o.test && o.active) for (const t of edu.teachers.values()) if (t.orgId === o.id) ids.add(t.userId);
    return { enabled: true, users: [...ids].map(view) };
  }));
}
