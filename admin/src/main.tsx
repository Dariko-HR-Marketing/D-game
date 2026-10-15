import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ApiError, makeApi, sectionsFor } from "./api";
import { AccountPage, Login, PasswordForm, TotpSetup } from "./auth";
import { Accounts } from "./accounts";
import { Complaints } from "./complaints";
import { Dashboard } from "./dash";
import { Analytics, Audit, Edu, Tournaments } from "./legacy";
import { Finance } from "./finance";
import { System } from "./system";
import { Content } from "./content";
import { Rooms } from "./games";
import { Banner, css, PageHead } from "./lib";
import { Users } from "./users";
import { t } from "./uz";

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("tok") ?? ""); const [me, setMe] = useState<any | null>(null); const [tab, setTab] = useState(""); const [bad, setBad] = useState(false);
  const api = useMemo(() => makeApi(token), [token]);
  const out = useCallback(() => { api.post("/admin/logout").catch(() => {}); sessionStorage.removeItem("tok"); setToken(""); setMe(null); }, [api]);
  const loadMe = useCallback(async () => { try { const j = await api.get("/admin/me"); setMe(j); setBad(false); } catch (e) { if (e instanceof ApiError && e.status === 401) { sessionStorage.removeItem("tok"); setToken(""); setMe(null); setBad(true); } } }, [api]);
  useEffect(() => { if (token) void loadMe(); }, [token, loadMe]);
  // sessiya tugasa (401) har qanday so'rovdan keyin chiqamiz: davriy tekshiruv
  useEffect(() => { if (!token) return; const h = setInterval(loadMe, 120_000); return () => clearInterval(h); }, [token, loadMe]);
  const nav = useMemo(() => (me ? sectionsFor(me.perms) : []), [me]);
  useEffect(() => { if (me && !tab && nav.length) setTab(nav[0].key); }, [me, nav, tab]);
  useEffect(() => { document.title = me && tab ? `${(t as any)[tab] ?? tab} · ${t.title}` : t.title; }, [me, tab]);
  if (!token || !me) return <Login onToken={(tk) => { sessionStorage.setItem("tok", tk); setBad(false); setToken(tk); }} />;
  if (bad) return null;
  if (me.restricted) return (<main className="login"><div className="card" style={{ maxWidth: 480, width: "100%" }}>
    <h1>{t.title}</h1>{me.restricted === "change_password" ? <><h2>Parolni almashtiring</h2><PasswordForm api={api} forced onDone={loadMe} /></> : <><h2>Ikki bosqichli tasdiq</h2><TotpSetup api={api} enabled={false} required onDone={loadMe} /></>}
    <p><button className="link" onClick={out}>{t.logout}</button></p></div></main>);
  const groups = [...new Set(nav.map((n) => n.group))]; const L = (k: string) => (t as any)[k] ?? k;
  const view = (() => {
    switch (tab) {
      case "dashboard": return <Dashboard api={api} go={setTab} />;
      case "users": return <Users api={api} />;
      case "complaints": return <Complaints api={api} me={me.account.id} />;
      case "rooms": return <Rooms api={api} perms={me.perms} />;
      case "content": return <Content api={api} perms={me.perms} />;
      case "shop": return <Finance api={api} perms={me.perms} />;
      case "system": return <System api={api} perms={me.perms} />;
      case "edu": return <Edu api={api} />;
      case "tournaments": return <Tournaments api={api} />;
      case "analytics": return <Analytics api={api} />;
      case "accounts": return <Accounts api={api} myId={me.account.id} />;
      case "audit": return <Audit api={api} />;
      case "me": return <AccountPage api={api} me={me} reload={loadMe} />;
      default: return <><PageHead title={L(tab)} /><Banner kind="info">Bu bo'lim keyingi bosqichda qo'shiladi.</Banner></>;
    }
  })();
  return (<div className="shell"><aside><div className="brand">{t.title}</div><div className="who">{me.account.name} · {t.roles[me.account.role] ?? me.account.role}</div>
    <nav aria-label="Bo'limlar">{groups.map((g) => <React.Fragment key={g}><div className="grp">{g}</div>{nav.filter((n) => n.group === g).map((n) => <button key={n.key} aria-current={n.key === tab ? "page" : undefined} onClick={() => setTab(n.key)}>{L(n.key)}</button>)}</React.Fragment>)}</nav>
    <button className="out" aria-current={tab === "me" ? "page" : undefined} onClick={() => setTab("me")}>Mening hisobim</button><button className="out" style={{ marginTop: 0 }} onClick={out}>{t.logout}</button></aside>
    <main>{view}</main></div>);
}
const style = document.createElement("style"); style.textContent = css; document.head.append(style);
createRoot(document.getElementById("root")!).render(<App />);
