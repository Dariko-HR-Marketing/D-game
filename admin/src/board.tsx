import React, { useMemo, useState } from "react";
import type { Api } from "./api";
import { Empty, Err, PageHead, Pill, money, useLoad } from "./lib";

/** Orzular: ro'yxat va tanlangan orzu tafsiloti (o'qish; tahrir — «Kontent» bo'limida versiya orqali). */
export function Dreams({ api }: { api: Api }) {
  const l = useLoad<{ data: any[] }>(api, "/admin/content/dreams"); const [sector, setSector] = useState(""); const [sel, setSel] = useState(0);
  const all = l.data?.data ?? []; const sectors = useMemo(() => [...new Set(all.map((d) => d.sector))], [all]);
  const rows = all.filter((d) => !sector || d.sector === sector); const cur = rows[Math.min(sel, rows.length - 1)];
  return (<>
    <PageHead title={`Orzular${all.length ? ` · ${all.length}` : ""}`} /><p className="muted" style={{ marginTop: -8 }}>Narxi, sohasi va g'alabaga yo'li. Tahrirlash — «Kontent» bo'limida (versiya + ko'rib chiqish).</p>
    <Err e={l.err} />{!l.data ? <Empty loading={l.loading} /> : (<>
      <div className="tabs" role="group" aria-label="Soha"><button className={!sector ? "on" : ""} aria-pressed={!sector} onClick={() => { setSector(""); setSel(0); }}>Hammasi · {all.length}</button>{sectors.map((s) => <button key={s} className={sector === s ? "on" : ""} aria-pressed={sector === s} onClick={() => { setSector(s); setSel(0); }}>{s}</button>)}</div>
      <div className="grid2" style={{ gridTemplateColumns: "minmax(320px,1fr) minmax(320px,1fr)" }}>
        <section className="card"><div className="stack">{rows.map((d, i) => <button key={d.code} aria-pressed={cur?.code === d.code} onClick={() => setSel(i)} style={{ display: "flex", justifyContent: "space-between", gap: 12, textAlign: "left", minHeight: 52, borderColor: cur?.code === d.code ? "var(--green)" : undefined }}><span><b>{d.name}</b><br /><span className="muted" style={{ fontSize: 12 }}>{d.code} · {d.sector}</span></span><b>{money(d.price)}</b></button>)}</div></section>
        {cur && <section className="card" aria-label="Tanlangan orzu"><h2>{cur.name}</h2><p className="muted">{cur.code} · {cur.sector}{cur.horizon ? ` · ${cur.horizon}` : ""}</p><p>{cur.text}</p>
          <dl className="kv"><dt>Narxi</dt><dd><b>{money(cur.price)}</b></dd><dt>Soha</dt><dd>{cur.sector}</dd></dl>
          <h3 style={{ margin: "14px 0 8px" }}>G'alabaga yo'l (qoida bo'yicha)</h3><ol style={{ paddingLeft: 20, lineHeight: 1.7, margin: 0 }}><li>Kichik aylanadan chiqish</li><li>«Orzu» katagiga tushish</li><li>Naqd pul orzu narxiga yetishi: <b>{money(cur.price)}</b></li></ol>
          <p className="muted" style={{ fontSize: 13 }}>Orzu narxi g'alaba ulushiga ta'sir qiladi: o'zgartirishdan oldin «Tekshiruv» ishga tushiriladi va Administrator ko'rib chiqadi.</p></section>}
      </div></>)}
  </>);
}

const KIND: Record<string, string> = { none: "Maxsus qoida yo'q", eventCard: "Kutilmagan hodisa kartasi", noSalary: "Oylik berilmaydi", offerGamble: "Taklif (tavakkal)", drawDeck: "Karta olinadi", loseWorstBusiness: "Eng zaif biznes yo'qoladi", payCashShare: "Naqd ulushi to'lanadi", shady: "Shubhali bitim" };
const TYPE: Record<string, string> = { Y: "Yana pullar", T: "Turg'un / tavakkal biznes", V: "Tavakkal (kubik)", O: "Xarajat katagi" };
const ruleText = (r: any) => !r ? "—" : `${KIND[r.kind] ?? r.kind}${r.share ? ` · ${Math.round(r.share * 100)} %` : ""}${r.months ? ` · ${r.months} oy` : ""}${r.deck ? ` · ${r.deck}` : ""}${r.first ? ` · birinchi ${money(r.first)}` : ""}`;

/** Kataklar: katta aylana (53) ro'yxati va katak qoidalari; kichik aylana qoidalari (cellRules.small). */
export function Cells({ api }: { api: Api }) {
  const b = useLoad<{ data: any[] }>(api, "/admin/content/bigBoard"); const r = useLoad<{ data: any }>(api, "/admin/content/cellRules"); const sm = useLoad<{ cells: { i: number; t: string }[] }>(api, "/admin/content/board-small"); const heat = useLoad<{ games: number; small: Record<string, number>; big: Record<string, number> }>(api, "/admin/analytics/cells"); const [sel, setSel] = useState(0); const [circle, setCircle] = useState<"big" | "small">("big");
  const cells = b.data?.data ?? []; const rules = r.data?.data ?? {}; const cur = cells[sel];
  const ruleOf = (c: any) => rules.big?.byIndex?.[String(c.i)] ?? rules.big?.byType?.[c.t];
  return (<>
    <PageHead title="Kataklar (taxta)" /><p className="muted" style={{ marginTop: -8 }}>Katta aylana {cells.length || 53} katak; har katakni bosib qoidasini ko'ring. Qoidalar kodda; admin faqat katak sozlamalarini (cellRules) versiya orqali o'zgartiradi.</p>
    <Err e={b.err ?? r.err} />{!b.data ? <Empty loading={b.loading} /> : (<>
      <div className="tabs" role="group" aria-label="Aylana"><button className={circle === "big" ? "on" : ""} aria-pressed={circle === "big"} onClick={() => setCircle("big")}>Katta aylana · {cells.length}</button><button className={circle === "small" ? "on" : ""} aria-pressed={circle === "small"} onClick={() => setCircle("small")}>Kichik aylana · {sm.data?.cells.length ?? 48}</button></div>
      <section className="card"><h2>{circle === "big" ? "Katta aylana" : "Kichik aylana"}</h2>
        <p className="muted" style={{ marginTop: -6, fontSize: 13 }}>{heat.data?.games ? `Rang — tushish chastotasi (${heat.data.games} ta tugagan o'yin bo'yicha): to'qroq = tez-tez tushadi.` : "Tushish chastotasi tugagan o'yinlar to'planganda rang bilan ko'rinadi."}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(44px,1fr))", gap: 6 }}>{(circle === "big" ? cells.map((c) => ({ i: c.i, t: c.t, name: c.name })) : (sm.data?.cells ?? []).map((c) => ({ i: c.i, t: c.t, name: c.t }))).map((c) => { const h = (heat.data?.[circle] ?? {})[String(c.i)] ?? 0; const on = circle === "big" && cells[sel]?.i === c.i;
          return <button key={c.i} className={on ? "p" : ""} aria-pressed={on} aria-label={`${c.i + 1}-katak: ${c.name}${h ? `, ${h} %` : ""}`} title={`${c.name}${h ? ` · ${h} %` : ""}`} onClick={() => circle === "big" && setSel(cells.findIndex((x) => x.i === c.i))} style={{ minHeight: 44, padding: 0, background: on ? undefined : h ? `rgba(17,131,90,${Math.min(0.7, 0.12 + h / 12)})` : c.t === "Y" || c.t === "D" ? "var(--s-warn)" : undefined }}>{c.i + 1}{circle === "small" && <small style={{ display: "block", fontSize: 10 }}>{c.t}</small>}</button>; })}</div></section>
      {cur && <section className="card" aria-label="Tanlangan katak"><h2>{cur.i + 1}-katak · {cur.name}</h2><dl className="kv"><dt>Turi</dt><dd>{TYPE[cur.t] ?? cur.t}</dd>{cur.price != null && <><dt>Narxi</dt><dd>{money(cur.price)}</dd></>}{cur.income != null && <><dt>Oylik daromad</dt><dd>{money(cur.income)}</dd></>}<dt>Qoida</dt><dd>{ruleText(ruleOf(cur))}</dd>{cur.note && <><dt>Izoh</dt><dd>{cur.note}</dd></>}</dl></section>}
      <section className="card"><h2>Kichik aylana qoidalari</h2>{Object.keys(rules.small ?? {}).length ? <dl className="kv">{Object.entries<any>(rules.small).map(([k, v]) => <React.Fragment key={k}><dt><Pill kind="plain">{k}</Pill></dt><dd>{ruleText(v)}</dd></React.Fragment>)}</dl> : <p className="muted">Maxsus qoida belgilanmagan.</p>}</section>
    </>)}
  </>);
}
