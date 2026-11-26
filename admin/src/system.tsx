// Tizim: funksiya bayroqlari (texnik ishlar, maydon/sotuv/turnir to'xtatish). Keyingi bosqichda salomatlik ko'rsatkichlari qo'shiladi.
import React, { useState } from "react";
import type { Api } from "./api";
import { Banner, Empty, Err, FormDialog, PageHead, Pill, errText, useLoad } from "./lib";
import { t } from "./uz";
import { Log } from "./finance";
import { Health } from "./insight";

export function Flags({ api, canEdit }: { api: Api; canEdit: boolean }) {
  const f = useLoad<{ flags: any }>(api, "/admin/flags"); const [dlg, setDlg] = useState<null | { patch: Record<string, unknown>; title: string }>(null); const x = f.data?.flags;
  const rows: [string, string, string][] = [["maintenance", "Texnik ishlar rejimi", "Yangi maydon yaratish, qo'shilish, xarid va turnirga yozilish to'xtaydi; davom etayotgan o'yinlar tegilmaydi."], ["roomsPaused", "Yangi maydon yaratishni to'xtatish", "Mavjud maydonlar davom etadi."], ["salesPaused", "Sotuvni to'xtatish", "Plus va do'kon buyurtmalari yopiladi (to'lov muammosi bo'lganda)."], ["tournamentsPaused", "Turnir ro'yxatini to'xtatish", "Yangi ro'yxatdan o'tish yopiladi."]];
  return (<section className="card" aria-labelledby="fh"><h2 id="fh">Funksiya bayroqlari</h2><Err e={f.err} />{!x ? <Empty loading={f.loading} /> : (<>
    {x.maintenance && <Banner kind="warn">Texnik ishlar rejimi YOQILGAN{x.maintenanceText ? `: ${x.maintenanceText}` : ""}</Banner>}
    <p className="sub">Favqulodda tugmalar. Yoqishdan oldin sabab so'raladi; barcha o'zgarish auditga yoziladi. Ko'pchilik kalitlar odatda O'CHIQ turadi.</p>
    {rows.map(([k, label, note]) => <div className="attn" key={k}><div><b>{label}</b><div className="muted" style={{ fontSize: 13 }}>{note}</div></div>
      <label className={`sw${x[k] ? " warn" : ""}`}><input type="checkbox" role="switch" checked={!!x[k]} disabled={!canEdit} aria-label={label} onChange={() => setDlg({ title: `${label}: ${x[k] ? "o'chirish" : "yoqish"}`, patch: { [k]: !x[k] } })} /><i aria-hidden /><span>{x[k] ? "Yoqilgan" : "O'chiq"}</span></label></div>)}
    {canEdit && <div className="row" style={{ marginTop: 12 }}><button onClick={() => setDlg({ title: "Texnik ishlar xabari", patch: { maintenanceText: "" } })}>Xabar matnini o'zgartirish</button></div>}</>)}
    <FormDialog open={dlg !== null} danger title={dlg?.title ?? ""} fields={[...("maintenanceText" in (dlg?.patch ?? {}) ? [{ key: "maintenanceText", label: "Foydalanuvchilarga xabar", init: x?.maintenanceText ?? "" }] : []), { key: "reason", label: t.reason, required: true }]} onClose={() => setDlg(null)}
      onOk={async (v) => { const body: any = { ...dlg!.patch, reason: v.reason }; if ("maintenanceText" in body) body.maintenanceText = v.maintenanceText; const r = await api.post("/admin/flags", body); if (r.error) throw new Error(r.error); setDlg(null); f.reload(); }} />
  </section>);
}
/** SMS (Eskiz) tayyorligi: SMS orqali kirish haqiqiy foydalanuvchilar uchun ishlashi uchun nima yetishmasligini ko'rsatadi. Hech narsa yuborilmaydi. */
export function SmsReady({ api }: { api: Api }) {
  const l = useLoad<any>(api, "/admin/sms/status"); const d = l.data;
  const item = (ok: boolean, text: string, hint?: string) => <div className="attn" key={text}><div><b>{ok ? "✓" : "○"} {text}</b>{hint && !ok && <div className="muted" style={{ fontSize: 13 }}>{hint}</div>}</div><Pill kind={ok ? "good" : "warn"}>{ok ? "Tayyor" : "Kerak"}</Pill></div>;
  return (<section className="card" aria-labelledby="smsh"><h2 id="smsh">SMS orqali kirish (Eskiz)</h2><Err e={l.err} />{!d ? <Empty loading={l.loading} /> : d.kind !== "eskiz" ? <Banner kind="info">SMS provayder: {d.kind === "http" ? "HTTP shlyuz" : d.kind === "none" ? "ulanmagan" : "boshqa"}. Eskiz tayyorlik tekshiruvi faqat <code>SMS_PROVIDER=eskiz</code> bilan ishlaydi.</Banner> : (<>
    <Banner kind={d.ready ? "good" : "warn"}>{d.ready ? "Eskiz haqiqiy SMS yuborishga tayyor." : "Eskiz hali haqiqiy SMS uchun tayyor emas: pastdagi yetishmayotgan qadamlarni bajaring."}{d.error ? ` Xato: ${d.error}` : ""}</Banner>
    {item(!d.testFrom, `Jo'natuvchi nomi: ${d.from}`, "4546 — Eskiz sinov nomi. O'z nomingizni Eskiz'da tasdiqlating va ESKIZ_FROM ga yozing.")}
    {item(!!d.fromApproved, "Jo'natuvchi nomi Eskiz'da tasdiqlangan", `Tasdiqlangan nomlar: ${(d.nicks ?? []).join(", ") || "yo'q"}`)}
    {item(d.approvedTemplates > 0, `Tasdiqlangan shablonlar: ${d.approvedTemplates}`, "Eskiz kabinetida pastdagi shablon matnlarini yuboring va tasdiqlanishini kuting.")}
    {item((d.balance ?? 0) > 0, `Balans: ${d.balance ?? "—"}`, "Hisobni to'ldiring.")}
    <p className="sub">Sinov holatida Eskiz faqat quyidagi matnlarni yuboradi: {(d.testTexts ?? []).map((x: string) => `«${x}»`).join(", ")}. Haqiqiy matn uchun hisob faollashtirilgan bo'lishi kerak.</p>
    <details className="help"><summary><b>Tasdiqlatish uchun SMS shablonlari</b></summary><ul style={{ paddingLeft: 20, lineHeight: 1.6 }}>{(d.templates ?? []).map((x: any) => <li key={x.key}><b>{x.title}:</b> <code>{x.text}</code></li>)}</ul></details>
    {(d.eskizTemplates ?? []).length > 0 && <details className="help"><summary><b>Eskiz'dagi shablonlar ({d.eskizTemplates.length})</b></summary><ul style={{ paddingLeft: 20, lineHeight: 1.6 }}>{d.eskizTemplates.map((x: any) => <li key={x.id}>#{x.id} · <Pill kind={x.status === "service" || x.status === "reklama" ? "good" : x.status === "rejected" ? "bad" : "plain"}>{x.status}</Pill> {x.text}</li>)}</ul></details>}
  </>)}</section>);
}
export function System({ api, perms }: { api: Api; perms: string[] }) {
  return (<><PageHead title={t.system} />{perms.includes("system.read") && <Health api={api} />}{perms.includes("system.read") && <SmsReady api={api} />}{perms.includes("system.read") || perms.includes("flags.manage") ? <Flags api={api} canEdit={perms.includes("flags.manage")} /> : null}{perms.includes("system.read") && <Log api={api} />}</>);
}
void errText;
