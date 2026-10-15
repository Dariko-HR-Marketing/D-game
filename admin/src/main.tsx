import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Api, ApiError, SECTIONS, makeApi } from "./api";
import { t } from "./uz";

const css = `
:root{--navy:#082238;--green:#11835A;--green-t:#0E6B4A;--red:#9E2A30;--gold:#F2B233;--bg:#F4F7F8;--line:#DCE3E8;--t2:#4A5B6C;--warn:#8A5A00;--s-good:#E7F4EE;--s-bad:#F8E8E9;--s-warn:#FFF6DD;--s-info:#E8F0F8}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;font-family:Manrope,system-ui,sans-serif;background:var(--bg);color:var(--navy);line-height:1.45}
h1,h2,h3{margin:0}h2{font-size:20px}h3{font-size:16px}
.shell{display:grid;grid-template-columns:230px 1fr;min-height:100vh}
aside{background:var(--navy);color:#fff;padding:20px 14px;display:flex;flex-direction:column;gap:18px;position:sticky;top:0;height:100vh}
aside .brand{font-weight:800;letter-spacing:1px;font-size:17px;padding:0 8px}aside .who{font-size:12px;color:#C9D6E2;padding:0 8px}
nav{display:flex;flex-direction:column;gap:4px}
nav button{justify-content:flex-start;text-align:left;background:transparent;color:#fff;border:0;min-height:44px;padding:0 12px;border-radius:10px;font-weight:700}
nav button:hover{background:rgba(255,255,255,.1)}nav button[aria-current=page]{background:#fff;color:var(--navy)}
aside .out{margin-top:auto;background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4)}
main{padding:28px;max-width:1180px;width:100%;min-width:0}main.login{max-width:none;padding:20px}
.page-h{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;flex-wrap:wrap}
button{font:inherit;min-height:44px;padding:0 16px;border-radius:10px;border:1px solid var(--line);background:#fff;font-weight:700;cursor:pointer;color:var(--navy)}
button:hover:not(:disabled){border-color:var(--navy)}button:disabled{opacity:.5;cursor:not-allowed}
button.p{background:var(--green);color:#fff;border-color:var(--green)}button.d{background:var(--red);color:#fff;border-color:var(--red)}button.sm{min-height:36px;padding:0 12px;font-size:14px}
:is(button,input,textarea,select,a,summary):focus-visible{outline:3px solid #1B3A6B;outline-offset:2px}
input,select,textarea{font:inherit;min-height:44px;border:1px solid var(--line);border-radius:10px;padding:8px 12px;background:#fff;color:var(--navy);width:100%}
textarea{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;min-height:320px;line-height:1.5;resize:vertical}
label{display:flex;flex-direction:column;gap:6px;font-weight:700;font-size:14px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px;margin-bottom:18px;box-shadow:0 2px 8px rgba(8,34,56,.05)}.card>h2{margin-bottom:12px}
.row{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap}.grow{flex:1;min-width:200px}.stack{display:flex;flex-direction:column;gap:12px}
.tw{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--t2);font-size:12px;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
tr:last-child td{border-bottom:0}td.num{text-align:right;font-variant-numeric:tabular-nums}.mono{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--t2)}.muted{color:var(--t2)}
.pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:800}.pill.good{background:var(--s-good);color:var(--green-t)}.pill.bad{background:var(--s-bad);color:var(--red)}.pill.warn{background:var(--s-warn);color:var(--warn)}.pill.info{background:var(--s-info);color:var(--navy)}
.banner{border-radius:10px;padding:10px 14px;font-weight:700;font-size:14px}.banner.good{background:var(--s-good);color:var(--green-t)}.banner.bad{background:var(--s-bad);color:var(--red)}.banner.warn{background:var(--s-warn);color:var(--warn)}.banner ul{margin:6px 0 0;padding-left:20px;font-weight:600}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px}.stat{background:var(--bg);border-radius:12px;padding:14px}.stat b{display:block;font-size:26px}.stat span{font-size:12px;color:var(--t2);font-weight:700}
.bar{height:10px;border-radius:999px;background:var(--line);overflow:hidden;min-width:80px}.bar i{display:block;height:100%;background:var(--green)}
dialog{border:0;border-radius:16px;padding:24px;max-width:480px;width:calc(100% - 32px);box-shadow:0 20px 60px rgba(8,34,56,.35);color:var(--navy)}dialog::backdrop{background:rgba(8,34,56,.5)}
dialog form{display:flex;flex-direction:column;gap:14px}dialog menu{display:flex;gap:10px;justify-content:flex-end;margin:0;padding:0}
.login{min-height:100vh;display:grid;place-items:center;padding:20px}.login .card{max-width:420px;width:100%}
.sr{position:absolute;left:-9999px}
@media(max-width:820px){.shell{grid-template-columns:1fr}aside{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center;padding:10px 12px;gap:8px}aside .who{display:none}nav{flex-direction:row;overflow-x:auto;flex:1 1 100%;order:3}nav button{white-space:nowrap}aside .out{margin:0 0 0 auto}main{padding:16px}}
`;

const fmtTime = (ms?: number) => (ms ? new Date(ms).toLocaleString("uz", { dateStyle: "short", timeStyle: "short" }) : "—");
const fmtDur = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)} s ${Math.round((s % 3600) / 60)} daq` : `${Math.round(s / 60)} daq`);
const errText = (e: unknown) => (e instanceof ApiError ? (e.status === 403 ? t.forbidden : e.body?.error ?? e.message) : String(e));

function useLoad<T>(api: Api, path: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null); const [err, setErr] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const seq = useRef(0); // eski javob yangisini bosib ketmasin (qidiruvda har belgi so'rov)
  const reload = useCallback(() => { const my = ++seq.current; setLoading(true); api.get(path).then((d) => { if (my === seq.current) { setData(d); setErr(null); setLoading(false); } }).catch((e) => { if (my === seq.current) { setErr(errText(e)); setLoading(false); } }); }, [api, path]);
  useEffect(() => { const h = setTimeout(reload, 200); return () => { clearTimeout(h); seq.current++; }; }, [reload, ...deps]); // 200 ms kechiktirish + unmount himoyasi
  return { data, err, loading, reload };
}
const Banner = ({ kind, children }: { kind: "good" | "bad" | "warn"; children: React.ReactNode }) => <div className={`banner ${kind}`} role={kind === "bad" ? "alert" : "status"}>{children}</div>;
const Pill = ({ kind, children }: { kind: "good" | "bad" | "warn" | "info"; children: React.ReactNode }) => <span className={`pill ${kind}`}>{children}</span>;
const Err = ({ e }: { e: string | null }) => (e ? <Banner kind="bad">{e}</Banner> : null);
const PageHead = ({ title, children }: { title: string; children?: React.ReactNode }) => <div className="page-h"><h1 style={{ fontSize: 26 }}>{title}</h1><div className="row">{children}</div></div>;
const Empty = ({ loading }: { loading: boolean }) => <p className="muted" role="status">{loading ? t.loading : t.empty}</p>;

/** Tasdiqlash oynasi (<dialog>: fokus tuzog'i va Esc brauzer tomonidan). `reason` — majburiy sabab maydoni. */
function Confirm({ open, title, body, danger, reason, onClose, onOk }: { open: boolean; title: string; body?: string; danger?: boolean; reason?: string; onClose: () => void; onOk: (reason: string) => void | Promise<void> }) {
  const ref = useRef<HTMLDialogElement>(null); const [r, setR] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) { setR(""); d.showModal(); } if (!open && d.open) d.close(); }, [open]);
  return (
    <dialog ref={ref} aria-labelledby="dlg-t" onClose={onClose}>
      <form method="dialog" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await onOk(r.trim()); } finally { setBusy(false); } }}>
        <h2 id="dlg-t">{title}</h2>{body && <p className="muted" style={{ margin: 0 }}>{body}</p>}
        {reason && <label>{reason}<input value={r} onChange={(e) => setR(e.target.value)} autoFocus required minLength={3} maxLength={300} /></label>}
        <menu><button type="button" onClick={onClose}>{t.cancel}</button><button type="submit" className={danger ? "d" : "p"} disabled={busy || (!!reason && r.trim().length < 3)}>{t.confirm}</button></menu>
      </form>
    </dialog>
  );
}

function Content({ api }: { api: Api }) {
  const vs = useLoad<{ active: number; versions: any[] }>(api, "/admin/content/versions");
  const [part, setPart] = useState("cellRules"); const [text, setText] = useState(""); const [orig, setOrig] = useState(""); const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ kind: "good" | "bad"; lines: string[] } | null>(null); const [pub, setPub] = useState<number | null>(null); const [loadErr, setLoadErr] = useState<string | null>(null);
  const load = useCallback(async (p: string) => { setLoadErr(null); try { const r = await api.get(`/admin/content/${p}`); const s = JSON.stringify(r.data, null, 1); setText(s); setOrig(s); setMsg(null); } catch (e) { setLoadErr(errText(e)); } }, [api]);
  useEffect(() => { void load(part); }, [part, load]);
  let parsed: { ok: true } | { ok: false; error: string } = { ok: true }; try { JSON.parse(text || "null"); } catch (e) { parsed = { ok: false, error: (e as Error).message }; }
  const changed = text !== orig;
  const create = async () => {
    const r = await api.post(`/admin/content/${part}/versions`, { data: JSON.parse(text), note });
    if (r.ok) { setMsg({ kind: "good", lines: [`${t.saved}: v${r.version}. «${t.publish}» tugmasi bilan yoqing.`] }); setNote(""); vs.reload(); } else setMsg({ kind: "bad", lines: r.problems ?? [r.error] });
  };
  return (<>
    <PageHead title={t.content} />
    <section className="card" aria-labelledby="vh"><h2 id="vh">Versiyalar</h2><Err e={vs.err} />
      <div className="tw"><table><thead><tr><th>{t.version}</th><th>{t.part}</th><th>{t.note}</th><th>Muallif</th><th>Sana</th><th>Holat</th><th><span className="sr">Amal</span></th></tr></thead><tbody>
        {vs.data?.versions.slice().reverse().map((v) => { const on = vs.data!.active === v.version; return (
          <tr key={v.version}><td><b>v{v.version}</b></td><td>{t.parts[v.part]?.[0] ?? v.part}</td><td>{v.note || "—"}</td><td className="mono">{v.author}</td><td className="muted">{fmtTime(v.at)}</td>
            <td>{on ? <Pill kind="good">{t.active}</Pill> : v.published ? <Pill kind="info">Eski</Pill> : <Pill kind="warn">Qoralama</Pill>}</td>
            <td>{!on && <button className="sm" onClick={() => setPub(v.version)}>{t.publish}</button>}</td></tr>); })}
      </tbody></table></div>{!vs.data && <Empty loading={vs.loading} />}</section>

    <section className="card" aria-labelledby="eh"><h2 id="eh">Tahrirlash</h2>
      <div className="stack">
        <div className="row"><label className="grow">{t.part}<select value={part} onChange={(e) => setPart(e.target.value)}>{Object.entries(t.parts).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></label>
          <button onClick={() => load(part)} disabled={!changed}>Asl holatga qaytarish</button></div>
        <p className="muted" style={{ margin: 0 }}>{t.parts[part]?.[1]}</p>
        <Err e={loadErr} />
        <label>JSON<textarea aria-describedby="jstat" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} /></label>
        <div id="jstat" role="status" className="muted">{parsed.ok ? (changed ? <Pill kind="warn">O'zgartirilgan</Pill> : <Pill kind="info">O'zgarishsiz</Pill>) : <Banner kind="bad">JSON xato: {parsed.error}</Banner>}</div>
        <label>{t.note}<input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} /></label>
        <div><button className="p" onClick={create} disabled={!text || !parsed.ok || !changed}>{t.create}</button></div>
        {msg && <Banner kind={msg.kind}>{msg.kind === "bad" ? <><b>{t.problems}:</b><ul>{msg.lines.map((m, i) => <li key={i}>{m}</li>)}</ul></> : msg.lines[0]}</Banner>}
      </div>
    </section>
    <Confirm open={pub !== null} title={`v${pub} ni nashr qilish`} body={t.publishWarn} onClose={() => setPub(null)} onOk={async () => { await api.post(`/admin/content/versions/${pub}/publish`); setPub(null); vs.reload(); }} />
  </>);
}

function Journal({ api, code, onClose }: { api: Api; code: string; onClose: () => void }) {
  const l = useLoad<any[]>(api, `/admin/rooms/${code}/journal`);
  const label = (a: any) => (a.action?.type === "auto" ? `auto (${a.action.reason}): ${a.action.action?.type}` : a.action?.type);
  return (
    <section className="card" aria-labelledby="jh"><div className="page-h" style={{ marginBottom: 8 }}><h2 id="jh">{t.journal}: <span className="mono">{code}</span></h2><button onClick={onClose}>{t.close}</button></div>
      <Err e={l.err} />{!l.data?.length ? <Empty loading={l.loading} /> : <div className="tw" style={{ maxHeight: 420, overflowY: "auto" }}><table><thead><tr><th>№</th><th>Vaqt</th><th>Harakat</th><th>Kim</th></tr></thead><tbody>
        {l.data.slice(0, 300).map((e) => (<tr key={e.seq}><td className="num">{e.seq}</td><td className="muted">{fmtTime(e.at)}</td><td>{label(e)}</td><td className="mono">{e.action?.playerId ?? e.action?.action?.playerId ?? "server"}</td></tr>))}</tbody></table></div>}
      {l.data && l.data.length > 300 && <p className="muted">Birinchi 300 ta yozuv ko'rsatildi (jami {l.data.length}).</p>}</section>
  );
}

function Rooms({ api }: { api: Api }) {
  const [q, setQ] = useState(""); const l = useLoad<any[]>(api, `/admin/rooms?q=${encodeURIComponent(q)}`); const [j, setJ] = useState<string | null>(null);
  const status = (r: any) => (r.ended ? <Pill kind="info">Tugagan</Pill> : r.started ? <Pill kind="good">O'yinda</Pill> : <Pill kind="warn">Kutmoqda</Pill>);
  return (<>
    <PageHead title={t.rooms}><label style={{ minWidth: 260 }}><span className="sr">{t.search}</span><input type="search" aria-label={t.search} placeholder="Kod yoki o'yinchi" value={q} onChange={(e) => setQ(e.target.value)} /></label></PageHead>
    <section className="card"><Err e={l.err} />{!l.data?.length ? <Empty loading={l.loading} /> : <div className="tw"><table><thead><tr><th>Kod</th><th>Holat</th><th>Kontent</th><th>Aylana</th><th>O'yinchilar</th><th><span className="sr">Amal</span></th></tr></thead><tbody>{l.data.map((r) => (
      <tr key={r.code}><td><b className="mono" style={{ fontSize: 14 }}>{r.code}</b></td><td>{status(r)}</td><td>v{r.contentVersion ?? "—"}</td><td className="num">{r.round ?? "—"}</td>
        <td>{Array.isArray(r.members) ? r.members.map((m: any) => (m.bot ? "Bot" : m.name ?? m.userId) + (m.online || m.bot ? "" : " (oflayn)")).join(", ") : `${r.members} ta`}</td>
        <td><button className="sm" onClick={() => setJ(r.code)}>{t.journal}</button></td></tr>))}</tbody></table></div>}</section>
    {j && <Journal api={api} code={j} onClose={() => setJ(null)} />}
  </>);
}

function Users({ api }: { api: Api }) {
  const [q, setQ] = useState(""); const l = useLoad<any[]>(api, `/admin/users?q=${encodeURIComponent(q)}`); const [target, setTarget] = useState<any | null>(null);
  return (<>
    <PageHead title={t.users}><label style={{ minWidth: 260 }}><span className="sr">{t.search}</span><input type="search" aria-label={t.search} placeholder="Ism yoki ID" value={q} onChange={(e) => setQ(e.target.value)} /></label></PageHead>
    <section className="card"><Err e={l.err} />{!l.data?.length ? <Empty loading={l.loading} /> : <div className="tw"><table><thead><tr><th>Ism</th><th>ID</th><th>Birinchi kirish</th><th>Oxirgi faollik</th><th>Holat</th><th><span className="sr">Amal</span></th></tr></thead><tbody>{l.data.map((u) => (
      <tr key={u.id}><td><b>{u.name ?? "—"}</b></td><td className="mono">{u.id}</td><td className="muted">{fmtTime(u.firstSeen)}</td><td className="muted">{fmtTime(u.lastSeen)}</td>
        <td>{u.banned ? <><Pill kind="bad">{t.banned}</Pill>{u.banReason && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{u.banReason}</div>}</> : <Pill kind="good">Faol</Pill>}</td>
        <td><button className="sm" onClick={() => setTarget(u)}>{u.banned ? t.unban : t.ban}</button></td></tr>))}</tbody></table></div>}</section>
    <Confirm open={!!target} danger={!target?.banned} title={target?.banned ? `${target?.name ?? target?.id}: blokdan chiqarish` : `${target?.name ?? target?.id}: bloklash`} body={target?.banned ? undefined : t.banWarn} reason={target?.banned ? undefined : t.reason}
      onClose={() => setTarget(null)} onOk={async (reason) => { await api.post(`/admin/users/${target.id}/${target.banned ? "unban" : "ban"}`, { reason: reason || "admin" }); setTarget(null); l.reload(); }} />
  </>);
}

function Complaints({ api }: { api: Api }) {
  const l = useLoad<any[]>(api, "/admin/complaints"); const [onlyOpen, setOnlyOpen] = useState(true); const [target, setTarget] = useState<any | null>(null);
  const rows = (l.data ?? []).filter((c) => !onlyOpen || c.status === "open").slice().reverse();
  return (<>
    <PageHead title={t.complaints}><label className="row" style={{ flexDirection: "row", alignItems: "center", gap: 8, fontWeight: 600 }}><input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />Faqat ochiqlar</label></PageHead>
    <section className="card"><Err e={l.err} />{!rows.length ? <Empty loading={l.loading} /> : <div className="tw"><table><thead><tr><th>№</th><th>Vaqt</th><th>Kimdan → kimga</th><th>Xona</th><th>Matn</th><th>Holat</th><th><span className="sr">Amal</span></th></tr></thead><tbody>{rows.map((c) => (
      <tr key={c.id}><td>#{c.id}</td><td className="muted">{fmtTime(c.at)}</td><td className="mono">{c.from} → {c.against ?? "—"}</td><td className="mono">{c.room ?? "—"}</td><td style={{ maxWidth: 360 }}>{c.text}</td>
        <td>{c.status === "open" ? <Pill kind="warn">{t.open}</Pill> : <><Pill kind="good">{t.resolved}</Pill><div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{c.resolution}</div></>}</td>
        <td>{c.status === "open" && <button className="sm" onClick={() => setTarget(c)}>{t.resolve}</button>}</td></tr>))}</tbody></table></div>}</section>
    <Confirm open={!!target} title={`Shikoyat #${target?.id}`} body={target?.text} reason="Qaror / izoh" onClose={() => setTarget(null)} onOk={async (resolution) => { await api.post(`/admin/complaints/${target.id}/resolve`, { resolution }); setTarget(null); l.reload(); }} />
  </>);
}

function Analytics({ api }: { api: Api }) {
  const a = useLoad<any>(api, "/admin/analytics"); const f = useLoad<any>(api, "/admin/analytics/funnel");
  const d = a.data, fd = f.data;
  const tiles: [string, string][] = d ? [["Xonalar", d.rooms], ["Boshlangan o'yinlar", d.started], ["Tugagan o'yinlar", d.finished], ["Tugatilgan ulush", `${Math.round(d.finishedShare * 100)} %`], ["O'rtacha davomiylik", fmtDur(d.avgDurationSec)], ["O'rtacha aylana", d.avgRounds.toFixed(1)], ["Foydalanuvchilar", d.users]] : [];
  const steps: [string, number][] = fd ? [["Kirgan", fd.registered], ["Profil to'ldirgan", fd.withProfile], ["Birinchi o'yin", fd.playedFirstGame], ["3 va undan ko'p o'yin", fd.playedThreeOrMore], ["Kamida bir g'alaba", fd.wonAtLeastOnce]] : [];
  return (<>
    <PageHead title={t.analytics} />
    <section className="card" aria-labelledby="ah"><h2 id="ah">Umumiy ko'rsatkichlar</h2><Err e={a.err} />{!d ? <Empty loading={a.loading} /> : <div className="stats">{tiles.map(([k, v]) => <div className="stat" key={k}><b>{v}</b><span>{k}</span></div>)}</div>}</section>
    <section className="card" aria-labelledby="fh"><h2 id="fh">Voronka: kirishdan g'alabagacha</h2><Err e={f.err} />{!fd ? <Empty loading={f.loading} /> : <>
      <div className="tw"><table><thead><tr><th>Bosqich</th><th className="num">Soni</th><th>Kirganlardan</th></tr></thead><tbody>{steps.map(([k, v]) => { const pct = fd.registered ? Math.round((100 * v) / fd.registered) : 0; return (
        <tr key={k}><td>{k}</td><td className="num"><b>{v}</b></td><td style={{ minWidth: 180 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="bar" role="img" aria-label={`${pct} %`}><i style={{ width: `${pct}%` }} /></div><span style={{ width: 44 }}>{pct} %</span></div></td></tr>); })}</tbody></table></div>
      <p className="muted">Tugagan o'yinlar: {fd.gamesFinished} · g'olibli: {Math.round(fd.winShare * 100)} %</p></>}</section>
  </>);
}

function Audit({ api }: { api: Api }) {
  const l = useLoad<any[]>(api, "/admin/audit");
  return (<>
    <PageHead title={t.audit}><button onClick={l.reload}>Yangilash</button></PageHead>
    <section className="card"><Err e={l.err} />{!l.data?.length ? <Empty loading={l.loading} /> : <div className="tw"><table><thead><tr><th>Vaqt</th><th>Admin</th><th>Rol</th><th>Amal</th><th>Obyekt</th><th>Tafsilot</th></tr></thead><tbody>{l.data.slice().reverse().map((a, i) => (
      <tr key={i}><td className="muted">{fmtTime(a.at)}</td><td className="mono">{a.admin}</td><td>{t.roles[a.role] ?? a.role}</td><td>{String(a.action).endsWith(":failed") ? <Pill kind="bad">{a.action}</Pill> : <b>{a.action}</b>}</td><td className="mono">{a.target ?? "—"}</td>
        <td className="mono" style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.detail ? JSON.stringify(a.detail) : ""}>{a.detail ? JSON.stringify(a.detail) : "—"}</td></tr>))}</tbody></table></div>}</section>
  </>);
}

const VIEWS: Record<string, (p: { api: Api }) => React.ReactElement> = { content: Content, rooms: Rooms, users: Users, complaints: Complaints, analytics: Analytics, audit: Audit };

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("tok") ?? ""); const [role, setRole] = useState<string | null>(null);
  const [tab, setTab] = useState(""); const [err, setErr] = useState(false); const [input, setInput] = useState(""); const [checking, setChecking] = useState(false);
  const api = React.useMemo(() => makeApi(token), [token]);
  useEffect(() => {
    if (!token) return; setChecking(true);
    // Rolni aniqlash: har bir bo'lim uchun yengil so'rov; ruxsat bo'lganlari ko'rinadi
    (async () => {
      const probes: [string, string][] = [["administrator", "/admin/audit"], ["content_editor", "/admin/content/versions"], ["support", "/admin/complaints"], ["analyst", "/admin/analytics"]];
      for (const [r, p] of probes) { try { await api.get(p); setRole(r); setTab(SECTIONS[r][0]); setErr(false); setChecking(false); return; } catch (e) { if (!(e instanceof ApiError && e.status === 403)) break; } }
      setErr(true); setChecking(false); sessionStorage.removeItem("tok"); setToken("");
    })();
  }, [token, api]);
  useEffect(() => { document.title = role && tab ? `${(t as any)[tab]} · ${t.title}` : t.title; }, [role, tab]);
  if (!token || !role) return (<main className="login"><form className="card" onSubmit={(e) => { e.preventDefault(); sessionStorage.setItem("tok", input); setToken(input); }}>
    <h1 style={{ marginBottom: 4 }}>{t.title}</h1><p className="muted" style={{ marginTop: 0 }}>{t.loginHint}</p>
    <div className="stack"><label>{t.token}<input type="password" autoComplete="current-password" value={input} onChange={(e) => setInput(e.target.value)} autoFocus /></label>
      <button className="p" type="submit" disabled={!input || checking}>{checking ? t.loading : t.login}</button>{err && <Banner kind="bad">{t.loginErr}</Banner>}</div></form></main>);
  const View = VIEWS[tab];
  return (<div className="shell"><aside><div className="brand">{t.title}</div><div className="who">{t.roles[role]}</div>
    <nav aria-label="Bo'limlar">{SECTIONS[role].map((s) => <button key={s} aria-current={s === tab ? "page" : undefined} onClick={() => setTab(s)}>{(t as any)[s]}</button>)}</nav>
    <button className="out" onClick={() => { sessionStorage.removeItem("tok"); setToken(""); setRole(null); }}>{t.logout}</button></aside>
    <main>{View && <View api={api} />}</main></div>);
}
const style = document.createElement("style"); style.textContent = css; document.head.append(style);
createRoot(document.getElementById("root")!).render(<App />);
