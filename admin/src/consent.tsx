import React from "react";
import type { Api } from "./api";
import { Banner, Empty, Err, PageHead, Pill, Tile, fmtTime, useLoad } from "./lib";

type C = { version: string | null; enabled: boolean; accepted: number; olderVersion: number; totalUsers: number; notAccepted: number;
  byVersion: Record<string, number>; recent: { id: string; version: string; at: number }[];
  inventory: { source: string; field: string; purpose: string; basis: string; kept: string }[] };
export function Consent({ api }: { api: Api }) {
  const l = useLoad<C>(api, "/admin/consent"); const c = l.data;
  return (<>
    <PageHead title="Rozilik va ma'lumotlar" />
    <Err e={l.err} />
    {!c ? <Empty loading={l.loading} /> : <>
      <Banner kind={c.enabled ? "good" : "info"}>{c.enabled ? `Oferta ${c.version}-versiya majburiy: roziligi yo'q o'yinchi o'yin ocholmaydi va qo'shila olmaydi.` : "Oferta roziligi o'chiq. Yuridik ekspertizadan so'ng serverda OFFER_VERSION o'rnatilsa yoqiladi. Ochiq oferta: /oferta.html, maxfiylik: /maxfiylik.html."}</Banner>
      <section className="card"><h2>Rozilik holati</h2><div className="stats">
        <Tile l="Rozilik bergan" v={c.accepted} hint="Joriy oferta versiyasini qabul qilgan hisoblar." />
        <Tile l="Rozilik bermagan" v={c.notAccepted} hint="Hali joriy versiyani qabul qilmaganlar (eski versiya ham shu yerda)." />
        <Tile l="Eski versiyada" v={c.olderVersion} hint="Oldingi versiyani qabul qilgan, yangisini hali qabul qilmaganlar." />
        <Tile l="Jami hisoblar" v={c.totalUsers} />
      </div>
      {Object.keys(c.byVersion).length > 0 && <div className="sub">Versiyalar bo'yicha: {Object.entries(c.byVersion).map(([v, n]) => <Pill key={v} kind={v === c.version ? "good" : "plain"}>{v}: {n}</Pill>)}</div>}</section>
      <section className="card"><h2>Oxirgi rozilik berganlar</h2>
        {!c.recent.length ? <Empty loading={false} /> : <div className="tw" tabIndex={0} role="region" aria-label="Oxirgi roziliklar"><table><thead><tr><th>Hisob</th><th>Versiya</th><th>Qachon</th></tr></thead><tbody>
          {c.recent.map((r) => <tr key={r.id}><td className="mono">{r.id}</td><td>{r.version}</td><td>{fmtTime(r.at)}</td></tr>)}</tbody></table></div>}
      </section>
      <section className="card"><h2>Qayta ishlanadigan ma'lumotlar reyestri</h2>
        <div className="sub">Oferta va maxfiylik siyosati shu ro'yxatga mos bo'lishi shart. Yangi ma'lumot turi qo'shilsa, avval shu ro'yxat va oferta yangilanadi.</div>
        <div className="tw" tabIndex={0} role="region" aria-label="Ma'lumotlar reyestri"><table><thead><tr><th>Manba</th><th>Ma'lumot</th><th>Maqsad</th><th>Asos</th><th>Saqlash</th></tr></thead><tbody>
          {c.inventory.map((r, i) => <tr key={i}><td>{r.source}</td><td>{r.field}</td><td>{r.purpose}</td><td>{r.basis}</td><td>{r.kept}</td></tr>)}</tbody></table></div>
      </section>
    </>}
  </>);
}
