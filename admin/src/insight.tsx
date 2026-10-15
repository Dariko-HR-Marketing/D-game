// Analitika (shaxssiz), audit qidiruvi va tizim salomatligi.
import React, { useState } from "react";
import type { Api } from "./api";
import { Banner, Bars, Empty, Err, Field, Lines, PageHead, Pill, Tabs, csv, download, fmtDur, fmtTime, money, useLoad } from "./lib";
import { t } from "./uz";

const pct = (x: number) => `${(x * 100).toFixed(1)} %`;
const tile = (k: string, v: React.ReactNode) => <div className="stat" key={k}><b>{v}</b><span>{k}</span></div>;
export function Analytics({ api }: { api: Api }) {
  const [tab, setTab] = useState("over"); const [days, setDays] = useState("30");
  const o = useLoad<any>(api, `/admin/analytics/overview?days=${days}`, [days]); const f = useLoad<any>(api, "/admin/analytics/funnel"); const c = useLoad<any[]>(api, "/admin/analytics/cards"); const x = o.data;
  const exp = () => x && download("analitika.csv", csv([["Sana", "Yangi foydalanuvchi", "Faol o'yinchi (DAU)", "Tugagan o'yin"], ...x.series.days.map((d: string, i: number) => [d, x.series.registered[i], x.series.dau[i], x.series.games[i]])]));
  const steps: [string, number][] = f.data ? [["Kirgan", f.data.registered], ["Profil to'ldirgan", f.data.withProfile], ["Birinchi o'yin", f.data.playedFirstGame], ["3 va undan ko'p o'yin", f.data.playedThreeOrMore], ["Kamida bir g'alaba", f.data.wonAtLeastOnce]] : [];
  return (<>
    <PageHead title={t.analytics}><Field label="Davr"><select value={days} onChange={(e) => setDays(e.target.value)}><option value="7">7 kun</option><option value="30">30 kun</option><option value="90">90 kun</option></select></Field><button onClick={exp} disabled={!x}>CSV</button></PageHead>
    <Tabs label="Analitika bo'limlari" active={tab} onChange={setTab} items={[["over", "O'sish"], ["quality", "O'yin sifati"], ["audience", "Auditoriya"], ["funnel", "Voronka va kartalar"]]} />
    <Err e={o.err} />{!x ? <Empty loading={o.loading} /> : (<>
      {tab === "over" && <>
        <section className="card"><h2>Faol foydalanuvchilar</h2><div className="stats">{tile("DAU (24 soat)", x.active.dau)}{tile("WAU (7 kun)", x.active.wau)}{tile("MAU (30 kun)", x.active.mau)}{tile("Jami foydalanuvchi", x.commerce.registered)}{tile("To'lagan", x.commerce.payers)}{tile("Konversiya", pct(x.commerce.conversion))}{tile("Faol Plus", x.commerce.plusActive)}</div></section>
        <section className="card"><h2>Ushlab qolish</h2><div className="tw" tabIndex={0} role="region" aria-label="Ushlab qolish jadvali"><table><thead><tr><th>Ro'yxatdan o'tgandan keyin</th><th className="num">Hisoblangan foydalanuvchi</th><th className="num">Qaytgan</th><th>Ulush</th></tr></thead><tbody>{x.retention.map((r: any) => { const p = r.base ? r.kept / r.base : 0; return <tr key={r.day}><td>{r.day} kun</td><td className="num">{r.base}</td><td className="num">{r.kept}</td><td style={{ minWidth: 180 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="bar" role="img" aria-label={pct(p)}><i style={{ width: `${p * 100}%` }} /></div><span style={{ width: 56 }}>{pct(p)}</span></div></td></tr>; })}</tbody></table></div><p className="muted">{x.note}</p></section>
        <div className="grid2"><section className="card"><h2>Yangi foydalanuvchilar</h2><Bars values={x.series.registered} labels={x.series.days} label="Yangi foydalanuvchilar" color="#2C6DB5" /></section><section className="card"><h2>Kunlik faol o'yinchilar</h2><Lines label="Kunlik faol o'yinchilar" series={[{ name: "DAU", values: x.series.dau, color: "#11835A" }]} /></section></div>
      </>}
      {tab === "quality" && <>
        <section className="card"><h2>Tugagan o'yinlar ({x.days} kun)</h2><div className="stats">{tile("O'yinlar", x.quality.games)}{tile("G'olibli", x.quality.games ? pct(x.quality.withWinner / x.quality.games) : "—")}{tile("O'rtacha davomiylik", fmtDur(x.quality.avgDurationSec))}{tile("O'rtacha raund", x.quality.avgRounds)}{tile("Bot ulushi", pct(x.quality.botShare))}</div></section>
        <section className="card"><h2>O'yinchi ko'rsatkichlari</h2><div className="stats">{tile("Katta aylanaga chiqqan", pct(x.quality.reachedBigShare))}{tile("Ishdan bo'shagan", pct(x.quality.quitJobShare))}{tile("O'rtacha aktiv", x.quality.avgAssets)}{tile("O'rtacha qayta boshlash", x.quality.avgRestarts)}{tile("Chiqib ketgan", pct(x.quality.leftShare))}{tile("Ishonchsiz", pct(x.quality.unreliableShare))}{tile("O'rtacha avto-qaror", x.quality.avgAutos)}</div></section>
        <div className="grid2"><section className="card"><h2>Raundlar taqsimoti</h2><Bars values={x.rounds.map((r: any) => r.n)} labels={x.rounds.map((r: any) => r.label)} label="Raundlar taqsimoti" color="#7B4FA3" /><div className="row muted">{x.rounds.map((r: any) => <span key={r.label}>{r.label}: {r.n}</span>)}</div></section>
          <section className="card"><h2>Davomiylik taqsimoti</h2><Bars values={x.durations.map((r: any) => r.n)} labels={x.durations.map((r: any) => r.label)} label="Davomiylik taqsimoti" color="#E07A2F" /><div className="row muted">{x.durations.map((r: any) => <span key={r.label}>{r.label}: {r.n}</span>)}</div></section></div>
        <section className="card"><h2>Qaysi soatda o'ynaladi (mahalliy vaqt)</h2><Bars values={x.hours} labels={x.hours.map((_: number, h: number) => `${h}:00`)} label="Soatlar bo'yicha o'yinlar" color="#2C6DB5" /></section>
        <section className="card"><h2>O'yin turlari</h2><div className="stats">{tile("Oddiy", x.tags.normal)}{tile("Sinf", x.tags.class)}{tile("Turnir", x.tags.tournament)}</div></section></>}
      {tab === "audience" && <div className="grid2">
        <section className="card"><h2>Yosh guruhlari</h2><Bars values={x.ages.map((r: any) => r.n)} labels={x.ages.map((r: any) => r.label)} label="Yosh guruhlari" color="#11835A" /><div className="row muted">{x.ages.map((r: any) => <span key={r.label}>{r.label}: {r.n}</span>)}</div></section>
        <section className="card"><h2>Daraja taqsimoti</h2><Bars values={x.levels.map((r: any) => r.n)} labels={x.levels.map((r: any) => r.label)} label="Daraja taqsimoti" color="#F2B233" /><div className="row muted">{x.levels.map((r: any) => <span key={r.label}>{r.label}: {r.n}</span>)}</div></section></div>}
      {tab === "funnel" && <>
        <section className="card"><h2>Voronka: kirishdan g'alabagacha</h2><Err e={f.err} />{!f.data ? <Empty loading={f.loading} /> : <><div className="tw" tabIndex={0} role="region" aria-label="Voronka jadvali"><table><thead><tr><th>Bosqich</th><th className="num">Soni</th><th>Kirganlardan</th></tr></thead><tbody>{steps.map(([k, v]) => { const p = f.data.registered ? Math.round((100 * v) / f.data.registered) : 0; return <tr key={k}><td>{k}</td><td className="num"><b>{v}</b></td><td style={{ minWidth: 180 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="bar" role="img" aria-label={`${p} %`}><i style={{ width: `${p}%` }} /></div><span style={{ width: 44 }}>{p} %</span></div></td></tr>; })}</tbody></table></div><p className="muted">Tugagan o'yinlar: {f.data.gamesFinished} · g'olibli: {Math.round(f.data.winShare * 100)} %</p></>}</section>
        <section className="card"><h2>Kartalar: qabul va o'tkazish</h2><Err e={c.err} />{!c.data?.length ? <Empty loading={c.loading} /> : <div className="tw" tabIndex={0} role="region" aria-label="Kartalar jadvali"><table><thead><tr><th>Karta</th><th className="num">Ko'rsatilgan</th><th className="num">Qabul</th><th className="num">O'tkazilgan</th><th>Qabul ulushi</th></tr></thead><tbody>{c.data.map((r) => <tr key={r.id}><td className="mono">{r.id}</td><td className="num">{r.shown}</td><td className="num">{r.accepted}</td><td className="num">{r.skipped}</td><td>{pct(r.acceptRate)}</td></tr>)}</tbody></table></div>}</section></>}
    </>)}
  </>);
}

export function Audit({ api }: { api: Api }) {
  const [q, setQ] = useState(""); const [action, setAction] = useState(""); const [failed, setFailed] = useState(false); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [off, setOff] = useState(0);
  const qs = `?q=${encodeURIComponent(q)}&action=${encodeURIComponent(action)}&failed=${failed ? 1 : 0}&from=${from}&to=${to}&offset=${off}`; const l = useLoad<any>(api, "/admin/audit/search" + qs, [q, action, failed, from, to, off]);
  const exp = async () => { const j = await api.get(`/admin/audit/search${qs.replace(/offset=\d+/, "offset=0")}&limit=1000`); download("audit.csv", csv([["Vaqt", "IP", "Admin", "Rol", "Amal", "Obyekt", "Tafsilot"], ...j.entries.map((a: any) => [new Date(a.at).toISOString(), a.ip, a.admin, a.role, a.action, a.target, a.detail ? JSON.stringify(a.detail) : ""])])); };
  return (<>
    <PageHead title={t.audit}><button onClick={l.reload}>Yangilash</button><button onClick={exp}>CSV (1000 tagacha)</button></PageHead>
    <section className="card"><div className="row"><Field label="Qidirish"><input type="search" value={q} onChange={(e) => { setQ(e.target.value); setOff(0); }} placeholder="Amal, obyekt yoki tafsilot" /></Field>
      <Field label="Amal"><select value={action} onChange={(e) => { setAction(e.target.value); setOff(0); }}><option value="">Hammasi</option>{l.data?.actions.map((a: string) => <option key={a} value={a}>{a}</option>)}</select></Field>
      <Field label="Boshlanish"><input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setOff(0); }} /></Field><Field label="Tugash"><input type="date" value={to} onChange={(e) => { setTo(e.target.value); setOff(0); }} /></Field>
      <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={failed} onChange={(e) => { setFailed(e.target.checked); setOff(0); }} />Faqat muvaffaqiyatsiz</label></div></section>
    <section className="card"><Err e={l.err} />{!l.data?.entries.length ? <Empty loading={l.loading} /> : <><div className="tw" tabIndex={0} role="region" aria-label="Audit jadvali"><table><thead><tr><th>Vaqt</th><th>Admin</th><th>Rol</th><th>Amal</th><th>Obyekt</th><th>IP</th><th>Tafsilot</th></tr></thead><tbody>{l.data.entries.map((a: any, i: number) => (
      <tr key={i}><td className="muted">{fmtTime(a.at)}</td><td className="mono">{a.admin}</td><td>{t.roles[a.role] ?? a.role}</td><td>{String(a.action).endsWith(":failed") ? <Pill kind="bad">{a.action}</Pill> : <b>{a.action}</b>}</td><td className="mono">{a.target ?? "—"}</td><td className="mono">{a.ip ?? "—"}</td>
        <td className="mono" style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.detail ? JSON.stringify(a.detail) : ""}>{a.detail ? JSON.stringify(a.detail) : "—"}</td></tr>))}</tbody></table></div>
      <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}><span className="muted">Jami: {l.data.total}</span><span className="row"><button className="sm" disabled={off === 0} onClick={() => setOff(Math.max(0, off - 50))}>← Oldingi</button><button className="sm" disabled={off + 50 >= l.data.total} onClick={() => setOff(off + 50)}>Keyingi →</button></span></div></>}</section></>);
}

const mb = (n: number) => `${(n / 1048576).toFixed(0)} MB`;
export function Health({ api }: { api: Api }) {
  const h = useLoad<any>(api, "/admin/system/health"); const x = h.data;
  return (<>
    <section className="card" aria-labelledby="hh"><div className="page-h" style={{ marginBottom: 8 }}><h2 id="hh">Salomatlik</h2><button onClick={h.reload}>Yangilash</button></div><Err e={h.err} />{!x ? <Empty loading={h.loading} /> : (<>
      <div className="row" style={{ marginBottom: 12 }}><Pill kind={x.db.ok ? "good" : "bad"}>Baza: {x.db.kind}{x.db.ms !== undefined ? ` · ${x.db.ms} ms` : ""}</Pill><Pill kind={x.sms.last24h.failed ? "bad" : "good"}>SMS (24 s): {x.sms.last24h.sent} ok, {x.sms.last24h.failed} xato</Pill><Pill kind={x.errors1h ? "bad" : "good"}>Xatolar (1 soat): {x.errors1h}</Pill><Pill kind={x.backup.configured ? (x.backup.lastAt ? "good" : "warn") : "plain"}>Zaxira: {x.backup.configured ? (x.backup.lastAt ? fmtTime(x.backup.lastAt) : "belgi topilmadi") : "kuzatilmaydi"}</Pill></div>
      <div className="stats">{tile("Ishlash vaqti", fmtDur(x.uptimeSec))}{tile("Xotira (RSS)", mb(x.memory.rss))}{tile("Onlayn o'yinchilar", x.online)}{tile("WebSocket", x.sockets)}{tile("Faol xonalar", x.rooms.active)}{tile("Kutayotgan", x.rooms.lobby)}{tile("Ota-ona so'rovlari (kutmoqda)", x.consents.pending)}{tile("Muddati o'tgan so'rovlar", x.consents.expired)}</div>
      <p className="muted">Node {x.node} · muhit: {x.env}</p></>)}</section>
    {x && <div className="grid2">
      <section className="card"><h2>So'nggi xatolar</h2>{x.errors.length === 0 ? <p className="muted">Xato yo'q</p> : x.errors.map((e: any, i: number) => <div className="attn" key={i}><span><b className="mono">{e.where}</b><div className="muted" style={{ fontSize: 13 }}>{e.msg}</div></span><span className="muted">{fmtTime(e.at)}</span></div>)}</section>
      <section className="card"><h2>So'nggi SMS</h2>{x.sms.recent.length === 0 ? <p className="muted">Yo'q</p> : x.sms.recent.map((s: any, i: number) => <div className="attn" key={i}><span className="mono">{s.to}</span><span>{s.ok ? <Pill kind="good">yuborildi</Pill> : <Pill kind="bad">xato</Pill>} <span className="muted">{fmtTime(s.at)}</span></span></div>)}</section></div>}
  </>);
}
void Banner; void money;
