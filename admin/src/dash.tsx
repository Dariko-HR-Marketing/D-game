import React from "react";
import type { Api } from "./api";
import { Area, Bars, CARDS_URL, Empty, Err, PageHead, Pill, Tile, money, useLoad } from "./lib";
import { SetupList } from "./setup";

const Kpi = ({ l, v, d, warn }: { l: string; v: React.ReactNode; d?: string; warn?: boolean }) => <Tile l={l} v={v} hint={d} warn={warn} />;

export function Dashboard({ api, go, me, perms }: { api: Api; go: (k: string) => void; me?: any; perms?: string[] }) {
  const d = useLoad<any>(api, "/admin/dashboard"); const rooms = useLoad<any[]>(api, "/admin/rooms"); const x = d.data;
  const live = (rooms.data ?? []).filter((r) => !r.ended).slice(0, 6);
  const quiet = x?.live && x.live.online === 0 && !x.kpi?.gamesToday && !(x.today?.users);
  return (<>
    <PageHead title="Boshqaruv paneli"><span className="pill good" role="status">Jonli</span><button onClick={() => { d.reload(); rooms.reload(); }}>Yangilash</button></PageHead>
    <Err e={d.err} />{!x ? <Empty loading={d.loading} /> : (<>
      {perms && <SetupList api={api} perms={perms} me={me} today={x.today} go={go} />}
      {quiet && <div className="banner info" role="status" style={{ marginBottom: 16 }}>Hali o'yinchi va o'yin yo'q: ko'rsatkichlar birinchi o'yindan keyin to'ladi. Sinash uchun «Test hisoblar» bo'limidan foydalaning.</div>}
      {x.live && <section className="card" aria-label="Asosiy ko'rsatkichlar"><div className="stats">
        <Kpi l="Onlayn o'yinchilar" v={x.live.online} /><Kpi l="Faol maydonlar" v={x.live.active} d={x.kpi ? `${x.kpi.where.playing} kishi o'yinda` : undefined} /><Kpi l="Kutish zalida" v={x.live.lobby} d={x.kpi ? `${x.kpi.where.lobby} kishi` : undefined} />
        {x.kpi && <><Kpi l="Bugungi o'yinlar" v={x.kpi.gamesToday} d={`${x.kpi.finishedToday} tugagan · ${x.kpi.ongoing} davom etmoqda`} /><Kpi l="O'rtacha davomiylik" v={x.kpi.avgMinutes === null ? "—" : `${x.kpi.avgMinutes} daq`} d="oxirgi 24 soat" /><Kpi l="Tashlab ketilgan" v={x.kpi.abandonShare === null ? "—" : `${x.kpi.abandonShare} %`} d="kimdir chiqib ketgan o'yinlar" /><Kpi l="Aloqasi uzilganlar" v={x.kpi.offline} d="qaytishini kutmoqda" warn={x.kpi.offline > 0} /></>}
        {x.today && <Kpi l="Yangi hisoblar (bugun)" v={x.today.registered} d={`jami ${x.today.users}`} />}
        <Kpi l="Sinf / turnir maydonlari" v={`${x.live.classRooms} / ${x.live.tournamentRooms}`} />
      </div></section>}
      <div className="grid2">
        {x.online24 && <section className="card"><h2>Onlayn o'yinchilar — oxirgi 24 soat</h2><Area values={x.online24.values} labels={x.online24.hours} label="Onlayn o'yinchilar" /><p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>Soatlik eng yuqori qiymat; server qayta ishga tushganda hisob yangidan boshlanadi.</p></section>}
        {x.series && <section className="card"><h2>Tugagan o'yinlar, 14 kun</h2><Bars values={x.series.gamesFinished} labels={x.series.days} label="Tugagan o'yinlar" /></section>}
      </div>
      <div className="grid2">
        <section className="card" aria-labelledby="at"><h2 id="at">Diqqat talab qiladi</h2>
          {x.attention.length === 0 ? <p className="muted">Hozircha hammasi joyida.</p> : x.attention.map((a: any, i: number) => (
            <div className="attn" key={i}><span><Pill kind={a.kind === "bad" ? "bad" : a.kind === "warn" ? "warn" : "info"}>{a.count}</Pill> {a.text}</span><button className="sm" onClick={() => go(a.to)}>Ochish</button></div>))}</section>
        {x.content && <section className="card"><h2>Kontent salomatligi</h2><div className="stats">
          <Kpi l="Katalog (faol)" v={String(x.content.live).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} /><Kpi l="Qoralama" v={x.content.draft} /><Kpi l="Rasmi yo'q" v={x.content.noImage} d="generator yuzi ishlatiladi" /><Kpi l="Kasb · orzu" v={`${x.content.jobs} · ${x.content.dreams}`} /></div></section>}
        {x.money && <section className="card"><h2>Daromad</h2><div className="stats"><Kpi l="Bugun" v={money(x.money.today)} /><Kpi l="Faol Plus" v={x.money.plusActive} /></div><Bars values={x.money.series} labels={x.money.days} label="Daromad, 14 kun" color="#F2B233" fmt={money} /></section>}
      </div>
      <section className="card"><h2>Jonli maydonlar</h2>{!live.length ? <p className="muted">Hozir faol maydon yo'q.</p> : <div className="tw" tabIndex={0} role="region" aria-label="Jonli maydonlar"><table><thead><tr><th>Maydon</th><th>Holat</th><th>O'yinchilar</th><th>Tur</th></tr></thead><tbody>
        {live.map((r) => <tr key={r.code}><td><b>{r.code}</b></td><td>{r.started ? <Pill kind="good">O'yinda</Pill> : <Pill kind="info">Kutish zali</Pill>}</td><td>{Array.isArray(r.members) ? r.members.length : r.members}</td><td>{r.round ?? "—"}</td></tr>)}</tbody></table></div>}
        <div className="row" style={{ marginTop: 10 }}><button className="sm" onClick={() => go("live")}>Jonli kuzatuv →</button></div></section>
      {x.topCards?.length > 0 && <section className="card"><h2>Eng ko'p chiqqan kartalar</h2><div className="stats">{x.topCards.map((c: any) => <div key={c.id} className="stat">
        {c.file && <img src={`${CARDS_URL}/${c.file}`} alt={`Karta: ${c.title}`} loading="lazy" style={{ width: "100%", maxWidth: 170, borderRadius: 8, border: "1px solid var(--line)" }} onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />}
        <b style={{ fontSize: 15 }}>{c.title}</b><small className="muted">{c.shown} marta · {c.acceptRate} % qabul</small></div>)}</div></section>}
    </>)}
  </>);
}
