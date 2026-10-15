// Tizim: funksiya bayroqlari (texnik ishlar, xona/sotuv/turnir to'xtatish). Keyingi bosqichda salomatlik ko'rsatkichlari qo'shiladi.
import React, { useState } from "react";
import type { Api } from "./api";
import { Banner, Empty, Err, FormDialog, PageHead, Pill, errText, useLoad } from "./lib";
import { t } from "./uz";
import { Log } from "./finance";
import { Health } from "./insight";

export function Flags({ api, canEdit }: { api: Api; canEdit: boolean }) {
  const f = useLoad<{ flags: any }>(api, "/admin/flags"); const [dlg, setDlg] = useState<null | { patch: Record<string, unknown>; title: string }>(null); const x = f.data?.flags;
  const rows: [string, string, string][] = [["maintenance", "Texnik ishlar rejimi", "Yangi xona yaratish, qo'shilish, xarid va turnirga yozilish to'xtaydi; davom etayotgan o'yinlar tegilmaydi."], ["roomsPaused", "Yangi xona yaratishni to'xtatish", "Mavjud xonalar davom etadi."], ["salesPaused", "Sotuvni to'xtatish", "Plus va do'kon buyurtmalari yopiladi (to'lov muammosi bo'lganda)."], ["tournamentsPaused", "Turnir ro'yxatini to'xtatish", "Yangi ro'yxatdan o'tish yopiladi."]];
  return (<section className="card" aria-labelledby="fh"><h2 id="fh">Funksiya bayroqlari</h2><Err e={f.err} />{!x ? <Empty loading={f.loading} /> : (<>
    {x.maintenance && <Banner kind="warn">Texnik ishlar rejimi YOQILGAN{x.maintenanceText ? `: ${x.maintenanceText}` : ""}</Banner>}
    {rows.map(([k, label, note]) => <div className="attn" key={k}><div><b>{label}</b> <Pill kind={x[k] ? "bad" : "good"}>{x[k] ? "Yoqilgan" : "O'chiq"}</Pill><div className="muted" style={{ fontSize: 13 }}>{note}</div></div>
      {canEdit && <button className={x[k] ? "p" : "d"} onClick={() => setDlg({ title: `${label}: ${x[k] ? "o'chirish" : "yoqish"}`, patch: { [k]: !x[k] } })}>{x[k] ? "O'chirish" : "Yoqish"}</button>}</div>)}
    {canEdit && <div className="row" style={{ marginTop: 12 }}><button onClick={() => setDlg({ title: "Texnik ishlar xabari", patch: { maintenanceText: "" } })}>Xabar matnini o'zgartirish</button></div>}</>)}
    <FormDialog open={dlg !== null} danger title={dlg?.title ?? ""} fields={[...("maintenanceText" in (dlg?.patch ?? {}) ? [{ key: "maintenanceText", label: "Foydalanuvchilarga xabar", init: x?.maintenanceText ?? "" }] : []), { key: "reason", label: t.reason, required: true }]} onClose={() => setDlg(null)}
      onOk={async (v) => { const body: any = { ...dlg!.patch, reason: v.reason }; if ("maintenanceText" in body) body.maintenanceText = v.maintenanceText; const r = await api.post("/admin/flags", body); if (r.error) throw new Error(r.error); setDlg(null); f.reload(); }} />
  </section>);
}
export function System({ api, perms }: { api: Api; perms: string[] }) {
  return (<><PageHead title={t.system} />{perms.includes("system.read") && <Health api={api} />}{perms.includes("system.read") || perms.includes("flags.manage") ? <Flags api={api} canEdit={perms.includes("flags.manage")} /> : null}{perms.includes("system.read") && <Log api={api} />}</>);
}
void errText;
