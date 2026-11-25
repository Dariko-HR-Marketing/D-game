import React, { useEffect } from "react";
import type { Api } from "./api";
import { Empty, Err, PageHead, Pill, useLoad } from "./lib";

const seat = (n: string | undefined, online: boolean, bot: boolean) => <span key={n} title={bot ? "Bot" : online ? "Onlayn" : "Aloqa uzilgan"} style={{ width: 34, height: 34, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, marginLeft: -6, border: "2px solid #fff", boxShadow: "0 0 0 1px var(--line)", color: bot ? "var(--t2)" : "#fff", background: bot ? "#fff" : online ? "var(--green)" : "#9AA8B4", borderStyle: bot ? "dashed" : "solid" }}>{bot ? "B" : (n ?? "?").slice(0, 2).toUpperCase()}</span>;

export function Live({ api }: { api: Api }) {
  const r = useLoad<any[]>(api, "/admin/rooms"); const rs = (r.data ?? []).filter((x) => !x.ended);
  useEffect(() => { const h = setInterval(r.reload, 5000); return () => clearInterval(h); }, [r.reload]);
  const people = rs.flatMap((x) => (Array.isArray(x.members) ? x.members : [])).filter((m) => !m.bot);
  const playing = rs.filter((x) => x.started), lobby = rs.filter((x) => !x.started);
  return (<>
    <PageHead title="Jonli kuzatuv"><span className="pill good" role="status">Jonli · 5 soniya</span><button onClick={r.reload}>Yangilash</button></PageHead>
    <p className="muted" style={{ marginTop: -8 }}>Ayni daqiqada kim o'ynayapti, kim kutayapti.</p>
    <Err e={r.err} />
    <section className="card"><div className="stats">
      <div className="stat"><span>Onlayn</span><b>{people.filter((m) => m.online).length}</b></div><div className="stat"><span>O'yinda</span><b>{playing.length}</b><small className="muted">maydon</small></div>
      <div className="stat"><span>Kutish zalida</span><b>{lobby.length}</b><small className="muted">maydon</small></div><div className="stat"><span>Aloqasi uzilgan</span><b style={{ color: people.some((m) => !m.online) ? "var(--warn)" : undefined }}>{people.filter((m) => !m.online).length}</b></div></div></section>
    {!r.data ? <Empty loading={r.loading} /> : !rs.length ? <section className="card"><p className="muted" style={{ margin: 0 }}>Hozir faol maydon yo'q. O'yinchilar maydon ochganda bu yerda ko'rinadi.</p></section> :
      <div className="grid2">{rs.map((x) => <article key={x.code} className="card" style={{ marginBottom: 0 }}>
        <div className="row" style={{ alignItems: "center" }}><b style={{ fontSize: 17 }}>{x.code}</b>{x.started ? <Pill kind="good">O'yinda{x.round ? ` · ${x.round}-tur` : ""}</Pill> : <Pill kind="info">Kutish zali</Pill>}{x.tag && <Pill kind="plain">{x.tag.kind === "class" ? "Sinf" : "Turnir"}</Pill>}</div>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 6px 4px" }}>{Array.isArray(x.members) ? x.members.map((m: any) => seat(m.name ?? m.userId, m.online, m.bot)) : <span className="muted">{x.members} o'yinchi</span>}</div>
        <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>{Array.isArray(x.members) && x.members.some((m: any) => !m.bot && !m.online) ? "Kimdir aloqasi uzilgan — qaytishini kutmoqda. " : ""}Boshlangan: {new Date(x.createdAt).toLocaleTimeString("uz", { timeStyle: "short" })}</p></article>)}</div>}
    <p className="muted" style={{ fontSize: 12 }}>Batafsil jurnal va qayta o'ynatish — «Maydonlar» bo'limida.</p>
  </>);
}
