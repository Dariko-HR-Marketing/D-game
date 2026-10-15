import React, { useState } from "react";
import type { Api } from "./api";
import { Banner, Empty, Err, FormDialog, PageHead, Pill, Tabs, errText, fmtTime, useLoad } from "./lib";
import { t } from "./uz";

const ST: Record<string, [string, "info" | "warn" | "good" | "plain"]> = { new: ["Yangi", "warn"], in_progress: ["Ko'rib chiqilmoqda", "info"], resolved: ["Hal qilindi", "good"], rejected: ["Rad etildi", "plain"] };
export function Complaints({ api, me }: { api: Api; me: string }) {
  const [tab, setTab] = useState("new"); const l = useLoad<any[]>(api, `/admin/complaints?${tab === "mine" ? "mine=1" : tab === "all" ? "" : `status=${tab}`}`, [tab]);
  const [open, setOpen] = useState<any | null>(null); const [dlg, setDlg] = useState<"resolve" | "reject" | "note" | null>(null); const [err, setErr] = useState<string | null>(null);
  const post = async (path: string, body: object) => { setErr(null); try { const r = await api.post(path, body); if (r.error) throw new Error(r.error); l.reload(); } catch (e) { setErr(errText(e)); } };
  return (<>
    <PageHead title={t.complaints}><button onClick={l.reload}>Yangilash</button></PageHead>
    <Tabs label="Holat" active={tab} onChange={setTab} items={[["new", "Yangi"], ["in_progress", "Jarayonda"], ["mine", "Menga tayinlangan"], ["resolved", "Hal qilingan"], ["rejected", "Rad etilgan"], ["all", "Hammasi"]]} />
    <Err e={l.err || err} />
    <section className="card">{!l.data?.length ? <Empty loading={l.loading} /> : l.data.map((c) => (
      <article key={c.id} className="attn" style={{ alignItems: "flex-start" }} aria-label={`Shikoyat ${c.id}`}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 8, alignItems: "center" }}><b>#{c.id}</b><Pill kind={ST[c.status][1]}>{ST[c.status][0]}</Pill>{c.againstCount > 1 && <Pill kind="bad">unga {c.againstCount} ta shikoyat</Pill>}<span className="muted">{fmtTime(c.at)}</span>{c.assigneeName && <span className="muted">· {c.assigneeName}</span>}</div>
          <p style={{ margin: "6px 0" }}>{c.text}</p>
          <div className="muted" style={{ fontSize: 13 }}>Kimdan: {c.fromName ?? c.from} · Kimga: {c.against ? c.againstName ?? c.against : "—"}{c.room ? <> · xona <span className="mono">{c.room}</span></> : null}</div>
          {c.resolution && <p className="muted" style={{ margin: "6px 0 0" }}>Qaror: {c.resolution}</p>}
          {c.notes.map((n: any, i: number) => <p key={i} className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>📝 {n.text} <span className="mono">{fmtTime(n.at)}</span></p>)}
        </div>
        <div className="row" style={{ flexDirection: "column", alignItems: "stretch" }}>
          {c.status === "new" && <button className="sm p" onClick={() => post(`/admin/complaints/${c.id}/status`, { status: "in_progress", assignee: me })}>Men ko'raman</button>}
          {(c.status === "new" || c.status === "in_progress") && <><button className="sm" onClick={() => { setOpen(c); setDlg("resolve"); }}>Hal qilish</button><button className="sm" onClick={() => { setOpen(c); setDlg("reject"); }}>Rad etish</button></>}
          {(c.status === "resolved" || c.status === "rejected") && <button className="sm" onClick={() => post(`/admin/complaints/${c.id}/status`, { status: "in_progress" })}>Qayta ochish</button>}
          <button className="sm" onClick={() => { setOpen(c); setDlg("note"); }}>Izoh</button>
          {c.room && <span className="muted" style={{ fontSize: 12 }}>Jurnal: «Xonalar»</span>}
        </div>
      </article>))}</section>
    <FormDialog open={dlg === "resolve" || dlg === "reject"} title={dlg === "reject" ? "Shikoyatni rad etish" : "Shikoyatni hal qilish"} fields={[{ key: "resolution", label: "Qaror / izoh", type: "textarea", required: true }]} onClose={() => setDlg(null)} onOk={async (v) => { const r = await api.post(`/admin/complaints/${open.id}/status`, { status: dlg === "reject" ? "rejected" : "resolved", resolution: v.resolution }); if (r.error) throw new Error(r.error); setDlg(null); l.reload(); }} />
    <FormDialog open={dlg === "note"} title="Ichki izoh" body="Faqat adminlarga ko'rinadi." fields={[{ key: "text", label: "Izoh", type: "textarea", required: true }]} onClose={() => setDlg(null)} onOk={async (v) => { const r = await api.post(`/admin/complaints/${open.id}/note`, { text: v.text }); if (r.error) throw new Error(r.error); setDlg(null); l.reload(); }} />
    <Banner kind="info">Shikoyat qilingan foydalanuvchini bloklash yoki ismini almashtirish — «Foydalanuvchilar» bo'limidagi karta orqali.</Banner>
  </>);
}
