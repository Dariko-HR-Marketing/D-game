// O'yinlar: jonli xonalar, tugagan o'yinlar, shubhali o'yinlar, qayta o'ynatish va majburan yopish.
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Api } from "./api";
import { Journal } from "./legacy";
import { Banner, Empty, Err, FormDialog, Lines, PageHead, Pill, Tabs, download, csv, errText, fmtDur, fmtTime, useLoad } from "./lib";
import { t } from "./uz";

const COLORS = ["#11835A", "#F2B233", "#9E2A30", "#2C6DB5", "#7B4FA3", "#E07A2F"];
export function Rooms({ api, perms }: { api: Api; perms: string[] }) {
  const [tab, setTab] = useState<"live" | "done" | "sus">("live"); const [tag, setTag] = useState("all"); const [q, setQ] = useState(""); const [off, setOff] = useState(0);
  const [view, setView] = useState<{ kind: "journal" | "replay"; code: string } | null>(null); const [close, setClose] = useState<string | null>(null);
  const live = useLoad<any[]>(api, `/admin/rooms?q=${encodeURIComponent(q)}${tag !== "all" ? `&tag=${tag}` : ""}`, [q, tag, tab]);
  const done = useLoad<{ total: number; games: any[] }>(api, `/admin/games?q=${encodeURIComponent(q)}&offset=${off}${tag !== "all" ? `&tag=${tag}` : ""}`, [q, tag, off, tab]);
  const sus = useLoad<{ games: any[] }>(api, "/admin/games/suspicious", [tab]);
  const canJournal = perms.includes("journal.read"), canClose = perms.includes("rooms.close");
  if (view?.kind === "replay") return <Replay api={api} code={view.code} onClose={() => setView(null)} />;
  const status = (r: any) => (r.closed ? <Pill kind="bad">Yopilgan</Pill> : r.ended ? <Pill kind="info">Tugagan</Pill> : r.started ? <Pill kind="good">O'yinda</Pill> : <Pill kind="warn">Kutmoqda</Pill>);
  const tagPill = (g: any) => (g ? <Pill kind="info">{g.kind === "class" ? "Sinf" : "Turnir"}</Pill> : null);
  const acts = (code: string) => <div className="row">{canJournal && <><button className="sm" onClick={() => setView({ kind: "journal", code })}>{t.journal}</button><button className="sm" onClick={() => setView({ kind: "replay", code })}>Qayta o'ynatish</button></>}</div>;
  return (<>
    <PageHead title={t.rooms}><label style={{ minWidth: 220 }}><span className="sr">{t.search}</span><input type="search" aria-label={t.search} placeholder="Kod yoki o'yinchi" value={q} onChange={(e) => { setQ(e.target.value); setOff(0); }} /></label>
      <label><span className="sr">Turi</span><select aria-label="Turi" value={tag} onChange={(e) => { setTag(e.target.value); setOff(0); }}><option value="all">Hammasi</option><option value="none">Oddiy</option><option value="class">Sinf</option><option value="tournament">Turnir</option></select></label></PageHead>
    <Tabs label="Xonalar" active={tab} onChange={setTab} items={[["live", "Jonli"], ["done", "Tugagan"], ["sus", "Shubhali"]]} />
    {view?.kind === "journal" && <Journal api={api} code={view.code} onClose={() => setView(null)} />}
    {tab === "live" && <section className="card"><Err e={live.err} />{!live.data?.length ? <Empty loading={live.loading} /> : <div className="tw" tabIndex={0} role="region" aria-label="Jonli xonalar jadvali"><table><thead><tr><th>Kod</th><th>Holat</th><th>Turi</th><th>Kontent</th><th>Aylana</th><th>O'yinchilar</th><th><span className="sr">Amal</span></th></tr></thead><tbody>{live.data.map((r) => (
      <tr key={r.code}><td><b className="mono" style={{ fontSize: 14 }}>{r.code}</b></td><td>{status(r)}{r.closed && <div className="muted" style={{ fontSize: 12 }}>{r.closed}</div>}</td><td>{tagPill(r.tag)}</td><td>v{r.contentVersion ?? "—"}</td><td className="num">{r.round ?? "—"}</td>
        <td>{Array.isArray(r.members) ? r.members.map((m: any) => (m.bot ? "Bot" : m.name ?? m.userId) + (m.online || m.bot ? "" : " (oflayn)")).join(", ") : `${r.members} ta`}</td>
        <td><div className="row">{acts(r.code)}{canClose && !r.ended && <button className="sm d" onClick={() => setClose(r.code)}>Yopish</button>}</div></td></tr>))}</tbody></table></div>}</section>}
    {tab === "done" && <section className="card"><Err e={done.err} />{!done.data?.games.length ? <Empty loading={done.loading} /> : <><div className="tw" tabIndex={0} role="region" aria-label="Tugagan o'yinlar jadvali"><table><thead><tr><th>Kod</th><th>Tugagan</th><th>Davomiyligi</th><th>Raund</th><th>G'olib</th><th>Turi</th><th>O'yinchi</th><th><span className="sr">Amal</span></th></tr></thead><tbody>{done.data.games.map((g) => (
      <tr key={g.room}><td className="mono"><b>{g.room}</b></td><td className="muted">{fmtTime(g.finishedAt)}</td><td>{fmtDur(g.durationMs / 1000)}</td><td className="num">{g.rounds}</td><td>{g.winner ?? "—"}</td><td>{tagPill(g.tag)}</td><td>{g.humans} + {g.bots} bot {g.unreliable > 0 && <Pill kind="warn">ishonchsiz ×{g.unreliable}</Pill>}</td><td>{acts(g.room)}</td></tr>))}</tbody></table></div>
      <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}><span className="muted">Jami: {done.data.total}</span><span className="row"><button className="sm" disabled={off === 0} onClick={() => setOff(Math.max(0, off - 50))}>← Oldingi</button><button className="sm" disabled={off + 50 >= done.data.total} onClick={() => setOff(off + 50)}>Keyingi →</button><button className="sm" onClick={() => download("oyinlar.csv", csv([["Kod", "Tugagan", "Davomiyligi (s)", "Raund", "G'olib", "Tur", "Odam", "Bot"], ...done.data!.games.map((g) => [g.room, new Date(g.finishedAt).toISOString(), Math.round(g.durationMs / 1000), g.rounds, g.winner, g.tag?.kind ?? "", g.humans, g.bots])]))}>CSV</button></span></div></>}</section>}
    {tab === "sus" && <section className="card"><Banner kind="info">Bu faqat ko'rib chiqish uchun belgilar. Avtomatik jazo qo'llanmaydi.</Banner><Err e={sus.err} />{!sus.data?.games.length ? <Empty loading={sus.loading} /> : sus.data.games.map((g) => (
      <div className="attn" key={g.room + g.reasons[0]} style={{ alignItems: "flex-start" }}><div><b className="mono">{g.room}</b> <span className="muted">{fmtTime(g.finishedAt)}</span>{g.reasons.map((r: string, i: number) => <div key={i}><Pill kind="warn">!</Pill> {r}</div>)}</div>{acts(g.room)}</div>))}</section>}
    <FormDialog open={close !== null} danger title={`Xonani yopish: ${close}`} body="O'yin to'xtatiladi, natija yozilmaydi. Sabab o'yinchilarga ko'rsatiladi." fields={[{ key: "reason", label: t.reason, required: true }]} onClose={() => setClose(null)} onOk={async (f) => { const r = await api.post(`/admin/rooms/${close}/close`, { reason: f.reason }); if (r.error) throw new Error(r.error); setClose(null); live.reload(); }} />
  </>);
}

function Replay({ api, code, onClose }: { api: Api; code: string; onClose: () => void }) {
  const r = useLoad<any>(api, `/admin/rooms/${code}/replay`); const [i, setI] = useState(0); const [play, setPlay] = useState(false); const timer = useRef<any>(null); const d = r.data;
  const n = d?.steps?.length ?? 0;
  useEffect(() => { if (!play) return; timer.current = setInterval(() => setI((x) => (x + 1 >= n ? (setPlay(false), x) : x + 1)), 350); return () => clearInterval(timer.current); }, [play, n]);
  const series = useMemo(() => (d?.players ?? []).map((id: string, k: number) => ({ name: d.names[id], color: COLORS[k % 6], values: d.steps.map((s: any) => s.players.find((p: any) => p.id === id)?.cash ?? 0) })), [d]);
  const step = d?.steps?.[i];
  return (<>
    <PageHead title={`Qayta o'ynatish: ${code}`}><button onClick={onClose}>← Orqaga</button></PageHead>
    <Err e={r.err} />{d?.error ? <Banner kind="bad">{errText({ body: { error: d.error } } as any)} {d.detail}</Banner> : !d ? <Empty loading={r.loading} /> : (<>
      {d.truncated && <Banner kind="warn">Birinchi 3000 qadam ko'rsatilmoqda.</Banner>}
      <section className="card"><h2>Naqd pul dinamikasi</h2><Lines series={series} label="Naqd pul" cursor={i} height={150} />
        <div className="row" style={{ gap: 14, marginBottom: 8 }}>{series.map((s: any) => <span key={s.name}><span aria-hidden style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: s.color, marginRight: 6 }} />{s.name}</span>)}</div>
        <div className="row" style={{ alignItems: "center" }}><button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>←</button><button className="p" onClick={() => { if (i + 1 >= n) setI(0); setPlay(!play); }}>{play ? "Pauza" : "Ijro"}</button><button onClick={() => setI(Math.min(n - 1, i + 1))} disabled={i + 1 >= n}>→</button>
          <input type="range" min={0} max={Math.max(0, n - 1)} value={i} aria-label="Qadam" onChange={(e) => { setPlay(false); setI(Number(e.target.value)); }} style={{ flex: 1, minHeight: 0 }} /><span className="mono">{i}/{n - 1}</span></div></section>
      {step && <section className="card"><h2>Qadam {step.i}: {step.type}{step.auto ? <> <Pill kind="warn">avto: {step.auto}</Pill></> : null}{!step.ok && <> <Pill kind="bad">rad etilgan: {step.error}</Pill></>}</h2>
        <p className="muted">{step.by ? `Kim: ${d.names[step.by] ?? step.by} · ` : ""}raund {step.round} · {step.phase === "dreams" ? "orzu tanlash" : "o'yin"}{step.turn ? ` · navbat: ${d.names[step.turn] ?? step.turn}` : ""}{step.at ? ` · ${fmtTime(step.at)}` : ""}</p>
        <div className="tw" tabIndex={0} role="region" aria-label="O'yinchilar holati"><table><thead><tr><th>O'yinchi</th><th className="num">Naqd</th><th className="num">Oylik oqim</th><th className="num">Katak</th><th>Aylana</th><th className="num">Aktiv</th><th className="num">Qarz</th><th className="num">Qayta boshlash</th></tr></thead><tbody>{step.players.map((p: any) => (
          <tr key={p.id} style={step.turn === p.id ? { background: "var(--s-info)" } : undefined}><td><b>{d.names[p.id]}</b>{d.winner === p.id && i === n - 1 && <> <Pill kind="good">g'olib</Pill></>}</td><td className="num">{p.cash}</td><td className="num">{p.cashflow}</td><td className="num">{p.pos}</td><td>{p.circle === "big" ? "katta" : "kichik"}</td><td className="num">{p.assets}</td><td className="num">{p.debt}</td><td className="num">{p.restarts}</td></tr>))}</tbody></table></div></section>}</>)}
  </>);
}
