import React from "react";
import type { Api } from "./api";
import { Bars, Empty, Err, PageHead, Pill, money, useLoad } from "./lib";

export function Dashboard({ api, go }: { api: Api; go: (k: string) => void }) {
  const d = useLoad<any>(api, "/admin/dashboard"); const x = d.data;
  const tile = (k: string, v: React.ReactNode) => <div className="stat" key={k}><b>{v}</b><span>{k}</span></div>;
  return (<>
    <PageHead title="Boshqaruv paneli"><button onClick={d.reload}>Yangilash</button></PageHead>
    <Err e={d.err} />{!x ? <Empty loading={d.loading} /> : (<>
      {x.live && <section className="card" aria-labelledby="lv"><h2 id="lv">Hozir</h2><div className="stats">{tile("Onlayn o'yinchilar", x.live.online)}{tile("Faol xonalar", x.live.active)}{tile("Kutayotgan xonalar", x.live.lobby)}{tile("Sinf xonalari", x.live.classRooms)}{tile("Turnir xonalari", x.live.tournamentRooms)}</div></section>}
      <div className="grid2">
        {x.attention?.length > 0 || true ? <section className="card" aria-labelledby="at"><h2 id="at">Diqqat talab qiladi</h2>
          {x.attention.length === 0 ? <p className="muted">Hozircha hammasi joyida.</p> : x.attention.map((a: any, i: number) => (
            <div className="attn" key={i}><span><Pill kind={a.kind === "bad" ? "bad" : a.kind === "warn" ? "warn" : "info"}>{a.count}</Pill> {a.text}</span><button className="sm" onClick={() => go(a.to)}>Ochish</button></div>))}</section> : null}
        {x.today && <section className="card" aria-labelledby="td"><h2 id="td">Bugun</h2><div className="stats">{tile("Yangi foydalanuvchi", x.today.registered)}{tile("Tugagan o'yin", x.today.gamesFinished)}{tile("Jami foydalanuvchi", x.today.users)}{tile("Jami o'yin", x.today.games)}</div></section>}
        {x.money && <section className="card" aria-labelledby="mn"><h2 id="mn">Daromad</h2><div className="stats">{tile("Bugun", money(x.money.today))}{tile("Faol Plus", x.money.plusActive)}</div></section>}
      </div>
      {x.series && <div className="grid2">
        <section className="card"><h2>Yangi foydalanuvchilar, 14 kun</h2><Bars values={x.series.registered} labels={x.series.days} label="Yangi foydalanuvchilar" color="#2C6DB5" /></section>
        <section className="card"><h2>Tugagan o'yinlar, 14 kun</h2><Bars values={x.series.gamesFinished} labels={x.series.days} label="Tugagan o'yinlar" /></section></div>}
      {x.money && <section className="card"><h2>Daromad, 14 kun</h2><Bars values={x.money.series} labels={x.money.days} label="Daromad" color="#F2B233" fmt={money} /></section>}
    </>)}
  </>);
}
