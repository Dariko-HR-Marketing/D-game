// Ota-ona roziligi (18 yoshgacha to'lov; 16 yoshgacha turnir) va ota-ona nazorati. Ota-onaga SMS orqali imzolangan havola boradi;
// ota-ona sahifasi (server tomonida chiziladigan oddiy HTML) tasdiqlaydi yoki rad etadi. Ota-ona raqami faqat qarorgacha (qayta yuborish uchun) saqlanadi.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Collection, type DocStore } from "./docs";
import { WriteQueue } from "./persist";
import { normalizePhone, type SmsSender } from "./auth";

export type ConsentKind = "order" | "tournament";
export interface ConsentRequest { id: string; childId: string; kind: ConsentKind; ref: string; title: string; parentHash: string; parentPhone: string | null; status: "pending" | "approved" | "rejected" | "cancelled" | "expired"; createdAt: number; expiresAt: number; decidedAt?: number }
export interface ParentControls { childId: string; loans: boolean; chat: boolean; friendsOnly: boolean; updatedAt: number }
export const CONSENT_TTL_MS = 3 * 86_400_000;
const b64 = (b: Buffer) => b.toString("base64url");

export class ParentConsents {
  readonly reqs: Collection<ConsentRequest>; readonly controls: Collection<ParentControls>;
  readonly queue = new WriteQueue();
  private sentAt = new Map<string, number[]>();
  constructor(private secret: string, private sms: SmsSender | undefined, private baseUrl: string, store?: DocStore, private now: () => number = Date.now) {
    this.reqs = new Collection("consent", store, this.queue); this.controls = new Collection("parentctl", store, this.queue);
  }
  async load() { await this.reqs.load(); await this.controls.load(); return this; }
  private sig(d: string) { return b64(createHmac("sha256", this.secret).update("parent:" + d).digest()); }
  tokenOf(id: string, exp: number) { const p = `v1.${id}.${exp}`; return `${p}.${this.sig(p)}`; }
  private parse(token: string): ConsentRequest | null {
    const parts = String(token).split("."); if (parts.length !== 4 || parts[0] !== "v1") return null;
    const p = parts.slice(0, 3).join("."), a = Buffer.from(parts[3]), b = Buffer.from(this.sig(p));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const r = this.reqs.get(parts[1]); return r && r.expiresAt === Number(parts[2]) ? r : null;
  }
  /** Muddati o'tganlarni belgilaydi va ota-ona raqamini o'chiradi. */
  private fresh(r: ConsentRequest): ConsentRequest {
    if (r.status === "pending" && r.expiresAt <= this.now()) return this.reqs.set(r.id, { ...r, status: "expired", parentPhone: null });
    return r;
  }
  get(id: string) { const r = this.reqs.get(id); return r ? this.fresh(r) : undefined; }
  /** Yangi so'rov: bitta bola — kuniga ko'pi bilan 5 ta SMS; ota-ona raqami bolaning o'zi bilan bir xil bo'lmasin. */
  async request(childId: string, childPhoneHash: string | undefined, kind: ConsentKind, ref: string, title: string, parentPhoneRaw: unknown, hashOf: (p: string) => string): Promise<{ ok: true; request: ConsentRequest } | { ok: false; error: "bad_phone" | "same_phone" | "rate_limited" | "sms_failed" | "sms_unavailable" }> {
    const phone = normalizePhone(parentPhoneRaw); if (!phone) return { ok: false, error: "bad_phone" };
    const ph = hashOf(phone); if (childPhoneHash && ph === childPhoneHash) return { ok: false, error: "same_phone" };
    if (!this.sms) return { ok: false, error: "sms_unavailable" };
    const t = this.now(); const hist = (this.sentAt.get(childId) ?? []).filter((x) => t - x < 86_400_000);
    if (hist.length >= 5) return { ok: false, error: "rate_limited" };
    hist.push(t); this.sentAt.set(childId, hist);
    const id = randomBytes(12).toString("hex"); const r: ConsentRequest = { id, childId, kind, ref, title, parentHash: ph, parentPhone: phone, status: "pending", createdAt: t, expiresAt: t + CONSENT_TTL_MS };
    this.reqs.set(id, r);
    try { await this.sms.send(phone, `POYGA: farzandingiz "${title}" uchun ruxsat so'radi. Ko'rish va javob berish: ${this.baseUrl}/parent/${this.tokenOf(id, r.expiresAt)}`); } catch { this.reqs.set(id, { ...r, status: "cancelled", parentPhone: null }); return { ok: false, error: "sms_failed" }; }
    return { ok: true, request: r };
  }
  async resend(id: string): Promise<{ ok: boolean; error?: string }> {
    const r = this.get(id); if (!r || r.status !== "pending" || !r.parentPhone || !this.sms) return { ok: false, error: "not_pending" };
    const t = this.now(); const hist = (this.sentAt.get(r.childId) ?? []).filter((x) => t - x < 86_400_000); if (hist.length >= 5) return { ok: false, error: "rate_limited" };
    hist.push(t); this.sentAt.set(r.childId, hist);
    try { await this.sms.send(r.parentPhone, `POYGA: farzandingiz "${r.title}" uchun ruxsat so'radi. Ko'rish va javob berish: ${this.baseUrl}/parent/${this.tokenOf(r.id, r.expiresAt)}`); return { ok: true }; } catch { return { ok: false, error: "sms_failed" }; }
  }
  cancel(id: string, childId: string) { const r = this.get(id); if (r && r.childId === childId && r.status === "pending") this.reqs.set(id, { ...r, status: "cancelled", parentPhone: null }); }
  byToken(token: string): ConsentRequest | null { const r = this.parse(token); return r ? this.fresh(r) : null; }
  /** Ota-ona qarori. Faqat kutilayotgan so'rov; ikkinchi marta o'zgartirib bo'lmaydi. Nazorat sozlamalari (ixtiyoriy) bolaga saqlanadi. */
  decide(token: string, approved: boolean, ctl?: { loans?: boolean; chat?: boolean; friendsOnly?: boolean }): { ok: true; request: ConsentRequest } | { ok: false; error: "bad_token" | "not_pending" } {
    const r0 = this.byToken(token); if (!r0) return { ok: false, error: "bad_token" };
    if (r0.status !== "pending") return { ok: false, error: "not_pending" };
    const r = this.reqs.set(r0.id, { ...r0, status: approved ? "approved" : "rejected", decidedAt: this.now(), parentPhone: null });
    if (ctl) this.controls.set(r.childId, { childId: r.childId, loans: ctl.loans !== false, chat: ctl.chat !== false, friendsOnly: ctl.friendsOnly === true, updatedAt: this.now() });
    return { ok: true, request: r };
  }
  controlsOf(childId: string): ParentControls | undefined { return this.controls.get(childId); }
  /** Ota-ona o'zaro qarz va sherikliklarni o'chirgan bolalar. */
  loansBlocked(ids: string[]) { return ids.filter((id) => this.controls.get(id)?.loans === false); }
  /** Ota-ona erkin chatni o'chirgan bolalar (faqat tayyor iboralar). */
  chatBlocked(ids: string[]) { return ids.filter((id) => this.controls.get(id)?.chat === false); }
  approvedFor(childId: string, kind: ConsentKind, ref: string) { return this.reqs.values().some((r) => r.childId === childId && r.kind === kind && r.ref === ref && r.status === "approved"); }
  erase(childId: string) { for (const r of this.reqs.values()) if (r.childId === childId) this.reqs.delete(r.id); this.controls.delete(childId); }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const page = (body: string) => `<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>POYGA · ota-ona sahifasi</title><style>
body{margin:0;font-family:Manrope,system-ui,sans-serif;background:#F4F7F8;color:#082238}main{max-width:520px;margin:0 auto;padding:20px;display:flex;flex-direction:column;gap:14px}
h1{font-size:24px;margin:8px 0 0}.card{background:#fff;border:1px solid #E6ECEF;border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px}.muted{color:#4A5B6C;font-size:14px;line-height:1.5}
label{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.4;min-height:44px}input[type=checkbox]{width:20px;height:20px;margin-top:2px}
.row{display:flex;gap:10px}button{flex:1;min-height:52px;border-radius:12px;font-size:16px;font-weight:700;border:1px solid #D5DEE4;background:#fff;color:#082238;cursor:pointer}button.go{background:#11835A;color:#fff;border:0}</style></head><body><main>${body}</main></body></html>`;
/** Ota-ona sahifasi (maket N49). */
export function parentPage(token: string, r: ConsentRequest | null, childName: string, note?: string): string {
  if (!r) return page(`<h1>Havola yaroqsiz</h1><p class="muted">Havola noto'g'ri yoki muddati o'tgan. Farzandingizdan yangi so'rov yuborishini so'rang.</p>`);
  if (r.status !== "pending") return page(`<h1>${r.status === "approved" ? "Tasdiqlandi" : r.status === "rejected" ? "Rad etildi" : "So'rov yopilgan"}</h1><p class="muted">${note ? esc(note) : "Bu so'rov bo'yicha qaror qabul qilingan. Rahmat."}</p>`);
  return page(`<h1>Farzandingiz so'rov yubordi</h1><div class="card"><b>${esc(childName)}</b><span class="muted">«${esc(r.title)}» uchun ruxsat so'radi.</span>
<span class="muted">Plus va do'kon xaridlari o'yin natijasiga ta'sir qilmaydi. Narx va davr to'lov oynasida ko'rsatiladi. To'lov faqat siz tasdiqlagandan keyin amalga oshadi; tasdiqlamasangiz hech narsa yechilmaydi.</span></div>
<form method="post" action="/parent/${esc(token)}"><div class="card"><b>Ota-ona nazorati (ixtiyoriy)</b>
<label><input type="checkbox" name="loans" value="off"> O'zaro qarz va sheriklikni o'chirish</label>
<label><input type="checkbox" name="chat" value="off"> Erkin chatni o'chirish (faqat tayyor iboralar)</label>
<label><input type="checkbox" name="friendsOnly" value="on"> Faqat do'stlar bilan o'ynash</label></div>
<div class="row"><button name="decision" value="reject" type="submit">Rad etish</button><button class="go" name="decision" value="approve" type="submit">Tasdiqlash</button></div></form>`);
}
