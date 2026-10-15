import React, { useCallback, useEffect, useRef, useState } from "react";
import { Api, ApiError } from "./api";
import { t } from "./uz";
import { Banner, Confirm, Empty, Err, PageHead, Pill, errText, fmtDur, fmtTime, num, useLoad } from "./lib";

export function Journal({ api, code, onClose }: { api: Api; code: string; onClose: () => void }) {
  const l = useLoad<any[]>(api, `/admin/rooms/${code}/journal`);
  const label = (a: any) => (a.action?.type === "auto" ? `auto (${a.action.reason}): ${a.action.action?.type}` : a.action?.type);
  return (
    <section className="card" aria-labelledby="jh"><div className="page-h" style={{ marginBottom: 8 }}><h2 id="jh">{t.journal}: <span className="mono">{code}</span></h2><button onClick={onClose}>{t.close}</button></div>
      <Err e={l.err} />{!l.data?.length ? <Empty loading={l.loading} /> : <div className="tw" tabIndex={0} role="region" aria-label="Jadval" style={{ maxHeight: 420, overflowY: "auto" }}><table><thead><tr><th>№</th><th>Vaqt</th><th>Harakat</th><th>Kim</th></tr></thead><tbody>
        {l.data.slice(0, 300).map((e) => (<tr key={e.seq}><td className="num">{e.seq}</td><td className="muted">{fmtTime(e.at)}</td><td>{label(e)}</td><td className="mono">{e.action?.playerId ?? e.action?.action?.playerId ?? "server"}</td></tr>))}</tbody></table></div>}
      {l.data && l.data.length > 300 && <p className="muted">Birinchi 300 ta yozuv ko'rsatildi (jami {l.data.length}).</p>}</section>
  );
}

export function Analytics({ api }: { api: Api }) {
  const a = useLoad<any>(api, "/admin/analytics"); const f = useLoad<any>(api, "/admin/analytics/funnel");
  const d = a.data, fd = f.data;
  const tiles: [string, string][] = d ? [["Xonalar", d.rooms], ["Boshlangan o'yinlar", d.started], ["Tugagan o'yinlar", d.finished], ["Tugatilgan ulush", `${Math.round(d.finishedShare * 100)} %`], ["O'rtacha davomiylik", fmtDur(d.avgDurationSec)], ["O'rtacha aylana", d.avgRounds.toFixed(1)], ["Foydalanuvchilar", d.users]] : [];
  const steps: [string, number][] = fd ? [["Kirgan", fd.registered], ["Profil to'ldirgan", fd.withProfile], ["Birinchi o'yin", fd.playedFirstGame], ["3 va undan ko'p o'yin", fd.playedThreeOrMore], ["Kamida bir g'alaba", fd.wonAtLeastOnce]] : [];
  return (<>
    <PageHead title={t.analytics} />
    <section className="card" aria-labelledby="ah"><h2 id="ah">Umumiy ko'rsatkichlar</h2><Err e={a.err} />{!d ? <Empty loading={a.loading} /> : <div className="stats">{tiles.map(([k, v]) => <div className="stat" key={k}><b>{v}</b><span>{k}</span></div>)}</div>}</section>
    <section className="card" aria-labelledby="fh"><h2 id="fh">Voronka: kirishdan g'alabagacha</h2><Err e={f.err} />{!fd ? <Empty loading={f.loading} /> : <>
      <div className="tw" tabIndex={0} role="region" aria-label="Jadval"><table><thead><tr><th>Bosqich</th><th className="num">Soni</th><th>Kirganlardan</th></tr></thead><tbody>{steps.map(([k, v]) => { const pct = fd.registered ? Math.round((100 * v) / fd.registered) : 0; return (
        <tr key={k}><td>{k}</td><td className="num"><b>{v}</b></td><td style={{ minWidth: 180 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="bar" role="img" aria-label={`${pct} %`}><i style={{ width: `${pct}%` }} /></div><span style={{ width: 44 }}>{pct} %</span></div></td></tr>); })}</tbody></table></div>
      <p className="muted">Tugagan o'yinlar: {fd.gamesFinished} · g'olibli: {Math.round(fd.winShare * 100)} %</p></>}</section>
  </>);
}

export function Audit({ api }: { api: Api }) {
  const l = useLoad<any[]>(api, "/admin/audit");
  return (<>
    <PageHead title={t.audit}><button onClick={l.reload}>Yangilash</button></PageHead>
    <section className="card"><Err e={l.err} />{!l.data?.length ? <Empty loading={l.loading} /> : <div className="tw" tabIndex={0} role="region" aria-label="Jadval"><table><thead><tr><th>Vaqt</th><th>Admin</th><th>Rol</th><th>Amal</th><th>Obyekt</th><th>Tafsilot</th></tr></thead><tbody>{l.data.slice().reverse().map((a, i) => (
      <tr key={i}><td className="muted">{fmtTime(a.at)}</td><td className="mono">{a.admin}</td><td>{t.roles[a.role] ?? a.role}</td><td>{String(a.action).endsWith(":failed") ? <Pill kind="bad">{a.action}</Pill> : <b>{a.action}</b>}</td><td className="mono">{a.target ?? "—"}</td>
        <td className="mono" style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.detail ? JSON.stringify(a.detail) : ""}>{a.detail ? JSON.stringify(a.detail) : "—"}</td></tr>))}</tbody></table></div>}</section>
  </>);
}


