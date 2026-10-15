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


export function Shop({ api }: { api: Api }) {
  const c = useLoad<{ config: any }>(api, "/admin/shop/config"); const o = useLoad<{ orders: any[] }>(api, "/admin/shop/orders");
  const [f, setF] = useState<Record<string, string>>({}); const [msg, setMsg] = useState<{ kind: "good" | "bad"; text: string } | null>(null);
  useEffect(() => { if (c.data) { const g = c.data.config; setF({ plusMonthly: g.plusMonthly ?? "", plusYearly: g.plusYearly ?? "", freeRoomsPerDay: g.freeRoomsPerDay ?? "", freeHistory: g.freeHistory ?? "", ...Object.fromEntries(Object.entries(g.items ?? {}).map(([k, v]) => ["i:" + k, String(v ?? "")])) }); } }, [c.data]);
  const save = async () => {
    const items: Record<string, number | null> = {}; for (const [k, v] of Object.entries(f)) if (k.startsWith("i:")) items[k.slice(2)] = num(String(v));
    try { const r = await api.post("/admin/shop/config", { plusMonthly: num(String(f.plusMonthly ?? "")), plusYearly: num(String(f.plusYearly ?? "")), freeRoomsPerDay: num(String(f.freeRoomsPerDay ?? "")), freeHistory: num(String(f.freeHistory ?? "")), items }); setMsg(r.error ? { kind: "bad", text: r.error } : { kind: "good", text: t.saved }); c.reload(); } catch (e) { setMsg({ kind: "bad", text: errText(e) }); }
  };
  const field = (k: string, label: string) => <label key={k}>{label}<input inputMode="numeric" value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder="belgilanmagan" /></label>;
  const itemKeys = Object.keys(f).filter((k) => k.startsWith("i:"));
  return (<>
    <PageHead title={t.shop} />
    <section className="card" aria-labelledby="sh"><h2 id="sh">Narxlar va bepul tarif chegaralari</h2><p className="muted">Narx bo'sh qoldirilsa, xarid yopiq turadi (narx o'ylab topilmaydi). Chegara bo'sh = cheklovsiz.</p><Err e={c.err} />
      <div className="stack"><div className="row">{field("plusMonthly", "Plus, oylik (so'm)")}{field("plusYearly", "Plus, yillik (so'm)")}{field("freeRoomsPerDay", "Bepul: kuniga xona")}{field("freeHistory", "Bepul: tarix yozuvlari")}</div>
        {itemKeys.length > 0 && <div className="row">{itemKeys.map((k) => field(k, k.slice(2)))}</div>}
        <div><button className="p" onClick={save}>Saqlash</button></div>{msg && <Banner kind={msg.kind}>{msg.text}</Banner>}</div></section>
    <section className="card"><h2>Buyurtmalar</h2><Err e={o.err} />{!o.data?.orders.length ? <Empty loading={o.loading} /> : <div className="tw" tabIndex={0} role="region" aria-label="Jadval"><table><thead><tr><th>Vaqt</th><th>Foydalanuvchi</th><th>Mahsulot</th><th className="num">Summa</th><th>Holat</th></tr></thead><tbody>{o.data.orders.map((x) => <tr key={x.id}><td className="muted">{fmtTime(x.createdAt)}</td><td>{x.user}</td><td>{x.title}</td><td className="num">{x.amount}</td><td><Pill kind={x.status === "paid" ? "good" : x.status === "rejected" || x.status === "cancelled" ? "bad" : "warn"}>{x.status}</Pill></td></tr>)}</tbody></table></div>}</section>
  </>);
}

export function Edu({ api }: { api: Api }) {
  const l = useLoad<{ orgs: any[] }>(api, "/admin/edu/orgs"); const [name, setName] = useState(""); const [days, setDays] = useState("365"); const [seats, setSeats] = useState(""); const [msg, setMsg] = useState<{ kind: "good" | "bad"; text: string } | null>(null);
  const run = async (fn: () => Promise<any>, ok: (r: any) => string) => { try { const r = await fn(); setMsg(r.error ? { kind: "bad", text: r.error } : { kind: "good", text: ok(r) }); l.reload(); } catch (e) { setMsg({ kind: "bad", text: errText(e) }); } };
  return (<>
    <PageHead title={t.edu} />
    <section className="card"><h2>Yangi tashkilot</h2><p className="muted">Litsenziya shartnoma asosida beriladi. Shartnoma tugagach sinf ochish va yangi o'quvchi qo'shish to'xtaydi.</p>
      <div className="row"><label className="grow">Nomi<input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></label><label>Muddat (kun)<input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} /></label><label>O'rinlar (bo'sh = cheksiz)<input inputMode="numeric" value={seats} onChange={(e) => setSeats(e.target.value)} /></label>
        <button className="p" disabled={name.trim().length < 2} onClick={() => run(() => api.post("/admin/edu/orgs", { name, licenseUntil: Date.now() + Number(days) * 86_400_000, seats: num(seats) }), () => t.saved)}>Yaratish</button></div>
      {msg && <Banner kind={msg.kind}>{msg.text}</Banner>}</section>
    <section className="card"><h2>Tashkilotlar</h2><Err e={l.err} />{!l.data?.orgs.length ? <Empty loading={l.loading} /> : <div className="tw" tabIndex={0} role="region" aria-label="Jadval"><table><thead><tr><th>Nomi</th><th>Litsenziya</th><th className="num">O'rinlar</th><th className="num">O'qituvchi</th><th className="num">Sinf</th><th><span className="sr">Amal</span></th></tr></thead><tbody>{l.data.orgs.map((o) => (
      <tr key={o.id}><td><b>{o.name}</b></td><td>{o.active && o.licenseUntil > Date.now() ? <Pill kind="good">{fmtTime(o.licenseUntil)} gacha</Pill> : <Pill kind="bad">Tugagan</Pill>}</td><td className="num">{o.seats ?? "∞"}</td><td className="num">{o.teachers}</td><td className="num">{o.classes}</td>
        <td><div className="row"><button className="sm" onClick={() => run(() => api.post(`/admin/edu/orgs/${o.id}/invite`), (r) => `Taklif kodi: ${r.invite.code} (14 kun, bir marta)`)}>O'qituvchi kodi</button><button className="sm" onClick={() => run(() => api.post(`/admin/edu/orgs/${o.id}`, { licenseUntil: Math.max(Date.now(), o.licenseUntil) + 365 * 86_400_000 }), () => "Bir yilga uzaytirildi")}>+1 yil</button><button className="sm" onClick={() => run(() => api.post(`/admin/edu/orgs/${o.id}`, { active: !o.active }), () => t.saved)}>{o.active ? "To'xtatish" : "Yoqish"}</button></div></td></tr>))}</tbody></table></div>}</section>
  </>);
}

export function Tournaments({ api }: { api: Api }) {
  const l = useLoad<{ tournaments: any[] }>(api, "/admin/tournaments"); const blank = { title: "", sponsor: "", sponsorUrl: "", rules: "", prize: "", format: "", maxPlayers: "" };
  const [f, setF] = useState(blank); const [msg, setMsg] = useState<{ kind: "good" | "bad"; text: string } | null>(null);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const run = async (fn: () => Promise<any>) => { try { const r = await fn(); setMsg(r.error ? { kind: "bad", text: r.error } : { kind: "good", text: t.saved }); if (!r.error) setF(blank); l.reload(); } catch (e) { setMsg({ kind: "bad", text: errText(e) }); } };
  const next: Record<string, [string, string]> = { draft: ["open", "Ro'yxatni ochish"], open: ["running", "Boshlash"], running: ["finished", "Yakunlash"] };
  return (<>
    <PageHead title={t.tournaments} />
    <section className="card"><h2>Yangi turnir</h2><p className="muted">Sovrin va shartlar homiy bilan shartnomada; bu yerda faqat matn sifatida ko'rsatiladi. 16 yoshgacha o'yinchilarga homiy nomi ko'rsatilmaydi.</p>
      <div className="stack"><div className="row"><label className="grow">Nomi<input value={f.title} onChange={set("title")} maxLength={120} /></label><label className="grow">Homiy<input value={f.sponsor} onChange={set("sponsor")} maxLength={120} /></label><label className="grow">Homiy havolasi (https)<input value={f.sponsorUrl} onChange={set("sponsorUrl")} /></label></div>
        <div className="row"><label className="grow">Format<input value={f.format} onChange={set("format")} maxLength={300} /></label><label className="grow">Sovrin<input value={f.prize} onChange={set("prize")} maxLength={500} /></label><label>Ishtirokchilar chegarasi<input inputMode="numeric" value={f.maxPlayers} onChange={set("maxPlayers")} /></label></div>
        <label>Qoidalar<textarea style={{ minHeight: 100 }} value={f.rules} onChange={set("rules")} maxLength={4000} /></label>
        <div><button className="p" disabled={f.title.trim().length < 2} onClick={() => run(() => api.post("/admin/tournaments", { ...f, maxPlayers: num(f.maxPlayers), sponsorUrl: f.sponsorUrl || undefined, status: "draft" }))}>Qoralama sifatida saqlash</button></div>{msg && <Banner kind={msg.kind}>{msg.text}</Banner>}</div></section>
    <section className="card"><h2>Turnirlar</h2><Err e={l.err} />{!l.data?.tournaments.length ? <Empty loading={l.loading} /> : <div className="tw" tabIndex={0} role="region" aria-label="Jadval"><table><thead><tr><th>Nomi</th><th>Homiy</th><th>Holat</th><th className="num">Ishtirokchi</th><th><span className="sr">Amal</span></th></tr></thead><tbody>{l.data.tournaments.map((x) => (
      <tr key={x.id}><td><b>{x.title}</b></td><td>{x.sponsor || "—"}</td><td><Pill kind={x.status === "running" ? "good" : x.status === "open" ? "info" : "warn"}>{x.status}</Pill></td><td className="num">{x.players}{x.maxPlayers ? ` / ${x.maxPlayers}` : ""}</td>
        <td><div className="row">{next[x.status] && <button className="sm" onClick={() => run(() => api.post(`/admin/tournaments/${x.id}`, { status: next[x.status][0] }))}>{next[x.status][1]}</button>}<button className="sm d" onClick={() => run(() => api.delete(`/admin/tournaments/${x.id}`))}>O'chirish</button></div></td></tr>))}</tbody></table></div>}</section>
  </>);
}

