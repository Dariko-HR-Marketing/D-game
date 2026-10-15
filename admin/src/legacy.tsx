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

