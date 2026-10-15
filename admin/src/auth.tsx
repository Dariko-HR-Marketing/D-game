// Kirish (login + parol + 2FA kodi), majburiy parol almashtirish / 2FA yoqish va «Mening hisobim» sahifasi.
import React, { useState } from "react";
import { Api, ApiError, API } from "./api";
import { Banner, Confirm, Empty, Err, PageHead, Pill, errText, fmtTime, useLoad } from "./lib";
import { t } from "./uz";

export function Login({ onToken }: { onToken: (tok: string) => void }) {
  const [login, setLogin] = useState(""); const [pw, setPw] = useState(""); const [totp, setTotp] = useState(""); const [needTotp, setNeedTotp] = useState(false);
  const [legacy, setLegacy] = useState(false); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      if (legacy) { onToken(pw); return; }
      const r = await fetch(API + "/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ login, password: pw, totp: needTotp ? totp : undefined }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { onToken(j.token); return; }
      if (j.error === "totp_required") { setNeedTotp(true); return; }
      setErr(errText(new ApiError(r.status, j)));
    } catch { setErr("Server bilan aloqa yo'q"); } finally { setBusy(false); }
  };
  return (<main className="login"><form className="card" onSubmit={submit} aria-labelledby="lt">
    <h1 id="lt" style={{ marginBottom: 4 }}>{t.title}</h1><p className="muted" style={{ marginTop: 0 }}>{legacy ? t.loginHint : "Shaxsiy hisobingiz bilan kiring."}</p>
    <div className="stack">
      {!legacy && <label>Login<input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoFocus required /></label>}
      <label>{legacy ? t.token : "Parol"}<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={legacy ? "off" : "current-password"} required /></label>
      {needTotp && !legacy && <label>Tasdiqlash kodi (6 raqam)<input inputMode="numeric" pattern="\d{6}" maxLength={6} value={totp} onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))} autoComplete="one-time-code" autoFocus required /></label>}
      <button className="p" type="submit" disabled={busy || !pw || (!legacy && !login) || (needTotp && totp.length !== 6)}>{busy ? t.loading : t.login}</button>
      {err && <Banner kind="bad">{err}</Banner>}
      <button type="button" className="link" onClick={() => { setLegacy(!legacy); setErr(null); setNeedTotp(false); }}>{legacy ? "Login va parol bilan kirish" : "Token bilan kirish (vaqtincha)"}</button>
    </div></form></main>);
}

/** Parol almashtirish formasi (majburiy rejimda ham, hisob sahifasida ham). */
export function PasswordForm({ api, onDone, forced }: { api: Api; onDone: () => void; forced?: boolean }) {
  const [cur, setCur] = useState(""); const [next, setNext] = useState(""); const [rep, setRep] = useState(""); const [err, setErr] = useState<string | null>(null); const [ok, setOk] = useState(false);
  const go = async (e: React.FormEvent) => { e.preventDefault(); setErr(null); try { await api.post("/admin/me/password", { current: cur, next }); setOk(true); setCur(""); setNext(""); setRep(""); onDone(); } catch (x) { setErr(errText(x)); } };
  return (<form onSubmit={go} className="stack" aria-label="Parolni almashtirish">
    {forced && <Banner kind="warn">Xavfsizlik uchun avval parolni almashtiring.</Banner>}
    <label>Joriy parol<input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required /></label>
    <label>Yangi parol<input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required minLength={10} /><span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>Kamida 10 belgi, harf va raqam.</span></label>
    <label>Yangi parolni takrorlang<input type="password" value={rep} onChange={(e) => setRep(e.target.value)} autoComplete="new-password" required /></label>
    <div><button className="p" type="submit" disabled={!cur || next.length < 10 || next !== rep}>Parolni almashtirish</button></div>
    {rep && next !== rep && <Banner kind="bad">Parollar mos emas</Banner>}{err && <Banner kind="bad">{err}</Banner>}{ok && !forced && <Banner kind="good">{t.saved}. Boshqa qurilmalardagi sessiyalar yopildi.</Banner>}
  </form>);
}

export function TotpSetup({ api, enabled, required, onDone }: { api: Api; enabled: boolean; required?: boolean; onDone: () => void }) {
  const [info, setInfo] = useState<{ secret: string; uri: string } | null>(null); const [code, setCode] = useState(""); const [err, setErr] = useState<string | null>(null);
  const [pw, setPw] = useState(""); const [off, setOff] = useState(false);
  if (enabled) return (<div className="stack"><p><Pill kind="good">Yoqilgan</Pill> Kirishda tasdiqlash kodi so'raladi.</p>
    {!required && !off && <div><button onClick={() => setOff(true)}>O'chirish…</button></div>}
    {off && <form className="stack" onSubmit={async (e) => { e.preventDefault(); setErr(null); try { await api.post("/admin/me/totp/disable", { password: pw, code }); onDone(); } catch (x) { setErr(errText(x)); } }}>
      <label>Parol<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="current-password" /></label>
      <label>Joriy kod<input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required /></label>
      <div className="row"><button type="button" onClick={() => setOff(false)}>{t.cancel}</button><button className="d" type="submit" disabled={code.length !== 6 || !pw}>2FA ni o'chirish</button></div>{err && <Banner kind="bad">{err}</Banner>}</form>}
    {required && <p className="muted">Bu tizimda 2FA majburiy.</p>}</div>);
  return (<div className="stack">
    {required && <Banner kind="warn">Davom etish uchun ikki bosqichli tasdiqni yoqing.</Banner>}
    {!info ? <div><button className="p" onClick={async () => { setErr(null); try { setInfo(await api.post("/admin/me/totp/setup")); } catch (x) { setErr(errText(x)); } }}>2FA ni sozlash</button></div> : (<>
      <p>Autentifikator ilovasida (Google Authenticator, Aegis, 1Password) yangi hisob qo'shing va quyidagi kalitni kiriting:</p>
      <p><code className="mono" style={{ fontSize: 15, userSelect: "all", wordBreak: "break-all" }}>{info.secret}</code></p>
      <p className="muted" style={{ fontSize: 12 }}>Vaqtga asoslangan (TOTP), 6 raqam, 30 soniya. Havola: <span className="mono" style={{ wordBreak: "break-all" }}>{info.uri}</span></p>
      <form className="row" onSubmit={async (e) => { e.preventDefault(); setErr(null); try { await api.post("/admin/me/totp/enable", { code }); onDone(); } catch (x) { setErr(errText(x)); } }}>
        <label className="grow">Ilovadagi kod<input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoComplete="one-time-code" required /></label>
        <button className="p" type="submit" disabled={code.length !== 6}>Yoqish</button></form></>)}
    {err && <Banner kind="bad">{err}</Banner>}</div>);
}

export function AccountPage({ api, me, reload }: { api: Api; me: any; reload: () => void }) {
  const s = useLoad<{ sessions: any[] }>(api, "/admin/me/sessions"); const [kill, setKill] = useState<string | null>(null); const a = me.account;
  return (<>
    <PageHead title="Mening hisobim" />
    <section className="card"><h2>Ma'lumotlar</h2><dl className="kv"><dt>Ism</dt><dd>{a.name}</dd><dt>Login</dt><dd className="mono">{a.login}</dd><dt>Rol</dt><dd>{t.roles[a.role] ?? a.role}</dd><dt>Oxirgi kirish</dt><dd>{fmtTime(a.lastLogin)}</dd></dl></section>
    {a.legacy ? <Banner kind="warn">Siz vaqtincha token bilan kirgansiz. Shaxsiy hisob uchun administratorga murojaat qiling.</Banner> : (<div className="grid2">
      <section className="card"><h2>Parol</h2><PasswordForm api={api} onDone={() => { reload(); s.reload(); }} /></section>
      <section className="card"><h2>Ikki bosqichli tasdiq (2FA)</h2><TotpSetup api={api} enabled={a.totpEnabled} required={me.require2fa} onDone={reload} /></section></div>)}
    {!a.legacy && <section className="card"><h2>Faol sessiyalar</h2><Err e={s.err} />{!s.data?.sessions.length ? <Empty loading={false} /> : <div className="tw" tabIndex={0} role="region" aria-label="Jadval"><table><thead><tr><th>Boshlangan</th><th>Oxirgi harakat</th><th>IP</th><th>Brauzer</th><th><span className="sr">Amal</span></th></tr></thead><tbody>{s.data.sessions.map((x) => (
      <tr key={x.full}><td>{fmtTime(x.createdAt)} {x.current && <Pill kind="good">Joriy</Pill>}</td><td>{fmtTime(x.lastSeen)}</td><td className="mono">{x.ip}</td><td className="muted" style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>{x.ua}</td><td>{!x.current && <button className="sm" onClick={() => setKill(x.full)}>Yopish</button>}</td></tr>))}</tbody></table></div>}</section>}
    <Confirm open={kill !== null} danger title="Sessiyani yopish" body="Shu qurilmadan chiqariladi." onClose={() => setKill(null)} onOk={async () => { await api.delete(`/admin/me/sessions/${kill}`); setKill(null); s.reload(); }} />
  </>);
}
