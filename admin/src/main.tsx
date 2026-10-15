import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Api, ApiError, SECTIONS, makeApi } from "./api";
import { t } from "./uz";

const css = `
:root{--navy:#082238;--green:#11835A;--red:#9E2A30;--bg:#F4F7F8;--line:#DCE3E8;--t2:#4A5B6C}
*{box-sizing:border-box}body{margin:0;font-family:Manrope,system-ui,sans-serif;background:var(--bg);color:var(--navy)}
header{display:flex;gap:12px;align-items:center;padding:12px 20px;background:#fff;border-bottom:1px solid var(--line)}
nav{display:flex;gap:6px;flex:1;flex-wrap:wrap}main{padding:20px;max-width:1100px;margin:auto}
button{min-height:44px;padding:0 16px;border-radius:10px;border:1px solid var(--line);background:#fff;font-weight:700;cursor:pointer;color:var(--navy)}
button.p{background:var(--green);color:#fff;border-color:var(--green)}button.on{border-color:var(--navy)}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid #1B3A6B;outline-offset:2px}
input,textarea,select{min-height:44px;padding:8px 12px;border:1px solid var(--line);border-radius:10px;font:inherit;width:100%}textarea{font-family:ui-monospace,monospace;min-height:260px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden}th,td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;font-size:14px}th{color:var(--t2)}
.card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:16px}.err{color:var(--red)}.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.stat{display:inline-block;min-width:150px;margin:0 16px 12px 0}.stat b{display:block;font-size:26px}`;

function useLoad<T>(api: Api, path: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null); const [err, setErr] = useState<string | null>(null);
  const seq = useRef(0); // eski javob yangisini bosib ketmasin (qidiruvda har belgi so'rov)
  const reload = useCallback(() => { const my = ++seq.current; api.get(path).then((d) => { if (my === seq.current) { setData(d); setErr(null); } }).catch((e: ApiError) => { if (my === seq.current) setErr(e.status === 403 ? t.forbidden : e.message); }); }, [api, path]);
  useEffect(() => { const h = setTimeout(reload, 200); return () => { clearTimeout(h); seq.current++; }; }, [reload, ...deps]); // 200 ms kechiktirish + unmount himoyasi
  return { data, err, reload };
}
const Err = ({ e }: { e: string | null }) => (e ? <p className="err" role="alert">{e}</p> : null);

function Content({ api }: { api: Api }) {
  const vs = useLoad<{ active: number; versions: any[] }>(api, "/admin/content/versions");
  const [part, setPart] = useState("dreams"); const [text, setText] = useState(""); const [note, setNote] = useState(""); const [msg, setMsg] = useState<string[]>([]);
  const load = async () => { const r = await api.get(`/admin/content/${part}`); setText(JSON.stringify(r.data, null, 1)); setMsg([]); };
  const create = async () => {
    let data; try { data = JSON.parse(text); } catch { return setMsg(["JSON xato"]); }
    const r = await api.post(`/admin/content/${part}/versions`, { data, note });
    if (r.ok) { setMsg([`${t.saved}: v${r.version}`]); vs.reload(); } else setMsg(r.problems ?? [r.error]);
  };
  return (<>
    <div className="card"><h2>{t.content}</h2><Err e={vs.err} />
      <table><thead><tr><th>{t.version}</th><th>{t.part}</th><th>{t.note}</th><th>{t.active}</th><th>Amal</th></tr></thead><tbody>
        {vs.data?.versions.map((v) => (<tr key={v.version}><td>v{v.version}</td><td>{v.part}</td><td>{v.note}</td><td>{vs.data!.active === v.version ? "✓" : ""}</td>
          <td>{vs.data!.active !== v.version && <button onClick={async () => { await api.post(`/admin/content/versions/${v.version}/publish`); vs.reload(); }}>{t.publish}</button>}</td></tr>))}
      </tbody></table></div>
    <div className="card"><div className="row"><label>{t.part}<select value={part} onChange={(e) => setPart(e.target.value)}><option>cellRules</option><option>dreams</option><option>bigBoard</option><option>cards</option></select></label>
      <button onClick={load}>{t.load}</button></div>
      <label>JSON<textarea aria-label="JSON" value={text} onChange={(e) => setText(e.target.value)} /></label>
      <label>{t.note}<input value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <p><button className="p" onClick={create} disabled={!text}>{t.create}</button></p>
      {msg.length > 0 && <div role="status"><b>{t.problems}:</b><ul>{msg.map((m, i) => <li key={i}>{m}</li>)}</ul></div>}</div></>);
}

function Rooms({ api }: { api: Api }) {
  const [q, setQ] = useState(""); const l = useLoad<any[]>(api, `/admin/rooms?q=${encodeURIComponent(q)}`);
  const [j, setJ] = useState<any[] | null>(null);
  return (<div className="card"><h2>{t.rooms}</h2><input aria-label={t.search} placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} /><Err e={l.err} />
    <table><thead><tr><th>Kod</th><th>Versiya</th><th>Aylana</th><th>O'yinchilar</th><th>Amal</th></tr></thead><tbody>{l.data?.map((r) => (
      <tr key={r.code}><td>{r.code}</td><td>{r.contentVersion ?? "—"}</td><td>{r.round ?? "—"}</td>
        <td>{Array.isArray(r.members) ? r.members.map((m: any) => m.userId).join(", ") : r.members}</td>
        <td><button onClick={async () => setJ(await api.get(`/admin/rooms/${r.code}/journal`).catch(() => []))}>{t.journal}</button></td></tr>))}</tbody></table>
    {j && <pre style={{ overflow: "auto", maxHeight: 300 }}>{JSON.stringify(j.slice(0, 50), null, 1)}</pre>}</div>);
}

function Users({ api }: { api: Api }) {
  const [q, setQ] = useState(""); const l = useLoad<any[]>(api, `/admin/users?q=${encodeURIComponent(q)}`);
  return (<div className="card"><h2>{t.users}</h2><input aria-label={t.search} placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} /><Err e={l.err} />
    <table><thead><tr><th>ID</th><th>Holat</th><th>Amal</th></tr></thead><tbody>{l.data?.map((u) => (<tr key={u.id}><td>{u.id}</td><td>{u.banned ? t.banned : ""}</td>
      <td><button onClick={async () => { await api.post(`/admin/users/${u.id}/${u.banned ? "unban" : "ban"}`, { reason: "admin" }); l.reload(); }}>{u.banned ? t.unban : t.ban}</button></td></tr>))}</tbody></table></div>);
}

function Complaints({ api }: { api: Api }) {
  const l = useLoad<any[]>(api, "/admin/complaints");
  return (<div className="card"><h2>{t.complaints}</h2><Err e={l.err} /><table><thead><tr><th>№</th><th>Kim</th><th>Matn</th><th>Amal</th></tr></thead><tbody>{l.data?.map((c) => (<tr key={c.id}><td>#{c.id}</td><td>{c.from} → {c.against ?? "—"}</td><td>{c.text}</td>
    <td>{c.status === "open" ? <button onClick={async () => { await api.post(`/admin/complaints/${c.id}/resolve`, { resolution: "ko'rib chiqildi" }); l.reload(); }}>{t.resolve}</button> : t.resolved}</td></tr>))}</tbody></table></div>);
}
function Analytics({ api }: { api: Api }) {
  const l = useLoad<any>(api, "/admin/analytics");
  const items: [string, string][] = l.data ? [["Xonalar", l.data.rooms], ["Boshlangan", l.data.started], ["Tugagan", l.data.finished], ["G'alaba ulushi", `${Math.round(l.data.winShare * 100)} %`], ["O'rtacha davomiylik (s)", Math.round(l.data.avgDurationSec)], ["O'rtacha aylana", l.data.avgRounds.toFixed(1)], ["Foydalanuvchilar", l.data.users]] : [];
  return (<div className="card"><h2>{t.analytics}</h2><Err e={l.err} />{items.map(([k, v]) => <span className="stat" key={k}>{k}<b>{v}</b></span>)}</div>);
}
function Audit({ api }: { api: Api }) {
  const l = useLoad<any[]>(api, "/admin/audit");
  return (<div className="card"><h2>{t.audit}</h2><Err e={l.err} /><table><thead><tr><th>Vaqt</th><th>Admin</th><th>Amal</th><th>Obyekt</th></tr></thead><tbody>{l.data?.slice().reverse().map((a, i) => (<tr key={i}><td>{new Date(a.at).toLocaleString("uz")}</td><td>{a.admin} ({a.role})</td><td>{a.action}</td><td>{a.target}</td></tr>))}</tbody></table></div>);
}

const VIEWS: Record<string, (p: { api: Api }) => React.ReactElement> = { content: Content, rooms: Rooms, users: Users, complaints: Complaints, analytics: Analytics, audit: Audit };

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("tok") ?? ""); const [role, setRole] = useState<string | null>(null);
  const [tab, setTab] = useState(""); const [err, setErr] = useState(false); const [input, setInput] = useState("");
  const api = React.useMemo(() => makeApi(token), [token]);
  useEffect(() => {
    if (!token) return;
    // Rolni aniqlash: har bir bo'lim uchun yengil so'rov; ruxsat bo'lganlari ko'rinadi
    (async () => {
      const probes: [string, string, string][] = [["administrator", "/admin/audit", "audit"], ["content_editor", "/admin/content/versions", "content"], ["support", "/admin/complaints", "complaints"], ["analyst", "/admin/analytics", "analytics"]];
      for (const [r, p] of probes) { try { await api.get(p); setRole(r); setTab(SECTIONS[r][0]); setErr(false); return; } catch (e) { if (!(e instanceof ApiError && e.status === 403)) break; } }
      setErr(true); sessionStorage.removeItem("tok"); setToken("");
    })();
  }, [token, api]);
  if (!token || !role) return (<main><h1>{t.title}</h1><form className="card" style={{ maxWidth: 420 }} onSubmit={(e) => { e.preventDefault(); sessionStorage.setItem("tok", input); setToken(input); }}>
    <label>{t.token}<input type="password" value={input} onChange={(e) => setInput(e.target.value)} /></label>
    <p><button className="p" type="submit">{t.login}</button></p>{err && <Err e={t.loginErr} />}</form></main>);
  const View = VIEWS[tab];
  return (<><header><b>{t.title}</b><nav>{SECTIONS[role].map((s) => <button key={s} className={s === tab ? "on" : ""} onClick={() => setTab(s)}>{(t as any)[s]}</button>)}</nav>
    <button onClick={() => { sessionStorage.removeItem("tok"); setToken(""); setRole(null); }}>{t.logout}</button></header><main>{View && <View api={api} />}</main></>);
}
const style = document.createElement("style"); style.textContent = css; document.head.append(style);
createRoot(document.getElementById("root")!).render(<App />);
